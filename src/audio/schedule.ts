export interface CrossfadeTiming {
  outMs: number;
  gapMs: number;
  inMs: number;
}

export interface CrossfadePlan {
  outStartsAt: number;
  outEndsAt: number;
  inStartsAt: number;
  inEndsAt: number;
}

export const TUNE_TIMING: CrossfadeTiming = { outMs: 600, gapMs: 350, inMs: 900 };

export function planCrossfade(now: number, timing: CrossfadeTiming = TUNE_TIMING): CrossfadePlan {
  const outEndsAt = now + timing.outMs / 1000;
  const inStartsAt = now + timing.gapMs / 1000;
  return { outStartsAt: now, outEndsAt, inStartsAt, inEndsAt: inStartsAt + timing.inMs / 1000 };
}

export interface LoopSegment {
  startAt: number;
  fadeIn: number;
  fadeOut: number;
  duration: number;
}

export function loopSegments(bufferDuration: number, overlap: number, from: number, count: number): LoopSegment[] {
  const safeOverlap = Math.min(overlap, bufferDuration / 3);
  const stride = bufferDuration - safeOverlap;
  const segments: LoopSegment[] = [];
  for (let i = 0; i < count; i++) {
    const startAt = from + i * stride;
    segments.push({
      startAt,
      fadeIn: i === 0 ? 0 : safeOverlap,
      fadeOut: safeOverlap,
      duration: bufferDuration,
    });
  }
  return segments;
}

export function equalPowerGain(t: number, direction: 'in' | 'out'): number {
  const clamped = Math.max(0, Math.min(1, t));
  return direction === 'in' ? Math.sin((clamped * Math.PI) / 2) : Math.cos((clamped * Math.PI) / 2);
}

export function bandLevels(bins: Uint8Array, sampleRate: number): { low: number; mid: number; high: number; rms: number } {
  const binHz = sampleRate / 2 / bins.length;
  const sum = { low: 0, mid: 0, high: 0 };
  const count = { low: 0, mid: 0, high: 0 };
  let total = 0;
  for (let i = 0; i < bins.length; i++) {
    const hz = (i + 0.5) * binHz;
    const v = bins[i] / 255;
    total += v * v;
    const band = hz < 200 ? 'low' : hz < 2500 ? 'mid' : 'high';
    sum[band] += v;
    count[band]++;
  }
  return {
    low: count.low ? sum.low / count.low : 0,
    mid: count.mid ? sum.mid / count.mid : 0,
    high: count.high ? sum.high / count.high : 0,
    rms: bins.length ? Math.sqrt(total / bins.length) : 0,
  };
}
