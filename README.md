# jaredwalte.rs — receiver

Personal portfolio. The site is a receiver: one WebGPU compute-particle field fills the viewport and scrolling tunes through seven stations (projects). The field morphs from a carrier wave into each project's artifact, a dossier opens with a View Transition, and an optional radio layer plays squelch and chirps between stations.

## Run

```
pnpm install
pnpm dev        # http://localhost:5173
pnpm test       # vitest
pnpm build      # typecheck + vite build → dist/
pnpm preview
```

`?gl` on the URL forces the WebGL 2 fallback (65k particles). WebGPU gets 262k on desktop, 131k on coarse pointers.

## Layout

- `src/field/engine.ts` — three r185 `WebGPURenderer` + TSL. Storage buffers for position/velocity/color, a `targetCount × targetPoints` storage buffer of morph targets, one compute pass per frame (spring to target, noise turbulence, pointer repulsion), additive sprites, bloom + grain post pass via `RenderPipeline`.
- `src/field/targets.ts` — procedural point-cloud generators (carrier wave, globe, constellation dome, hub graph, bar ledger, terrain). Pure, seeded, unit-tested.
- `src/field/portrait.ts` — samples `public/jared-jetski.webp` (alpha-masked cutout) by luminance into a point relief. `scripts/cutout.swift` lifts a subject off its background with macOS Vision: `swift scripts/cutout.swift in.jpg out.png`.
- `src/field/cloud.ts` — decoder for `public/clouds/*.bin` (header + int16 xyz + rgb8).
- `src/data/stations.ts` — the seven stations: copy, frequency, callsign, tint, artifact. Palette: bakelite `#131110`, ivory text, and three tints (verdigris, dusty rose, lilac) as registered `--hue/--accent-l/--accent-c` properties that tween between stations.
- `src/ui/` — station rendering, tuner readout, dossier (View Transitions + `#/station` hash routing).
- `src/audio/` — Web Audio radio cues; plans are pure and tested for duration/peak.
- `src/styles/` — tokens (`@property`, `@function`, oklch relative colors), scroll-driven animations, `scroll-state()` container query, `corner-shape`, `sibling-index()`, `text-box`, anchor positioning, popover, `@starting-style`.

## Broadcast audio

`public/audio/` holds the radio layer: a static bed, three cues (squelch, chirp, roger), a 75 s ambient theme, and a 40 s instrumental bed plus a 16 s texture loop per station. All generated with ElevenLabs (Eleven Music v2 with `force_instrumental`, Sound Effects v2 with `loop`) by `scripts/broadcast.mjs`; prompts live in that file. Regenerate one clip with `node scripts/broadcast.mjs --force --only flea-bed`; `--dry` lists jobs. Needs `ELEVENLABS_API_KEY` in `.env` (gitignored). A full batch is about eight minutes of audio.

At runtime everything stays behind the masthead power switch. `src/audio/mixer.ts` trims silence, loudness-normalizes each clip to a per-bus RMS target, loops with overlapping crossfades, crossfades beds between stations, ducks under an open dossier, and exposes analyser band levels that drive the particle field (`uAudioLow` → turbulence and carrier amplitude, `uAudioHigh` → sprite brightness pulses, both relative to a slow baseline so they follow beats, not volume). Missing files fall back to the synthesized cues in `src/audio/cues.ts`.

## Blender artifacts

The Ting mic and the Seevie stick are modeled with primitives by `blender/build_models.py` (idempotent: rebuilds a scene named `Portfolio`, separate from any open scene) and sampled to colored point clouds by `blender/sample_clouds.py`. To regenerate: open Blender with the MCP add-on connected, then run both scripts in order via the MCP `execute_blender_code` tool (or paste them into the Text Editor). It writes `public/clouds/ting.bin` and `stick.bin` (65,536 front-hemisphere surface samples each, ~590 KB).

## Deploy

Static output in `dist/`. Any static host works; `vercel` from the repo root deploys it (Vercel auto-detects Vite).
