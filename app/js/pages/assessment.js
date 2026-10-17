import { html, useState, useEffect, useRef } from '../vendor/preact-htm.js';
import { Icon, Field, Check, Seg, Trials, Notice, Empty, EvidencePill, fmtDate, initials, fmt, go, toast, has } from '../ui.js';
import * as store from '../store.js';
import { ASSESSMENT_TYPES, DOMAINS, calculate, screeningDecision } from '../calc.js';

const E = () => globalThis.MotionPlusEngine;
const M = () => globalThis.MotionPlusMetrics;

export const SCREEN_QUESTIONS = [
  'Chest pain or pressure at rest or during activity',
  'Fainting, near-fainting or dizziness with exercise',
  'Breathlessness out of proportion to effort',
  'Racing, skipping or irregular heartbeat',
  'Known heart, lung, kidney or metabolic condition (including diabetes)',
  'Fever, infection or acute illness in the last 2 weeks',
  'A doctor has advised limiting physical activity',
  'Current injury or pain that affects running, jumping or gripping',
];

// ---------- start screen ----------
export function NewAssessment({ query }) {
  const s = store.getState();
  const [athleteId, setAthleteId] = useState(query.get('athlete') || '');
  const [type, setType] = useState(query.get('type') || 'full');
  const [q, setQ] = useState('');
  const drafts = s.assessments.filter((a) => a.status === 'draft');
  if (!s.athletes.length) return html`<div class="head"><div><div class="eyebrow">New assessment</div><h1>Start an assessment</h1></div></div><div class="card"><${Empty} icon="users" title="Add an athlete first" text="Every assessment belongs to an athlete profile."><a class="btn primary" href="#/athletes/new">Add athlete</a></${Empty}></div>`;
  const list = s.athletes.filter((a) => !q || (a.name + a.id + a.sport).toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name));
  const t = ASSESSMENT_TYPES.find((x) => x.id === type) || ASSESSMENT_TYPES[0];
  const start = async () => {
    const a = store.newAssessment(athleteId, t.id, t.domains.slice());
    await store.saveAssessment(a, 'Draft created');
    go('/assess/' + a.id);
  };
  return html`<div class="head"><div><div class="eyebrow">New assessment</div><h1>Start an assessment</h1><p>Pick the athlete and the type of assessment. You can add or remove test areas on the next screen.</p></div></div>
  ${drafts.length ? html`<div class="notice info" style="margin-bottom:16px"><${Icon} name="edit" size=${16} /><div>${drafts.length} unfinished draft${drafts.length > 1 ? 's' : ''}. <a href="#/reports?status=draft">Continue a draft</a></div></div>` : null}
  <div class="grid cols-2">
    <div class="card"><h2>1. Athlete</h2>
      <div class="inp"><input aria-label="Find athlete" placeholder="Find athlete" value=${q} onInput=${(e) => setQ(e.target.value)} /></div>
      <div style="display:grid;gap:6px;max-height:340px;overflow:auto">${list.map((a) => html`<button type="button" class="tile-btn" style="flex-direction:row;align-items:center" aria-pressed=${String(a.id === athleteId)} onClick=${() => setAthleteId(a.id)}><span class="avatar">${initials(a.name)}</span><span>${a.name}<br /><small>${a.id} · ${a.sport || 'Sport not set'}</small></span></button>`)}</div>
      <a href="#/athletes/new" class="small">Add a new athlete</a>
    </div>
    <div class="card"><h2>2. Assessment type</h2>
      <div class="grid cols-2">${ASSESSMENT_TYPES.map((x) => html`<button type="button" class="tile-btn" aria-pressed=${String(x.id === type)} onClick=${() => setType(x.id)}><span>${x.name}</span><small>${x.domains.length ? x.domains.map((d) => DOMAINS.find((y) => y.id === d).name).join(', ') : 'Vitals and body measures only'}</small></button>`)}</div>
      <p class="muted small">Every assessment includes consent, safety screening, resting vitals and body measures.</p>
      <button class="btn primary" disabled=${!athleteId} onClick=${start}>Start assessment<${Icon} name="next" size=${16} /></button>
      ${!athleteId ? html`<span class="muted small">Choose an athlete to continue.</span>` : null}
    </div>
  </div>`;
}

