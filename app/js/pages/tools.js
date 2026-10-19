// Hands-free helpers for tests and sessions: read aloud, a standard timer for each timed test,
// a calf-raise metronome that counts for you, a tap-per-lap tracker for the 12-minute run,
// a phone-started sprint timer and the reaction-start test. Timing uses the clock, not the
// number of timer ticks, so a busy phone does not slow the count down.
import { html, useState, useEffect, useRef } from '../vendor/preact-htm.js';
import { XIcon } from '../xui.js';
import { buzz } from '../ui.js';
import { speak, hush, beep, keepAwake, canSpeak, isVoiceOn, setVoice } from '../voice.js';

const HI = 1046, LO = 523, GO = 1318;
const fmtClock = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const fmtSec = (ms) => (Math.max(0, ms) / 1000).toFixed(1);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Runs fn about every `every` ms while `on`, and stops the screen sleeping meanwhile.
function useTick(on, fn, every) {
  const ref = useRef(fn); ref.current = fn;
  useEffect(() => {
    if (!on) return undefined;
    keepAwake(true);
    const id = setInterval(() => ref.current(), every || 100);
    return () => { clearInterval(id); keepAwake(false); };
  }, [on]);
}
// Stop talking when the screen closes.
function useHushOnLeave() { useEffect(() => () => { hush(); keepAwake(false); }, []); }

export function ReadAloud({ text, label }) {
  const [on, setOn] = useState(false);
  useHushOnLeave();
  if (!canSpeak()) return null;
  const go = () => { if (on) { hush(); setOn(false); return; } setOn(true); speak(text, { force: true, onEnd: () => setOn(false) }); };
  return html`<button type="button" class="x-btn ghost sm sg-read" aria-pressed=${String(on)} onClick=${go}><${XIcon} name=${on ? 'stop' : 'speaker'} size=${18} />${on ? 'Stop reading' : label || 'Read aloud'}</button>`;
}

export function VoiceSwitch() {
  const [on, setOn] = useState(isVoiceOn());
  if (!canSpeak()) return null;
  return html`<button type="button" class="x-btn ghost sm sg-read" aria-pressed=${String(on)} onClick=${() => { setVoice(!on); setOn(!on); if (!on) speak('Voice coach on.', { force: true }); else hush(); }}><${XIcon} name="speaker" size=${18} />${on ? 'Voice coach on' : 'Voice coach off'}</button>`;
}

// 3, 2, 1, go with beeps and voice. Resolves when "go" sounds.
async function countIn(intro) {
  if (intro) { speak(intro); await wait(Math.min(3500, 600 + intro.length * 55)); }
  for (const n of [3, 2, 1]) { beep(LO, 120); speak(String(n)); await wait(1000); }
  beep(GO, 380); speak('Go'); buzz(30);
}

function Big({ children, sub }) {
  return html`<div class="sg-clock" aria-live="off">${children}</div>${sub ? html`<div class="x-small x-muted" aria-live="polite">${sub}</div>` : null}`;
}

// Side plank and other holds: count in, then a stopwatch that calls out every 10 seconds.
export function HoldTimer({ sideLabel, onResult }) {
  const [st, setSt] = useState('idle'); const [ms, setMs] = useState(0);
  const t0 = useRef(0), said = useRef(0);
  useHushOnLeave();
  useTick(st === 'run', () => {
    const now = Date.now() - t0.current; setMs(now);
    const s10 = Math.floor(now / 10000);
    if (s10 > said.current) { said.current = s10; beep(HI, 90); speak(s10 * 10 + ' seconds'); }
  });
  const start = async () => { setSt('count'); setMs(0); said.current = 0; await countIn((sideLabel ? sideLabel + ' side. ' : '') + 'Get into position.'); t0.current = Date.now(); setSt('run'); };
  const stop = () => { const s = Math.round((Date.now() - t0.current) / 1000); setSt('done'); beep(LO, 300); speak('Stop. ' + s + ' seconds.'); buzz([18, 60, 28]); onResult(s); };
  return html`<div class="x-card sg-tool">
    <div class="x-kicker"><${XIcon} name="timer" size=${16} /> Hold timer</div>
    <${Big} sub=${st === 'run' ? 'Tap Stop the moment your hips drop.' : st === 'done' ? 'Saved into the result below.' : 'Counts you in and calls out every 10 seconds.'}>${fmtSec(ms)}<small>s</small><//>
    ${st === 'run' ? html`<button class="x-btn sg-stop" onClick=${stop}><${XIcon} name="stop" size=${20} />Stop</button>`
      : html`<button class="x-btn" disabled=${st === 'count'} onClick=${start}><${XIcon} name="play" size=${20} />${st === 'count' ? 'Get ready…' : st === 'done' ? 'Time again' : 'Start timer'}</button>`}
  </div>`;
}

