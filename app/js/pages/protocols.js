import { html } from '../vendor/preact-htm.js';
import { Notice } from '../ui.js';

const TIER = { A: 'Measured (gas analysis)', B: 'Max-effort field test', C: 'Submaximal heart-rate test', D: 'No-exercise estimate' };
const OTHER = [
  ['Heart-rate recovery', 'end HR − HR at 60 s (or 120 s)', 'Calculated', 'Interval and recovery posture are stored with the value.'],
  ['Heart-rate reserve used', '(exercise HR − rest HR) ÷ (peak HR − rest HR) × 100', 'Calculated, or estimated if peak HR is age-predicted', 'Predicted peak HR: 208 − 0.7 × age (Tanaka 2001).'],
  ['Mean arterial pressure', 'DBP + (SBP − DBP) ÷ 3', 'Calculated', ''],
  ['BMI', 'mass (kg) ÷ height (m)²', 'Calculated', 'Screening measure only; not body fat.'],
  ['Waist-to-height ratio', 'waist ÷ height', 'Calculated', ''],
  ['Handgrip', 'Best valid trial per hand; side difference = |L − R| ÷ max × 100', 'Measured', 'Compare only with the same dynamometer and posture.'],
  ['Vertical jump', 'jump reach − standing reach', 'Calculated', 'Same footwear and arm-swing rule each time.'],
  ['Sprint', 'Fastest valid trial; decrement = (sum ÷ (n × best) − 1) × 100', 'Measured / calculated', 'Hand timing and gates are not interchangeable.'],
  ['Ankle lunge, single-leg stance', 'Left and right recorded separately', 'Measured', ''],
];

export function Protocols() {
  const E = globalThis.MotionPlusEngine;
  return html`<div class="head"><div><div class="eyebrow">Protocol library</div><h1>Protocols and equations</h1><p>Every calculation the app performs, with its source, the population it was built on and its known error. Equations are versioned so results stay traceable.</p></div></div>
  <${Notice} kind="warn">A qualified clinician should approve these protocols, eligibility and stop rules for your clinic before use with athletes.</${Notice}>
  <div class="card" style="margin-top:16px"><h2>VO₂ max methods, most to least accurate</h2>
    <div class="table-wrap"><table><thead><tr><th>Tier</th><th>Test</th><th>Built on</th><th>Typical error</th><th>Equation</th><th>Source</th></tr></thead><tbody>
      ${E.PROTOCOLS.map((p) => html`<tr><td><span class="pill ${p.tier === 'A' ? 'measured' : p.tier === 'D' ? 'draft' : 'estimated'}">${p.tier}</span><div class="sub">${TIER[p.tier]}</div></td><td>${p.name}<div class="sub">v${p.version} · ${p.equipment}</div></td><td class="small">${p.population.note}</td><td class="num small">${p.error ? (p.error.type === 'abs' ? '± ' + p.error.value + ' mL/kg/min' : '± ' + p.error.value + '%') : 'Not reported'}</td><td class="mono small" style="min-width:220px">${p.formula}</td><td class="small muted">${p.source}</td></tr>`)}
    </tbody></table></div></div>
  <div class="card" style="margin-top:16px"><h2>Other calculations</h2>
    <div class="table-wrap"><table><thead><tr><th>Result</th><th>Formula</th><th>Evidence label</th><th>Notes</th></tr></thead><tbody>${OTHER.map((r) => html`<tr><td>${r[0]}</td><td class="mono small">${r[1]}</td><td class="small">${r[2]}</td><td class="small muted">${r[3]}</td></tr>`)}</tbody></table></div></div>
  <div class="card" style="margin-top:16px"><h2>Resting safety checks</h2><p class="muted small">Defaults based on common pre-exercise-test guidance. They prompt a recheck or a referral; they never diagnose.</p>
    <ul class="small" style="margin:0;padding-left:18px;display:grid;gap:4px"><li>Resting HR below 40 or above 100 bpm: recheck.</li><li>BP 140/90 mmHg or higher: repeat after rest. 200/110 or higher: defer exercise testing and refer.</li><li>SpO₂ below 95%: recheck. Below 90%: defer and seek review.</li><li>Temperature 38 °C or higher: defer exercise testing.</li></ul></div>`;
}
