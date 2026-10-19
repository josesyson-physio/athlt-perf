// The athlete app: Home, Feed, Train (programme, tests, Mirror, progress, library), Chat and Me.
import { html, useState } from '../vendor/preact-htm.js';
import { go, toast, has, downloadFile, buzz } from '../ui.js';
import { XIcon, XSeg, XScale, XField, firstName, initial, ago } from '../xui.js';
import * as store from '../store.js';
import { me, myAthlete, signOut, joinTeam, switchTo, ROLES } from '../session.js';
import { sendReport, myReports, plansFor, resultsFor, planStatus, tickSession, sessionsDone, ladderFor, logLadder } from '../social.js';
import { buildWarmup } from '../warmup.js';
import { growthGuide } from '../growth.js';
import { questionsFor, energyResult } from '../energy.js';
import { STAGES, stageByKey, judgeAttempt, ladderStatus, hopLsi, PAIN_OK, HOP_OK } from '../ladder.js';
import { prosOf, unreadFor } from '../connect.js';
import { Feed, PostPage } from './feed.js';
import { ProProfile, Find, MyPros, ChatList, ChatThread } from './people.js';
import { MirrorBoard, BodyMirror, PainMap, ExerciseRows, Spark } from './parts.js';
import { Logo, Wordmark } from '../logo.js';
import { EXERCISES, AREAS as LIB_AREAS, byKey as exercise, forArea } from '../library.js';
import { today, evaluateAthlete } from '../monitor.js';
import { ReadAloud, TestTool, VoiceSwitch, VoiceRow, SessionCoach } from './tools.js';
import { isLarge, setLargeText } from '../access.js';

const T = globalThis.MotionPlusTests;
const M = globalThis.MotionPlusMonitor;

// ---------- shell ----------
const TABS = [
  { path: '/', label: 'Home', icon: 'home' },
  { path: '/feed', label: 'Feed', icon: 'play' },
  { path: '/train', label: 'Train', icon: 'train' },
  { path: '/chat', label: 'Chat', icon: 'chat' },
  { path: '/me', label: 'Me', icon: 'me' },
];
const TRAIN = ['train', 'tests', 'mirror', 'library', 'plans', 'progress', 'session', 'warmup', 'ladder'];
const ME = ['me', 'find', 'pro', 'growth', 'energy'];

