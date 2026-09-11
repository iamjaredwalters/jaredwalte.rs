import { describe, expect, it } from 'vitest';
import { dbToGain, gainToDb, measure, normalizeGain, trimSilence } from './loudness';

function tone(seconds: number, amplitude: number, sampleRate = 8000): Float32Array {
  const out = new Float32Array(Math.floor(seconds * sampleRate));
  for (let i = 0; i < out.length; i++) out[i] = amplitude * Math.sin((i / sampleRate) * 440 * Math.PI * 2);
  return out;
}

describe('loudness', () => {
  it('converts dB and gain both ways', () => {
    expect(dbToGain(0)).toBeCloseTo(1, 6);
    expect(gainToDb(dbToGain(-20))).toBeCloseTo(-20, 6);
  });

  it('measures peak and rms of a sine', () => {
    const { peak, rms } = measure(tone(1, 0.5));
    expect(peak).toBeCloseTo(0.5, 2);
    expect(rms).toBeCloseTo(0.5 / Math.SQRT2, 2);
  });

  it('normalizes a quiet clip up to the target rms', () => {
    const quiet = tone(1, 0.01);
    const gain = normalizeGain(quiet, -20);
    const { rms } = measure(quiet.map((v) => v * gain));
    expect(gainToDb(rms)).toBeCloseTo(-20, 1);
  });

  it('never pushes the peak above the ceiling', () => {
    const dense = tone(1, 0.9);
    const gain = normalizeGain(dense, 0, -1);
    expect(measure(dense.map((v) => v * gain)).peak).toBeLessThanOrEqual(dbToGain(-1) + 1e-6);
  });

  it('leaves silence untouched', () => {
    expect(normalizeGain(new Float32Array(100), -20)).toBe(1);
  });

  it('trims leading and trailing silence', () => {
    const sampleRate = 8000;
    const silence = new Float32Array(sampleRate);
    const body = tone(1, 0.5, sampleRate);
    const samples = new Float32Array(sampleRate * 3);
    samples.set(silence, 0);
    samples.set(body, sampleRate);
    samples.set(silence, sampleRate * 2);
    const { start, end } = trimSilence(samples, sampleRate);
    expect(start).toBeGreaterThanOrEqual(sampleRate - 200);
    expect(start).toBeLessThanOrEqual(sampleRate);
    expect(end).toBeGreaterThanOrEqual(sampleRate * 2);
    expect(end).toBeLessThanOrEqual(sampleRate * 2 + 200);
  });

  it('keeps a fully audible clip whole', () => {
    const samples = tone(1, 0.5);
    expect(trimSilence(samples, 8000)).toEqual({ start: 0, end: samples.length });
  });
});