// ---------- tools ----------
function Timer({ countdown, metronomeBpm }) {
  const [t, setT] = useState(0);
  const [running, setRunning] = useState(false);
  const ref = useRef({ start: 0, acc: 0, iv: null, beat: null, ctx: null, cues: new Set() });
  const beep = (f, d) => { try { const r = ref.current; r.ctx = r.ctx || new (window.AudioContext || window.webkitAudioContext)(); const o = r.ctx.createOscillator(), g = r.ctx.createGain(); o.frequency.value = f; g.gain.value = 0.15; o.connect(g); g.connect(r.ctx.destination); o.start(); o.stop(r.ctx.currentTime + d); } catch (e) { /* no audio */ } };
  const stop = () => { const r = ref.current; if (r.start) r.acc += (performance.now() - r.start) / 1000; r.start = 0; clearInterval(r.iv); clearInterval(r.beat); setRunning(false); };
  useEffect(() => () => stop(), []);
  const startT = () => {
    const r = ref.current; if (r.start) return;
    r.start = performance.now(); setRunning(true); beep(880, 0.15);
    if (metronomeBpm) r.beat = setInterval(() => beep(1000, 0.04), 60000 / metronomeBpm);
    r.iv = setInterval(() => {
      const e = r.acc + (performance.now() - r.start) / 1000;
      setT(e);
      if (countdown) {
        const left = countdown - e;
        if (left <= countdown / 2 && !r.cues.has(1)) { r.cues.add(1); beep(660, 0.2); }
        if (left <= 60 && !r.cues.has(2)) { r.cues.add(2); beep(660, 0.2); }
        if (left <= 0) { beep(990, 0.6); stop(); setT(countdown); }
      }
    }, 100);
  };
  const reset = () => { stop(); ref.current.acc = 0; ref.current.cues = new Set(); setT(0); };
  const shown = countdown ? Math.max(0, countdown - t) : t;
  const mm = Math.floor(shown / 60), ss = (shown - mm * 60).toFixed(1).padStart(4, '0');
  return html`<div class="metric" style="gap:10px"><span class="n">${countdown ? 'Countdown' : 'Stopwatch'}${metronomeBpm ? ' with metronome at ' + metronomeBpm + ' beats/min' : ''}</span>
    <span class="v">${String(mm).padStart(2, '0')}:${ss}</span>
    <div class="row"><button type="button" class="btn primary sm" onClick=${startT} disabled=${running}>Start</button><button type="button" class="btn sm" onClick=${stop} disabled=${!running}>Stop</button><button type="button" class="btn sm" onClick=${reset}>Reset</button></div>
    ${!countdown && !running && t > 0 ? html`<span class="n">Elapsed ${(t / 60).toFixed(2)} min</span>` : null}</div>`;
}

// ---------- step bodies ----------
function StepContext({ a, set, athlete }) {
  const toggle = (d) => set('domains', a.domains.includes(d) ? a.domains.filter((x) => x !== d) : a.domains.concat([d]));
  return html`<div class="grid">
    <div class="card"><div class="card-head"><h2>Athlete</h2><a href=${'#/athletes/' + athlete.id} class="small">Open profile</a></div>
      <div class="athlete-chip"><span class="avatar lg">${initials(athlete.name)}</span><div><b>${athlete.name}</b><div class="muted small">${athlete.id} · ${[store.ageAt(athlete, a.date) != null ? store.ageAt(athlete, a.date) + ' years on test day' : 'Age not recorded', athlete.sex || 'sex not recorded', athlete.sport].filter(Boolean).join(' · ')}</div></div></div>
      ${athlete.medications ? html`<${Notice} kind="warn">HR-affecting medication on file: ${athlete.medications}. Heart-rate-based results may not apply.</${Notice}>` : null}
    </div>
    <div class="card"><h2>Test areas</h2><div class="grid cols-3">${DOMAINS.map((d) => html`<button type="button" class="tile-btn" aria-pressed=${String(a.domains.includes(d.id))} onClick=${() => toggle(d.id)}><span>${a.domains.includes(d.id) ? '✓ ' : ''}${d.name}</span><small>${d.detail}</small></button>`)}</div></div>
    <div class="card"><h2>Session details</h2><div class="fields">
      <${Field} label="Date" type="date" value=${a.date} onInput=${(v) => set('date', v)} required />
      <${Field} label="Assessor" value=${a.assessor} onInput=${(v) => set('assessor', v)} required />
      <${Field} label="Location" value=${a.context.location} onInput=${(v) => set('context.location', v)} placeholder="Clinic gym, track…" />
      <${Field} label="Surface" value=${a.context.surface} onInput=${(v) => set('context.surface', v)} placeholder="400 m track, sprung floor…" />
      <${Field} label="Air temperature" type="number" unit="°C" min=${-5} max=${45} value=${a.context.tempC} onInput=${(v) => set('context.tempC', v)} />
      <${Field} label="Humidity" type="number" unit="%" min=${0} max=${100} value=${a.context.humidity} onInput=${(v) => set('context.humidity', v)} />
    </div>
    <${Field} label="Equipment (make, model, last calibration)" type="textarea" value=${a.context.equipment} onInput=${(v) => set('context.equipment', v)} /></div>
  </div>`;
}

