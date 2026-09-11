export interface TargetData {
  positions: Float32Array;
  colors: Float32Array;
  weights?: Float32Array;
}

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const DEFAULT_WEIGHT = 0.5;

class Writer {
  readonly positions: Float32Array;
  readonly colors: Float32Array;
  readonly weights: Float32Array;
  weight = DEFAULT_WEIGHT;
  private cursor = 0;
  private weighted = false;
  constructor(readonly count: number) {
    this.positions = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.weights = new Float32Array(count);
  }
  get remaining(): number {
    return this.count - this.cursor;
  }
  hot(weight: number): void {
    this.weight = weight;
    this.weighted = true;
  }
  put(x: number, y: number, z: number, r: number, g: number, b: number): void {
    if (this.cursor >= this.count) return;
    const i = this.cursor * 3;
    this.positions[i] = x;
    this.positions[i + 1] = y;
    this.positions[i + 2] = z;
    this.colors[i] = r;
    this.colors[i + 1] = g;
    this.colors[i + 2] = b;
    this.weights[this.cursor] = this.weight;
    this.cursor++;
  }
  fillRest(fn: (w: Writer) => void): void {
    while (this.remaining > 0) fn(this);
  }
  data(): TargetData {
    return this.weighted ? { positions: this.positions, colors: this.colors, weights: this.weights } : { positions: this.positions, colors: this.colors };
  }
}

type Vec3 = [number, number, number];

function hsl(h: number, s: number, l: number): Vec3 {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}

