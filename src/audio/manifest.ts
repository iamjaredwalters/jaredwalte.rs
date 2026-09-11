export interface StationClips {
  bed: string;
  texture: string;
}

export interface AudioManifest {
  theme: string;
  static: string;
  cues: { squelch: string; chirp: string; roger: string };
  stations: Record<string, StationClips>;
}

export interface ZoneClips {
  bed: string | null;
  texture: string | null;
  bedLevel: number;
}

const BASE = '/audio';

export const MANIFEST: AudioManifest = {
  theme: `${BASE}/theme.mp3`,
  static: `${BASE}/static.mp3`,
  cues: {
    squelch: `${BASE}/cue-squelch.mp3`,
    chirp: `${BASE}/cue-chirp.mp3`,
    roger: `${BASE}/cue-roger.mp3`,
  },
  stations: Object.fromEntries(
    ['seevie', 'ting-radio', 'thereabouts', 'vela', 'add2cal', 'aleph', 'flea'].map((id) => [
      id,
      { bed: `${BASE}/${id}-bed.mp3`, texture: `${BASE}/${id}-texture.mp3` },
    ]),
  ),
};

export const BED_LEVELS: Record<string, number> = { vela: 0.85 };

export function clipsForZone(zoneId: string, manifest: AudioManifest = MANIFEST): ZoneClips {
  const station = manifest.stations[zoneId];
  if (station) return { bed: station.bed, texture: station.texture, bedLevel: BED_LEVELS[zoneId] ?? 0.5 };
  if (zoneId === 'carrier') return { bed: manifest.theme, texture: null, bedLevel: 0.55 };
  if (zoneId === 'portrait' || zoneId === 'contact') return { bed: manifest.theme, texture: null, bedLevel: 0.35 };
  return { bed: null, texture: null, bedLevel: 0 };
}

export function preloadOrder(activeZone: string, manifest: AudioManifest = MANIFEST): string[] {
  const active = clipsForZone(activeZone, manifest);
  const first = [manifest.static, manifest.cues.squelch, manifest.cues.roger, manifest.cues.chirp, active.bed, active.texture];
  const rest = [manifest.theme, ...Object.values(manifest.stations).flatMap((s) => [s.bed, s.texture])];
  const seen = new Set<string>();
  const order: string[] = [];
  for (const url of [...first, ...rest]) {
    if (url && !seen.has(url)) {
      seen.add(url);
      order.push(url);
    }
  }
  return order;
}
