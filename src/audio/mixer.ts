import { normalizeGain, trimSilence } from './loudness';
import { bandLevels, loopSegments, planCrossfade, type CrossfadeTiming, TUNE_TIMING } from './schedule';

export interface Clip {
  buffer: AudioBuffer;
  gain: number;
}

const TARGET_RMS_DB: Record<Bus | 'cues', number> = { static: -30, texture: -27, bed: -20, cues: -14 };

export type Bus = 'static' | 'texture' | 'bed';

export interface Levels {
  low: number;
  mid: number;
  high: number;
  rms: number;
}

const SILENT: Levels = { low: 0, mid: 0, high: 0, rms: 0 };
const LOOKAHEAD = 0.6;
const OVERLAP = 0.35;

class LoopPlayer {
  private readonly gain: GainNode;
  private sources: AudioBufferSourceNode[] = [];
  private timer: number | null = null;
  private nextIndex = 0;
  private startedAt = 0;
  private stopped = false;

  constructor(
    private readonly ctx: AudioContext,
    private readonly buffer: AudioBuffer,
    destination: AudioNode,
  ) {
    this.gain = ctx.createGain();
    this.gain.gain.value = 0;
    this.gain.connect(destination);
  }

  start(at: number, level: number, fadeSeconds: number): void {
    this.startedAt = at;
    this.gain.gain.setValueAtTime(0.0001, at);
    this.gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, level), at + Math.max(0.01, fadeSeconds));
    this.pump();
    this.timer = window.setInterval(() => this.pump(), 250);
  }

  setLevel(level: number, seconds: number): void {
    const now = this.ctx.currentTime;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(Math.max(0.0001, this.gain.gain.value), now);
    this.gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, level), now + Math.max(0.01, seconds));
  }

  stop(at: number, fadeSeconds: number): void {
    this.stopped = true;
    if (this.timer !== null) window.clearInterval(this.timer);
    this.gain.gain.cancelScheduledValues(at);
    this.gain.gain.setValueAtTime(Math.max(0.0001, this.gain.gain.value), at);
    this.gain.gain.exponentialRampToValueAtTime(0.0001, at + Math.max(0.01, fadeSeconds));
    const end = at + fadeSeconds + 0.05;
    for (const source of this.sources) {
      try {
        source.stop(end);
      } catch {
        /* already stopped */
      }
    }
    window.setTimeout(() => this.gain.disconnect(), (end - this.ctx.currentTime) * 1000 + 100);
  }

  private pump(): void {
    if (this.stopped) return;
    const horizon = this.ctx.currentTime + LOOKAHEAD;
    while (true) {
      const [segment] = loopSegments(this.buffer.duration, OVERLAP, this.startedAt, this.nextIndex + 1).slice(-1);
      if (segment.startAt > horizon) break;
      this.play(segment.startAt, segment.fadeIn, segment.fadeOut, segment.duration);
      this.nextIndex++;
    }
  }

  private play(startAt: number, fadeIn: number, fadeOut: number, duration: number): void {
    const source = this.ctx.createBufferSource();
    source.buffer = this.buffer;
    const envelope = this.ctx.createGain();
    envelope.gain.setValueAtTime(fadeIn > 0 ? 0 : 1, startAt);
    if (fadeIn > 0) envelope.gain.linearRampToValueAtTime(1, startAt + fadeIn);
    envelope.gain.setValueAtTime(1, startAt + duration - fadeOut);
    envelope.gain.linearRampToValueAtTime(0, startAt + duration);
    source.connect(envelope).connect(this.gain);
    source.start(startAt);
    source.stop(startAt + duration + 0.02);
    source.onended = () => {
      this.sources = this.sources.filter((s) => s !== source);
      envelope.disconnect();
    };
    this.sources.push(source);
  }
}

export class Mixer {
  readonly ctx: AudioContext;
  private readonly master: GainNode;
  private readonly analyser: AnalyserNode;
  private readonly bins: Uint8Array<ArrayBuffer>;
  private readonly buses: Record<Bus | 'cues', GainNode>;
  private readonly clips = new Map<string, Promise<Clip | null>>();
  private readonly players = new Map<Bus, { url: string; player: LoopPlayer }>();
  private ducked = false;

