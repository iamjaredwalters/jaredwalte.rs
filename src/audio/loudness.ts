export interface Trim {
  start: number;
  end: number;
}

export function dbToGain(db: number): number {
  return Math.pow(10, db / 20);
}

export function gainToDb(gain: number): number {
  return 20 * Math.log10(Math.max(gain, 1e-9));
}

export function measure(samples: Float32Array): { peak: number; rms: number } {
  let peak = 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = samples[i];
    const a = v < 0 ? -v : v;
    if (a > peak) peak = a;
    sum += v * v;
  }
  return { peak, rms: samples.length ? Math.sqrt(sum / samples.length) : 0 };
}

export function normalizeGain(samples: Float32Array, targetRmsDb: number, peakCeilingDb = -1): number {
  const { peak, rms } = measure(samples);
  if (rms <= 1e-6 || peak <= 1e-6) return 1;
  const byRms = dbToGain(targetRmsDb) / rms;
  const byPeak = dbToGain(peakCeilingDb) / peak;
  return Math.min(byRms, byPeak);
}

export function trimSilence(samples: Float32Array, sampleRate: number, thresholdDb = -50, window = 0.02): Trim {
  const threshold = dbToGain(thresholdDb);
  const step = Math.max(1, Math.floor(sampleRate * window));
  const rmsAt = (from: number): number => {
    let sum = 0;
    const to = Math.min(samples.length, from + step);
    for (let i = from; i < to; i++) sum += samples[i] * samples[i];
    return Math.sqrt(sum / Math.max(1, to - from));
  };
  let start = 0;
  while (start + step < samples.length && rmsAt(start) < threshold) start += step;
  let end = samples.length;
  while (end - step > start && rmsAt(end - step) < threshold) end -= step;
  return { start, end };
}
