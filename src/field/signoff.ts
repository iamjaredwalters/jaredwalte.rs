import { luminanceFromPixels, type Luminance } from './portrait';
import { mulberry32, type TargetData } from './targets';

export const MORSE: Record<string, string> = {
  '0': '-----',
  '1': '.----',
  '2': '..---',
  '3': '...--',
  '4': '....-',
  '5': '.....',
  '6': '-....',
  '7': '--...',
  '8': '---..',
  '9': '----.',
};

export interface MorseMark {
  start: number;
  length: number;
}

export function morseMarks(text: string): MorseMark[] {
  const marks: MorseMark[] = [];
  let cursor = 0;
  for (const char of text) {
    const code = MORSE[char];
    if (!code) continue;
    for (const symbol of code) {
      const length = symbol === '-' ? 3 : 1;
      marks.push({ start: cursor, length });
      cursor += length + 1;
    }
    cursor += 2;
  }
  return marks;
}

export function morseExtent(marks: MorseMark[]): number {
  return marks.reduce((max, mark) => Math.max(max, mark.start + mark.length), 0);
}

export interface SignoffOptions {
  width?: number;
  morseWidth?: number;
  morseY?: number;
  seed?: number;
}

export function signoffTarget(address: Luminance, marks: MorseMark[], count: number, options: SignoffOptions = {}): TargetData {
  const { width = 2.2, morseWidth = 1.1, morseY = 0.3, seed = 13 } = options;
  const rng = mulberry32(seed);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const weights = new Float32Array(count);
  const ivory: [number, number, number] = [0.92, 0.87, 0.76];
  const verdigris: [number, number, number] = [0.36, 0.86, 0.68];

  const textCount = Math.floor(count * 0.8);
  const cdf = new Float32Array(address.values.length);
  let total = 0;
  for (let i = 0; i < address.values.length; i++) {
    total += address.values[i] > 0.5 ? 1 : 0;
    cdf[i] = total;
  }
  const aspect = address.width / address.height;
  const height = width / aspect;
  const textY = -0.05;
  for (let p = 0; p < textCount; p++) {
    const u = rng() * total;
    let lo = 0;
    let hi = cdf.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cdf[mid] < u) lo = mid + 1;
      else hi = mid;
    }
    const px = lo % address.width;
    const py = Math.floor(lo / address.width);
    positions[p * 3] = ((px + rng()) / address.width - 0.5) * width;
    positions[p * 3 + 1] = textY + (0.5 - (py + rng()) / address.height) * height;
    positions[p * 3 + 2] = (rng() - 0.5) * 0.012;
    colors[p * 3] = ivory[0];
    colors[p * 3 + 1] = ivory[1];
    colors[p * 3 + 2] = ivory[2];
    weights[p] = 0.12;
  }

  const extent = Math.max(1, morseExtent(marks));
  const unit = morseWidth / extent;
  const dashHeight = 0.05;
  for (let p = textCount; p < count; p++) {
    const mark = marks[Math.floor(rng() * marks.length)];
    const x0 = -morseWidth / 2 + mark.start * unit;
    const x = x0 + rng() * mark.length * unit;
    positions[p * 3] = x;
    positions[p * 3 + 1] = morseY + (rng() - 0.5) * dashHeight;
    positions[p * 3 + 2] = (rng() - 0.5) * 0.02;
    colors[p * 3] = verdigris[0];
    colors[p * 3 + 1] = verdigris[1];
    colors[p * 3 + 2] = verdigris[2];
    weights[p] = 1;
  }
  return { positions, colors, weights };
}

export async function renderAddress(text: string, fontFamily = 'Archivo', px = 96): Promise<Luminance> {
  const spec = `900 ${px}px "${fontFamily}"`;
  try {
    await document.fonts.load(spec, text);
  } catch {
    /* fall back to whatever the canvas resolves */
  }
  const probe = document.createElement('canvas').getContext('2d');
  if (!probe) throw new Error('signoff: no 2d context');
  probe.font = spec;
  probe.fontStretch = 'semi-expanded';
  const measured = probe.measureText(text);
  const pad = Math.round(px * 0.3);
  const width = Math.ceil(measured.width) + pad * 2;
  const height = Math.ceil(px * 1.3);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('signoff: no 2d context');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);
  ctx.font = spec;
  ctx.fontStretch = 'semi-expanded';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.fillText(text, pad, height / 2);
  return luminanceFromPixels(width, height, ctx.getImageData(0, 0, width, height).data);
}
