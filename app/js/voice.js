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
  ghost: 'You beat your ghost! New best!', warmupdone: "Warm-up done. You're ready. Go fly!", stage: 'Stage passed! Next level unlocked!',
};
const clips = {};
let playing = null;
const clip = (name) => { if (!clips[name]) { clips[name] = new Audio('audio/coach/' + name + '.mp3'); clips[name].preload = 'auto'; } return clips[name]; };
export function warmCues(names) { (names || Object.keys(CUES)).forEach((n) => clip(String(n)).load()); }

// Plays a cue and resolves when it ends (or straight away when the voice coach is off).
export function cue(name) {
  return new Promise((resolve) => {
    if (!voiceOn()) return resolve();
    const a = clip(String(name));
    if (playing && playing !== a) { playing.pause(); }
    if (canSpeak()) window.speechSynthesis.cancel();
    playing = a;
    let done = false;
    const end = () => { if (!done) { done = true; resolve(); } };
    a.onended = end;
    try { a.currentTime = 0; } catch (e) { /* not loaded yet */ }
    const p = a.play();
    if (p && p.catch) p.catch(() => { speak(CUES[name]); setTimeout(end, 900); });
    setTimeout(end, 6000);
  });
}