function StepScreening({ a, set }) {
  const sc = a.screening;
  const flagged = (sc.answers || []).some(Boolean);
  const blockedProceed = !sc.consent || (flagged && !sc.clinicianCleared);
  const setAnswer = (i, v) => { const ans = SCREEN_QUESTIONS.map((_, j) => !!(sc.answers || [])[j]); ans[i] = v; set('screening.answers', ans); };
  const d = screeningDecision(sc);
  return html`<div class="grid">
    <div class="card"><div class="card-head"><div><h2>Consent</h2><p>Explain the tests, the effort involved, the right to stop at any time and how results are stored.</p></div></div>
      <${Check} label="The athlete (or guardian) gave informed consent for these tests and for storing the results" checked=${sc.consent} onChange=${(v) => set('screening.consent', v)} /></div>
    <div class="card"><div class="card-head"><div><h2>Pre-test screening</h2><p>Tick any that apply. A clear screen is not medical clearance.</p></div></div>
      ${SCREEN_QUESTIONS.map((q, i) => html`<${Check} label=${q} checked=${!!(sc.answers || [])[i]} onChange=${(v) => setAnswer(i, v)} />`)}
      ${flagged ? html`<div class="grid" style="gap:8px"><${Notice} kind="warn">A "yes" answer means hard fitness tests could be unsafe today. They stay locked until a doctor or physio says they are OK.</${Notice}>
        <${Check} label="A doctor or physio checked these answers and said the tests are OK" checked=${sc.clinicianCleared} onChange=${(v) => set('screening.clinicianCleared', v)} />
        ${sc.clinicianCleared ? html`<${Field} label="Who said OK (name)" value=${sc.clearedBy} onInput=${(v) => set('screening.clearedBy', v)} />` : null}</div>` : null}
    </div>
    <div class="card"><h2>Assessor decision</h2>
      <${Seg} label="Assessor decision" value=${sc.decision} onChange=${(v) => set('screening.decision', v)} options=${[{ value: 'proceed', label: 'Proceed', disabled: blockedProceed }, { value: 'modify', label: 'Modify', disabled: blockedProceed }, { value: 'defer', label: 'Defer' }, { value: 'refer', label: 'Refer' }]} />
      ${d.allowed ? html`<${Notice} kind="good">Exercise tests can be recorded. ${sc.decision === 'modify' ? 'Note what you changed in the session notes.' : ''}</${Notice}>` : html`<${Notice} kind="info">${d.reason} Vitals and body measures can still be recorded.</${Notice}>`}
    </div>
  </div>`;
}

