// The coach app (coaches, trainers and physios): reports inbox and plans, posting to the feed,
// the team, the exercise library, and the assessment tools.
import { html, useState } from '../vendor/preact-htm.js';
import { go, toast } from '../ui.js';
import { XIcon, XSeg, XField, initial, ago } from '../xui.js';
import * as store from '../store.js';
import { me, signOut, switchTo, ROLES } from '../session.js';
import { inbox, sendPlan, plansFor, createPost, deletePost, feedFor, POST_TYPES, MAX_FILE } from '../social.js';
import { EXERCISES, AREAS as LIB_AREAS, byKey as exercise } from '../library.js';
import { evaluateAthlete, LEVEL } from '../monitor.js';
import { MirrorBoard, PostCard, Library, Exercise } from './athlete.js';

const T = globalThis.MotionPlusTests;

const TABS = [
  { path: '/', label: 'Inbox', icon: 'inbox' },
  { path: '/post', label: 'Post', icon: 'post' },
  { path: '/team', label: 'Team', icon: 'team' },
  { path: '/library', label: 'Library', icon: 'library' },
  { path: '/tools', label: 'Tools', icon: 'tools' },
];
export const COACH_PATHS = ['', 'inbox', 'post', 'team', 'library', 'tools'];

export function CoachApp({ r }) {
  const [a, b] = r.parts;
  let page;
  if (!a) page = html`<${Inbox} />`;
  else if (a === 'inbox') page = html`<${ReportView} key=${b} id=${b} />`;
  else if (a === 'post') page = html`<${Post} />`;
  else if (a === 'team') page = html`<${Team} />`;
  else if (a === 'library' && !b) page = html`<${Library} query=${r.query} />`;
  else if (a === 'library') page = html`<${Exercise} id=${b} />`;
  else page = html`<${Tools} />`;
  const active = (p) => (p === '/' ? r.path === '/' || r.path.startsWith('/inbox') : r.path.startsWith(p));
  return html`<div class="x">${page}
    <nav class="x-tabs" aria-label="Main">${TABS.map((t) => html`<a href=${'#' + t.path} class=${active(t.path) ? 'on' : ''} aria-current=${active(t.path) ? 'page' : null}><${XIcon} name=${t.icon} size=${24} />${t.label}</a>`)}</nav>
  </div>`;
}

// ---------- inbox ----------
function Inbox() {
  const u = me();
  const list = inbox(u);
  const fresh = list.filter((x) => x.status === 'new');
  const flags = (rep) => rep.mirror.filter((x) => x.tested && x.status !== 'even');
  return html`<div class="x-page">
    <div class="x-head"><div><div class="x-over">${ROLES[u.role]} · team ${u.teamCode}</div><h1 class="x-title">Inbox</h1></div><a class="x-avatar" href="#/tools" aria-label="Account and tools">${initial(u.name)}</a></div>
    <p class="x-sub" style="padding:0 4px">${fresh.length ? fresh.length + ' new report' + (fresh.length > 1 ? 's' : '') + ' waiting for a plan.' : 'All caught up.'}</p>
    ${!list.length ? html`<div class="x-card" style="align-items:center;text-align:center;padding:36px 18px"><span class="x-badge"><${XIcon} name="inbox" /></span><b>No reports yet</b><p class="x-muted x-small">Give your athletes your team code <b>${u.teamCode}</b>. When they send their Mirror, it lands here.</p><a class="x-btn soft sm" href="#/team">Show team code</a></div>`
      : html`<div class="x-list">${list.map((rep) => html`<a class="x-row" href=${'#/inbox/' + rep.id}><span class="x-avatar soft">${initial(rep.athleteName)}</span>
        <div class="grow"><b>${rep.athleteName}</b><span class="x-small x-muted">${flags(rep).length ? flags(rep).map((x) => x.name).join(', ') + ' to look at' : 'All even'}${rep.pulse.painDays ? ' · pain ' + rep.pulse.painDays + ' of 7 days' : ''}</span></div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px"><span class="x-small x-dim">${ago(rep.createdAt)}</span>${rep.status === 'new' ? html`<span class="x-chip tint">New</span>` : html`<span class="x-chip">Plan sent</span>`}</div></a>`)}</div>`}
  </div>`;
}

