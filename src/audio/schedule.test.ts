import { describe, expect, it } from 'vitest';
import { bandLevels, equalPowerGain, loopSegments, planCrossfade } from './schedule';
import { BED_LEVELS, clipsForZone, preloadOrder, MANIFEST } from './manifest';

describe('planCrossfade', () => {
  it('starts the incoming bed after a gap and before the outgoing one is silent', () => {
    const plan = planCrossfade(10, { outMs: 600, gapMs: 350, inMs: 900 });
    expect(plan.outStartsAt).toBe(10);
    expect(plan.inStartsAt).toBeGreaterThan(plan.outStartsAt);
    expect(plan.inStartsAt).toBeLessThan(plan.outEndsAt);
    expect(plan.inEndsAt).toBeCloseTo(11.25, 5);
  });
});

describe('loopSegments', () => {
  it('spaces segments by duration minus overlap', () => {
    const segs = loopSegments(10, 0.5, 2, 3);
    expect(segs.map((s) => s.startAt)).toEqual([2, 11.5, 21]);
    expect(segs[0].fadeIn).toBe(0);
    expect(segs[1].fadeIn).toBe(0.5);
  });

  it('clamps overlap for very short buffers', () => {
    const segs = loopSegments(0.6, 0.5, 0, 2);
    expect(segs[1].startAt - segs[0].startAt).toBeCloseTo(0.4, 5);
  });
});

describe('equalPowerGain', () => {
  it('sums to unity power at the midpoint', () => {
    const a = equalPowerGain(0.5, 'in');
    const b = equalPowerGain(0.5, 'out');
    expect(a * a + b * b).toBeCloseTo(1, 5);
  });
});

describe('bandLevels', () => {
  it('reports energy in the band that holds it', () => {
    const bins = new Uint8Array(256);
    bins[1] = 255;
    const levels = bandLevels(bins, 44100);
    expect(levels.low).toBeGreaterThan(0);
    expect(levels.high).toBe(0);
    expect(levels.rms).toBeGreaterThan(0);
  });
});

describe('manifest', () => {
  it('maps stations to their bed and texture', () => {
    expect(clipsForZone('flea')).toEqual({ bed: MANIFEST.stations.flea.bed, texture: MANIFEST.stations.flea.texture, bedLevel: 0.5 });
    expect(clipsForZone('vela').bedLevel).toBe(BED_LEVELS.vela);
  });

  it('plays the theme in the hero and about, nothing in the shell', () => {
    expect(clipsForZone('carrier').bed).toBe(MANIFEST.theme);
    expect(clipsForZone('portrait').bedLevel).toBeLessThan(clipsForZone('carrier').bedLevel);
    expect(clipsForZone('shell').bed).toBeNull();
  });

  it('preloads the active zone and cues first, with no duplicates', () => {
    const order = preloadOrder('flea');
    expect(order[0]).toBe(MANIFEST.static);
    expect(order.slice(0, 6)).toContain(MANIFEST.stations.flea.bed);
    expect(new Set(order).size).toBe(order.length);
    expect(order).toContain(MANIFEST.theme);
  });
});
