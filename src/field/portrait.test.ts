import { describe, expect, it } from 'vitest';
import { luminanceFromPixels, portraitFromLuminance } from './portrait';

function image(size: number, pixel: (x: number, y: number) => [number, number, number, number]): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const [r, g, b, a] = pixel(x, y);
      rgba[i] = r;
      rgba[i + 1] = g;
      rgba[i + 2] = b;
      rgba[i + 3] = a;
    }
  }
  return rgba;
}

const halfBright = (size: number) => image(size, (x) => (x < size / 2 ? [0, 0, 0, 255] : [255, 255, 255, 255]));

describe('portrait sampling', () => {
  it('places points only where the image is bright', () => {
    const lum = luminanceFromPixels(16, 16, halfBright(16));
    const data = portraitFromLuminance(lum, 2000);
    for (let i = 0; i < 2000; i++) {
      expect(data.positions[i * 3]).toBeGreaterThanOrEqual(0);
    }
  });

  it('produces the requested count with colors in range', () => {
    const lum = luminanceFromPixels(8, 8, halfBright(8));
    const data = portraitFromLuminance(lum, 300);
    expect(data.positions.length).toBe(900);
    for (let i = 0; i < data.colors.length; i++) {
      expect(data.colors[i]).toBeGreaterThan(0);
      expect(data.colors[i]).toBeLessThanOrEqual(1);
    }
  });

  it('never samples transparent pixels, even bright ones', () => {
    const lum = luminanceFromPixels(16, 16, image(16, (x) => (x < 8 ? [255, 255, 255, 0] : [40, 40, 40, 255])));
    const data = portraitFromLuminance(lum, 1000, { floor: 0.2 });
    for (let i = 0; i < 1000; i++) {
      expect(data.positions[i * 3]).toBeGreaterThanOrEqual(0);
    }
  });

  it('floor lets dark opaque pixels receive points', () => {
    const lum = luminanceFromPixels(16, 16, image(16, (x) => (x < 8 ? [0, 0, 0, 255] : [255, 255, 255, 255])));
    const without = portraitFromLuminance(lum, 2000, { floor: 0 });
    const withFloor = portraitFromLuminance(lum, 2000, { floor: 0.25 });
    const leftCount = (data: { positions: Float32Array }) => Array.from({ length: 2000 }, (_, i) => data.positions[i * 3]).filter((x) => x < 0).length;
    expect(leftCount(without)).toBe(0);
    expect(leftCount(withFloor)).toBeGreaterThan(100);
  });

  it('keeps the source aspect ratio', () => {
    const wide = luminanceFromPixels(32, 16, new Uint8ClampedArray(32 * 16 * 4).fill(255));
    const data = portraitFromLuminance(wide, 4000);
    let maxX = 0;
    let maxY = 0;
    for (let i = 0; i < 4000; i++) {
      maxX = Math.max(maxX, Math.abs(data.positions[i * 3]));
      maxY = Math.max(maxY, Math.abs(data.positions[i * 3 + 1]));
    }
    expect(maxX / maxY).toBeGreaterThan(1.7);
  });
});