export function AthleteApp({ r }) {
  const [a, b] = r.parts;
  let page;
  if (!a) page = html`<${Today} />`;
  else if (a === 'pulse') page = html`<${Pulse} />`;
  else if (a === 'tests' && !b) page = html`<${Tests} />`;
  else if (a === 'tests') page = html`<${TestRun} key=${b} testKey=${b} />`;
  else if (a === 'mirror') page = html`<${Mirror} />`;
  else if (a === 'train') page = html`<${Train} />`;
  else if (a === 'progress') page = html`<${Progress} />`;
  else if (a === 'feed') page = html`<${Feed} query=${r.query} />`;
  else if (a === 'p') page = html`<${PostPage} id=${b} />`;
  else if (a === 'library' && !b) page = html`<${Library} query=${r.query} />`;
  else if (a === 'library') page = html`<${Exercise} id=${b} />`;
  else if (a === 'me') page = html`<${Me} />`;
  else if (a === 'find') page = html`<${Find} />`;
  else if (a === 'pro') page = html`<${ProProfile} key=${b} id=${b} />`;
  else if (a === 'chat' && !b) page = html`<${ChatList} />`;
  else if (a === 'chat') page = html`<${ChatThread} key=${b} otherId=${b} />`;
  else if (a === 'plans') page = html`<${Plans} />`;
  else if (a === 'session') page = html`<${Session} key=${b} planId=${b} />`;
  else if (a === 'warmup') page = html`<${Warmup} />`;
  else if (a === 'ladder') page = html`<${Ladder} />`;
  else if (a === 'growth') page = html`<${Growth} />`;
  else if (a === 'energy') page = html`<${Energy} />`;
  else page = html`<div class="x-page"><div class="x-card"><h2>Page not found</h2><a href="#/">Go home</a></div></div>`;
  const active = (p) => (p === '/' ? !a || a === 'pulse' : p === '/train' ? TRAIN.includes(a) : p === '/me' ? ME.includes(a) : p === '/feed' ? a === 'feed' || a === 'p' : r.path.startsWith(p));
  const hideTabs = a === 'pulse' || a === 'session' || a === 'warmup' || (a === 'tests' && b) || (a === 'chat' && b);
  const unread = unreadFor(me());
  return html`<div class="x">${page}
    ${hideTabs ? null : html`<nav class="x-tabs" aria-label="Main">${TABS.map((t) => html`<a href=${'#' + t.path} class=${active(t.path) ? 'on' : ''} aria-current=${active(t.path) ? 'page' : null}><${XIcon} name=${t.icon} size=${24} />${t.label}${t.path === '/chat' && unread ? html`<span class="x-dot">${unread}</span>` : null}</a>`)}</nav>`}
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
const fmtVal = (t, v) => (v == null || v === '' ? '–' : v + (['cm', 'm', 's', 'ms'].includes(t.unit) ? ' ' + t.unit : ''));
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
  const team = prosOf(u.id);
  const physio = team.find((p) => p.role === 'physio');
  const physioFlag = ev.signals.find((x) => x.rule === 'pain_physio');
  const ladder = ladderFor(a.id);
  const ls = ladder ? ladderStatus(ladder) : null;
  const n = streak(checkins);
  const date = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  return html`<div class="x-page">
    <div class="sg-lock" style="padding:0 4px"><${Logo} size=${30} /><${Wordmark} size=${22} /></div>
    <div class="x-head"><div><div class="x-over">${date}</div><h1 class="x-title">Hey ${firstName(u.name)}</h1></div><a class="x-avatar" href="#/me" aria-label="Your profile">${initial(u.name)}</a></div>
    ${urgent ? html`<div class="x-urgent" role="alert"><h1>Stop. Don't train today.</h1><p>You reported: ${urgent.title.toLowerCase()}. Tell your coach and see a doctor today. Chest pain or trouble breathing right now: call 112.</p></div>` : null}
    ${physioFlag ? html`<div class="x-card" style="gap:10px;box-shadow:inset 0 0 0 1.5px var(--x-work)"><div class="x-kicker" style="color:var(--x-work-text)">Physio check</div><b style="font-size:17px">${physioFlag.region} pain two days running</b>
      <p class="x-small x-muted">${physio ? physio.name + ' has been sent a flag and can see your pulse. Go easy on this area until you talk.' : 'Pain at 4 or more two days in a row is worth a physio look. Connect with one so they get these flags.'}</p>
      ${physio ? html`<a class="x-btn soft sm" href=${'#/chat/' + physio.id}><${XIcon} name="chat" size=${18} />Message ${firstName(physio.name)}</a>` : html`<a class="x-btn soft sm" href="#/find">Find a physio</a>`}</div>` : null}
    ${ladder ? html`<a class="x-card" href="#/ladder" style="flex-direction:row;align-items:center;gap:14px;color:inherit"><span class="x-badge"><${XIcon} name="run" /></span><div style="flex:1"><b>Back to running</b><div class="x-small x-muted">${ls.done ? 'Ladder done. Well climbed.' : 'Stage ' + (ls.index + 1) + ' of ' + ls.total + ': ' + stageByKey(ls.current).name}</div></div><span class="x-chev"><${XIcon} name="next" size=${18} /></span></a>` : null}
    <div class="x-card"><div style="display:flex;justify-content:space-between;align-items:baseline"><b style="font-size:17px">${n ? n + '-day streak' : 'Start your streak'}</b><span class="x-small x-dim">Best ${Math.max(n, bestStreak(checkins))}</span></div>
      <div class="x-week" aria-label="Check-ins this week">${thisWeek(checkins).map((d) => html`<span>${d.l}<i class=${d.on ? 'on' : d.today ? 'today' : ''}></i></span>`)}</div></div>
    ${done ? html`<a class="x-card" href="#/pulse" style="flex-direction:row;align-items:center;gap:14px;color:inherit"><span class="x-badge"><${XIcon} name="check" /></span><div style="flex:1"><b>Pulse done for today</b><div class="x-small x-muted">${done.pain ? 'Pain: ' + (done.regions || []).join(', ') : 'No pain'} · sleep ${done.sleepHours} h</div></div><span class="x-chev"><${XIcon} name="next" size=${18} /></span></a>`
    : html`<div class="x-card"><div class="x-kicker">Daily pulse</div><h2>How is your body today?</h2><p class="x-muted">Six quick taps. Keeps your streak alive.</p><a class="x-btn" href="#/pulse" style="margin-top:8px">Start · 30 sec</a></div>`}
    ${plan ? html`<${ProgrammeCard} plan=${plan} />` : null}
    <a class="x-card" href="#/mirror" style="flex-direction:row;align-items:center;gap:16px;color:inherit">
      <div style="display:flex;flex-direction:column;gap:5px;width:86px" aria-hidden="true">${(rows.length ? rows.slice().sort((p, q) => ({ work: 0, watch: 1, even: 2 })[p.status] - ({ work: 0, watch: 1, even: 2 })[q.status]).slice(0, 3) : [{}, {}, {}]).map((x) => html`<div style="display:flex;gap:3px;justify-content:center"><span style=${'height:8px;border-radius:4px;width:' + Math.round((x.pctL || 90) * 0.38) + 'px;background:' + (x.weak === 'left' ? statusColor(x.status) : 'var(--x-even)')}></span><span style=${'height:8px;border-radius:4px;width:' + Math.round((x.pctR || 90) * 0.38) + 'px;background:' + (x.weak === 'right' ? statusColor(x.status) : 'var(--x-even)')}></span></div>`)}</div>
      <div style="flex:1"><b style="font-size:17px">Mirror</b><div class="x-small x-muted">${!rows.length ? 'Do a test to see your left and right' : toWork ? toWork + (toWork > 1 ? ' areas' : ' area') + ' to work on' : 'Left and right look even'}</div></div>
      <span class="x-chev"><${XIcon} name="next" size=${18} /></span></a>
    <a class="x-card dark" href=${'#/tests/' + nx.t.key} style="gap:10px;color:#fff">
      <div style="display:flex;justify-content:space-between"><span class="x-kicker">${nx.last ? 'Beat your ghost' : 'Next test'}</span><span class="x-small x-muted">${nx.last ? 'last ' + ago(nx.last.date + 'T12:00:00') : nx.t.equipment.join(', ')}</span></div>
      <b style="font-size:20px;letter-spacing:-.02em">${nx.t.name}</b>
      ${nx.last && g ? html`<div style="display:flex;align-items:baseline;gap:10px"><span class="x-big">${nx.t.sides ? Math.min(Number(nx.last.left), Number(nx.last.right)) : nx.last.value}</span><span class="x-muted">${unitWord(nx.t)} now · ghost ${nx.t.sides ? Math.max(g.left || 0, g.right || 0) : g.value}</span></div>` : html`<span class="x-muted">${nx.t.steps[0]}</span>`}
    </a>
    ${!team.length ? html`<${FindCard} />` : null}
  </div>`;
}
const statusColor = (s) => (s === 'work' ? 'var(--x-work)' : s === 'watch' ? 'var(--x-watch)' : 'var(--x-even)');

function FindCard() {
  return html`<a class="x-card tint" href="#/find" style="flex-direction:row;align-items:center;gap:14px;color:#fff"><span class="x-badge" style="background:rgba(255,255,255,.18);color:#fff"><${XIcon} name="userplus" /></span><div style="flex:1"><b style="font-size:17px">Get a coach or physio</b><div class="x-small" style="opacity:.85">Read their posts, connect, and send them your Mirror.</div></div><span style="opacity:.8"><${XIcon} name="next" size=${18} /></span></a>`;
}

// This week's training from the programme a pro sent: tick off today's session.
function ProgrammeCard({ plan }) {
  const st = planStatus(plan);
  return html`<div class="x-card" style="gap:12px">
    <a href="#/plans" style="display:flex;gap:12px;align-items:center;color:inherit"><span class="x-avatar soft">${initial(plan.coachName)}</span><div style="flex:1;min-width:0"><div class="x-kicker">${st.finished ? 'Programme done' : 'Week ' + st.week + ' of ' + st.weeks}</div><b>Programme from ${plan.coachName}</b></div><span class="x-chev"><${XIcon} name="next" size=${18} /></span></a>
    <div class="x-sessions" aria-label=${st.thisWeek + ' of ' + st.perWeek + ' sessions this week'}>${Array.from({ length: st.perWeek }, (_, i) => html`<i class=${i < st.thisWeek ? 'on' : ''}></i>`)}<span class="x-small x-muted">${st.thisWeek}/${st.perWeek} this week · ${st.done}/${st.total} total</span></div>
    ${!st.today && plan.exercises && plan.exercises.length ? html`<a class="x-btn" href=${'#/session/' + plan.id}><${XIcon} name="speaker" size=${20} />Start with voice coach</a>` : null}
    <button class=${'x-btn' + (st.today || (plan.exercises && plan.exercises.length) ? ' soft' : '')} onClick=${async () => { const on = await tickSession(plan); if (on) buzz([18, 60, 28]); toast(on ? 'Session done. Nice work.' : 'Session unticked.'); }}><${XIcon} name="check" size=${20} />${st.today ? "Today's session done" : "Done today's session"}</button>
  </div>`;
}

function JoinTeam() {
  const [code, setCode] = useState('');
  const [bad, setBad] = useState(false);
  return html`<form class="x-card" onSubmit=${async (e) => { e.preventDefault(); const ok = await joinTeam(code); setBad(!ok); if (ok) toast('You joined the team.'); }}>
    <div class="x-kicker">Have a team code?</div><h2>Join your coach's team</h2><p class="x-muted">A team code from your coach, trainer or physio connects you straight away.</p>
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
    toast('Pulse saved on your phone. Streak kept.');
    go('/');
  };
  const toggle = (r) => set('regions', f.regions.includes(r) ? f.regions.filter((x) => x !== r) : f.regions.concat([r]));
  return html`<div class="x-page plain">
    <div class="x-topbar"><a class="x-link" href="#/">Cancel</a><span class="x-small x-dim" style="font-weight:600">Daily pulse</span></div>
    <h1 class="x-title md">How is your body today?</h1>
    <div class="x-card"><b>Any pain or niggle today?</b><${XSeg} label="Pain" value=${f.pain} options=${yesNo} onChange=${(v) => set('pain', v)} />
      ${f.pain ? html`<b style="margin-top:8px">Where?</b><${PainMap} regions=${M.REGIONS} chosen=${f.regions} onToggle=${toggle} />
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

