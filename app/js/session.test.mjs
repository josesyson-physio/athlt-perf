import test from 'node:test';
import assert from 'node:assert';
const store = await import('./store.js');
const S = await import('./session.js');
await store.init(); // no IndexedDB in Node: runs in memory

const coach = { role: 'coach', name: 'Asha Coach', email: 'asha@x.in', password: 'coachpass' };
const runner = { role: 'athlete', name: 'Ravi Runner', email: 'ravi@x.in', password: 'ravipass', birthYear: '2008', sex: 'male' };

test('sign-up errors are given per field, in plain words', () => {
  const e = S.signupFieldErrors({ role: 'athlete', name: '', email: 'nope', password: '123', birthYear: '', sex: '' });
  assert.deepEqual(Object.keys(e).sort(), ['birthYear', 'email', 'name', 'password', 'sex']);
  assert.deepEqual(S.signupFieldErrors(Object.assign({}, runner)), {});
});

test('switching to a real account on a shared phone needs its password', async () => {
  const c = await S.signUp(coach);
  const r = await S.signUp(runner);
  assert.equal(S.me().id, r.id);
  assert.equal(await S.switchWithPassword(c.id, 'wrong'), false);
  assert.equal(S.me().id, r.id);
  assert.equal(await S.switchWithPassword(c.id, 'coachpass'), true);
  assert.equal(S.me().id, c.id);
  assert.equal(S.needsPassword(Object.assign({}, c, { example: true })), false);
});

test("a personal backup holds only that person's records", async () => {
  const [c, r] = ['asha@x.in', 'ravi@x.in'].map((e) => store.getState().users.find((u) => u.email === e));
  await store.saveRecord('checkins', { id: 'CI-1', athleteId: r.athleteId, date: '2026-11-01' });
  await store.saveRecord('checkins', { id: 'CI-2', athleteId: 'someone-else', date: '2026-11-01' });
  const b = store.exportFor(r.id);
  assert.deepEqual(b.users.map((u) => u.id), [r.id]);
  assert.deepEqual(b.checkins.map((x) => x.id), ['CI-1']);
  assert.equal(store.exportFor(c.id).checkins.length, 0);
});
