import { html, useState } from '../vendor/preact-htm.js';
import { Icon, Field, Check, Seg, Empty, Notice, LineChart, fmtDate, initials, go, toast, has } from '../ui.js';
import * as store from '../store.js';
import { M, LEVEL, today, evaluateAthlete, squad, saveReview } from '../monitor.js';

export const LevelPill = ({ level }) => {
  const l = LEVEL[level] || LEVEL.none;
  return html`<span class="pill ${l.cls}">${l.name}</span>`;
};

const yesNo = [{ value: false, label: 'No' }, { value: true, label: 'Yes' }];
const scale = (labels) => labels.map((label, i) => ({ value: i + 1, label: i + 1 + ' ' + label }));
const FATIGUE = scale(['Very fresh', 'Fresh', 'Normal', 'Tired', 'Exhausted']);
const SORENESS = scale(['None', 'A little', 'Some', 'Sore', 'Very sore']);
const SLEEPQ = scale(['Very poor', 'Poor', 'OK', 'Good', 'Very good']);
const MOOD = scale(['Very low', 'Low', 'OK', 'Good', 'Very good']);
const RED = [
  ['chest', 'During or after exercise, did you have chest pain, faint, or feel your heart racing or skipping?'],
  ['bone', 'Do you have pain on one spot of a bone that hurts when you land or run, or at night?'],
  ['head', 'Did you hit your head, with a headache, dizziness or feeling foggy since?'],
];
const RPE = ['0 Rest', '1 Very easy', '2 Easy', '3 Moderate', '4 Somewhat hard', '5 Hard', '6', '7 Very hard', '8', '9', '10 Maximal'];

function Q({ label, children, hint }) {
  return html`<div class="q"><div class="q-label">${label}</div>${hint ? html`<div class="hint">${hint}</div>` : null}${children}</div>`;
}

// ---------- squad check-in ----------
export function SquadCheckin() {
  const s = store.getState();
  const d = today();
  const ready = s.athletes.slice().sort((a, b) => a.name.localeCompare(b.name));
  const doneToday = (a) => s.checkins.some((c) => c.athleteId === a.id && c.date === d);
  const done = ready.filter(doneToday).length;
  return html`<div class="head"><div><div class="eyebrow">${new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</div><h1>Squad check-in</h1><p>Hand this device to each athlete. Their check-in takes under a minute.</p></div>
    <div class="row"><span class="pill ${done === ready.length && ready.length ? 'approved' : 'calculated'}">${done} of ${ready.length} checked in today</span></div></div>
  ${!ready.length ? html`<div class="card"><${Empty} icon="users" title="No athletes yet" text="Add your athletes first.">
      <a class="btn primary" href="#/athletes/new">Add athlete</a></${Empty}></div>`
  : html`<div class="checkin-grid">${ready.map((a) => {
      const ok = doneToday(a);
      return html`<a class="checkin-tile ${ok ? 'done' : ''}" href=${'#/checkin/' + a.id}>
        <span class="avatar lg">${initials(a.name)}</span>
        <b>${a.name}</b>
        <span class="small muted">${a.sport || ''}${a.position ? ' · ' + a.position : ''}</span>
        <span class="row" style="gap:6px;justify-content:center">${ok ? html`<span class="pill approved"><${Icon} name="check" size=${12} />Done today</span>` : html`<span class="pill draft">Not yet</span>`}</span>
      </a>`;
    })}</div>`}
`;
}

