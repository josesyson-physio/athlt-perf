import test from 'node:test';
import assert from 'node:assert';
import { createRequire } from 'node:module';
globalThis.MotionPlusTests = createRequire(import.meta.url)('../../engine/tests.js');
const J = await import('./journey.js');
const M = await import('./move.js');

const res = (test, date, x) => Object.assign({ id: test + date, test, date }, x);
const move = (stage, date) => ({ id: stage + date, kind: 'move', stage, date });

test('weeks start on Monday', () => {
  assert.equal(J.weekStart('2026-11-01'), '2026-10-26'); // a Sunday
  assert.equal(J.weekStart('2026-11-02'), '2026-11-02');
});

test('points come from showing up: pulse, tests, new bests and closed gaps', () => {
  const data = {
    checkins: [{ date: '2026-10-20' }, { date: '2026-10-21' }],
    results: [res('calf', '2026-10-20', { left: 15, right: 25 }), res('calf', '2026-10-27', { left: 26, right: 27 })],
  };
  const j = J.journey(data, '2026-10-28');
  assert.equal(j.parts.pulse, 20);
  assert.equal(j.parts.test, 40);
  assert.equal(j.parts.best, 30); // both sides went up on the second test
  assert.equal(j.parts.gap, 50); // calf went from work on to even
  assert.ok(j.badges.find((b) => b.key === 'gap').earned);
  assert.ok(j.badges.find((b) => b.key === 'first').earned);
  assert.equal(j.badges.find((b) => b.key === 'fire7').earned, false);
});

test('levels climb with points and show how far to the next', () => {
  const checkins = Array.from({ length: 25 }, (_, i) => ({ date: '2026-10-' + String(i + 1).padStart(2, '0') }));
  const j = J.journey({ checkins }, '2026-10-25');
  assert.ok(j.points >= 250);
  assert.equal(j.level.name, 'Local Star');
  assert.equal(j.next.name, 'District');
  assert.equal(j.toNext, j.next.points - j.points);
  assert.ok(j.badges.find((b) => b.key === 'fire7').earned);
});

test('quests aim at the weakest area found before the week began', () => {
  const data = { checkins: [], results: [res('hop', '2026-10-20', { left: 140, right: 170 })], moves: [] };
  const q = J.questsFor(data, '2026-10-26');
  assert.equal(q.length, 3);
  assert.equal(q[0].key, 'pulse');
  assert.equal(q[1].key, 'retest');
  assert.match(q[1].text, /knee/);
  assert.equal(q[1].done, false);
  data.results.push(res('hop', '2026-10-28', { left: 160, right: 170 }));
  assert.equal(J.questsFor(data, '2026-10-26')[1].done, true);
});

test('Move Better stages open one at a time: 3 session days and the check', () => {
  let st = M.moveStatus([], []);
  assert.equal(st.current.key, 'release');
  assert.equal(st.stages[1].state, 'locked');
  const moves = ['2026-10-20', '2026-10-21', '2026-10-21', '2026-10-23'].map((d) => move('release', d));
  st = M.moveStatus(moves, []);
  assert.equal(st.stages[0].state, 'done');
  assert.equal(st.stages[0].clearedOn, '2026-10-23');
  assert.equal(st.current.key, 'breathe');
  const more = moves.concat(['2026-10-24', '2026-10-25', '2026-10-26'].map((d) => move('breathe', d)));
  assert.equal(M.moveStatus(more, []).current.key, 'breathe'); // check not done yet
  assert.equal(M.moveStatus(more, [res('breath', '2026-10-26', { value: 25 })]).current.key, 'stand');
});

test('spring score from motion samples: hop height over ground time', () => {
  // 10 hops: 200 ms on the ground at 2 g, 300 ms in the air near 0 g, sampled every 10 ms.
  const s = [];
  let t = 0;
  for (let h = 0; h < 10; h++) {
    for (let i = 0; i < 20; i++) { s.push({ t, a: 20 }); t += 10; }
    for (let i = 0; i < 30; i++) { s.push({ t, a: 0.5 }); t += 10; }
  }
  const r = M.springFromSamples(s);
  assert.ok(r);
  assert.ok(Math.abs(r.contactMs - 210) <= 10);
  assert.ok(Math.abs(r.heightCm - 9.9) < 1.5);
  assert.ok(r.score > 0.3 && r.score < 0.7);
  assert.equal(M.springFromSamples(s.slice(0, 60)), null); // too few hops
});

test('new Move Better tests: turn gap is watch-only, spring score is checked', () => {
  const T = globalThis.MotionPlusTests;
  assert.equal(T.judge('rotation', { left: 40, right: 50 }).status, 'watch');
  assert.equal(T.judge('rotation', { left: 48, right: 50 }).status, 'even');
  assert.equal(T.judge('posture', { value: 3 }), null);
  assert.deepEqual(T.check('spring', { value: 1.4 }), []);
  assert.equal(T.check('spring', { value: 9 }).length, 1);
  assert.ok(T.mirror([]).some((x) => x.area === 'spine'));
});
