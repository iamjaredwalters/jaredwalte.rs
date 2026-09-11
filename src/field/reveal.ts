export function scanProgress(previous: number, locked: boolean, dt: number, seconds: number): number {
  if (seconds <= 0) return 1;
  const delta = locked ? dt / seconds : -dt / (seconds * 0.4);
  return Math.min(1, Math.max(0, previous + delta));
}