export function CheckinForm({ id }) {
  const a = store.getAthlete(id);
  const d = today();
  const existing = store.getState().checkins.find((c) => c.athleteId === id && c.date === d);
  const [f, setF] = useState(() => existing ? JSON.parse(JSON.stringify(existing)) : { pain: null, regions: [], painScore: '', painAffectsRunning: null, fatigue: null, soreness: null, sleepHours: '', sleepQuality: null, ill: null, redFlags: {}, sensitive: { mood: null, periodChange: null } });
  const [started] = useState(Date.now());
  const [tried, setTried] = useState(false);
  const [urgent, setUrgent] = useState(null);
  if (!a) return html`<div class="card"><${Empty} icon="users" title="Athlete not found" /></div>`;
  const set = (k, v) => setF(Object.assign({}, f, { [k]: v }));
  const setRed = (k, v) => set('redFlags', Object.assign({}, f.redFlags, { [k]: v }));
  const setSens = (k, v) => set('sensitive', Object.assign({}, f.sensitive, { [k]: v }));
  const toggleRegion = (r) => set('regions', f.regions.includes(r) ? f.regions.filter((x) => x !== r) : f.regions.concat([r]));

  const missing = [];
  if (f.pain === null) missing.push('pain');
  if (f.pain && !f.regions.length) missing.push('where it hurts');
  if (f.pain && !has(f.painScore)) missing.push('how bad the pain is');
  if (f.fatigue === null) missing.push('tiredness');
  if (f.soreness === null) missing.push('soreness');
  if (!has(f.sleepHours)) missing.push('hours of sleep');
  if (f.ill === null) missing.push('illness');
  if (RED.some(([k]) => typeof f.redFlags[k] !== 'boolean')) missing.push('the three safety questions');

  if (urgent) {
    return html`<div class="urgent-screen" role="alert"><${Icon} name="alert" size=${40} /><h1>Stop. Do not train today.</h1>
      <p>${a.name}, tell your coach now. See a doctor today before you train again.</p>
      <p class="small">If you have chest pain, fainting or trouble breathing right now, call emergency services on 112.</p>
      <div class="row" style="justify-content:center"><button class="btn primary" onClick=${() => go('/checkin')}>I have told my coach</button></div></div>`;
  }

  const save = async () => {
    setTried(true);
    if (missing.length) return;
    const rec = Object.assign({}, f, { id: existing ? existing.id : store.newId('CI'), athleteId: a.id, date: d, enteredOn: 'shared device', secondsToComplete: Math.round((Date.now() - started) / 1000) + (existing ? existing.secondsToComplete || 0 : 0) });
    if (!rec.pain) { rec.regions = []; rec.painScore = ''; rec.painAffectsRunning = false; }
    await store.saveRecord('checkins', rec);
    if (RED.some(([k]) => rec.redFlags[k])) { setUrgent(true); return; }
    toast('Thanks, ' + a.name.split(' ')[0] + '. Check-in saved.'); go('/checkin');
  };

  return html`<div class="head"><div class="athlete-chip"><span class="avatar lg">${initials(a.name)}</span><div><div class="eyebrow">Daily check-in · ${fmtDate(d)}</div><h1>${a.name}</h1><p>${existing ? 'You already checked in today. Changes replace today’s answers.' : 'About today. There are no right answers.'}</p></div></div></div>
  <div class="checkin">
    <div class="card">
      <${Q} label="Any pain or physical problem today?"><${Seg} label="Pain" value=${f.pain} options=${yesNo} onChange=${(v) => set('pain', v)} /></${Q}>
      ${f.pain ? html`
        <${Q} label="Where?" hint="Choose all that apply."><div class="seg">${M.REGIONS.map((r) => html`<button type="button" aria-pressed=${String(f.regions.includes(r))} onClick=${() => toggleRegion(r)}>${r}</button>`)}</div></${Q}>
        <${Q} label="How bad is it, 0 to 10?" hint="0 is no pain, 10 is the worst you can imagine."><${Seg} label="Pain score" value=${f.painScore} options=${Array.from({ length: 11 }, (_, i) => ({ value: i, label: String(i) }))} onChange=${(v) => set('painScore', v)} /></${Q}>
        <${Q} label="Is it changing how you train, run or move?"><${Seg} label="Pain changes movement" value=${f.painAffectsRunning} options=${yesNo} onChange=${(v) => set('painAffectsRunning', v)} /></${Q}>` : null}
    </div>
    <div class="card">
      <${Q} label="How tired do you feel?"><${Seg} label="Fatigue" value=${f.fatigue} options=${FATIGUE} onChange=${(v) => set('fatigue', v)} /></${Q}>
      <${Q} label="How sore are your muscles?"><${Seg} label="Soreness" value=${f.soreness} options=${SORENESS} onChange=${(v) => set('soreness', v)} /></${Q}>
      <div class="fields"><${Field} label="Hours of sleep last night" type="number" unit="h" min=${0} max=${14} step="0.5" value=${f.sleepHours} onInput=${(v) => set('sleepHours', v)} /></div>
      <${Q} label="How well did you sleep?"><${Seg} label="Sleep quality" value=${f.sleepQuality} options=${SLEEPQ} onChange=${(v) => set('sleepQuality', v)} /></${Q}>
      <${Q} label="Feeling ill? Fever, sore throat, cough or stomach upset."><${Seg} label="Illness" value=${f.ill} options=${yesNo} onChange=${(v) => set('ill', v)} /></${Q}>
    </div>
    <div class="card safety">
      <h2><${Icon} name="alert" size=${16} /> Safety questions</h2>
      ${RED.map(([k, label]) => html`<${Q} label=${label}><${Seg} label=${label} value=${f.redFlags[k]} options=${yesNo} onChange=${(v) => setRed(k, v)} /></${Q}>`)}
    </div>
    <details class="card"><summary><b>Private questions</b> <span class="muted small">· optional</span></summary>
      <${Q} label="How is your mood?"><${Seg} label="Mood" value=${f.sensitive.mood} options=${MOOD} onChange=${(v) => setSens('mood', v)} /></${Q}>
      ${a.sex === 'female' ? html`<${Q} label="Any change to your period this month, such as a missed or very different period?"><${Seg} label="Period change" value=${f.sensitive.periodChange} options=${[{ value: false, label: 'No' }, { value: true, label: 'Yes' }, { value: 'skip', label: 'Prefer not to say' }]} onChange=${(v) => setSens('periodChange', v)} /></${Q}>` : null}
    </details>
    ${tried && missing.length ? html`<${Notice} kind="warn">Please answer: ${missing.join(', ')}.</${Notice}>` : null}
    <div class="row"><button class="btn primary lg" onClick=${save}><${Icon} name="check" size=${18} />Save check-in</button><a class="btn ghost" href="#/checkin">Cancel</a></div>
  </div>`;
}

