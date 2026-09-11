import { LOCK_ON, lerp } from './dial';

export interface TunerElements {
  root: HTMLElement;
  freq: HTMLElement;
  band: HTMLElement;
  callsign: HTMLElement;
  ticks: HTMLElement;
  dial: HTMLElement;
  status: HTMLElement;
  masthead: HTMLElement;
}

export interface TunerStation {
  frequency: string;
  band: string;
  callsign: string;
}

export interface DialReading {
  from: TunerStation;
  to: TunerStation;
  t: number;
  signal: number;
  nearest: TunerStation;
}

export interface DialControls {
  onDrag(deltaFraction: number): void;
  onStep(direction: 1 | -1): void;
}

const TICK_COUNT = 160;

export function supportsScrollTimeline(): boolean {
  return typeof CSS !== 'undefined' && CSS.supports('animation-timeline', 'scroll()');
}

export class Tuner {
  private reading: DialReading | null = null;
  private flicker: number | null = null;
  private lastText = '';
  private readonly nativeStrip = supportsScrollTimeline();

  constructor(
    private readonly els: TunerElements,
    private readonly reducedMotion: boolean,
  ) {
    for (let i = 0; i < TICK_COUNT; i++) {
      const tick = document.createElement('i');
      tick.style.setProperty('--i', String(i + 1));
      this.els.ticks.append(tick);
    }
    this.els.root.querySelectorAll<HTMLElement>('.tuner__meter i').forEach((bar, index) => bar.style.setProperty('--i', String(index + 1)));
  }

  setProgress(fraction: number): void {
    if (this.nativeStrip) return;
    this.els.ticks.style.translate = `${(-Math.min(1, Math.max(0, fraction)) * 100).toFixed(3)}% 0`;
  }

  markStations(fractions: number[]): void {
    const ticks = this.els.ticks.children;
    for (const tick of ticks) tick.removeAttribute('data-station');
    fractions.forEach((fraction, index) => {
      const at = Math.round(fraction * (TICK_COUNT - 1));
      ticks[at]?.setAttribute('data-station', String(index));
    });
  }

  attachControls(controls: DialControls): void {
    const dial = this.els.dial;
    dial.tabIndex = 0;
    dial.setAttribute('role', 'slider');
    dial.setAttribute('aria-label', 'Tuning dial');
    let dragging = false;
    let lastX = 0;
    dial.addEventListener('pointerdown', (event) => {
      dragging = true;
      lastX = event.clientX;
      try {
        dial.setPointerCapture(event.pointerId);
      } catch {
        /* synthetic pointer */
      }
      dial.classList.add('tuner__dial--dragging');
    });
    dial.addEventListener('pointermove', (event) => {
      if (!dragging) return;
      const width = this.els.ticks.getBoundingClientRect().width || 1;
      controls.onDrag((event.clientX - lastX) / width);
      lastX = event.clientX;
    });
    const release = () => {
      dragging = false;
      dial.classList.remove('tuner__dial--dragging');
    };
    dial.addEventListener('pointerup', release);
    dial.addEventListener('pointercancel', release);
    dial.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        controls.onStep(1);
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        controls.onStep(-1);
      }
    });
  }

  dial(reading: DialReading, stationIndex: number, stationCount: number): void {
    this.reading = reading;
    const locked = reading.signal >= LOCK_ON;
    this.els.band.textContent = reading.nearest.band;
    this.els.callsign.textContent = reading.nearest.callsign;
    this.els.root.style.setProperty('--signal', reading.signal.toFixed(3));
    this.els.root.classList.toggle('tuner--locked', locked);
    this.els.root.classList.toggle('tuner--sweeping', !locked);
    this.els.masthead.classList.toggle('masthead--locked', locked);
    this.els.status.textContent = locked ? 'locked' : 'tuning';
    this.els.dial.setAttribute('aria-valuemin', '1');
    this.els.dial.setAttribute('aria-valuemax', String(stationCount));
    this.els.dial.setAttribute('aria-valuenow', String(stationIndex + 1));
    this.els.dial.setAttribute('aria-valuetext', `${reading.nearest.callsign} ${reading.nearest.frequency} ${reading.nearest.band}`);
    this.render();
    if (!locked && !this.reducedMotion && this.flicker === null) {
      const loop = () => {
        if (!this.reading || this.reading.signal >= LOCK_ON) {
          this.flicker = null;
          this.render();
          return;
        }
        this.render();
        this.flicker = requestAnimationFrame(loop);
      };
      this.flicker = requestAnimationFrame(loop);
    }
  }

  private render(): void {
    if (!this.reading) return;
    const { from, to, t, signal } = this.reading;
    const value = lerp(Number.parseFloat(from.frequency), Number.parseFloat(to.frequency), t);
    const jitter = signal >= LOCK_ON || this.reducedMotion ? 0 : (Math.random() - 0.5) * (1 - signal) * 6;
    const text = formatFrequency(value + jitter);
    if (text !== this.lastText) {
      this.lastText = text;
      this.els.freq.textContent = text;
    }
  }
}

export function formatFrequency(value: number): string {
  const clamped = Math.max(0, value);
  const [whole, fraction = ''] = clamped.toFixed(3).split('.');
  return `${whole.padStart(3, '0')}.${fraction}`;
}
