import { describe, expect, it } from 'vitest';
import { scanProgress } from './reveal';

describe('scanProgress', () => {
  it('advances at one full scan per configured seconds while locked', () => {
    expect(scanProgress(0, true, 0.6, 2.4)).toBeCloseTo(0.25, 6);
  });

  it('erases faster than it draws when unlocked', () => {
    const drawn = scanProgress(0, true, 0.1, 2);
    const erased = 1 - scanProgress(1, false, 0.1, 2);
    expect(erased).toBeGreaterThan(drawn * 2);
  });

  it('clamps to the unit range', () => {
    expect(scanProgress(0.9, true, 10, 1)).toBe(1);
    expect(scanProgress(0.1, false, 10, 1)).toBe(0);
  });

  it('is complete when scanning is disabled', () => {
    expect(scanProgress(0, false, 0.016, 0)).toBe(1);
  });
});
