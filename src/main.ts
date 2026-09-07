import { Radio } from '@/audio/radio';
import { ALSO_ON_AIR, STATIONS, type Station } from '@/data/stations';
import { loadCloud } from '@/field/cloud';
import { Field, type TargetOptions } from '@/field/engine';
import { portraitFromImage } from '@/field/portrait';
import { PROCEDURAL } from '@/field/targets';
import { Dossier } from '@/ui/dossier';
import { renderAlso, renderStations } from '@/ui/render';
import { Tuner } from '@/ui/tuner';

const TARGET_POINTS = 65536;
const SLOT = { carrier: 0, portrait: 8, shell: 9 } as const;
const STATION_SLOT = (index: number) => index + 1;
const TARGET_COUNT = 10;

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const wide = matchMedia('(min-width: 56rem)');
const coarse = matchMedia('(pointer: coarse)').matches;

function must<T extends Element>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`missing ${selector}`);
  return node;
}

const zones = new Map<string, { slot: number; station: Station | null; framing: () => { offsetX: number; offsetY: number } }>();

function stationFraming() {
  return wide.matches ? { offsetX: 0.95, offsetY: -0.05 } : { offsetX: 0, offsetY: 0.45 };
}

async function boot(): Promise<void> {
  const stationsRoot = must<HTMLElement>('#stations');
  renderStations(stationsRoot, STATIONS);
  renderAlso(must<HTMLElement>('#also-list'), ALSO_ON_AIR);

  const hero = must<HTMLElement>('#top');
  const about = must<HTMLElement>('#about');
  const also = must<HTMLElement>('#also');
  const contact = must<HTMLElement>('#contact');
  hero.dataset.zone = 'carrier';
  about.dataset.zone = 'portrait';
  also.dataset.zone = 'shell';
  contact.dataset.zone = 'contact';

  zones.set('carrier', { slot: SLOT.carrier, station: null, framing: () => ({ offsetX: 0, offsetY: wide.matches ? 0.42 : 0.7 }) });
  zones.set('portrait', { slot: SLOT.portrait, station: null, framing: () => (wide.matches ? { offsetX: -0.85, offsetY: 0 } : { offsetX: 0, offsetY: 0.55 }) });
  zones.set('shell', { slot: SLOT.shell, station: null, framing: () => ({ offsetX: 0, offsetY: 0 }) });
  zones.set('contact', { slot: SLOT.carrier, station: null, framing: () => ({ offsetX: 0, offsetY: -0.2 }) });
  STATIONS.forEach((station, index) => zones.set(station.id, { slot: STATION_SLOT(index), station, framing: stationFraming }));

  const tuner = new Tuner(
    {
      root: must('#tuner'),
      freq: must('#freq'),
      band: must('#band'),
      callsign: must('#callsign'),
      ticks: must('#ticks'),
      status: must('#status'),
      masthead: must('.masthead'),
    },
    reducedMotion,
  );

  const radio = new Radio();
  const power = must<HTMLButtonElement>('#power');
  power.addEventListener('click', async () => {
    const on = power.getAttribute('aria-pressed') !== 'true';
    power.setAttribute('aria-pressed', String(on));
    power.querySelector('.power__label')!.textContent = on ? 'Audio on' : 'Audio off';
    await radio.power(on);
  });

  const canvas = must<HTMLCanvasElement>('#field');
  const hasWebGPU = 'gpu' in navigator;
  const particleCount = hasWebGPU ? (coarse ? 131072 : 262144) : 65536;
  const field = new Field({
    canvas,
    particleCount,
    targetPoints: TARGET_POINTS,
    targetCount: TARGET_COUNT,
    reducedMotion,
  });
  (window as unknown as { __field: Field }).__field = field;
  must<HTMLElement>('#backend').textContent = `${field.backend === 'webgpu' ? 'WebGPU' : 'WebGL 2'} · ${particleCount.toLocaleString()} particles`;

  field.setTarget(SLOT.carrier, PROCEDURAL.carrier(TARGET_POINTS), { scale: 1, wave: 0.16, spin: 0, tilt: 0.25, distance: 3.2 });
  field.setTarget(SLOT.shell, PROCEDURAL.shell(TARGET_POINTS), { scale: 1, spin: 0.05, distance: 3.4 });

  const proceduralByArtifact: Record<string, [keyof typeof PROCEDURAL, TargetOptions]> = {
    globe: ['globe', { scale: 0.8, spin: 0.9, tilt: 0.08, pitch: 0.12, distance: 3.1 }],
    dome: ['dome', { scale: 0.85, spin: 0.7, tilt: 0.12, pitch: 0.18, distance: 3.0 }],
    graph: ['graph', { scale: 0.72, spin: 0.8, tilt: 0.15, pitch: 0.2, distance: 3.2 }],
    ledger: ['ledger', { scale: 0.8, spin: 0.25, tilt: 0.3, pitch: 0.55, distance: 3.1 }],
    terrain: ['terrain', { scale: 0.75, spin: 0.2, tilt: 0.35, pitch: 0.5, distance: 3.1 }],
  };
  STATIONS.forEach((station, index) => {
    const entry = proceduralByArtifact[station.artifact];
    if (entry) field.setTarget(STATION_SLOT(index), PROCEDURAL[entry[0]](TARGET_POINTS, index + 3), entry[1]);
  });

  let active = 'carrier';
  let lockedTimer: number | undefined;
  const carrierStation = { frequency: '000.000', band: 'MHz', callsign: 'CARRIER' };
  const portraitStation = { frequency: '146.520', band: 'MHz', callsign: 'JARED' };
  const shellStation = { frequency: '000.000', band: 'MHz', callsign: 'STANDBY' };

  function tune(zoneId: string, immediate = false): void {
    const zone = zones.get(zoneId);
    if (!zone) return;
    const changed = zoneId !== active;
    active = zoneId;
    const station = zone.station;
    document.documentElement.style.setProperty('--hue', String(station?.hue ?? (zoneId === 'portrait' ? 30 : 38)));
    field.setFraming(zone.framing());
    if (field.hasTarget(zone.slot)) field.tuneTo(zone.slot, immediate);
    const readout = station ?? (zoneId === 'portrait' ? portraitStation : zoneId === 'carrier' || zoneId === 'contact' ? carrierStation : shellStation);
    tuner.show(readout, true);
    if (changed && !immediate) {
      radio.squelch();
      window.clearTimeout(lockedTimer);
      lockedTimer = window.setTimeout(() => {
        if (active === zoneId && station) radio.roger();
      }, 1500);
    }
  }

  const zoneElements = Array.from(document.querySelectorAll<HTMLElement>('[data-zone]'));
  let ticking = false;
  function onScroll(): void {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const focusY = window.innerHeight * 0.55;
      let best: HTMLElement | null = null;
      let bestDistance = Infinity;
      for (const element of zoneElements) {
        const rect = element.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) continue;
        const center = rect.top + rect.height / 2;
        const distance = Math.abs(center - focusY) - Math.min(rect.height, window.innerHeight) * 0.25;
        if (distance < bestDistance) {
          bestDistance = distance;
          best = element;
        }
      }
      const zoneId = best?.dataset.zone;
      if (zoneId && zoneId !== active && !dossier.current) tune(zoneId);
    });
  }

  function markTicks(): void {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    const fractions = STATIONS.map((station) => {
      const element = document.getElementById(`station-${station.id}`);
      if (!element || total <= 0) return 0;
      return Math.min(1, Math.max(0, (element.offsetTop - window.innerHeight * 0.1) / total));
    });
    tuner.markStations(fractions);
  }

  const dossier = new Dossier(
    {
      dialog: must<HTMLDialogElement>('#dossier'),
      freq: must('#dossier-freq'),
      band: must('#dossier-band'),
      callsign: must('#dossier-callsign'),
      title: must('#dossier-title'),
      pitch: must('#dossier-pitch'),
      brief: must('#dossier-brief'),
      details: must('#dossier-details'),
      stack: must('#dossier-stack'),
      year: must('#dossier-year'),
      links: must('#dossier-links'),
      close: must<HTMLButtonElement>('#dossier-close'),
      prev: must<HTMLButtonElement>('#dossier-prev'),
      next: must<HTMLButtonElement>('#dossier-next'),
    },
    STATIONS,
    {
      onOpen(station) {
        const zone = zones.get(station.id);
        if (!zone) return;
        active = station.id;
        document.documentElement.style.setProperty('--hue', String(station.hue));
        field.setFraming(wide.matches ? { offsetX: 1.1, offsetY: 0 } : { offsetX: 0, offsetY: 0.9 });
        field.tuneTo(zone.slot);
        field.pulse(0.6);
        tuner.show(station, true);
        radio.chirp();
      },
      onClose() {
        radio.squelch();
        const zone = zones.get(active);
        if (zone) field.setFraming(zone.framing());
      },
    },
  );

  stationsRoot.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLElement>('[data-open]');
    if (button?.dataset.open) void dossier.open(button.dataset.open);
  });

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => {
    field.resize();
    markTicks();
    const zone = zones.get(active);
    if (zone) field.setFraming(zone.framing());
  });
  if (!coarse) {
    window.addEventListener('pointermove', (event) => field.setPointer(event.clientX, event.clientY), { passive: true });
    document.addEventListener('pointerleave', () => field.clearPointer());
  }
  window.addEventListener('pointerdown', () => field.pulse(0.45));

  await field.init();
  markTicks();
  tune('carrier', true);
  onScroll();
  dossier.syncFromHash();

  const loads: Promise<void>[] = [];
  STATIONS.forEach((station, index) => {
    if (station.artifact === 'stick' || station.artifact === 'ting') {
      loads.push(
        loadCloud(`/clouds/${station.artifact}.bin`).then((cloud) => {
          const options: TargetOptions =
            station.artifact === 'ting'
              ? { scale: 0.7, spin: 0.35, tilt: 0.12, pitch: 0.05, distance: 3.2 }
              : { scale: 0.7, spin: 0.4, tilt: 0.12, pitch: 0.05, distance: 3.2 };
          field.setTarget(STATION_SLOT(index), { positions: cloud.positions, colors: cloud.colors }, options);
          if (active === station.id) tune(station.id, true);
        }),
      );
    }
  });
  loads.push(
    portraitFromImage('/jared.png', TARGET_POINTS).then((data) => {
      field.setTarget(SLOT.portrait, data, { scale: 0.9, spin: 0.12, tilt: 0.12, distance: 2.9 });
      if (active === 'portrait') tune('portrait', true);
    }),
  );
  await Promise.allSettled(loads);
  requestAnimationFrame(markTicks);
}

boot().catch((error: unknown) => {
  console.error(error);
  document.documentElement.classList.add('no-field');
  const status = document.getElementById('status');
  if (status) status.textContent = 'no signal';
});
