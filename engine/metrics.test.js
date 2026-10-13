const test = require('node:test');
const assert = require('node:assert');
const M = require('./metrics.js');

test('BMI and waist-to-height', () => {
  assert.strictEqual(M.bmi(72, 178).value, 22.7);
  assert.strictEqual(M.waistToHeight(80, 178).value, 0.45);
  assert.strictEqual(M.bmi(null, 178), null);
});

test('Mean arterial pressure', () => {
  assert.strictEqual(M.meanArterialPressure(120, 78).value, 92);
  assert.strictEqual(M.meanArterialPressure(80, 120), null);
});

test('HR recovery keeps its interval and flags impossible pairs', () => {
  const r = M.hrRecovery(192, 150, 60);
  assert.strictEqual(r.value, 42);
  assert.strictEqual(r.interval_s, 60);
  assert.strictEqual(M.hrRecovery(150, 160, 60).flags.length, 1);
  assert.strictEqual(M.hrRecovery(192, null, 60), null);
});

test('Predicted HR max is labelled estimated', () => {
  const r = M.predictedHrMax(22);
  assert.strictEqual(r.value, 193);
  assert.strictEqual(r.label, 'estimated');
});

test('HR reserve labels depend on peak source', () => {
  assert.strictEqual(M.hrReservePct(150, 60, 190, 'measured').label, 'calculated');
  assert.strictEqual(M.hrReservePct(150, 60, 190, 'predicted').label, 'estimated');
  assert.strictEqual(M.hrReservePct(150, 60, 190, 'measured').value, 69);
  assert.strictEqual(M.hrReservePct(150, 60, 50), null);
});

test('Grip summary with asymmetry', () => {
  const g = M.grip([40, 42, ''], [38, 37.5]);
  assert.strictEqual(g.left.best, 42);
  assert.strictEqual(g.right.best, 38);
  assert.strictEqual(g.asymmetry_pct, 9.5);
  assert.strictEqual(g.value, 42);
  assert.strictEqual(M.grip([], []), null);
});

test('Jump height from reach', () => {
  const j = M.jump(228, [280, 284, 279]);
  assert.strictEqual(j.value, 56);
  assert.deepStrictEqual(j.trials, [52, 56, 51]);
  assert.strictEqual(M.jump(228, [220]).flags.length, 1);
});

test('Sprint best, speed and decrement', () => {
  const s = M.sprint([4.1, 4.2, 4.3], 30);
  assert.strictEqual(s.value, 4.1);
  assert.strictEqual(s.speed_m_s, 7.32);
  assert.strictEqual(s.decrement_pct, 2.4);
  assert.strictEqual(M.sprint([4.1, 4.2]).decrement_pct, null);
});

test('Vitals safety flags', () => {
  assert.strictEqual(M.vitalsFlags({ restHr: 58, sbp: 120, dbp: 78, spo2: 98, tempC: 36.7 }).length, 0);
  assert.strictEqual(M.vitalsFlags({ sbp: 205, dbp: 90 })[0].level, 'stop');
  assert.strictEqual(M.vitalsFlags({ sbp: 145, dbp: 85 })[0].level, 'check');
  assert.strictEqual(M.vitalsFlags({ tempC: 38.2 })[0].level, 'stop');
  assert.strictEqual(M.vitalsFlags({ restHr: 38 })[0].level, 'check');
});
