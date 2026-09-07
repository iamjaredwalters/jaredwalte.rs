const PREFIX = '#/';

export function stationFromHash(hash: string): string | null {
  if (!hash.startsWith(PREFIX)) return null;
  const id = hash.slice(PREFIX.length).trim();
  return /^[a-z0-9-]+$/.test(id) ? id : null;
}

export function hashForStation(id: string): string {
  return `${PREFIX}${id}`;
}

export function neighbor(ids: readonly string[], current: string, step: 1 | -1): string | null {
  const index = ids.indexOf(current);
  if (index < 0) return null;
  const next = index + step;
  return next >= 0 && next < ids.length ? ids[next] : null;
}
