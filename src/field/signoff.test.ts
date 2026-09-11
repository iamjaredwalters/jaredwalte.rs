import { describe, expect, it } from 'vitest';
import { morseExtent, morseMarks, signoffTarget } from './signoff';

describe('morse', () => {
  it('spells 73 with standard timing', () => {
    const marks = morseMarks('73');
    expect(marks.map((m) => m.length)).toEqual([3, 3, 1, 1, 1, 1, 1, 1, 3, 3]);
    expect(marks[0].start).toBe(0);
    expect(marks[1].start).toBe(4);
    expect(marks[5].start - (marks[4].start + marks[4].length)).toBe(3);
  });

  it('encodes letters and separates words by seven units', () => {
    const marks = morseMarks('73 DE JW');
    expect(marks).toHaveLength(21);
    const endOf3 = marks[9].start + marks[9].length;
    expect(marks[10].start - endOf3).toBe(7);
  });

  it('skips characters it cannot encode', () => {
    expect(morseMarks('7?3')).toHaveLength(10);
    expect(morseExtent(morseMarks(''))).toBe(0);
  });
});

describe('signoffTarget', () => {
  it('draws a flat trace with the marks as raised pulses', () => {
    const data = signoffTarget(morseMarks('73 DE JW'), 2000, { pulseHeight: 0.1 });
    expect(data.weights).toBeDefined();
    let hot = 0;
    for (let i = 0; i < 2000; i++) {
      const y = data.positions[i * 3 + 1];
      if (data.weights![i] === 1) {
        hot++;
        expect(y).toBeGreaterThan(-0.02);
        expect(y).toBeLessThan(0.12);
      } else {
        expect(Math.abs(y)).toBeLessThan(0.03);
      }
    }
    expect(hot).toBe(900);
  });
});
