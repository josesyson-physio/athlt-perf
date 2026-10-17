// The athlete app: Today, daily pulse, free tests, Mirror, feed, exercise library and profile.
import { html, useState, useEffect } from '../vendor/preact-htm.js';
import { go, toast, has, downloadFile } from '../ui.js';
import { XIcon, XSeg, XScale, XField, firstName, initial, ago } from '../xui.js';
import * as store from '../store.js';
import { me, myAthlete, signOut, joinTeam, coachesOf, switchTo, ROLES } from '../session.js';
import { feedFor, toggleReaction, myReaction, reactionsOn, REACTIONS, POST_TYPES, sendReport, myReports, plansFor, resultsFor, starred } from '../social.js';
import { EXERCISES, AREAS as LIB_AREAS, byKey as exercise, forArea } from '../library.js';
import { today, evaluateAthlete } from '../monitor.js';

const T = globalThis.MotionPlusTests;
const M = globalThis.MotionPlusMonitor;

// ---------- shell ----------
const TABS = [
  { path: '/', label: 'Today', icon: 'today' },
  { path: '/tests', label: 'Tests', icon: 'tests' },
  { path: '/mirror', label: 'Mirror', icon: 'mirror' },
  { path: '/feed', label: 'Feed', icon: 'feed' },
  { path: '/library', label: 'Library', icon: 'library' },
];

export function AthleteApp({ r }) {
  const [a, b] = r.parts;
  let page;
  if (!a) page = html`<${Today} />`;
  else if (a === 'pulse') page = html`<${Pulse} />`;
  else if (a === 'tests' && !b) page = html`<${Tests} />`;
  else if (a === 'tests') page = html`<${TestRun} key=${b} testKey=${b} />`;
  else if (a === 'mirror') page = html`<${Mirror} />`;
  else if (a === 'feed') page = html`<${Feed} query=${r.query} />`;
  else if (a === 'library' && !b) page = html`<${Library} query=${r.query} />`;
  else if (a === 'library') page = html`<${Exercise} id=${b} />`;
  else if (a === 'me') page = html`<${Me} />`;
  else if (a === 'plans') page = html`<${Plans} />`;
  else page = html`<div class="x-page"><div class="x-card"><h2>Page not found</h2><a href="#/">Go to Today</a></div></div>`;
  const active = (p) => (p === '/' ? r.path === '/' || r.path === '/pulse' || r.path === '/me' || r.path === '/plans' : r.path.startsWith(p));
  const hideTabs = a === 'pulse' || (a === 'tests' && b);
  return html`<div class="x">${page}
    ${hideTabs ? null : html`<nav class="x-tabs" aria-label="Main">${TABS.map((t) => html`<a href=${'#' + t.path} class=${active(t.path) ? 'on' : ''} aria-current=${active(t.path) ? 'page' : null}><${XIcon} name=${t.icon} size=${24} />${t.label}</a>`)}</nav>`}
  </div>`;
}

