import { html, useState } from '../vendor/preact-htm.js';
import { Icon, Field, Check, Empty, StatusPill, EvidencePill, Notice, fmtDate, initials, fmt, go, toast } from '../ui.js';
import * as store from '../store.js';
import { ASSESSMENT_TYPES, DOMAINS } from '../calc.js';
import { draftInsights } from '../insights.js';

const DOMAIN_NAME = Object.assign({ vitals: 'Resting vitals', body: 'Body measures' }, Object.fromEntries(DOMAINS.map((d) => [d.id, d.name])));

export function Reports({ query }) {
  const s = store.getState();
  const [status, setStatus] = useState(query.get('status') || '');
  const list = s.assessments.filter((a) => !status || a.status === status).sort((a, b) => (a.date + a.updatedAt < b.date + b.updatedAt ? 1 : -1));
  const counts = (st) => s.assessments.filter((a) => a.status === st).length;
  return html`<div class="head"><div><div class="eyebrow">Reports</div><h1>Assessments and reports</h1><p>Continue drafts, review calculated results and sign off reports.</p></div><a class="btn primary" href="#/assess"><${Icon} name="plus" size=${16} />New assessment</a></div>
  <div class="card">
    <div class="seg" role="group" aria-label="Filter by status">${[['', 'All', s.assessments.length], ['draft', 'Drafts', counts('draft')], ['calculated', 'Awaiting sign-off', counts('calculated')], ['approved', 'Signed off', counts('approved')]].map(([v, l, n]) => html`<button type="button" aria-pressed=${String(status === v)} onClick=${() => setStatus(v)}>${l} <span class="mono">${n}</span></button>`)}</div>
    ${list.length ? html`<div class="table-wrap"><table><thead><tr><th>Athlete</th><th>Type</th><th>Date</th><th>Assessor</th><th>Status</th><th></th></tr></thead><tbody>
      ${list.map((a) => {
        const ath = store.getAthlete(a.athleteId);
        const t = ASSESSMENT_TYPES.find((x) => x.id === a.type);
        const href = a.status === 'draft' ? '#/assess/' + a.id : '#/reports/' + a.id;
        return html`<tr class="link" onClick=${() => (location.hash = href)}><td><div class="athlete-chip"><span class="avatar">${initials(ath && ath.name)}</span><div>${ath ? ath.name : 'Unknown'}<div class="sub mono">${a.id}</div></div></div></td><td>${t ? t.name : a.type}</td><td class="num">${fmtDate(a.date)}</td><td>${a.assessor || '—'}</td><td><${StatusPill} status=${a.status} /></td><td><a class="btn sm" href=${href}>${a.status === 'draft' ? 'Continue' : a.status === 'calculated' ? 'Review' : 'Open'}</a></td></tr>`;
      })}</tbody></table></div>` : html`<${Empty} icon="file" title="Nothing here yet" text=${status ? 'No assessments with this status.' : 'Start an assessment to create a report.'} />`}
  </div>`;
}

function valueText(i) {
  if (typeof i.value === 'number') return fmt(i.value, i.unit === 's' ? 2 : null) + ' ' + i.unit;
  if (i.value != null) return i.value + ' ' + i.unit;
  if (i.left != null || i.right != null) return 'L ' + (i.left ?? '—') + ' · R ' + (i.right ?? '—') + ' ' + i.unit;
  return '—';
}

function detailText(i) {
  const bits = [];
  if (i.range) bits.push('typical range ' + i.range[0] + ' to ' + i.range[1]);
  if (i.left && i.left.best != null) bits.push('L best ' + i.left.best + ', R best ' + (i.right ? i.right.best : '—') + (i.asymmetry_pct != null ? ', side difference ' + i.asymmetry_pct + '%' : ''));
  if (i.trials && i.key === 'jump') bits.push('trials ' + i.trials.join(', ') + ' cm');
  if (i.trials && i.key === 'sprint') bits.push('trials ' + i.trials.join(', ') + ' s' + (i.speed_m_s ? ', ' + i.speed_m_s + ' m/s' : '') + (i.decrement_pct != null ? ', decrement ' + i.decrement_pct + '%' : ''));
  if (i.difference != null) bits.push('difference ' + i.difference + ' ' + i.unit);
  if (i.interval_s) bits.push('at ' + i.interval_s + ' s');
  if (i.note) bits.push(i.note);
  (i.flags || []).forEach((f) => bits.push(f));
  return bits.join('; ');
}

