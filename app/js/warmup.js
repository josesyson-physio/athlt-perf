// A 15 to 20 minute warm-up built from the athlete's Mirror, in the style of FIFA 11+:
// an easy start, drills for the areas that need work (weakest first), then build-up runs.
// Warm-up doses are lighter than the full exercise, so legs are ready, not tired.
import { forArea } from './library.js';

const OPEN = [
  { key: 'wu-jog', name: 'Easy jog', dose: '4 minutes', equipment: 'Open ground', steps: ['Jog at an easy pace you could talk at.', 'Add a few side-steps and backward jogs.'] },
  { key: 'wu-swing', name: 'Leg swings and hip circles', dose: '10 each leg', equipment: 'A wall', steps: ['Hold a wall. Swing one leg forward and back, relaxed.', 'Then open and close the hip in circles.'] },
  { key: 'wu-lunge', name: 'Walking lunges with a twist', dose: '2 × 8 each leg', equipment: 'Open ground', steps: ['Step into a long lunge, back knee near the ground.', 'Turn your chest over the front knee. Stand and switch legs.'] },
];
const CLOSE = [
  { key: 'wu-skips', name: 'A-skips and high knees', dose: '2 × 20 m', equipment: 'Open ground', steps: ['Skip with a quick knee lift and a fast foot strike.', 'Walk back between rounds.'] },
  { key: 'wu-build', name: 'Build-up runs', dose: '3 × 60 m', equipment: 'Open ground', steps: ['Start easy and build to about 80% of top speed by the end.', 'Walk back between runs.'] },
];
// Warm-up dose: one set, or half the time.
const light = (dose) => String(dose).replace(/^\s*\d+\s*×\s*/, '1 × ').replace(/(\d+) s\b/, (m, n) => Math.max(15, Math.round(n / 2)) + ' s');

export function buildWarmup(rows) {
  const order = { work: 0, watch: 1 };
  const gaps = (rows || []).filter((x) => x.tested && order[x.status] != null).sort((a, b) => order[a.status] - order[b.status]);
  const picked = [];
  gaps.forEach((g) => {
    const ex = forArea(g.area).find((e) => !picked.some((p) => p.key === e.key));
    if (ex && picked.length < 4) picked.push(Object.assign({}, ex, { dose: light(ex.dose), why: g.name + (g.status === 'work' ? ' to work on' : ' to watch') }));
  });
  if (!picked.length) ['balance', 'core'].forEach((a) => { const ex = forArea(a)[0]; if (ex) picked.push(Object.assign({}, ex, { dose: light(ex.dose), why: 'All-round' })); });
  return { items: OPEN.concat(picked, CLOSE), targeted: gaps.map((g) => g.name), minutes: 6 + picked.length * 2 + 6 };
}