// ---------- helpers ----------
const dayIso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
function streak(checkins) {
  const days = new Set(checkins.map((c) => c.date));
  const d = new Date();
  if (!days.has(dayIso(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(dayIso(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function bestStreak(checkins) {
  const days = [...new Set(checkins.map((c) => c.date))].sort();
  let best = 0, run = 0, prev = null;
  days.forEach((d) => { run = prev && Date.parse(d) - Date.parse(prev) === 864e5 ? run + 1 : 1; best = Math.max(best, run); prev = d; });
  return best;
}
function thisWeek(checkins) {
  const days = new Set(checkins.map((c) => c.date));
  const now = new Date();
  const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((l, i) => {
    const d = new Date(mon); d.setDate(mon.getDate() + i);
    const iso = dayIso(d);
    return { l, on: days.has(iso), today: iso === today() };
  });
}
const fmtVal = (t, v) => (v == null || v === '' ? '–' : v + (t.unit === 'cm' || t.unit === 'm' || t.unit === 's' ? ' ' + t.unit : ''));
const unitWord = (t) => (t.unit === 'pain 0 to 10' ? 'pain' : t.unit);

// The test to do next: never done first, then the one done longest ago.
function nextTest(results) {
  const order = T.TESTS.map((t) => ({ t, last: T.history(results, t.key)[0] }));
  const never = order.find((x) => !x.last);
  if (never) return never;
  return order.sort((p, q) => (p.last.date < q.last.date ? -1 : 1))[0];
}

function NoAthlete() {
  return html`<div class="x-page"><div class="x-card"><h2>No athlete profile</h2><p class="x-muted">This account has no athlete profile on this phone.</p><button class="x-btn" onClick=${() => { signOut(); go('/welcome'); }}>Sign out</button></div></div>`;
}

// ---------- Today ----------
function Today() {
  const u = me();
  const a = myAthlete();
  if (!a) return html`<${NoAthlete} />`;
  const s = store.getState();
  const checkins = s.checkins.filter((c) => c.athleteId === a.id);
  const done = checkins.find((c) => c.date === today());
  const results = resultsFor(a.id);
  const ev = evaluateAthlete(a);
  const urgent = ev.signals.find((x) => x.level === 'urgent' && x.open);
  const rows = T.mirror(results).filter((x) => x.tested);
  const toWork = rows.filter((x) => x.status === 'work').length;
  const nx = nextTest(results);
  const g = nx.last ? T.ghost(results, nx.t.key) : null;
  const plan = plansFor(a.id)[0];
  const n = streak(checkins);
  const date = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  return html`<div class="x-page">
    <div class="x-head"><div><div class="x-over">${date}</div><h1 class="x-title">Hey ${firstName(u.name)}</h1></div><a class="x-avatar" href="#/me" aria-label="Your profile">${initial(u.name)}</a></div>
    ${urgent ? html`<div class="x-urgent" role="alert"><h1>Stop. Don't train today.</h1><p>You reported: ${urgent.title.toLowerCase()}. Tell your coach and see a doctor today. Chest pain or trouble breathing right now: call 112.</p></div>` : null}
    <div class="x-card"><div style="display:flex;justify-content:space-between;align-items:baseline"><b style="font-size:17px">${n ? n + '-day streak' : 'Start your streak'}</b><span class="x-small x-dim">Best ${Math.max(n, bestStreak(checkins))}</span></div>
      <div class="x-week" aria-label="Check-ins this week">${thisWeek(checkins).map((d) => html`<span>${d.l}<i class=${d.on ? 'on' : d.today ? 'today' : ''}></i></span>`)}</div></div>
    ${done ? html`<a class="x-card" href="#/pulse" style="flex-direction:row;align-items:center;gap:14px;color:inherit"><span class="x-badge"><${XIcon} name="check" /></span><div style="flex:1"><b>Pulse done for today</b><div class="x-small x-muted">${done.pain ? 'Pain: ' + (done.regions || []).join(', ') : 'No pain'} · sleep ${done.sleepHours} h</div></div><span class="x-chev"><${XIcon} name="next" size=${18} /></span></a>`
    : html`<div class="x-card"><div class="x-kicker">Daily pulse</div><h2>How is your body today?</h2><p class="x-muted">Six quick taps. Keeps your streak alive.</p><a class="x-btn" href="#/pulse" style="margin-top:8px">Start · 30 sec</a></div>`}
    ${plan ? html`<a class="x-card" href="#/plans" style="flex-direction:row;align-items:center;gap:14px;color:inherit"><span class="x-avatar soft">${initial(plan.coachName)}</span><div style="flex:1;min-width:0"><b>Plan from ${plan.coachName}</b><div class="x-small x-muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${plan.text}</div></div><span class="x-chev"><${XIcon} name="next" size=${18} /></span></a>` : null}
    <a class="x-card" href="#/mirror" style="flex-direction:row;align-items:center;gap:16px;color:inherit">
      <div style="display:flex;flex-direction:column;gap:5px;width:86px" aria-hidden="true">${(rows.length ? rows.slice().sort((p, q) => ({ work: 0, watch: 1, even: 2 })[p.status] - ({ work: 0, watch: 1, even: 2 })[q.status]).slice(0, 3) : [{}, {}, {}]).map((x) => html`<div style="display:flex;gap:3px;justify-content:center"><span style=${'height:8px;border-radius:4px;width:' + Math.round((x.pctL || 90) * 0.38) + 'px;background:' + (x.weak === 'left' ? statusColor(x.status) : '#DCDCE2')}></span><span style=${'height:8px;border-radius:4px;width:' + Math.round((x.pctR || 90) * 0.38) + 'px;background:' + (x.weak === 'right' ? statusColor(x.status) : '#DCDCE2')}></span></div>`)}</div>
      <div style="flex:1"><b style="font-size:17px">Mirror</b><div class="x-small x-muted">${!rows.length ? 'Do a test to see your left and right' : toWork ? toWork + (toWork > 1 ? ' areas' : ' area') + ' to work on' : 'Left and right look even'}</div></div>
      <span class="x-chev"><${XIcon} name="next" size=${18} /></span></a>
    <a class="x-card dark" href=${'#/tests/' + nx.t.key} style="gap:10px;color:#fff">
      <div style="display:flex;justify-content:space-between"><span class="x-kicker">${nx.last ? 'Beat your ghost' : 'Next test'}</span><span class="x-small x-muted">${nx.last ? 'last ' + ago(nx.last.date + 'T12:00:00') : nx.t.equipment.join(', ')}</span></div>
      <b style="font-size:20px;letter-spacing:-.02em">${nx.t.name}</b>
      ${nx.last && g ? html`<div style="display:flex;align-items:baseline;gap:10px"><span class="x-big">${nx.t.sides ? Math.min(Number(nx.last.left), Number(nx.last.right)) : nx.last.value}</span><span class="x-muted">${unitWord(nx.t)} now · ghost ${nx.t.sides ? Math.max(g.left || 0, g.right || 0) : g.value}</span></div>` : html`<span class="x-muted">${nx.t.steps[0]}</span>`}
    </a>
    ${!u.teamCode ? html`<${JoinTeam} />` : null}
  </div>`;
}
const statusColor = (s) => (s === 'work' ? '#F2385A' : s === 'watch' ? '#F59E0B' : '#DCDCE2');

function JoinTeam() {
  const [code, setCode] = useState('');
  const [bad, setBad] = useState(false);
  return html`<form class="x-card" onSubmit=${async (e) => { e.preventDefault(); const ok = await joinTeam(code); setBad(!ok); if (ok) toast('You joined the team.'); }}>
    <div class="x-kicker">Your coach</div><h2>Join your coach's team</h2><p class="x-muted">Ask your coach, trainer or physio for their team code. Then you can send them your Mirror and see their posts.</p>
    <${XField} label="Team code" value=${code} onInput=${(v) => setCode(v.toUpperCase())} placeholder="ABC234" />
    ${bad ? html`<div class="x-err">No team with that code on this phone.</div>` : null}
    <button class="x-btn soft" type="submit">Join</button></form>`;
}

// ---------- daily pulse ----------
const RED = [
  ['chest', 'During or after exercise, did you have chest pain, faint, or feel your heart racing?'],
  ['bone', 'Do you have pain on one spot of a bone that hurts when you land, or at night?'],
  ['head', 'Did you hit your head and since have a headache, dizziness or feel foggy?'],
];
const yesNo = [{ value: false, label: 'No' }, { value: true, label: 'Yes' }];

function Pulse() {
  const a = myAthlete();
  const existing = a ? store.getState().checkins.find((c) => c.athleteId === a.id && c.date === today()) : null;
  const [f, setF] = useState(() => existing ? JSON.parse(JSON.stringify(existing)) : { pain: null, regions: [], painScore: '', painAffectsRunning: null, fatigue: null, soreness: null, sleepHours: '', ill: null, redFlags: {}, sensitive: {} });
  const [started] = useState(Date.now());
  const [tried, setTried] = useState(false);
  const [urgent, setUrgent] = useState(false);
  if (!a) return html`<${NoAthlete} />`;
  const set = (k, v) => setF(Object.assign({}, f, { [k]: v }));
  const missing = [];
  if (f.pain === null) missing.push('pain');
  if (f.pain && !f.regions.length) missing.push('where it hurts');
  if (f.pain && !has(f.painScore)) missing.push('how bad');
  if (f.fatigue === null) missing.push('tiredness');
  if (f.soreness === null) missing.push('soreness');
  if (!has(f.sleepHours) || Number(f.sleepHours) < 0 || Number(f.sleepHours) > 16) missing.push('hours of sleep (0 to 16)');
  if (f.ill === null) missing.push('feeling ill');
  if (RED.some(([k]) => typeof f.redFlags[k] !== 'boolean')) missing.push('the 3 safety questions');
  if (urgent) return html`<div class="x-page plain"><div class="x-urgent" role="alert"><h1>Stop. Don't train today.</h1><p>Tell your coach now and see a doctor today before you train again.</p><p>Chest pain, fainting or trouble breathing right now: call 112.</p></div><a class="x-btn dark" href="#/">I've told my coach</a></div>`;
  const save = async () => {
    setTried(true);
    if (missing.length) return;
    const rec = Object.assign({}, f, { id: existing ? existing.id : store.newId('CI'), athleteId: a.id, date: today(), enteredOn: 'own phone', sleepHours: Number(f.sleepHours), secondsToComplete: Math.round((Date.now() - started) / 1000) });
    if (!rec.pain) { rec.regions = []; rec.painScore = ''; rec.painAffectsRunning = false; }
    await store.saveRecord('checkins', rec);
    if (RED.some(([k]) => rec.redFlags[k])) { setUrgent(true); return; }
    toast('Pulse saved. Streak kept.');
    go('/');
  };
  const toggle = (r) => set('regions', f.regions.includes(r) ? f.regions.filter((x) => x !== r) : f.regions.concat([r]));
  return html`<div class="x-page plain">
    <div class="x-topbar"><a class="x-link" href="#/">Cancel</a><span class="x-small x-dim" style="font-weight:600">Daily pulse</span></div>
    <h1 class="x-title md">How is your body today?</h1>
    <div class="x-card"><b>Any pain or niggle today?</b><${XSeg} label="Pain" value=${f.pain} options=${yesNo} onChange=${(v) => set('pain', v)} />
      ${f.pain ? html`<b style="margin-top:8px">Where?</b><div class="x-chips">${M.REGIONS.map((r) => html`<button type="button" class=${'x-chip' + (f.regions.includes(r) ? ' tint' : '')} style="border:0;min-height:40px" aria-pressed=${String(f.regions.includes(r))} onClick=${() => toggle(r)}>${r}</button>`)}</div>
        <b style="margin-top:8px">How bad, 0 to 10?</b><div class="x-scale eleven" role="group" aria-label="Pain score">${Array.from({ length: 11 }, (_, i) => html`<button type="button" aria-pressed=${String(f.painScore === i)} onClick=${() => set('painScore', i)}><b>${i}</b></button>`)}</div>
        <b style="margin-top:8px">Is it changing how you run or move?</b><${XSeg} label="Pain changes movement" value=${f.painAffectsRunning} options=${yesNo} onChange=${(v) => set('painAffectsRunning', v)} />` : null}
    </div>
    <div class="x-card"><b>How tired?</b><${XScale} label="Tiredness" value=${f.fatigue} words=${['Fresh', 'Good', 'OK', 'Tired', 'Wiped']} onChange=${(v) => set('fatigue', v)} /></div>
    <div class="x-card"><b>How sore are your muscles?</b><${XScale} label="Soreness" value=${f.soreness} words=${['None', 'Bit', 'Some', 'Sore', 'Very']} onChange=${(v) => set('soreness', v)} /></div>
    <div class="x-card" style="gap:12px"><${XField} label="Hours of sleep last night" type="number" inputmode="decimal" step="0.5" min="0" max="16" value=${f.sleepHours} onInput=${(v) => set('sleepHours', v)} />
      <b>Feeling ill? Fever, sore throat, cough or stomach upset.</b><${XSeg} label="Ill" value=${f.ill} options=${yesNo} onChange=${(v) => set('ill', v)} /></div>
    <div class="x-card" style="gap:12px"><div class="x-kicker" style="color:var(--x-work-text)">Safety</div>${RED.map(([k, q]) => html`<b>${q}</b><${XSeg} label=${q} value=${f.redFlags[k]} options=${yesNo} onChange=${(v) => set('redFlags', Object.assign({}, f.redFlags, { [k]: v }))} />`)}</div>
    ${tried && missing.length ? html`<div class="x-err" role="alert">Please answer: ${missing.join(', ')}.</div>` : null}
    <button class="x-btn" onClick=${save}>Save pulse</button>
  </div>`;
}

// ---------- tests ----------
const STATUS_WORD = { work: 'Work on', watch: 'Watch', even: 'Even' };
function StatusChip({ s }) { return s ? html`<span class=${'x-chip ' + (s === 'even' ? '' : s)}>${STATUS_WORD[s]}</span>` : null; }

function Tests() {
  const a = myAthlete();
  if (!a) return html`<${NoAthlete} />`;
  const results = resultsFor(a.id);
  const row = (t) => {
    const last = T.history(results, t.key)[0];
    const j = last ? T.judge(t.key, last) : null;
    return html`<a class="x-row" href=${'#/tests/' + t.key}><span class=${'x-badge ' + (j && j.status !== 'even' ? j.status : '')}><${XIcon} name=${t.sides ? 'mirror' : 'tests'} size=${18} /></span>
      <div class="grow"><b>${t.name}</b><span class="x-small x-muted">${last ? (t.sides ? 'L ' + last.left + ' · R ' + last.right + ' ' + unitWord(t) : fmtVal(t, last.value)) + ' · ' + ago(last.date + 'T12:00:00') : t.equipment.join(', ')}</span></div>
      ${j ? html`<${StatusChip} s=${j.status} />` : last ? null : html`<span class="x-chip tint">New</span>`}<span class="x-chev"><${XIcon} name="next" size=${18} /></span></a>`;
  };
  return html`<div class="x-page">
    <div class="x-head"><div><div class="x-over">Basic equipment only</div><h1 class="x-title">Tests</h1></div></div>
    <p class="x-sub" style="padding:0 4px">Each test takes a few minutes. Do them on flat, hard ground and retest every 4 weeks.</p>
    <div class="x-section">Left vs right</div><div class="x-list">${T.TESTS.filter((t) => t.sides).map(row)}</div>
    <div class="x-section">Fitness</div><div class="x-list">${T.TESTS.filter((t) => !t.sides).map(row)}</div>
  </div>`;
}

function Stepper({ value, onChange, label }) {
  const v = Number(value) || 0;
  return html`<div style="display:flex;justify-content:center;align-items:center;gap:28px">
    <button type="button" aria-label=${'One less, ' + label} onClick=${() => onChange(Math.max(0, v - 1))} style="width:64px;height:64px;border-radius:999px;border:0;background:var(--x-bg);color:var(--x-text)"><${XIcon} name="minus" size=${26} /></button>
    <button type="button" aria-label=${'One more, ' + label} onClick=${() => onChange(v + 1)} style="width:88px;height:88px;border-radius:999px;border:0;background:var(--x-tint);color:#fff;box-shadow:0 10px 24px rgba(74,47,224,.35)"><${XIcon} name="plus" size=${34} /></button>
  </div>`;
}

function TestRun({ testKey }) {
  const a = myAthlete();
  const t = T.byKey(testKey);
  const [side, setSide] = useState('left');
  const [e, setE] = useState({ left: '', right: '', value: '' });
  const [errs, setErrs] = useState([]);
  const [saved, setSaved] = useState(null);
  if (!a) return html`<${NoAthlete} />`;
  if (!t) return html`<div class="x-page plain"><div class="x-card"><h2>Test not found</h2><a href="#/tests">All tests</a></div></div>`;
  const results = resultsFor(a.id);
  const g = T.ghost(results, t.key);
  const counting = t.unit === 'raises' || t.unit === 'reps';
  const k = t.sides ? side : 'value';
  const gv = g ? g[k] : null;
  const save = async () => {
    const entry = t.sides ? { left: Number(e.left), right: Number(e.right) } : { value: Number(e.value) };
    const er = T.check(t.key, t.sides ? e : { value: e.value });
    setErrs(er);
    if (er.length) return;
    const rec = await store.saveRecord('results', Object.assign({ id: store.newId('TR'), athleteId: a.id, test: t.key, date: today(), version: T.VERSION }, entry));
    setSaved(rec);
  };
  if (saved) {
    const j = T.judge(t.key, saved);
    const beat = g && (t.sides ? ['left', 'right'].filter((s) => g[s] != null && saved[s] > g[s]) : (t.lowerBetter ? saved.value < g.value : saved.value > g.value) ? ['value'] : []);
    return html`<div class="x-page plain">
      <div style="padding:40px 4px 8px;display:flex;flex-direction:column;gap:10px">
        <span class="x-badge" style="width:56px;height:56px;border-radius:18px"><${XIcon} name=${beat && beat.length ? 'star' : 'check'} size=${28} /></span>
        <h1 class="x-title">${beat && beat.length ? 'You beat your ghost' : g ? 'Saved' : 'First result saved'}</h1>
        <p class="x-sub">${beat && beat.length ? (t.sides ? beat.map((s) => s[0].toUpperCase() + s.slice(1)).join(' and ') + ' side' + (beat.length > 1 ? 's' : '') + ' set a new best.' : 'New personal best: ' + fmtVal(t, saved.value) + '.') : g ? 'This is your new ghost to chase next time.' : 'This is your ghost. Beat it next time.'}</p>
      </div>
      ${j ? html`<div class="x-card" style="flex-direction:row;gap:12px;align-items:center"><span class=${'x-badge ' + (j.status === 'even' ? '' : j.status)}><${XIcon} name=${j.status === 'even' ? 'check' : 'alert'} size=${18} /></span><div style="flex:1"><b>${STATUS_WORD[j.status]}</b><div class="x-small x-muted">${j.text}</div></div></div>` : null}
      <a class="x-btn" href="#/mirror">See your Mirror</a><a class="x-btn ghost" href="#/tests">Back to tests</a>
    </div>`;
  }
  return html`<div class="x-page plain">
    <div class="x-topbar"><a class="x-link" href="#/tests">Cancel</a><span class="x-small x-dim" style="font-weight:600">${t.equipment.join(' · ')}</span></div>
    <h1 class="x-title md">${t.name}</h1>
    <ol style="margin:0;padding-left:20px;color:var(--x-muted);display:grid;gap:6px">${t.steps.map((s) => html`<li>${s}</li>`)}</ol>
    ${t.sides ? html`<${XSeg} label="Side" value=${side} onChange=${setSide} options=${[{ value: 'left', label: 'Left' + (has(e.left) ? ' · ' + e.left : '') }, { value: 'right', label: 'Right' + (has(e.right) ? ' · ' + e.right : '') }]} />` : null}
    <div class="x-card" style="align-items:center;gap:6px;padding:26px 18px">
      ${counting ? html`<div class="x-huge" aria-live="polite">${e[k] === '' ? 0 : e[k]}</div><div class="x-muted">${unitWord(t)}</div>`
      : html`<label class="x-field" style="width:100%;text-align:center"><span>${(t.sides ? side[0].toUpperCase() + side.slice(1) + ' side' : 'Result') + ', ' + t.unit}</span><input class="x-input" style="font-size:48px;font-weight:800;text-align:center;min-height:90px;letter-spacing:-.04em" type="number" inputmode="decimal" step="any" value=${e[k]} onInput=${(ev) => setE(Object.assign({}, e, { [k]: ev.target.value }))} /></label>`}
      ${gv != null ? html`<div style="display:flex;align-items:center;gap:8px;color:var(--x-tint);font-weight:600;margin-top:8px"><span style="width:14px;height:14px;border-radius:999px;border:2px dashed currentColor"></span>Ghost: ${fmtVal(t, gv)}${counting ? ' ' + t.unit : ''}</div>` : html`<div class="x-small x-dim" style="margin-top:8px">First time. This result becomes your ghost.</div>`}
    </div>
    ${counting ? html`<${Stepper} label=${t.sides ? side : 'result'} value=${e[k]} onChange=${(v) => setE(Object.assign({}, e, { [k]: v }))} />` : null}
    ${t.sides && side === 'left' ? html`<button class="x-btn soft" onClick=${() => setSide('right')}>Next: right side</button>` : null}
    ${errs.length ? html`<div class="x-err" role="alert">${errs.join(' ')}</div>` : null}
    <button class="x-btn dark" onClick=${save}>Save</button>
  </div>`;
}

// ---------- mirror ----------
export function MirrorBoard({ rows }) {
  return html`<div class="x-card" style="padding:18px 14px 14px">
    <div class="x-mirror-head"><div>LEFT</div><div></div><div>RIGHT</div></div>
    ${rows.map((x) => x.tested ? html`<div class="x-mirror-row">
        <div class="l"><span class=${'v ' + (x.weak === 'left' && x.status !== 'even' ? x.status : '')}>${x.left}</span><span class=${'bar ' + (x.weak === 'left' && x.status !== 'even' ? x.status : '')} style=${'width:' + Math.round(x.pctL * 1.1) + 'px'}></span></div>
        <div class="name">${x.name}</div>
        <div class="r"><span class=${'bar ' + (x.weak === 'right' && x.status !== 'even' ? x.status : '')} style=${'width:' + Math.round(x.pctR * 1.1) + 'px'}></span><span class=${'v ' + (x.weak === 'right' && x.status !== 'even' ? x.status : '')}>${x.right}</span></div>
      </div>` : html`<div class="x-mirror-row untested"><div class="l"><span class="none">Not tested</span></div><div class="name">${x.name}</div><div class="r"></div></div>`)}
    <div class="x-legend"><span><i style="background:#F2385A"></i>Work on</span><span><i style="background:#F59E0B"></i>Watch</span><span><i style="background:#CFCFD6"></i>Even</span></div>
  </div>`;
}

function Mirror() {
  const u = me();
  const a = myAthlete();
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  if (!a) return html`<${NoAthlete} />`;
  const results = resultsFor(a.id);
  const rows = T.mirror(results);
  const flagged = rows.filter((x) => x.tested && x.status !== 'even').sort((p, q) => (p.status === 'work' ? -1 : 1) - (q.status === 'work' ? -1 : 1));
  const squeeze = T.history(results, 'squeeze')[0];
  const sj = squeeze ? T.judge('squeeze', squeeze) : null;
  const strengths = T.improvements(results).map((x) => x.text).concat(rows.filter((x) => x.tested && x.status === 'even').map((x) => x.name + ' even'));
  const reports = myReports(u);
  const send = async () => { setSending(true); try { await sendReport(note); setNote(''); toast('Sent to your coach.'); } catch (e) { toast(e.message); } setSending(false); };
  return html`<div class="x-page">
    <div class="x-head"><div><div class="x-over">Left and right, head to toe</div><h1 class="x-title">Mirror</h1></div><button class="x-link x-noprint" onClick=${() => window.print()}><${XIcon} name="print" size=${20} />PDF</button></div>
    <p class="x-sub" style="padding:0 4px">The shorter side is where you're losing power. Bars show each side as a share of your stronger side.</p>
    <${MirrorBoard} rows=${rows} />
    ${flagged.length || (sj && sj.status === 'work') ? html`<div class="x-list">${flagged.map((x) => html`<a class="x-row" href=${'#/library?area=' + x.area}><span class=${'x-badge ' + x.status}><${XIcon} name="down" size=${16} /></span><div class="grow"><b>${x.text}</b><span class="x-small x-muted">${T.byKey(x.test).name} · ${ago(x.date + 'T12:00:00')} · exercises</span></div><span class="x-chev"><${XIcon} name="next" size=${18} /></span></a>`)}
      ${sj && sj.status === 'work' ? html`<a class="x-row" href="#/library?area=groin"><span class="x-badge work"><${XIcon} name="alert" size=${16} /></span><div class="grow"><b>${sj.text}</b><span class="x-small x-muted">Groin squeeze · show your physio</span></div><span class="x-chev"><${XIcon} name="next" size=${18} /></span></a>` : null}</div>` : null}
    ${strengths.length ? html`<div class="x-card" style="flex-direction:row;gap:12px;align-items:center"><span class="x-badge"><${XIcon} name="up" size=${16} /></span><div style="flex:1"><b>Your strengths</b><div class="x-small x-muted">${strengths.join(' · ')}</div></div></div>` : null}
    ${!rows.some((x) => x.tested) ? html`<a class="x-btn" href="#/tests">Do your first test</a>` : u.teamCode ? html`<div class="x-card x-noprint" style="gap:12px"><div class="x-kicker">Your coach</div><h2>Send your Mirror</h2>
        <p class="x-muted">${coachesOf(u.teamCode).map((c) => c.name + ' (' + ROLES[c.role] + ')').join(', ') || 'Your team'} will see your tests and last 7 days, and can send you a plan.</p>
        <${XField} label="Anything to add? (optional)" type="textarea" rows=${2} value=${note} onInput=${setNote} placeholder="For example: my left calf feels tight after spikes" />
        <button class="x-btn" disabled=${sending} onClick=${send}><${XIcon} name="share" size=${20} />Send to my coach</button>
        ${reports.length ? html`<p class="x-small x-dim">Last sent ${ago(reports[0].createdAt)} · ${reports[0].status === 'answered' ? 'plan received' : 'waiting for a plan'}</p>` : null}</div>`
      : html`<${JoinTeam} />`}
  </div>`;
}

// ---------- feed ----------
const TYPE_ICON = { insight: 'bulb', document: 'file', training: 'run' };
function FileView({ p }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!p.file) return undefined;
    const u = URL.createObjectURL(p.file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [p.id]);
  if (!p.file) return p.fileName ? html`<span class="x-small x-dim">${p.fileName} (not on this phone)</span>` : null;
  if (!url) return null;
  if ((p.fileType || '').startsWith('image/')) return html`<img src=${url} alt=${p.title} />`;
  return html`<a class="x-row" style="background:var(--x-bg);border-radius:14px" href=${url} target="_blank" rel="noopener" download=${p.fileName}><span class="x-badge"><${XIcon} name="file" size=${18} /></span><div class="grow"><b>${p.fileName}</b><span class="x-small x-muted">Open document</span></div></a>`;
}

export function PostCard({ p, canReact, onDelete }) {
  const rs = reactionsOn(p.id);
  return html`<article class="x-post">
    <div class="x-post-head"><span class="x-avatar soft">${initial(p.authorName)}</span><div class="grow"><b>${p.authorName}</b><div class="x-small x-muted">${ROLES[p.authorRole] || 'Coach'} · ${ago(p.createdAt)}</div></div><span class="x-chip tint"><${XIcon} name=${TYPE_ICON[p.type]} size=${14} />${POST_TYPES[p.type]}</span></div>
    <h3>${p.title}</h3>
    ${p.body ? html`<p>${p.body}</p>` : null}
    <${FileView} p=${p} />
    ${p.exercises && p.exercises.length ? html`<div class="x-list" style="background:var(--x-bg)">${p.exercises.map((k) => exercise(k)).filter(Boolean).map((x) => html`<a class="x-row" href=${'#/library/' + x.key}><div class="grow"><b>${x.name}</b><span class="x-small x-muted">${x.dose}</span></div><span class="x-chev"><${XIcon} name="next" size=${16} /></span></a>`)}</div>` : null}
    <div class="x-react">${REACTIONS.map((rx) => {
      const n = rs.filter((x) => x.kind === rx.key).length;
      return canReact ? html`<button type="button" aria-pressed=${String(myReaction(p.id, rx.key))} aria-label=${rx.label} onClick=${() => toggleReaction(p.id, rx.key)}><${XIcon} name=${rx.key} size=${18} fill=${myReaction(p.id, rx.key)} />${n || ''}</button>`
        : html`<span title=${rx.label}><${XIcon} name=${rx.key} size=${18} />${n}</span>`;
    })}${onDelete ? html`<button type="button" style="margin-left:auto" aria-label="Delete post" onClick=${onDelete}><${XIcon} name="trash" size=${18} /></button>` : null}</div>
  </article>`;
}

function Feed({ query }) {
  const u = me();
  const [only, setOnly] = useState(query.get('show') || 'all');
  const posts = feedFor(u);
  const stars = new Set(starred(u));
  const shown = only === 'starred' ? posts.filter((p) => stars.has(p.id)) : posts;
  return html`<div class="x-page">
    <div class="x-head"><div><div class="x-over">From your coaches</div><h1 class="x-title">Feed</h1></div></div>
    <${XSeg} label="Show" value=${only} onChange=${setOnly} options=${[{ value: 'all', label: 'All' }, { value: 'starred', label: 'Starred' }]} />
    ${!u.teamCode ? html`<${JoinTeam} />` : !shown.length ? html`<div class="x-card" style="align-items:center;text-align:center;padding:36px 18px"><span class="x-badge"><${XIcon} name=${only === 'starred' ? 'star' : 'feed'} /></span><b>${only === 'starred' ? 'No starred posts yet' : 'Nothing posted yet'}</b><p class="x-muted x-small">${only === 'starred' ? 'Tap the star on a post to keep it here.' : 'Insights, documents and training from your coaches will show up here.'}</p></div>`
      : shown.map((p) => html`<${PostCard} key=${p.id} p=${p} canReact=${true} />`)}
  </div>`;
}

// ---------- library ----------
export function Library({ query }) {
  const [q, setQ] = useState('');
  const [area, setArea] = useState(query.get('area') || '');
  const list = EXERCISES.filter((x) => (!area || x.area === area) && (!q || (x.name + ' ' + x.equipment).toLowerCase().includes(q.toLowerCase())));
  return html`<div class="x-page">
    <div class="x-head"><div><div class="x-over">Basic equipment</div><h1 class="x-title">Library</h1></div></div>
    <label class="x-field"><span class="x-noprint" style="position:absolute;left:-9999px">Search exercises</span><input class="x-input" style="background:#fff" type="search" placeholder="Search exercises" value=${q} onInput=${(e) => setQ(e.target.value)} /></label>
    <div class="x-chips"><button type="button" class=${'x-chip' + (!area ? ' tint' : '')} style="border:0;min-height:40px" aria-pressed=${String(!area)} onClick=${() => setArea('')}>All</button>${Object.entries(LIB_AREAS).map(([k, v]) => html`<button type="button" class=${'x-chip' + (area === k ? ' tint' : '')} style="border:0;min-height:40px" aria-pressed=${String(area === k)} onClick=${() => setArea(k)}>${v}</button>`)}</div>
    <div class="x-list">${list.length ? list.map((x) => html`<a class="x-row" href=${'#/library/' + x.key}><div class="grow"><b>${x.name}</b><span class="x-small x-muted">${LIB_AREAS[x.area]} · ${x.dose} · ${x.equipment}</span></div><span class="x-chev"><${XIcon} name="next" size=${18} /></span></a>`) : html`<div class="x-row"><span class="x-muted">No exercises match.</span></div>`}</div>
    <p class="x-small x-dim" style="padding:0 4px">Doses are a starting point. Your coach or physio can change them. Stop if anything hurts sharply.</p>
  </div>`;
}

export function Exercise({ id }) {
  const x = exercise(id);
  if (!x) return html`<div class="x-page"><div class="x-card"><h2>Exercise not found</h2><a href="#/library">Library</a></div></div>`;
  return html`<div class="x-page">
    <div class="x-topbar"><a class="x-link" href=${'#/library?area=' + x.area}><${XIcon} name="back" size=${20} />Library</a></div>
    <div><div class="x-over">${LIB_AREAS[x.area]}</div><h1 class="x-title md">${x.name}</h1></div>
    <div class="x-chips"><span class="x-chip tint">${x.dose}</span><span class="x-chip">${x.equipment}</span></div>
    <div class="x-list">${x.steps.map((s, i) => html`<div class="x-row"><span class="x-avatar soft" style="width:32px;height:32px;font-size:14px">${i + 1}</span><div class="grow">${s}</div></div>`)}</div>
    ${forArea(x.area).filter((y) => y.key !== x.key).length ? html`<div class="x-section">More for ${LIB_AREAS[x.area].toLowerCase()}</div><div class="x-list">${forArea(x.area).filter((y) => y.key !== x.key).map((y) => html`<a class="x-row" href=${'#/library/' + y.key}><div class="grow"><b>${y.name}</b><span class="x-small x-muted">${y.dose}</span></div><span class="x-chev"><${XIcon} name="next" size=${18} /></span></a>`)}</div>` : null}
  </div>`;
}

// ---------- plans and profile ----------
function Plans() {
  const a = myAthlete();
  const plans = a ? plansFor(a.id) : [];
  return html`<div class="x-page">
    <div class="x-topbar"><a class="x-link" href="#/"><${XIcon} name="back" size=${20} />Today</a></div>
    <h1 class="x-title">Your plans</h1>
    ${!plans.length ? html`<div class="x-card"><b>No plans yet</b><p class="x-muted x-small">Send your Mirror to your coach from the Mirror tab. Their plan will show up here.</p></div>`
      : plans.map((p) => html`<div class="x-card"><div style="display:flex;gap:10px;align-items:center"><span class="x-avatar soft">${initial(p.coachName)}</span><div><b>${p.coachName}</b><div class="x-small x-muted">${ROLES[p.coachRole] || 'Coach'} · ${ago(p.createdAt)}</div></div></div>
        <p style="white-space:pre-line">${p.text}</p>
        ${p.exercises.length ? html`<div class="x-list" style="background:var(--x-bg)">${p.exercises.map((k) => exercise(k)).filter(Boolean).map((x) => html`<a class="x-row" href=${'#/library/' + x.key}><div class="grow"><b>${x.name}</b><span class="x-small x-muted">${x.dose}</span></div><span class="x-chev"><${XIcon} name="next" size=${16} /></span></a>`)}</div>` : null}</div>`)}
  </div>`;
}

function Me() {
  const u = me();
  const a = myAthlete();
  const others = store.getState().users.filter((x) => x.id !== u.id);
  const coaches = u.teamCode ? coachesOf(u.teamCode) : [];
  return html`<div class="x-page">
    <div class="x-topbar"><a class="x-link" href="#/"><${XIcon} name="back" size=${20} />Today</a></div>
    <div style="display:flex;gap:14px;align-items:center;padding:0 4px"><span class="x-avatar" style="width:64px;height:64px;font-size:26px">${initial(u.name)}</span><div><h1 class="x-title md">${u.name}</h1><p class="x-muted">${a ? [a.position || 'Athletics', a.dob ? a.dob.slice(0, 4) : ''].filter(Boolean).join(' · ') : ''}</p></div></div>
    <div class="x-list">
      <div class="x-row"><div class="grow"><b>Team</b><span class="x-small x-muted">${u.teamCode ? u.teamCode + ' · ' + (coaches.map((c) => c.name).join(', ') || 'no coach on this phone') : 'Not in a team yet'}</span></div></div>
      <a class="x-row" href="#/plans"><div class="grow"><b>Plans from your coach</b></div><span class="x-chev"><${XIcon} name="next" size=${18} /></span></a>
      <a class="x-row" href="#/feed?show=starred"><div class="grow"><b>Starred posts</b></div><span class="x-chev"><${XIcon} name="next" size=${18} /></span></a>
      <button class="x-row" type="button" onClick=${() => downloadFile('motionplus-' + today() + '.json', JSON.stringify(store.exportData(), null, 1))}><div class="grow"><b>Download a backup</b><span class="x-small x-muted">Your records stay on this phone. Keep a copy.</span></div></button>
    </div>
    ${!u.teamCode ? html`<${JoinTeam} />` : null}
    ${others.length ? html`<div class="x-section">Other accounts on this phone</div><div class="x-list">${others.map((o) => html`<button class="x-row" type="button" onClick=${() => { switchTo(o.id); go('/'); }}><span class="x-avatar soft">${initial(o.name)}</span><div class="grow"><b>${o.name}</b><span class="x-small x-muted">${ROLES[o.role]}</span></div><span class="x-chev"><${XIcon} name="swap" size=${18} /></span></button>`)}</div>` : null}
    <button class="x-btn ghost" onClick=${() => { signOut(); go('/welcome'); }}>Sign out</button>
  </div>`;
}
