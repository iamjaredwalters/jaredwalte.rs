import { describe, expect, it } from 'vitest';
import { dialState, nextLock } from './dial';

const tops = [0, 1000, 2000, 3000];

describe('dialState', () => {
  it('locks fully on a station top', () => {
    const state = dialState(1000, tops, 900);
    expect(state.nearest).toBe(1);
    expect(state.signal).toBe(1);
  });

  it('holds the lock through the plateau below a station', () => {
    const state = dialState(1200, tops, 900);
    expect(state.from).toBe(1);
    expect(state.t).toBe(0);
    expect(state.signal).toBe(1);
  });

  it('loses the signal halfway between stations', () => {
    const state = dialState(1500, tops, 900);
    expect(state.t).toBeCloseTo(0.5, 5);
    expect(state.signal).toBeCloseTo(0, 5);
  });

  it('picks the nearer station past the midpoint', () => {
    expect(dialState(1400, tops, 900).nearest).toBe(1);
    expect(dialState(1600, tops, 900).nearest).toBe(2);
  });

  it('clamps beyond the ends', () => {
    expect(dialState(-500, tops, 900)).toMatchObject({ from: 0, to: 1, t: 0, nearest: 0, signal: 1 });
    expect(dialState(9999, tops, 900)).toMatchObject({ from: 2, to: 3, t: 1, nearest: 3, signal: 1 });
  });

  it('handles a single zone', () => {
    expect(dialState(50, [0], 900)).toEqual({ from: 0, to: 0, t: 0, nearest: 0, signal: 1 });
  });
});

describe('nextLock', () => {
  it('has hysteresis', () => {
    expect(nextLock(false, 0.8)).toBe(false);
    expect(nextLock(false, 0.9)).toBe(true);
    expect(nextLock(true, 0.7)).toBe(true);
    expect(nextLock(true, 0.5)).toBe(false);
  });
});
