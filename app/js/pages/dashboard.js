import { html, Icon, StatusPill, Empty, LineChart, fmtDate, initials, fmt, go, toast } from '../ui.js';
import * as store from '../store.js';
import { draftInsights } from '../insights.js';
import { ASSESSMENT_TYPES } from '../calc.js';
import { loadExamples } from '../examples.js';
import { squad, today, LEVEL } from '../monitor.js';

const KIND = { danger: ['alert', 't-red'], warn: ['alert', 't-amber'], good: ['trend', 't-green'], info: ['sparkle', 't-violet'] };
const TYPE_ICON = { full: 'clipboard', cardio: 'heart', strength_power: 'bolt', mobility_balance: 'move', rts: 'trend', baseline: 'pulse' };

export function Insight({ i }) {
  const [ic, cls] = KIND[i.kind] || KIND.info;
  return html`<div class="insight"><span class="ic ${cls}"><${Icon} name=${ic} size=${16} /></span><div><b>${i.title}</b><p>${i.text}</p></div></div>`;
}

const vo2Of = (a) => (a.results && a.results.items.find((i) => i.key === 'vo2')) || null;

export function Dashboard() {
  const s = store.getState();
  const name = s.settings.assessorName;
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const all = s.assessments.slice().sort((a, b) => (a.date + a.updatedAt < b.date + b.updatedAt ? 1 : -1));
  const monthStart = new Date().toISOString().slice(0, 8) + '01';
  const thisMonth = all.filter((a) => a.date >= monthStart).length;
  const toSign = all.filter((a) => a.status === 'calculated');
  const drafts = all.filter((a) => a.status === 'draft');

  const head = html`<div class="head"><div><div class="eyebrow">${new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</div><h1>${greet}${name ? ', ' + name : ''}.</h1><p>Assess clearly, measure consistently, and turn reliable data into better decisions.</p></div>
    <div class="row"><a class="btn" href="#/athletes/new"><${Icon} name="users" size=${16} />Add athlete</a><a class="btn primary" href="#/assess"><${Icon} name="plus" size=${16} />New assessment</a></div></div>`;

  if (!s.athletes.length) {
    return html`${head}<div class="card"><${Empty} icon="users" title="No athletes yet" text="Add your first athlete to start an assessment. Records stay on this device.">
      <div class="row" style="justify-content:center"><a class="btn primary" href="#/athletes/new">Add your first athlete</a><button class="btn" onClick=${async () => { await loadExamples(); toast('Example athletes loaded. Remove them any time in Settings.'); }}>Load example data</button></div></${Empty}></div>`;
  }

  // Featured: athlete with the latest calculated assessment.
  const latest = all.find((a) => a.results);
  const featured = latest ? store.getAthlete(latest.athleteId) : null;
  const history = featured ? store.assessmentsFor(featured.id).filter((a) => a.results) : [];
  const insights = latest ? draftInsights(latest.results, history.filter((h) => h.id !== latest.id)).slice(0, 4) : [];
  const vo2 = latest ? vo2Of(latest) : null;
  const pick = (k) => (latest && latest.results.items.find((i) => i.key === k)) || null;
  const grip = pick('grip'), jump = pick('jump'), sprint = pick('sprint');
  const vo2Series = history.map((h) => ({ a: h, i: vo2Of(h) })).filter((x) => x.i && vo2 && x.i.protocol_id === vo2.protocol_id).map((x) => ({ x: x.a.date, y: x.i.value }));
  const hasExamples = s.athletes.some((a) => a.example);
  const sq = squad();
  const openBy = (lv) => sq.reduce((n, x) => n + x.result.signals.filter((g) => g.open && g.level === lv).length, 0);
  const checkedIn = sq.filter((x) => s.checkins.some((c) => c.athleteId === x.athlete.id && c.date === today())).length;

  return html`${head}
  ${hasExamples ? html`<div class="notice" style="margin-bottom:16px"><${Icon} name="info" size=${16} /><div>Example athletes are loaded. Their values are invented. <a href="#/settings">Remove them in Settings</a>.</div></div>` : null}
  ${sq.length ? html`<div class="card monitor-strip" style="margin-bottom:16px"><div><h2>Today's monitoring</h2><p class="muted small">${checkedIn} of ${sq.length} athletes checked in · rules compare each athlete with their own baseline</p></div>
    <div class="row">${['urgent', 'review', 'watch', 'no_data'].map((lv) => html`<a class="level-count ${LEVEL[lv].cls}" href=${'#/signals?level=' + lv}><b>${openBy(lv)}</b>${LEVEL[lv].name}</a>`)}<a class="btn primary sm" href="#/checkin">Squad check-in</a></div></div>` : null}
  <div class="grid cols-4 stats">
    <div class="card stat"><span class="ic t-teal"><${Icon} name="users" /></span><div><div class="v">${s.athletes.length}</div><div class="l">Athletes</div></div></div>
    <div class="card stat"><span class="ic t-blue"><${Icon} name="clipboard" /></span><div><div class="v">${thisMonth}</div><div class="l">Assessments this month</div></div></div>
    <a class="card stat" href="#/reports?status=calculated" style="text-decoration:none;color:inherit"><span class="ic t-amber"><${Icon} name="file" /></span><div><div class="v">${toSign.length}</div><div class="l">Awaiting sign-off</div></div></a>
    <a class="card stat" href="#/reports?status=draft" style="text-decoration:none;color:inherit"><span class="ic t-violet"><${Icon} name="edit" /></span><div><div class="v">${drafts.length}</div><div class="l">Unfinished drafts</div></div></a>
  </div>

  <div class="grid cols-3" style="margin-top:16px">
    ${featured && latest ? html`<div class="card span-2">
      <div class="card-head"><div><h2>Latest results</h2><p>${featured.name} · ${fmtDate(latest.date)} · <${StatusPill} status=${latest.status} /></p></div><a class="btn sm" href=${'#/reports/' + latest.id}>Open report</a></div>
      <div class="grid cols-4">
        <div class="metric"><span class="n">VO₂ max ${vo2 ? '· ' + (vo2.label === 'measured' ? 'measured' : 'estimated') : ''}</span><span class="v">${vo2 ? fmt(vo2.value, 1) : '—'}<small>mL/kg/min</small></span><span class="n">${vo2 ? vo2.method : 'Not assessed'}</span></div>
        <div class="metric"><span class="n">Handgrip best</span><span class="v">${grip ? fmt(grip.value) : '—'}<small>kg</small></span><span class="n">${grip && grip.asymmetry_pct != null ? 'Side difference ' + grip.asymmetry_pct + '%' : 'Not assessed'}</span></div>
        <div class="metric"><span class="n">Vertical jump</span><span class="v">${jump ? fmt(jump.value) : '—'}<small>cm</small></span><span class="n">${jump ? 'Reach difference' : 'Not assessed'}</span></div>
        <div class="metric"><span class="n">Sprint best</span><span class="v">${sprint ? fmt(sprint.value, 2) : '—'}<small>s</small></span><span class="n">${sprint ? sprint.name.replace(' (best)', '') : 'Not assessed'}</span></div>
      </div>
      ${vo2Series.length > 1 ? html`<div><p class="muted small" style="margin-bottom:6px">VO₂ max on the same protocol (${vo2.method})</p><${LineChart} series=${[{ name: 'VO₂ max', points: vo2Series }]} unit="mL/kg/min" height=${180} /></div>` : null}
    </div>` : html`<div class="card span-2"><${Empty} icon="clipboard" title="No calculated results yet" text="Finish an assessment to see results here."><a class="btn primary" href="#/assess">Start an assessment</a></${Empty}></div>`}
    <div class="card">
      <div class="card-head"><div><h2>Draft observations</h2><p>Rule-based, from the latest results. Review before use.</p></div><span class="pill draft">Draft</span></div>
      ${insights.length ? insights.map((i) => html`<${Insight} i=${i} />`) : html`<p class="muted small">Nothing to flag from the latest results.</p>`}
    </div>
  </div>

  <div class="grid cols-3" style="margin-top:16px">
    <div class="card span-2">
      <div class="card-head"><div><h2>Recent assessments</h2><p>Open one to continue, review or sign off.</p></div><a href="#/reports" class="small">View all</a></div>
      <div class="table-wrap"><table><thead><tr><th>Athlete</th><th>Type</th><th>Date</th><th>Status</th><th>VO₂ max</th></tr></thead><tbody>
        ${all.slice(0, 6).map((a) => {
          const ath = store.getAthlete(a.athleteId);
          const v = vo2Of(a);
          const t = ASSESSMENT_TYPES.find((x) => x.id === a.type);
          return html`<tr class="link" onClick=${() => go(a.status === 'draft' ? '/assess/' + a.id : '/reports/' + a.id)}><td><div class="athlete-chip"><span class="avatar">${initials(ath && ath.name)}</span><div>${ath ? ath.name : 'Unknown athlete'}<div class="sub">${ath ? ath.id : ''}</div></div></div></td><td>${t ? t.name : a.type}</td><td class="num">${fmtDate(a.date)}</td><td><${StatusPill} status=${a.status} /></td><td class="num">${v ? fmt(v.value, 1) : '—'}</td></tr>`;
        })}
      </tbody></table></div>
    </div>
    <div class="card">
      <div class="card-head"><div><h2>Start an assessment</h2><p>Choose a guided workflow.</p></div></div>
      <div class="grid cols-2">${ASSESSMENT_TYPES.map((t) => html`<a class="tile-btn" href=${'#/assess?type=' + t.id}><${Icon} name=${TYPE_ICON[t.id]} /><span>${t.name}</span></a>`)}</div>
    </div>
  </div>`;
}