function StepVitals({ a, set, athlete }) {
  const v = a.vitals;
  const flags = M().vitalsFlags(v);
  const bmi = M().bmi(v.massKg, v.heightCm);
  return html`<div class="grid">
    <div class="card"><div class="card-head"><div><h2>Resting vital signs</h2><p>Seat the athlete and record after the protocol’s quiet rest period.</p></div></div>
      <div class="fields">
        <${Field} label="Resting heart rate" type="number" unit="bpm" min=${30} max=${120} value=${v.restHr} onInput=${(x) => set('vitals.restHr', x)} />
        <${Field} label="HR method" value=${v.restHrMethod} onInput=${(x) => set('vitals.restHrMethod', x)} options=${['Manual radial pulse, 60 s', 'Manual radial pulse, 30 s × 2', 'Chest strap', 'Validated HR monitor', 'Pulse oximeter']} />
        <${Field} label="Systolic BP" type="number" unit="mmHg" min=${80} max=${220} value=${v.sbp} onInput=${(x) => set('vitals.sbp', x)} />
        <${Field} label="Diastolic BP" type="number" unit="mmHg" min=${40} max=${130} value=${v.dbp} onInput=${(x) => set('vitals.dbp', x)} />
        <${Field} label="Respiratory rate" type="number" unit="/min" min=${6} max=${40} value=${v.rr} onInput=${(x) => set('vitals.rr', x)} />
        <${Field} label="SpO₂ (optional)" type="number" unit="%" min=${80} max=${100} value=${v.spo2} onInput=${(x) => set('vitals.spo2', x)} />
        <${Field} label="Body temperature (optional)" type="number" unit="°C" min=${34} max=${41} value=${v.tempC} onInput=${(x) => set('vitals.tempC', x)} />
      </div>
      ${flags.map((f) => html`<${Notice} kind=${f.level === 'stop' ? 'danger' : 'warn'}>${f.text}</${Notice}>`)}
    </div>
    <div class="card"><div class="card-head"><div><h2>Body measures</h2><p>Measure on the day. Equations use today’s mass, not the profile value.</p></div>${athlete.massKg ? html`<span class="muted small">Profile: ${athlete.heightCm || '—'} cm, ${athlete.massKg} kg</span>` : null}</div>
      <div class="fields">
        <${Field} label="Height (no shoes)" type="number" unit="cm" min=${120} max=${230} value=${v.heightCm} onInput=${(x) => set('vitals.heightCm', x)} />
        <${Field} label="Body mass" type="number" unit="kg" min=${25} max=${200} value=${v.massKg} onInput=${(x) => set('vitals.massKg', x)} />
        <${Field} label="Waist circumference" type="number" unit="cm" min=${45} max=${160} value=${v.waistCm} onInput=${(x) => set('vitals.waistCm', x)} />
      </div>
      ${bmi ? html`<p class="muted small">BMI ${bmi.value} kg/m² (calculated). ${bmi.note}</p>` : null}
    </div>
    <div class="card"><h2>Readiness</h2><div class="fields">
      <${Field} label="Sleep last night" type="number" unit="h" min=${0} max=${14} value=${v.sleepH} onInput=${(x) => set('vitals.sleepH', x)} />
      <${Field} label="Last hard training" value=${v.lastHard} onInput=${(x) => set('vitals.lastHard', x)} options=${['', 'Today', 'Yesterday', '2 days ago', '3+ days ago']} />
      <${Field} label="Caffeine in last 3 h" value=${v.caffeine} onInput=${(x) => set('vitals.caffeine', x)} options=${['', 'No', 'Yes']} />
    </div>
    <${Field} label="Symptoms, medication taken today, or other notes" type="textarea" value=${v.notes} onInput=${(x) => set('vitals.notes', x)} /></div>
  </div>`;
}

const tierName = (t) => ({ A: 'Measured', B: 'Max effort', C: 'Submaximal', D: 'No exercise' }[t]);