function testRow(results) {
  return (t) => {
    const last = T.history(results, t.key)[0];
    const j = last ? T.judge(t.key, last) : null;
    return html`<a class="x-row" href=${'#/tests/' + t.key}><span class=${'x-badge ' + (j && j.status !== 'even' ? j.status : '')}><${XIcon} name=${t.sides ? 'mirror' : 'tests'} size=${18} /></span>
      <div class="grow"><b>${t.name}</b><span class="x-small x-muted">${last ? (t.sides ? 'L ' + last.left + ' · R ' + last.right + ' ' + unitWord(t) : fmtVal(t, last.value)) + ' · ' + ago(last.date + 'T12:00:00') : t.equipment.join(', ')}</span></div>
      ${j ? html`<${StatusChip} s=${j.status} />` : last ? null : html`<span class="x-chip tint">New</span>`}<span class="x-chev"><${XIcon} name="next" size=${18} /></span></a>`;
  };
}

function Train() {
  const a = myAthlete();
  if (!a) return html`<${NoAthlete} />`;
  const results = resultsFor(a.id);
  const plan = plansFor(a.id)[0];
  const rows = T.mirror(results).filter((x) => x.tested);
  const work = rows.filter((x) => x.status === 'work').length;
  return html`<div class="x-page">
    <div class="x-head"><div><div class="x-over">Find it, fix it, track it</div><h1 class="x-title">Train</h1></div></div>
    ${plan ? html`<${ProgrammeCard} plan=${plan} />` : null}
    <div class="x-tiles">
      <a class="x-tilebig" href="#/mirror"><span class="x-badge work"><${XIcon} name="mirror" size=${20} /></span><b>Mirror</b><span class="x-small x-muted">${!rows.length ? 'Left vs right' : work ? work + ' to work on' : 'All even'}</span></a>
      <a class="x-tilebig" href="#/progress"><span class="x-badge"><${XIcon} name="up" size=${20} /></span><b>Progress</b><span class="x-small x-muted">${results.length} results</span></a>
      <a class="x-tilebig" href="#/library"><span class="x-badge"><${XIcon} name="library" size=${20} /></span><b>Library</b><span class="x-small x-muted">${EXERCISES.length} exercises</span></a>
      <a class="x-tilebig" href="#/plans"><span class="x-badge"><${XIcon} name="run" size=${20} /></span><b>Programmes</b><span class="x-small x-muted">${plansFor(a.id).length || 'None yet'}</span></a>
      <a class="x-tilebig" href="#/warmup"><span class="x-badge watch"><${XIcon} name="fire" size=${20} /></span><b>Smart warm-up</b><span class="x-small x-muted">${work ? 'Built for your gaps' : '15 minutes'}</span></a>
      ${ladderFor(a.id) ? html`<a class="x-tilebig" href="#/ladder"><span class="x-badge"><${XIcon} name="flag" size=${20} /></span><b>Back to running</b><span class="x-small x-muted">${(() => { const st = ladderStatus(ladderFor(a.id)); return st.done ? 'Done' : 'Stage ' + (st.index + 1) + ' of ' + st.total; })()}</span></a>` : null}
    </div>
    <div class="x-section">Tests · left vs right</div><div class="x-list">${T.TESTS.filter((t) => t.sides).map(testRow(results))}</div>
    <div class="x-section">Tests · fitness</div><div class="x-list">${T.TESTS.filter((t) => !t.sides).map(testRow(results))}</div>
    <p class="x-small x-dim" style="padding:0 4px">Basic equipment only. Do tests on flat, hard ground and retest every 4 weeks.</p>
  </div>`;
}

