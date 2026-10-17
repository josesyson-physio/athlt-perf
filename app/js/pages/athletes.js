import { html, useState } from '../vendor/preact-htm.js';
import { Icon, Field, Check, Empty, StatusPill, LineChart, fmtDate, initials, fmt, go, toast, has } from '../ui.js';
import * as store from '../store.js';
import { ASSESSMENT_TYPES } from '../calc.js';
import { MonitorCard, LevelPill } from './monitor.js';
import { canMonitor, evaluateAthlete } from '../monitor.js';

const SPORTS = ['', 'Football', 'Cricket', 'Basketball', 'Athletics', 'Hockey', 'Kabaddi', 'Badminton', 'Tennis', 'Swimming', 'Rugby', 'Volleyball', 'Other'];
const LEVELS = ['', 'Recreational', 'School / youth', 'Club', 'Semi-professional', 'State', 'National', 'International'];

export function Athletes({ query }) {
  const s = store.getState();
  const [q, setQ] = useState(query.get('q') || '');
  const [sport, setSport] = useState('');
  const term = q.trim().toLowerCase();
  const list = s.athletes
    .filter((a) => !term || [a.name, a.id, a.sport, a.position].join(' ').toLowerCase().includes(term))
    .filter((a) => !sport || a.sport === sport)
    .sort((a, b) => a.name.localeCompare(b.name));
  const sports = [...new Set(s.athletes.map((a) => a.sport).filter(Boolean))].sort();
  return html`<div class="head"><div><div class="eyebrow">Athlete management</div><h1>Athletes</h1><p>Profiles, assessment history and context in one searchable list.</p></div><a class="btn primary" href="#/athletes/new"><${Icon} name="plus" size=${16} />Add athlete</a></div>
  <div class="card">
    <div class="row">
      <div class="inp" style="flex:1;min-width:200px"><input aria-label="Search athletes" placeholder="Search by name, ID, sport or position" value=${q} onInput=${(e) => setQ(e.target.value)} /></div>
      <div class="inp"><select aria-label="Filter by sport" value=${sport} onChange=${(e) => setSport(e.target.value)}><option value="">All sports</option>${sports.map((x) => html`<option value=${x}>${x}</option>`)}</select></div>
    </div>
    ${!s.athletes.length ? html`<${Empty} icon="users" title="No athletes yet" text="Add an athlete to start assessing."><a class="btn primary" href="#/athletes/new">Add athlete</a></${Empty}>`
    : !list.length ? html`<${Empty} icon="search" title="No matches" text="Try a different name, ID or sport." />`
    : html`<div class="table-wrap"><table><thead><tr><th>Athlete</th><th>Sport / position</th><th>Age</th><th>Monitoring</th><th>Last assessment</th><th>Assessments</th><th></th></tr></thead><tbody>
      ${list.map((a) => {
        const h = store.assessmentsFor(a.id);
        return html`<tr class="link" onClick=${(e) => !e.target.closest('a') && go('/athletes/' + a.id)}>
          <td><div class="athlete-chip"><span class="avatar">${initials(a.name)}</span><div>${a.name} ${a.example ? html`<span class="pill example">Example</span>` : null}<div class="sub mono">${a.id}</div></div></div></td>
          <td>${a.sport || '—'}<div class="sub">${a.position || ''}</div></td>
          <td class="num">${store.ageAt(a) ?? '—'}</td>
          <td>${canMonitor(a) ? html`<${LevelPill} level=${evaluateAthlete(a).status} />` : html`<span class="muted small">Not set up</span>`}</td>
          <td>${h[0] ? html`${fmtDate(h[0].date)} <${StatusPill} status=${h[0].status} />` : html`<span class="muted">Not assessed</span>`}</td>
          <td class="num">${h.length}</td>
          <td><a class="btn sm" href=${'#/assess?athlete=' + a.id}>Assess</a></td></tr>`;
      })}</tbody></table></div>`}
  </div>`;
}

