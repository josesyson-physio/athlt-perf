// App shell: hash router, navigation and data subscription.
import { html, render, useState, useEffect } from './vendor/preact-htm.js';
import * as store from './store.js';
import { Icon, Toast, go } from './ui.js';
import { initPwa, NetStatus } from './pwa.js';
import { Dashboard } from './pages/dashboard.js';
import { Athletes, AthleteProfile, AthleteForm } from './pages/athletes.js';
import { AssessmentWizard, NewAssessment } from './pages/assessment.js';
import { Report, Reports } from './pages/report.js';
import { Analytics } from './pages/analytics.js';
import { Protocols } from './pages/protocols.js';
import { Settings } from './pages/settings.js';
import { Signals, SquadCheckin, CheckinForm, WeeklyForm, TrainingLog, SessionForm } from './pages/monitor.js';

const NAV = [
  { path: '/', label: 'Dashboard', icon: 'home', group: 'Workspace' },
  { path: '/signals', label: 'Signals', icon: 'pulse', group: 'Monitor' },
  { path: '/checkin', label: 'Squad check-in', short: 'Check-in', icon: 'check', group: 'Monitor' },
  { path: '/training', label: 'Training log', short: 'Training', icon: 'bolt', group: 'Monitor' },
  { path: '/athletes', label: 'Athletes', icon: 'users', group: 'Assess' },
  { path: '/assess', label: 'New assessment', icon: 'clipboard', group: 'Assess' },
  { path: '/reports', label: 'Reports', icon: 'file', group: 'Assess' },
  { path: '/analytics', label: 'Trends', icon: 'chart', group: 'Assess' },
  { path: '/protocols', label: 'Protocol library', icon: 'book', group: 'Manage' },
  { path: '/settings', label: 'Settings', icon: 'gear', group: 'Manage' },
];

function parse() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, query] = raw.split('?');
  return { path, parts: path.split('/').filter(Boolean), query: new URLSearchParams(query || '') };
}

function route(r) {
  const [a, b, c] = r.parts;
  if (!a) return html`<${Dashboard} />`;
  if (a === 'athletes' && !b) return html`<${Athletes} query=${r.query} />`;
  if (a === 'athletes' && b === 'new') return html`<${AthleteForm} />`;
  if (a === 'athletes' && c === 'edit') return html`<${AthleteForm} id=${b} />`;
  if (a === 'athletes') return html`<${AthleteProfile} id=${b} />`;
  if (a === 'assess' && !b) return html`<${NewAssessment} query=${r.query} />`;
  if (a === 'assess') return html`<${AssessmentWizard} id=${b} step=${Number(r.query.get('step') || 0)} />`;
  if (a === 'reports' && !b) return html`<${Reports} query=${r.query} />`;
  if (a === 'reports') return html`<${Report} id=${b} />`;
  if (a === 'signals') return html`<${Signals} query=${r.query} />`;
  if (a === 'checkin' && !b) return html`<${SquadCheckin} />`;
  if (a === 'checkin' && c === 'weekly') return html`<${WeeklyForm} id=${b} />`;
  if (a === 'checkin') return html`<${CheckinForm} id=${b} />`;
  if (a === 'training' && !b) return html`<${TrainingLog} query=${r.query} />`;
  if (a === 'training' && b === 'new') return html`<${SessionForm} />`;
  if (a === 'training') return html`<${SessionForm} id=${b} />`;
  if (a === 'analytics') return html`<${Analytics} query=${r.query} />`;
  if (a === 'protocols') return html`<${Protocols} />`;
  if (a === 'settings') return html`<${Settings} />`;
  return html`<div class="card"><h2>Page not found</h2><p class="muted">That link does not match a page in this app.</p><a href="#/">Go to the dashboard</a></div>`;
}

const isActive = (r, path) => (path === '/' ? r.path === '/' : r.path.startsWith(path));

function App() {
  const [r, setR] = useState(parse());
  const [, setTick] = useState(0);
  const [more, setMore] = useState(false);
  const [q, setQ] = useState('');
  useEffect(() => {
    const onHash = () => { setR(parse()); setMore(false); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', onHash);
    const unsub = store.subscribe(() => setTick((t) => t + 1));
    setTick((t) => t + 1); // the store may have finished loading before this subscription
    return () => { window.removeEventListener('hashchange', onHash); unsub(); };
  }, []);
  const s = store.getState();
  if (!s.ready) return html`<div class="empty"><p>Loading your records…</p></div>`;
  const groups = [...new Set(NAV.map((n) => n.group))];
  const search = (e) => { e.preventDefault(); go('/athletes?q=' + encodeURIComponent(q)); };
  return html`<div class="app">
    <aside class="side" aria-label="Main navigation">
      <div class="wordmark"><b>MotionPlus</b><small>Sports assessment & reporting</small></div>
      ${groups.map((g) => html`<div class="navlabel">${g}</div><nav class="nav">${NAV.filter((n) => n.group === g).map((n) => html`<a href=${'#' + n.path} class=${isActive(r, n.path) ? 'active' : ''} aria-current=${isActive(r, n.path) ? 'page' : null}><${Icon} name=${n.icon} />${n.label}</a>`)}</nav>`)}
      <div class="who"><b>${s.settings.assessorName || 'Assessor not set'}</b><div class="muted small">${s.settings.clinicName || ''}</div>${!s.settings.assessorName ? html`<a href="#/settings" class="small">Add your name</a>` : null}</div>
    </aside>
    <div class="main">
      <header class="top">
        <span class="mobile-brand">MotionPlus</span>
        <form class="search" role="search" onSubmit=${search}><${Icon} name="search" size=${16} /><input aria-label="Search athletes" placeholder="Search athletes by name, ID or sport" value=${q} onInput=${(e) => setQ(e.target.value)} /></form>
        <div class="top-right"><${NetStatus} /><a class="btn primary sm" href="#/assess"><${Icon} name="plus" size=${16} />Assess</a></div>
      </header>
      ${s.storage === 'memory' ? html`<div class="inner" style="padding-bottom:0"><div class="notice warn">This browser is blocking on-device storage, so records will be lost when the page closes. Download a backup from Settings before closing.</div></div>` : null}
      <main class="inner" id="content">${route(r)}</main>
    </div>
    <nav class="tabbar" aria-label="Main navigation">
      ${NAV.slice(0, 4).map((n) => html`<a href=${'#' + n.path} class=${isActive(r, n.path) ? 'active' : ''}><${Icon} name=${n.icon} size=${20} />${n.short || n.label}</a>`)}
      <button type="button" class=${more ? 'active' : ''} onClick=${() => setMore(true)} aria-haspopup="true"><${Icon} name="more" size=${20} />More</button>
    </nav>
    ${more ? html`<div class="sheet-backdrop" onClick=${(e) => e.target === e.currentTarget && setMore(false)}><div class="sheet" role="dialog" aria-label="More pages">${NAV.slice(4).map((n) => html`<a href=${'#' + n.path}><${Icon} name=${n.icon} />${n.label}</a>`)}<button class="btn ghost" onClick=${() => setMore(false)}>Close</button></div></div>` : null}
    <${Toast} />
  </div>`;
}

render(html`<${App} />`, document.getElementById('root'));
store.init();
initPwa();
