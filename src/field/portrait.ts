import { mulberry32, type TargetData } from './targets';

export interface Luminance {
  width: number;
  height: number;
  values: Float32Array;
  alpha: Float32Array;
}

export interface PortraitOptions {
  black?: number;
  floor?: number;
  gamma?: number;
  contrast?: number;
  radius?: number;
  rows?: number;
  cells?: number;
  seed?: number;
}

export function luminanceFromPixels(width: number, height: number, rgba: Uint8ClampedArray): Luminance {
  const values = new Float32Array(width * height);
  const alpha = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = rgba[i * 4] / 255;
    const g = rgba[i * 4 + 1] / 255;
    const b = rgba[i * 4 + 2] / 255;
    values[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    alpha[i] = rgba[i * 4 + 3] / 255;
  }
  return { width, height, values, alpha };
}

export function portraitFromLuminance(lum: Luminance, count: number, options: PortraitOptions = {}): TargetData {
  const { black = 0.04, floor = 0, gamma = 1.6, contrast = 0, radius = 5, rows = 0, cells = 0, seed = 11 } = options;
  const tones = localContrast(lum, contrast, radius);
  const rng = mulberry32(seed);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const weights = new Float32Array(lum.values.length);
  let total = 0;
  for (let i = 0; i < lum.values.length; i++) {
    const v = Math.max(0, tones[i] - black);
    const coverage = lum.alpha[i] > 0.5 ? 1 : 0;
    weights[i] = coverage * (floor + Math.pow(v, gamma));
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
  const screen = cells > 0 ? halftoneScreen(tones, lum.width, lum.height, cells, black) : null;
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
    const v = tones[lo];
    let x = ((px + rng()) / lum.width - 0.5) * span * aspect;
    let y = (0.5 - (py + rng()) / lum.height) * span;
    if (rows > 0) {
      const row = Math.floor((py / lum.height) * rows);
      y = (0.5 - (row + 0.5) / rows) * span;
    } else if (screen) {
      const cx = Math.floor(px / screen.cellSize);
      const cy = Math.floor(py / screen.cellSize);
      const centreX = (((cx + 0.5) * screen.cellSize) / lum.width - 0.5) * span * aspect;
      const centreY = (0.5 - ((cy + 0.5) * screen.cellSize) / lum.height) * span;
      const dotRadius = screen.dot[cy * screen.columns + cx] * (screen.cellSize / lum.width) * span * aspect * 0.5;
      const r = dotRadius * Math.sqrt(rng());
      const angle = rng() * Math.PI * 2;
      x = centreX + Math.cos(angle) * r;
      y = centreY + Math.sin(angle) * r;
    }
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

interface HalftoneScreen {
  cellSize: number;
  columns: number;
  dot: Float32Array;
}

function halftoneScreen(tones: Float32Array, width: number, height: number, cells: number, black: number): HalftoneScreen {
  const cellSize = width / cells;
  const columns = cells;
  const rowsOfCells = Math.ceil(height / cellSize);
  const sum = new Float32Array(columns * rowsOfCells);
  const count = new Float32Array(columns * rowsOfCells);
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const cell = Math.floor(py / cellSize) * columns + Math.floor(px / cellSize);
      sum[cell] += Math.max(0, tones[py * width + px] - black);
      count[cell] += 1;
    }
  }
  const dot = new Float32Array(sum.length);
  let peak = 0;
  for (let i = 0; i < dot.length; i++) {
    dot[i] = count[i] > 0 ? sum[i] / count[i] : 0;
    peak = Math.max(peak, dot[i]);
  }
  for (let i = 0; i < dot.length; i++) dot[i] = peak > 0 ? Math.sqrt(dot[i] / peak) : 0;
  return { cellSize, columns, dot };
}

export function localContrast(lum: Luminance, amount: number, radius: number): Float32Array {
  if (amount <= 0) return lum.values;
  const blurred = boxBlur(lum.values, lum.width, lum.height, radius, 3);
  const values = new Float32Array(lum.values.length);
  for (let i = 0; i < values.length; i++) {
    values[i] = Math.min(1, Math.max(0, lum.values[i] + amount * (lum.values[i] - blurred[i])));
  }
  return values;
}

function boxBlur(source: Float32Array, width: number, height: number, radius: number, passes: number): Float32Array {
  let current = source;
  for (let pass = 0; pass < passes; pass++) {
    current = blurAxis(blurAxis(current, width, height, radius, true), width, height, radius, false);
  }
  return current;
}

function blurAxis(source: Float32Array, width: number, height: number, radius: number, horizontal: boolean): Float32Array {
  const out = new Float32Array(source.length);
  const lines = horizontal ? height : width;
  const length = horizontal ? width : height;
  const at = (line: number, i: number) => (horizontal ? line * width + i : i * width + line);
  const clampIndex = (i: number) => Math.min(length - 1, Math.max(0, i));
  const span = 2 * radius + 1;
  for (let line = 0; line < lines; line++) {
    let sum = 0;
    for (let i = -radius; i <= radius; i++) sum += source[at(line, clampIndex(i))];
    for (let i = 0; i < length; i++) {
      out[at(line, i)] = sum / span;
      sum += source[at(line, clampIndex(i + radius + 1))] - source[at(line, clampIndex(i - radius))];
    }
  }
  return out;
}

export async function portraitFromImage(url: string, count: number, options: PortraitOptions = {}, size = 224): Promise<TargetData> {
  const image = new Image();
  image.decoding = 'async';
  image.src = url;
  await image.decode();
  const width = size;
  const height = Math.max(1, Math.round((size * image.naturalHeight) / image.naturalWidth));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('portrait: no 2d context');
  ctx.drawImage(image, 0, 0, width, height);
  const pixels = ctx.getImageData(0, 0, width, height).data;
  return portraitFromLuminance(luminanceFromPixels(width, height, pixels), count, options);
}