function gauss(rng: Rng): number {
  const u = 1 - rng();
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function onSphere(rng: Rng, radius: number): Vec3 {
  const z = rng() * 2 - 1;
  const t = rng() * Math.PI * 2;
  const r = Math.sqrt(1 - z * z);
  return [r * Math.cos(t) * radius, z * radius, r * Math.sin(t) * radius];
}

function segment(w: Writer, a: Vec3, b: Vec3, n: number, color: Vec3, rng: Rng, spread = 0.003): void {
  for (let i = 0; i < n; i++) {
    const t = rng();
    w.put(
      a[0] + (b[0] - a[0]) * t + gauss(rng) * spread,
      a[1] + (b[1] - a[1]) * t + gauss(rng) * spread,
      a[2] + (b[2] - a[2]) * t + gauss(rng) * spread,
      color[0],
      color[1],
      color[2],
    );
  }
}

function clump(w: Writer, c: Vec3, n: number, radius: number, color: Vec3, rng: Rng): void {
  for (let i = 0; i < n; i++) {
    w.put(
      c[0] + gauss(rng) * radius,
      c[1] + gauss(rng) * radius,
      c[2] + gauss(rng) * radius,
      color[0],
      color[1],
      color[2],
    );
  }
}

function noise2(x: number, z: number): number {
  return (
    Math.sin(x * 1.7 + 0.3) * Math.cos(z * 1.3 - 0.7) * 0.5 +
    Math.sin(x * 3.9 - z * 2.1 + 1.1) * 0.25 +
    Math.sin(x * 8.3 + z * 7.7 + 2.3) * 0.125 +
    Math.sin(x * 15.1 - z * 13.7 + 0.5) * 0.0625
  );
}

export function carrier(count: number, seed = 1): TargetData {
  const rng = mulberry32(seed);
  const w = new Writer(count);
  const amber = hsl(168, 0.8, 0.52);
  const cream = hsl(45, 0.3, 0.9);
  const dim = hsl(168, 0.55, 0.22);
  w.fillRest((wr) => {
    const x = (rng() * 2 - 1) * 1.7;
    const z = (rng() * 2 - 1) * 0.55;
    const phase = x * 5.2;
    const envelope = Math.exp(-z * z * 2.5);
    const y = Math.sin(phase) * 0.22 * envelope + Math.sin(x * 13 + z * 4) * 0.02;
    const crest = 0.5 + 0.5 * Math.sin(phase);
    const t = crest * crest;
    const r = dim[0] + (amber[0] - dim[0]) * t + (cream[0] - amber[0]) * t * t * envelope;
    const g = dim[1] + (amber[1] - dim[1]) * t + (cream[1] - amber[1]) * t * t * envelope;
    const b = dim[2] + (amber[2] - dim[2]) * t + (cream[2] - amber[2]) * t * t * envelope;
    wr.put(x, y + gauss(rng) * 0.006, z + gauss(rng) * 0.01, r, g, b);
  });
  return w.data();
}

export function shell(count: number, seed = 2): TargetData {
  const rng = mulberry32(seed);
  const w = new Writer(count);
  const c = hsl(45, 0.2, 0.55);
  w.fillRest((wr) => {
    const p = onSphere(rng, 0.9 + gauss(rng) * 0.01);
    wr.put(p[0], p[1], p[2], c[0], c[1], c[2]);
  });
  return w.data();
}

export function globe(count: number, seed = 3): TargetData {
  const rng = mulberry32(seed);
  const w = new Writer(count);
  const R = 0.82;
  const line = hsl(282, 0.8, 0.6);
  const faint = hsl(282, 0.5, 0.18);
  const pinHead = hsl(352, 0.95, 0.6);
  const pinStem = hsl(45, 0.3, 0.85);
  const tilt = 0.41;
  const rot = (p: Vec3): Vec3 => [
    p[0] * Math.cos(tilt) - p[1] * Math.sin(tilt),
    p[0] * Math.sin(tilt) + p[1] * Math.cos(tilt),
    p[2],
  ];
  w.hot(0);
  const lineCount = Math.floor(count * 0.52);
  for (let i = 0; i < lineCount; i++) {
    const isLat = rng() < 0.5;
    const step = Math.PI / 12;
    let lat: number;
    let lon: number;
    if (isLat) {
      lat = (Math.floor(rng() * 11) - 5) * step;
      lon = rng() * Math.PI * 2;
    } else {
      lon = Math.floor(rng() * 24) * step;
      lat = (rng() - 0.5) * Math.PI;
    }
    const cl = Math.cos(lat);
    const p = rot([cl * Math.cos(lon) * R, Math.sin(lat) * R, cl * Math.sin(lon) * R]);
    const shade = 0.75 + 0.25 * Math.max(0, p[2] / R);
    w.put(
      p[0] + gauss(rng) * 0.003,
      p[1] + gauss(rng) * 0.003,
      p[2] + gauss(rng) * 0.003,
      line[0] * shade,
      line[1] * shade,
      line[2] * shade,
    );
  }
  const faintCount = Math.floor(count * 0.2);
  for (let i = 0; i < faintCount; i++) {
    const p = onSphere(rng, R * 0.985);
    w.put(p[0], p[1], p[2], faint[0], faint[1], faint[2]);
  }
  const pins = 9;
  const perPin = Math.floor(w.remaining / pins);
  for (let i = 0; i < pins; i++) {
    const lat = (rng() * 1.4 - 0.5) * 1.0;
    const lon = rng() * Math.PI * 2;
    const dir = rot([Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)]);
    const base: Vec3 = [dir[0] * R, dir[1] * R, dir[2] * R];
    const tip: Vec3 = [dir[0] * (R + 0.16), dir[1] * (R + 0.16), dir[2] * (R + 0.16)];
    const stemCount = Math.floor(perPin * 0.4);
    for (let k = 0; k < stemCount; k++) {
      const t = rng();
      w.hot(t * t);
      w.put(
        base[0] + (tip[0] - base[0]) * t + gauss(rng) * 0.002,
        base[1] + (tip[1] - base[1]) * t + gauss(rng) * 0.002,
        base[2] + (tip[2] - base[2]) * t + gauss(rng) * 0.002,
        pinStem[0],
        pinStem[1],
        pinStem[2],
      );
    }
    w.hot(1);
    clump(w, tip, perPin - stemCount, 0.02, pinHead, rng);
  }
  w.hot(0);
  w.fillRest((wr) => {
    const p = onSphere(rng, R);
    wr.put(p[0], p[1], p[2], faint[0], faint[1], faint[2]);
  });
  return w.data();
}

