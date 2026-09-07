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
- `src/field/portrait.ts` — samples `public/jared.png` by luminance into a point relief.
- `src/field/cloud.ts` — decoder for `public/clouds/*.bin` (header + int16 xyz + rgb8).
- `src/data/stations.ts` — the seven stations: copy, frequency, callsign, hue, artifact.
- `src/ui/` — station rendering, tuner readout, dossier (View Transitions + `#/station` hash routing).
- `src/audio/` — Web Audio radio cues; plans are pure and tested for duration/peak.
- `src/styles/` — tokens (`@property`, `@function`, oklch relative colors), scroll-driven animations, `scroll-state()` container query, `corner-shape`, `sibling-index()`, `text-box`, anchor positioning, popover, `@starting-style`.

## Blender artifacts

The Ting mic and the Seevie stick are modeled with primitives in a Blender scene named `Portfolio` (kept separate from any open scene) and sampled to colored point clouds by `blender/sample_clouds.py`. To regenerate: open Blender with the MCP add-on connected, then run the script via the MCP `execute_blender_code` tool (or paste it into the Text Editor). It writes `public/clouds/ting.bin` and `stick.bin` (65,536 front-hemisphere surface samples each, ~590 KB).

## Deploy

Static output in `dist/`. Any static host works; `vercel` from the repo root deploys it (Vercel auto-detects Vite).
