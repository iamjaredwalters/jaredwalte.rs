import { chirpPlan, rogerPlan, squelchPlan, type CuePlan } from './cues';
import { MANIFEST, clipsForZone, preloadOrder } from './manifest';
import { Mixer, type Levels } from './mixer';
import type { CrossfadeTiming } from './schedule';

type CueName = 'squelch' | 'chirp' | 'roger';

interface ZoneLevels {
  static: number;
  bed: number;
  texture: number;
}

const SILENT: Levels = { low: 0, mid: 0, high: 0, rms: 0 };
const WARM_UP: CrossfadeTiming = { outMs: 400, gapMs: 250, inMs: 2200 };
const STATIC_LOCKED = 0.03;
const STATIC_WARM = 0.3;
const STATIC_OPEN = 0.5;
const TEXTURE_LEVEL = 0.45;
const LEVEL_RAMP = 0.15;
const FLOOR = 0.0001;

export class Radio {
  private mixer: Mixer | null = null;
  private noise: AudioBuffer | null = null;
  private zone = 'carrier';
  private signal = 1;
  private lastLevelUpdate = 0;
  enabled = false;

  async power(on: boolean): Promise<void> {
    this.enabled = on;
    if (!on) {
      await this.mixer?.suspend();
      return;
    }
    if (!this.mixer) {
      this.mixer = new Mixer();
      this.noise = makeNoise(this.mixer.ctx);
      void this.preload();
    }
    await this.mixer.resume();
    await this.tune(this.zone, true);
  }

  async tune(zoneId: string, initial = false): Promise<void> {
    this.zone = zoneId;
    if (!this.enabled || !this.mixer) return;
    const clips = clipsForZone(zoneId);
    const timing = initial ? WARM_UP : undefined;
    const levels = this.levelsFor(zoneId, initial ? 1 : this.signal);
    void this.mixer.playLoop('static', MANIFEST.static, initial ? STATIC_WARM : levels.static, initial ? { outMs: 400, gapMs: 100, inMs: 900 } : timing);
    void this.mixer.playLoop('bed', clips.bed, levels.bed, timing);
    void this.mixer.playLoop('texture', clips.texture, levels.texture, timing);
    if (initial) {
      window.setTimeout(() => this.mixer?.setLoopLevel('static', this.levelsFor(this.zone, this.signal).static, 2.5), 2200);
    }
  }

  setSignal(zoneId: string, signal: number): void {
    this.signal = signal;
    if (zoneId !== this.zone) {
      void this.tune(zoneId);
      return;
    }
    if (!this.enabled || !this.mixer) return;
    const now = performance.now();
    if (now - this.lastLevelUpdate < 60) return;
    this.lastLevelUpdate = now;
    const levels = this.levelsFor(zoneId, signal);
    this.mixer.setLoopLevel('static', levels.static, LEVEL_RAMP);
    this.mixer.setLoopLevel('bed', levels.bed, LEVEL_RAMP);
    this.mixer.setLoopLevel('texture', levels.texture, LEVEL_RAMP);
  }

  lock(zoneId: string): void {
    if (MANIFEST.stations[zoneId]) void this.cue('roger');
  }

  unlock(): void {
    void this.cue('squelch');
  }

  chirp(): void {
    void this.cue('chirp');
  }

  squelch(): void {
    void this.cue('squelch');
  }

  duck(on: boolean): void {
    this.mixer?.duck(on);
  }

  levels(): Levels {
    return this.enabled && this.mixer ? this.mixer.levels() : SILENT;
  }

  private levelsFor(zoneId: string, signal: number): ZoneLevels {
    const clips = clipsForZone(zoneId);
    if (zoneId === 'contact') {
      return { static: STATIC_LOCKED * (1 - signal) + 0.015, bed: clips.bedLevel * (1 - signal) + FLOOR, texture: FLOOR };
    }
    const staticLevel = clips.bed ? STATIC_OPEN + (STATIC_LOCKED - STATIC_OPEN) * signal : STATIC_OPEN;
    return {
      static: staticLevel,
      bed: clips.bedLevel * (0.12 + 0.88 * signal) + FLOOR,
      texture: TEXTURE_LEVEL * (0.1 + 0.9 * signal) + FLOOR,
    };
  }

  private async preload(): Promise<void> {
    if (!this.mixer) return;
    for (const url of preloadOrder(this.zone)) {
      const bus = url === MANIFEST.static ? 'static' : url.includes('-texture') ? 'texture' : Object.values(MANIFEST.cues).includes(url) ? 'cues' : 'bed';
      await this.mixer.load(url, bus);
    }
  }

  private async cue(name: CueName): Promise<void> {
    if (!this.enabled || !this.mixer) return;
    const played = await this.mixer.playOnce(MANIFEST.cues[name], name === 'squelch' ? 0.55 : 0.4);
    if (!played) this.synth(name === 'squelch' ? squelchPlan() : name === 'chirp' ? chirpPlan() : rogerPlan());
  }

  private synth(plan: CuePlan): void {
    if (!this.mixer || !this.noise) return;
    const ctx = this.mixer.ctx;
    const now = ctx.currentTime;
    for (const segment of plan.segments) {
      const start = now + segment.startMs / 1000;
      const end = start + segment.durationMs / 1000;
      const peak = segment.peak * 0.4;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(FLOOR, start);
      gain.gain.exponentialRampToValueAtTime(peak, start + 0.006);
      gain.gain.setValueAtTime(peak, Math.max(start + 0.006, end - 0.04));
      gain.gain.exponentialRampToValueAtTime(FLOOR, end);
      gain.connect(this.mixer.cueBus);
      if (segment.kind === 'tone') {
        const osc = ctx.createOscillator();
        osc.type = segment.wave;
        osc.frequency.value = segment.frequency;
        osc.connect(gain);
        osc.start(start);
        osc.stop(end + 0.01);
      } else {
        const source = ctx.createBufferSource();
        source.buffer = this.noise;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = segment.bandpassHz;
        filter.Q.value = segment.q;
        source.connect(filter).connect(gain);
        source.start(start);
        source.stop(end + 0.01);
      }
    }
  }
}

function makeNoise(ctx: AudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}
