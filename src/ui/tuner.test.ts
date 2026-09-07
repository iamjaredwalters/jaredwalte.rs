import { describe, expect, it } from 'vitest';
import { formatFrequency } from './tuner';

describe('formatFrequency', () => {
  it('pads to three whole digits and three decimals', () => {
    expect(formatFrequency(27.145)).toBe('027.145');
    expect(formatFrequency(2400)).toBe('2400.000');
    expect(formatFrequency(1575.42)).toBe('1575.420');
  });

  it('never goes negative during a jittered sweep', () => {
    expect(formatFrequency(-3)).toBe('000.000');
  });
});
