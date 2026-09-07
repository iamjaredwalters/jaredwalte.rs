import { mulberry32, type TargetData } from './targets';

export interface Luminance {
  width: number;
  height: number;
  values: Float32Array;
}

export function luminanceFromPixels(width: number, height: number, rgba: Uint8ClampedArray): Luminance {
  const values = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = rgba[i * 4] / 255;
    const g = rgba[i * 4 + 1] / 255;
    const b = rgba[i * 4 + 2] / 255;
    values[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  return { width, height, values };
}

export function portraitFromLuminance(lum: Luminance, count: number, seed = 11): TargetData {
  const rng = mulberry32(seed);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const weights = new Float32Array(lum.values.length);
  let total = 0;
  for (let i = 0; i < lum.values.length; i++) {
    const v = Math.max(0, lum.values[i] - 0.04);
    weights[i] = Math.pow(v, 1.6);
    total += weights[i];
  }
  const cdf = new Float32Array(weights.length);
  let acc = 0;
  for (let i = 0; i < weights.length; i++) {
    acc += weights[i] / total;
    cdf[i] = acc;
  }
  const aspect = lum.width / lum.height;
  const span = 1.9;
  for (let p = 0; p < count; p++) {
    const u = rng();
    let lo = 0;
    let hi = cdf.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cdf[mid] < u) lo = mid + 1;
      else hi = mid;
    }
    const px = lo % lum.width;
    const py = Math.floor(lo / lum.width);
    const v = lum.values[lo];
    const x = ((px + rng()) / lum.width - 0.5) * span * aspect;
    const y = (0.5 - (py + rng()) / lum.height) * span;
    const z = v * 0.22 - 0.05 + (rng() - 0.5) * 0.02;
    positions[p * 3] = x;
    positions[p * 3 + 1] = y;
    positions[p * 3 + 2] = z;
    const warm = 0.35 + v * 0.65;
    colors[p * 3] = warm;
    colors[p * 3 + 1] = warm * 0.94;
    colors[p * 3 + 2] = warm * 0.82;
  }
  return { positions, colors };
}

export async function portraitFromImage(url: string, count: number, size = 192): Promise<TargetData> {
  const image = new Image();
  image.decoding = 'async';
  image.src = url;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('portrait: no 2d context');
  ctx.drawImage(image, 0, 0, size, size);
  const pixels = ctx.getImageData(0, 0, size, size).data;
  return portraitFromLuminance(luminanceFromPixels(size, size, pixels), count);
}
