import type { TintName } from '@/data/stations';

const ACCENT: Record<TintName, string> = { verdigris: '#7fc9b3', rose: '#ef99bb', lilac: '#cbafed', ivory: '#f1e3cb' };

export function faviconSvg(accent: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#131110"/><path d="M3 16c3-9 6-9 9 0s6 9 9 0 6-9 9 0" fill="none" stroke="${accent}" stroke-width="2.6" stroke-linecap="round"/><circle cx="16" cy="16" r="3" fill="#efe9dc"/></svg>`;
}

export function faviconUrl(tint: TintName): string {
  return `data:image/svg+xml,${encodeURIComponent(faviconSvg(ACCENT[tint]))}`;
}

export function followTint(tint: TintName): void {
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (link) link.href = faviconUrl(tint);
}