function ExercisePicker({ chosen, onChange, suggest }) {
  const [q, setQ] = useState('');
  const pick = (k) => onChange(chosen.includes(k) ? chosen.filter((x) => x !== k) : chosen.concat([k]));
  const list = EXERCISES.filter((x) => (!q ? suggest.includes(x.area) : (x.name + ' ' + LIB_AREAS[x.area]).toLowerCase().includes(q.toLowerCase())));
  return html`<div class="x-field"><span>Exercises from the library</span>
    ${chosen.length ? html`<div class="x-chips">${chosen.map((k) => exercise(k)).filter(Boolean).map((x) => html`<button type="button" class="x-chip tint" style="border:0;min-height:40px" aria-label=${'Remove ' + x.name} onClick=${() => pick(x.key)}>${x.name} ×</button>`)}</div>` : null}
    <input class="x-input" type="search" placeholder=${suggest.length ? 'Search, or pick a suggestion below' : 'Search exercises'} value=${q} onInput=${(e) => setQ(e.target.value)} />
    <div class="x-chips">${list.filter((x) => !chosen.includes(x.key)).slice(0, 10).map((x) => html`<button type="button" class="x-chip" style="border:0;min-height:40px" onClick=${() => pick(x.key)}>+ ${x.name}</button>`)}</div></div>`;
}

const AREA_TO_LIB = { core: 'core', balance: 'balance', hamstring: 'hamstring', knee: 'knee', calf: 'calf', ankle: 'ankle' };