// The groin squeeze: a spoken 5-second hold.
export function SqueezeTimer() {
  const [left, setLeft] = useState(null);
  useHushOnLeave();
  const start = async () => {
    setLeft(5); speak('Fist between your knees. Squeeze hard.'); await wait(2400); beep(GO, 250); buzz(30);
    for (let n = 5; n > 0; n--) { setLeft(n); speak(String(n)); await wait(1000); }
    setLeft(0); beep(LO, 400); speak('Relax. Now rate any groin pain from 0 to 10.'); buzz([18, 60, 28]);
  };
  return html`<div class="x-card sg-tool">
    <div class="x-kicker"><${XIcon} name="timer" size=${16} /> 5-second squeeze</div>
    <${Big} sub=${left === 0 ? 'Rate any pain below.' : 'The phone counts the 5 seconds for you.'}>${left == null ? 5 : left}<small>s</small><//>
    <button class="x-btn" disabled=${left != null && left > 0} onClick=${start}><${XIcon} name="play" size=${20} />${left === 0 ? 'Squeeze again' : 'Start'}</button>
  </div>`;
}

// Calf raises: one second up, one second down, and it counts each full raise for you.
export function Metronome({ sideLabel, onResult }) {
  const [on, setOn] = useState(false); const [n, setN] = useState(0); const [phase, setPhase] = useState('');
  const t0 = useRef(0), last = useRef(-1);
  useHushOnLeave();
  useTick(on, () => {
    const half = Math.floor((Date.now() - t0.current) / 1000);
    if (half === last.current) return;
    last.current = half;
    if (half % 2 === 0) { beep(HI, 110); setPhase('Up'); if (half > 0) { const reps = half / 2; setN(reps); speak(String(reps)); } }
    else { beep(LO, 110); setPhase('Down'); }
  }, 50);
  const start = async () => { setN(0); setPhase(''); last.current = -1; await countIn((sideLabel ? sideLabel + ' leg. ' : '') + 'Up on the high beep, down on the low beep.'); t0.current = Date.now(); setOn(true); };
  const stop = () => { setOn(false); setPhase(''); beep(LO, 300); speak('Stop. ' + n + ' raises.'); buzz([18, 60, 28]); onResult(n); };
  return html`<div class="x-card sg-tool">
    <div class="x-kicker"><${XIcon} name="timer" size=${16} /> Pace and count</div>
    <${Big} sub=${on ? 'Tap Stop when you can no longer reach full height.' : 'One second up, one second down. It counts for you.'}>${n}<small>${on ? ' · ' + phase : ' raises'}</small><//>
    ${on ? html`<button class="x-btn sg-stop" onClick=${stop}><${XIcon} name="stop" size=${20} />Stop</button>`
      : html`<button class="x-btn" onClick=${start}><${XIcon} name="play" size=${20} />Start the beat</button>`}
  </div>`;
}