export function dome(count: number, seed = 4): TargetData {
  const rng = mulberry32(seed);
  const w = new Writer(count);
  const horizon = hsl(45, 0.3, 0.68);
  const sky = hsl(285, 0.35, 0.12);
  const lineColor = hsl(285, 0.6, 0.6);
  const starTints: Vec3[] = [hsl(45, 0.35, 0.9), hsl(352, 0.85, 0.7), hsl(285, 0.75, 0.72), hsl(168, 0.75, 0.62)];
  const R = 1.0;
  w.hot(0);
  const horizonCount = Math.floor(count * 0.08);
  for (let i = 0; i < horizonCount; i++) {
    const t = rng() * Math.PI * 2;
    w.put(Math.cos(t) * R + gauss(rng) * 0.004, -0.35 + gauss(rng) * 0.004, Math.sin(t) * R + gauss(rng) * 0.004, horizon[0], horizon[1], horizon[2]);
  }
  const skyCount = Math.floor(count * 0.24);
  for (let i = 0; i < skyCount; i++) {
    const p = onSphere(rng, R);
    if (p[1] < 0) {
      p[1] = -p[1];
    }
    w.put(p[0], p[1] - 0.35, p[2], sky[0], sky[1], sky[2]);
  }
  const starCount = 110;
  const stars: { p: Vec3; mag: number }[] = [];
  for (let i = 0; i < starCount; i++) {
    const p = onSphere(rng, R * 0.99);
    if (p[1] < 0.05) p[1] = 0.05 + rng() * 0.9;
    const len = Math.hypot(p[0], p[1], p[2]);
    const mag = Math.pow(rng(), 2.2);
    stars.push({ p: [(p[0] / len) * R * 0.99, (p[1] / len) * R * 0.99 - 0.35, (p[2] / len) * R * 0.99], mag });
  }
  stars.push({ p: [0, R * 0.99 - 0.35, 0], mag: 1.2 });
  const lineBudget = Math.floor(count * 0.16);
  const edges: [number, number][] = [];
  for (let i = 0; i < stars.length; i++) {
    const dists = stars
      .map((s, j) => ({ j, d: Math.hypot(s.p[0] - stars[i].p[0], s.p[1] - stars[i].p[1], s.p[2] - stars[i].p[2]) }))
      .filter((e) => e.j !== i)
      .sort((a, b) => a.d - b.d);
    for (let k = 0; k < 2; k++) {
      const j = dists[k].j;
      if (dists[k].d < 0.55 && !edges.some(([a, b]) => (a === i && b === j) || (a === j && b === i))) edges.push([i, j]);
    }
  }
  const perEdge = Math.max(1, Math.floor(lineBudget / edges.length));
  w.hot(0.12);
  for (const [a, b] of edges) segment(w, stars[a].p, stars[b].p, perEdge, lineColor, rng, 0.002);
  w.hot(1);
  const starBudget = w.remaining;
  const magSum = stars.reduce((s, st) => s + st.mag + 0.08, 0);
  for (const st of stars) {
    const n = Math.floor((starBudget * (st.mag + 0.08)) / magSum);
    const tint = starTints[Math.floor(rng() * starTints.length)];
    clump(w, st.p, n, 0.006 + st.mag * 0.03, tint, rng);
  }
  w.hot(0);
  w.fillRest((wr) => {
    const p = onSphere(rng, R);
    wr.put(p[0], Math.abs(p[1]) - 0.35, p[2], sky[0], sky[1], sky[2]);
  });
  return w.data();
}