// ---------- training log ----------
export function TrainingLog({ query }) {
  const s = store.getState();
  const [who, setWho] = useState(query.get('athlete') || '');
  const since = new Date(Date.parse(today()) - 27 * 864e5).toISOString().slice(0, 10);
  const rows = s.sessions.filter((x) => x.date >= since && (!who || x.athleteId === who)).sort((a, b) => (a.date + a.createdAt < b.date + b.createdAt ? 1 : -1));
  return html`<div class="head"><div><div class="eyebrow">Monitor</div><h1>Training log</h1><p>What was planned, what was done and how hard it felt. Session load = RPE × minutes.</p></div><a class="btn primary" href="#/training/new"><${Icon} name="plus" size=${16} />Log a session</a></div>
  <div class="card">
    <div class="row"><div class="inp"><select aria-label="Athlete" value=${who} onChange=${(e) => setWho(e.target.value)}><option value="">All athletes</option>${s.athletes.map((a) => html`<option value=${a.id}>${a.name}</option>`)}</select></div><span class="muted small">Last 28 days</span></div>
    ${rows.length ? html`<div class="table-wrap"><table><thead><tr><th>Date</th><th>Athlete</th><th>Session</th><th>Minutes</th><th>km</th><th>RPE</th><th>Load</th><th>Checks</th></tr></thead><tbody>
      ${rows.map((x) => {
        const a = store.getAthlete(x.athleteId);
        const iss = M.sessionIssues(x, s.sessions);
        return html`<tr class="link" onClick=${() => go('/training/' + x.id)}><td class="num">${fmtDate(x.date)}</td><td>${a ? a.name : '—'}</td><td>${x.type}<div class="sub">${[x.surface, x.route].filter(Boolean).join(' · ')}</div></td>
          <td class="num">${has(x.actualMin) ? x.actualMin : '—'}${has(x.plannedMin) && x.plannedMin !== x.actualMin ? html`<div class="sub">planned ${x.plannedMin}</div>` : null}</td><td class="num">${has(x.actualKm) ? x.actualKm : '—'}</td><td class="num">${has(x.rpe) ? x.rpe : '—'}</td><td class="num">${M.sessionLoad(x) ?? '—'}</td>
          <td>${iss.length ? html`<span class="pill calculated" title=${iss.join(' ')}>${iss.length} to check</span>` : html`<span class="muted small">OK</span>`}</td></tr>`;
      })}</tbody></table></div>` : html`<${Empty} icon="chart" title="No sessions in the last 28 days" text="Log a session for one athlete or a whole group."><a class="btn primary" href="#/training/new">Log a session</a></${Empty}>`}
  </div>`;
}

