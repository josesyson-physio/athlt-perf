import test from 'node:test';
import assert from 'node:assert';
const A = await import('./autoposts.js');
const L = await import('./library.js');

test('Dr. Jose has 50 built-in posts with a mix of formats', () => {
  assert.equal(A.POSTS.length, 50);
  assert.equal(new Set(A.POSTS.map((p) => p.id)).size, 50);
  const n = (f) => A.POSTS.filter(f).length;
  assert.equal(n((p) => p.type === 'video'), 15);
  assert.equal(n((p) => p.type === 'meme'), 12);
  assert.equal(n((p) => p.type === 'chart'), 9);
  assert.equal(n((p) => p.series === 'move'), 10); // Move Better lessons, plus 2 videos and a chart
  assert.ok(A.POSTS.every((p) => p.auto && p.authorName === 'Dr. Jose' && /Automated/.test(p.authorLine)));
});

test('every video has an animation and every chart row a real drill', () => {
  for (const p of A.POSTS.filter((x) => x.type === 'video' && x.anim !== 'breathe')) {
    assert.ok(A.FIG[p.anim], p.anim);
    const f = A.frame(A.FIG[p.anim], 400);
    assert.ok(A.segments(f.pose).every(([a, b]) => [a[0], a[1], b[0], b[1]].every(Number.isFinite)), p.anim);
    if (p.ex !== 'move') assert.ok(L.byKey(p.ex), p.ex);
  }
  for (const p of A.POSTS.filter((x) => x.type === 'chart' && x.kind === 'circuit')) for (const [k, , name] of p.rows) assert.ok(name || L.byKey(k), k);
});

test('a different post leads the feed each day, with no repeats', () => {
  const d1 = A.dailyPosts('2026-11-01'), d2 = A.dailyPosts('2026-11-02');
  assert.equal(d1[0].id, 'DJ-01');
  assert.equal(d2[0].id, 'DJ-02');
  assert.equal(d2[1].id, 'DJ-01');
  assert.equal(new Set(d2.map((p) => p.id)).size, 50);
  assert.equal(A.dailyPosts('2026-12-21')[0].id, 'DJ-01'); // after 50 days it starts again
  assert.ok(d1[0].createdAt > d1[1].createdAt);
});

test('plain, safe wording: no diet advice and no banned words', () => {
  const text = JSON.stringify(A.POSTS).toLowerCase();
  for (const w of ['cheap', '60%', 'diet', 'calorie', 'protein', 'quantum']) assert.ok(!text.includes(w), w);
});
