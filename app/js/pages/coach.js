// The pro app (coaches, trainers and physios): reports inbox and programmes, connected athletes
// and approvals, posting stories, slides, videos and insights, chat, and the assessment tools.
import { html, useState } from '../vendor/preact-htm.js';
import { go, toast } from '../ui.js';
import { XIcon, XSeg, XField, initial, ago, firstName } from '../xui.js';
import * as store from '../store.js';
import { me, signOut, switchTo, ROLES } from '../session.js';
import { inbox, sendPlan, plansFor, createPost, deletePost, postsBy, POST_TYPES, THEMES, MAX_FILE, MAX_VIDEO, planStatus, ladderFor, startLadder } from '../social.js';
import { STAGES, stageByKey, ladderStatus } from '../ladder.js';
import { athletesOf, teamFor, unreadFor, prosOf } from '../connect.js';
import { EXERCISES, AREAS as LIB_AREAS, byKey as exercise } from '../library.js';
import { evaluateAthlete, LEVEL } from '../monitor.js';
import { Library, Exercise } from './athlete.js';
import { Feed, PostPage, PostCard, Comic, Deck, SCENES } from './feed.js';
import { ProProfile, EditProfile, Requests, ChatList, ChatThread } from './people.js';
import { MirrorBoard } from './parts.js';
import { Logo, Wordmark } from '../logo.js';

const T = globalThis.MotionPlusTests;

const TABS = [
  { path: '/', label: 'Inbox', icon: 'inbox' },
  { path: '/roster', label: 'Athletes', icon: 'team' },
  { path: '/post', label: 'Post', icon: 'post' },
  { path: '/chat', label: 'Chat', icon: 'chat' },
  { path: '/me', label: 'Me', icon: 'me' },
];
export const COACH_PATHS = ['', 'inbox', 'post', 'roster', 'chat', 'me', 'pro', 'p', 'feed', 'library', 'team', 'tools'];

export function CoachApp({ r }) {
  const [a, b] = r.parts;
  let page;
  if (!a) page = html`<${Inbox} />`;
  else if (a === 'inbox') page = html`<${ReportView} key=${b} id=${b} />`;
  else if (a === 'post') page = html`<${Post} />`;
  else if (a === 'roster' || a === 'team') page = html`<${Athletes} />`;
  else if (a === 'chat' && !b) page = html`<${ChatList} />`;
  else if (a === 'chat') page = html`<${ChatThread} key=${b} otherId=${b} />`;
  else if (a === 'me' && b === 'edit') page = html`<${EditProfile} />`;
  else if (a === 'pro') page = html`<${ProProfile} key=${b} id=${b} />`;
  else if (a === 'p') page = html`<${PostPage} id=${b} />`;
  else if (a === 'feed') page = html`<${Feed} query=${r.query} />`;
  else if (a === 'library' && !b) page = html`<${Library} query=${r.query} />`;
  else if (a === 'library') page = html`<${Exercise} id=${b} />`;
  else page = html`<${Me} />`;
  const active = (p) => (p === '/' ? !a || a === 'inbox' : p === '/me' ? ['me', 'tools', 'pro', 'p', 'feed', 'library'].includes(a) : p === '/roster' ? a === 'roster' || a === 'team' : r.path.startsWith(p));
  const hide = a === 'chat' && b;
  const unread = unreadFor(me());
  return html`<div class="x">${page}
    ${hide ? null : html`<nav class="x-tabs" aria-label="Main">${TABS.map((t) => html`<a href=${'#' + t.path} class=${active(t.path) ? 'on' : ''} aria-current=${active(t.path) ? 'page' : null}><${XIcon} name=${t.icon} size=${24} />${t.label}${t.path === '/chat' && unread ? html`<span class="x-dot">${unread}</span>` : null}</a>`)}</nav>`}
  </div>`;
}

