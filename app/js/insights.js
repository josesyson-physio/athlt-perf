// Draft observations built by fixed rules from calculated results.
// They never create numbers of their own and always stay "Draft" until an assessor signs the report.

const item = (results, key) => (results && results.items ? results.items.find((i) => i.key === key) : null);

// previous: earlier assessments of the same athlete with results, newest first.
export function draftInsights(results, previous) {
  const out = [];
  if (!results) return out;
  const prev = (previous || []).filter((p) => p.results);

  results.safety.forEach((f) => out.push({ kind: f.level === 'stop' ? 'danger' : 'warn', title: f.level === 'stop' ? 'Safety: clinical review needed' : 'Recheck a resting reading', text: f.text }));
  if (!results.screening.allowed) out.push({ kind: 'warn', title: 'Exercise tests not cleared', text: results.screening.reason + ' Exercise-based results were not calculated.' });

  const vo2 = item(results, 'vo2');
  if (vo2) {
    const same = prev.map((p) => ({ p, i: item(p.results, 'vo2') })).find((x) => x.i && x.i.protocol_id === vo2.protocol_id);
    if (same) {
      const delta = Math.round((vo2.value - same.i.value) * 10) / 10;
      const band = vo2.range ? (vo2.range[1] - vo2.range[0]) / 2 : null;
      const sign = delta > 0 ? '+' : '';
      if (band != null && Math.abs(delta) <= band) out.push({ kind: 'info', title: 'VO₂ change within method error', text: sign + delta + ' mL/kg/min since ' + same.p.date + ' on the same protocol. This is inside the method’s typical error of ±' + Math.round(band * 10) / 10 + ', so it may not be a real change.' });
      else out.push({ kind: delta >= 0 ? 'good' : 'warn', title: 'VO₂ ' + (delta >= 0 ? 'increase' : 'decrease') + ' on the same protocol', text: sign + delta + ' mL/kg/min since ' + same.p.date + '. ' + (band == null ? 'This method has no published error, so confirm conditions were comparable before acting on it.' : 'Larger than the method’s typical error of ±' + Math.round(band * 10) / 10 + '.') });
    } else if (prev.some((p) => item(p.results, 'vo2'))) {
      out.push({ kind: 'info', title: 'VO₂ not compared', text: 'Earlier VO₂ results used a different protocol, so they are not compared.' });
    }
    if (vo2.qualified) out.push({ kind: 'warn', title: 'Outside the equation’s population', text: 'The VO₂ equation was not built on athletes like this one. Treat the estimate with extra caution.' });
  }

  const grip = item(results, 'grip');
  if (grip && grip.asymmetry_pct != null && grip.asymmetry_pct >= 10) out.push({ kind: 'warn', title: 'Grip side difference ' + grip.asymmetry_pct + '%', text: 'Left ' + grip.left.best + ' kg, right ' + grip.right.best + ' kg. A 10% difference is a common screening threshold; interpret with hand dominance and injury history.' });

  const lunge = item(results, 'lunge');
  if (lunge && lunge.difference != null && lunge.difference > 0) out.push({ kind: 'info', title: 'Ankle lunge side difference', text: 'Left ' + lunge.left + ' cm, right ' + lunge.right + ' cm (' + lunge.difference + ' cm difference).' });

  const sls = item(results, 'sls');
  if (sls && sls.difference != null && sls.difference >= 5) out.push({ kind: 'info', title: 'Balance side difference', text: 'Single-leg stance left ' + sls.left + ' s, right ' + sls.right + ' s.' });

  ['grip', 'jump', 'sprint'].forEach((k) => {
    const cur = item(results, k);
    if (!cur) return;
    const p = prev.map((x) => ({ x, i: item(x.results, k) })).find((y) => y.i);
    if (!p) return;
    const d = Math.round((cur.value - p.i.value) * 100) / 100;
    if (d === 0) return;
    const better = k === 'sprint' ? d < 0 : d > 0;
    out.push({ kind: better ? 'good' : 'info', title: cur.name + ' ' + (d > 0 ? 'up' : 'down') + ' ' + Math.abs(d) + ' ' + cur.unit, text: 'Compared with ' + p.x.date + '. Small changes can come from measurement error, fatigue or familiarity with the test.' });
  });

  if (results.missing.length) out.push({ kind: 'info', title: results.missing.length + ' item' + (results.missing.length > 1 ? 's' : '') + ' not available', text: results.missing.join('; ') + '.' });
  return out;
}
