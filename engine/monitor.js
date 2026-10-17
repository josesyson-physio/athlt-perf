/*
 * MotionPlus monitoring rules: daily check-in, weekly OSTRC-H2 and training log.
 * Fixed, readable rules that compare an athlete with their own recent records.
 * They raise flags for a person to review. They never predict injury or clear an athlete.
 * Thresholds are clinic starting points, not validated cut-offs.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MotionPlusMonitor = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const VERSION = 'monitor_rules_v1';
  const LEVELS = ['urgent', 'review', 'watch', 'no_data'];

  const RULES = {
    painDaysOf7: 3,
    painHigh: 4,
    rpeAboveUsual: 2,
    rpeBaselineMin: 4,
    sleepShortH: 6,
    sleepShortNights: 3,
    highScoreDays: 3,
    loadRatio: 1.5,
    noDataDays: 2,
    trialSlowerPct: 3,
  };

  const REGIONS = ['Head or neck', 'Shoulder', 'Elbow, wrist or hand', 'Chest or ribs', 'Lower back', 'Hip or groin', 'Front of thigh', 'Hamstring', 'Knee', 'Calf or shin', 'Achilles', 'Ankle', 'Foot', 'Other'];
  const SESSION_TYPES = ['Team or skills practice', 'Match or race', 'Easy run', 'Long run', 'Tempo', 'Intervals', 'Sprints', 'Hills', 'Time trial', 'Strength and gym', 'Conditioning', 'Cross-training', 'Rehab', 'Other'];

  // OSTRC-H2 (Clarsen et al., Br J Sports Med 2020). Four questions about the past 7 days.
  const OSTRC = [
    { key: 'q1', text: 'Have you had any difficulties participating in training and competition due to injury, illness or other health problems during the past 7 days?',
      options: [['Full participation without health problems', 0], ['Full participation, but with a health problem', 8], ['Reduced participation due to a health problem', 17], ['Could not participate due to a health problem', 25]] },
    { key: 'q2', text: 'To what extent have you modified your training or competition due to injury, illness or other health problems during the past 7 days?',
      options: [['No modification', 0], ['To a minor extent', 8], ['To a moderate extent', 17], ['To a major extent', 25]] },
    { key: 'q3', text: 'To what extent has injury, illness or other health problems affected your performance during the past 7 days?',
      options: [['No effect', 0], ['To a minor extent', 8], ['To a moderate extent', 17], ['To a major extent', 25]] },
    { key: 'q4', text: 'To what extent have you experienced symptoms/health complaints during the past 7 days?',
      options: [['No symptoms/health complaints', 0], ['To a mild extent', 8], ['To a moderate extent', 17], ['To a severe extent', 25]] },
  ];

  const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
  const isNum = (v) => v !== null && Number.isFinite(v);
  const day = (iso) => Math.round(Date.parse(String(iso).slice(0, 10) + 'T00:00:00Z') / 864e5);
  const iso = (d) => new Date(d * 864e5).toISOString().slice(0, 10);
  const median = (xs) => { const s = xs.slice().sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');

  function weekStart(dateIso) {
    const d = day(dateIso), dow = (new Date(d * 864e5).getUTCDay() + 6) % 7; // Monday = 0
    return iso(d - dow);
  }

  // Severity score 0 to 100. Gatekeeper: Q1 "full participation without problems" ends at 0,
  // "could not participate" ends at 100.
  function ostrcScore(p) {
    const q1 = num(p.q1);
    if (!isNum(q1)) return null;
    if (q1 === 0) return 0;
    if (q1 === 25) return 100;
    const rest = ['q2', 'q3', 'q4'].map((k) => num(p[k]));
    if (!rest.every(isNum)) return null;
    return q1 + rest[0] + rest[1] + rest[2];
  }

  // A substantial problem: a moderate or major reduction in training or performance, or no participation.
  function ostrcSubstantial(p) {
    const q1 = num(p.q1), q2 = num(p.q2), q3 = num(p.q3);
    return q1 === 25 || (isNum(q2) && q2 >= 17) || (isNum(q3) && q3 >= 17);
  }

  function sessionLoad(s) {
    const r = num(s.rpe), m = num(s.actualMin);
    return isNum(r) && isNum(m) && m > 0 ? r * m : null;
  }

  // Data-quality checks run before any rule. Entries with impossible values are left out of the rules.
  function checkinIssues(c) {
    const out = [];
    const sl = num(c.sleepHours), p = num(c.painScore);
    if (isNum(sl) && (sl < 0 || sl > 16)) out.push('Sleep of ' + sl + ' h is not possible. Check the entry.');
    if (isNum(p) && (p < 0 || p > 10)) out.push('Pain score must be 0 to 10.');
    if (c.pain && !(c.regions || []).length) out.push('Pain reported with no body region.');
    return out;
  }

  function sessionIssues(s, all) {
    const out = [];
    const m = num(s.actualMin), km = num(s.actualKm), r = num(s.rpe);
    if (isNum(m) && (m <= 0 || m > 600)) out.push('Duration of ' + m + ' min is outside 1 to 600.');
    if (isNum(km) && (km < 0 || km > 100)) out.push('Distance of ' + km + ' km is outside 0 to 100.');
    if (isNum(km) && isNum(m) && km > 0 && m / km < 2.5) out.push('Pace faster than 2:30 per km. Check the distance and time units.');
    if (isNum(r) && (r < 0 || r > 10)) out.push('Session RPE must be 0 to 10.');
    if (isNum(km) && km > 0 && !s.route && s.type === 'Time trial') out.push('Time trial with no route name, so it cannot be compared with other trials.');
    const dup = (all || []).find((o) => o.id !== s.id && o.athleteId === s.athleteId && o.date === s.date && o.type === s.type && num(o.actualMin) === m);
    if (dup) out.push('Looks like a duplicate of another ' + s.type.toLowerCase() + ' on the same day.');
    return out;
  }

  function signal(level, rule, title, text, latest, extra) {
    return Object.assign({ level, rule, title, text, latest, evidence: [], region: '', sensitive: false, version: VERSION }, extra || {});
  }

  /*
   * athlete: { id, sex }
   * data: { checkins: [], sessions: [], weeklies: [] } for this athlete only
   * today: 'YYYY-MM-DD'
   * Returns { status, signals[], issues[], lastCheckin, load7 }.
   */
  function evaluate(athlete, data, today, rules) {
    const R = Object.assign({}, RULES, rules || {});
    const t = day(today);
    const within = (d, n) => t - day(d) >= 0 && t - day(d) < n;
    const issues = [];
    const checkins = (data.checkins || []).filter((c) => {
      const iss = checkinIssues(c);
      iss.forEach((x) => issues.push({ date: c.date, kind: 'Check-in', text: x }));
      return !iss.some((x) => x.includes('not possible') || x.includes('must be'));
    }).sort((a, b) => (a.date < b.date ? -1 : 1));
    const sessions = (data.sessions || []).filter((s) => {
      const iss = sessionIssues(s, data.sessions);
      iss.forEach((x) => issues.push({ date: s.date, kind: 'Session', text: x }));
      return !iss.some((x) => !x.startsWith('Time trial with no route'));
    }).sort((a, b) => (a.date < b.date ? -1 : 1));
    const weeklies = (data.weeklies || []).slice().sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1));
    const out = [];
    const last7 = checkins.filter((c) => within(c.date, 7));

    // Urgent: red-flag answers in the last 7 days.
    const RED = { chest: 'Chest pain, fainting or a racing heartbeat with exercise', bone: 'Pain on one spot of a bone that hurts with impact or at night', head: 'A knock to the head with any symptoms' };
    Object.keys(RED).forEach((k) => {
      const hits = last7.filter((c) => c.redFlags && c.redFlags[k]);
      if (hits.length) {
        const lastHit = hits[hits.length - 1];
        out.push(signal('urgent', 'red_' + k, RED[k], 'Reported on ' + plural(hits.length, 'day') + ' in the last 7 days. Stop training and see a doctor today.', lastHit.date, { evidence: hits.map((c) => c.date) }));
      }
    });

    // Review: pain in the same region that repeats.
    const regions = [...new Set(last7.flatMap((c) => (c.pain ? c.regions || [] : [])))];
    regions.forEach((r) => {
      const days = last7.filter((c) => c.pain && (c.regions || []).includes(r)).map((c) => c.date);
      const ds = days.map(day);
      const consecutive = ds.some((d, i) => i > 0 && d - ds[i - 1] === 1 && t - d < 3);
      if (days.length >= R.painDaysOf7 || consecutive) {
        out.push(signal('review', 'pain_repeat', r + ' pain is repeating', r + ' pain on ' + plural(days.length, 'day') + ' of the last 7' + (consecutive ? ', including consecutive days' : '') + '. Go easy on this area until it settles.', days[days.length - 1], { region: r, evidence: days }));
      }
    });

    // Review: pain that is high or changes running, in the last 3 days.
    const high = checkins.filter((c) => within(c.date, 3) && c.pain && ((isNum(num(c.painScore)) && num(c.painScore) >= R.painHigh) || c.painAffectsRunning));
    if (high.length) {
      const h = high[high.length - 1];
      out.push(signal('review', 'pain_high', 'Pain is high or changing how they move', 'Pain ' + (isNum(num(h.painScore)) ? num(h.painScore) + '/10' : '') + (h.painAffectsRunning ? ', changing how they move' : '') + ' in ' + ((h.regions || []).join(', ') || 'an unrecorded region') + ' on ' + h.date + '. Make the next hard session easier for this area.', h.date, { evidence: high.map((c) => c.date), region: (h.regions || [])[0] || '' }));
    }

    // Review: OSTRC-H2 substantial problem in the last 14 days.
    weeklies.filter((w) => t - day(w.weekStart) < 14 + 7).forEach((w) => {
      (w.problems || []).forEach((p) => {
        if (ostrcSubstantial(p)) {
          out.push(signal('review', 'ostrc_substantial', 'Weekly health: ' + (p.label || 'health problem') + ' is reducing training or performance', 'OSTRC-H2 severity ' + ostrcScore(p) + ' of 100 for the week of ' + w.weekStart + '. Moderate or major effect on training or performance.', w.date || w.weekStart, { region: p.region || '', evidence: [w.weekStart] }));
        }
      });
    });

    // Private items: shown with plain wording, to be handled in a private talk.
    const period = last7.filter((c) => c.sensitive && c.sensitive.periodChange === true);
    if (period.length) out.push(signal('review', 'period_change', 'Private: talk to the athlete', 'Change to their period reported. Talk to them privately.', period[period.length - 1].date, { sensitive: true, evidence: period.map((c) => c.date) }));
    const lowMood = last7.filter((c) => c.sensitive && isNum(num(c.sensitive.mood)) && num(c.sensitive.mood) <= 2);
    if (lowMood.length >= R.highScoreDays) out.push(signal('review', 'mood_low', 'Private: talk to the athlete', 'Low mood on ' + plural(lowMood.length, 'day') + ' of the last 7. Talk to them privately.', lowMood[lowMood.length - 1].date, { sensitive: true, evidence: lowMood.map((c) => c.date) }));

    // Watch: session RPE above the athlete's usual for that session type, twice running.
    [...new Set(sessions.map((s) => s.type))].forEach((type) => {
      const ofType = sessions.filter((s) => s.type === type && isNum(num(s.rpe)));
      if (ofType.length < R.rpeBaselineMin + 2) return;
      const lastTwo = ofType.slice(-2);
      if (!lastTwo.every((s) => within(s.date, 7))) return;
      const base = ofType.slice(0, -2).filter((s) => t - day(s.date) < 35).map((s) => num(s.rpe));
      if (base.length < R.rpeBaselineMin) return;
      const usual = median(base);
      if (lastTwo.every((s) => num(s.rpe) >= usual + R.rpeAboveUsual)) {
        out.push(signal('watch', 'rpe_high', type + ' felt harder than usual', 'The last two ' + type.toLowerCase() + ' sessions were rated ' + lastTwo.map((s) => num(s.rpe)).join(' and ') + ' out of 10. Usual for this athlete is ' + usual + '.', lastTwo[1].date, { evidence: lastTwo.map((s) => s.date) }));
      }
    });

    // Watch: repeated short sleep, high fatigue or high soreness.
    const short = last7.filter((c) => isNum(num(c.sleepHours)) && num(c.sleepHours) < R.sleepShortH);
    if (short.length >= R.sleepShortNights) out.push(signal('watch', 'sleep_short', 'Short sleep', 'Under ' + R.sleepShortH + ' h of sleep on ' + plural(short.length, 'night') + ' of the last 7.', short[short.length - 1].date, { evidence: short.map((c) => c.date) }));
    [['fatigue', 'High fatigue'], ['soreness', 'High soreness']].forEach(([k, title]) => {
      const hi = last7.filter((c) => isNum(num(c[k])) && num(c[k]) >= 4);
      if (hi.length >= R.highScoreDays) out.push(signal('watch', k + '_high', title, title + ' (4 or 5 out of 5) on ' + plural(hi.length, 'day') + ' of the last 7.', hi[hi.length - 1].date, { evidence: hi.map((c) => c.date) }));
    });

    // Watch: illness symptoms in the last 3 days.
    const ill = checkins.filter((c) => within(c.date, 3) && c.ill);
    if (ill.length) out.push(signal('watch', 'illness', 'Illness symptoms', 'Illness symptoms reported on ' + ill.map((c) => c.date).join(', ') + '. Check before any hard session.', ill[ill.length - 1].date, { evidence: ill.map((c) => c.date) }));

    // Watch: weekly load well above the previous three weeks. Context, not a risk score.
    const loadIn = (from, to) => sessions.filter((s) => t - day(s.date) >= from && t - day(s.date) < to).reduce((sum, s) => sum + (sessionLoad(s) || 0), 0);
    const load7 = loadIn(0, 7);
    const prev = [loadIn(7, 14), loadIn(14, 21), loadIn(21, 28)];
    const prevMean = prev.reduce((a, b) => a + b, 0) / 3;
    if (prev.every((x) => x > 0) && load7 > prevMean * R.loadRatio) {
      out.push(signal('watch', 'load_jump', 'Training load jumped this week', 'Session load this week is ' + Math.round(load7) + ' (RPE × min), ' + Math.round((load7 / prevMean - 1) * 100) + '% above the average of the previous 3 weeks (' + Math.round(prevMean) + '). Shown as context, not as an injury risk.', today, { evidence: [] }));
    }

    // Watch: time trial slower than the athlete's own previous trials on the same route.
    const trials = sessions.filter((s) => s.type === 'Time trial' && s.route && isNum(num(s.actualKm)) && num(s.actualKm) > 0 && isNum(num(s.actualMin)));
    [...new Set(trials.map((s) => s.route + '|' + s.actualKm))].forEach((key) => {
      const same = trials.filter((s) => s.route + '|' + s.actualKm === key);
      if (same.length < 3) return;
      const latest = same[same.length - 1];
      if (!within(latest.date, 14)) return;
      const usual = median(same.slice(0, -1).map((s) => num(s.actualMin)));
      const slower = (num(latest.actualMin) / usual - 1) * 100;
      if (slower > R.trialSlowerPct) out.push(signal('watch', 'trial_slower', 'Time trial slower on the same route', latest.actualKm + ' km on ' + latest.route + ' took ' + num(latest.actualMin) + ' min, ' + slower.toFixed(1) + '% slower than this athlete’s usual ' + usual + ' min on that route.', latest.date, { evidence: same.map((s) => s.date) }));
    });

    // No data: a missing check-in is never treated as "no problem".
    const lastCheckin = checkins.length ? checkins[checkins.length - 1].date : null;
    if (lastCheckin && t - day(lastCheckin) >= R.noDataDays) {
      out.push(signal('no_data', 'no_checkin', 'No recent check-in', 'No check-in since ' + lastCheckin + ' (' + plural(t - day(lastCheckin), 'day') + '). Missing data is not a sign that all is well.', lastCheckin));
    } else if (!lastCheckin) {
      out.push(signal('no_data', 'no_checkin', 'No check-ins yet', 'Monitoring has not started for this athlete.', today));
    }

    out.sort((a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level) || (a.latest < b.latest ? 1 : -1));
    const status = out.length ? out[0].level : 'none';
    return { status, signals: out, issues, lastCheckin, load7: Math.round(load7), version: VERSION };
  }

  // Stable key for a signal so a review can be attached to it.
  const signalKey = (athleteId, s) => [athleteId, s.rule, s.region || ''].join('|');

  return { VERSION, RULES, LEVELS, REGIONS, SESSION_TYPES, OSTRC, ostrcScore, ostrcSubstantial, sessionLoad, checkinIssues, sessionIssues, evaluate, signalKey, weekStart };
});