export function SessionForm({ id }) {
  const s = store.getState();
  const existing = id ? s.sessions.find((x) => x.id === id) : null;
  const [f, setF] = useState(() => existing ? JSON.parse(JSON.stringify(existing)) : { date: today(), type: '', plannedMin: '', actualMin: '', plannedKm: '', actualKm: '', surface: '', route: '', footwear: '', warmup: true, prevention: false, notes: '' });
  const [who, setWho] = useState(() => existing ? { [existing.athleteId]: { rpe: existing.rpe, actualMin: '' } } : {});
  const [tried, setTried] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  if (id && !existing) return html`<div class="card"><${Empty} icon="chart" title="Session not found" /></div>`;
  const set = (k) => (v) => setF(Object.assign({}, f, { [k]: v }));
  const ids = Object.keys(who);
  const toggle = (aid) => { const n = Object.assign({}, who); if (n[aid]) delete n[aid]; else n[aid] = { rpe: '', actualMin: '' }; setWho(n); };
  const setRpe = (aid, k, v) => setWho(Object.assign({}, who, { [aid]: Object.assign({}, who[aid], { [k]: v }) }));
  const missing = [];
  if (!f.type) missing.push('session type');
  if (!has(f.actualMin)) missing.push('actual minutes');
  if (!ids.length) missing.push('at least one athlete');
  const save = async () => {
    setTried(true);
    if (missing.length) return;
    for (const aid of ids) {
      const rec = Object.assign({}, f, { id: existing ? existing.id : store.newId('TS'), athleteId: aid, rpe: who[aid].rpe, actualMin: has(who[aid].actualMin) ? who[aid].actualMin : f.actualMin });
      await store.saveRecord('sessions', rec);
    }
    toast(ids.length > 1 ? ids.length + ' sessions logged.' : 'Session saved.');
    go('/training');
  };
  return html`<div class="head"><div><div class="eyebrow">Training log</div><h1>${existing ? 'Edit session' : 'Log a session'}</h1><p>One entry per athlete. For a group session, pick everyone who trained and record each athlete's own RPE.</p></div></div>
  <div class="grid" style="max-width:980px">
    <div class="card"><h2>Session</h2><div class="fields">
      <${Field} label="Date" type="date" value=${f.date} onInput=${set('date')} />
      <${Field} label="Session type" value=${f.type} onInput=${set('type')} options=${[''].concat(M.SESSION_TYPES)} required />
      <${Field} label="Planned duration" type="number" unit="min" min=${1} max=${600} value=${f.plannedMin} onInput=${set('plannedMin')} />
      <${Field} label="Actual duration" type="number" unit="min" min=${1} max=${600} value=${f.actualMin} onInput=${set('actualMin')} required />
      <${Field} label="Planned distance" type="number" unit="km" min=${0} max=${100} value=${f.plannedKm} onInput=${set('plannedKm')} />
      <${Field} label="Actual distance" type="number" unit="km" min=${0} max=${100} value=${f.actualKm} onInput=${set('actualKm')} hint="Leave blank for non-running sessions." />
      <${Field} label="Surface" value=${f.surface} onInput=${set('surface')} options=${['', 'Track', 'Road', 'Grass', 'Trail or cross-country', 'Treadmill', 'Indoor court', 'Turf', 'Gym', 'Pool', 'Other']} />
      <${Field} label="Route or venue name" value=${f.route} onInput=${set('route')} hint="Use the same name each time. Paces are compared only on the same route." />
      <${Field} label="Footwear" value=${f.footwear} onInput=${set('footwear')} options=${['', 'Trainers', 'Spikes', 'Boots or studs', 'Court shoes', 'Barefoot', 'Other']} />
    </div>
    <div class="row"><${Check} label="Standard warm-up done" checked=${f.warmup} onChange=${set('warmup')} /><${Check} label="Injury-prevention programme done" checked=${f.prevention} onChange=${set('prevention')} /></div>
    <${Field} label="Notes" type="textarea" rows=${2} value=${f.notes} onInput=${set('notes')} /></div>
    <div class="card"><h2>Athletes and RPE</h2><p class="muted small">Ask each athlete about 30 minutes after the session: "How hard was your whole session?" on the 0 to 10 scale.</p>
      ${existing ? null : html`<div class="seg" style="margin-bottom:12px">${s.athletes.map((a) => html`<button type="button" aria-pressed=${String(!!who[a.id])} onClick=${() => toggle(a.id)}>${a.name}</button>`)}</div>`}
      ${ids.map((aid) => { const a = store.getAthlete(aid); return html`<div class="rpe-row"><b>${a ? a.name : aid}</b>
        <${Field} label="Session RPE (0 to 10)" value=${who[aid].rpe} onInput=${(v) => setRpe(aid, 'rpe', v === '' ? '' : Number(v))} options=${[{ value: '', label: 'Not asked' }].concat(RPE.map((l, i) => ({ value: i, label: l })))} />
        ${existing ? null : html`<${Field} label="Their minutes, if different" type="number" unit="min" value=${who[aid].actualMin} onInput=${(v) => setRpe(aid, 'actualMin', v)} />`}</div>`; })}
    </div>
    ${tried && missing.length ? html`<${Notice} kind="warn">Still needed: ${missing.join(', ')}.</${Notice}>` : null}
    <div class="row"><button class="btn primary" onClick=${save}>Save</button><a class="btn ghost" href="#/training">Cancel</a>
      ${existing ? (confirmDel ? html`<button class="btn danger" onClick=${async () => { await store.deleteRecord('sessions', existing.id); toast('Session deleted.'); go('/training'); }}>Delete permanently</button>` : html`<button class="btn danger sm" onClick=${() => setConfirmDel(true)}><${Icon} name="trash" size=${14} />Delete</button>`) : null}</div>
  </div>`;
}

