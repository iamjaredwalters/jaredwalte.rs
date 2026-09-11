import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = resolve(ROOT, 'public/audio');
const API = 'https://api.elevenlabs.io/v1';
const FORMAT = 'mp3_44100_96';

const MOTIF = 'a slow four-note motif (D, F, A, G) that recurs every eight bars';
const NO_VOCALS = 'Instrumental only, no vocals, no lyrics, no singing.';

const JOBS = [
  {
    file: 'static.mp3',
    kind: 'sfx',
    loop: true,
    seconds: 20,
    text: 'Warm analog shortwave radio static bed, steady soft hiss with gentle crackle and faint slow carrier drift, no voices, no music, seamless loop',
  },
  { file: 'cue-squelch.mp3', kind: 'sfx', seconds: 1.2, text: 'Soft handheld radio squelch tail: a brief, muffled burst of low static that fades out with a gentle click, quiet, no harshness, then silence' },
  { file: 'cue-chirp.mp3', kind: 'sfx', seconds: 0.8, text: 'Soft, low-pitched key-up chirp: two gentle muffled rising blips from a small radio speaker, rounded and quiet, no bright or harsh tones' },
  { file: 'cue-roger.mp3', kind: 'sfx', seconds: 0.9, text: 'Soft roger beep from a small two-way radio speaker: one short mellow low tone around 500 Hz with a rounded attack, quiet and muffled, followed by a faint static tick' },
  {
    file: 'theme.mp3',
    kind: 'music',
    ms: 75000,
    prompt: `Ambient cinematic score for a late-night radio receiver. A warm analog synth pad drifting in D minor, ${MOTIF} played on a felt piano, subtle tape hiss, distant shortwave textures, no drums, slow and weightless, gentle dynamics that stay even from start to end so it loops cleanly. ${NO_VOCALS}`,
  },
  {
    file: 'seevie-bed.mp3',
    kind: 'music',
    ms: 40000,
    prompt: `Hopeful electronic ambient at 96 BPM: warm synth arpeggios, glassy plucks, soft pulsing bass, tiny device blips as percussion, ${MOTIF} on a bell synth. Calm, modern, blue-lit. ${NO_VOCALS}`,
  },
  {
    file: 'ting-radio-bed.mp3',
    kind: 'music',
    ms: 40000,
    prompt: `1960s space-age lounge, mission-control calm: vibraphone, muted brushed drums very low, warm upright bass, clean studio recording with no hiss or noise, ${MOTIF} on vibraphone. Slow, poised, nostalgic. ${NO_VOCALS}`,
  },
  {
    file: 'thereabouts-bed.mp3',
    kind: 'music',
    ms: 40000,
    prompt: `Sunlit bossa nova: nylon-string guitar, light shaker, warm room ambience, distant surf, ${MOTIF} picked on the guitar. Gentle, nostalgic, unhurried. ${NO_VOCALS}`,
  },
  {
    file: 'vela-bed.mp3',
    kind: 'music',
    ms: 40000,
    prompt: `Night-sky ambient: slow wordless choral pads, celesta, a deep sub drone, sparse twinkling high notes, ${MOTIF} on celesta. Weightless, reverent, very slow. ${NO_VOCALS} No choir words, only sustained vowel-less pads.`,
  },
  {
    file: 'add2cal-bed.mp3',
    kind: 'music',
    ms: 40000,
    prompt: `Bright, tidy electronica at 100 BPM: marimba and soft plucks, clockwork ticking percussion, warm round bass, ${MOTIF} on marimba. Organized, sunny, quietly satisfying. ${NO_VOCALS}`,
  },
  {
    file: 'aleph-bed.mp3',
    kind: 'music',
    ms: 40000,
    prompt: `Late-night lo-fi: dusty felt piano, vinyl crackle, soft slow beat with brushed hats, warm tape saturation, ${MOTIF} on piano. Reflective, quiet, focused. ${NO_VOCALS}`,
  },
  {
    file: 'flea-bed.mp3',
    kind: 'music',
    ms: 40000,
    prompt: `Chiptune surf rock: 8-bit square-wave lead with tremolo, bright arpeggios, snappy lo-fi drums, playful and snowy, ${MOTIF} on the square lead. Energetic but small. ${NO_VOCALS}`,
  },
  { file: 'seevie-texture.mp3', kind: 'sfx', loop: true, seconds: 16, text: 'Soft low-frequency foley: a small plastic device set down on a wooden desk with a gentle thunk, a couple of muted button presses, a low warm thump, spaced several seconds apart with quiet room tone between, no beeps, no hiss, seamless loop' },
  { file: 'ting-radio-texture.mp3', kind: 'sfx', loop: true, seconds: 16, text: 'Apollo-era mission control room ambience: low murmur of distant activity, a far-off teletype clattering briefly, soft relay clicks, air handling rumble, no clear voices, no hiss, seamless loop' },
  { file: 'thereabouts-texture.mp3', kind: 'sfx', loop: true, seconds: 16, text: 'Field recording on a coastal street: distant surf, light breeze, far-off traffic, one camera shutter click, seamless loop' },
  { file: 'vela-texture.mp3', kind: 'sfx', loop: true, seconds: 16, text: 'Still night air on a high hill: a soft deep space drone, very distant low wind, an occasional slow low swell, no crickets, no insects, no high-pitched sounds, seamless loop' },
  { file: 'add2cal-texture.mp3', kind: 'sfx', loop: true, seconds: 16, text: 'Paper foley over quiet room tone: a flyer unfolding and rustling, a phone camera shutter, a pen tick, a calendar page turning, spaced out over several seconds, no hiss, seamless loop' },
  { file: 'aleph-texture.mp3', kind: 'sfx', loop: true, seconds: 16, text: 'Quiet office at night: mechanical keyboard typing in short bursts, soft terminal beeps, a distant clock tick, seamless loop' },
  { file: 'flea-texture.mp3', kind: 'sfx', loop: true, seconds: 16, text: 'Snowy hillside: wind gusts, footsteps crunching in dry snow, an occasional metallic spring twang, seamless loop' },
];

