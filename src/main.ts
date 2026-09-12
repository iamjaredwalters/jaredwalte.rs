import { Radio } from '@/audio/radio';
import { ALSO_ON_AIR, STATIONS, applyTint, type Station, type TintName } from '@/data/stations';
import { loadCloud } from '@/field/cloud';
import type { Field, Framing, TargetOptions } from '@/field/engine';
import { portraitFromImage } from '@/field/portrait';
import { followTint } from '@/ui/favicon';
import { initChannels } from '@/ui/channels';
import { keyLevel, keySchedule, sidetonePlan } from '@/audio/keyer';
import portraitUrl from '@/assets/portrait.webp';
import { morseMarks, signoffTarget } from '@/field/signoff';
import { PROCEDURAL } from '@/field/targets';
import { dialState, lerp, nextLock } from '@/ui/dial';
import { Dossier } from '@/ui/dossier';
import { renderAlso, renderStations } from '@/ui/render';
import { Tuner, type TunerStation } from '@/ui/tuner';

const TARGET_POINTS = 65536;
const SLOT = { carrier: 0, portrait: 8, shell: 9, signoff: 10 } as const;
const STATION_SLOT = (index: number) => index + 1;
const TARGET_COUNT = 11;

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const wide = matchMedia('(min-width: 56rem)');
const coarse = matchMedia('(pointer: coarse)').matches;

interface Zone {
  id: string;
  element: HTMLElement;
  slot: number;
  station: Station | null;
  tint: TintName;
  readout: TunerStation;
  framing: () => Framing;
  top: number;
}

function must<T extends Element>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`missing ${selector}`);
  return node;
}

const CARRIER: TunerStation = { frequency: '000.000', band: 'MHz', callsign: 'CARRIER' };
const PORTRAIT: TunerStation = { frequency: '146.520', band: 'MHz', callsign: 'JARED' };
const STANDBY: TunerStation = { frequency: '000.000', band: 'MHz', callsign: 'STANDBY' };
const SIGN_OFF: TunerStation = { frequency: '000.000', band: 'MHz', callsign: 'SIGN-OFF' };

function stationFraming(): Framing {
  return wide.matches ? { offsetX: 0.95, offsetY: -0.05, zoom: 1 } : { offsetX: 0, offsetY: 0.32, zoom: 1.25 };
}