export function calendar(count: number, seed = 5): TargetData {
  const rng = mulberry32(seed);
  const w = new Writer(count);
  const teal = hsl(168, 0.85, 0.5);
  const tealDim = hsl(168, 0.6, 0.26);
  const cream = hsl(45, 0.3, 0.88);
  const creamDim = hsl(45, 0.2, 0.42);
  const tile = hsl(352, 0.95, 0.6);
  const arc = hsl(285, 0.85, 0.66);
  const page: Vec3 = [0.2, 0.05, -0.05];
  const pageW = 1.35;
  const pageH = 1.1;
  const cols = 7;
  const rows = 5;
  const headerH = 0.16;
  const gridTop = page[1] + pageH / 2 - headerH;
  const gridBottom = page[1] - pageH / 2;
  const left = page[0] - pageW / 2;
  const right = page[0] + pageW / 2;
  const cellW = pageW / cols;
  const cellH = (gridTop - gridBottom) / rows;
  w.hot(0);
  const outline = Math.floor(count * 0.1);
  const perSide = Math.floor(outline / 4);
  segment(w, [left, gridBottom, page[2]], [right, gridBottom, page[2]], perSide, teal, rng);
  segment(w, [right, gridBottom, page[2]], [right, page[1] + pageH / 2, page[2]], perSide, teal, rng);
  segment(w, [right, page[1] + pageH / 2, page[2]], [left, page[1] + pageH / 2, page[2]], perSide, teal, rng);
  segment(w, [left, page[1] + pageH / 2, page[2]], [left, gridBottom, page[2]], perSide, teal, rng);
  const headerCount = Math.floor(count * 0.08);
  for (let i = 0; i < headerCount; i++) {
    w.put(left + rng() * pageW, gridTop + rng() * headerH, page[2] + gauss(rng) * 0.004, teal[0], teal[1], teal[2]);
  }
  const gridCount = Math.floor(count * 0.22);
  const perLine = Math.floor(gridCount / (cols + rows));
  for (let c = 1; c < cols; c++) segment(w, [left + c * cellW, gridBottom, page[2]], [left + c * cellW, gridTop, page[2]], perLine, tealDim, rng, 0.002);
  for (let r = 1; r < rows; r++) segment(w, [left, gridBottom + r * cellH, page[2]], [right, gridBottom + r * cellH, page[2]], perLine, tealDim, rng, 0.002);
  const events: [number, number, number][] = [
    [2, 3, 0.55],
    [4, 2, 0.55],
    [1, 1, 0.55],
    [5, 1, 1],
  ];
  const tileBudget = Math.floor(count * 0.16);
  const tileWeight = events.reduce((sum, e) => sum + e[2], 0);
  let highlight: Vec3 = [0, 0, 0];
  w.hot(1);
  for (const [c, r, weight] of events) {
    const n = Math.floor((tileBudget * weight) / tileWeight);
    const x0 = left + c * cellW + cellW * 0.12;
    const y0 = gridBottom + r * cellH + cellH * 0.18;
    for (let i = 0; i < n; i++) {
      w.put(x0 + rng() * cellW * 0.76, y0 + rng() * cellH * 0.64, page[2] + 0.01 + gauss(rng) * 0.004, tile[0], tile[1], tile[2]);
    }
    if (weight === 1) highlight = [x0 + cellW * 0.38, y0 + cellH * 0.32, page[2] + 0.02];
  }
  w.hot(0);
  const flyerCenter: Vec3 = [-0.78, -0.02, 0.28];
  const flyerW = 0.55;
  const flyerH = 0.78;
  const tilt = 0.2;
  const onFlyer = (u: number, v: number): Vec3 => {
    const x = (u - 0.5) * flyerW;
    const y = (v - 0.5) * flyerH;
    return [flyerCenter[0] + x * Math.cos(tilt) - y * Math.sin(tilt), flyerCenter[1] + x * Math.sin(tilt) + y * Math.cos(tilt), flyerCenter[2]];
  };
  const flyerOutline = Math.floor(count * 0.1);
  const flyerSide = Math.floor(flyerOutline / 4);
  segment(w, onFlyer(0, 0), onFlyer(1, 0), flyerSide, cream, rng);
  segment(w, onFlyer(1, 0), onFlyer(1, 1), flyerSide, cream, rng);
  segment(w, onFlyer(1, 1), onFlyer(0, 1), flyerSide, cream, rng);
  segment(w, onFlyer(0, 1), onFlyer(0, 0), flyerSide, cream, rng);
  const textLines = 6;
  const perText = Math.floor((count * 0.08) / textLines);
  for (let i = 0; i < textLines; i++) {
    const v = 0.14 + i * 0.11;
    const len = i === 0 ? 0.7 : 0.45 + (i % 3) * 0.12;
    segment(w, onFlyer(0.15, v), onFlyer(0.15 + len, v), perText, i === 0 ? tile : creamDim, rng, 0.004);
  }
  const blob = onFlyer(0.5, 0.86);
  w.hot(1);
  clump(w, blob, Math.floor(count * 0.04), 0.045, tile, rng);
  w.hot(0.3);
  const arcCount = Math.floor(count * 0.1);
  const from: Vec3 = onFlyer(0.95, 0.55);
  for (let i = 0; i < arcCount; i++) {
    const t = rng();
    const x = from[0] + (highlight[0] - from[0]) * t;
    const y = from[1] + (highlight[1] - from[1]) * t + 0.35 * 4 * t * (1 - t);
    const z = from[2] + (highlight[2] - from[2]) * t;
    w.put(x + gauss(rng) * 0.003, y + gauss(rng) * 0.003, z + gauss(rng) * 0.003, arc[0], arc[1], arc[2]);
  }
  w.hot(0);
  w.fillRest((wr) => {
    wr.put(left + rng() * pageW, gridBottom + rng() * (gridTop - gridBottom), page[2] - 0.01, tealDim[0] * 0.5, tealDim[1] * 0.5, tealDim[2] * 0.5);
  });
  return w.data();
}

