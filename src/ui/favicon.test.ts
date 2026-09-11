import { describe, expect, it } from 'vitest';
import shipped from '../../public/favicon.svg?raw';
import { faviconSvg, faviconUrl } from './favicon';

describe('favicon', () => {
  it('carries the tint accent in the data url', () => {
    expect(decodeURIComponent(faviconUrl('rose'))).toContain('#ef99bb');
  });

  it('verdigris matches the static favicon shipped in public', () => {
    expect(faviconSvg('#7fc9b3')).toBe(shipped.trim());
  });
});