export function AthleteForm({ id }) {
  const existing = id ? store.getAthlete(id) : null;
  const [f, setF] = useState(() => existing ? JSON.parse(JSON.stringify(existing)) : { name: '', dob: '', age: '', sex: '', heightCm: '', massKg: '', sport: '', position: '', level: '', dominantSide: '', medicalNotes: '', medications: '', consentOnFile: false, monitorConsent: false, monitorConsentBy: '', monitorConsentDate: '', monitorAssent: false });
  const [reason, setReason] = useState('');
  const [tried, setTried] = useState(false);
  const set = (k) => (v) => setF(Object.assign({}, f, { [k]: v }));
  if (id && !existing) return html`<div class="card"><${Empty} icon="users" title="Athlete not found" text="This athlete may have been deleted." /></div>`;
  const errors = [];
  if (!f.name.trim()) errors.push('Name');
  if (!has(f.dob) && !has(f.age)) errors.push('Date of birth or age');
  if (existing && !reason.trim()) errors.push('Reason for the edit');
  if (f.monitorConsent && (!f.monitorConsentBy || !f.monitorConsentDate)) errors.push('Who gave monitoring consent and when');
  if (f.monitorConsent && f.monitorConsentBy === 'Athlete (18 or over)' && store.ageAt(f) != null && store.ageAt(f) < 18) errors.push('Parent or guardian consent for an athlete under 18');
  const save = async (e) => {
    e.preventDefault();
    setTried(true);
    if (errors.length) return;
    const rec = await store.saveAthlete(f, reason.trim());
    toast(existing ? 'Profile updated.' : 'Athlete added.');
    go('/athletes/' + rec.id);
  };
  return html`<form onSubmit=${save} novalidate>
    <div class="head"><div><div class="eyebrow">${existing ? existing.id : 'New athlete'}</div><h1>${existing ? 'Edit ' + existing.name : 'Add athlete'}</h1><p>Collect only what the assessment and its equations need.</p></div></div>
    <div class="grid" style="max-width:980px">
      <div class="card"><h2>Identity</h2><div class="fields">
        <${Field} label="Full name" value=${f.name} onInput=${set('name')} required warn=${tried && !f.name.trim() ? 'Enter a name.' : ''} />
        <${Field} label="Date of birth" type="date" value=${f.dob} onInput=${set('dob')} hint="Preferred. Age updates automatically." />
        <${Field} label="Age (if no date of birth)" type="number" unit="years" min=${8} max=${90} value=${f.age} onInput=${set('age')} warn=${tried && !has(f.dob) && !has(f.age) ? 'Enter a date of birth or age.' : ''} />
        <${Field} label="Sex used by equations" value=${f.sex} onInput=${set('sex')} options=${[{ value: '', label: 'Not recorded' }, { value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} hint="Some VO₂ equations need it. Leave blank if not relevant." />
      </div></div>
      <div class="card"><h2>Body and sport</h2><div class="fields">
        <${Field} label="Height" type="number" unit="cm" min=${120} max=${230} value=${f.heightCm} onInput=${set('heightCm')} hint="Measure again on each assessment day." />
        <${Field} label="Body mass" type="number" unit="kg" min=${25} max=${200} value=${f.massKg} onInput=${set('massKg')} />
        <${Field} label="Sport" value=${f.sport} onInput=${set('sport')} options=${SPORTS} />
        <${Field} label="Position / event" value=${f.position} onInput=${set('position')} />
        <${Field} label="Training level" value=${f.level} onInput=${set('level')} options=${LEVELS} />
        <${Field} label="Dominant side" value=${f.dominantSide} onInput=${set('dominantSide')} options=${['', 'Right', 'Left', 'Both']} />
      </div></div>
      <div class="card"><h2>Health and screening context</h2><div class="fields" style="grid-template-columns:repeat(auto-fill,minmax(260px,1fr))">
        <${Field} label="Relevant injury and medical history" type="textarea" value=${f.medicalNotes} onInput=${set('medicalNotes')} />
        <${Field} label="Medications that affect heart rate" type="textarea" value=${f.medications} onInput=${set('medications')} hint="For example beta-blockers. These change how HR results can be read." />
      </div>
      <${Check} label="Signed consent for assessment and data storage is on file" checked=${f.consentOnFile} onChange=${set('consentOnFile')} /></div>
      <div class="card"><h2>Monitoring consent</h2><p class="muted small">Daily check-ins and weekly health questions need their own consent. Under 18, a parent or guardian consents and the athlete agrees (assent). Either can withdraw at any time, and flags never decide selection.</p>
        <div class="fields"><${Field} label="Consent given by" value=${f.monitorConsentBy || ''} onInput=${set('monitorConsentBy')} options=${['', 'Athlete (18 or over)', 'Parent or guardian']} /><${Field} label="Date of consent" type="date" value=${f.monitorConsentDate || ''} onInput=${set('monitorConsentDate')} /></div>
        <${Check} label="Signed consent for daily monitoring is on file" checked=${!!f.monitorConsent} onChange=${set('monitorConsent')} />
        ${(() => { const age = store.ageAt(f); return age == null || age < 18 ? html`<${Check} label="The athlete has agreed (assent) to daily monitoring" checked=${!!f.monitorAssent} onChange=${set('monitorAssent')} />` : null; })()}
        ${f.monitorConsent && f.monitorConsentBy === 'Athlete (18 or over)' && store.ageAt(f) != null && store.ageAt(f) < 18 ? html`<div class="notice warn">This athlete is under 18. A parent or guardian must give consent.</div>` : null}</div>
      ${existing ? html`<div class="card"><h2>Reason for this edit</h2><${Field} label="Kept in the profile history" value=${reason} onInput=${setReason} placeholder="For example: corrected date of birth from ID" warn=${tried && !reason.trim() ? 'Enter a reason so the change can be traced.' : ''} /></div>` : null}
      ${tried && errors.length ? html`<div class="notice warn">Still needed: ${errors.join(', ')}.</div>` : null}
      <div class="row"><button class="btn primary" type="submit">${existing ? 'Save changes' : 'Add athlete'}</button><a class="btn ghost" href=${existing ? '#/athletes/' + existing.id : '#/athletes'}>Cancel</a></div>
    </div></form>`;
}

