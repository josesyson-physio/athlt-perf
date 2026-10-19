const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('./tests.js');

const r = (testKey, date, x) => Object.assign({ id: testKey + date, test: testKey, date }, x);

test('calf raise: left far behind is work on, low but even is watch', () => {
  const j = T.judge('calf', { left: 19, right: 27 });
  assert.equal(j.status, 'work');
  assert.equal(j.weak, 'left');
  assert.match(j.text, /^Left calf is 30% behind/);
  assert.equal(T.judge('calf', { left: 22, right: 23 }).status, 'watch');
  assert.equal(T.judge('calf', { left: 30, right: 31 }).status, 'even');
});

test('lunge, hop, reach and bridge follow their published levels', () => {
  assert.equal(T.judge('lunge', { left: 8, right: 10.5 }).status, 'work');
  assert.equal(T.judge('lunge', { left: 9, right: 10.5 }).status, 'even');
  assert.equal(T.judge('hop', { left: 150, right: 170 }).status, 'work');
  assert.equal(T.judge('hop', { left: 160, right: 170 }).status, 'even');
  assert.equal(T.judge('reach', { left: 60, right: 65 }).status, 'work');
  assert.equal(T.judge('bridge', { left: 18, right: 26 }).status, 'work');
  assert.equal(T.judge('sideplank', { left: 50, right: 60 }).status, 'watch');
  assert.equal(T.judge('squeeze', { value: 0 }).status, 'even');
  assert.equal(T.judge('squeeze', { value: 3 }).status, 'work');
  assert.equal(T.judge('run12', { value: 2800 }), null);
});

test('ghost is the best earlier result; lower is better for sprints', () => {
  const res = [r('calf', '2026-09-01', { left: 22, right: 25 }), r('calf', '2026-10-01', { left: 19, right: 27 })];
  assert.deepEqual(T.ghost(res, 'calf'), { left: 22, right: 27, date: '2026-10-01' });
  const sp = [r('sprint20', '2026-09-01', { value: 3.4 }), r('sprint20', '2026-10-01', { value: 3.3 })];
  assert.equal(T.ghost(sp, 'sprint20').value, 3.3);
  assert.equal(T.ghost([], 'calf'), null);
});

test('mirror shows the worst test per area, and untested areas as untested', () => {
  const rows = T.mirror([r('calf', '2026-10-01', { left: 19, right: 27 }), r('sideplank', '2026-10-01', { left: 60, right: 61 })]);
  const calf = rows.find((x) => x.area === 'calf');
  assert.equal(calf.status, 'work');
  assert.equal(calf.pctL, 70);
  assert.equal(calf.pctR, 100);
  assert.equal(rows.find((x) => x.area === 'core').status, 'even');
  assert.equal(rows.find((x) => x.area === 'knee').tested, false);
});

test('improvements list single-number tests that beat the last best', () => {
  const res = [r('run12', '2026-09-01', { value: 2600 }), r('run12', '2026-10-01', { value: 2720 }), r('sprint20', '2026-09-01', { value: 3.2 }), r('sprint20', '2026-10-01', { value: 3.3 })];
  assert.deepEqual(T.improvements(res).map((x) => [x.test, x.change]), [['run12', 120]]);
});

test('impossible values are refused before saving', () => {
  assert.ok(T.check('calf', { left: -1, right: 20 }).length);
  assert.ok(T.check('sprint20', { value: 1.2 }).length);
  assert.deepEqual(T.check('calf', { left: 20, right: 22 }), []);
  assert.ok(T.check('calf', { left: '', right: 22 })[0].includes('left'));
});

test('reaction start: phone-measured, lower is better, guesses rejected', () => {
  const t = T.byKey('reaction');
  assert.equal(t.lowerBetter, true);
  assert.ok(T.check('reaction', { value: 50 }).length);
  assert.equal(T.check('reaction', { value: 240 }).length, 0);
  assert.equal(T.judge('reaction', { value: 240 }), null);
  const h = [r('reaction', '2026-09-01', { value: 260 }), r('reaction', '2026-10-01', { value: 240 })];
  assert.equal(T.ghost(h, 'reaction').value, 240);
});