// Every test over time, oldest to newest, with the best result.
function Progress() {
  const a = myAthlete();
  if (!a) return html`<${NoAthlete} />`;
  const results = resultsFor(a.id);
  const done = T.TESTS.filter((t) => t.key !== 'squeeze').map((t) => ({ t, h: T.history(results, t.key).slice().reverse() })).filter((x) => x.h.length);
  const pt = (t, r) => (t.sides ? Math.min(Number(r.left), Number(r.right)) : Number(r.value));
  return html`<div class="x-page">
    <div class="x-topbar"><a class="x-link" href="#/train"><${XIcon} name="back" size=${20} />Train</a></div>
    <div><div class="x-over">Your results over time</div><h1 class="x-title">Progress</h1></div>
    <p class="x-sub" style="padding:0 4px">For left and right tests the line follows your weaker side, because that is the one to bring up.</p>
    ${!done.length ? html`<div class="x-card"><b>No results yet</b><a class="x-btn soft sm" href="#/train">Do a test</a></div>`
      : html`<div class="x-list">${done.map(({ t, h }) => {
        const vals = h.map((r) => pt(t, r));
        const best = t.lowerBetter ? Math.min(...vals) : Math.max(...vals);
        return html`<a class="x-row" href=${'#/tests/' + t.key}><div class="grow"><b>${t.name}</b><span class="x-small x-muted">${h.length} result${h.length > 1 ? 's' : ''} · now ${fmtVal(t, vals[vals.length - 1])} · best ${fmtVal(t, best)}</span></div><${Spark} points=${vals.map((v) => ({ v }))} lowerBetter=${t.lowerBetter} width=${96} height=${36} /></a>`;
      })}</div>`}
  </div>`;
}

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
  if (!t) return html`<div class="x-page plain"><div class="x-card"><h2>Test not found</h2><a href="#/train">All tests</a></div></div>`;
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
        <span class="sg-saved"><${XIcon} name="check" size=${14} />Saved on phone · works offline</span>
        <p class="x-sub">${beat && beat.length ? (t.sides ? beat.map((s) => s[0].toUpperCase() + s.slice(1)).join(' and ') + ' side' + (beat.length > 1 ? 's' : '') + ' set a new best.' : 'New personal best: ' + fmtVal(t, saved.value) + '.') : g ? 'This is your new ghost to chase next time.' : 'This is your ghost. Beat it next time.'}</p>
      </div>
      ${j ? html`<div class="x-card" style="flex-direction:row;gap:12px;align-items:center"><span class=${'x-badge ' + (j.status === 'even' ? '' : j.status)}><${XIcon} name=${j.status === 'even' ? 'check' : 'alert'} size=${18} /></span><div style="flex:1"><b>${STATUS_WORD[j.status]}</b><div class="x-small x-muted">${j.text}</div></div></div>` : null}
      <a class="x-btn" href="#/mirror">See your Mirror</a><a class="x-btn ghost" href="#/train">Back to Train</a>
    </div>`;
  }
  return html`<div class="x-page plain">
    <div class="x-topbar"><a class="x-link" href="#/train">Cancel</a><span class="x-small x-dim" style="font-weight:600">${t.equipment.join(' · ')}</span></div>
    <h1 class="x-title md">${t.name}</h1>
    <ol style="margin:0;padding-left:20px;color:var(--x-muted);display:grid;gap:6px">${t.steps.map((s) => html`<li>${s}</li>`)}</ol>
    <div class="x-chips"><${ReadAloud} text=${t.name + '. You need: ' + t.equipment.join(', ') + '. ' + t.steps.join(' ')} /><${VoiceSwitch} /></div>
    ${t.phone ? html`<div class="x-note">Phone-measured. Screens add a small delay of their own, so compare only with your own results on this phone.</div>` : null}
    ${t.sides ? html`<${XSeg} label="Side" value=${side} onChange=${setSide} options=${[{ value: 'left', label: 'Left' + (has(e.left) ? ' · ' + e.left : '') }, { value: 'right', label: 'Right' + (has(e.right) ? ' · ' + e.right : '') }]} />` : null}
    <${TestTool} t=${t} side=${side} onResult=${(v) => setE((cur) => Object.assign({}, cur, { [k]: String(v) }))} />
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
  const team = prosOf(u.id);
  const send = async () => { setSending(true); try { await sendReport(note); setNote(''); toast('Sent to your coach.'); } catch (e) { toast(e.message); } setSending(false); };
  return html`<div class="x-page">
    <div class="x-topbar x-noprint"><a class="x-link" href="#/train"><${XIcon} name="back" size=${20} />Train</a></div>
    <div class="x-head"><div><div class="x-over">Left and right, head to toe</div><h1 class="x-title">Mirror</h1></div><button class="x-link x-noprint" onClick=${() => window.print()}><${XIcon} name="print" size=${20} />PDF</button></div>
    <p class="x-sub" style="padding:0 4px">A glow shows where one side is weaker. That's where you're losing power.</p>
    <${BodyMirror} rows=${rows} groin=${sj ? sj.status : null} />
    ${rows.some((x) => x.tested && x.status !== 'even') ? html`<a class="x-btn soft x-noprint" href="#/warmup"><${XIcon} name="fire" size=${20} />Warm up for these gaps</a>` : null}
    <div class="x-section">The numbers</div>
    <${MirrorBoard} rows=${rows} />
    ${flagged.length || (sj && sj.status === 'work') ? html`<div class="x-list">${flagged.map((x) => html`<a class="x-row" href=${'#/library?area=' + x.area}><span class=${'x-badge ' + x.status}><${XIcon} name="down" size=${16} /></span><div class="grow"><b>${x.text}</b><span class="x-small x-muted">${T.byKey(x.test).name} · ${ago(x.date + 'T12:00:00')} · exercises</span></div><span class="x-chev"><${XIcon} name="next" size=${18} /></span></a>`)}
      ${sj && sj.status === 'work' ? html`<a class="x-row" href="#/library?area=groin"><span class="x-badge work"><${XIcon} name="alert" size=${16} /></span><div class="grow"><b>${sj.text}</b><span class="x-small x-muted">Groin squeeze · show your physio</span></div><span class="x-chev"><${XIcon} name="next" size=${18} /></span></a>` : null}</div>` : null}
    ${strengths.length ? html`<div class="x-card" style="flex-direction:row;gap:12px;align-items:center"><span class="x-badge"><${XIcon} name="up" size=${16} /></span><div style="flex:1"><b>Your strengths</b><div class="x-small x-muted">${strengths.join(' · ')}</div></div></div>` : null}
    ${!rows.some((x) => x.tested) ? html`<a class="x-btn" href="#/train">Do your first test</a>`
      : team.length ? html`<div class="x-card x-noprint" style="gap:12px"><div class="x-kicker">Your team</div><h2>Send your Mirror</h2>
        <p class="x-muted">${team.map((c) => c.name + ' (' + ROLES[c.role] + ')').join(', ')} will see your tests and last 7 days, and can send you a programme.</p>
        <${XField} label="Anything to add? (optional)" type="textarea" rows=${2} value=${note} onInput=${setNote} placeholder="For example: my left calf feels tight after spikes" />
        <button class="x-btn" disabled=${sending} onClick=${send}><${XIcon} name="share" size=${20} />Send to my coach</button>
        ${reports.length ? html`<p class="x-small x-dim">Last sent ${ago(reports[0].createdAt)} · ${reports[0].status === 'answered' ? 'programme received' : 'waiting for a programme'}</p>` : null}</div>`
      : html`<${FindCard} />`}
  </div>`;
}

