export type ArtifactKind =
  | 'carrier'
  | 'stick'
  | 'ting'
  | 'globe'
  | 'dome'
  | 'graph'
  | 'ledger'
  | 'terrain'
  | 'portrait';

export interface StationLink {
  label: string;
  href: string;
}

export interface Station {
  id: string;
  callsign: string;
  name: string;
  frequency: string;
  band: string;
  hue: number;
  artifact: ArtifactKind;
  pitch: string;
  brief: string;
  details: string[];
  stack: string[];
  year: string;
  links: StationLink[];
}

export const STATIONS: Station[] = [
  {
    id: 'seevie',
    callsign: 'PULSE',
    name: 'Seevie',
    frequency: '2400.000',
    band: 'MHz',
    hue: 205,
    artifact: 'stick',
    pitch: 'Your agent, on a thumb drive.',
    brief:
      'A presence layer where humans, devices and software are addressable peers. A thumb-drive-sized push-to-talk stick, an iPhone app, a Mac companion and any coding agent all join the same room. An agent can ask a human a question and block until someone answers.',
    details: [
      'M5StickS3 firmware streams audio over WebSocket to a Cloudflare Durable Object that holds the room, bridges Gemini Live, and pushes Lock Screen Live Activities.',
      'The iPhone app renders every agent workspace as a Metal particle field: embers for tool calls, sediment when the turn is done, a card when it needs you.',
      'Cards are the primitive: POST a question, long-poll for the answer. Permission prompts from headless Claude Code ride the same lane.',
    ],
    stack: ['ESP32-S3 / C++', 'Cloudflare Workers + DO + D1', 'Gemini Live', 'SwiftUI + Metal', 'Node'],
    year: '2025–26',
    links: [{ label: 'seevie.dev', href: 'https://seevie.dev' }],
  },
  {
    id: 'ting-radio',
    callsign: 'OVERWATCH',
    name: 'Ting Radio',
    frequency: '296.800',
    band: 'MHz',
    hue: 24,
    artifact: 'ting',
    pitch: 'A walkie-talkie for Claude Code.',
    brief:
      'Squeeze a Teenage Engineering Ting mic and talk; the words land in Claude Code. When the turn ends, a radio voice reads back a twenty-word sitrep with a callsign and "over". The voice is Charlie Duke, Apollo 11\'s CAPCOM, cloned from the public-domain landing loop. Everything runs on the Mac.',
    details: [
      'Half-duplex from line noise: the mic passes a carrier only while squeezed, so handle state is a threshold on RMS, no extra hardware.',
      'The Ting\'s buttons emit tones; a detector turns them into keystrokes. White is the affirmative when the radio asks for authorization.',
      'A small DSP chain adds band-limit, drive, static, roger beep and squelch. The short acks are Duke\'s actual 1969 lines.',
    ],
    stack: ['Python', 'Parakeet STT', 'LuxTTS voice clone', 'Claude Code hooks', 'menu bar app'],
    year: '2026',
    links: [{ label: 'GitHub', href: 'https://github.com/iamjaredwalters/ting-radio' }],
  },
  {
    id: 'thereabouts',
    callsign: 'FIX',
    name: 'Thereabouts',
    frequency: '1575.420',
    band: 'MHz',
    hue: 145,
    artifact: 'globe',
    pitch: 'Every song you saved, and where you were.',
    brief:
      'An iPhone app that maps each Spotify save to the place your camera says you were when you found it. No location tracking: it correlates save timestamps against your photo library\'s GPS trail and says how sure it is in plain language.',
    details: [
      'A binary-search correlation engine over PhotoKit; confidence is expressed as words ("you were right here"), not error bars.',
      'Spotify OAuth bounces through a Cloudflare Worker on an invisible domain to satisfy Apple\'s Universal Links.',
      'SwiftData on device; nothing leaves the phone except the OAuth handshake.',
    ],
    stack: ['Swift / SwiftUI', 'PhotoKit', 'SwiftData', 'Cloudflare Worker'],
    year: '2026',
    links: [{ label: 'GitHub', href: 'https://github.com/iamjaredwalters/thereabouts' }],
  },
  {
    id: 'vela',
    callsign: 'ZENITH',
    name: 'Vela',
    frequency: '1420.405',
    band: 'MHz',
    hue: 290,
    artifact: 'dome',
    pitch: 'Your personal constellation.',
    brief:
      'Clusters the places in your photo library into a constellation you turn in your hands: a matte pastel diorama on a RealityKit dome, home at the zenith, true compass bearings, distance compressed on a log scale so a trip abroad and the corner store share a sky.',
    details: [
      'Azimuthal placement with real bearings; magnitude from visit count on a Pogson curve.',
      'Constellation lines from a relative-neighborhood graph, so the sky reads as figures instead of a hairball.',
      '100k photo locations cluster in under a second in release builds.',
    ],
    stack: ['Swift', 'RealityKit', 'PhotoKit', 'XcodeGen'],
    year: '2026',
    links: [],
  },
  {
    id: 'executor',
    callsign: 'RELAY',
    name: 'Executor',
    frequency: '443.000',
    band: 'MHz',
    hue: 60,
    artifact: 'graph',
    pitch: 'Connect any agent to everything.',
    brief:
      'One integration catalog shared by every agent you run: Claude Code, Cursor, ChatGPT. Models write short programs against connected services; they run in throwaway isolates with per-tool auth and approval policy. Open source, self-hostable, and the bridge Seevie uses under the hood.',
    details: [
      'Sandboxed model-authored code in QuickJS isolates; secrets resolve only at a fetch gateway, never in the sandbox.',
      'MCP, OpenAPI and GraphQL sources normalize into one catalog with search instead of a thousand tool definitions.',
      'A sibling project ships wire-level emulators of GitHub, Stripe, Google and friends for real integration tests.',
    ],
    stack: ['TypeScript / Bun', 'Effect', 'QuickJS', 'Postgres / Drizzle', 'Cloudflare'],
    year: '2025–26',
    links: [{ label: 'executor.sh', href: 'https://executor.sh' }],
  },
  {
    id: 'aleph',
    callsign: 'LEDGER',
    name: 'Aleph',
    frequency: '162.400',
    band: 'MHz',
    hue: 100,
    artifact: 'ledger',
    pitch: 'What did I work on, and when?',
    brief:
      'A local dashboard that answers the question by mining Claude Code\'s own transcripts. No timers, no trackers. It archives the raw sessions before they are pruned, then bills time as the union of overlapping sessions so parallel work is never double-counted.',
    details: [
      'Node CLI indexes JSONL transcripts into SQLite; a Vite + React front end reads it on localhost.',
      'Union-of-intervals billing across clients, per-day and per-repo rollups.',
      'A pixel-devtools look: one accent, squared corners, a bitmap face.',
    ],
    stack: ['Node', 'SQLite', 'React 19', 'Tailwind v4'],
    year: '2026',
    links: [],
  },
  {
    id: 'flea',
    callsign: 'LEVER',
    name: 'Flea',
    frequency: '27.145',
    band: 'MHz',
    hue: 190,
    artifact: 'terrain',
    pitch: 'A robot with a spring-loaded leg, and a world to cross.',
    brief:
      'A cel-shaded open world, 2 km on a side, with no race, laps or finish line. Nothing is downloaded: terrain, materials, the robot and the sound are all generated in code. The first build was a WebGPU snow sandbox with powder, crust, slush and ice that deform under the wheels.',
    details: [
      'The on-screen jump predictor runs the same integrator as the physics, so the arc you see is the arc you get.',
      'Cliffs terrace to exactly the jump height; the world is tuned around one verb.',
      'Rendering graded against a written PBR checklist with evidence screenshots.',
    ],
    stack: ['Three.js', 'WebGPU', 'TypeScript', 'Playwright capture'],
    year: '2026',
    links: [],
  },
];

export const ALSO_ON_AIR: StationLink[] = [
  { label: 'add2cal.app — photo of a flyer in, calendar event out', href: 'https://add2cal.app' },
  { label: 'guyver.io — a 3D-printed EDC blade, sold one at a time', href: 'https://guyver.io' },
  { label: 'brewbot.app — which food truck is at the brewery tonight', href: 'https://brewbot.app' },
  { label: 'tellusastral.com — the umbrella', href: 'https://tellusastral.com' },
];

export function stationById(id: string): Station | undefined {
  return STATIONS.find((station) => station.id === id);
}