// ---------- inbox ----------
function Inbox() {
  const u = me();
  const list = inbox(u);
  const fresh = list.filter((x) => x.status === 'new');
  const flags = (rep) => rep.mirror.filter((x) => x.tested && x.status !== 'even');
  return html`<div class="x-page">
    <div class="sg-lock" style="padding:0 4px"><${Logo} size=${30} /><${Wordmark} size=${22} /></div>
    <div class="x-head"><div><div class="x-over">${ROLES[u.role]}${u.speciality ? ' · ' + u.speciality : ''}</div><h1 class="x-title">Inbox</h1></div><a class="x-avatar" href="#/me" aria-label="Your account">${initial(u.name)}</a></div>
    <p class="x-sub" style="padding:0 4px">${fresh.length ? fresh.length + ' new report' + (fresh.length > 1 ? 's' : '') + ' waiting for a programme.' : 'All caught up.'}</p>
    <${Requests} />
    <${PhysioChecks} u=${u} />
    ${!list.length ? html`<div class="x-card" style="align-items:center;text-align:center;padding:36px 18px"><span class="x-badge"><${XIcon} name="inbox" /></span><b>No reports yet</b><p class="x-muted x-small">Athletes connect with you from your profile and posts, or with your team code <b>${u.teamCode}</b>. Their Mirror lands here.</p><a class="x-btn soft sm" href="#/roster">Your athletes</a></div>`
      : html`<div class="x-section">Reports</div><div class="x-list">${list.map((rep) => html`<a class="x-row" href=${'#/inbox/' + rep.id}><span class="x-avatar soft">${initial(rep.athleteName)}</span>
        <div class="grow"><b>${rep.athleteName}</b><span class="x-small x-muted">${flags(rep).length ? flags(rep).map((x) => x.name).join(', ') + ' to look at' : 'All even'}${rep.pulse.painDays ? ' · pain ' + rep.pulse.painDays + ' of 7 days' : ''}</span></div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px"><span class="x-small x-dim">${ago(rep.createdAt)}</span>${rep.status === 'new' ? html`<span class="x-chip tint">New</span>` : html`<span class="x-chip">Programme sent</span>`}</div></a>`)}</div>`}
  </div>`;
}

// Athletes with pain 4/10 or more in one area two days running. Goes to their physio, or to the
// coach when the athlete has no physio yet.
function PhysioChecks({ u }) {
  const rows = athletesOf(u.id).map((au) => {
    const ath = au.athleteId ? store.getAthlete(au.athleteId) : null;
    if (!ath) return null;
    const hasPhysio = prosOf(au.id).some((p) => p.role === 'physio');
    if (u.role !== 'physio' && hasPhysio) return null;
    const sig = evaluateAthlete(ath).signals.find((x) => x.rule === 'pain_physio');
    return sig ? { au, sig } : null;
  }).filter(Boolean);
  if (!rows.length) return null;
  return html`<div class="x-section" style="color:var(--x-work-text)">Physio checks</div><div class="x-list">${rows.map(({ au, sig }) => html`<a class="x-row" href=${'#/chat/' + au.id}><span class="x-badge work"><${XIcon} name="alert" size=${16} /></span><div class="grow"><b>${au.name}: ${sig.region.toLowerCase()}</b><span class="x-small x-muted">${sig.text}</span></div><span class="x-chev"><${XIcon} name="chat" size=${18} /></span></a>`)}</div>`;
}