function ReportView({ id }) {
  const rep = store.getState().reports.find((x) => x.id === id);
  const [text, setText] = useState('');
  const [ex, setEx] = useState([]);
  const [err, setErr] = useState('');
  if (!rep) return html`<div class="x-page"><div class="x-card"><h2>Report not found</h2><a href="#/">Inbox</a></div></div>`;
  const flagged = rep.mirror.filter((x) => x.tested && x.status !== 'even');
  const plans = plansFor(rep.athleteId).filter((p) => p.reportId === rep.id);
  const athlete = store.getAthlete(rep.athleteId);
  const ev = athlete ? evaluateAthlete(athlete) : null;
  const p = rep.pulse;
  const send = async () => {
    if (!text.trim()) { setErr('Write the plan first.'); return; }
    await sendPlan(rep, text, ex);
    setText(''); setEx([]); setErr('');
    toast('Plan sent to ' + rep.athleteName + '.');
  };
  return html`<div class="x-page">
    <div class="x-topbar"><a class="x-link" href="#/"><${XIcon} name="back" size=${20} />Inbox</a>${athlete ? html`<a class="x-link" href=${'#/athletes/' + athlete.id}>Full profile</a>` : null}</div>
    <div style="display:flex;gap:14px;align-items:center;padding:0 4px"><span class="x-avatar" style="width:56px;height:56px;font-size:22px">${initial(rep.athleteName)}</span><div><h1 class="x-title md">${rep.athleteName}</h1><p class="x-muted">${athlete && athlete.position ? athlete.position + ' · ' : ''}sent ${ago(rep.createdAt)}</p></div></div>
    ${ev && ev.status === 'urgent' ? html`<div class="x-urgent" role="alert"><b>Safety answer in the last 7 days.</b><p>${ev.signals.filter((s) => s.level === 'urgent').map((s) => s.title).join('; ')}. Make sure they have seen a doctor before training.</p></div>` : null}
    ${rep.note ? html`<div class="x-note">“${rep.note}”</div>` : null}
    <${MirrorBoard} rows=${rep.mirror} />
    ${flagged.length ? html`<div class="x-list">${flagged.map((x) => html`<div class="x-row"><span class=${'x-badge ' + x.status}><${XIcon} name="down" size=${16} /></span><div class="grow"><b>${x.text}</b><span class="x-small x-muted">${T.byKey(x.test).name} · ${ago(x.date + 'T12:00:00')}</span></div></div>`)}</div>` : null}
    <div class="x-card"><div class="x-kicker">Last 7 days</div>
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;text-align:center">
        <div style="background:var(--x-bg);border-radius:14px;padding:10px 4px"><div class="x-big" style="font-size:24px">${p.days}</div><div class="x-small x-muted">pulses</div></div>
        <div style=${'border-radius:14px;padding:10px 4px;background:' + (p.painDays ? 'var(--x-work-soft)' : 'var(--x-bg)')}><div class="x-big" style="font-size:24px">${p.painDays}</div><div class="x-small x-muted">pain days</div></div>
        <div style=${'border-radius:14px;padding:10px 4px;background:' + (p.shortSleep >= 3 ? 'var(--x-watch-soft)' : 'var(--x-bg)')}><div class="x-big" style="font-size:24px">${p.shortSleep}</div><div class="x-small x-muted">nights under 6 h</div></div>
      </div>
      ${p.painAreas.length ? html`<p class="x-small x-muted">Pain in: ${p.painAreas.join(', ')}</p>` : null}
      ${ev ? html`<p class="x-small x-muted">Today's status: ${LEVEL[ev.status].name}. <a href="#/signals">Signals</a></p>` : null}
    </div>
    ${rep.strengths.length ? html`<div class="x-card" style="flex-direction:row;gap:12px;align-items:center"><span class="x-badge"><${XIcon} name="up" size=${16} /></span><div style="flex:1"><b>Strengths</b><div class="x-small x-muted">${rep.strengths.map((x) => x.text || x.name).join(' · ')}</div></div></div>` : null}
    ${plans.map((pl) => html`<div class="x-card"><div class="x-kicker">Plan sent ${ago(pl.createdAt)} by ${pl.coachName}</div><p style="white-space:pre-line">${pl.text}</p>${pl.exercises.length ? html`<p class="x-small x-muted">${pl.exercises.map((k) => (exercise(k) || {}).name).filter(Boolean).join(' · ')}</p>` : null}</div>`)}
    <div class="x-card" style="gap:12px"><div class="x-kicker">${plans.length ? 'Send another plan' : 'Your plan'}</div>
      <${XField} label="What should they do?" type="textarea" rows=${4} value=${text} onInput=${setText} placeholder="For example: calf raises every day this week, no spikes, retest in 2 weeks" />
      <${ExercisePicker} chosen=${ex} onChange=${setEx} suggest=${flagged.map((x) => AREA_TO_LIB[x.area]).filter(Boolean)} />
      ${err ? html`<div class="x-err">${err}</div>` : null}
      <button class="x-btn" onClick=${send}>Send plan to ${rep.athleteName.split(' ')[0]}</button></div>
  </div>`;
}

// ---------- post ----------
function Post() {
  const u = me();
  const [f, setF] = useState({ type: 'insight', title: '', body: '', file: null, exercises: [] });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF(Object.assign({}, f, { [k]: v }));
  const mine = feedFor(u).filter((p) => p.authorId === u.id);
  const publish = async () => {
    const e = [];
    if (!f.title.trim()) e.push('a title');
    if (f.type === 'document' && !f.file) e.push('a file');
    if (f.type === 'training' && !f.exercises.length && !f.body.trim()) e.push('the session or some exercises');
    if (f.type === 'insight' && !f.body.trim()) e.push('the text');
    if (e.length) { setErr('Please add ' + e.join(', ') + '.'); return; }
    setBusy(true);
    try { await createPost(f); setF({ type: f.type, title: '', body: '', file: null, exercises: [] }); setErr(''); toast('Posted to your team.'); }
    catch (x) { setErr(x.message === 'File too big' ? 'That file is over 8 MB. Use a smaller PDF or photo.' : x.message); }
    setBusy(false);
  };
  return html`<div class="x-page">
    <div class="x-head"><div><div class="x-over">To team ${u.teamCode}</div><h1 class="x-title">Post</h1></div></div>
    <p class="x-sub" style="padding:0 4px">Your athletes see posts in their feed. They can star and react, but not post.</p>
    <${XSeg} label="Post type" value=${f.type} onChange=${set('type')} options=${Object.entries(POST_TYPES).map(([value, label]) => ({ value, label }))} />
    <div class="x-card" style="gap:14px">
      <${XField} label="Title" value=${f.title} onInput=${set('title')} placeholder=${f.type === 'training' ? 'Tuesday: hill sprints' : f.type === 'document' ? 'Race-day nutrition guide' : 'Why we do Nordics twice a week'} />
      <${XField} label=${f.type === 'training' ? 'The session' : f.type === 'document' ? 'A short note (optional)' : 'Your insight'} type="textarea" rows=${5} value=${f.body} onInput=${set('body')} />
      ${f.type !== 'insight' ? html`<label class="x-field"><span>${f.type === 'document' ? 'PDF or photo (up to 8 MB)' : 'Photo (optional)'}</span><input class="x-input" type="file" accept=${f.type === 'document' ? 'application/pdf,image/*' : 'image/*'} onChange=${(e) => { const file = e.target.files[0] || null; if (file && file.size > MAX_FILE) { setErr('That file is over 8 MB. Use a smaller PDF or photo.'); return; } set('file')(file); }} />${f.file ? html`<span class="x-small x-muted">${f.file.name}</span>` : null}</label>` : null}
      ${f.type === 'training' ? html`<${ExercisePicker} chosen=${f.exercises} onChange=${set('exercises')} suggest=${[]} />` : null}
    </div>
    ${err ? html`<div class="x-err" role="alert">${err}</div>` : null}
    <button class="x-btn" disabled=${busy} onClick=${publish}>Post to team</button>
    ${mine.length ? html`<div class="x-section">Your posts</div>${mine.map((p) => html`<${PostCard} key=${p.id} p=${p} canReact=${false} onDelete=${async () => { if (confirm('Delete this post for everyone?')) { await deletePost(p.id); toast('Post deleted.'); } }} />`)}` : null}
  </div>`;
}

// ---------- team ----------
function Team() {
  const u = me();
  const athletes = store.getState().users.filter((x) => x.role === 'athlete' && x.teamCode === u.teamCode);
  const coaches = store.getState().users.filter((x) => x.role !== 'athlete' && x.teamCode === u.teamCode);
  const copy = async () => { try { await navigator.clipboard.writeText(u.teamCode); toast('Team code copied.'); } catch (e) { toast('Team code: ' + u.teamCode); } };
  return html`<div class="x-page">
    <div class="x-head"><div><div class="x-over">${athletes.length} athlete${athletes.length === 1 ? '' : 's'}</div><h1 class="x-title">Team</h1></div></div>
    <div class="x-card dark" style="align-items:center;text-align:center;gap:6px;padding:26px 18px"><span class="x-kicker">Team code</span><div class="x-big" style="font-size:48px;letter-spacing:.08em">${u.teamCode}</div><span class="x-muted x-small">Athletes enter this when they join.</span><button class="x-btn soft sm" style="margin-top:8px" onClick=${copy}><${XIcon} name="copy" size=${18} />Copy</button></div>
    <div class="x-list">${athletes.length ? athletes.map((x) => {
      const a = store.getAthlete(x.athleteId);
      const ev = a ? evaluateAthlete(a) : null;
      return html`<a class="x-row" href=${a ? '#/athletes/' + a.id : '#/team'}><span class="x-avatar soft">${initial(x.name)}</span><div class="grow"><b>${x.name}</b><span class="x-small x-muted">${a && a.position ? a.position + ' · ' : ''}${ev && ev.lastCheckin ? 'last pulse ' + ago(ev.lastCheckin + 'T12:00:00') : 'no pulse yet'}</span></div>${ev ? html`<span class=${'x-chip ' + (ev.status === 'urgent' || ev.status === 'review' ? 'work' : ev.status === 'watch' ? 'watch' : '')}>${LEVEL[ev.status].name}</span>` : null}</a>`;
    }) : html`<div class="x-row"><span class="x-muted">No athletes have joined yet.</span></div>`}</div>
    ${coaches.length > 1 ? html`<div class="x-section">Staff</div><div class="x-list">${coaches.map((c) => html`<div class="x-row"><span class="x-avatar soft">${initial(c.name)}</span><div class="grow"><b>${c.name}</b><span class="x-small x-muted">${ROLES[c.role]}</span></div></div>`)}</div>` : null}
  </div>`;
}

// ---------- tools and account ----------
const TOOLS = [
  ['/signals', 'Signals', 'Who needs attention today'],
  ['/athletes', 'Athletes', 'Profiles and history'],
  ['/assess', 'New assessment', 'VO₂ max, strength, mobility, balance'],
  ['/reports', 'Reports', 'Signed assessment reports'],
  ['/analytics', 'Trends', 'Results over time'],
  ['/training', 'Training log', 'Sessions and effort'],
  ['/protocols', 'Protocol library', 'Equations and sources'],
  ['/settings', 'Settings', 'Backup, export and example data'],
];

function Tools() {
  const u = me();
  const others = store.getState().users.filter((x) => x.id !== u.id);
  return html`<div class="x-page">
    <div style="display:flex;gap:14px;align-items:center;padding:12px 4px 0"><span class="x-avatar" style="width:56px;height:56px;font-size:22px">${initial(u.name)}</span><div><h1 class="x-title md">${u.name}</h1><p class="x-muted">${ROLES[u.role]} · team ${u.teamCode}</p></div></div>
    <div class="x-section">Assessment tools</div>
    <div class="x-list">${TOOLS.map(([p, t, d]) => html`<a class="x-row" href=${'#' + p}><div class="grow"><b>${t}</b><span class="x-small x-muted">${d}</span></div><span class="x-chev"><${XIcon} name="next" size=${18} /></span></a>`)}</div>
    ${others.length ? html`<div class="x-section">Other accounts on this phone</div><div class="x-list">${others.map((o) => html`<button class="x-row" type="button" onClick=${() => { switchTo(o.id); go('/'); }}><span class="x-avatar soft">${initial(o.name)}</span><div class="grow"><b>${o.name}</b><span class="x-small x-muted">${ROLES[o.role]}</span></div><span class="x-chev"><${XIcon} name="swap" size=${18} /></span></button>`)}</div>` : null}
    <button class="x-btn ghost" onClick=${() => { signOut(); go('/welcome'); }}>Sign out</button>
  </div>`;
}
