# Portfolio — jaredwalte.rs

Concept: **the site is a receiver.** One persistent WebGPU compute-particle field (three r185 `WebGPURenderer` + TSL, WebGL2 fallback) fills the viewport. Scrolling "tunes" through stations (projects); the field morphs from a carrier wave into each project's artifact (Blender-sampled point clouds of the Ting mic, the Seevie stick, procedural constellation/city, a particle portrait). CSS scroll-driven animations drive the dial readout and the page accent hue per station; same-document View Transitions open project dossiers; optional radio audio cues (Web Audio synthesis, modeled on real squelch/chirp).

Stack: Vite 8 + TypeScript 7 + three 0.185 (`three/webgpu`, `three/tsl`). No framework. Blender 5.2 via MCP generates point clouds → `public/clouds/*.bin` (int16 xyz + rgb8, 65,536 pts each).

## Stage 0: Scaffold + tokens
**Goal**: repo, Vite MPA-free single page, design tokens (oklch, `light-dark()`), fonts, layout skeleton, project data file.
**Success Criteria**: `pnpm dev` serves a page with all sections and correct type; `pnpm build` passes typecheck.
**Tests**: vitest for data/point-cloud decoding helpers.
**Status**: Complete

## Stage 1: Particle engine
**Goal**: `src/field/` — storage buffers (position, velocity, seed), K morph targets in one storage buffer, compute update (spring to target + curl noise + pointer repulsion), sprite render with additive glow, WebGL2 fallback, reduced-motion path, DPR/particle-count budget.
**Success Criteria**: 262k particles at 60fps on M-series in WebGPU; morphs between procedural targets (carrier wave, sphere, constellation) via a `setTarget(i)` API; degrades without WebGPU.
**Tests**: target generators are pure and unit-tested (counts, bounds).
**Status**: Complete

## Stage 2: Blender artifacts
**Goal**: model Ting (EP-2350) and Seevie stick (M5StickS3) in a fresh Blender scene, sample colored surface points, export `.bin`; loader + decoder on the web side; targets registered.
**Success Criteria**: silhouettes recognizable at particle scale; files < 700 KB each.
**Tests**: decoder round-trip test on a synthetic buffer.
**Status**: Complete

## Stage 3: Scroll choreography
**Goal**: sections as stations; `animation-timeline: scroll()`/`view()` for readout, dial, accent hue (`@property`), `scroll-state()` sticky header; JS scroll observer drives field target + camera path; `sibling-index()` stagger; `text-box-trim`, `corner-shape`, `@function`, `if()`.
**Success Criteria**: tuning feels continuous; readout frequency matches station; no layout shift.
**Tests**: station table has unique frequencies and ordered ranges (unit).
**Status**: Complete

## Stage 4: Dossiers (project detail)
**Goal**: click a station → same-document View Transition into a full-screen dossier (`view-transition-name` morphs), deep-linkable `#/station`, Esc/back closes; field zooms into the artifact; optional TSL post pass (dither) for Seevie.
**Success Criteria**: transitions at 60fps; history works; keyboard accessible.
**Tests**: router unit tests (hash ↔ station).
**Status**: Complete

## Stage 5: Radio audio
**Goal**: opt-in "power" toggle; Web Audio synthesized squelch tail + key-up chirp on station change (≥100 ms, peak ≈ −3 dB); muted by default; respects `prefers-reduced-motion`.
**Success Criteria**: cues audible and radio-like; no autoplay violations.
**Tests**: cue envelope generator unit tests (duration, peak).
**Status**: Complete

## Stage 6: About, contact, polish, ship
**Goal**: particle portrait (avatar → point relief), timeline, contact popover (`popover`, anchor positioning), OG image, favicon, perf budget, a11y pass, `pnpm build` output ready for Cloudflare Pages/Vercel.
**Success Criteria**: keyboard nav complete; engine chunk lazy-loaded so text paints before three.js; OG image captured from the live hero.
**Tests**: build passes; smoke test via Playwright screenshot.
**Status**: Complete (Lighthouse not run)

## Stage 7: Live preview (Vercel)
**Goal**: deploy to a Vercel preview URL so the site can be reviewed on any device.
**Success Criteria**: `vercel` from the repo root succeeds; preview URL renders the hero in WebGPU.
**Tests**: manual smoke on the preview URL.
**Status**: Not Started (CLI is logged in as jaredwalters-5175; run `vercel` when ready)

## Stage 8: Broadcast audio (ElevenLabs)
**Goal**: instrumental beds and sound textures per station, generated offline with the ElevenLabs API; a mixer with crossfades, loop seams, loudness normalization, ducking; analyser levels feed the field.
**Success Criteria**: power on → static + theme; tuning crossfades beds with squelch and roger; dossier ducks; field reacts to beats; no console errors; clips normalized so nothing is inaudible or clipping.
**Tests**: crossfade plan, loop segments, band levels, manifest order, loudness trim/normalize (vitest).
**Status**: Complete (2026-09-10). Levels tuned by measurement, not by ear yet.

## Stage 9: Roster and palette
**Goal**: drop Executor (not Jared's project), promote add2cal to station 05 with a calendar artifact; replace the orange/blue rainbow with a vintage-instrument palette (verdigris primary, dusty rose, lilac, ivory on bakelite) across CSS, particles, Blender materials and the favicon.
**Success Criteria**: no orange, blue or yellow accents anywhere; each artifact still legible; models rebuilt from `blender/build_models.py`.
**Tests**: existing generator/manifest tests cover the new station.
**Status**: Complete (2026-09-10)

## Follow-ups
- Real device screenshots or short clips inside dossiers (Seevie stick, Ting) once assets are picked.
- Light theme if ever wanted (tokens are oklch; the field is dark-first).
- `?gl` fallback runs 65k particles without bloom parity; fine for Firefox on Intel Macs.
