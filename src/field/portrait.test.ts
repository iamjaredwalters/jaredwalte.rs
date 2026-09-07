import { describe, expect, it } from 'vitest';
import { luminanceFromPixels, portraitFromLuminance } from './portrait';

function gradientImage(size: number): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const v = x < size / 2 ? 0 : 255;
      rgba[i] = v;
      rgba[i + 1] = v;
      rgba[i + 2] = v;
      rgba[i + 3] = 255;
    }
  }
  return rgba;
}

describe('portrait sampling', () => {
  it('places points only where the image is bright', () => {
    const lum = luminanceFromPixels(16, 16, gradientImage(16));
    const data = portraitFromLuminance(lum, 2000);
    for (let i = 0; i < 2000; i++) {
      expect(data.positions[i * 3]).toBeGreaterThanOrEqual(0);
    }
  });

  it('produces the requested count with colors in range', () => {
    const lum = luminanceFromPixels(8, 8, gradientImage(8));
    const data = portraitFromLuminance(lum, 300);
    expect(data.positions.length).toBe(900);
    for (let i = 0; i < data.colors.length; i++) {
      expect(data.colors[i]).toBeGreaterThan(0);
      expect(data.colors[i]).toBeLessThanOrEqual(1);
    }
  });
});