export function phone(count: number, seed = 8): TargetData {
  const rng = mulberry32(seed);
  const w = new Writer(count);
  const shell = hsl(45, 0.3, 0.86);
  const shellDim = hsl(45, 0.2, 0.55);
  const hole = hsl(168, 0.9, 0.62);
  const cord = hsl(352, 0.9, 0.62);
  const z = 0;
  const arc = (cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n: number, color: Vec3, spread = 0.003) => {
    for (let i = 0; i < n; i++) {
      const a = a0 + (a1 - a0) * rng();
      w.put(cx + Math.cos(a) * rx + gauss(rng) * spread, cy + Math.sin(a) * ry + gauss(rng) * spread, z + gauss(rng) * spread, color[0], color[1], color[2]);
    }
  };
  const cups: Vec3[] = [
    [-0.78, -0.05, z],
    [0.78, -0.05, z],
  ];
  w.hot(0);
  const cupBudget = Math.floor(count * 0.28);
  for (const cup of cups) {
    arc(cup[0], cup[1], 0.26, 0.22, 0, Math.PI * 2, Math.floor(cupBudget * 0.3), shell);
    arc(cup[0], cup[1], 0.17, 0.14, 0, Math.PI * 2, Math.floor(cupBudget * 0.2), shellDim);
  }
  const handleBudget = Math.floor(count * 0.36);
  arc(0, -0.42, 0.8, 0.82, Math.PI * 0.16, Math.PI * 0.84, Math.floor(handleBudget * 0.45), shell);
  arc(0, -0.42, 0.66, 0.6, Math.PI * 0.2, Math.PI * 0.8, Math.floor(handleBudget * 0.35), shellDim);
  for (let i = 0; i < Math.floor(handleBudget * 0.2); i++) {
    const a = Math.PI * 0.2 + Math.PI * 0.6 * rng();
    const r = 0.6 + rng() * 0.4;
    w.put(Math.cos(a) * 0.8 * (r / 1.0) * 0.92 + gauss(rng) * 0.004, -0.42 + Math.sin(a) * (0.6 + (0.82 - 0.6) * ((r - 0.6) / 0.4)) + gauss(rng) * 0.004, z + gauss(rng) * 0.004, shellDim[0] * 0.5, shellDim[1] * 0.5, shellDim[2] * 0.5);
  }
  w.hot(1);
  const holes = 7;
  const perHole = Math.floor((count * 0.16) / (holes * 2));
  for (const cup of cups) {
    clump(w, cup, perHole, 0.022, hole, rng);
    for (let i = 0; i < holes - 1; i++) {
      const a = (i / (holes - 1)) * Math.PI * 2;
      clump(w, [cup[0] + Math.cos(a) * 0.085, cup[1] + Math.sin(a) * 0.07, z + 0.01], perHole, 0.02, hole, rng);
    }
  }
  w.hot(0.2);
  w.fillRest((wr) => {
    const t = rng();
    const x = -0.95 + Math.sin(t * Math.PI * 12) * 0.05;
    const y = -0.2 - t * 0.75;
    wr.put(x + gauss(rng) * 0.003, y + gauss(rng) * 0.003, z - 0.05 + gauss(rng) * 0.003, cord[0], cord[1], cord[2]);
  });
  return w.data();
}