// 12-minute run: tap once per lap; distance comes from the lap length, not GPS.
export function LapRun({ onResult }) {
  const RUN = 12 * 60 * 1000;
  const [lap, setLap] = useState(400); const [st, setSt] = useState('idle');
  const [laps, setLaps] = useState(0); const [left, setLeft] = useState(RUN); const [extra, setExtra] = useState('');
  const t0 = useRef(0), mins = useRef(12), tens = useRef(-1);
  useHushOnLeave();
  useTick(st === 'run', () => {
    const l = RUN - (Date.now() - t0.current); setLeft(l);
    const m = Math.ceil(l / 60000);
    if (m < mins.current && l > 0) { mins.current = m; beep(HI, 120); speak(m === 1 ? 'One minute left. Push.' : m + ' minutes left.'); }
    const s = Math.ceil(l / 1000);
    if (s <= 10 && s > 0 && s !== tens.current) { tens.current = s; beep(s <= 3 ? HI : LO, 90); }
    if (l <= 0) { setSt('done'); beep(GO, 600); speak('Stop. Stand still where you are.'); buzz([30, 80, 30, 80, 60]); }
  }, 200);
  const start = async () => { setSt('count'); setLaps(0); setLeft(RUN); mins.current = 12; tens.current = -1; await countIn('Twelve minute run. Tap the big button each time you pass the start line.'); t0.current = Date.now(); setSt('run'); };
  const tapLap = () => { const n = laps + 1; setLaps(n); beep(HI, 80); buzz(25); speak('Lap ' + n + '. ' + n * lap + ' metres.'); };
  const total = laps * lap + (Number(extra) || 0);
  return html`<div class="x-card sg-tool">
    <div class="x-kicker"><${XIcon} name="flag" size=${16} /> Lap tracker</div>
    ${st === 'idle' ? html`<label class="x-field"><span>One lap is</span>
      <div class="x-seg" role="group" aria-label="Lap length">${[200, 250, 400].map((v) => html`<button type="button" aria-pressed=${String(lap === v)} onClick=${() => setLap(v)}>${v} m</button>`)}</div>
      <input class="x-input" type="number" inputmode="numeric" aria-label="Other lap length in metres" placeholder="Other length, metres" onInput=${(e) => setLap(Number(e.target.value) || 400)} /></label>` : null}
    <${Big} sub=${st === 'run' ? laps + (laps === 1 ? ' lap · ' : ' laps · ') + laps * lap + ' m' : st === 'done' ? 'Time is up.' : 'Laps are counted on a known track, so distance is exact.'}>${fmtClock(left)}<//>
    ${st === 'run' ? html`<button class="sg-lap" onClick=${tapLap} aria-label=${'Lap done. ' + laps + ' so far'}><b>LAP</b><span>${laps}</span></button>` : null}
    ${st === 'done' ? html`<label class="x-field"><span>Metres past the last lap line (pace it out, or skip)</span><input class="x-input" type="number" inputmode="numeric" value=${extra} onInput=${(e) => setExtra(e.target.value)} /></label>
      <button class="x-btn" onClick=${() => { onResult(total); speak('Total ' + total + ' metres.'); }}><${XIcon} name="check" size=${20} />Use ${total} m</button>` : null}
    ${st === 'idle' || st === 'count' ? html`<button class="x-btn" disabled=${st === 'count'} onClick=${start}><${XIcon} name="play" size=${20} />${st === 'count' ? 'Get ready…' : 'Start the 12 minutes'}</button>` : null}
    ${st === 'run' ? html`<button class="x-btn ghost sm" onClick=${() => { setSt('idle'); hush(); }}>Cancel run</button>` : null}
  </div>`;
}

// 20 m sprint: the phone gives "set" and a beep at a random moment and starts the clock itself.
// A friend at the finish taps Stop. Labelled phone-timed.
export function SprintTimer({ onResult }) {
  const [st, setSt] = useState('idle'); const [ms, setMs] = useState(0); const t0 = useRef(0);
  useHushOnLeave();
  useTick(st === 'run', () => setMs(Date.now() - t0.current), 50);
  const start = async () => {
    setSt('set'); setMs(0); speak('On your marks.'); await wait(2600); speak('Set.'); await wait(1200 + Math.random() * 1300);
    beep(GO, 300, 0.5); buzz(30); t0.current = Date.now(); setSt('run');
  };
  const stop = () => { const s = Math.round((Date.now() - t0.current) / 10) / 100; setMs(s * 1000); setSt('done'); beep(LO, 250); speak(s.toFixed(2) + ' seconds.'); onResult(s); };
  return html`<div class="x-card sg-tool">
    <div class="x-kicker"><${XIcon} name="timer" size=${16} /> Phone start</div>
    <${Big} sub=${st === 'run' ? 'Friend: tap Stop as the chest crosses the line.' : 'The beep comes at a random moment, so nobody can guess it. Phone-timed.'}>${(ms / 1000).toFixed(2)}<small>s</small><//>
    ${st === 'run' ? html`<button class="x-btn sg-stop" onPointerDown=${stop}><${XIcon} name="stop" size=${20} />Stop</button>`
      : html`<button class="x-btn" disabled=${st === 'set'} onClick=${start}><${XIcon} name="play" size=${20} />${st === 'set' ? 'On your marks…' : st === 'done' ? 'Run again' : 'Start'}</button>`}
  </div>`;
}

