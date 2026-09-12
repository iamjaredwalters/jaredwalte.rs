import { applyTint, type Station, type StationLink } from '@/data/stations';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function stationName(name: string): DocumentFragment {
  const fragment = document.createDocumentFragment();
  const words = name.split(' ');
  words.forEach((word, i) => {
    if (i === words.length - 1 && words.length > 1) {
      const em = el('em', undefined, word);
      fragment.append(em);
    } else {
      fragment.append(document.createTextNode(word + (i < words.length - 1 ? ' ' : '')));
    }
  });
  return fragment;
}

export function renderStations(container: HTMLElement, stations: Station[]): HTMLElement[] {
  return stations.map((station, index) => {
    const article = el('article', 'station');
    article.id = `station-${station.id}`;
    article.dataset.station = station.id;
    article.dataset.zone = station.id;
    applyTint(article, station.tint);
    article.style.setProperty('--chars', String(station.name.length));

    const text = el('div', 'station__text');
    const meta = el('p', 'station__index');
    meta.append(
      el('span', undefined, `Station ${String(index + 1).padStart(2, '0')} / ${String(stations.length).padStart(2, '0')}`),
      el('span', 'station__freq', `${station.frequency} ${station.band}`),
    );
    const title = el('h2', 'station__name');
    title.append(stationName(station.name));
    const pitch = el('p', 'station__pitch', station.pitch);
    const brief = el('p', 'station__brief', station.brief);
    const actions = el('div', 'station__actions');
    const open = el('button', 'button station__open', 'Open dossier');
    open.type = 'button';
    open.dataset.open = station.id;
    actions.append(open);
    for (const link of station.links) {
      const a = el('a', 'button', link.label);
      a.href = link.href;
      a.target = '_blank';
      a.rel = 'noopener';
      actions.append(a);
    }
    text.append(meta, title, pitch, brief, actions);

    const artifact = el('div', 'station__artifact');
    const caption = el('p', 'station__caption');
    caption.append(el('span', undefined, 'callsign '), el('b', undefined, station.callsign));
    artifact.append(caption);

    article.append(text, artifact);
    container.append(article);
    return article;
  });
}

export function renderAlso(list: HTMLElement, links: StationLink[]): void {
  for (const link of links) {
    const li = el('li');
    const a = el('a', undefined, link.label);
    a.href = link.href;
    a.target = '_blank';
    a.rel = 'noopener';
    li.append(a);
    list.append(li);
  }
}
