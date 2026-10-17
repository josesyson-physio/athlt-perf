// Monitoring glue: runs the rules for each athlete and attaches the notes people saved.
import * as store from './store.js';

export const M = globalThis.MotionPlusMonitor;
export const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);

export const LEVEL = {
  urgent: { name: 'Stop and get help', cls: 't-red', icon: 'alert' },
  review: { name: 'Look at today', cls: 't-amber', icon: 'alert' },
  watch: { name: 'Keep an eye on', cls: 't-violet', icon: 'trend' },
  no_data: { name: 'No answers yet', cls: 't-blue', icon: 'info' },
  none: { name: 'All good', cls: 't-green', icon: 'check' },
};

// Every athlete can check in; no sign-off step.
export const canMonitor = (a) => !!a;

export function evaluateAthlete(a, date) {
  const d = date || today();
  const r = M.evaluate(a, store.monitorFor(a.id), d);
  const reviews = store.getState().reviews;
  r.signals.forEach((s) => {
    s.key = M.signalKey(a.id, s);
    const rv = reviews.filter((x) => x.id.startsWith(s.key + '|')).sort((x, y) => (x.at < y.at ? 1 : -1))[0];
    s.review = rv || null;
    s.open = !rv || rv.coversDate < s.latest;
  });
  const open = r.signals.filter((s) => s.open);
  r.status = open.length ? open[0].level : r.signals.some((s) => s.level === 'no_data') ? 'no_data' : 'none';
  return r;
}

export function squad(date) {
  return store.getState().athletes.filter(canMonitor).map((a) => ({ athlete: a, result: evaluateAthlete(a, date) }));
}

export async function saveReview(athleteId, s, note, plan) {
  const at = new Date().toISOString();
  return store.saveRecord('reviews', { id: s.key + '|' + at, athleteId, rule: s.rule, coversDate: s.latest, note, plan, by: store.getState().settings.assessorName || 'Coach', at });
}

// ---------- pilot export ----------
// Names and IDs are replaced by P01, P02…; dates and values are kept for analysis.
export function pilotCsv() {
  const s = store.getState();
  const code = new Map(s.athletes.map((a, i) => [a.id, 'P' + String(i + 1).padStart(2, '0')]));
  const esc = (v) => { const t = v == null ? '' : String(v); return /[",\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
  const rows = [['record', 'athlete', 'date', 'field', 'value']];
  s.checkins.forEach((c) => {
    const f = { pain: c.pain ? 1 : 0, regions: (c.regions || []).join('; '), pain_score: c.painScore, pain_changes_running: c.painAffectsRunning ? 1 : 0, fatigue: c.fatigue, soreness: c.soreness, sleep_h: c.sleepHours, sleep_quality: c.sleepQuality, ill: c.ill ? 1 : 0, red_chest: c.redFlags && c.redFlags.chest ? 1 : 0, red_bone: c.redFlags && c.redFlags.bone ? 1 : 0, red_head: c.redFlags && c.redFlags.head ? 1 : 0, seconds_to_complete: c.secondsToComplete };
    Object.entries(f).forEach(([k, v]) => rows.push(['checkin', code.get(c.athleteId), c.date, k, v]));
  });
  s.sessions.forEach((x) => {
    const f = { type: x.type, planned_min: x.plannedMin, actual_min: x.actualMin, planned_km: x.plannedKm, actual_km: x.actualKm, surface: x.surface, route: x.route, rpe: x.rpe, load: M.sessionLoad(x), warmup: x.warmup ? 1 : 0, prevention: x.prevention ? 1 : 0 };
    Object.entries(f).forEach(([k, v]) => rows.push(['session', code.get(x.athleteId), x.date, k, v]));
  });
  s.weeklies.forEach((w) => (w.problems || []).forEach((p, i) => {
    ['q1', 'q2', 'q3', 'q4'].forEach((k) => rows.push(['ostrc_h2', code.get(w.athleteId), w.weekStart, 'problem' + (i + 1) + '_' + k, p[k]]));
    rows.push(['ostrc_h2', code.get(w.athleteId), w.weekStart, 'problem' + (i + 1) + '_severity', M.ostrcScore(p)]);
  }));
  s.reviews.forEach((r) => rows.push(['review', code.get(r.athleteId), r.at.slice(0, 10), r.rule, r.plan ? 'plan recorded' : 'reviewed']));
  return rows.map((r) => r.map(esc).join(',')).join('\n');
}
