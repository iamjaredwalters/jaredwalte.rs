import { describe, expect, it } from 'vitest';
import { offScreen, placeAbove } from './channels';

const viewport = { width: 1400, height: 900 };

describe('channels popover fallback', () => {
  it('centres the popover above its anchor', () => {
    const placement = placeAbove({ left: 268, top: 650, width: 168, height: 49 }, { left: 0, top: 0, width: 176, height: 139 }, viewport);
    expect(placement.left).toBe(264);
    expect(placement.top).toBe(501);
  });

  it('drops below the anchor when there is no room above', () => {
    const placement = placeAbove({ left: 268, top: 40, width: 168, height: 49 }, { left: 0, top: 0, width: 176, height: 139 }, viewport);
    expect(placement.top).toBe(99);
  });

  it('keeps the popover inside the viewport horizontally', () => {
    const placement = placeAbove({ left: 1380, top: 650, width: 20, height: 49 }, { left: 0, top: 0, width: 176, height: 139 }, viewport);
    expect(placement.left).toBe(1400 - 176 - 8);
  });

  it('flags a popover that landed above the viewport', () => {
    expect(offScreen({ left: 264, top: -7900, width: 176, height: 139 }, viewport)).toBe(true);
    expect(offScreen({ left: 264, top: 507, width: 176, height: 139 }, viewport)).toBe(false);
  });
});