function loadEnv() {
  const path = resolve(ROOT, '.env');
  if (!existsSync(path)) return {};
  return Object.fromEntries(
    readFileSync(path, 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const index = line.indexOf('=');
        return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^["']|["']$/g, '')];
      }),
  );
}

const args = process.argv.slice(2);
const force = args.includes('--force');
const dry = args.includes('--dry');
const onlyIndex = args.indexOf('--only');
const only = onlyIndex >= 0 ? args[onlyIndex + 1].split(',') : null;

const key = process.env.ELEVENLABS_API_KEY ?? loadEnv().ELEVENLABS_API_KEY;
if (!key && !dry) {
  console.error('ELEVENLABS_API_KEY missing (.env or environment)');
  process.exit(1);
}

async function generate(job) {
  const url = job.kind === 'sfx' ? `${API}/sound-generation?output_format=${FORMAT}` : `${API}/music?output_format=${FORMAT}`;
  const body =
    job.kind === 'sfx'
      ? { text: job.text, duration_seconds: job.seconds, prompt_influence: 0.35, loop: Boolean(job.loop), model_id: 'eleven_text_to_sound_v2' }
      : { prompt: job.prompt, music_length_ms: job.ms, force_instrumental: true, model_id: 'music_v2' };
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${job.file}: ${response.status} ${await response.text()}`);
  return Buffer.from(await response.arrayBuffer());
}

mkdirSync(OUT, { recursive: true });
let spentSeconds = 0;
for (const job of JOBS) {
  if (only && !only.some((needle) => job.file.includes(needle))) continue;
  const target = resolve(OUT, job.file);
  if (existsSync(target) && !force) {
    console.log(`skip ${job.file} (exists)`);
    continue;
  }
  const seconds = job.kind === 'sfx' ? job.seconds : job.ms / 1000;
  if (dry) {
    console.log(`would generate ${job.file} (${job.kind}, ${seconds}s)`);
    continue;
  }
  process.stdout.write(`${job.file} (${job.kind}, ${seconds}s) … `);
  const started = Date.now();
  const bytes = await generate(job);
  writeFileSync(target, bytes);
  spentSeconds += seconds;
  console.log(`${(bytes.length / 1024).toFixed(0)} KB in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}
console.log(`done · ${spentSeconds.toFixed(0)} s of audio requested`);
