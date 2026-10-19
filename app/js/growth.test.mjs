import test from 'node:test';
import assert from 'node:assert';
const { maturityOffset, growthGuide } = await import('./growth.js');
const { questionsFor, energyResult } = await import('./energy.js');

test('Mirwald maturity offset matches a worked example for a boy and a girl', () => {
  const boy = maturityOffset({ sex: 'male', age: 13, heightCm: 155, sittingCm: 80, weightKg: 45 });
  assert.ok(Math.abs(boy - -1.063) < 0.01, String(boy));
  const girl = maturityOffset({ sex: 'female', age: 12, heightCm: 150, sittingCm: 78, weightKg: 40 });
  // -9.376 + .0001882*72*78 + .0022*12*72 + .005841*12*78 - .002658*12*40 + .07693*(40/150*100)
  const expect = -9.376 + 0.0001882 * 72 * 78 + 0.0022 * 12 * 72 + 0.005841 * 12 * 78 - 0.002658 * 12 * 40 + 0.07693 * (4000 / 150);
  assert.ok(Math.abs(girl - expect) < 1e-9);
});

test('the growth guard gives a range and a phase, and refuses bad input', () => {
  const g = growthGuide({ sex: 'male', age: 13, heightCm: 155, sittingCm: 80, weightKg: 45 });
  assert.equal(g.phase, 'before');
  assert.equal(g.peakAge, 14.1);
  assert.equal(g.to - g.from, 2);
  assert.equal(growthGuide({ sex: 'male', age: 14, heightCm: 165, sittingCm: 85, weightKg: 52 }).phase, 'now');
  assert.ok(growthGuide({ sex: 'male', age: 19, heightCm: 175, sittingCm: 90, weightKg: 65 }).errors);
  assert.ok(growthGuide({ sex: 'male', age: 13, heightCm: 155, sittingCm: 120, weightKg: 45 }).errors);
});

test('the energy check is private, sex-specific and errs towards talking to a physio', () => {
  assert.ok(questionsFor('female', 16).some((q) => q.key === 'periods'));
  assert.ok(!questionsFor('male', 16).some((q) => q.key === 'drive'));
  assert.ok(questionsFor('male', 20).some((q) => q.key === 'drive'));
  const none = Object.fromEntries(questionsFor('female', 20).map((q) => [q.key, false]));
  assert.equal(energyResult(none, 'female', 20).level, 'clear');
  assert.equal(energyResult(Object.assign({}, none, { periods: true }), 'female', 20).level, 'talk');
  assert.equal(energyResult(Object.assign({}, none, { tired: true }), 'female', 20).level, 'watch');
  assert.equal(energyResult(Object.assign({}, none, { tired: true, ill: true, drop: true }), 'female', 20).level, 'talk');
  assert.equal(energyResult({ tired: true }, 'female', 20), null);
});
