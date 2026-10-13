/*
 * MotionPlus derived-metric calculations (section 11.2 of the specification).
 * Deterministic and versioned. Each function returns null when inputs are missing,
 * never a guessed value. Labels: measured / calculated / estimated.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MotionPlusMetrics = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const VERSION = 'metrics_v1';

  const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
  const ok = (...vs) => vs.every((v) => v !== null && Number.isFinite(v));
  const round = (v, dp) => Math.round(v * Math.pow(10, dp)) / Math.pow(10, dp);
  const clean = (arr) => (arr || []).map(num).filter((v) => v !== null && Number.isFinite(v) && v > 0);

  function out(value, unit, label, formula, extra) {
    return Object.assign({ value, unit, label, formula, version: VERSION, flags: [] }, extra || {});
  }

  function bmi(massKg, heightCm) {
    const m = num(massKg), h = num(heightCm);
    if (!ok(m, h) || m <= 0 || h <= 0) return null;
    return out(round(m / Math.pow(h / 100, 2), 1), 'kg/m²', 'calculated', 'mass_kg / (height_m)²', {
      note: 'Screening measure only. It does not measure body fat and misclassifies muscular athletes.',
    });
  }

  function waistToHeight(waistCm, heightCm) {
    const w = num(waistCm), h = num(heightCm);
    if (!ok(w, h) || w <= 0 || h <= 0) return null;
    return out(round(w / h, 2), 'ratio', 'calculated', 'waist_cm / height_cm');
  }

  function meanArterialPressure(sbp, dbp) {
    const s = num(sbp), d = num(dbp);
    if (!ok(s, d) || d >= s) return null;
    return out(round(d + (s - d) / 3, 0), 'mmHg', 'calculated', 'dbp + (sbp - dbp) / 3');
  }

  function hrRecovery(endHr, recoveryHr, intervalS) {
    const e = num(endHr), r = num(recoveryHr), i = num(intervalS);
    if (!ok(e, r, i)) return null;
    const res = out(e - r, 'bpm', 'calculated', 'end_hr - hr_at_' + i + 's', { interval_s: i });
    if (r > e) res.flags.push('Recovery HR is higher than end-exercise HR. Check the readings.');
    return res;
  }

  function predictedHrMax(age) {
    const a = num(age);
    if (!ok(a) || a <= 0) return null;
    return out(round(208 - 0.7 * a, 0), 'bpm', 'estimated', '208 - 0.7 * age (Tanaka 2001)', {
      note: 'Individual max HR can differ from this by 10 bpm or more.',
    });
  }

  function hrReservePct(exerciseHr, restHr, peakHr, peakSource) {
    const e = num(exerciseHr), r = num(restHr), p = num(peakHr);
    if (!ok(e, r, p) || p <= r) return null;
    return out(round(((e - r) / (p - r)) * 100, 0), '%', peakSource === 'measured' ? 'calculated' : 'estimated',
      '(exercise_hr - rest_hr) / (peak_hr - rest_hr) * 100', { peak_source: peakSource || 'unknown' });
  }

  function asymmetryPct(left, right) {
    const l = num(left), r = num(right);
    if (!ok(l, r) || Math.max(l, r) <= 0) return null;
    return round((Math.abs(l - r) / Math.max(l, r)) * 100, 1);
  }

  function trialSummary(trials) {
    const t = clean(trials);
    if (!t.length) return null;
    return { best: Math.max(...t), mean: round(t.reduce((a, b) => a + b, 0) / t.length, 1), n: t.length };
  }

  function grip(leftTrials, rightTrials) {
    const L = trialSummary(leftTrials), R = trialSummary(rightTrials);
    if (!L && !R) return null;
    const res = out(null, 'kg', 'measured', 'best of valid trials per hand; asymmetry = |L - R| / max(L, R) * 100', {
      left: L, right: R, asymmetry_pct: L && R ? asymmetryPct(L.best, R.best) : null,
    });
    res.value = Math.max(L ? L.best : 0, R ? R.best : 0);
    return res;
  }

  function jump(standingReachCm, jumpReachTrials) {
    const s = num(standingReachCm);
    const t = clean(jumpReachTrials);
    if (!ok(s) || !t.length) return null;
    const heights = t.map((j) => round(j - s, 1));
    const res = out(Math.max(...heights), 'cm', 'calculated', 'jump_reach - standing_reach (best valid trial)', { trials: heights });
    if (heights.some((h) => h <= 0)) res.flags.push('A jump reach is not above standing reach. Check the entries.');
    return res;
  }

  function sprint(times, distanceM) {
    const t = clean(times);
    if (!t.length) return null;
    const best = Math.min(...t);
    const d = num(distanceM);
    const res = out(best, 's', 'measured', 'fastest valid trial', {
      trials: t,
      speed_m_s: ok(d) && d > 0 ? round(d / best, 2) : null,
      decrement_pct: t.length >= 3 ? round((t.reduce((a, b) => a + b, 0) / (t.length * best) - 1) * 100, 1) : null,
    });
    return res;
  }

  function pair(left, right, unit) {
    const l = num(left), r = num(right);
    if (!ok(l) && !ok(r)) return null;
    return out(null, unit, 'measured', 'left and right recorded separately', {
      left: ok(l) ? l : null,
      right: ok(r) ? r : null,
      difference: ok(l, r) ? round(Math.abs(l - r), 1) : null,
    });
  }

  /*
   * Resting-vitals safety checks. Defaults follow common pre-exercise-test guidance
   * (e.g. ACSM relative contraindications) and must be confirmed by the clinic.
   * level: 'stop' blocks exercise testing until a clinician reviews; 'check' asks for a repeat reading.
   */
  function vitalsFlags(v) {
    const flags = [];
    const hr = num(v.restHr), s = num(v.sbp), d = num(v.dbp), o = num(v.spo2), t = num(v.tempC);
    if (ok(hr) && (hr < 40 || hr > 100)) flags.push({ level: 'check', field: 'restHr', text: 'Resting HR of ' + hr + ' bpm is outside 40 to 100. Repeat after rest; low values can be normal in trained athletes.' });
    if (ok(s, d) && (s >= 200 || d >= 110)) flags.push({ level: 'stop', field: 'bp', text: 'BP ' + s + '/' + d + ' mmHg. Defer exercise testing and follow your clinic referral pathway.' });
    else if (ok(s, d) && (s >= 140 || d >= 90)) flags.push({ level: 'check', field: 'bp', text: 'BP ' + s + '/' + d + ' mmHg is elevated. Repeat after 5 minutes of rest. One reading is not a diagnosis.' });
    if (ok(o) && o < 90) flags.push({ level: 'stop', field: 'spo2', text: 'SpO₂ ' + o + '%. Defer exercise testing and seek clinical review.' });
    else if (ok(o) && o < 95) flags.push({ level: 'check', field: 'spo2', text: 'SpO₂ ' + o + '%. Recheck with a warm, still finger and a stable signal.' });
    if (ok(t) && t >= 38) flags.push({ level: 'stop', field: 'tempC', text: 'Temperature ' + t + ' °C suggests fever. Defer exercise testing.' });
    return flags;
  }

  return {
    VERSION, bmi, waistToHeight, meanArterialPressure, hrRecovery, predictedHrMax, hrReservePct,
    asymmetryPct, trialSummary, grip, jump, sprint, pair, vitalsFlags,
  };
});