const METRICS = [
  { key: 'vo2', name: 'VO₂ max', unit: 'mL/kg/min', byProtocol: true },
  { key: 'rest_hr', name: 'Resting HR', unit: 'bpm' },
  { key: 'hrr1', name: 'HR recovery 1 min', unit: 'bpm' },
  { key: 'grip', name: 'Handgrip best', unit: 'kg' },
  { key: 'jump', name: 'Vertical jump', unit: 'cm' },
  { key: 'sprint', name: 'Sprint best', unit: 's' },
  { key: 'mass', name: 'Body mass', unit: 'kg' },
];

export function seriesFor(assessments, metric) {
  const rows = assessments.filter((a) => a.results).map((a) => ({ a, i: a.results.items.find((x) => x.key === metric.key) })).filter((x) => x.i && typeof x.i.value === 'number');
  if (!metric.byProtocol) return rows.length ? [{ name: metric.name, points: rows.map((r) => ({ x: r.a.date, y: r.i.value })) }] : [];
  const groups = {};
  rows.forEach((r) => { (groups[r.i.method] = groups[r.i.method] || []).push({ x: r.a.date, y: r.i.value }); });
  return Object.entries(groups).map(([name, points]) => ({ name, points }));
}

export function AthleteProfile({ id }) {
  const a = store.getAthlete(id);
  const [metric, setMetric] = useState('vo2');
  const [confirmDel, setConfirmDel] = useState(false);
  if (!a) return html`<div class="card"><${Empty} icon="users" title="Athlete not found" text="This athlete may have been deleted."><a href="#/athletes">Back to athletes</a></${Empty}></div>`;
  const h = store.assessmentsFor(a.id);
  const m = METRICS.find((x) => x.key === metric);
  const series = seriesFor(h, m);
  const age = store.ageAt(a);
  return html`<div class="head"><div class="athlete-chip"><span class="avatar lg">${initials(a.name)}</span><div><div class="eyebrow">${a.id}${a.example ? ' · Example' : ''}</div><h1>${a.name}</h1><p>${[age != null ? age + ' years' : null, a.heightCm ? a.heightCm + ' cm' : null, a.massKg ? a.massKg + ' kg' : null, a.sport, a.position].filter(Boolean).join(' · ')}</p></div></div>
    <div class="row"><a class="btn" href=${'#/athletes/' + a.id + '/edit'}><${Icon} name="edit" size=${16} />Edit</a><a class="btn primary" href=${'#/assess?athlete=' + a.id}><${Icon} name="plus" size=${16} />New assessment</a></div></div>
  ${!a.consentOnFile ? html`<div class="notice warn" style="margin-bottom:16px"><${Icon} name="alert" size=${16} /><div>No signed consent is recorded on this profile. Record consent in each assessment before testing.</div></div>` : null}
  <div class="grid cols-3">
    <div class="card span-2">
      <div class="card-head"><div><h2>Trend</h2><p>${m.byProtocol ? 'Each protocol is a separate line. Results from different protocols are not comparable.' : 'Only calculated assessments are shown.'}</p></div>
        <div class="inp"><select aria-label="Metric" value=${metric} onChange=${(e) => setMetric(e.target.value)}>${METRICS.map((x) => html`<option value=${x.key}>${x.name}</option>`)}</select></div></div>
      <${LineChart} series=${series} unit=${m.unit} />
    </div>
    <div class="card"><h2>Profile</h2>
      <dl class="grid" style="gap:10px;margin:0">
        ${[['Sex used by equations', a.sex || 'Not recorded'], ['Training level', a.level || '—'], ['Dominant side', a.dominantSide || '—'], ['Medical history', a.medicalNotes || 'None recorded'], ['HR-affecting medication', a.medications || 'None recorded'], ['Consent on file', a.consentOnFile ? 'Yes' : 'No'], ['Monitoring consent', a.monitorConsent ? (a.monitorConsentBy || 'Yes') + (a.monitorConsentDate ? ', ' + fmtDate(a.monitorConsentDate) : '') + (canMonitor(a) ? '' : ' (assent not recorded)') : 'Not recorded']].map(([k, v]) => html`<div><dt class="muted small">${k}</dt><dd style="margin:0">${v}</dd></div>`)}
      </dl>
      <details><summary>Profile history (${(a.history || []).length})</summary><ul class="small muted" style="padding-left:18px">${(a.history || []).slice().reverse().map((x) => html`<li>${fmtDate(x.at)}: ${x.change}${x.reason ? ' (' + x.reason + ')' : ''} · ${x.by}</li>`)}</ul></details>
    </div>
  </div>
  <${MonitorCard} athlete=${a} />
  <div class="card" style="margin-top:16px">
    <div class="card-head"><h2>Assessment history</h2></div>
    ${h.length ? html`<div class="table-wrap"><table><thead><tr><th>Date</th><th>Type</th><th>Assessor</th><th>Status</th><th>VO₂ max</th><th>Grip</th><th>Jump</th></tr></thead><tbody>
      ${h.map((x) => {
        const g = (k, dp) => { const i = x.results && x.results.items.find((y) => y.key === k); return i ? fmt(i.value, dp) : '—'; };
        const t = ASSESSMENT_TYPES.find((y) => y.id === x.type);
        return html`<tr class="link" onClick=${() => go(x.status === 'draft' ? '/assess/' + x.id : '/reports/' + x.id)}><td class="num">${fmtDate(x.date)}</td><td>${t ? t.name : x.type}</td><td>${x.assessor || '—'}</td><td><${StatusPill} status=${x.status} /></td><td class="num">${g('vo2', 1)}</td><td class="num">${g('grip')}</td><td class="num">${g('jump')}</td></tr>`;
      })}</tbody></table></div>` : html`<${Empty} icon="clipboard" title="No assessments yet"><a class="btn primary" href=${'#/assess?athlete=' + a.id}>Start the first assessment</a></${Empty}>`}
  </div>
  <div class="row" style="margin-top:16px">${confirmDel
    ? html`<span class="small">Delete ${a.name} and all ${h.length} assessments from this device? This cannot be undone.</span><button class="btn danger" onClick=${async () => { await store.deleteAthlete(a.id); toast('Athlete deleted.'); go('/athletes'); }}>Delete permanently</button><button class="btn ghost" onClick=${() => setConfirmDel(false)}>Keep</button>`
    : html`<button class="btn danger sm" onClick=${() => setConfirmDel(true)}><${Icon} name="trash" size=${14} />Delete athlete</button>`}</div>`;
}
