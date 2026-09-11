export interface DialState {
  from: number;
  to: number;
  t: number;
  nearest: number;
  signal: number;
}

export const LOCK_ON = 0.85;
export const LOCK_OFF = 0.6;

export function dialState(scrollY: number, tops: number[], viewport: number): DialState {
  const last = tops.length - 1;
  if (last <= 0) return { from: 0, to: 0, t: 0, nearest: 0, signal: 1 };
  const y = Math.min(Math.max(scrollY, tops[0]), tops[last]);
  let i = 0;
  while (i < last - 1 && y >= tops[i + 1]) i++;
  const gap = tops[i + 1] - tops[i];
  const plateau = Math.min(viewport * 0.35, gap * 0.3);
  const span = gap - plateau * 2;
  const t = span <= 0 ? (y - tops[i] > gap / 2 ? 1 : 0) : Math.min(1, Math.max(0, (y - tops[i] - plateau) / span));
  const nearest = t < 0.5 ? i : i + 1;
  const signal = Math.pow(Math.abs(2 * t - 1), 0.75);
  return { from: i, to: i + 1, t, nearest, signal };
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function nextLock(previous: boolean, signal: number): boolean {
  if (previous) return signal > LOCK_OFF;
  return signal >= LOCK_ON;
}
