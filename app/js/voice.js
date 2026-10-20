// Spoken cues, beeps and a screen that stays on, for tests and sessions.
// Uses the phone's own offline speech engine and sound, so it works without signal.
let audio, lock;

export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window;
const voiceOn = () => { try { return localStorage.getItem('sg-voice') !== 'off'; } catch (e) { return true; } };
export const setVoice = (on) => { try { localStorage.setItem('sg-voice', on ? 'on' : 'off'); } catch (e) { /* private mode */ } };
export const isVoiceOn = voiceOn;

// Times and doses read better spoken in words.
export const sayable = (text) => String(text || '').replace(/(\d+)\s*×\s*/g, '$1 sets of ').replace(/(\d+) s\b/g, '$1 seconds').replace(/(\d+) cm\b/g, '$1 centimetres').replace(/ · /g, '. ');

export function speak(text, opts) {
  if (!canSpeak() || !text || (!(opts && opts.force) && !voiceOn())) return;
  const s = window.speechSynthesis;
  if (!(opts && opts.queue)) s.cancel();
  const u = new SpeechSynthesisUtterance(sayable(text));
  const voices = s.getVoices();
  const v = voices.find((x) => /en[-_]IN/i.test(x.lang)) || voices.find((x) => /^en/i.test(x.lang));
  if (v) u.voice = v;
  u.lang = v ? v.lang : 'en-IN';
  u.rate = (opts && opts.rate) || 1;
  if (opts && opts.onEnd) u.onend = opts.onEnd;
  s.speak(u);
}
export const hush = () => { if (canSpeak()) window.speechSynthesis.cancel(); };

export function beep(freq, ms, vol) {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    const o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime, d = (ms || 140) / 1000;
    o.type = 'sine'; o.frequency.value = freq || 880;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol || 0.3, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(audio.destination); o.start(t); o.stop(t + d + 0.02);
  } catch (e) { /* no sound on this phone */ }
}

export async function keepAwake(on) {
  try {
    if (on && 'wakeLock' in navigator && !lock) { lock = await navigator.wakeLock.request('screen'); lock.addEventListener('release', () => { lock = null; }); }
    else if (!on && lock) { await lock.release(); lock = null; }
  } catch (e) { /* not allowed or not supported */ }
}

// Coach cues recorded in jose's own voice (ElevenLabs clone), short and high energy.
// Each plays from the app's files, so it works offline; if a clip can't play, the phone voice says the words.
export const CUES = {
  ready: 'Get ready.', 3: 'Three.', 2: 'Two.', 1: 'One.', go: 'Go!', lap: 'Lap! Keep going!', halfway: 'Halfway! Stay strong!',
  minute: 'One minute left. Push!', ten: 'Ten seconds! Hold it!', onemore: 'Come on! One more!', stop: "Stop! That's it!",
  restover: "Rest over. Let's go!", next: "Next exercise. Let's go!", sessiondone: 'Session done! You showed up today. Proud of you!',
  ghost: 'You beat your ghost! New best!', voiceon: "Voice coach on. Let's go!", left: 'Left side.', right: 'Right side.', leftleg: 'Left leg.', rightleg: 'Right leg.',
  position: 'Get into position.', rest: 'Rest. Breathe.', squeeze: 'Squeeze hard! Hold it!', warmupdone: "Warm-up done. You're ready. Go fly!", stage: 'Stage passed! Next level unlocked!',
};
// Clips play through the same sound engine as the beeps. Phones (iPhones most of all) only let a page
// make sound after a tap, so any tap in the app wakes the engine; after that, cues can play
// mid-timer without a tap of their own.
const ctx = () => {
  try {
    // iPhone: play like a media app, so the ring/silent switch does not mute the coach.
    if (!audio && navigator.audioSession) navigator.audioSession.type = 'playback';
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) { audio = null; }
  return audio;
};
const bufs = {};
let playing = null;
function load(name) {
  const c = ctx();
  if (!c) return Promise.resolve(null);
  if (!bufs[name]) {
    bufs[name] = fetch('audio/coach/' + name + '.mp3').then((r) => r.arrayBuffer())
      .then((b) => new Promise((ok, no) => c.decodeAudioData(b, ok, no))).catch(() => { delete bufs[name]; return null; });
  }
  return bufs[name];
}
export function warmCues(names) { (names || Object.keys(CUES)).forEach((n) => load(String(n))); }

if (typeof window !== 'undefined') {
  const wake = () => {
    const c = ctx();
    if (!c) return;
    if (c.state !== 'running') c.resume();
    const s = c.createBufferSource(); s.buffer = c.createBuffer(1, 1, 22050); s.connect(c.destination); s.start(0);
  };
  ['pointerdown', 'touchend', 'keydown'].forEach((ev) => window.addEventListener(ev, wake, { capture: true, passive: true }));
}

// Plays a cue and resolves when it ends (or straight away when the voice coach is off).
export function cue(name) {
  name = String(name);
  if (!voiceOn()) return Promise.resolve();
  const c0 = ctx();
  // Right after a tap the engine may still be waking; give it a moment before falling back.
  const awake = c0 && c0.state !== 'running' ? Promise.race([c0.resume().catch(() => {}), new Promise((r) => setTimeout(r, 500))]) : Promise.resolve();
  return Promise.all([load(name), awake]).then(([buf]) => new Promise((resolve) => {
    const c = audio;
    if (!buf || !c || c.state !== 'running') { speak(CUES[name]); setTimeout(resolve, 900); return; }
    if (canSpeak()) window.speechSynthesis.cancel();
    if (playing) { try { playing.stop(); } catch (e) { /* already ended */ } }
    const src = c.createBufferSource();
    src.buffer = buf; src.connect(c.destination);
    src.onended = () => { if (playing === src) playing = null; resolve(); };
    playing = src; src.start(0);
    setTimeout(resolve, buf.duration * 1000 + 300);
  }));
}
