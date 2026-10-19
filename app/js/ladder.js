// Return-to-run ladder: a physio sets the stages, and the athlete unlocks the next one only when
// they meet the pass rule. Pain is scored 0 to 10 during the stage and the next morning; 2 or less
// counts as a pass (the pain-monitoring approach used in rehab). From the stride stage on, the
// weaker leg must also hop at least 90% as far as the stronger one, tested in the last 14 days.
export const PAIN_OK = 2;
export const HOP_OK = 90;
export const STAGES = [
  { key: 'walk', name: 'Brisk walk', dose: '30 minutes', hop: false },
  { key: 'walkjog', name: 'Walk and jog', dose: 'Walk 4 min, jog 1 min, 6 times', hop: false },
  { key: 'jogwalk', name: 'Jog and walk', dose: 'Jog 4 min, walk 1 min, 6 times', hop: false },
  { key: 'easy', name: 'Easy run', dose: '20 to 30 minutes, easy pace', hop: false },
  { key: 'strides', name: 'Run with strides', dose: 'Easy run, then 6 × 80 m at 70 to 80%', hop: true },
  { key: 'sprints', name: 'Sprints and cutting', dose: '6 × 40 m at 90%, side-steps and turns', hop: true },
  { key: 'full', name: 'Full training', dose: 'Back with the group', hop: true },
];
export const stageByKey = (k) => STAGES.find((s) => s.key === k) || null;

const dayN = (iso) => Math.round(Date.parse(String(iso).slice(0, 10) + 'T00:00:00Z') / 864e5);

// Hop symmetry from the latest hop result within 14 days of `today`, or null.
export function hopLsi(results, today) {
  const hops = (results || []).filter((r) => r.test === 'hop' && dayN(today) - dayN(r.date) <= 14 && dayN(today) >= dayN(r.date)).sort((a, b) => (a.date < b.date ? 1 : -1));
  const h = hops[0];
  if (!h) return null;
  const l = Number(h.left), r = Number(h.right), hi = Math.max(l, r);
  return hi > 0 ? Math.round((Math.min(l, r) / hi) * 100) : null;
}

// Does one logged attempt pass its stage? Returns { pass, reasons[] } in plain words.
export function judgeAttempt(stage, attempt, lsi) {
  const reasons = [];
  const n = (v) => (v === '' || v == null ? NaN : Number(v));
  const d = n(attempt.painDuring), m = n(attempt.painMorning);
  if (!(d >= 0 && d <= 10) || !(m >= 0 && m <= 10)) return { pass: false, reasons: ['Score the pain from 0 to 10, during and the next morning.'] };
  if (d > PAIN_OK) reasons.push('Pain was ' + d + '/10 during. It needs to be ' + PAIN_OK + ' or less.');
  if (m > PAIN_OK) reasons.push('Pain was ' + m + '/10 the next morning. It needs to be ' + PAIN_OK + ' or less.');
  if (attempt.limp) reasons.push('Limping or swelling means stay on this stage.');
  if (stage.hop) {
    if (lsi == null) reasons.push('Do the single-leg hop test first (in the last 14 days).');
    else if (lsi < HOP_OK) reasons.push('Weaker leg hops ' + lsi + '% as far. It needs ' + HOP_OK + '% or more.');
  }
  return { pass: !reasons.length, reasons };
}

// Where the athlete is: the current stage index, passed stages, and whether the ladder is finished.
export function ladderStatus(ladder) {
  const keys = ladder.stages || [];
  const passed = new Set((ladder.log || []).filter((x) => x.pass).map((x) => x.stage));
  let i = 0;
  while (i < keys.length && passed.has(keys[i])) i++;
  return { index: i, current: keys[i] || null, done: i >= keys.length, passed: i, total: keys.length };
}
