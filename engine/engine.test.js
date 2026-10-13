const test = require('node:test');
const assert = require('node:assert');
const E = require('./engine.js');

const ok = { decision: 'proceed' };

test('Cooper worked example from the spec: 2800 m gives 51.3 and 3.59 L/min', () => {
  const r = E.calculate('cooper_12min', { athlete: { age: 25, sex: 'male', mass_kg: 70 }, inputs: { distance_m: 2800 }, completed: true, screening: ok });
  assert.strictEqual(r.label, 'estimated');
  assert.strictEqual(r.relative_ml_kg_min, 51.3);
  assert.strictEqual(r.absolute_l_min, 3.59);
  assert.strictEqual(r.typical_range_ml_kg_min, null);
});

test('Cooper on a woman is a qualified estimate', () => {
  const r = E.calculate('cooper_12min', { athlete: { age: 25, sex: 'female' }, inputs: { distance_m: 2400 }, completed: true, screening: ok });
  assert.strictEqual(r.qualified, true);
  assert.ok(r.flags.some((f) => f.code === 'outside_sex'));
});

test('Rockport reproduces published worked example (42.3)', () => {
  const r = E.calculate('rockport_1mile', { athlete: { age: 30, sex: 'female', mass_kg: 155.5 / 2.20462 }, inputs: { time_min: 13.56, end_hr_bpm: 145 }, completed: true, screening: ok });
  assert.strictEqual(r.relative_ml_kg_min, 42.3);
  assert.deepStrictEqual(r.typical_range_ml_kg_min, [37.3, 47.3]);
});

test('Queens step men and women', () => {
  const m = E.calculate('queens_step', { athlete: { age: 22, sex: 'male' }, inputs: { recovery_hr_bpm: 150 }, completed: true, screening: ok });
  assert.strictEqual(m.relative_ml_kg_min, 48.3);
  const f = E.calculate('queens_step', { athlete: { age: 22, sex: 'female' }, inputs: { recovery_hr_bpm: 150 }, completed: true, screening: ok });
  assert.strictEqual(f.relative_ml_kg_min, 38.1);
});

test('Jackson non-exercise needs no screening clearance', () => {
  const r = E.calculate('jackson_nonexercise', { athlete: { age: 30, sex: 'male', mass_kg: 75, height_cm: 180 }, inputs: { par: 5 }, screening: { decision: 'refer' } });
  assert.strictEqual(r.label, 'estimated');
  assert.strictEqual(r.relative_ml_kg_min, 48.1);
});

test('Uth ratio flags a predicted max HR', () => {
  const r = E.calculate('uth_hr_ratio', { athlete: { age: 30, sex: 'male' }, inputs: { rest_hr_bpm: 55 } });
  assert.ok(r.flags.some((f) => f.code === 'predicted_hrmax'));
  assert.strictEqual(r.relative_ml_kg_min, Math.round(15.3 * (187 / 55) * 10) / 10);
});

test('Exercise test blocked without screening clearance', () => {
  const r = E.calculate('cooper_12min', { athlete: {}, inputs: { distance_m: 2800 }, completed: true, screening: { decision: 'refer' } });
  assert.strictEqual(r.label, 'not_available');
});

test('Incomplete test is invalid, never scored', () => {
  const r = E.calculate('cooper_12min', { athlete: {}, inputs: { distance_m: 2800 }, completed: false, screening: ok });
  assert.strictEqual(r.label, 'invalid');
});

test('Missing inputs are never guessed', () => {
  const r = E.calculate('rockport_1mile', { athlete: { sex: 'male' }, inputs: { time_min: 14 }, completed: true, screening: ok });
  assert.strictEqual(r.label, 'not_available');
  assert.ok(r.missing.length >= 2);
});

test('Distance in km where metres are expected is rejected', () => {
  const r = E.calculate('cooper_12min', { athlete: {}, inputs: { distance_m: 2.8 }, completed: true, screening: ok });
  assert.strictEqual(r.label, 'invalid');
});

test('Unknown protocol is not available', () => {
  assert.strictEqual(E.calculate('made_up', {}).label, 'not_available');
});

test('Measured gas analysis is labelled measured, tier A, and needs screening', () => {
  const r = E.calculate('measured_gas_analysis', { athlete: { age: 30, sex: 'female', mass_kg: 60 }, inputs: { vo2_ml_kg_min: 52.4 }, completed: true, screening: ok });
  assert.strictEqual(r.label, 'measured');
  assert.strictEqual(r.tier, 'A');
  assert.strictEqual(r.relative_ml_kg_min, 52.4);
  assert.strictEqual(E.calculate('measured_gas_analysis', { athlete: {}, inputs: { vo2_ml_kg_min: 52.4 }, completed: true, screening: { decision: 'refer' } }).label, 'not_available');
});

test('Protocols are ordered from most to least accurate tier', () => {
  const tiers = E.PROTOCOLS.map((p) => p.tier);
  assert.deepStrictEqual(tiers, [...tiers].sort());
  assert.strictEqual(E.PROTOCOLS[0].id, 'measured_gas_analysis');
});

test('Heart-rate ratio drops to tier D when max HR is predicted', () => {
  const r = E.calculate('uth_hr_ratio', { athlete: { age: 30, sex: 'male' }, inputs: { rest_hr_bpm: 55 } });
  assert.strictEqual(r.tier, 'D');
  const m = E.calculate('uth_hr_ratio', { athlete: { age: 30, sex: 'male' }, inputs: { rest_hr_bpm: 55, max_hr_bpm: 190 } });
  assert.strictEqual(m.tier, 'C');
});