async function boot(): Promise<void> {
  const stationsRoot = must<HTMLElement>('#stations');
  renderStations(stationsRoot, STATIONS);
  renderAlso(must<HTMLElement>('#also-list'), ALSO_ON_AIR);

  const zones: Zone[] = [
    {
      id: 'carrier',
      element: must('#top'),
      slot: SLOT.carrier,
      station: null,
      tint: 'verdigris',
      readout: CARRIER,
      framing: () => ({ offsetX: 0, offsetY: wide.matches ? 0.42 : 0.7, zoom: 1 }),
      top: 0,
    },
    ...STATIONS.map((station, index) => ({
      id: station.id,
      element: must<HTMLElement>(`#station-${station.id}`),
      slot: STATION_SLOT(index),
      station,
      tint: station.tint,
      readout: station,
      framing: stationFraming,
      top: 0,
    })),
    {
      id: 'shell',
      element: must('#also'),
      slot: SLOT.shell,
      station: null,
      tint: 'ivory',
      readout: STANDBY,
      framing: () => ({ offsetX: 0, offsetY: 0, zoom: 1 }),
      top: 0,
    },
    {
      id: 'portrait',
      element: must('#about'),
      slot: SLOT.portrait,
      station: null,
      tint: 'rose',
      readout: PORTRAIT,
      framing: () => (wide.matches ? { offsetX: -0.85, offsetY: -0.16, zoom: 1 } : { offsetX: 0, offsetY: 0.5, zoom: 1.3 }),
      top: 0,
    },
    {
      id: 'contact',
      element: must('#contact'),
      slot: SLOT.signoff,
      station: null,
      tint: 'verdigris',
      readout: SIGN_OFF,
      framing: () => (wide.matches ? { offsetX: 0.85, offsetY: -0.2, zoom: 1 } : { offsetX: 0, offsetY: -0.5, zoom: 1.6 }),
      top: 0,
    },
  ];
  const zoneById = new Map(zones.map((zone) => [zone.id, zone]));

  const tuner = new Tuner(
    {
      root: must('#tuner'),
      freq: must('#freq'),
      band: must('#band'),
      callsign: must('#callsign'),
      ticks: must('#ticks'),
      dial: must('.tuner__dial'),
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
    if (on && keying) callCq(2800);
  });

  const canvas = must<HTMLCanvasElement>('#field');
  const { Field: FieldEngine, probeWebGPU } = await import('@/field/engine');
  const hasWebGPU = !new URLSearchParams(location.search).has('gl') && (await probeWebGPU());
  const particleCount = hasWebGPU ? (coarse ? 131072 : 262144) : 65536;
  const field = new FieldEngine({
    canvas,
    particleCount,
    targetPoints: TARGET_POINTS,
    targetCount: TARGET_COUNT,
    reducedMotion,
    forceWebGL: !hasWebGPU,
  });
  (window as unknown as { __field: Field; __radio: Radio }).__field = field;
  (window as unknown as { __field: Field; __radio: Radio }).__radio = radio;
  must<HTMLElement>('#backend').textContent = `${field.backend === 'webgpu' ? 'WebGPU' : 'WebGL 2'} · ${particleCount.toLocaleString()} particles`;

  field.setTarget(SLOT.carrier, PROCEDURAL.carrier(TARGET_POINTS), { scale: 1, wave: 0.16, spin: 0, tilt: 0.25, distance: 3.2 });
  field.setTarget(SLOT.shell, PROCEDURAL.shell(TARGET_POINTS), { scale: 1, spin: 0.05, distance: 3.4, react: { radial: 0.2 } });
  field.setTarget(SLOT.signoff, signoffTarget(morseMarks('73 DE JW'), TARGET_POINTS), { scale: 1, spin: 0, tilt: 0.02, pitch: 0, distance: 3.1, bright: 0.7, jitter: 0.004, turbulence: 0.0006, react: { z: 0.05 } });

  const proceduralByArtifact: Record<string, [keyof typeof PROCEDURAL, TargetOptions]> = {
    globe: ['globe', { scale: 0.8, spin: 0.9, tilt: 0.08, pitch: 0.12, distance: 3.1, react: { radial: 0.11 } }],
    dome: ['dome', { scale: 0.85, spin: 0.7, tilt: 0.12, pitch: 0.18, distance: 3.0, react: { radial: 0.12 } }],
    calendar: ['calendar', { scale: 0.68, spin: 0.35, tilt: 0.12, pitch: 0.08, distance: 3.2, react: { z: 0.05 } }],
    ledger: ['ledger', { scale: 0.8, spin: 0.25, tilt: 0.3, pitch: 0.55, distance: 3.1, react: { vertical: 0.6, floor: -0.4 } }],
    terrain: ['terrain', { scale: 0.75, spin: 0.2, tilt: 0.35, pitch: 0.5, distance: 3.1, react: { vertical: 0.45, floor: -0.62 } }],
  };
  STATIONS.forEach((station, index) => {
    const entry = proceduralByArtifact[station.artifact];
    if (entry) field.setTarget(STATION_SLOT(index), PROCEDURAL[entry[0]](TARGET_POINTS, index + 3), entry[1]);
  });

  let activeTint: TintName | null = null;
  let locked = true;
  let lockedZone = 'carrier';
  let frozen = false;
  let currentZone = 'carrier';
  let lastFrom = 0;
  const CQ = keySchedule('CQ CQ CQ DE JW K', 80);
  let keying = false;
  let cqTimer = 0;
  const callCq = (afterMs: number) => {
    window.clearTimeout(cqTimer);
    cqTimer = window.setTimeout(() => {
      const startedAt = performance.now();
      if (!reducedMotion) field.setKeyer((now) => keyLevel(CQ, now - startedAt, 0.85, 4000));
      radio.sidetone(sidetonePlan(CQ));
    }, afterMs);
  };
  let lastTo = 0;

  function measure(): void {
    const paddingTop = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    const total = document.documentElement.scrollHeight - window.innerHeight;
    for (const zone of zones) {
      zone.top = Math.min(total, Math.max(0, zone.element.getBoundingClientRect().top + window.scrollY - paddingTop));
    }
    zones[0].top = 0;
    tuner.markStations(
      STATIONS.map((station) => {
        const zone = zoneById.get(station.id);
        return zone && total > 0 ? Math.min(1, Math.max(0, zone.top / total)) : 0;
      }),
    );
  }

  function updateDial(): void {
    if (frozen) return;
    const state = dialState(window.scrollY, zones.map((zone) => zone.top), window.innerHeight);
    const from = zones[state.from];
    const to = zones[state.to];
    const nearest = zones[state.nearest];
    lastFrom = state.from;
    lastTo = state.to;
    field.setDial(from.slot, to.slot, state.t, state.signal, SLOT.shell);
    const a = from.framing();
    const b = to.framing();
    field.setFraming({ offsetX: lerp(a.offsetX, b.offsetX, state.t), offsetY: lerp(a.offsetY, b.offsetY, state.t), zoom: lerp(a.zoom, b.zoom, state.t) });
    const lockedOnCarrier = nearest.id === 'carrier' && state.signal > 0.95;
    if (lockedOnCarrier !== keying) {
      keying = lockedOnCarrier;
      if (keying) callCq(1600);
      else {
        window.clearTimeout(cqTimer);
        field.setKeyer(null);
        radio.hush();
      }
    }
    if (nearest.tint !== activeTint) {
      activeTint = nearest.tint;
      applyTint(document.documentElement, nearest.tint);
      followTint(nearest.tint);
    }
    const stationIndex = nearest.station ? STATIONS.indexOf(nearest.station) : -1;
    tuner.dial({ from: from.readout, to: to.readout, t: state.t, signal: state.signal, nearest: nearest.readout }, Math.max(0, stationIndex), STATIONS.length);
    currentZone = nearest.id;
    radio.setSignal(nearest.id, state.signal);
    const wasLocked = locked;
    locked = nextLock(locked, state.signal);
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    tuner.setProgress(scrollable > 0 ? lerp(from.top, to.top, state.t) / scrollable : 0);
    if (locked && !wasLocked) {
      lockedZone = nearest.id;
      radio.lock(nearest.id);
    } else if (!locked && wasLocked) {
      radio.unlock();
    } else if (locked && lockedZone !== nearest.id) {
      lockedZone = nearest.id;
    }
  }

  let ticking = false;
  function onScroll(): void {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      updateDial();
    });
  }

  function stepStation(direction: 1 | -1): void {
    const current = zoneById.get(currentZone);
    const index = current ? zones.indexOf(current) : 0;
    const targetIndex = locked ? index + direction : direction > 0 ? lastTo : lastFrom;
    const next = zones[Math.min(zones.length - 1, Math.max(0, targetIndex))];
    window.scrollTo({ top: next.top, behavior: reducedMotion ? 'instant' : 'smooth' });
  }

  tuner.attachControls({
    onDrag(deltaFraction) {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo({ top: window.scrollY - deltaFraction * total, behavior: 'instant' });
    },
    onStep: stepStation,
  });

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
      origin: must('#dossier-origin'),
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
        const zone = zoneById.get(station.id);
        if (!zone) return;
        frozen = true;
        applyTint(document.documentElement, station.tint);
        followTint(station.tint);
        field.setFraming(wide.matches ? { offsetX: 1.1, offsetY: 0, zoom: 1 } : { offsetX: 0, offsetY: 0.85, zoom: 1.35 });
        field.tuneTo(zone.slot);
        field.pulse(0.6);
        radio.setSignal(station.id, 1);
        radio.duck(true);
        radio.chirp();
      },
      onClose() {
        frozen = false;
        radio.duck(false);
        radio.squelch();
        updateDial();
      },
    },
  );

  stationsRoot.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLElement>('[data-open]');
    if (button?.dataset.open) void dossier.open(button.dataset.open);
  });

  initChannels(must<HTMLElement>('#channels'), must<HTMLElement>('#channels-anchor'));
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => {
    field.resize();
    measure();
    updateDial();
  });
  new ResizeObserver(() => {
    measure();
    updateDial();
  }).observe(document.body);
  void document.fonts.ready.then(() => {
    measure();
    updateDial();
  });
  if (!coarse) {
    window.addEventListener('pointermove', (event) => field.setPointer(event.clientX, event.clientY), { passive: true });
    document.addEventListener('pointerleave', () => field.clearPointer());
  }
  window.addEventListener('pointerdown', () => field.pulse(0.45));

  field.setAudioSource(() => radio.levels());
  await field.init();
  measure();
  updateDial();
  dossier.syncFromHash();

  const loads: Promise<void>[] = [];
  STATIONS.forEach((station, index) => {
    if (station.artifact === 'stick' || station.artifact === 'ting') {
      loads.push(
        loadCloud(`/clouds/${station.artifact}.bin`).then((cloud) => {
          const options: TargetOptions =
            station.artifact === 'ting'
              ? { scale: 0.7, spin: 0.35, tilt: 0.12, pitch: 0.05, distance: 3.2, bright: 0.75, react: { radial: 0.05 } }
              : { scale: 0.7, spin: 0.4, tilt: 0.12, pitch: 0.05, distance: 3.2, bright: 0.75, react: { radial: 0.05 } };
          field.setTarget(STATION_SLOT(index), { positions: cloud.positions, colors: cloud.colors, weights: cloud.weights }, options);
          updateDial();
        }),
      );
    }
  });
  loads.push(
    portraitFromImage(portraitUrl, TARGET_POINTS, { black: 0.3, gamma: 1.6, rows: 64 }).then((data) => {
      field.setTarget(SLOT.portrait, data, { scale: 0.75, spin: 0.14, tilt: 0.12, pitch: 0.02, distance: 2.9, bright: 0.3, jitter: 0.004, turbulence: 0.0006, scan: 2.4 });
      updateDial();
    }),
  );
  await Promise.allSettled(loads);
  requestAnimationFrame(() => {
    measure();
    updateDial();
  });
}

boot().catch((error: unknown) => {
  console.error(error);
  document.documentElement.classList.add('no-field');
  const status = document.getElementById('status');
  if (status) status.textContent = 'no signal';
});
