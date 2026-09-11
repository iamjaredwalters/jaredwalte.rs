import { applyTint, type Station } from '@/data/stations';
import { stationName } from './render';
import { hashForStation, neighbor } from './router';

export interface DossierElements {
  dialog: HTMLDialogElement;
  freq: HTMLElement;
  band: HTMLElement;
  callsign: HTMLElement;
  title: HTMLElement;
  pitch: HTMLElement;
  brief: HTMLElement;
  details: HTMLElement;
  stack: HTMLElement;
  year: HTMLElement;
  links: HTMLElement;
  close: HTMLButtonElement;
  prev: HTMLButtonElement;
  next: HTMLButtonElement;
}

export interface DossierHooks {
  onOpen(station: Station): void;
  onClose(): void;
}

const NAME = 'station-name';

function transition(update: () => void): Promise<void> {
  if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    update();
    return Promise.resolve();
  }
  return document.startViewTransition(update).finished.catch(() => undefined);
}

export class Dossier {
  private openId: string | null = null;
  private busy = false;

  constructor(
    private readonly els: DossierElements,
    private readonly stations: Station[],
    private readonly hooks: DossierHooks,
  ) {
    els.close.addEventListener('click', () => void this.close());
    els.dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      void this.close();
    });
    els.dialog.addEventListener('click', (event) => {
      if (event.target === els.dialog) void this.close();
    });
    els.prev.addEventListener('click', () => this.step(-1));
    els.next.addEventListener('click', () => this.step(1));
    window.addEventListener('hashchange', () => this.syncFromHash());
  }

  get current(): string | null {
    return this.openId;
  }

  syncFromHash(): void {
    const id = location.hash.startsWith('#/') ? location.hash.slice(2) : null;
    if (id && this.stations.some((s) => s.id === id)) {
      if (this.openId !== id) void this.open(id, false);
    } else if (this.openId) {
      void this.close(false);
    }
  }

  async open(id: string, pushHash = true): Promise<void> {
    const station = this.stations.find((s) => s.id === id);
    if (!station || this.busy) return;
    this.busy = true;
    const wasOpen = this.openId !== null;
    const source = document.querySelector<HTMLElement>(`#station-${id} .station__name`);
    if (source && !wasOpen) source.style.viewTransitionName = NAME;
    applyTint(this.els.dialog, station.tint);
    this.els.dialog.style.setProperty('--chars', String(station.name.length));
    if (!pushHash) document.getElementById(`station-${id}`)?.scrollIntoView({ block: 'start', behavior: 'instant' });
    document.documentElement.classList.add('dossier-open');
    this.hooks.onOpen(station);
    await transition(() => {
      if (source) source.style.viewTransitionName = '';
      this.fill(station);
      this.els.title.style.viewTransitionName = NAME;
      if (!this.els.dialog.open) this.els.dialog.showModal();
    });
    this.els.title.style.viewTransitionName = '';
    this.openId = id;
    if (pushHash && location.hash !== hashForStation(id)) history.pushState(null, '', hashForStation(id));
    this.els.close.focus({ preventScroll: true });
    this.busy = false;
  }

  async close(pushHash = true): Promise<void> {
    if (!this.openId || this.busy) return;
    this.busy = true;
    const id = this.openId;
    const target = document.querySelector<HTMLElement>(`#station-${id} .station__name`);
    this.els.title.style.viewTransitionName = NAME;
    document.documentElement.classList.remove('dossier-open');
    this.hooks.onClose();
    await transition(() => {
      this.els.title.style.viewTransitionName = '';
      this.els.dialog.close();
      if (target) target.style.viewTransitionName = NAME;
    });
    if (target) target.style.viewTransitionName = '';
    this.openId = null;
    if (pushHash && location.hash.startsWith('#/')) history.pushState(null, '', location.pathname + location.search);
    document.querySelector<HTMLElement>(`#station-${id} .station__open`)?.focus({ preventScroll: true });
    this.busy = false;
  }

  private step(direction: 1 | -1): void {
    if (!this.openId) return;
    const next = neighbor(
      this.stations.map((s) => s.id),
      this.openId,
      direction,
    );
    if (next) {
      document.getElementById(`station-${next}`)?.scrollIntoView({ block: 'start', behavior: 'instant' });
      void this.open(next);
    }
  }

  private fill(station: Station): void {
    const ids = this.stations.map((s) => s.id);
    this.els.freq.textContent = station.frequency;
    this.els.band.textContent = station.band;
    this.els.callsign.textContent = station.callsign;
    this.els.title.replaceChildren(stationName(station.name));
    this.els.pitch.textContent = station.pitch;
    this.els.brief.textContent = station.brief;
    this.els.details.replaceChildren(
      ...station.details.map((d) => {
        const li = document.createElement('li');
        li.textContent = d;
        return li;
      }),
    );
    this.els.stack.replaceChildren(
      ...station.stack.map((s) => {
        const li = document.createElement('li');
        li.textContent = s;
        return li;
      }),
    );
    this.els.year.textContent = station.year;
    this.els.links.replaceChildren(
      ...station.links.map((link) => {
        const a = document.createElement('a');
        a.href = link.href;
        a.textContent = link.label;
        a.target = '_blank';
        a.rel = 'noopener';
        return a;
      }),
    );
    this.els.prev.disabled = neighbor(ids, station.id, -1) === null;
    this.els.next.disabled = neighbor(ids, station.id, 1) === null;
  }
}
