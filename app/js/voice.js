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
