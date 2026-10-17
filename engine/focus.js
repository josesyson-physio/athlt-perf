/*
 * MotionPlus focus plan: finds the areas that need the most work and splits the week's training.
 * Uses only what was entered: the coach's area check, pain from daily check-ins, left/right
 * differences and tests that got worse since the last assessment. No AI, no guessing.
 * Deterministic and versioned; works in the browser and in Node.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MotionPlusFocus = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const VERSION = 'focus_v1';
  const FOCUS_SHARE = 0.6; // share of the week's training given to the focus areas
  const MAX_AREAS = 3;

  // Each area has three exercises, easiest first. When the area hurts, only the first is used.
  const AREAS = [
    { key: 'ankle', name: 'Ankle and foot', regions: ['Ankle', 'Foot', 'Achilles'], drills: ['Ankle stretch, knee to wall: 2 × 10 each side', 'Calf raises on a step: 3 × 15', 'Single-leg balance on a cushion: 3 × 30 s each leg'] },
    { key: 'calf', name: 'Calf and shin', regions: ['Calf or shin'], drills: ['Calf raise holds: 5 × 30 s', 'Slow calf raises, straight and bent knee: 3 × 15 each', 'Pogo hops: 3 × 20'] },
    { key: 'knee', name: 'Knee', regions: ['Knee'], drills: ['Wall sit: 5 × 30 s', 'Step-downs from a low step: 3 × 10 each leg', 'Split squats: 3 × 10 each leg'] },
    { key: 'thigh', name: 'Thigh and hamstring', regions: ['Front of thigh', 'Hamstring'], drills: ['Glute bridges: 3 × 12', 'Reverse lunges: 3 × 10 each leg', 'Nordic hamstring lowers: 3 × 5'] },
    { key: 'hip', name: 'Hip and groin', regions: ['Hip or groin'], drills: ['Side-lying leg raises: 3 × 15 each side', 'Side steps with a band: 3 × 15 steps each way', 'Short side plank with top leg on a bench: 3 × 20 s each side'] },
    { key: 'core', name: 'Core and lower back', regions: ['Lower back'], drills: ['Bird dog: 3 × 10 each side', 'Dead bug: 3 × 10', 'Side plank: 3 × 30 s each side'] },
    { key: 'shoulder', name: 'Shoulder', regions: ['Shoulder'], drills: ['Band turn-outs, elbow at side: 3 × 15', 'Wall slides: 3 × 10', 'Push-ups: 3 × 10'] },
    { key: 'arm', name: 'Arm, wrist and grip', regions: ['Elbow, wrist or hand'], drills: ['Ball or towel squeeze: 5 × 10 s', 'Light wrist curls: 3 × 15', 'Farmer carry: 4 × 30 m'] },
    { key: 'balance', name: 'Balance', regions: [], drills: ['Single-leg stand, eyes open then closed: 3 × 30 s each leg', 'Single-leg reach in 3 directions: 3 × 8 each leg', 'Hop and hold the landing: 3 × 8 each leg'] },
    { key: 'stamina', name: 'Stamina', regions: [], drills: ['Easy steady session where you can still talk: 30 to 45 min', 'Comfortably hard tempo: 20 min', 'Intervals: 4 × 4 min hard, 3 min easy between'] },
    { key: 'speed', name: 'Speed and power', regions: [], drills: ['Skips and fast feet drills: 3 × 20 m', 'Squat jumps: 3 × 6', 'Short sprints: 6 × 20 m with full rest'] },
  ];
  const RATING = { weak: 3, ok: 1, good: 0 };
  const RATING_TEXT = { weak: 'Coach marked it weak', ok: 'Coach marked it OK, not strong' };

  const num = (v) => (v === '' || v == null ? NaN : Number(v));
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const pct = (a, b) => Math.round((Math.abs(a - b) / Math.max(a, b)) * 100);
  const day = (iso) => Math.floor(Date.parse(iso + 'T00:00:00Z') / 864e5);
  const item = (assessment, key) => (assessment && assessment.results && (assessment.results.items || []).find((i) => i.key === key)) || null;
  const side = (l, r, lowIsWeak) => ((lowIsWeak ? l < r : l > r) ? 'Left' : 'Right');

  /*
   * input: { ratings: {areaKey: 'weak'|'ok'|'good'}, trained: {areaKey: true|false}, checkins: [...], assessments: [newest first], today: 'YYYY-MM-DD' }
   * Returns every area with its points, plain reasons and whether it hurts now, highest points first.
   */
  function findAreas(input) {
    const ratings = input.ratings || {};
    const t = day(input.today);
    const recent = (input.checkins || []).filter((c) => t - day(c.date) >= 0 && t - day(c.date) < 28 && c.pain);
    const done = (input.assessments || []).filter((a) => a.results);
    const last = done[0] || null;
    const prev = done[1] || null;
    const found = {};
    AREAS.forEach((a) => { found[a.key] = { key: a.key, name: a.name, points: 0, reasons: [], hurts: false, missed: false }; });
    const add = (key, points, reason) => { found[key].points += points; found[key].reasons.push(reason); };

    Object.keys(ratings).forEach((k) => { if (found[k] && RATING[ratings[k]]) add(k, RATING[ratings[k]], RATING_TEXT[ratings[k]]); });
    // Areas nobody has been training: often the ones that were never tested because tests cost too much.
    const trained = input.trained || {};
    Object.keys(trained).forEach((k) => { if (found[k] && trained[k] === false) { add(k, 2, 'Not trained in the last month'); found[k].missed = true; } });

    AREAS.forEach((a) => {
      if (!a.regions.length) return;
      const days = recent.filter((c) => (c.regions || []).some((r) => a.regions.includes(r)));
      if (!days.length) return;
      add(a.key, days.length >= 3 ? 2 : 1, 'Pain on ' + days.length + (days.length === 1 ? ' day' : ' days') + ' in the last 4 weeks');
      if (days.some((c) => t - day(c.date) < 7 && (num(c.painScore) >= 4 || c.painAffectsRunning))) found[a.key].hurts = true;
    });

    const grip = item(last, 'grip');
    if (grip && grip.left && grip.right && isNum(grip.asymmetry_pct) && grip.asymmetry_pct >= 10) {
      add('arm', 2, side(grip.left.best, grip.right.best, true) + ' hand grip is ' + Math.round(grip.asymmetry_pct) + '% weaker than the other');
    }
    const lunge = item(last, 'lunge');
    if (lunge && isNum(lunge.left) && isNum(lunge.right) && Math.abs(lunge.left - lunge.right) >= 2) {
      add('ankle', 2, side(lunge.left, lunge.right, true) + ' ankle bends ' + Math.round(Math.abs(lunge.left - lunge.right) * 10) / 10 + ' cm less than the other');
    }
    const sls = item(last, 'sls');
    if (sls && isNum(sls.left) && isNum(sls.right) && Math.max(sls.left, sls.right) > 0 && pct(sls.left, sls.right) >= 20) {
      add('balance', 2, side(sls.left, sls.right, true) + ' leg balance ' + Math.min(sls.left, sls.right) + ' s against ' + Math.max(sls.left, sls.right) + ' s on the other');
    }

    // Tests that got worse since the previous assessment.
    const drop = (key, area, points, minPct, higherIsBetter, label) => {
      const a = item(last, key), b = item(prev, key);
      if (!a || !b || !isNum(a.value) || !isNum(b.value) || b.value <= 0) return;
      const change = ((a.value - b.value) / b.value) * 100 * (higherIsBetter ? -1 : 1);
      if (change >= minPct) add(area, points, label + ' got ' + Math.round(change) + '% worse since ' + prev.date);
    };
    drop('vo2', 'stamina', 2, 5, true, 'VO₂ max');
    drop('jump', 'speed', 2, 5, true, 'Vertical jump');
    drop('sprint', 'speed', 2, 3, false, 'Sprint time');
    drop('grip', 'arm', 1, 10, true, 'Grip strength');

    return Object.values(found).filter((f) => f.points > 0).sort((a, b) => b.points - a.points || AREAS.findIndex((x) => x.key === a.key) - AREAS.findIndex((x) => x.key === b.key));
  }

  // Splits the week: 60% across the top areas by their points, the rest stays as normal training.
  function weekPlan(areas, weeklyMin) {
    const total = num(weeklyMin);
    if (!isNum(total) || total <= 0) return null;
    const top = areas.slice(0, MAX_AREAS);
    if (!top.length) return { total, focusMin: 0, normalMin: total, areas: [] };
    const focusMin = Math.round((total * FOCUS_SHARE) / 5) * 5;
    const sum = top.reduce((s, a) => s + a.points, 0);
    const rows = top.map((a) => {
      const def = AREAS.find((x) => x.key === a.key);
      return Object.assign({}, a, { minutes: Math.max(5, Math.round((focusMin * a.points) / sum / 5) * 5), drills: a.hurts ? def.drills.slice(0, 1) : def.drills });
    });
    const used = rows.reduce((s, r) => s + r.minutes, 0);
    rows[0].minutes += focusMin - used; // rounding remainder goes to the top area
    return { total, focusMin, normalMin: total - focusMin, areas: rows };
  }

  return { VERSION, FOCUS_SHARE, MAX_AREAS, AREAS, findAreas, weekPlan };
});
