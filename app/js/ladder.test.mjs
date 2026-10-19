import test from 'node:test';
import assert from 'node:assert';
const L = await import('./ladder.js');
const { buildWarmup } = await import('./warmup.js');

test('a stage passes only with pain 2 or less during and next morning, and no limp', () => {
  const walk = L.stageByKey('walk');
  assert.equal(L.judgeAttempt(walk, { painDuring: 2, painMorning: 1 }, null).pass, true);
  assert.equal(L.judgeAttempt(walk, { painDuring: 3, painMorning: 0 }, null).pass, false);
  assert.equal(L.judgeAttempt(walk, { painDuring: 0, painMorning: 0, limp: true }, null).pass, false);
  assert.equal(L.judgeAttempt(walk, { painDuring: '', painMorning: 0 }, null).pass, false);
});

test('stride stages also need the weaker leg to hop 90% as far, tested in the last 14 days', () => {
  const s = L.stageByKey('strides');
  assert.equal(L.judgeAttempt(s, { painDuring: 0, painMorning: 0 }, null).pass, false);
  assert.equal(L.judgeAttempt(s, { painDuring: 0, painMorning: 0 }, 88).pass, false);
  assert.equal(L.judgeAttempt(s, { painDuring: 0, painMorning: 0 }, 92).pass, true);
  const res = [{ test: 'hop', date: '2026-10-01', left: 150, right: 170 }, { test: 'hop', date: '2026-10-15', left: 160, right: 170 }];
  assert.equal(L.hopLsi(res, '2026-10-19'), 94);
  assert.equal(L.hopLsi(res, '2026-11-10'), null);
});

test('the ladder moves up one passed stage at a time', () => {
  const lad = { stages: ['walk', 'walkjog', 'easy'], log: [{ stage: 'walk', pass: true }, { stage: 'walkjog', pass: false }] };
  assert.deepEqual(L.ladderStatus(lad), { index: 1, current: 'walkjog', done: false, passed: 1, total: 3 });
  lad.log.push({ stage: 'walkjog', pass: true }, { stage: 'easy', pass: true });
  assert.equal(L.ladderStatus(lad).done, true);
});

test('the warm-up targets work areas first, then watch areas, with lighter doses', () => {
  const rows = [{ area: 'calf', name: 'Calf', tested: true, status: 'watch' }, { area: 'ankle', name: 'Ankle', tested: true, status: 'work' }, { area: 'knee', name: 'Knee', tested: true, status: 'even' }];
  const w = buildWarmup(rows);
  assert.deepEqual(w.targeted, ['Ankle', 'Calf']);
  const mid = w.items.slice(3, -2);
  assert.equal(mid[0].area, 'ankle');
  assert.equal(mid[1].area, 'calf');
  assert.ok(mid.every((x) => !/^[2-9] ×/.test(x.dose)));
  assert.ok(buildWarmup([]).items.length >= 6);
});