export function ledger(count: number, seed = 6): TargetData {
  const rng = mulberry32(seed);
  const w = new Writer(count);
  const cols = 24;
  const rows = 7;
  const cellX = 2.2 / cols;
  const cellZ = 0.9 / rows;
  const heights: number[] = [];
  for (let d = 0; d < rows; d++) {
    for (let h = 0; h < cols; h++) {
      const weekend = d >= 5;
      const workday = h >= 9 && h <= 18 ? 1 : h >= 19 && h <= 23 ? 0.45 : 0.08;
      const bump = Math.exp(-Math.pow((h - 14) / 4.5, 2));
      const n = 0.5 + 0.5 * Math.sin(h * 1.7 + d * 2.3) * Math.cos(h * 0.7 - d);
      heights.push(Math.max(0.01, (weekend ? 0.35 : 1) * (workday * (0.35 + 0.65 * bump) * (0.6 + 0.6 * n))) * 0.75);
    }
  }
  const total = heights.reduce((a, b) => a + b, 0);
  const gridCount = Math.floor(count * 0.08);
  const grid = hsl(352, 0.45, 0.2);
  for (let i = 0; i < gridCount; i++) {
    const onX = rng() < 0.5;
    const x = onX ? (Math.floor(rng() * (cols + 1)) - cols / 2) * cellX : (rng() - 0.5) * 2.2;
    const z = onX ? (rng() - 0.5) * 0.9 : (Math.floor(rng() * (rows + 1)) - rows / 2) * cellZ;
    w.put(x, -0.4, z, grid[0], grid[1], grid[2]);
  }
  const barBudget = w.remaining;
  for (let d = 0; d < rows; d++) {
    for (let h = 0; h < cols; h++) {
      const height = heights[d * cols + h];
      const n = Math.floor((barBudget * height) / total);
      const x0 = (h - cols / 2) * cellX + cellX * 0.12;
      const z0 = (d - rows / 2) * cellZ + cellZ * 0.12;
      const sx = cellX * 0.76;
      const sz = cellZ * 0.76;
      const c = hsl(352, 0.92, 0.3 + height * 0.42);
      for (let i = 0; i < n; i++) {
        const face = rng();
        let x: number;
        let y: number;
        let z: number;
        if (face < 0.45) {
          x = x0 + rng() * sx;
          z = z0 + rng() * sz;
          y = -0.4 + height;
        } else if (face < 0.75) {
          x = rng() < 0.5 ? x0 : x0 + sx;
          z = z0 + rng() * sz;
          y = -0.4 + rng() * height;
        } else {
          x = x0 + rng() * sx;
          z = rng() < 0.5 ? z0 : z0 + sz;
          y = -0.4 + rng() * height;
        }
        const shade = y > -0.4 + height - 0.005 ? 1 : 0.55;
        w.put(x, y, z, c[0] * shade, c[1] * shade, c[2] * shade);
      }
    }
  }
  w.fillRest((wr) => wr.put((rng() - 0.5) * 2.2, -0.4, (rng() - 0.5) * 0.9, grid[0], grid[1], grid[2]));
  return w.data();
}