// ---------- signals ----------
function SignalCard({ athlete, s }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const l = LEVEL[s.level];
  return html`<div class="signal ${s.level}">
    <div class="signal-head"><span class="ic ${l.cls}"><${Icon} name=${l.icon} size=${16} /></span>
      <div style="flex:1;min-width:0"><div class="row" style="gap:8px"><b>${s.title}</b><${LevelPill} level=${s.level} /></div>
        <div class="small muted"><a href=${'#/athletes/' + athlete.id}>${athlete.name}</a> · ${fmtDate(s.latest)}${s.review ? ' · done before, new answers since' : ''}</div></div></div>
    <p>${s.text.replace(/\d{4}-\d{2}-\d{2}/g, (x) => fmtDate(x))}</p>
    ${s.evidence.length > 1 ? html`<div class="small muted">Dates: ${s.evidence.map(fmtDate).join(', ')}</div>` : null}
    ${s.level === 'no_data' ? null : open ? html`<div class="fields" style="margin-top:10px"><${Field} label="Note (optional)" type="textarea" rows=${2} value=${note} onInput=${setNote} placeholder="For example: easier session on Thursday" /></div>
      <div class="row"><button class="btn primary sm" onClick=${async () => { await saveReview(athlete.id, s, note.trim(), ''); toast('Marked as done.'); }}>Mark as done</button><button class="btn ghost sm" onClick=${() => setOpen(false)}>Cancel</button></div>`
    : html`<div class="row" style="margin-top:8px"><button class="btn sm" onClick=${() => setOpen(true)}>Done</button></div>`}
  </div>`;
}

