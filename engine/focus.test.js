const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('./focus.js');

const TODAY = '2026-10-17';
const res = (date, items) => ({ date, results: { items } });

test('nothing entered means no focus areas and all normal training', () => {
  assert.deepEqual(F.findAreas({ today: TODAY }), []);
  const p = F.weekPlan([], 300);
  assert.equal(p.focusMin, 0);
  assert.equal(p.normalMin, 300);
});

test('coach rating, pain and left/right differences add up per area', () => {
  const areas = F.findAreas({
    today: TODAY,
    ratings: { ankle: 'weak', core: 'ok', knee: 'good' },
    checkins: [{ date: '2026-10-16', pain: true, regions: ['Ankle'], painScore: 5 }, { date: '2026-10-10', pain: true, regions: ['Ankle'], painScore: 2 }],
    assessments: [res('2026-10-01', [{ key: 'lunge', left: 6, right: 10 }, { key: 'grip', left: { best: 30 }, right: { best: 40 }, asymmetry_pct: 25 }])],
  });
  assert.equal(areas[0].key, 'ankle');
  assert.equal(areas[0].points, 3 + 1 + 2);
  assert.ok(areas[0].hurts);
  assert.ok(areas[0].reasons.some((r) => r.startsWith('Left ankle bends 4 cm less')));
  assert.ok(areas.find((a) => a.key === 'arm').reasons[0].startsWith('Left hand grip is 25% weaker'));
  assert.ok(!areas.some((a) => a.key === 'knee'));
});

test('a test that got worse since last time points to that area', () => {
  const areas = F.findAreas({ today: TODAY, assessments: [res('2026-10-01', [{ key: 'vo2', value: 47 }, { key: 'sprint', value: 3.3 }]), res('2026-08-01', [{ key: 'vo2', value: 50 }, { key: 'sprint', value: 3.3 }])] });
  assert.deepEqual(areas.map((a) => a.key), ['stamina']);
  assert.match(areas[0].reasons[0], /6% worse/);
});

test('60% of the week goes to the top areas, split by points, in 5-minute steps', () => {
  const p = F.weekPlan([{ key: 'ankle', points: 6 }, { key: 'core', points: 3 }, { key: 'speed', points: 1 }, { key: 'hip', points: 1 }], 300);
  assert.equal(p.focusMin, 180);
  assert.equal(p.normalMin, 120);
  assert.equal(p.areas.length, 3);
  assert.equal(p.areas.reduce((s, a) => s + a.minutes, 0), 180);
  assert.ok(p.areas.every((a) => a.minutes % 5 === 0));
  assert.ok(p.areas[0].minutes > p.areas[1].minutes);
  assert.equal(F.weekPlan([], ''), null);
});

test('an area that hurts gets only its easiest exercise', () => {
  const p = F.weekPlan([{ key: 'knee', points: 3, hurts: true }], 200);
  assert.equal(p.areas[0].drills.length, 1);
  assert.match(p.areas[0].drills[0], /Wall sit/);
});

test('an area nobody trained in the last month is pushed up the list', () => {
  const areas = F.findAreas({ today: TODAY, ratings: { knee: 'ok', hip: 'ok' }, trained: { hip: false, knee: true } });
  assert.equal(areas[0].key, 'hip');
  assert.equal(areas[0].points, 3);
  assert.ok(areas[0].missed);
  assert.ok(areas[0].reasons.includes('Not trained in the last month'));
});