export function terrain(count: number, seed = 7): TargetData {
  const rng = mulberry32(seed);
  const w = new Writer(count);
  const size = 1.35;
  const heightAt = (x: number, z: number) => noise2(x * 1.6, z * 1.6) * 0.32 + 0.1 * Math.max(0, x);
  const surfaceCount = Math.floor(count * 0.78);
  const snow = hsl(285, 0.45, 0.9);
  const mid = hsl(285, 0.8, 0.6);
  const low = hsl(275, 0.65, 0.24);
  for (let i = 0; i < surfaceCount; i++) {
    const x = (rng() * 2 - 1) * size;
    const z = (rng() * 2 - 1) * size * 0.7;
    const y = heightAt(x, z);
    const t = Math.min(1, Math.max(0, (y + 0.32) / 0.7));
    const band = Math.floor(t * 9);
    const edge = Math.abs(t * 9 - band - 0.5) > 0.42 ? 1.35 : 1;
    const c = t < 0.5 ? [low[0] + (mid[0] - low[0]) * t * 2, low[1] + (mid[1] - low[1]) * t * 2, low[2] + (mid[2] - low[2]) * t * 2] : [mid[0] + (snow[0] - mid[0]) * (t - 0.5) * 2, mid[1] + (snow[1] - mid[1]) * (t - 0.5) * 2, mid[2] + (snow[2] - mid[2]) * (t - 0.5) * 2];
    w.put(x, y - 0.25, z, Math.min(1, c[0] * edge), Math.min(1, c[1] * edge), Math.min(1, c[2] * edge));
  }
  const start: Vec3 = [-0.75, heightAt(-0.75, 0.1) - 0.25 + 0.06, 0.1];
  const end: Vec3 = [0.55, heightAt(0.55, 0.1) - 0.25 + 0.06, 0.1];
  const arcColor = hsl(352, 0.95, 0.62);
  const arcCount = Math.floor(count * 0.08);
  for (let i = 0; i < arcCount; i++) {
    const t = rng();
    const x = start[0] + (end[0] - start[0]) * t;
    const z = start[2] + (end[2] - start[2]) * t;
    const y = start[1] + (end[1] - start[1]) * t + 4 * 0.42 * t * (1 - t);
    w.put(x + gauss(rng) * 0.003, y + gauss(rng) * 0.003, z + gauss(rng) * 0.003, arcColor[0], arcColor[1], arcColor[2]);
  }
  const robot = hsl(168, 0.85, 0.5);
  const bodyCount = Math.floor(w.remaining * 0.6);
  for (let i = 0; i < bodyCount; i++) {
    w.put(start[0] + (rng() - 0.5) * 0.12, start[1] + (rng() - 0.5) * 0.08 + 0.02, start[2] + (rng() - 0.5) * 0.1, robot[0], robot[1], robot[2]);
  }
  segment(w, [start[0], start[1] - 0.03, start[2]], [start[0] - 0.14, start[1] - 0.16, start[2]], w.remaining, [0.9, 0.9, 0.85], rng, 0.004);
  return w.data();
}

export const PROCEDURAL = {
  carrier,
  shell,
  globe,
  dome,
  calendar,
  ledger,
  terrain,
  phone,
} as const;

export type ProceduralKind = keyof typeof PROCEDURAL;