// ---------- library ----------
export function Library({ query }) {
  const [q, setQ] = useState('');
  const [area, setArea] = useState(query.get('area') || '');
  const list = EXERCISES.filter((x) => (!area || x.area === area) && (!q || (x.name + ' ' + x.equipment).toLowerCase().includes(q.toLowerCase())));
  return html`<div class="x-page">
    <div class="x-topbar"><a class="x-link" href="#/train"><${XIcon} name="back" size=${20} />Train</a></div>
    <div class="x-head"><div><div class="x-over">Basic equipment</div><h1 class="x-title">Library</h1></div></div>
    <label class="x-field"><span class="x-noprint" style="position:absolute;left:-9999px">Search exercises</span><input class="x-input" style="background:#fff" type="search" placeholder="Search exercises" value=${q} onInput=${(e) => setQ(e.target.value)} /></label>
    <div class="x-chips"><button type="button" class=${'x-chip' + (!area ? ' tint' : '')} style="border:0;min-height:48px" aria-pressed=${String(!area)} onClick=${() => setArea('')}>All</button>${Object.entries(LIB_AREAS).map(([k, v]) => html`<button type="button" class=${'x-chip' + (area === k ? ' tint' : '')} style="border:0;min-height:48px" aria-pressed=${String(area === k)} onClick=${() => setArea(k)}>${v}</button>`)}</div>
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
    <${ReadAloud} text=${x.name + '. ' + x.dose + '. ' + x.steps.join(' ')} />
    <div class="x-list">${x.steps.map((s, i) => html`<div class="x-row"><span class="x-avatar soft" style="width:32px;height:32px;font-size:14px">${i + 1}</span><div class="grow">${s}</div></div>`)}</div>
    ${forArea(x.area).filter((y) => y.key !== x.key).length ? html`<div class="x-section">More for ${LIB_AREAS[x.area].toLowerCase()}</div><div class="x-list">${forArea(x.area).filter((y) => y.key !== x.key).map((y) => html`<a class="x-row" href=${'#/library/' + y.key}><div class="grow"><b>${y.name}</b><span class="x-small x-muted">${y.dose}</span></div><span class="x-chev"><${XIcon} name="next" size=${18} /></span></a>`)}</div>` : null}
  </div>`;
}

// Voice-coached session from a programme.
function Session({ planId }) {
  const a = myAthlete();
  const plan = a ? plansFor(a.id).find((p) => p.id === planId) : null;
  if (!plan) return html`<div class="x-page plain"><div class="x-card"><h2>Programme not found</h2><a href="#/plans">Your programmes</a></div></div>`;
  const items = (plan.exercises || []).map((k) => exercise(k)).filter(Boolean);
  return html`<${SessionCoach} items=${items} title=${'Programme from ' + plan.coachName} backHref="#/plans" onFinish=${async () => { if (!planStatus(plan).today) await tickSession(plan); }} />`;
}

