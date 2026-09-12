import { describe, expect, it } from 'vitest';
import { cueDurationMs } from './cues';
import { keyLevel, keySchedule, sidetonePlan } from './keyer';

describe('keyer', () => {
  it('turns a letter into keyed intervals at the dot length', () => {
    const schedule = keySchedule('A', 80);
    expect(schedule.intervals).toEqual([
      { startMs: 0, durationMs: 80 },
      { startMs: 160, durationMs: 240 },
    ]);
    expect(schedule.durationMs).toBe(400);
  });

  it('is keyed during an element and dim in the gap', () => {
    const schedule = keySchedule('A', 80);
    expect(keyLevel(schedule, 40, 0.7, 1000)).toBe(1);
    expect(keyLevel(schedule, 120, 0.7, 1000)).toBe(0.7);
    expect(keyLevel(schedule, 300, 0.7, 1000)).toBe(1);
  });

  it('rests after the call, then repeats', () => {
    const schedule = keySchedule('A', 80);
    expect(keyLevel(schedule, 900, 0.7, 1000)).toBe(0.7);
    expect(keyLevel(schedule, 1400 + 40, 0.7, 1000)).toBe(1);
  });

  it('the sidetone plan lasts exactly as long as the call', () => {
    const schedule = keySchedule('CQ CQ CQ DE JW K', 80);
    expect(cueDurationMs(sidetonePlan(schedule))).toBe(schedule.durationMs);
    expect(schedule.durationMs).toBeGreaterThan(10000);
  });
});
