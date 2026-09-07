import { describe, expect, it } from 'vitest';
import { decodeCloud, encodeCloud, type PointCloud } from './cloud';

function synthetic(count: number): PointCloud {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count * 3; i++) {
    positions[i] = Math.sin(i) * 0.9;
    colors[i] = (i % 7) / 7;
  }
  return { count, extent: [1, 2, 3], positions, colors };
}

describe('cloud codec', () => {
  it('round-trips positions within quantization error', () => {
    const original = synthetic(64);
    const decoded = decodeCloud(encodeCloud(original));
    expect(decoded.count).toBe(64);
    for (let i = 0; i < original.positions.length; i++) {
      expect(Math.abs(decoded.positions[i] - original.positions[i])).toBeLessThan(1 / 32767 + 1e-6);
    }
  });

  it('round-trips colors within 8-bit error', () => {
    const original = synthetic(16);
    const decoded = decodeCloud(encodeCloud(original));
    for (let i = 0; i < original.colors.length; i++) {
      expect(Math.abs(decoded.colors[i] - original.colors[i])).toBeLessThan(1 / 255 + 1e-6);
    }
  });

  it('preserves extent', () => {
    const decoded = decodeCloud(encodeCloud(synthetic(4)));
    expect(decoded.extent).toEqual([1, 2, 3]);
  });

  it('rejects a bad magic', () => {
    expect(() => decodeCloud(new ArrayBuffer(24))).toThrow(/magic/);
  });

  it('rejects a truncated buffer', () => {
    const buffer = encodeCloud(synthetic(8));
    expect(() => decodeCloud(buffer.slice(0, buffer.byteLength - 4))).toThrow(/truncated/);
  });
});