export function Report({ id }) {
  const a = store.getAssessment(id);
  const s = store.getState();
  const [notes, setNotes] = useState(a ? a.report.notes : '');
  const [signer, setSigner] = useState(s.settings.assessorName || (a && a.assessor) || '');
  const [attest, setAttest] = useState(false);
  const [confirm, setConfirm] = useState('');
  if (!a) return html`<div class="card"><${Empty} icon="file" title="Report not found" text="This assessment may have been deleted."><a href="#/reports">All reports</a></${Empty}></div>`;
  const athlete = store.getAthlete(a.athleteId);
  if (a.status === 'draft' || !a.results) return html`<div class="card"><${Empty} icon="edit" title="This assessment is still a draft" text="Finish it and calculate results to create the report."><a class="btn primary" href=${'#/assess/' + a.id}>Continue assessment</a></${Empty}></div>`;
  const r = a.results;
  const prev = athlete ? store.assessmentsFor(athlete.id).filter((x) => x.id !== a.id && x.results && x.date <= a.date) : [];
  const insights = draftInsights(r, prev);
  const t = ASSESSMENT_TYPES.find((x) => x.id === a.type);
  const locked = a.status === 'approved';
  const age = athlete ? store.ageAt(athlete, a.date) : null;
  const vo2 = r.items.find((i) => i.key === 'vo2');
  const headline = ['vo2', 'hrr1', 'grip', 'jump', 'sprint', 'rest_hr'].map((k) => r.items.find((i) => i.key === k)).filter(Boolean).slice(0, 4);
  const domains = ['vitals', 'body'].concat(a.domains);

  const saveNotes = async () => { await store.saveAssessment(Object.assign({}, a, { report: Object.assign({}, a.report, { notes }) }), 'Assessor notes edited'); toast('Notes saved.'); };
  const approve = async () => {
    await store.saveAssessment(Object.assign({}, a, { status: 'approved', report: { notes, approvedBy: signer.trim(), approvedAt: new Date().toISOString() } }), 'Report signed off by ' + signer.trim());
    toast('Report signed off.');
  };
  const reopen = async () => { await store.saveAssessment(Object.assign({}, a, { status: 'draft', report: Object.assign({}, a.report, { approvedBy: '', approvedAt: '' }) }), 'Reopened for correction'); setConfirm(''); go('/assess/' + a.id + '?step=0'); };
  const del = async () => { await store.deleteAssessment(a.id); toast('Assessment deleted.'); go('/reports'); };

  return html`<div class="head no-print"><div><div class="eyebrow">${a.id} · <${StatusPill} status=${a.status} /></div><h1>Assessment report</h1><p>Check the evidence labels and limitations, add your interpretation, then sign it off.</p></div>
    <div class="row"><button class="btn" onClick=${() => window.print()}><${Icon} name="print" size=${16} />Print or save PDF</button>${!locked ? html`<a class="btn" href=${'#/assess/' + a.id + '?step=0'}><${Icon} name="edit" size=${16} />Edit data</a>` : null}</div></div>

  <article class="report">
    <header class="spread" style="align-items:flex-start">
      <div><div class="rmuted" style="font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;font-weight:700">${s.settings.clinicName || 'MotionPlus'} · Sports assessment report</div><h1 style="margin-top:6px">${athlete ? athlete.name : 'Unknown athlete'}</h1>
        <p class="rmuted">${[athlete && athlete.id, age != null ? age + ' years' : null, athlete && athlete.sex, athlete && athlete.sport, athlete && athlete.position].filter(Boolean).join(' · ')}</p></div>
      <div style="text-align:right" class="rmuted small"><div><b style="color:#0d1720">${t ? t.name : a.type}</b></div><div>${fmtDate(a.date)} · ${a.assessor || 'Assessor not recorded'}</div><div>${locked ? 'Signed off by ' + a.report.approvedBy + ', ' + fmtDate(a.report.approvedAt) : 'DRAFT: not yet signed off'}</div></div>
    </header>

    ${headline.length ? html`<section class="rtiles">${headline.map((i) => html`<div class="rtile"><div class="rmuted small">${i.name}</div><div class="v">${typeof i.value === 'number' ? fmt(i.value, i.unit === 's' ? 2 : null) : i.value}<span class="rmuted" style="font-size:.75rem;font-weight:400"> ${i.unit}</span></div><${EvidencePill} label=${i.label} /></div>`)}</section>` : null}
    ${vo2 ? html`<p class="note">VO₂ max ${vo2.label === 'measured' ? 'was measured by gas analysis' : 'is a field-test estimate from the ' + vo2.method + ', not a laboratory gas-analysis measurement'}.${vo2.range ? ' Typical range for this method: ' + vo2.range[0] + ' to ' + vo2.range[1] + ' mL/kg/min.' : ''} No rating or percentile is shown because no matched reference population has been set up.</p>` : null}

    ${r.safety.length || !r.screening.allowed ? html`<section><h2>Safety and screening</h2>${!r.screening.allowed ? html`<p class="note">${r.screening.reason} Exercise-based results were not calculated.</p>` : null}${r.safety.map((f) => html`<p class="note">${f.text}</p>`)}</section>` : null}

    <section><h2>Results</h2><div class="table-wrap"><table><thead><tr><th>Area</th><th>Result</th><th>Value</th><th>Evidence</th><th>Method and detail</th></tr></thead><tbody>
      ${domains.flatMap((d) => r.items.filter((i) => i.domain === d).map((i, j) => html`<tr><td class="rmuted">${j === 0 ? DOMAIN_NAME[d] : ''}</td><td>${i.name}</td><td class="num" style="white-space:nowrap">${valueText(i)}</td><td><${EvidencePill} label=${i.label} /></td><td class="small rmuted">${[i.method, detailText(i)].filter(Boolean).join('. ')}</td></tr>`))}
    </tbody></table></div>
    ${r.missing.length ? html`<p class="note"><b>Not available:</b> ${r.missing.join('; ')}.</p>` : null}</section>

    <section><h2>Draft observations</h2><p class="rmuted small" style="margin-bottom:8px">Generated by fixed rules from the values above. They contain no new numbers and are for the assessor to accept, edit or ignore.</p>
      ${insights.length ? html`<ul style="margin:0;padding-left:18px;display:grid;gap:6px">${insights.map((i) => html`<li><b>${i.title}.</b> ${i.text}</li>`)}</ul>` : html`<p class="rmuted">No observations.</p>`}</section>

    <section><h2>Assessor interpretation and plan</h2>
      ${locked ? html`<p style="white-space:pre-wrap">${a.report.notes || 'No notes recorded.'}</p>` : html`<div class="no-print grid" style="gap:8px"><div class="inp" style="background:#fff;border-color:#cfd8df"><textarea aria-label="Assessor interpretation and plan" style="color:#14202b;min-height:120px" value=${notes} onInput=${(e) => setNotes(e.target.value)} placeholder="Interpretation, training priorities, retest date…"></textarea></div><div><button class="btn sm" style="background:#14202b" onClick=${saveNotes}>Save notes</button></div></div><p class="print-only" style="white-space:pre-wrap">${notes}</p>`}
    </section>

    <section><h2>Protocol and conditions</h2><table><tbody>
      ${[['Location and surface', [a.context.location, a.context.surface].filter(Boolean).join(', ') || '—'], ['Conditions', [a.context.tempC !== '' && a.context.tempC != null ? a.context.tempC + ' °C' : null, a.context.humidity !== '' && a.context.humidity != null ? a.context.humidity + '% humidity' : null].filter(Boolean).join(', ') || '—'], ['Equipment', a.context.equipment || '—'], ['Screening', (a.screening.consent ? 'Consent recorded' : 'No consent recorded') + '; decision: ' + (a.screening.decision || 'none') + (a.screening.clinicianCleared ? '; cleared by ' + (a.screening.clearedBy || 'clinician') : '')], ['Aerobic test notes', a.cardio.notes || '—'], ['Readiness', [a.vitals.sleepH ? a.vitals.sleepH + ' h sleep' : null, a.vitals.lastHard ? 'last hard session ' + a.vitals.lastHard.toLowerCase() : null, a.vitals.caffeine ? 'caffeine: ' + a.vitals.caffeine.toLowerCase() : null, a.vitals.notes].filter(Boolean).join('; ') || '—']].map(([k, v]) => html`<tr><td class="rmuted" style="width:30%">${k}</td><td>${v}</td></tr>`)}
    </tbody></table></section>

    <section><h2>Limitations</h2><ul class="small rmuted" style="margin:0;padding-left:18px;display:grid;gap:4px">
      <li>Estimated values come from prediction equations and carry the error shown for each method.</li>
      <li>Changes between sessions can reflect measurement error, fatigue, familiarity with the test or conditions, not only real adaptation.</li>
      <li>This report supports professional judgment. It is not a diagnosis or medical clearance.</li></ul></section>

    <details class="no-print"><summary>Calculation record</summary><pre class="raw">${JSON.stringify({ versions: r.versions, calculated_at: r.calculated_at, formulas: r.items.map((i) => ({ result: i.name, formula: i.formula, version: i.version })), audit: a.audit }, null, 2)}</pre></details>
    <footer class="rmuted small spread"><span>${a.id} · calculated ${fmtDate(r.calculated_at)} · ${r.versions.engine}, ${r.versions.metrics}</span><span>${locked ? 'Signed: ' + a.report.approvedBy : 'Unsigned draft'}</span></footer>
  </article>

  <div class="no-print" style="margin-top:16px">
    ${!locked ? html`<div class="card"><h2>Sign off</h2>
      <${Notice} kind="info">By signing you confirm you checked the raw entries, test validity, calculated outputs and interpretation.</${Notice}>
      <div class="fields"><${Field} label="Your name and role" value=${signer} onInput=${setSigner} /></div>
      <${Check} label="I have reviewed this report and accept responsibility for its interpretation" checked=${attest} onChange=${setAttest} />
      <div class="row"><button class="btn primary" disabled=${!attest || !signer.trim()} onClick=${approve}><${Icon} name="check" size=${16} />Sign off report</button></div></div>`
    : html`<div class="card"><div class="spread"><div><h2>Signed off</h2><p class="muted small">By ${a.report.approvedBy} on ${fmtDate(a.report.approvedAt)}. The report is locked.</p></div>
      ${confirm === 'reopen' ? html`<div class="row"><span class="small">Reopening removes the sign-off and is recorded in the history.</span><button class="btn" onClick=${reopen}>Reopen for correction</button><button class="btn ghost" onClick=${() => setConfirm('')}>Cancel</button></div>` : html`<button class="btn" onClick=${() => setConfirm('reopen')}>Reopen for correction</button>`}</div></div>`}
    <div class="row" style="margin-top:12px">${confirm === 'delete' ? html`<span class="small">Delete this assessment from this device? This cannot be undone.</span><button class="btn danger" onClick=${del}>Delete permanently</button><button class="btn ghost" onClick=${() => setConfirm('')}>Keep</button>` : html`<button class="btn danger sm" onClick=${() => setConfirm('delete')}><${Icon} name="trash" size=${14} />Delete assessment</button>`}</div>
  </div>`;
}
