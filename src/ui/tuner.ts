export interface TunerElements {
  root: HTMLElement;
  freq: HTMLElement;
  band: HTMLElement;
  callsign: HTMLElement;
  ticks: HTMLElement;
  status: HTMLElement;
  masthead: HTMLElement;
}

export interface TunerStation {
  frequency: string;
  band: string;
  callsign: string;
}

const TICK_COUNT = 160;

export class Tuner {
  private sweep: number | null = null;
  private currentValue = 0;
  private reducedMotion: boolean;

  constructor(private readonly els: TunerElements, reducedMotion: boolean) {
    this.reducedMotion = reducedMotion;
    for (let i = 0; i < TICK_COUNT; i++) this.els.ticks.append(document.createElement('i'));
  }

  markStations(fractions: number[]): void {
    const ticks = this.els.ticks.children;
    for (const tick of ticks) tick.removeAttribute('data-station');
    fractions.forEach((fraction, index) => {
      const at = Math.round(fraction * (TICK_COUNT - 1));
      ticks[at]?.setAttribute('data-station', String(index));
    });
  }

  show(station: TunerStation, locked: boolean): void {
    const target = Number.parseFloat(station.frequency);
    this.els.band.textContent = station.band;
    this.els.callsign.textContent = station.callsign;
    this.els.root.classList.toggle('tuner--locked', locked);
    this.els.masthead.classList.toggle('masthead--locked', locked);
    this.els.status.textContent = locked ? 'locked' : 'tuning';
    if (this.sweep !== null) cancelAnimationFrame(this.sweep);
    if (this.reducedMotion || !locked) {
      this.currentValue = target;
      this.els.freq.textContent = formatFrequency(target);
      this.els.root.classList.remove('tuner--sweeping');
      return;
    }
    const from = this.currentValue;
    const start = performance.now();
    const duration = 620;
    this.els.root.classList.add('tuner--sweeping');
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const jitter = t < 1 ? (Math.random() - 0.5) * (1 - t) * 40 : 0;
      const value = from + (target - from) * eased + jitter;
      this.els.freq.textContent = formatFrequency(value);
      if (t < 1) {
        this.sweep = requestAnimationFrame(step);
      } else {
        this.sweep = null;
        this.currentValue = target;
        this.els.freq.textContent = formatFrequency(target);
        this.els.root.classList.remove('tuner--sweeping');
      }
    };
    this.sweep = requestAnimationFrame(step);
  }
}

export function formatFrequency(value: number): string {
  const clamped = Math.max(0, value);
  const [whole, fraction = ''] = clamped.toFixed(3).split('.');
  return `${whole.padStart(3, '0')}.${fraction}`;
}
