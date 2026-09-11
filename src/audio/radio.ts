import { chirpPlan, rogerPlan, squelchPlan, type CuePlan } from './cues';
import { MANIFEST, clipsForZone, preloadOrder } from './manifest';
import { Mixer, type Levels } from './mixer';
import type { CrossfadeTiming } from './schedule';

type CueName = 'squelch' | 'chirp' | 'roger';

const SILENT: Levels = { low: 0, mid: 0, high: 0, rms: 0 };
const WARM_UP: CrossfadeTiming = { outMs: 400, gapMs: 250, inMs: 2200 };
const STATIC_LOCKED = 0.03;
const STATIC_WARM = 0.3;
const STATIC_OPEN = 0.5;
const TEXTURE_LEVEL = 0.45;

export class Radio {
  private mixer: Mixer | null = null;
  private noise: AudioBuffer | null = null;
  private zone = 'carrier';
  private lockTimer: number | undefined;
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
    if (!initial) void this.cue('squelch');
    const timing = initial ? WARM_UP : undefined;
    const staticLevel = clips.bed ? STATIC_LOCKED : STATIC_OPEN;
    void this.mixer.playLoop('static', MANIFEST.static, initial ? STATIC_WARM : staticLevel, initial ? { outMs: 400, gapMs: 100, inMs: 900 } : timing);
    if (initial) window.setTimeout(() => this.mixer?.setLoopLevel('static', staticLevel, 2.5), 2200);
    void this.mixer.playLoop('bed', clips.bed, clips.bedLevel, timing);
    void this.mixer.playLoop('texture', clips.texture, TEXTURE_LEVEL, timing);
    window.clearTimeout(this.lockTimer);
    if (!initial && MANIFEST.stations[zoneId]) {
      this.lockTimer = window.setTimeout(() => {
        if (this.zone === zoneId) void this.cue('roger');
      }, 1400);
    }
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
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(segment.peak, start + 0.006);
      gain.gain.setValueAtTime(segment.peak, Math.max(start + 0.006, end - 0.04));
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
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
