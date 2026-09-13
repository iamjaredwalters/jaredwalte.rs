export type ArtifactKind =
  | 'carrier'
  | 'stick'
  | 'ting'
  | 'globe'
  | 'dome'
  | 'calendar'
  | 'ledger'
  | 'terrain'
  | 'truck'
  | 'portrait';

export type TintName = 'verdigris' | 'rose' | 'lilac' | 'ivory';

export interface Tint {
  l: number;
  c: number;
  h: number;
}

export const TINTS: Record<TintName, Tint> = {
  verdigris: { l: 0.78, c: 0.1, h: 168 },
  rose: { l: 0.78, c: 0.11, h: 355 },
  lilac: { l: 0.8, c: 0.09, h: 305 },
  ivory: { l: 0.92, c: 0.035, h: 80 },
};

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
  frequencyNote: string;
  tint: TintName;
  artifact: ArtifactKind;
  pitch: string;
  brief: string;
  details: string[];
  origin: string;
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
    frequencyNote: "the 2.4 GHz Wi-Fi band the stick talks over",
    tint: 'verdigris',
    artifact: 'stick',
    pitch: 'Your agent, on a thumb drive.',
    brief:
      'A presence layer where people, devices and software can all reach each other the same way. A thumb-drive-sized push-to-talk stick, an iPhone app, a Mac companion and any coding agent join the same room. An agent can ask a person a question and wait until someone answers.',
    details: [
      'The stick streams your voice to a room in the cloud that every device and agent shares, and a Lock Screen notice arrives when something needs you.',
      'The iPhone app draws each agent\'s work as particles: embers while it uses tools, sediment when the turn is done, a card when it needs an answer.',
      'Everything is a card: post a question, wait for the answer. Permission prompts from a headless Claude Code ride the same lane.',
    ],
    origin: 'The StarCraft SCV, the worker you point at a job and forget about until it comes back with the goods. Same job, with a stick for the click. Say it out loud.',
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
    frequencyNote: "Apollo's VHF voice downlink, the channel CAPCOM used",
    tint: 'rose',
    artifact: 'ting',
    pitch: 'A walkie-talkie for Claude Code.',
    brief:
      'Squeeze a Teenage Engineering Ting mic and talk; the words land in Claude Code. When the turn ends, a radio voice reads back a twenty-word sitrep with a callsign and "over". The voice is Charlie Duke, Apollo 11\'s CAPCOM, cloned from the public-domain landing loop. Everything runs on the Mac.',
    details: [
      'Squeezing the mic is the whole protocol: it only carries signal while held, so the software tells talk from listen by loudness alone, no extra hardware.',
      'The mic\'s buttons play tones and the software hears them as keystrokes. White means yes when the radio asks permission.',
      'A small audio chain adds static, squelch and the roger beep. The short acknowledgements are Charlie Duke\'s actual 1969 lines.',
    ],
    origin: 'The Teenage Engineering Ting it squeezes, and the radio voice that answers.',
    stack: ['Python', 'Parakeet STT', 'LuxTTS voice clone', 'Claude Code hooks', 'menu bar app'],
    year: '2026',
    links: [],
  },
  {
    id: 'thereabouts',
    callsign: 'FIX',
    name: 'Thereabouts',
    frequency: '1575.420',
    band: 'MHz',
    frequencyNote: "GPS L1, the carrier a phone fixes position from",
    tint: 'lilac',
    artifact: 'globe',
    pitch: 'Every song you saved, and where you were.',
    brief:
      'An iPhone app that maps each Spotify save to the place your camera says you were when you found it. No location tracking: it correlates save timestamps against your photo library\'s GPS trail and says how sure it is in plain language.',
    details: [
      'Each save is matched against your photo timestamps, and the app says how sure it is in words ("you were right here"), not error bars.',
      'Each pin opens the song next to the photos that placed it, and a timeline scrubs through your eras.',
      'Everything stays on the phone except that one sign-in handshake.',
    ],
    origin: 'Thereabouts is the one English word that means roughly that place and roughly that time at once, so the name is the confidence model.',
    stack: ['Swift / SwiftUI', 'PhotoKit', 'SwiftData', 'Cloudflare Worker'],
    year: '2026',
    links: [],
  },
  {
    id: 'vela',
    callsign: 'ZENITH',
    name: 'Vela',
    frequency: '1420.405',
    band: 'MHz',
    frequencyNote: "the hydrogen line, radio astronomy's signature frequency",
    tint: 'ivory',
    artifact: 'dome',
    pitch: 'Your personal constellation.',
    brief:
      'Clusters the places in your photo library into a constellation you turn in your hands: a matte pastel diorama on a RealityKit dome, home at the zenith, true compass bearings, distance compressed on a log scale so a trip abroad and the corner store share a sky.',
    details: [
      'Places sit at their real compass bearing from home, and the more often you visit, the brighter the star, on the same curve astronomers use.',
      'Constellation lines only join near neighbours, so the sky reads as figures instead of a hairball.',
      'A hundred thousand photo locations cluster in under a second.',
    ],
    origin: 'Vela is Latin for sails and the name of a real constellation: the sails of Argo, the ship the Greeks set among the stars once its voyage was over. Your journeys, finished, set into a sky.',
    stack: ['Swift', 'RealityKit', 'PhotoKit', 'XcodeGen'],
    year: '2026',
    links: [],
  },
  {
    id: 'add2cal',
    callsign: 'TIMECHECK',
    name: 'add2cal',
    frequency: '10.000',
    band: 'MHz',
    frequencyNote: "WWV, the NIST time-signal station",
    tint: 'verdigris',
    artifact: 'calendar',
    pitch: 'Photo of a flyer in, calendar event out.',
    brief:
      'Point your phone at a flyer, an invite, a whiteboard or a screenshot and get back a calendar event with the date, time and place filled in, ready to save. A shipped product, now moving from a web subscription to a one-time purchase on the App Store.',
    details: [
      'One serverless function handles both the app\'s requests and every uploaded image, and the whole deployment is described in a single file.',
      'A vision model reads the picture; a small web stack with Google sign-in handles the rest.',
      'An iPhone app is in progress for the paid version.',
    ],
    origin: 'Literal. It adds things to your calendar.',
    stack: ['Hono on AWS Lambda', 'S3 + CloudFront', 'Supabase', 'Gemini', 'React 19', 'Expo'],
    year: '2025–26',
    links: [{ label: 'add2cal.app', href: 'https://add2cal.app' }],
  },
  {
    id: 'brewbot',
    callsign: 'TAPROOM',
    name: 'BrewBot',
    frequency: '27.185',
    band: 'MHz',
    frequencyNote: "CB channel 19, the truckers' channel",
    tint: 'lilac',
    artifact: 'truck',
    pitch: 'Which truck is at the brewery tonight?',
    brief:
      'BrewBot answers one question before you leave the house: which food truck is at which brewery, today or this week. It gathers the schedules breweries post, grouped by day and brewery, with a check mark on anything confirmed that day.',
    details: [
      'It stopped scraping. Brewery websites are stale or missing and the real schedule is an Instagram story that expires in a day, so a daily job reads the stories and pushes a small file. The app is just the display, which is why it can be so plain.',
      'Silence means something. "Nothing posted" and "No info yet" are different states, a same-day story always outranks the weekly grid, and a confirmed day can never be downgraded by a later re-post.',
      'It remembers. Every day is its own file and none is ever overwritten, so a record of which truck was where builds up on its own. Nobody asked for the history; it was cheaper to keep than to throw away.',
    ],
    origin: 'Says what it is: a bot that does the legwork when you want to know what food is at a nearby brewery.',
    stack: ['TypeScript', 'React 19', 'Vite', 'Tailwind v4', 'Hono on Lambda', 'S3 + zod', 'AWS CDK', 'CloudFront', 'PWA'],
    year: '2025–26',
    links: [{ label: 'brewbot.app', href: 'https://brewbot.app' }],
  },
  {
    id: 'aleph',
    callsign: 'LOGBOOK',
    name: 'Aleph',
    frequency: '162.400',
    band: 'MHz',
    frequencyNote: "NOAA Weather Radio, a continuous report of conditions",
    tint: 'rose',
    artifact: 'ledger',
    pitch: 'What did I work on, and when?',
    brief:
      'A local dashboard that answers the question by mining Claude Code\'s own transcripts. No timers, no trackers. It archives the raw sessions before they are pruned, then bills time as the union of overlapping sessions so parallel work is never double-counted.',
    details: [
      'A small command-line tool indexes the transcripts into a local database, and a web page reads it on your own machine.',
      'Rollups by day, by repo and by client, so the number you bill is one glance away.',
      'Every session comes with a resume command for the clipboard, so you land back in the same folder and conversation.',
    ],
    origin: 'Borges\'s point in space that contains all other points: one local store that holds every session, every client and every hour, so from one place you can see your whole working life at once. Also the first letter, and Cantor\'s sign for the infinite, which suits an archive that never deletes.',
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
    frequencyNote: "the 27 MHz band used by radio-controlled cars",
    tint: 'lilac',
    artifact: 'terrain',
    pitch: 'A robot with a spring-loaded leg, and a world to cross.',
    brief:
      'A cel-shaded open world, 2 km on a side, with no race, laps or finish line. Nothing is downloaded: terrain, materials, the robot and the sound are all generated in code. The first build was a WebGPU snow sandbox with powder, crust, slush and ice that deform under the wheels.',
    details: [
      'The jump arc drawn on screen uses the same maths as the physics, so the arc you see is the arc you get.',
      'Cliffs step up in exact jump heights; the whole world is tuned around one verb.',
      'Rendering was graded against a written checklist, with screenshots as evidence.',
    ],
    origin: 'A flea clears many times its own height. The game is built around one verb.',
    stack: ['Three.js', 'WebGPU', 'TypeScript', 'Playwright capture'],
    year: '2026',
    links: [],
  },
];

export const ALSO_ON_AIR: StationLink[] = [
  { label: 'guyver.io — a 3D-printed EDC blade, sold one at a time', href: 'https://guyver.io' },
];

export function stationById(id: string): Station | undefined {
  return STATIONS.find((station) => station.id === id);
}

export function applyTint(element: HTMLElement, name: TintName): void {
  const tint = TINTS[name];
  element.style.setProperty('--hue', String(tint.h));
  element.style.setProperty('--accent-l', String(tint.l));
  element.style.setProperty('--accent-c', String(tint.c));
}