// Physio sets a return-to-run ladder; the athlete unlocks each stage by meeting the pass rule.
function LadderCard({ rep }) {
  const lad = ladderFor(rep.athleteId);
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState(STAGES.map((s) => s.key));
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const start = async () => { try { await startLadder(rep.athleteId, rep.userId, STAGES.map((s) => s.key).filter((k) => pick.includes(k)), note); setOpen(false); setErr(''); toast('Ladder sent to ' + rep.athleteName + '.'); } catch (e) { setErr(e.message); } };
  const st = lad ? ladderStatus(lad) : null;
  return html`<div class="x-card" style="gap:12px"><div class="x-kicker">Return-to-run ladder</div>
    ${lad ? html`<b>${st.done ? 'All stages passed' : 'On stage ' + (st.index + 1) + ' of ' + st.total + ': ' + stageByKey(st.current).name}</b>
      <div class="x-sessions">${lad.stages.map((k, i) => html`<i class=${i < st.index ? 'on' : ''} title=${stageByKey(k).name}></i>`)}</div>
      ${(lad.log || []).slice(-3).reverse().map((x) => html`<div class="x-small x-muted">${x.date} · ${stageByKey(x.stage).name}: ${x.pass ? 'passed' : 'not yet'} · pain ${x.painDuring} then ${x.painMorning}${x.limp ? ', limp or swelling' : ''}${x.hopLsi != null ? ' · hop ' + x.hopLsi + '%' : ''}</div>`)}` : html`<p class="x-small x-muted">After an injury, give a clear way back. Each stage unlocks only with pain 2/10 or less during and the next morning, and from strides on, a hop test with the weaker leg at 90% or more.</p>`}
    ${open ? html`<div class="x-field"><span>Stages</span><div class="x-chips">${STAGES.map((s) => html`<button type="button" class=${'x-chip' + (pick.includes(s.key) ? ' tint' : '')} style="border:0;min-height:48px" aria-pressed=${String(pick.includes(s.key))} onClick=${() => setPick(pick.includes(s.key) ? pick.filter((k) => k !== s.key) : pick.concat([s.key]))}>${s.name}</button>`)}</div></div>
      <${XField} label="Note for the athlete (optional)" type="textarea" rows=${2} value=${note} onInput=${setNote} placeholder="For example: one stage every 2 to 3 days, ice after if sore" />
      ${err ? html`<div class="x-err">${err}</div>` : null}
      <button class="x-btn" onClick=${start}>Send ladder to ${firstName(rep.athleteName)}</button>`
    : html`<button class="x-btn soft" onClick=${() => setOpen(true)}>${lad ? 'Start a new ladder' : 'Set a return-to-run ladder'}</button>`}
  </div>`;
}

function ExercisePicker({ chosen, onChange, suggest }) {
  const [q, setQ] = useState('');
  const pick = (k) => onChange(chosen.includes(k) ? chosen.filter((x) => x !== k) : chosen.concat([k]));
  const list = EXERCISES.filter((x) => (!q ? suggest.includes(x.area) : (x.name + ' ' + LIB_AREAS[x.area]).toLowerCase().includes(q.toLowerCase())));
  return html`<div class="x-field"><span>Exercises from the library</span>
    ${chosen.length ? html`<div class="x-chips">${chosen.map((k) => exercise(k)).filter(Boolean).map((x) => html`<button type="button" class="x-chip tint" style="border:0;min-height:48px" aria-label=${'Remove ' + x.name} onClick=${() => pick(x.key)}>${x.name} ×</button>`)}</div>` : null}
    <input class="x-input" type="search" placeholder=${suggest.length ? 'Search, or pick a suggestion below' : 'Search exercises'} value=${q} onInput=${(e) => setQ(e.target.value)} />
    <div class="x-chips">${list.filter((x) => !chosen.includes(x.key)).slice(0, 10).map((x) => html`<button type="button" class="x-chip" style="border:0;min-height:48px" onClick=${() => pick(x.key)}>+ ${x.name}</button>`)}</div></div>`;
}

const AREA_TO_LIB = { core: 'core', balance: 'balance', hamstring: 'hamstring', knee: 'knee', calf: 'calf', ankle: 'ankle' };

function PlanSummary({ pl }) {
  const st = planStatus(pl);
  return html`<div class="x-card"><div class="x-kicker">Programme from ${pl.coachName} · ${ago(pl.createdAt)}</div>
    <div class="x-chips"><span class="x-chip tint">Week ${st.week} of ${st.weeks}</span><span class="x-chip">${st.done}/${st.total} sessions done</span></div>
    <p style="white-space:pre-line">${pl.text}</p>${pl.exercises.length ? html`<p class="x-small x-muted">${pl.exercises.map((k) => (exercise(k) || {}).name).filter(Boolean).join(' · ')}</p>` : null}</div>`;
}

