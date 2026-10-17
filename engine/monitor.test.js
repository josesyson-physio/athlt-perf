const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('./monitor.js');

const TODAY = '2026-10-14';
const d = (n) => new Date(Date.parse(TODAY + 'T00:00:00Z') - n * 864e5).toISOString().slice(0, 10);
const ci = (n, extra) => Object.assign({ id: 'c' + n, athleteId: 'A', date: d(n), pain: false, regions: [], fatigue: 2, soreness: 2, sleepHours: 8 }, extra);
const run = (data) => M.evaluate({ id: 'A' }, data, TODAY);
const rules = (r) => r.signals.map((s) => s.rule);

test('OSTRC-H2 severity score follows the gatekeeper rules', () => {
  assert.equal(M.ostrcScore({ q1: 0 }), 0);
  assert.equal(M.ostrcScore({ q1: 25 }), 100);
  assert.equal(M.ostrcScore({ q1: 8, q2: 8, q3: 0, q4: 17 }), 33);
  assert.equal(M.ostrcScore({ q1: 8, q2: 8 }), null);
  assert.equal(M.ostrcSubstantial({ q1: 17, q2: 17, q3: 8, q4: 8 }), true);
  assert.equal(M.ostrcSubstantial({ q1: 8, q2: 8, q3: 8, q4: 17 }), false);
});

test('session load is RPE times minutes, null when either is missing', () => {
  assert.equal(M.sessionLoad({ rpe: 6, actualMin: 50 }), 300);
  assert.equal(M.sessionLoad({ rpe: '', actualMin: 50 }), null);
});

test('a single day of pain is not a flag; the same region on 3 of 7 days is', () => {
  assert.ok(!rules(run({ checkins: [ci(0, { pain: true, regions: ['Calf or shin'], painScore: 2 }), ci(1), ci(2)] })).includes('pain_repeat'));
  const r = run({ checkins: [ci(0, { pain: true, regions: ['Calf or shin'], painScore: 2 }), ci(2, { pain: true, regions: ['Calf or shin'], painScore: 2 }), ci(5, { pain: true, regions: ['Calf or shin'], painScore: 2 })] });
  assert.equal(r.status, 'review');
  assert.ok(rules(r).includes('pain_repeat'));
});

test('pain on two consecutive recent days is flagged', () => {
  const r = run({ checkins: [ci(0, { pain: true, regions: ['Knee'], painScore: 2 }), ci(1, { pain: true, regions: ['Knee'], painScore: 2 })] });
  assert.ok(rules(r).includes('pain_repeat'));
});

test('a red-flag answer is urgent and outranks everything', () => {
  const r = run({ checkins: [ci(0, { redFlags: { chest: true } }), ci(1, { pain: true, regions: ['Knee'], painScore: 6 })] });
  assert.equal(r.status, 'urgent');
  assert.equal(r.signals[0].rule, 'red_chest');
});

test('missing check-ins show as no data, never as no flags', () => {
  const r = run({ checkins: [ci(3)] });
  assert.equal(r.status, 'no_data');
  assert.equal(run({ checkins: [] }).status, 'no_data');
  assert.equal(run({ checkins: [ci(0), ci(1)] }).status, 'none');
});

test('session RPE twice above the athlete’s usual for that session type is a watch flag', () => {
  const s = (n, rpe) => ({ id: 's' + n, athleteId: 'A', date: d(n), type: 'Tempo', actualMin: 40, rpe });
  const sessions = [s(30, 6), s(25, 6), s(20, 5), s(15, 6), s(10, 6), s(4, 8), s(1, 9)];
  const r = run({ checkins: [ci(0)], sessions });
  assert.ok(rules(r).includes('rpe_high'));
  const calm = run({ checkins: [ci(0)], sessions: sessions.slice(0, 6).concat([s(1, 6)]) });
  assert.ok(!rules(calm).includes('rpe_high'));
});

test('impossible values are reported and left out of the rules', () => {
  const r = run({ checkins: [ci(0, { sleepHours: 30 }), ci(1, { sleepHours: 4 }), ci(2, { sleepHours: 4 })] });
  assert.ok(r.issues.some((i) => i.text.includes('not possible')));
  assert.ok(!rules(r).includes('sleep_short'));
  const dup = { id: 'x1', athleteId: 'A', date: d(0), type: 'Tempo', actualMin: 40, rpe: 6 };
  const r2 = run({ checkins: [ci(0)], sessions: [dup, Object.assign({}, dup, { id: 'x2' })] });
  assert.ok(r2.issues.some((i) => i.text.includes('duplicate')));
});

test('OSTRC-H2 substantial problem raises a review', () => {
  const r = run({ checkins: [ci(0)], weeklies: [{ athleteId: 'A', weekStart: M.weekStart(TODAY), problems: [{ label: 'Calf strain', q1: 17, q2: 17, q3: 8, q4: 17 }] }] });
  assert.ok(rules(r).includes('ostrc_substantial'));
});

test('confidential items are marked sensitive', () => {
  const r = run({ checkins: [ci(0, { sensitive: { periodChange: true } })] });
  const s = r.signals.find((x) => x.rule === 'period_change');
  assert.ok(s && s.sensitive);
});

test('week starts on Monday', () => {
  assert.equal(M.weekStart('2026-10-14'), '2026-10-12');
  assert.equal(M.weekStart('2026-10-12'), '2026-10-12');
});