function StepCardio({ a, set, athlete, allowed }) {
  const c = a.cardio;
  const p = c.protocolId ? E().getProtocol(c.protocolId) : null;
  const age = store.ageAt(athlete, a.date);
  const live = p ? E().calculate(p.id, { athlete: { age, sex: athlete.sex, mass_kg: has(a.vitals.massKg) ? Number(a.vitals.massKg) : null, height_cm: has(a.vitals.heightCm) ? Number(a.vitals.heightCm) : null }, inputs: c.inputs, completed: !!c.completed, screening: { decision: allowed ? a.screening.decision : 'defer' } }) : null;
  const hrr = M().hrRecovery(c.endHr, c.recHr60, 60);
  const needs = p ? (p.athleteInputs || []).filter((k) => (k === 'age' ? age == null : k === 'sex' ? !athlete.sex : k === 'mass_kg' ? !has(a.vitals.massKg) : !has(a.vitals.heightCm))) : [];
  return html`<div class="grid">
    ${!allowed ? html`<${Notice} kind="info">Exercise tests are locked by screening or a vitals safety check. You can still choose the no-exercise estimate.</${Notice}>` : null}
    <div class="card"><div class="card-head"><div><h2>Aerobic test protocol</h2><p>Ordered from most to least accurate. Use the most accurate one the athlete can safely do.</p></div></div>
      <div class="grid cols-2">${E().PROTOCOLS.map((x) => html`<button type="button" class="tile-btn" aria-pressed=${String(x.id === c.protocolId)} disabled=${x.exertion !== 'none' && !allowed} onClick=${() => set('cardio', Object.assign({}, c, { protocolId: x.id, inputs: x.id === c.protocolId ? c.inputs : {} }))}><span class="row" style="gap:8px"><span class="pill ${x.tier === 'A' ? 'measured' : x.tier === 'D' ? 'draft' : 'estimated'}">Tier ${x.tier} · ${tierName(x.tier)}</span></span><span>${x.name}</span><small>${x.equipment}</small></button>`)}</div>
      ${p ? html`<${Notice} kind="info"><b>${p.name}</b>. ${p.population.note} ${p.protocolNote || ''} ${p.errorNote}</${Notice}>` : null}
    </div>
    ${p ? html`<div class="card"><div class="card-head"><div><h2>Test data</h2><p>Enter the raw values exactly as measured.</p></div></div>
      ${p.id === 'cooper_12min' ? html`<${Timer} countdown=${720} />` : p.id === 'queens_step' ? html`<${Timer} countdown=${180} metronomeBpm=${athlete.sex === 'female' ? 88 : 96} />` : p.exertion !== 'none' ? html`<${Timer} />` : null}
      <div class="fields">${p.inputs.map((f) => html`<${Field} label=${f.label} unit=${f.unit} type="number" min=${f.min} max=${f.max} value=${c.inputs[f.key]} onInput=${(v) => set('cardio.inputs.' + f.key, v)} hint=${f.optional ? 'Optional' : ''} />`)}</div>
      ${needs.length ? html`<${Notice} kind="warn">This equation also needs: ${needs.map((k) => ({ age: 'age (athlete profile)', sex: 'sex (athlete profile)', mass_kg: 'body mass (vitals step)', height_cm: 'height (vitals step)' }[k])).join(', ')}.</${Notice}>` : null}
      ${p.exertion !== 'none' ? html`<${Check} label="The protocol was completed exactly as written (no early stop, correct course, step height or cadence)" checked=${c.completed} onChange=${(v) => set('cardio.completed', v)} />` : null}
      ${live ? html`<div class="spread" style="padding:12px;border:1px dashed var(--line-2);border-radius:12px"><div><span class="muted small">Live result</span><div class="hero-v" style="font-size:2.2rem">${live.relative_ml_kg_min != null ? fmt(live.relative_ml_kg_min, 1) : '—'} <small class="muted" style="font-size:.8rem">mL/kg/min</small></div></div><div style="max-width:420px" class="small">${live.relative_ml_kg_min != null ? html`<${EvidencePill} label=${live.label} /> ${live.typical_range_ml_kg_min ? 'Typical range ' + live.typical_range_ml_kg_min.join(' to ') + '.' : 'No published error for this equation.'} ${live.flags.map((f) => f.text).join(' ')}` : html`<span class="muted">${live.reason}</span>`}</div></div>` : null}
    </div>` : null}
    ${p && p.exertion !== 'none' ? html`<div class="card"><div class="card-head"><div><h2>Heart rate and recovery</h2><p>Record at the exact time points. Recovery HR is only comparable with the same interval and posture.</p></div></div>
      <div class="fields">
        <${Field} label="HR method" value=${c.hrMethod} onInput=${(v) => set('cardio.hrMethod', v)} options=${['Chest strap', 'Validated HR monitor', 'Manual pulse, 15 s × 4', 'Optical wrist sensor']} />
        <${Field} label="HR at end of exercise" type="number" unit="bpm" min=${80} max=${230} value=${c.endHr} onInput=${(v) => set('cardio.endHr', v)} />
        <${Field} label="Peak HR measured in a max test (optional)" type="number" unit="bpm" min=${120} max=${230} value=${c.peakHr} onInput=${(v) => set('cardio.peakHr', v)} hint="Leave blank to use an age-predicted max." />
        <${Field} label="HR at 1 min recovery" type="number" unit="bpm" min=${50} max=${220} value=${c.recHr60} onInput=${(v) => set('cardio.recHr60', v)} />
        <${Field} label="HR at 2 min recovery" type="number" unit="bpm" min=${40} max=${220} value=${c.recHr120} onInput=${(v) => set('cardio.recHr120', v)} />
        <${Field} label="Recovery posture" value=${c.recoveryPosture} onInput=${(v) => set('cardio.recoveryPosture', v)} options=${['Seated', 'Standing still', 'Supine', 'Walking slowly']} />
        <${Field} label="RPE (Borg 6 to 20)" type="number" min=${6} max=${20} value=${c.rpe} onInput=${(v) => set('cardio.rpe', v)} />
      </div>
      ${hrr ? html`<p class="small"><b class="mono">${hrr.value} bpm</b> <span class="muted">heart-rate recovery at 1 minute (calculated: end HR minus HR at 60 s, ${c.recoveryPosture.toLowerCase()}).</span></p>` : null}
      ${hrr && hrr.flags.length ? html`<${Notice} kind="warn">${hrr.flags[0]}</${Notice}>` : null}
      <${Field} label="Symptoms, deviations, reason for stopping" type="textarea" value=${c.notes} onInput=${(v) => set('cardio.notes', v)} />
    </div>` : null}
  </div>`;
}

