# jaredwalte.rs — receiver

Personal portfolio. The site is a receiver: one WebGPU compute-particle field fills the viewport and scrolling tunes through seven stations (projects). The field morphs from a carrier wave into each project's artifact, a dossier opens with a View Transition, and an optional radio layer plays squelch and chirps between stations.

## Stations and frequencies

Every station sits on a real allocation that matches the project (`frequencyNote` in `src/data/stations.ts`, shown in the dossier header):

| Station | Callsign | MHz | What lives there |
| --- | --- | --- | --- |
| Seevie | PULSE | 2400.000 | The 2.4 GHz Wi-Fi band the stick talks over |
| Ting Radio | OVERWATCH | 296.800 | Apollo's VHF voice downlink, the channel CAPCOM used |
| Thereabouts | FIX | 1575.420 | GPS L1, the carrier a phone fixes position from |
| Vela | ZENITH | 1420.405 | The hydrogen line, radio astronomy's signature frequency |
| add2cal | TIMECHECK | 10.000 | WWV, the NIST time-signal station |
| Aleph | LOGBOOK | 162.400 | NOAA Weather Radio, a continuous report of conditions |
| Flea | LEVER | 27.145 | The 27 MHz band used by radio-controlled cars |
| About | JARED | 146.520 | The 2-meter amateur calling frequency |

The carrier (hero) and the sign-off sit at 000.000: nothing tuned.

## Sign-on and sign-off

The hero eyebrow is the sign-on: `CQ CQ CQ de JW`, the general call meaning "calling any station", sent three times with the callsign, from Los Angeles. The contact section answers it.

The contact section spells `73 DE JW` in Morse on a dead carrier trace (`src/field/signoff.ts`). `73` is the amateur-radio sign-off for "best regards" (from the 1859 Western Union numeric code, where 88 is "love and kisses"); `DE` is the procedural word for "from" that separates stations in a contact; `JW` stands in for a callsign. Timing is standard: dot 1 unit, dash 3, 1 between elements, 3 between letters, 7 between words, so the trace reads `--... ...--  -.. .  .--- .--`. The pulses are the only reactive nodes and breathe with the music.

## Run

```
pnpm install
pnpm dev        # http://localhost:5173
pnpm test       # vitest
pnpm build      # typecheck + vite build → dist/
pnpm preview
```

`?gl` on the URL forces the WebGL 2 fallback (65k particles). WebGPU (probed with `requestAdapter`, since Firefox exposes `navigator.gpu` but blocklists it on macOS) gets 262k on desktop, 131k on coarse pointers.

Cross-browser check: `cd /tmp/pwff && node ff.mjs` drives Playwright's Firefox through the hero, a station and a mid-tune state and prints alignment numbers and console warnings (set up with `npm i playwright && npx playwright install firefox`). Headless Firefox does not render the WebGL field; the numbers and layout are still valid.

## Layout

- `src/field/engine.ts` — three r185 `WebGPURenderer` + TSL. Storage buffers for position/velocity/color, a `targetCount × targetPoints` storage buffer of morph targets, one compute pass per frame (spring to target, noise turbulence, pointer repulsion), additive sprites, bloom + grain post pass via `RenderPipeline`.
- `src/field/targets.ts` — procedural point-cloud generators (carrier wave, globe, constellation dome, hub graph, bar ledger, terrain). Pure, seeded, unit-tested.
- `src/field/signoff.ts` — the sign-off: a dead carrier trace with `73 DE JW` riding on it as Morse pulses (the hot nodes).
- `src/field/portrait.ts` — samples `src/assets/portrait.webp` (a headshot on black, 512px, imported so Vite hashes the URL and a swapped photo never serves stale from cache) by luminance into a point relief: density is `(luminance − black)^gamma`, so a dark background needs no mask. A high black point is what makes a face read: it empties the eye sockets and neck the way hard light would. Points sit on 64 scan lines (`rows`), and the target's `scan` option draws the raster in top to bottom on lock, like a slow-scan TV frame, with the undrawn rows held as static. Alpha is honoured for cutouts; `scripts/cutout.swift` lifts a subject off its background with macOS Vision: `swift scripts/cutout.swift in.jpg out.png`.
- `src/field/cloud.ts` — decoder for `public/clouds/*.bin` (header + int16 xyz + rgb8, v2 adds a hot-weight byte).
- `src/data/stations.ts` — the seven stations: copy, frequency, callsign, tint, artifact. Palette: bakelite `#131110`, ivory text, and three tints (verdigris, dusty rose, lilac) as registered `--hue/--accent-l/--accent-c` properties that tween between stations.
- `src/ui/` — station rendering, the dial (`dial.ts`: scroll position → station blend, signal strength with a lock plateau and hysteresis), tuner readout and draggable strip, dossier (View Transitions + `#/station` hash routing).
- `src/audio/` — Web Audio radio cues; plans are pure and tested for duration/peak.
- `src/styles/` — tokens (`@property`, `@function`, oklch relative colors), scroll-driven animations, `scroll-state()` container query, `corner-shape`, `sibling-index()`, `text-box`, anchor positioning, popover, `@starting-style`.

## Broadcast audio

`public/audio/` holds the radio layer: a static bed, three cues (squelch, chirp, roger), a 75 s ambient theme, and a 40 s instrumental bed plus a 16 s texture loop per station. All generated with ElevenLabs (Eleven Music v2 with `force_instrumental`, Sound Effects v2 with `loop`) by `scripts/broadcast.mjs`; prompts live in that file. Regenerate one clip with `node scripts/broadcast.mjs --force --only flea-bed`; `--dry` lists jobs. Needs `ELEVENLABS_API_KEY` in `.env` (gitignored). A full batch is about eight minutes of audio.

At runtime everything stays behind the masthead power switch. `src/audio/mixer.ts` trims silence, loudness-normalizes each clip to a per-bus RMS target, loops with overlapping crossfades, crossfades beds between stations, ducks under an open dossier, and exposes analyser band levels that drive the particle field (`uAudioLow` → turbulence and carrier amplitude, `uAudioHigh` → sprite brightness pulses, both relative to a slow baseline so they follow beats, not volume). Missing files fall back to the synthesized cues in `src/audio/cues.ts`.

## Blender artifacts

The Ting mic and the Seevie stick are modeled with primitives by `blender/build_models.py` (idempotent: rebuilds a scene named `Portfolio`, separate from any open scene) and sampled to colored point clouds by `blender/sample_clouds.py`. To regenerate: open Blender with the MCP add-on connected, then run both scripts in order via the MCP `execute_blender_code` tool (or paste them into the Text Editor). It writes `public/clouds/ting.bin` and `stick.bin` (65,536 front-hemisphere surface samples each, format v2: int16 xyz, rgb8, and a per-point hot weight from each object's `hot` property).

## Deploy

Static output in `dist/`. Hosted on Vercel for now: pushes to `main` on `iamjaredwalters/jaredwalte.rs` deploy through the Vercel project, and `vercel.json` pins the Vite build so the dashboard preset does not matter. Hash routing, so no rewrites or functions are needed. The eventual move is Cloudflare Pages: `pnpm build && wrangler pages deploy dist`, then point the domain at the Pages hostname.
