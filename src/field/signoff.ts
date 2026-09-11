import { mulberry32, type TargetData } from './targets';

export const MORSE: Record<string, string> = {
  A: '.-',
  B: '-...',
  C: '-.-.',
  D: '-..',
  E: '.',
  F: '..-.',
  G: '--.',
  H: '....',
  I: '..',
  J: '.---',
  K: '-.-',
  L: '.-..',
  M: '--',
  N: '-.',
  O: '---',
  P: '.--.',
  Q: '--.-',
  R: '.-.',
  S: '...',
  T: '-',
  U: '..-',
  V: '...-',
  W: '.--',
  X: '-..-',
  Y: '-.--',
  Z: '--..',
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
  for (const char of text.toUpperCase()) {
    if (char === ' ') {
      cursor += 4;
      continue;
    }
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
  pulseHeight?: number;
  seed?: number;
}

export function signoffTarget(marks: MorseMark[], count: number, options: SignoffOptions = {}): TargetData {
  const { width = 2.0, morseWidth = 1.72, pulseHeight = 0.13, seed = 13 } = options;
  const rng = mulberry32(seed);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const weights = new Float32Array(count);
  const trace: [number, number, number] = [0.3, 0.28, 0.25];
  const pulse: [number, number, number] = [0.36, 0.86, 0.68];
  const gauss = () => {
    const u = 1 - rng();
    const v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  const lineCount = Math.floor(count * 0.35);
  for (let p = 0; p < lineCount; p++) {
    positions[p * 3] = (rng() - 0.5) * width;
    positions[p * 3 + 1] = gauss() * 0.003;
    positions[p * 3 + 2] = gauss() * 0.003;
    colors[p * 3] = trace[0];
    colors[p * 3 + 1] = trace[1];
    colors[p * 3 + 2] = trace[2];
    weights[p] = 0;
  }

  const extent = Math.max(1, morseExtent(marks));
  const unit = morseWidth / extent;
  const perimeter = marks.map((mark) => mark.length * unit + pulseHeight * 2);
  const perimeterTotal = perimeter.reduce((a, b) => a + b, 0);
  for (let p = lineCount; p < count; p++) {
    let pick = rng() * perimeterTotal;
    let index = 0;
    while (index < marks.length - 1 && pick > perimeter[index]) {
      pick -= perimeter[index];
      index++;
    }
    const mark = marks[index];
    const x0 = -morseWidth / 2 + mark.start * unit;
    const x1 = x0 + mark.length * unit;
    let x: number;
    let y: number;
    if (pick < pulseHeight) {
      x = x0;
      y = pick;
    } else if (pick < pulseHeight + mark.length * unit) {
      x = x0 + (pick - pulseHeight);
      y = pulseHeight;
    } else {
      x = x1;
      y = pulseHeight - (pick - pulseHeight - mark.length * unit);
    }
    positions[p * 3] = x + gauss() * 0.002;
    positions[p * 3 + 1] = y + gauss() * 0.002;
    positions[p * 3 + 2] = gauss() * 0.003;
    colors[p * 3] = pulse[0];
    colors[p * 3 + 1] = pulse[1];
    colors[p * 3 + 2] = pulse[2];
    weights[p] = 1;
  }
  return { positions, colors, weights };
}