function StepStrengthPower({ a, set }) {
  const s = a.strength, p = a.power;
  const g = M().grip(s.gripL, s.gripR), j = M().jump(p.standReach, p.jumpReach), sp = M().sprint(p.sprintTimes, p.sprintDistance);
  return html`<div class="grid">
    ${a.domains.includes('strength') ? html`<div class="card"><div class="card-head"><div><h2>Handgrip strength</h2><p>Record every trial, not just the best. Same posture, handle setting and encouragement each time.</p></div></div>
      <${Field} label="Dynamometer and handle setting" value=${s.device} onInput=${(v) => set('strength.device', v)} placeholder="Jamar hydraulic, position 2" />
      <div class="grid cols-2"><${Trials} label="Left hand" unit="kg" min=${5} max=${100} values=${s.gripL} onChange=${(v) => set('strength.gripL', v)} /><${Trials} label="Right hand" unit="kg" min=${5} max=${100} values=${s.gripR} onChange=${(v) => set('strength.gripR', v)} /></div>
      ${g ? html`<p class="small"><span class="muted">Best</span> <b class="mono">L ${g.left ? g.left.best : '—'} kg · R ${g.right ? g.right.best : '—'} kg</b>${g.asymmetry_pct != null ? html` <span class="muted">· side difference</span> <b class="mono">${g.asymmetry_pct}%</b>` : null}</p>` : null}
    </div>` : null}
    ${a.domains.includes('power') ? html`<div class="card"><div class="card-head"><div><h2>Vertical jump (reach method)</h2><p>Same footwear and arm-swing rule every session.</p></div></div>
      <div class="fields"><${Field} label="Standing reach" type="number" unit="cm" min=${150} max=${300} value=${p.standReach} onInput=${(v) => set('power.standReach', v)} /></div>
      <${Check} label="Arm swing allowed" checked=${p.armSwing} onChange=${(v) => set('power.armSwing', v)} />
      <${Trials} label="Jump reach" unit="cm" min=${150} max=${400} values=${p.jumpReach} onChange=${(v) => set('power.jumpReach', v)} />
      ${j ? html`<p class="small"><span class="muted">Best jump height (calculated)</span> <b class="mono">${j.value} cm</b> <span class="muted">· trials ${j.trials.join(', ')} cm</span></p>` : null}
      ${j && j.flags.length ? html`<${Notice} kind="warn">${j.flags[0]}</${Notice}>` : null}
    </div>
    <div class="card"><div class="card-head"><div><h2>Sprint</h2><p>Hand timing and timing gates are not interchangeable. Record the method.</p></div></div>
      <div class="fields"><${Field} label="Distance" type="number" unit="m" min=${5} max=${100} value=${p.sprintDistance} onInput=${(v) => set('power.sprintDistance', v)} /><${Field} label="Timing method" value=${p.timing} onInput=${(v) => set('power.timing', v)} options=${['Hand-timed stopwatch', 'Timing gates', 'Phone video analysis']} /></div>
      <${Trials} label="Trial times" unit="s" min=${1} max=${20} values=${p.sprintTimes} onChange=${(v) => set('power.sprintTimes', v)} />
      ${sp ? html`<p class="small"><span class="muted">Best</span> <b class="mono">${sp.value} s</b>${sp.speed_m_s ? html` <span class="muted">· speed</span> <b class="mono">${sp.speed_m_s} m/s</b>` : null}${sp.decrement_pct != null ? html` <span class="muted">· decrement</span> <b class="mono">${sp.decrement_pct}%</b>` : null}</p>` : null}
    </div>` : null}
  </div>`;
}

