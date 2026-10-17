/*
 * MotionPlus free field tests: what to measure with basic equipment, and when a result is worth a look.
 * Each rule comes from a published study (see SOURCES); where none exists the test gives no colour,
 * only the athlete's own last result to beat. Compares an athlete with themselves, never with norms
 * from other populations. Deterministic and versioned; works in the browser and in Node.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MotionPlusTests = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const VERSION = 'tests_v1';

  const SOURCES = {
    lunge: 'Left/right difference over 2 cm is the common concern level (not validated); 1.9 cm is the smallest real change.',
    calf: 'Fewer than 25 single-leg raises is below the usual normal (Lunsford & Perry 1995; norms vary).',
    bridge: 'Under 20 reps is poor; players later injured averaged 20 against 26 (Freckleton 2013).',
    hop: 'Weaker leg under 90% of the stronger is the usual concern level (return-to-sport practice).',
    reach: 'Forward reach more than 4 cm different left to right went with 2.5× injury risk (Plisky 2006).',
    sideplank: 'Left and right within 5% of each other counts as balanced (McGill).',
    squeeze: 'Any groin pain on the 5-second squeeze is worth showing a physio (Thorborg 2017).',
  };

  // area: the Mirror row the test feeds. sides: measured left and right. lowerBetter: times.
  const TESTS = [
    { key: 'lunge', name: 'Knee-to-wall lunge', area: 'ankle', unit: 'cm', sides: true, equipment: ['A wall', 'A tape measure'],
      steps: ['Face a wall, one foot in front, big toe pointing at the wall.', 'Bend the front knee to touch the wall, heel flat on the ground.', 'Slide the foot back until the knee only just touches. Measure toe to wall.'] },
    { key: 'calf', name: 'Single-leg calf raise', area: 'calf', unit: 'raises', sides: true, equipment: ['A step', 'A wall'],
      steps: ['Stand on one leg on a step, one finger on the wall for balance.', 'Rise as high as you can, then lower slowly. One second up, one down.', 'Count until you can no longer reach full height.'] },
    { key: 'bridge', name: 'Single-leg bridge', area: 'hamstring', unit: 'reps', sides: true, equipment: ['A bench or box about knee height'],
      steps: ['Lie on your back, one heel on the bench, knee slightly bent. Other leg straight up.', 'Arms crossed on your chest. Push through the heel to lift your hips.', 'Touch the ground and repeat. Count until you can no longer lift fully.'] },
    { key: 'hop', name: 'Single-leg hop for distance', area: 'knee', unit: 'cm', sides: true, equipment: ['A tape measure', 'Flat, hard ground'],
      steps: ['Stand on one leg, toe on a line, hands on hips.', 'Hop as far forward as you can and land on the same leg.', 'Hold the landing for 2 seconds. Measure to the back of the heel. Best of 3.'] },
    { key: 'reach', name: 'Forward reach on one leg', area: 'balance', unit: 'cm', sides: true, equipment: ['Tape on the floor', 'A tape measure'],
      steps: ['Stand on one leg with your toes at the end of a tape line.', 'Reach the other foot as far forward along the line as you can and tap lightly.', 'Come back without losing balance. Measure the reach. Best of 3.'] },
    { key: 'sideplank', name: 'Side plank hold', area: 'core', unit: 's', sides: true, equipment: ['A phone stopwatch'],
      steps: ['Lie on your side, elbow under your shoulder, feet stacked.', 'Lift your hips so your body is in a straight line.', 'Hold as long as you can keep the line. Stop when your hips drop.'] },
    { key: 'squeeze', name: 'Groin squeeze', area: 'groin', unit: 'pain 0 to 10', sides: false, equipment: ['Nothing'],
      steps: ['Lie on your back, knees bent, feet flat.', 'Put your fist between your knees and squeeze as hard as you can for 5 seconds.', 'Rate any groin pain from 0 (none) to 10 (worst).'] },
    { key: 'run12', name: '12-minute run', area: 'stamina', unit: 'm', sides: false, equipment: ['A track or measured loop', 'A phone stopwatch'],
      steps: ['Warm up for 10 minutes.', 'Run as far as you can in 12 minutes. Walking is allowed.', 'Count laps and record the total distance.'] },
    { key: 'broad', name: 'Standing broad jump', area: 'power', unit: 'cm', sides: false, equipment: ['A tape measure', 'Flat, hard ground'],
      steps: ['Stand with toes behind a line, feet apart.', 'Swing your arms and jump forward as far as you can, landing on both feet.', 'Measure to the back of the nearest heel. Best of 3.'] },
    { key: 'sprint20', name: '20 m sprint', area: 'speed', unit: 's', sides: false, lowerBetter: true, equipment: ['A tape measure', 'A friend with a phone stopwatch'],
      steps: ['Mark a start and a finish line 20 m apart.', 'Start still, one foot forward. Your friend starts the watch on your first move.', 'Sprint through the finish. Best of 3, with full rest.'] },
  ];

  const AREAS = [
    { key: 'core', name: 'Core' }, { key: 'balance', name: 'Balance' }, { key: 'hamstring', name: 'Hamstring' },
    { key: 'knee', name: 'Knee' }, { key: 'calf', name: 'Calf' }, { key: 'ankle', name: 'Ankle' },
  ];

  const num = (v) => (v === '' || v == null ? NaN : Number(v));
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const round = (v, dp) => Math.round(v * Math.pow(10, dp || 0)) / Math.pow(10, dp || 0);
  const byKey = (k) => TESTS.find((t) => t.key === k) || null;

  // Plain-words status for one result: 'work' (worth a physio's look), 'watch', 'even', or null (no rule).
  function judge(testKey, entry) {
    const t = byKey(testKey);
    if (!t || !entry) return null;
    if (!t.sides) {
      const v = num(entry.value);
      if (!isNum(v)) return null;
      if (t.key === 'squeeze') return v > 0 ? { status: 'work', text: 'Groin pain ' + v + '/10 on the squeeze.' } : { status: 'even', text: 'No groin pain on the squeeze.' };
      return null;
    }
    const l = num(entry.left), r = num(entry.right);
    if (!isNum(l) || !isNum(r) || l < 0 || r < 0) return null;
    const hi = Math.max(l, r), lo = Math.min(l, r);
    const weak = l === r ? null : l < r ? 'left' : 'right';
    const Side = weak ? weak[0].toUpperCase() + weak.slice(1) : '';
    const lsi = hi > 0 ? round((lo / hi) * 100, 0) : 100;
    const diff = round(hi - lo, 1);
    const out = (status, text) => ({ status, text, weak, lsi, diff });
    switch (t.key) {
      case 'lunge':
        return diff > 2 ? out('work', Side + ' ankle bends ' + diff + ' cm less.') : out('even', 'Both ankles bend about the same.');
      case 'calf':
        if (lsi < 90) return out('work', Side + ' calf is ' + (100 - lsi) + '% behind: ' + lo + ' raises against ' + hi + '.');
        if (lo < 25) return out('watch', lo + ' raises on the ' + (weak || 'weaker') + ' side. Under 25 is below normal.');
        return out('even', 'Both calves strong and even.');
      case 'bridge':
        if (lo < 20) return out('work', lo + ' bridge reps on the ' + (weak || 'weaker') + ' side. Under 20 is low.');
        if (lsi < 90) return out('watch', Side + ' hamstring is ' + (100 - lsi) + '% behind.');
        return out('even', 'Hamstrings strong and even.');
      case 'hop':
        return lsi < 90 ? out('work', Side + ' leg hops ' + lsi + '% as far as the other.') : out('even', 'Both legs hop about the same.');
      case 'reach':
        return diff > 4 ? out('work', Side + ' leg reaches ' + diff + ' cm less.') : out('even', 'Balance even on both legs.');
      case 'sideplank':
        return lsi < 95 ? out('watch', Side + ' side plank is ' + (100 - lsi) + '% shorter.') : out('even', 'Side planks even.');
      default:
        return null;
    }
  }

  // Results: [{ test, date, left, right, value }]. Latest first per test, ties by created order.
  function history(results, testKey) {
    return (results || []).filter((r) => r.test === testKey).sort((a, b) => (a.date + (a.createdAt || '') < b.date + (b.createdAt || '') ? 1 : -1));
  }

  // The number to beat: the athlete's best earlier result (per side for left/right tests).
  function ghost(results, testKey, beforeId) {
    const t = byKey(testKey);
    const h = history(results, testKey).filter((r) => r.id !== beforeId);
    if (!t || !h.length) return null;
    const best = (vals) => { const v = vals.map(num).filter(isNum); return v.length ? (t.lowerBetter ? Math.min(...v) : Math.max(...v)) : null; };
    return t.sides ? { left: best(h.map((r) => r.left)), right: best(h.map((r) => r.right)), date: h[0].date } : { value: best(h.map((r) => r.value)), date: h[0].date };
  }

  // One row per body area for the Mirror: each side as a share of the stronger side.
  function mirror(results) {
    return AREAS.map((a) => {
      const tests = TESTS.filter((t) => t.area === a.key && t.sides);
      const rows = tests.map((t) => ({ t, last: history(results, t.key)[0] })).filter((x) => x.last);
      if (!rows.length) return { area: a.key, name: a.name, tested: false };
      const judged = rows.map((x) => ({ x, j: judge(x.t.key, x.last) })).filter((y) => y.j);
      if (!judged.length) return { area: a.key, name: a.name, tested: false };
      const rank = { work: 0, watch: 1, even: 2 };
      judged.sort((p, q) => rank[p.j.status] - rank[q.j.status]);
      const top = judged[0];
      const l = num(top.x.last.left), r = num(top.x.last.right), hi = Math.max(l, r) || 1;
      return {
        area: a.key, name: a.name, tested: true, test: top.x.t.key, date: top.x.last.date,
        left: l, right: r, pctL: round((l / hi) * 100, 0), pctR: round((r / hi) * 100, 0),
        weak: top.j.weak, status: top.j.status, text: top.j.text, unit: top.x.t.unit,
      };
    });
  }

  // Strengths: single-number tests that beat the athlete's previous best.
  function improvements(results) {
    return TESTS.filter((t) => !t.sides && t.key !== 'squeeze').map((t) => {
      const h = history(results, t.key);
      if (h.length < 2) return null;
      const now = num(h[0].value), g = ghost(results, t.key, h[0].id);
      if (!isNum(now) || !g || !isNum(g.value)) return null;
      const better = t.lowerBetter ? now < g.value : now > g.value;
      const change = round(Math.abs(now - g.value), t.unit === 's' ? 2 : 0);
      return better ? { test: t.key, name: t.name, change, unit: t.unit, text: t.name + (t.lowerBetter ? ' ' + change + ' ' + t.unit + ' faster' : ' up ' + change + ' ' + t.unit) } : null;
    }).filter(Boolean);
  }

  // Checks before saving: nothing negative, nothing impossible for the unit.
  function check(testKey, entry) {
    const t = byKey(testKey);
    if (!t) return ['Unknown test.'];
    const max = { cm: 400, raises: 150, reps: 150, s: 600, m: 6000, 'pain 0 to 10': 10 }[t.unit];
    const vals = t.sides ? [['left', entry.left], ['right', entry.right]] : [['value', entry.value]];
    const errs = [];
    vals.forEach(([k, v]) => {
      const n = num(v);
      if (!isNum(n)) errs.push('Enter the ' + (k === 'value' ? 'result' : k + ' side') + '.');
      else if (n < 0 || (max && n > max)) errs.push((k === 'value' ? 'Result' : k[0].toUpperCase() + k.slice(1)) + ' looks wrong: ' + n + ' ' + t.unit + '.');
    });
    if (testKey === 'sprint20' && isNum(num(entry.value)) && num(entry.value) < 2) errs.push('Under 2 seconds for 20 m is not possible. Check the time.');
    return errs;
  }

  return { VERSION, SOURCES, TESTS, AREAS, byKey, judge, history, ghost, mirror, improvements, check };
});
