import { describe, expect, it } from 'vitest';
import { hashForStation, neighbor, stationFromHash } from './router';

describe('router', () => {
  it('parses a station hash', () => {
    expect(stationFromHash('#/seevie')).toBe('seevie');
    expect(stationFromHash('#/ting-radio')).toBe('ting-radio');
  });

  it('ignores anchors and junk', () => {
    expect(stationFromHash('#about')).toBeNull();
    expect(stationFromHash('')).toBeNull();
    expect(stationFromHash('#/../x')).toBeNull();
  });

  it('round-trips', () => {
    expect(stationFromHash(hashForStation('vela'))).toBe('vela');
  });

  it('finds neighbors and stops at the ends', () => {
    const ids = ['a', 'b', 'c'];
    expect(neighbor(ids, 'a', 1)).toBe('b');
    expect(neighbor(ids, 'c', 1)).toBeNull();
    expect(neighbor(ids, 'a', -1)).toBeNull();
    expect(neighbor(ids, 'zzz', 1)).toBeNull();
  });
});
