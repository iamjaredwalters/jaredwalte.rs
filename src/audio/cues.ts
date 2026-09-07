export interface ToneSegment {
  kind: 'tone';
  frequency: number;
  wave: OscillatorType;
  startMs: number;
  durationMs: number;
  peak: number;
}

export interface NoiseSegment {
  kind: 'noise';
  bandpassHz: number;
  q: number;
  startMs: number;
  durationMs: number;
  peak: number;
}

export type CueSegment = ToneSegment | NoiseSegment;

export interface CuePlan {
  name: string;
  segments: CueSegment[];
}

export const PEAK_MINUS_3DB = 0.708;

export function squelchPlan(): CuePlan {
  return {
    name: 'squelch',
    segments: [
      { kind: 'noise', bandpassHz: 1400, q: 0.7, startMs: 0, durationMs: 150, peak: PEAK_MINUS_3DB },
      { kind: 'tone', frequency: 90, wave: 'square', startMs: 0, durationMs: 18, peak: 0.5 },
    ],
  };
}

export function chirpPlan(): CuePlan {
  return {
    name: 'chirp',
    segments: [
      { kind: 'tone', frequency: 1318, wave: 'triangle', startMs: 0, durationMs: 70, peak: PEAK_MINUS_3DB },
      { kind: 'tone', frequency: 1760, wave: 'triangle', startMs: 75, durationMs: 90, peak: PEAK_MINUS_3DB },
    ],
  };
}

export function rogerPlan(): CuePlan {
  return {
    name: 'roger',
    segments: [
      { kind: 'tone', frequency: 1000, wave: 'sine', startMs: 0, durationMs: 110, peak: 0.6 },
      { kind: 'noise', bandpassHz: 1800, q: 1.2, startMs: 100, durationMs: 60, peak: 0.4 },
    ],
  };
}

export function cueDurationMs(plan: CuePlan): number {
  return plan.segments.reduce((max, s) => Math.max(max, s.startMs + s.durationMs), 0);
}

export function cuePeak(plan: CuePlan): number {
  return plan.segments.reduce((max, s) => Math.max(max, s.peak), 0);
}
