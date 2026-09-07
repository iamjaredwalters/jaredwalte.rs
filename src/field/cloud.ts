export interface PointCloud {
  count: number;
  extent: [number, number, number];
  positions: Float32Array;
  colors: Float32Array;
}

const MAGIC = 0x444c4350;
const HEADER_BYTES = 24;

export function decodeCloud(buffer: ArrayBuffer): PointCloud {
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== MAGIC) throw new Error('cloud: bad magic');
  const version = view.getUint32(4, true);
  if (version !== 1) throw new Error(`cloud: unsupported version ${version}`);
  const count = view.getUint32(8, true);
  const extent: [number, number, number] = [
    view.getFloat32(12, true),
    view.getFloat32(16, true),
    view.getFloat32(20, true),
  ];
  const expected = HEADER_BYTES + count * 9;
  if (buffer.byteLength < expected) throw new Error(`cloud: truncated (${buffer.byteLength} < ${expected})`);
  const quantized = new Int16Array(buffer, HEADER_BYTES, count * 3);
  const rgb = new Uint8Array(buffer, HEADER_BYTES + count * 6, count * 3);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count * 3; i++) {
    positions[i] = quantized[i] / 32767;
    colors[i] = rgb[i] / 255;
  }
  return { count, extent, positions, colors };
}

export function encodeCloud(cloud: PointCloud): ArrayBuffer {
  const buffer = new ArrayBuffer(HEADER_BYTES + cloud.count * 9);
  const view = new DataView(buffer);
  view.setUint32(0, MAGIC, true);
  view.setUint32(4, 1, true);
  view.setUint32(8, cloud.count, true);
  view.setFloat32(12, cloud.extent[0], true);
  view.setFloat32(16, cloud.extent[1], true);
  view.setFloat32(20, cloud.extent[2], true);
  const quantized = new Int16Array(buffer, HEADER_BYTES, cloud.count * 3);
  const rgb = new Uint8Array(buffer, HEADER_BYTES + cloud.count * 6, cloud.count * 3);
  for (let i = 0; i < cloud.count * 3; i++) {
    quantized[i] = Math.max(-32767, Math.min(32767, Math.round(cloud.positions[i] * 32767)));
    rgb[i] = Math.max(0, Math.min(255, Math.round(cloud.colors[i] * 255)));
  }
  return buffer;
}

export async function loadCloud(url: string): Promise<PointCloud> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`cloud: ${url} ${response.status}`);
  return decodeCloud(await response.arrayBuffer());
}
