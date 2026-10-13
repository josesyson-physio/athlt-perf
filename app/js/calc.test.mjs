import test from 'node:test';
import assert from 'node:assert';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
globalThis.MotionPlusEngine = require('../../engine/engine.js');
globalThis.MotionPlusMetrics = require('../../engine/metrics.js');
const { calculate, screeningDecision } = await import('./calc.js');
const { draftInsights } = await import('./insights.js');

const athlete = { id: 'MP-0001', name: 'Test', sex: 'male', age: 22, heightCm: 178, massKg: 72 };
function base() {
  return {
    domains: ['cardio', 'strength', 'power', 'mobility', 'balance'],
    date: '2026-10-13',
    screening: { answers: [], consent: true, clinicianCleared: false, decision: 'proceed' },
    vitals: { restHr: 58, sbp: 120, dbp: 78, heightCm: 178, massKg: 72 },
    cardio: { protocolId: 'cooper_12min', inputs: { distance_m: 2800 }, completed: true, endHr: 192, recHr60: 150, recoveryPosture: 'Seated' },
    strength: { gripL: [40, 42], gripR: [46, 45] },
    power: { standReach: 228, jumpReach: [280, 284], sprintDistance: 20, sprintTimes: [3.1, 3.2, 3.15] },
    mobility: { lungeL: 10, lungeR: 8 },
    balance: { slsL: 30, slsR: 25 },
  };
}
const get = (r, k) => r.items.find((i) => i.key === k);

test('Full assessment calculates every area with evidence labels', () => {
  const r = calculate(base(), athlete);
  assert.strictEqual(get(r, 'vo2').value, 51.3);
  assert.strictEqual(get(r, 'vo2').label, 'estimated');
  assert.strictEqual(get(r, 'vo2_abs').value, 3.69);
  assert.strictEqual(get(r, 'hrr1').value, 42);
  assert.strictEqual(get(r, 'grip').asymmetry_pct, 8.7);
  assert.strictEqual(get(r, 'jump').value, 56);
  assert.strictEqual(get(r, 'bmi').label, 'calculated');
  assert.strictEqual(get(r, 'hrr_pct').label, 'estimated');
  assert.deepStrictEqual(r.missing, []);
});

test('No consent blocks exercise results but keeps vitals', () => {
  const a = base(); a.screening.consent = false;
  const r = calculate(a, athlete);
  assert.strictEqual(get(r, 'vo2'), undefined);
  assert.ok(get(r, 'rest_hr'));
  assert.ok(r.missing.some((m) => m.startsWith('VO₂ max')));
  assert.strictEqual(r.blocked_exercise, true);
});

test('A stop-level vital blocks VO2 even when screening passed', () => {
  const a = base(); a.vitals.sbp = 210; a.vitals.dbp = 100;
  const r = calculate(a, athlete);
  assert.strictEqual(get(r, 'vo2'), undefined);
  assert.strictEqual(r.safety[0].level, 'stop');
});

test('Screening flag needs clinician clearance', () => {
  assert.strictEqual(screeningDecision({ answers: [true], consent: true, decision: 'proceed' }).allowed, false);
  assert.strictEqual(screeningDecision({ answers: [true], consent: true, clinicianCleared: true, decision: 'proceed' }).allowed, true);
  assert.strictEqual(screeningDecision({ answers: [], consent: true, decision: '' }).allowed, false);
});

test('Missing areas are listed, never filled in', () => {
  const a = base(); a.strength = { gripL: [], gripR: [] }; a.vitals.massKg = '';
  const r = calculate(a, athlete);
  assert.ok(r.missing.includes('Handgrip trials'));
  assert.ok(r.missing.includes('Body mass on the day'));
});

test('Insights compare VO2 only on the same protocol and respect method error', () => {
  const now = calculate(base(), athlete);
  const older = base(); older.cardio.inputs.distance_m = 2700;
  const prev = [{ date: '2026-08-01', results: calculate(older, athlete) }];
  const ins = draftInsights(now, prev);
  assert.ok(ins.some((i) => i.title.startsWith('VO₂ increase')));
  const otherProto = base(); otherProto.cardio = { protocolId: 'jackson_nonexercise', inputs: { par: 5 } };
  const ins2 = draftInsights(now, [{ date: '2026-08-01', results: calculate(otherProto, athlete) }]);
  assert.ok(ins2.some((i) => i.title === 'VO₂ not compared'));
});

test('Insights flag a 10% grip difference', () => {
  const a = base(); a.strength = { gripL: [36], gripR: [46] };
  const ins = draftInsights(calculate(a, athlete), []);
  assert.ok(ins.some((i) => i.title.startsWith('Grip side difference')));
});