function StepMobilityBalance({ a, set }) {
  const m = a.mobility, b = a.balance;
  return html`<div class="grid">
    ${a.domains.includes('mobility') ? html`<div class="card"><div class="card-head"><div><h2>Weight-bearing ankle lunge (knee to wall)</h2><p>Heel stays down, knee tracks over the second toe. Record toe-to-wall distance.</p></div></div>
      <div class="fields"><${Field} label="Left" type="number" unit="cm" min=${0} max=${25} value=${m.lungeL} onInput=${(v) => set('mobility.lungeL', v)} /><${Field} label="Right" type="number" unit="cm" min=${0} max=${25} value=${m.lungeR} onInput=${(v) => set('mobility.lungeR', v)} /></div>
      <${Field} label="Pain or compensation noted" value=${m.notes} onInput=${(v) => set('mobility.notes', v)} /></div>` : null}
    ${a.domains.includes('balance') ? html`<div class="card"><div class="card-head"><div><h2>Single-leg stance</h2><p>Hands on hips, same surface and footwear. Stop at a foot touch or hands off hips.</p></div></div>
      <div class="fields"><${Field} label="Condition" value=${b.eyes} onInput=${(v) => set('balance.eyes', v)} options=${['eyes open', 'eyes closed']} /><${Field} label="Maximum time" type="number" unit="s" min=${10} max=${120} value=${b.maxS} onInput=${(v) => set('balance.maxS', v)} />
      <${Field} label="Left" type="number" unit="s" min=${0} max=${b.maxS || 120} value=${b.slsL} onInput=${(v) => set('balance.slsL', v)} /><${Field} label="Right" type="number" unit="s" min=${0} max=${b.maxS || 120} value=${b.slsR} onInput=${(v) => set('balance.slsR', v)} /></div></div>` : null}
  </div>`;
}

function StepReview({ a, athlete, onCalculate }) {
  const preview = calculate(a, Object.assign({}, athlete, { age: store.ageAt(athlete, a.date) }));
  const sc = screeningDecision(a.screening);
  const rows = [
    ['Assessor and date', a.assessor && a.date ? a.assessor + ', ' + fmtDate(a.date) : 'Missing', !!(a.assessor && a.date)],
    ['Consent', a.screening.consent ? 'Recorded' : 'Not recorded', a.screening.consent],
    ['Screening decision', sc.allowed ? a.screening.decision : sc.reason, sc.allowed],
    ['Vitals safety checks', preview.safety.length ? preview.safety.length + ' flag(s)' : 'No flags', !preview.safety.some((f) => f.level === 'stop')],
  ];
  if (a.domains.includes('cardio')) rows.push(['Aerobic test', preview.vo2 ? (preview.vo2.label === 'estimated' || preview.vo2.label === 'measured' ? 'Ready: ' + preview.vo2.relative_ml_kg_min + ' mL/kg/min' : preview.vo2.reason) : 'No protocol chosen', !!(preview.vo2 && preview.vo2.relative_ml_kg_min)]);
  return html`<div class="grid">
    <div class="card"><div class="card-head"><div><h2>Check before calculating</h2><p>Nothing missing is ever filled in. Missing items are listed as “not available” in the report.</p></div></div>
      <div class="table-wrap"><table><thead><tr><th>Check</th><th>Status</th><th></th></tr></thead><tbody>${rows.map((r) => html`<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2] ? html`<span class="pill measured">OK</span>` : html`<span class="pill estimated">Review</span>`}</td></tr>`)}</tbody></table></div>
      ${preview.safety.map((f) => html`<${Notice} kind=${f.level === 'stop' ? 'danger' : 'warn'}>${f.text}</${Notice}>`)}
      ${preview.missing.length ? html`<${Notice} kind="warn"><b>Not available:</b> ${preview.missing.join('; ')}.</${Notice}>` : html`<${Notice} kind="good">All selected areas have the inputs they need.</${Notice}>`}
    </div>
    <div class="card"><h2>What will be calculated</h2>
      <div class="table-wrap"><table><thead><tr><th>Result</th><th>Value</th><th>Evidence</th></tr></thead><tbody>${preview.items.map((i) => html`<tr><td>${i.name}</td><td class="num">${typeof i.value === 'number' ? fmt(i.value) : i.value ?? (i.left != null || i.right != null ? 'L ' + (i.left ?? '—') + ' · R ' + (i.right ?? '—') : '—')} ${i.unit}</td><td><${EvidencePill} label=${i.label} /></td></tr>`)}</tbody></table></div>
      <button class="btn primary" onClick=${() => onCalculate()}><${Icon} name="check" size=${16} />Calculate and create report</button>
      <p class="muted small">The report stays a draft until a qualified assessor signs it off.</p>
    </div>
  </div>`;
}