// Smart warm-up from the Mirror, run with the voice coach.
function Warmup() {
  const a = myAthlete();
  if (!a) return html`<${NoAthlete} />`;
  const w = buildWarmup(T.mirror(resultsFor(a.id)));
  return html`<${SessionCoach} items=${w.items} backHref="#/train" doneText="Warm-up done. You're ready to train." intro=${'About ' + w.minutes + ' minutes. ' + (w.targeted.length ? 'Extra drills for: ' + w.targeted.join(', ') + '. ' : '') + 'Warm-ups like this cut injuries by about a third in team-sport studies (FIFA 11+).'}
    title=${'Smart warm-up' + (w.targeted.length ? ' · ' + w.targeted.join(', ') : '')} onFinish=${async () => {}} />`;
}

// Return-to-run ladder set by the physio: unlock the next stage when the pass rule is met.
function Ladder() {
  const a = myAthlete();
  const [f, setF] = useState({ painDuring: null, painMorning: null, limp: null });
  const [res, setRes] = useState(null);
  if (!a) return html`<${NoAthlete} />`;
  const lad = ladderFor(a.id);
  if (!lad) return html`<div class="x-page"><div class="x-topbar"><a class="x-link" href="#/train"><${XIcon} name="back" size=${20} />Train</a></div><h1 class="x-title">Back to running</h1><div class="x-card"><p class="x-muted">Your physio sets a return-to-run ladder after an injury. It shows up here.</p></div></div>`;
  const st = ladderStatus(lad);
  const stage = stageByKey(st.current);
  const lsi = hopLsi(resultsFor(a.id), today());
  const scale = (k, label) => html`<b>${label}</b><div class="x-scale eleven" role="group" aria-label=${label}>${Array.from({ length: 11 }, (_, i) => html`<button type="button" aria-pressed=${String(f[k] === i)} onClick=${() => setF(Object.assign({}, f, { [k]: i }))}><b>${i}</b></button>`)}</div>`;
  const submit = async () => {
    const j = judgeAttempt(stage, { painDuring: f.painDuring, painMorning: f.painMorning, limp: !!f.limp }, lsi);
    if (f.painDuring == null || f.painMorning == null || f.limp == null) { setRes({ pass: false, reasons: ['Answer all three questions.'], unsaved: true }); return; }
    await logLadder(lad, { stage: stage.key, painDuring: f.painDuring, painMorning: f.painMorning, limp: f.limp, hopLsi: lsi, pass: j.pass });
    setRes(j); setF({ painDuring: null, painMorning: null, limp: null });
    if (j.pass) { buzz([18, 60, 28, 60, 40]); toast('Stage passed. Next one unlocked.'); }
  };
  return html`<div class="x-page">
    <div class="x-topbar"><a class="x-link" href="#/train"><${XIcon} name="back" size=${20} />Train</a></div>
    <div><div class="x-over">Set by ${lad.proName}</div><h1 class="x-title">Back to running</h1></div>
    ${lad.note ? html`<div class="x-note">“${lad.note}”</div>` : null}
    <ol class="sg-ladder">${lad.stages.map((k, i) => { const s = stageByKey(k); const state = i < st.index ? 'done' : i === st.index ? 'now' : 'locked'; return html`<li class=${state}><span class="sg-rung">${state === 'done' ? html`<${XIcon} name="check" size=${16} />` : i + 1}</span><div><b>${s.name}</b><span class="x-small x-muted">${s.dose}${s.hop ? ' · hop test 90%+' : ''}</span></div>${state === 'locked' ? html`<span class="x-small x-dim">Locked</span>` : null}</li>`; })}</ol>
    ${res ? html`<div class=${res.pass ? 'x-note' : 'x-err'} role="status">${res.pass ? 'Passed. ' + (st.done ? 'That was the last stage. Talk to your physio about full training.' : 'Next stage unlocked.') : (res.unsaved ? '' : 'Stay on this stage for now. ') + res.reasons.join(' ')}</div>` : null}
    ${st.done ? html`<div class="x-card"><h2>Ladder complete</h2><p class="x-muted">Every stage passed. Keep doing your Mirror tests to stay even.</p></div>`
      : html`<div class="x-card" style="gap:12px"><div class="x-kicker">Log stage ${st.index + 1}: ${stage.name}</div>
        <p class="x-small x-muted">Do the stage, then fill this in the next morning. It passes with pain ${PAIN_OK}/10 or less${stage.hop ? ' and a hop test where the weaker leg reaches ' + HOP_OK + '% or more' : ''}.</p>
        ${stage.hop ? html`<div class="x-chips"><span class=${'x-chip ' + (lsi == null ? '' : lsi >= HOP_OK ? 'tint' : 'work')}>${lsi == null ? 'No hop test in 14 days' : 'Hop: weaker leg ' + lsi + '%'}</span><a class="x-chip tint" href="#/tests/hop">Do the hop test</a></div>` : null}
        ${scale('painDuring', 'Highest pain during, 0 to 10')}
        ${scale('painMorning', 'Pain this morning, 0 to 10')}
        <b>Any limping or swelling?</b><${XSeg} label="Limping or swelling" value=${f.limp} options=${yesNo} onChange=${(v) => setF(Object.assign({}, f, { limp: v }))} />
        <button class="x-btn" onClick=${submit}>Check this stage</button></div>`}
    ${lad.log && lad.log.length ? html`<div class="x-section">Your log</div><div class="x-list">${lad.log.slice().reverse().map((x) => html`<div class="x-row"><span class=${'x-badge ' + (x.pass ? '' : 'work')}><${XIcon} name=${x.pass ? 'check' : 'alert'} size=${16} /></span><div class="grow"><b>${stageByKey(x.stage).name}</b><span class="x-small x-muted">${x.date} · pain ${x.painDuring} then ${x.painMorning}${x.limp ? ' · limp or swelling' : ''}</span></div></div>`)}</div>` : null}
  </div>`;
}

