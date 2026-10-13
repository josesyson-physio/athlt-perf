import { html, useState } from '../vendor/preact-htm.js';
import { Empty, LineChart, fmtDate, fmt, EvidencePill } from '../ui.js';
import * as store from '../store.js';
import { seriesFor } from './athletes.js';

const METRICS = [
  { key: 'vo2', name: 'VO₂ max', unit: 'mL/kg/min', byProtocol: true },
  { key: 'rest_hr', name: 'Resting heart rate', unit: 'bpm' },
  { key: 'hrr1', name: 'HR recovery at 1 min', unit: 'bpm' },
  { key: 'grip', name: 'Handgrip best', unit: 'kg' },
  { key: 'jump', name: 'Vertical jump', unit: 'cm' },
  { key: 'sprint', name: 'Sprint best', unit: 's' },
  { key: 'mass', name: 'Body mass', unit: 'kg' },
  { key: 'bmi', name: 'BMI', unit: 'kg/m²' },
];

export function Analytics({ query }) {
  const s = store.getState();
  const withData = s.athletes.filter((a) => store.assessmentsFor(a.id).some((x) => x.results)).sort((a, b) => a.name.localeCompare(b.name));
  const [athleteId, setAthleteId] = useState(query.get('athlete') || (withData[0] && withData[0].id) || '');
  const [metric, setMetric] = useState('vo2');
  if (!withData.length) return html`<div class="head"><div><div class="eyebrow">Trends</div><h1>Trends</h1></div></div><div class="card"><${Empty} icon="chart" title="No calculated assessments yet" text="Trends appear once an athlete has calculated results."><a class="btn primary" href="#/assess">Start an assessment</a></${Empty}></div>`;
  const m = METRICS.find((x) => x.key === metric);
  const h = store.assessmentsFor(athleteId).filter((x) => x.results);
  const series = seriesFor(h, m);
  const rows = h.map((x) => ({ a: x, i: x.results.items.find((y) => y.key === m.key) })).filter((x) => x.i);
  // Team view: latest value per athlete for this metric.
  const team = withData.map((ath) => { const last = store.assessmentsFor(ath.id).filter((x) => x.results).map((x) => ({ x, i: x.results.items.find((y) => y.key === m.key) })).find((y) => y.i); return last ? { ath, ...last } : null; }).filter(Boolean);
  return html`<div class="head"><div><div class="eyebrow">Trends</div><h1>Performance trends</h1><p>Track change without hiding test methods. Results from different protocols are drawn as separate lines and never joined.</p></div></div>
  <div class="card">
    <div class="row">
      <div class="inp"><select aria-label="Athlete" value=${athleteId} onChange=${(e) => setAthleteId(e.target.value)}>${withData.map((a) => html`<option value=${a.id}>${a.name}</option>`)}</select></div>
      <div class="inp"><select aria-label="Metric" value=${metric} onChange=${(e) => setMetric(e.target.value)}>${METRICS.map((x) => html`<option value=${x.key}>${x.name}</option>`)}</select></div>
    </div>
    <${LineChart} series=${series} unit=${m.unit} height=${260} />
    ${rows.length ? html`<div class="table-wrap"><table><thead><tr><th>Date</th><th>Value</th><th>Evidence</th><th>Method</th><th>Change</th></tr></thead><tbody>
      ${rows.map((r, j) => { const older = rows.slice(j + 1).find((o) => o.i.method === r.i.method); const d = older ? Math.round((r.i.value - older.i.value) * 100) / 100 : null; return html`<tr><td class="num">${fmtDate(r.a.date)}</td><td class="num">${fmt(r.i.value, m.unit === 's' ? 2 : null)} ${m.unit}</td><td><${EvidencePill} label=${r.i.label} /></td><td class="small muted">${r.i.method || r.i.formula}</td><td class="num">${d == null ? '—' : (d > 0 ? '+' : '') + d}</td></tr>`; })}
    </tbody></table></div>` : html`<p class="muted small">No ${m.name.toLowerCase()} results for this athlete.</p>`}
  </div>
  <div class="card" style="margin-top:16px"><div class="card-head"><div><h2>Squad: latest ${m.name.toLowerCase()}</h2><p>Each athlete’s most recent result and how it was obtained. Compare across athletes only when the method matches.</p></div></div>
    <div class="table-wrap"><table><thead><tr><th>Athlete</th><th>Date</th><th>Value</th><th>Evidence</th><th>Method</th></tr></thead><tbody>
      ${team.map((t) => html`<tr class="link" onClick=${() => setAthleteId(t.ath.id)}><td>${t.ath.name}</td><td class="num">${fmtDate(t.x.date)}</td><td class="num">${fmt(t.i.value, m.unit === 's' ? 2 : null)} ${m.unit}</td><td><${EvidencePill} label=${t.i.label} /></td><td class="small muted">${t.i.method || ''}</td></tr>`)}
    </tbody></table></div></div>`;
}