// Reaction start: five tries, a beep and flash at a random moment, tap as fast as you can.
// Early taps are false starts and don't count. The result is the middle of the five times.
export function ReactionPad({ onResult }) {
  const TRIES = 5;
  const [st, setSt] = useState('idle'); const [times, setTimes] = useState([]); const [msg, setMsg] = useState('Tap to start. Wait for the beep and flash, then tap.');
  const go = useRef(0), timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const arm = () => {
    setSt('wait'); setMsg('Wait for it…');
    timer.current = setTimeout(() => { go.current = performance.now(); beep(GO, 160, 0.45); setSt('go'); setMsg('Tap!'); }, 1500 + Math.random() * 2500);
  };
  const tap = (e) => {
    e.preventDefault();
    if (st === 'idle' || st === 'shown') return arm();
    if (st === 'wait') { clearTimeout(timer.current); setSt('shown'); setMsg('False start. That one does not count. Tap to try again.'); buzz([40, 40, 40]); return undefined; }
    if (st === 'go') {
      const t = Math.round(performance.now() - go.current); const next = times.concat(t); setTimes(next); buzz(20);
      if (next.length >= TRIES) {
        const mid = next.slice().sort((a, b) => a - b)[Math.floor(TRIES / 2)];
        setSt('done'); setMsg('Your reaction: ' + mid + ' ms (the middle of 5 tries).'); speak('Done. ' + mid + ' milliseconds.'); onResult(mid);
      } else { setSt('shown'); setMsg(t + ' ms. Tap for try ' + (next.length + 1) + ' of ' + TRIES + '.'); }
    }
    return undefined;
  };
  return html`<div class="x-card sg-tool">
    <div class="x-kicker"><${XIcon} name="strong" size=${16} /> Reaction start</div>
    <button class=${'sg-pad ' + st} onPointerDown=${st === 'done' ? null : tap} aria-live="assertive">${st === 'go' ? 'TAP' : st === 'done' ? 'Done' : st === 'wait' ? '…' : 'Ready'}</button>
    <p class="x-small x-muted" style="text-align:center" aria-live="polite">${msg}</p>
    ${times.length ? html`<div class="x-chips" style="justify-content:center">${times.map((t, i) => html`<span class="x-chip">${i + 1}: ${t} ms</span>`)}</div>` : null}
    ${st === 'done' ? html`<button class="x-btn ghost sm" onClick=${() => { setTimes([]); setSt('idle'); setMsg('Tap to start.'); }}>Try 5 more</button>` : null}
  </div>`;
}

// Which helper each test gets. Counting tests other than calf raises keep the plain counter.
export function TestTool({ t, side, onResult }) {
  const label = t.sides ? side[0].toUpperCase() + side.slice(1) : '';
  switch (t.key) {
    case 'sideplank': return html`<${HoldTimer} key=${side} sideLabel=${label} onResult=${onResult} />`;
    case 'squeeze': return html`<${SqueezeTimer} />`;
    case 'calf': return html`<${Metronome} key=${side} sideLabel=${label} onResult=${onResult} />`;
    case 'run12': return html`<${LapRun} onResult=${onResult} />`;
    case 'sprint20': return html`<${SprintTimer} onResult=${onResult} />`;
    case 'reaction': return html`<${ReactionPad} onResult=${onResult} />`;
    default: return null;
  }
}