// Growth-spurt guard: under-18s see a likely range for their fastest growth and what it means for load.
function Growth() {
  const a = myAthlete();
  const [f, setF] = useState(() => { try { return JSON.parse(localStorage.getItem('sg-growth-' + (a && a.id)) || 'null') || {}; } catch (e) { return {}; } });
  const [out, setOut] = useState(null);
  if (!a) return html`<${NoAthlete} />`;
  const set = (k) => (v) => setF(Object.assign({}, f, { [k]: v }));
  const run = () => {
    const born = f.born ? Date.parse(f.born + '-15') : NaN;
    const age = isFinite(born) ? (Date.now() - born) / (365.25 * 864e5) : NaN;
    const g = growthGuide({ sex: a.sex, age, heightCm: f.h, sittingCm: f.sh, weightKg: f.w });
    setOut(g);
    if (!g.errors) { try { localStorage.setItem('sg-growth-' + a.id, JSON.stringify(f)); } catch (e) { /* private mode */ } }
  };
  return html`<div class="x-page">
    <div class="x-topbar"><a class="x-link" href="#/me"><${XIcon} name="back" size=${20} />Me</a><span class="sg-saved"><${XIcon} name="check" size=${14} />Saved on phone</span></div>
    <div><div class="x-over">For ages 8 to 17</div><h1 class="x-title">Growth-spurt guard</h1></div>
    <p class="x-sub" style="padding:0 4px">During the fastest growth, bones and tendons are easier to hurt. This estimates when yours is, so training can go lighter at the right time.</p>
    <div class="x-card" style="gap:12px">
      <${XField} label="Month you were born" type="month" value=${f.born || ''} onInput=${set('born')} />
      <${XField} label="Height, cm (no shoes)" type="number" inputmode="decimal" value=${f.h || ''} onInput=${set('h')} />
      <${XField} label="Sitting height, cm (seat to top of head)" type="number" inputmode="decimal" value=${f.sh || ''} onInput=${set('sh')} />
      <${XField} label="Weight, kg" type="number" inputmode="decimal" value=${f.w || ''} onInput=${set('w')} />
      <${ReadAloud} label="How to measure" text="Height: stand tall against a wall with no shoes, heels together. Sitting height: sit on a flat chair against the wall, sit tall, and measure from the seat to the top of your head." />
      <button class="x-btn" onClick=${run}>Check my growth</button>
    </div>
    ${out && out.errors ? html`<div class="x-err" role="alert">${out.errors.join(' ')}</div>` : null}
    ${out && !out.errors ? html`<div class=${'x-card' + (out.phase === 'now' ? '' : '')} style=${out.phase === 'now' ? 'box-shadow:inset 0 0 0 1.5px var(--x-watch)' : ''}>
      <div class="x-kicker" style=${out.phase === 'now' ? 'color:var(--x-watch-text)' : ''}>${out.phase === 'now' ? 'Growth spurt likely now' : out.phase === 'before' ? 'Growth spurt likely ahead' : 'Growth spurt likely passed'}</div>
      <h2>Fastest growth: about age ${out.from} to ${out.to}</h2>
      <p class="x-muted">${out.text}</p>
      <p class="x-small x-dim">Estimated with the Mirwald equation (2002). It can be a year or more out, more so for early or late developers. Remeasure every 3 months.</p>
      <${ReadAloud} text=${out.text} />
    </div>` : null}
  </div>`;
}

// Private energy check. Answers stay on this phone and are not sent to anyone.
function Energy() {
  const a = myAthlete();
  const [ans, setAns] = useState({});
  const [out, setOut] = useState(null);
  if (!a) return html`<${NoAthlete} />`;
  const age = a.dob ? Math.floor((Date.now() - Date.parse(a.dob)) / (365.25 * 864e5)) : 18;
  const qs = questionsFor(a.sex, age);
  const check = () => { const r = energyResult(ans, a.sex, age); setOut(r || { missing: true }); };
  return html`<div class="x-page">
    <div class="x-topbar"><a class="x-link" href="#/me"><${XIcon} name="back" size=${20} />Me</a><span class="sg-saved"><${XIcon} name="check" size=${14} />Private</span></div>
    <div><div class="x-over">Only you see this</div><h1 class="x-title">Energy check</h1></div>
    <p class="x-sub" style="padding:0 4px">When training uses more energy than your body gets, health and performance drop. These are the common warning signs. Your answers are not saved or sent.</p>
    ${qs.map((q) => html`<div class="x-card"><b>${q.text}</b><${XSeg} label=${q.text} value=${ans[q.key]} options=${yesNo} onChange=${(v) => setAns(Object.assign({}, ans, { [q.key]: v }))} /></div>`)}
    <button class="x-btn" onClick=${check}>See my result</button>
    ${out && out.missing ? html`<div class="x-err" role="alert">Answer every question first.</div>` : null}
    ${out && !out.missing ? html`<div class="x-card" style=${out.level === 'talk' ? 'box-shadow:inset 0 0 0 1.5px var(--x-work)' : ''}><div class="x-kicker">${out.level === 'talk' ? 'Talk to your physio' : out.level === 'watch' ? 'Keep an eye on it' : 'No warning signs'}</div><p>${out.text}</p>
      <p class="x-small x-dim">Based on the warning signs in the IOC statement on low energy in sport (2023) and the LEAF-Q and LEAM-Q questionnaires.</p>
      ${out.level === 'talk' ? html`<a class="x-btn soft sm" href="#/chat">Message your physio</a>` : null}</div>` : null}
  </div>`;
}

