import { describe, expect, it } from 'vitest';
import type { Luminance } from './portrait';
import { morseExtent, morseMarks, signoffTarget } from './signoff';

function fakeAddress(width: number, height: number): Luminance {
  const values = new Float32Array(width * height);
  const alpha = new Float32Array(width * height).fill(1);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      values[y * width + x] = x < width / 2 ? 1 : 0;
    }
  }
  return { width, height, values, alpha };
}

describe('morse', () => {
  it('spells 73 with standard timing', () => {
    const marks = morseMarks('73');
    expect(marks.map((m) => m.length)).toEqual([3, 3, 1, 1, 1, 1, 1, 1, 3, 3]);
    expect(marks[0].start).toBe(0);
    expect(marks[1].start).toBe(4);
    expect(marks[5].start - (marks[4].start + marks[4].length)).toBe(3);
  });

  it('skips characters it cannot encode', () => {
    expect(morseMarks('7x3')).toHaveLength(10);
    expect(morseExtent(morseMarks(''))).toBe(0);
  });
});

describe('signoffTarget', () => {
  it('places text points only on lit pixels and marks as hot nodes', () => {
    const data = signoffTarget(fakeAddress(64, 10), morseMarks('73'), 1000);
    expect(data.weights).toBeDefined();
    let hot = 0;
    for (let i = 0; i < 1000; i++) {
      const x = data.positions[i * 3];
      if (data.weights![i] === 1) {
        hot++;
        expect(Math.abs(x)).toBeLessThanOrEqual(0.56);
      } else {
        expect(x).toBeLessThanOrEqual(0);
      }
    }
    expect(hot).toBe(200);
  });
});
