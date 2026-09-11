export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Placement {
  left: number;
  top: number;
}

export function placeAbove(anchor: Box, popover: Box, viewport: { width: number; height: number }, gap = 10): Placement {
  const centred = anchor.left + anchor.width / 2 - popover.width / 2;
  const left = Math.min(Math.max(8, centred), Math.max(8, viewport.width - popover.width - 8));
  const above = anchor.top - popover.height - gap;
  const top = above >= 8 ? above : Math.min(anchor.top + anchor.height + gap, viewport.height - popover.height - 8);
  return { left, top };
}

export function offScreen(box: Box, viewport: { width: number; height: number }): boolean {
  return box.top < 0 || box.left < 0 || box.top + box.height > viewport.height || box.left + box.width > viewport.width;
}

export function initChannels(popover: HTMLElement, anchor: HTMLElement): void {
  let manual = false;
  const viewport = () => ({ width: window.innerWidth, height: window.innerHeight });
  const place = () => {
    const anchorBox = anchor.getBoundingClientRect();
    const box = popover.getBoundingClientRect();
    const { left, top } = placeAbove(anchorBox, box, viewport());
    popover.style.position = 'fixed';
    popover.style.setProperty('position-area', 'none');
    popover.style.setProperty('position-anchor', 'none');
    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
    const landed = popover.getBoundingClientRect();
    popover.style.left = `${left - (landed.left - left)}px`;
    popover.style.top = `${top - (landed.top - top)}px`;
  };
  const onMove = () => {
    if (manual && popover.matches(':popover-open')) place();
  };
  popover.addEventListener('toggle', (event) => {
    const open = (event as ToggleEvent).newState === 'open';
    if (!open) return;
    if (manual || offScreen(popover.getBoundingClientRect(), viewport())) {
      manual = true;
      place();
    }
  });
  window.addEventListener('scroll', onMove, { passive: true });
  window.addEventListener('resize', onMove);
}
