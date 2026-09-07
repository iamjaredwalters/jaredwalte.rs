import { describe, expect, it } from 'vitest';
import { chirpPlan, cueDurationMs, cuePeak, rogerPlan, squelchPlan } from './cues';

describe('radio cues', () => {
  it.each([squelchPlan(), chirpPlan(), rogerPlan()])('$name lasts at least 100 ms', (plan) => {
    expect(cueDurationMs(plan)).toBeGreaterThanOrEqual(100);
  });

  it.each([squelchPlan(), chirpPlan(), rogerPlan()])('$name peaks near -3 dB and never clips', (plan) => {
    expect(cuePeak(plan)).toBeGreaterThanOrEqual(0.5);
    expect(cuePeak(plan)).toBeLessThanOrEqual(0.71);
  });
});
