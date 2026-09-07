import { chirpPlan, rogerPlan, squelchPlan, type CuePlan } from './cues';

export class Radio {
  private context: AudioContext | null = null;
  private noise: AudioBuffer | null = null;
  private master: GainNode | null = null;
  enabled = false;

  async power(on: boolean): Promise<void> {
    this.enabled = on;
    if (!on) {
      await this.context?.suspend();
      return;
    }
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = 0.9;
      const compressor = this.context.createDynamicsCompressor();
      compressor.threshold.value = -12;
      compressor.ratio.value = 6;
      this.master.connect(compressor).connect(this.context.destination);
      this.noise = this.makeNoise(this.context);
    }
    await this.context.resume();
    this.play(chirpPlan());
  }

  squelch(): void {
    this.play(squelchPlan());
  }

  chirp(): void {
    this.play(chirpPlan());
  }

  roger(): void {
    this.play(rogerPlan());
  }

  private play(plan: CuePlan): void {
    if (!this.enabled || !this.context || !this.master || !this.noise) return;
    const ctx = this.context;
    const now = ctx.currentTime;
    for (const segment of plan.segments) {
      const start = now + segment.startMs / 1000;
      const end = start + segment.durationMs / 1000;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(segment.peak, start + 0.006);
      gain.gain.setValueAtTime(segment.peak, Math.max(start + 0.006, end - 0.04));
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      gain.connect(this.master);
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

  private makeNoise(ctx: AudioContext): AudioBuffer {
    const seconds = 1;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }
}
