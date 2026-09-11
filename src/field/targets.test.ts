import { describe, expect, it } from 'vitest';
import { PROCEDURAL, mulberry32, type ProceduralKind } from './targets';

const kinds = Object.keys(PROCEDURAL) as ProceduralKind[];

describe('procedural targets', () => {
  it.each(kinds)('%s fills exactly count points', (kind) => {
    const data = PROCEDURAL[kind](4096);
    expect(data.positions.length).toBe(4096 * 3);
    expect(data.colors.length).toBe(4096 * 3);
    let nonZero = 0;
    for (let i = 0; i < data.positions.length; i += 3) {
      if (data.positions[i] !== 0 || data.positions[i + 1] !== 0 || data.positions[i + 2] !== 0) nonZero++;
    }
    expect(nonZero).toBeGreaterThan(4000);
  });

  it.each(kinds)('%s stays within a 2-unit box and valid colors', (kind) => {
    const data = PROCEDURAL[kind](2048);
    for (let i = 0; i < data.positions.length; i++) {
      expect(Number.isFinite(data.positions[i])).toBe(true);
      expect(Math.abs(data.positions[i])).toBeLessThan(2);
    }
    for (let i = 0; i < data.colors.length; i++) {
      expect(data.colors[i]).toBeGreaterThanOrEqual(0);
      expect(data.colors[i]).toBeLessThanOrEqual(1);
    }
  });

  it.each(['globe', 'dome', 'calendar', 'phone'] as ProceduralKind[])('%s marks hot nodes with weights in [0, 1]', (kind) => {
    const data = PROCEDURAL[kind](2048);
    expect(data.weights).toBeDefined();
    expect(data.weights!.length).toBe(2048);
    let hot = 0;
    for (const value of data.weights!) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
      if (value === 1) hot++;
    }
    expect(hot).toBeGreaterThan(50);
    expect(hot).toBeLessThan(2048 * 0.6);
  });

  it('leaves unweighted targets without a weights array', () => {
    expect(PROCEDURAL.carrier(256).weights).toBeUndefined();
  });

  it('is deterministic for a seed', () => {
    const a = PROCEDURAL.dome(512, 9);
    const b = PROCEDURAL.dome(512, 9);
    expect(Array.from(a.positions)).toEqual(Array.from(b.positions));
  });

  it('mulberry32 yields values in [0, 1)', () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
