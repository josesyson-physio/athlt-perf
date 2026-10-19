// Growth-spurt guard for athletes under 18. Mirwald et al. (Med Sci Sports Exerc 2002) estimate the
// years from peak height velocity (the fastest growth) from height, sitting height, weight and age.
// The error is about ±0.6 years and larger for very early or late developers, so the app shows a
// range, never a single date, and treats the guess as a guide only.
export const RANGE = 1;

export function maturityOffset({ sex, age, heightCm, sittingCm, weightKg }) {
  const A = Number(age), H = Number(heightCm), SH = Number(sittingCm), W = Number(weightKg);
  if (![A, H, SH, W].every((v) => isFinite(v) && v > 0) || SH >= H) return null;
  const LL = H - SH, ratio = (W / H) * 100;
  if (sex === 'male') return -9.236 + 0.0002708 * LL * SH - 0.001663 * A * LL + 0.007216 * A * SH + 0.02292 * ratio;
  if (sex === 'female') return -9.376 + 0.0001882 * LL * SH + 0.0022 * A * LL + 0.005841 * A * SH - 0.002658 * A * W + 0.07693 * ratio;
  return null;
}

// Plain-words guidance. phase: before, now (within a year of peak growth), after.
export function growthGuide(input) {
  const errs = [];
  const A = Number(input.age);
  if (!(A >= 8 && A < 18)) errs.push('The growth guard is for ages 8 to 17.');
  if (!(input.sex === 'male' || input.sex === 'female')) errs.push('Choose male or female: the equations differ.');
  const H = Number(input.heightCm), SH = Number(input.sittingCm), W = Number(input.weightKg);
  if (!(H >= 110 && H <= 210)) errs.push('Height should be in cm, between 110 and 210.');
  if (!(SH >= 55 && SH <= 110) || SH >= H * 0.6) errs.push('Sitting height looks wrong. Measure from the seat to the top of the head, in cm.');
  if (!(W >= 20 && W <= 130)) errs.push('Weight should be in kg, between 20 and 130.');
  if (errs.length) return { errors: errs };
  const mo = maturityOffset(input);
  const peakAge = A - mo;
  const r1 = Math.round((peakAge - RANGE) * 10) / 10, r2 = Math.round((peakAge + RANGE) * 10) / 10;
  const phase = mo < -RANGE ? 'before' : mo > RANGE ? 'after' : 'now';
  const text = {
    before: 'Your fastest growth is probably still ahead, likely between ages ' + r1 + ' and ' + r2 + '. Build skill, speed and body-weight strength now.',
    now: 'You are probably in or near your fastest growth (likely between ages ' + r1 + ' and ' + r2 + '). Bones and tendons are more easily hurt now: cut jumping and sprint volume by about a third, add rest days, and tell your coach about any knee or heel pain.',
    after: 'Your fastest growth has probably passed (likely between ages ' + r1 + ' and ' + r2 + '). You can build up strength training step by step with your coach.',
  }[phase];
  return { offset: Math.round(mo * 10) / 10, peakAge: Math.round(peakAge * 10) / 10, from: r1, to: r2, phase, text };
}