// ---------- plans and profile ----------
function Plans() {
  const a = myAthlete();
  const plans = a ? plansFor(a.id) : [];
  return html`<div class="x-page">
    <div class="x-topbar"><a class="x-link" href="#/train"><${XIcon} name="back" size=${20} />Train</a></div>
    <h1 class="x-title">Your programmes</h1>
    ${!plans.length ? html`<div class="x-card"><b>No programme yet</b><p class="x-muted x-small">Send your Mirror to your coach or physio. Their programme shows up here.</p><a class="x-btn soft sm" href="#/mirror">Open your Mirror</a></div>`
      : plans.map((p, i) => {
        const st = planStatus(p);
        const log = sessionsDone(p);
        return html`<div class="x-card" style="gap:12px"><div style="display:flex;gap:10px;align-items:center"><a class="x-avatar soft" href=${'#/pro/' + p.coachId}>${initial(p.coachName)}</a><div style="flex:1"><b>${p.coachName}</b><div class="x-small x-muted">${ROLES[p.coachRole] || 'Coach'} · ${ago(p.createdAt)}</div></div><a class="x-btn soft sm" href=${'#/chat/' + p.coachId} aria-label="Ask a doubt"><${XIcon} name="chat" size=${18} /></a></div>
          <div class="x-chips"><span class="x-chip tint">${st.weeks} weeks</span><span class="x-chip">${st.perWeek} sessions a week</span><span class="x-chip">${st.done}/${st.total} done</span></div>
          <p style="white-space:pre-line">${p.text}</p>
          <${ExerciseRows} keys=${p.exercises} bg="var(--x-bg)" />
          ${i === 0 ? html`<div class="x-weeks" aria-label="Programme weeks">${Array.from({ length: st.weeks }, (_, w) => { const n = log.filter((x) => Math.floor((Date.parse(x.date) - Date.parse(p.createdAt.slice(0, 10))) / (7 * 864e5)) === w).length; return html`<div class=${w + 1 === st.week ? 'now' : ''}><span>W${w + 1}</span><b>${n}/${st.perWeek}</b></div>`; })}</div>` : null}
        </div>`;
      })}
  </div>`;
}

function Me() {
  const u = me();
  const a = myAthlete();
  const others = store.getState().users.filter((x) => x.id !== u.id);
  const [large, setLargeState] = useState(isLarge());
  const setLarge = (on) => { setLargeText(on); setLargeState(on); };
  return html`<div class="x-page">
    <div style="display:flex;gap:14px;align-items:center;padding:12px 4px 0"><span class="x-avatar" style="width:64px;height:64px;font-size:26px">${initial(u.name)}</span><div><h1 class="x-title md">${u.name}</h1><p class="x-muted">${a ? [a.position || 'Athletics', a.dob ? a.dob.slice(0, 4) : ''].filter(Boolean).join(' · ') : ''}</p></div></div>
    <div class="x-section">Your coaches and physios</div>
    <${MyPros} />
    <div class="x-section">Health checks</div>
    <div class="x-list">
      <a class="x-row" href="#/growth"><span class="x-badge"><${XIcon} name="up" size=${18} /></span><div class="grow"><b>Growth-spurt guard</b><span class="x-small x-muted">Under 18: when is your fastest growth?</span></div><span class="x-chev"><${XIcon} name="next" size=${18} /></span></a>
      <a class="x-row" href="#/energy"><span class="x-badge"><${XIcon} name="strong" size=${18} /></span><div class="grow"><b>Private energy check</b><span class="x-small x-muted">Warning signs of low energy. Stays on your phone.</span></div><span class="x-chev"><${XIcon} name="next" size=${18} /></span></a>
    </div>
    <div class="x-section">Settings</div>
    <div class="x-list">
      <button class="x-row" type="button" aria-pressed=${String(large)} onClick=${() => setLarge(!large)}><span class="x-badge"><span style="font-weight:800">Aa</span></span><div class="grow"><b>Large text</b><span class="x-small x-muted">${large ? 'On: bigger text and buttons' : 'Off'}</span></div><span class=${'sg-switch' + (large ? ' on' : '')} aria-hidden="true"><i></i></span></button>
      <${VoiceRow} />
    </div>
    <div class="x-list">
      <a class="x-row" href="#/plans"><div class="grow"><b>Your programmes</b></div><span class="x-chev"><${XIcon} name="next" size=${18} /></span></a>
      <a class="x-row" href="#/feed?show=saved"><div class="grow"><b>Saved posts</b></div><span class="x-chev"><${XIcon} name="next" size=${18} /></span></a>
      <button class="x-row" type="button" onClick=${() => downloadFile('motionplus-' + today() + '.json', JSON.stringify(store.exportData(), null, 1))}><div class="grow"><b>Download a backup</b><span class="x-small x-muted">Your records stay on this phone. Keep a copy.</span></div></button>
    </div>
    ${!u.teamCode ? html`<${JoinTeam} />` : null}
    ${others.length ? html`<div class="x-section">Other accounts on this phone</div><div class="x-list">${others.map((o) => html`<button class="x-row" type="button" onClick=${() => { switchTo(o.id); go('/'); }}><span class="x-avatar soft">${initial(o.name)}</span><div class="grow"><b>${o.name}</b><span class="x-small x-muted">${ROLES[o.role]}</span></div><span class="x-chev"><${XIcon} name="swap" size=${18} /></span></button>`)}</div>` : null}
    <button class="x-btn ghost" onClick=${() => { signOut(); go('/welcome'); }}>Sign out</button>
  </div>`;
}