// Voice coach for a programme session: reads each exercise, runs a spoken rest timer between
// exercises, and ticks the session off at the end.
export function SessionCoach({ items, title, onFinish, backHref }) {
  const [i, setI] = useState(-1); const [rest, setRest] = useState(0); const [done, setDone] = useState(false);
  const until = useRef(0);
  useHushOnLeave();
  useEffect(() => { keepAwake(true); return () => keepAwake(false); }, []);
  const x = items[i];
  const read = (n) => { const y = items[n]; if (y) speak('Exercise ' + (n + 1) + ' of ' + items.length + '. ' + y.name + '. ' + y.dose + '. ' + y.steps.join(' ')); };
  const goTo = (n) => { setRest(0); if (n >= items.length) { finish(); return; } setI(n); read(n); };
  const finish = async () => { setDone(true); setRest(0); beep(GO, 500); buzz([18, 60, 28, 60, 40]); speak('Session done. Great work. It has been ticked off.'); await onFinish(); };
  useTick(rest > 0, () => {
    const l = Math.ceil((until.current - Date.now()) / 1000);
    if (l !== rest) { setRest(Math.max(0, l)); if (l === 10) speak('10 seconds.'); if (l <= 3 && l > 0) beep(LO, 90); }
    if (l <= 0) { beep(GO, 300); buzz(30); speak('Rest over.'); setRest(0); }
  }, 200);
  const startRest = (sec) => { until.current = Date.now() + sec * 1000; setRest(sec); speak('Rest ' + sec + ' seconds.'); };
  if (done) return html`<div class="x-page plain"><div style="padding:48px 4px 8px;display:flex;flex-direction:column;gap:10px"><span class="x-badge" style="width:56px;height:56px;border-radius:18px"><${XIcon} name="star" size=${28} /></span><h1 class="x-title">Session done</h1><p class="x-sub">Ticked off in your programme. Rest well.</p></div><a class="x-btn" href=${backHref}>Back to programme</a></div>`;
  return html`<div class="x-page plain">
    <div class="x-topbar"><a class="x-link" href=${backHref}>Close</a><${VoiceSwitch} /></div>
    <div><div class="x-over">${title}</div><h1 class="x-title md">${x ? x.name : 'Voice coach'}</h1></div>
    ${x ? html`<div class="x-chips"><span class="x-chip tint">${x.dose}</span><span class="x-chip">${x.equipment}</span><span class="x-chip">${i + 1} of ${items.length}</span></div>
      <div class="x-list">${x.steps.map((st, n) => html`<div class="x-row"><span class="x-avatar soft" style="width:32px;height:32px;font-size:14px">${n + 1}</span><div class="grow">${st}</div></div>`)}</div>
      <div class="x-card sg-tool"><div class="x-kicker"><${XIcon} name="timer" size=${16} /> Rest</div><${Big} sub=${rest ? 'Breathe. The phone tells you when to go.' : 'Between sets or before the next exercise.'}>${fmtClock(rest * 1000)}<//>
        <div class="x-btns">${[45, 90].map((sec) => html`<button class="x-btn ghost sm" style="width:100%" onClick=${() => startRest(sec)}>Rest ${sec} s</button>`)}</div></div>
      <div class="x-btns"><button class="x-btn ghost" onClick=${() => read(i)}><${XIcon} name="speaker" size=${18} />Read again</button><button class="x-btn" onClick=${() => goTo(i + 1)}>${i + 1 < items.length ? 'Next exercise' : 'Finish'}<${XIcon} name="next" size=${18} /></button></div>`
    : html`<div class="x-card"><p class="x-muted">${items.length} exercises. The phone reads each one out, times your rests, and ticks the session off when you finish.</p></div>
      <div class="x-list">${items.map((y, n) => html`<div class="x-row"><span class="x-avatar soft" style="width:32px;height:32px;font-size:14px">${n + 1}</span><div class="grow"><b>${y.name}</b><span class="x-small x-muted">${y.dose}</span></div></div>`)}</div>
      <button class="x-btn" onClick=${() => goTo(0)}><${XIcon} name="play" size=${20} />Start session</button>`}
  </div>`;
}