  constructor() {
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    const compressor = this.ctx.createDynamicsCompressor();
    compressor.threshold.value = -14;
    compressor.ratio.value = 4;
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.6;
    this.bins = new Uint8Array(this.analyser.frequencyBinCount);
    this.master.connect(compressor).connect(this.analyser).connect(this.ctx.destination);
    this.buses = {
      static: this.makeBus(0.5),
      texture: this.makeBus(0.8),
      bed: this.makeBus(1),
      cues: this.makeBus(0.9),
    };
  }

  private makeBus(level: number): GainNode {
    const bus = this.ctx.createGain();
    bus.gain.value = level;
    bus.connect(this.master);
    return bus;
  }

  get cueBus(): AudioNode {
    return this.buses.cues;
  }

  async resume(): Promise<void> {
    await this.ctx.resume();
  }

  async suspend(): Promise<void> {
    await this.ctx.suspend();
  }

  load(url: string, bus: Bus | 'cues' = 'bed'): Promise<Clip | null> {
    const cached = this.clips.get(url);
    if (cached) return cached;
    const pending = fetch(url)
      .then(async (response) => {
        if (!response.ok) throw new Error(`${url} ${response.status}`);
        const decoded = await this.ctx.decodeAudioData(await response.arrayBuffer());
        return this.prepare(decoded, bus);
      })
      .catch(() => null);
    this.clips.set(url, pending);
    return pending;
  }

  private prepare(decoded: AudioBuffer, bus: Bus | 'cues'): Clip {
    const mono = decoded.getChannelData(0);
    const { start, end } = bus === 'cues' ? { start: 0, end: mono.length } : trimSilence(mono, decoded.sampleRate);
    const length = Math.max(1, end - start);
    const buffer = this.ctx.createBuffer(decoded.numberOfChannels, length, decoded.sampleRate);
    for (let channel = 0; channel < decoded.numberOfChannels; channel++) {
      buffer.copyToChannel(decoded.getChannelData(channel).subarray(start, end), channel);
    }
    return { buffer, gain: normalizeGain(buffer.getChannelData(0), TARGET_RMS_DB[bus]) };
  }

  async playLoop(bus: Bus, url: string | null, level: number, timing: CrossfadeTiming = TUNE_TIMING): Promise<void> {
    const current = this.players.get(bus);
    if (current && current.url === url) {
      current.player.setLevel(level, 0.6);
      return;
    }
    const now = this.ctx.currentTime;
    const plan = planCrossfade(now, timing);
    if (current) {
      current.player.stop(plan.outStartsAt, timing.outMs / 1000);
      this.players.delete(bus);
    }
    if (!url) return;
    const clip = await this.load(url, bus);
    if (!clip) return;
    const latest = this.players.get(bus);
    if (latest && latest.url !== url) return;
    const player = new LoopPlayer(this.ctx, clip.buffer, this.buses[bus]);
    const startAt = Math.max(this.ctx.currentTime + 0.05, plan.inStartsAt);
    player.start(startAt, level * clip.gain, timing.inMs / 1000);
    this.players.set(bus, { url, player });
  }

  setLoopLevel(bus: Bus, level: number, seconds = 0.6): void {
    this.players.get(bus)?.player.setLevel(level, seconds);
  }

  async playOnce(url: string, level = 1): Promise<boolean> {
    const clip = await this.load(url, 'cues');
    if (!clip) return false;
    const source = this.ctx.createBufferSource();
    source.buffer = clip.buffer;
    const gain = this.ctx.createGain();
    gain.gain.value = level * clip.gain;
    source.connect(gain).connect(this.buses.cues);
    source.start();
    source.onended = () => gain.disconnect();
    return true;
  }

  duck(on: boolean): void {
    if (this.ducked === on) return;
    this.ducked = on;
    const now = this.ctx.currentTime;
    const bed = this.buses.bed.gain;
    const texture = this.buses.texture.gain;
    bed.cancelScheduledValues(now);
    texture.cancelScheduledValues(now);
    bed.setValueAtTime(bed.value, now);
    texture.setValueAtTime(texture.value, now);
    bed.linearRampToValueAtTime(on ? 0.5 : 1, now + 0.5);
    texture.linearRampToValueAtTime(on ? 1 : 0.8, now + 0.5);
  }

  levels(): Levels {
    if (this.ctx.state !== 'running') return SILENT;
    this.analyser.getByteFrequencyData(this.bins);
    return bandLevels(this.bins, this.ctx.sampleRate);
  }
}