// ---------- wizard ----------
function setPath(obj, path, value) {
  const next = JSON.parse(JSON.stringify(obj));
  const keys = path.split('.');
  let o = next;
  keys.slice(0, -1).forEach((k) => { if (o[k] == null || typeof o[k] !== 'object') o[k] = {}; o = o[k]; });
  o[keys[keys.length - 1]] = value;
  return next;
}

export function AssessmentWizard({ id, step }) {
  const stored = store.getAssessment(id);
  const [a, setA] = useState(stored);
  const timer = useRef(null);
  useEffect(() => { setA(store.getAssessment(id)); }, [id]);
  useEffect(() => () => { if (timer.current) { clearTimeout(timer.current); } }, []);
  if (!a) return html`<div class="card"><${Empty} icon="clipboard" title="Assessment not found" text="It may have been deleted."><a href="#/reports">View all assessments</a></${Empty}></div>`;
  const athlete = store.getAthlete(a.athleteId);
  if (!athlete) return html`<div class="card"><${Empty} icon="users" title="Athlete missing" text="The athlete for this assessment was deleted." /></div>`;
  if (a.status === 'approved') return html`<div class="card"><${Empty} icon="check" title="This assessment is signed off" text="Signed reports are locked. Reopen it from the report if a correction is needed."><a class="btn" href=${'#/reports/' + a.id}>Open report</a></${Empty}></div>`;

  const set = (path, value) => {
    const next = setPath(a, path, value);
    setA(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => store.saveAssessment(next), 350);
  };
  const allowed = screeningDecision(a.screening).allowed && !M().vitalsFlags(a.vitals).some((f) => f.level === 'stop');
  const steps = [
    { key: 'context', name: 'Athlete & session' },
    { key: 'screening', name: 'Screening' },
    { key: 'vitals', name: 'Vitals & body' },
    a.domains.includes('cardio') && { key: 'cardio', name: 'Cardiovascular' },
    (a.domains.includes('strength') || a.domains.includes('power')) && { key: 'sp', name: 'Strength & power' },
    (a.domains.includes('mobility') || a.domains.includes('balance')) && { key: 'mb', name: 'Mobility & balance' },
    { key: 'review', name: 'Review' },
  ].filter(Boolean);
  const cur = Math.min(Math.max(0, step), steps.length - 1);
  const to = async (n) => { clearTimeout(timer.current); await store.saveAssessment(a); go('/assess/' + a.id + '?step=' + n); };
  const onCalculate = async () => {
    clearTimeout(timer.current);
    const results = calculate(a, Object.assign({}, athlete, { age: store.ageAt(athlete, a.date) }));
    const rec = Object.assign({}, a, { results, status: 'calculated' });
    await store.saveAssessment(rec, 'Calculated (' + results.items.length + ' results, ' + results.missing.length + ' not available)');
    toast('Calculated. Review the report, then sign it off.');
    go('/reports/' + a.id);
  };
  const k = steps[cur].key;
  const t = ASSESSMENT_TYPES.find((x) => x.id === a.type);
  const props = { a, set, athlete, allowed };
  return html`<div class="head"><div><div class="eyebrow">${t ? t.name : 'Assessment'} · ${athlete.name} · saved automatically</div><h1>${steps[cur].name}</h1></div>
    <span class="pill draft">Draft</span></div>
  <nav class="stepper" aria-label="Assessment steps">${steps.map((s, i) => html`<button type="button" class=${i === cur ? 'on' : i < cur ? 'done' : ''} aria-current=${i === cur ? 'step' : null} onClick=${() => to(i)}><span class="dot">${i < cur ? '✓' : i + 1}</span>${s.name}</button>`)}</nav>
  <div style="margin-top:16px">
    ${k === 'context' ? html`<${StepContext} ...${props} />` : k === 'screening' ? html`<${StepScreening} ...${props} />` : k === 'vitals' ? html`<${StepVitals} ...${props} />` : k === 'cardio' ? html`<${StepCardio} ...${props} />` : k === 'sp' ? html`<${StepStrengthPower} ...${props} />` : k === 'mb' ? html`<${StepMobilityBalance} ...${props} />` : html`<${StepReview} a=${a} athlete=${athlete} onCalculate=${onCalculate} />`}
  </div>
  <div class="wizard-foot no-print"><button class="btn" disabled=${cur === 0} onClick=${() => to(cur - 1)}><${Icon} name="back" size=${16} />Back</button>
    ${cur < steps.length - 1 ? html`<button class="btn primary" onClick=${() => to(cur + 1)}>Continue<${Icon} name="next" size=${16} /></button>` : null}</div>`;
}