export function Signals({ query }) {
  const [level, setLevel] = useState(query.get('level') || '');
  const list = squad();
  const open = list.flatMap(({ athlete, result }) => result.signals.filter((s) => s.open).map((s) => ({ athlete, s })));
  const reviewed = list.flatMap(({ athlete, result }) => result.signals.filter((s) => !s.open).map((s) => ({ athlete, s })));
  const count = (lv) => open.filter((x) => x.s.level === lv).length;
  const shown = open.filter((x) => !level || x.s.level === level).sort((a, b) => M.LEVELS.indexOf(a.s.level) - M.LEVELS.indexOf(b.s.level));
  const issues = list.flatMap(({ athlete, result }) => result.issues.map((i) => Object.assign({ athlete }, i)));
  const STATUS_ORDER = ['urgent', 'review', 'watch', 'no_data', 'none'];
  return html`<div class="head"><div><div class="eyebrow">Monitor</div><h1>Signals</h1><p>Who needs attention today, from check-ins and the training log.</p></div></div>
  ${!list.length ? html`<div class="card" style="margin-top:16px"><${Empty} icon="pulse" title="No athletes yet" text="Add athletes, then hand them the device for a daily check-in."><a class="btn primary" href="#/athletes/new">Add athlete</a></${Empty}></div>` : html`
  <div class="grid cols-4 stats compact" style="margin-top:16px">${['urgent', 'review', 'watch', 'no_data'].map((lv) => html`<button class="card stat ${level === lv ? 'sel' : ''}" onClick=${() => setLevel(level === lv ? '' : lv)} aria-pressed=${String(level === lv)}><span class="ic ${LEVEL[lv].cls}"><${Icon} name=${LEVEL[lv].icon} /></span><div><div class="v">${count(lv)}</div><div class="l">${LEVEL[lv].name}</div></div></button>`)}</div>
  <div class="grid cols-3" style="margin-top:16px">
    <div class="card span-2"><div class="card-head"><div><h2>${level ? LEVEL[level].name : 'To do'}</h2><p>Most important first.</p></div>${level ? html`<button class="btn sm ghost" onClick=${() => setLevel('')}>Show all</button>` : null}</div>
      ${shown.length ? shown.map(({ athlete, s }) => html`<${SignalCard} key=${s.key + s.latest} athlete=${athlete} s=${s} />`) : html`<p class="muted small">Nothing to do${level ? ' at this level' : ''}.</p>`}
      ${reviewed.length ? html`<details style="margin-top:12px"><summary>Done (${reviewed.length})</summary>${reviewed.map(({ athlete, s }) => html`<div class="small" style="padding:8px 0;border-bottom:1px solid var(--line)"><b>${athlete.name}</b> · ${s.title} · done by ${s.review.by} on ${fmtDate(s.review.at)}${s.review.note ? html`<div class="muted">${s.review.note}</div>` : null}</div>`)}</details>` : null}
    </div>
    <div class="card"><h2>Squad status</h2>
      <div class="table-wrap"><table><thead><tr><th>Athlete</th><th>Status</th><th>Last check-in</th><th>Load this week</th></tr></thead><tbody>
        ${list.slice().sort((a, b) => STATUS_ORDER.indexOf(a.result.status) - STATUS_ORDER.indexOf(b.result.status)).map(({ athlete, result }) => html`<tr class="link" onClick=${() => go('/athletes/' + athlete.id)}><td>${athlete.name}</td><td><${LevelPill} level=${result.status} /></td><td class="num">${result.lastCheckin ? fmtDate(result.lastCheckin) : '—'}</td><td class="num">${result.load7 || '—'}</td></tr>`)}
      </tbody></table></div>
      ${issues.length ? html`<h3 style="margin-top:16px">Answers to check</h3><ul class="small" style="padding-left:18px;margin:0">${issues.map((i) => html`<li>${i.athlete.name}, ${i.kind.toLowerCase()} ${fmtDate(i.date)}: ${i.text}</li>`)}</ul>` : null}
    </div>
  </div>`}`;
}

// ---------- athlete profile card ----------
export function MonitorCard({ athlete }) {
  const r = evaluateAthlete(athlete);
  const data = store.monitorFor(athlete.id);
  const since = new Date(Date.parse(today()) - 27 * 864e5).toISOString().slice(0, 10);
  const ci = data.checkins.filter((c) => c.date >= since).sort((a, b) => (a.date < b.date ? -1 : 1));
  const byDay = {};
  data.sessions.filter((x) => x.date >= since).forEach((x) => { byDay[x.date] = (byDay[x.date] || 0) + (M.sessionLoad(x) || 0); });
  const open = r.signals.filter((s) => s.open);
  return html`<div class="card" style="margin-top:16px">
    <div class="card-head"><div><h2>Check-ins, last 4 weeks</h2><p>Status <${LevelPill} level=${r.status} /> · last check-in ${r.lastCheckin ? fmtDate(r.lastCheckin) : 'none'} · session load this week ${r.load7 || 0}</p></div>
      <div class="row"><a class="btn sm" href=${'#/training?athlete=' + athlete.id}>Training</a><a class="btn sm primary" href=${'#/checkin/' + athlete.id}>Check in</a></div></div>
    <div class="grid cols-2">
      <div><p class="muted small">Daily session load (RPE × min)</p><${LineChart} series=${[{ name: 'Load', points: Object.entries(byDay).sort().map(([x, y]) => ({ x, y })) }]} height=${160} /></div>
      <div><p class="muted small">Pain (0 to 10) and tiredness (1 to 5)</p><${LineChart} series=${([{ name: 'Pain', points: ci.map((c) => ({ x: c.date, y: c.pain ? Number(c.painScore) || 0 : 0 })) }]).concat([{ name: 'Tiredness', points: ci.filter((c) => has(c.fatigue)).map((c) => ({ x: c.date, y: Number(c.fatigue) })) }])} height=${160} /></div>
    </div>
    ${open.length ? html`<p class="small" style="margin-top:8px">${open.length} thing${open.length > 1 ? 's' : ''} to look at: ${open.map((s) => s.title).join('; ')}. <a href="#/signals">Open Signals</a></p>` : null}
  </div>`;
}