function ReportView({ id }) {
  const u = me();
  const rep = store.getState().reports.find((x) => x.id === id);
  const [text, setText] = useState('');
  const [ex, setEx] = useState([]);
  const [weeks, setWeeks] = useState(4);
  const [perWeek, setPerWeek] = useState(3);
  const [err, setErr] = useState('');
  if (!rep) return html`<div class="x-page"><div class="x-card"><h2>Report not found</h2><a href="#/">Inbox</a></div></div>`;
  const flagged = rep.mirror.filter((x) => x.tested && x.status !== 'even');
  const plans = plansFor(rep.athleteId);
  const partners = teamFor(rep.userId, u.id);
  const shown = plans.filter((pl) => pl.coachId === u.id || partners.some((x) => x.id === pl.coachId));
  const athlete = store.getAthlete(rep.athleteId);
  const ev = athlete ? evaluateAthlete(athlete) : null;
  const p = rep.pulse;
  const send = async () => {
    if (!text.trim()) { setErr('Write the programme first.'); return; }
    await sendPlan(rep, text, ex, weeks, perWeek);
    setText(''); setEx([]); setErr('');
    toast('Programme sent to ' + rep.athleteName + '.');
  };
  return html`<div class="x-page">
    <div class="x-topbar"><a class="x-link" href="#/"><${XIcon} name="back" size=${20} />Inbox</a><a class="x-link" href=${'#/chat/' + rep.userId}><${XIcon} name="chat" size=${20} />Chat</a></div>
    <div style="display:flex;gap:14px;align-items:center;padding:0 4px"><span class="x-avatar" style="width:56px;height:56px;font-size:22px">${initial(rep.athleteName)}</span><div><h1 class="x-title md">${rep.athleteName}</h1><p class="x-muted">${athlete && athlete.position ? athlete.position + ' · ' : ''}sent ${ago(rep.createdAt)}</p></div></div>
    ${ev && ev.status === 'urgent' ? html`<div class="x-urgent" role="alert"><b>Safety answer in the last 7 days.</b><p>${ev.signals.filter((s) => s.level === 'urgent').map((s) => s.title).join('; ')}. Make sure they have seen a doctor before training.</p></div>` : null}
    ${rep.note ? html`<div class="x-note">“${rep.note}”</div>` : null}
    <${MirrorBoard} rows=${rep.mirror} />
    ${flagged.length ? html`<div class="x-list">${flagged.map((x) => html`<div class="x-row"><span class=${'x-badge ' + x.status}><${XIcon} name="down" size=${16} /></span><div class="grow"><b>${x.text}</b><span class="x-small x-muted">${T.byKey(x.test).name} · ${ago(x.date + 'T12:00:00')}</span></div></div>`)}</div>` : null}
    <div class="x-card"><div class="x-kicker">Last 7 days</div>
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;text-align:center">
        <div style="background:var(--x-bg);border-radius:14px;padding:10px 4px"><div class="x-big" style="font-size:24px">${p.days}</div><div class="x-small x-muted">pulses</div></div>
        <div style=${'border-radius:14px;padding:10px 4px;background:' + (p.painDays ? 'var(--x-work-soft)' : 'var(--x-bg)')}><div class="x-big" style="font-size:24px">${p.painDays}</div><div class="x-small x-muted">pain days</div></div>
        <div style=${'border-radius:14px;padding:10px 4px;background:' + (p.shortSleep >= 3 ? 'var(--x-watch-soft)' : 'var(--x-bg)')}><div class="x-big" style="font-size:24px">${p.shortSleep}</div><div class="x-small x-muted">short nights</div></div>
      </div>
      ${p.painAreas.length ? html`<p class="x-small x-muted">Pain in: ${p.painAreas.join(', ')}</p>` : null}
      ${ev ? html`<p class="x-small x-muted">Today's status: ${LEVEL[ev.status].name}. <a href="#/signals">Signals</a></p>` : null}
    </div>
    ${rep.strengths.length ? html`<div class="x-card" style="flex-direction:row;gap:12px;align-items:center"><span class="x-badge"><${XIcon} name="up" size=${16} /></span><div style="flex:1"><b>Strengths</b><div class="x-small x-muted">${rep.strengths.map((x) => x.text || x.name).join(' · ')}</div></div></div>` : null}
    ${partners.length ? html`<p class="x-small x-muted" style="padding:0 4px">Working together with ${partners.map((x) => x.name + ' (' + ROLES[x.role] + ')').join(', ')}. You see each other's programmes.</p>` : null}
    ${shown.map((pl) => html`<${PlanSummary} key=${pl.id} pl=${pl} />`)}
    <${LadderCard} rep=${rep} />
    <div class="x-card" style="gap:12px"><div class="x-kicker">${shown.some((x) => x.coachId === u.id) ? 'Send a new programme' : 'Your programme'}</div>
      <${XField} label="What should they do?" type="textarea" rows=${4} value=${text} onInput=${setText} placeholder="For example: calf raises every day this week, no spikes, retest in 2 weeks" />
      <${ExercisePicker} chosen=${ex} onChange=${setEx} suggest=${flagged.map((x) => AREA_TO_LIB[x.area]).filter(Boolean)} />
      <div class="x-field"><span>How many weeks</span><${XSeg} label="Weeks" value=${weeks} onChange=${setWeeks} options=${[2, 4, 6, 8].map((n) => ({ value: n, label: n + ' wk' }))} /></div>
      <div class="x-field"><span>Sessions a week</span><${XSeg} label="Sessions a week" value=${perWeek} onChange=${setPerWeek} options=${[2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }))} /></div>
      ${err ? html`<div class="x-err">${err}</div>` : null}
      <button class="x-btn" onClick=${send}>Send programme to ${firstName(rep.athleteName)}</button></div>
  </div>`;
}

// ---------- athletes ----------
function Athletes() {
  const u = me();
  const list = athletesOf(u.id);
  const copy = async () => { try { await navigator.clipboard.writeText(u.teamCode); toast('Team code copied.'); } catch (e) { toast('Team code: ' + u.teamCode); } };
  return html`<div class="x-page">
    <div class="x-head"><div><div class="x-over">${list.length} connected</div><h1 class="x-title">Athletes</h1></div></div>
    <${Requests} />
    <div class="x-section">Working with you</div>
    <div class="x-list">${list.length ? list.map((x) => {
      const a = store.getAthlete(x.athleteId);
      const ev = a ? evaluateAthlete(a) : null;
      const pl = a ? plansFor(a.id).find((p) => p.coachId === u.id) : null;
      const st = pl ? planStatus(pl) : null;
      const partners = teamFor(x.id, u.id);
      return html`<div class="x-row"><a class="x-avatar soft" href=${a ? '#/athletes/' + a.id : '#/roster'}>${initial(x.name)}</a><a class="grow" href=${a ? '#/athletes/' + a.id : '#/roster'} style="color:inherit"><b>${x.name}</b><span class="x-small x-muted">${st ? 'Programme ' + st.done + '/' + st.total + ' · ' : ''}${ev && ev.lastCheckin ? 'pulse ' + ago(ev.lastCheckin + 'T12:00:00') : 'no pulse yet'}${partners.length ? ' · with ' + partners.map((p) => firstName(p.name)).join(', ') : ''}</span></a>
        ${ev ? html`<span class=${'x-chip ' + (ev.status === 'urgent' || ev.status === 'review' ? 'work' : ev.status === 'watch' ? 'watch' : '')}>${LEVEL[ev.status].name}</span>` : null}</div>`;
    }) : html`<div class="x-row"><span class="x-muted">No athletes yet. They find you through your posts and profile.</span></div>`}</div>
    <div class="x-card dark" style="align-items:center;text-align:center;gap:6px;padding:22px 18px"><span class="x-kicker">Team code</span><div class="x-big" style="font-size:40px;letter-spacing:.08em">${u.teamCode}</div><span class="x-muted x-small">An athlete who enters this code connects with you straight away.</span><button class="x-btn soft sm" style="margin-top:8px" onClick=${copy}><${XIcon} name="copy" size=${18} />Copy</button></div>
  </div>`;
}

// ---------- post ----------
const blankPanel = () => ({ who: 'coach', scene: 'run', text: '' });
const blankSlide = () => ({ title: '', text: '' });
const PLACEHOLDER = { insight: 'Why we do Nordics twice a week', story: 'The day Ravi stopped skipping warm-ups', slides: '5 things that make you faster', video: 'Perfect calf raise form', photo: 'Our new hill route', training: 'Tuesday: hill sprints', document: 'Race-day nutrition guide' };

function ThemePick({ value, onChange }) {
  return html`<div class="x-field"><span>Colour</span><div class="x-themes" role="group" aria-label="Colour">${THEMES.map((t) => html`<button type="button" class=${'t-' + t} aria-pressed=${String(value === t)} aria-label=${t} onClick=${() => onChange(t)}></button>`)}</div></div>`;
}

function Post() {
  const u = me();
  const blank = (type, theme) => ({ type, title: '', body: '', file: null, exercises: [], theme: theme || 'violet', panels: [blankPanel(), Object.assign(blankPanel(), { who: 'athlete', scene: 'think' })], slides: [blankSlide(), blankSlide()] });
  const [f, setF] = useState(() => blank('story'));
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF(Object.assign({}, f, { [k]: v }));
  const setItem = (k, i, patch) => set(k)(f[k].map((x, n) => (n === i ? Object.assign({}, x, patch) : x)));
  const mine = postsBy(u.id);
  const fileKind = { video: 'video/*', photo: 'image/*', document: 'application/pdf,image/*', training: 'image/*', slides: 'application/pdf' }[f.type];
  const max = f.type === 'video' ? MAX_VIDEO : MAX_FILE;
  const publish = async () => {
    const e = [];
    if (!f.title.trim()) e.push('a title');
    if (f.type === 'insight' && !f.body.trim()) e.push('the text');
    if (f.type === 'story' && f.panels.filter((x) => x.text.trim()).length < 2) e.push('at least 2 panels');
    if (f.type === 'slides' && !f.file && f.slides.filter((x) => x.title.trim() || x.text.trim()).length < 2) e.push('at least 2 slides, or a PDF');
    if ((f.type === 'video' || f.type === 'photo' || f.type === 'document') && !f.file) e.push(f.type === 'video' ? 'a video' : f.type === 'photo' ? 'a photo' : 'a file');
    if (f.type === 'training' && !f.exercises.length && !f.body.trim()) e.push('the session or some exercises');
    if (e.length) { setErr('Please add ' + e.join(', ') + '.'); return; }
    setBusy(true);
    try { await createPost(Object.assign({}, f, { slides: f.file && f.type === 'slides' ? [] : f.slides })); setF(blank(f.type, f.theme)); setErr(''); toast('Posted. Athletes see it in their feed.'); }
    catch (x) { setErr(x.message === 'File too big' ? 'That file is too big (up to ' + Math.round(max / 1048576) + ' MB).' : x.message); }
    setBusy(false);
  };
  const preview = Object.assign({}, f, { id: 'preview', panels: f.panels.filter((x) => x.text.trim()), slides: f.slides.filter((x) => x.title.trim() || x.text.trim()) });
  return html`<div class="x-page">
    <div class="x-head"><div><div class="x-over">To every athlete's feed</div><h1 class="x-title">Post</h1></div></div>
    <p class="x-sub" style="padding:0 4px">Teach with stories, slides and short videos. Athletes star and react; good posts bring athletes to your profile.</p>
    <${XSeg} wrap=${true} label="Post type" value=${f.type} onChange=${(t) => setF(Object.assign({}, f, { type: t, file: null }))} options=${Object.entries(POST_TYPES).map(([value, label]) => ({ value, label }))} />
    <div class="x-card" style="gap:14px">
      <${XField} label="Title" value=${f.title} onInput=${set('title')} placeholder=${PLACEHOLDER[f.type]} />
      ${f.type === 'story' ? html`
        ${f.panels.map((x, i) => html`<div class="x-paneledit"><div style="display:flex;justify-content:space-between;align-items:center"><b>Panel ${i + 1}</b>${f.panels.length > 2 ? html`<button type="button" class="x-link" style="font-size:14px" onClick=${() => set('panels')(f.panels.filter((_, n) => n !== i))}>Remove</button>` : null}</div>
          <${XSeg} label=${'Panel ' + (i + 1) + ' speaker'} value=${x.who} onChange=${(v) => setItem('panels', i, { who: v })} options=${[{ value: 'coach', label: 'Coach says' }, { value: 'athlete', label: 'Athlete says' }, { value: 'narrator', label: 'Caption' }]} />
          <div class="x-scenes" role="group" aria-label="Scene">${Object.entries(SCENES).map(([k, e]) => html`<button type="button" aria-pressed=${String(x.scene === k)} aria-label=${k} onClick=${() => setItem('panels', i, { scene: k })}>${e}</button>`)}</div>
          <textarea class="x-input" rows="2" aria-label=${'Panel ' + (i + 1) + ' words'} placeholder=${x.who === 'narrator' ? 'Two weeks later…' : x.who === 'athlete' ? 'My calf feels tight after spikes' : 'Show me your Mirror'} value=${x.text} onInput=${(e) => setItem('panels', i, { text: e.target.value })}></textarea></div>`)}
        ${f.panels.length < 6 ? html`<button type="button" class="x-btn soft sm" onClick=${() => set('panels')(f.panels.concat([blankPanel()]))}><${XIcon} name="plus" size=${18} />Add panel</button>` : null}
        <${XField} label="Lesson under the story (optional)" type="textarea" rows=${2} value=${f.body} onInput=${set('body')} />` : null}
      ${f.type === 'slides' ? html`
        ${f.file ? null : f.slides.map((x, i) => html`<div class="x-paneledit"><div style="display:flex;justify-content:space-between;align-items:center"><b>Slide ${i + 1}</b>${f.slides.length > 2 ? html`<button type="button" class="x-link" style="font-size:14px" onClick=${() => set('slides')(f.slides.filter((_, n) => n !== i))}>Remove</button>` : null}</div>
          <input class="x-input" aria-label=${'Slide ' + (i + 1) + ' heading'} placeholder="Heading" value=${x.title} onInput=${(e) => setItem('slides', i, { title: e.target.value })} />
          <textarea class="x-input" rows="2" aria-label=${'Slide ' + (i + 1) + ' text'} placeholder="One or two lines" value=${x.text} onInput=${(e) => setItem('slides', i, { text: e.target.value })}></textarea></div>`)}
        ${!f.file && f.slides.length < 10 ? html`<button type="button" class="x-btn soft sm" onClick=${() => set('slides')(f.slides.concat([blankSlide()]))}><${XIcon} name="plus" size=${18} />Add slide</button>` : null}` : null}
      ${f.type !== 'story' && f.type !== 'slides' ? html`<${XField} label=${f.type === 'training' ? 'The session' : f.type === 'insight' ? 'Your insight' : 'Caption (optional)'} type="textarea" rows=${4} value=${f.body} onInput=${set('body')} />` : null}
      ${fileKind ? html`<label class="x-field"><span>${f.type === 'video' ? 'Video (up to 40 MB, short clips work best)' : f.type === 'slides' ? 'Or upload a PDF presentation (up to 8 MB)' : f.type === 'training' ? 'Photo (optional)' : 'File (up to 8 MB)'}</span><input class="x-input" type="file" accept=${fileKind} onChange=${(e) => { const file = e.target.files[0] || null; if (file && file.size > max) { setErr('That file is too big (up to ' + Math.round(max / 1048576) + ' MB).'); return; } set('file')(file); }} />${f.file ? html`<span class="x-small x-muted">${f.file.name}</span>` : null}</label>` : null}
      ${f.type === 'training' ? html`<${ExercisePicker} chosen=${f.exercises} onChange=${set('exercises')} suggest=${[]} />` : null}
      ${f.type === 'insight' || f.type === 'story' || f.type === 'slides' ? html`<${ThemePick} value=${f.theme} onChange=${set('theme')} />` : null}
    </div>
    ${f.type === 'story' && preview.panels.length ? html`<div class="x-section">Preview</div><${Comic} p=${preview} />` : null}
    ${f.type === 'slides' && !f.file && preview.slides.length ? html`<div class="x-section">Preview</div><${Deck} p=${preview} />` : null}
    ${err ? html`<div class="x-err" role="alert">${err}</div>` : null}
    <button class="x-btn" disabled=${busy} onClick=${publish}>Post</button>
    ${mine.length ? html`<div class="x-section">Your posts</div>${mine.map((p) => html`<${PostCard} key=${p.id} p=${p} canReact=${false} onDelete=${async () => { if (confirm('Delete this post for everyone?')) { await deletePost(p.id); toast('Post deleted.'); } }} />`)}` : null}
  </div>`;
}

// ---------- me and tools ----------
const TOOLS = [
  ['/signals', 'Signals', 'Who needs attention today'],
  ['/athletes', 'Athlete records', 'Profiles and history'],
  ['/assess', 'New assessment', 'VO₂ max, strength, mobility, balance'],
  ['/reports', 'Reports', 'Assessment reports'],
  ['/analytics', 'Trends', 'Results over time'],
  ['/training', 'Training log', 'Sessions and effort'],
  ['/protocols', 'Protocol library', 'Equations and sources'],
  ['/settings', 'Settings', 'Backup, export and example data'],
];

function Me() {
  const u = me();
  const others = store.getState().users.filter((x) => x.id !== u.id);
  return html`<div class="x-page">
    <a href=${'#/pro/' + u.id} style="display:flex;gap:14px;align-items:center;padding:12px 4px 0;color:inherit"><span class="x-avatar" style="width:56px;height:56px;font-size:22px">${initial(u.name)}</span><div style="flex:1"><h1 class="x-title md">${u.name}</h1><p class="x-muted">${ROLES[u.role]}${u.speciality ? ' · ' + u.speciality : ''}</p></div><span class="x-chev"><${XIcon} name="next" size=${18} /></span></a>
    <div class="x-list">
      <a class="x-row" href=${'#/pro/' + u.id}><div class="grow"><b>Your profile</b><span class="x-small x-muted">What athletes see before they connect</span></div><span class="x-chev"><${XIcon} name="next" size=${18} /></span></a>
      <a class="x-row" href="#/me/edit"><div class="grow"><b>Edit profile</b><span class="x-small x-muted">Speciality, place and about you</span></div><span class="x-chev"><${XIcon} name="next" size=${18} /></span></a>
      <a class="x-row" href="#/feed"><div class="grow"><b>See the feed</b><span class="x-small x-muted">Posts from every coach and physio</span></div><span class="x-chev"><${XIcon} name="next" size=${18} /></span></a>
      <a class="x-row" href="#/library"><div class="grow"><b>Exercise library</b></div><span class="x-chev"><${XIcon} name="next" size=${18} /></span></a>
    </div>
    <div class="x-section">Assessment tools</div>
    <div class="x-list">${TOOLS.map(([p, t, d]) => html`<a class="x-row" href=${'#' + p}><div class="grow"><b>${t}</b><span class="x-small x-muted">${d}</span></div><span class="x-chev"><${XIcon} name="next" size=${18} /></span></a>`)}</div>
    ${others.length ? html`<div class="x-section">Other accounts on this phone</div><div class="x-list">${others.map((o) => html`<button class="x-row" type="button" onClick=${() => { switchTo(o.id); go('/'); }}><span class="x-avatar soft">${initial(o.name)}</span><div class="grow"><b>${o.name}</b><span class="x-small x-muted">${ROLES[o.role]}</span></div><span class="x-chev"><${XIcon} name="swap" size=${18} /></span></button>`)}</div>` : null}
    <button class="x-btn ghost" onClick=${() => { signOut(); go('/welcome'); }}>Sign out</button>
  </div>`;
}
