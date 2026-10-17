// Monitoring glue: runs the rules for each athlete, attaches reviews and guards clinician-only detail.
import * as store from './store.js';

export const M = globalThis.MotionPlusMonitor;
export const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);

export const LEVEL = {
  urgent: { name: 'Urgent', cls: 't-red', icon: 'alert' },
  review: { name: 'Review', cls: 't-amber', icon: 'alert' },
  watch: { name: 'Watch', cls: 't-violet', icon: 'trend' },
  no_data: { name: 'No data', cls: 't-blue', icon: 'info' },
  none: { name: 'No flags', cls: 't-green', icon: 'check' },
};

// Athletes who can be monitored: monitoring consent recorded and, under 18, the athlete's own assent too.
export function canMonitor(a) {
  if (!a || !a.monitorConsent) return false;
  const age = store.ageAt(a);
  return age == null || age >= 18 || !!a.monitorAssent;
}

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
  return store.saveRecord('reviews', { id: s.key + '|' + at, athleteId, rule: s.rule, coversDate: s.latest, note, plan, by: store.getState().settings.assessorName || 'Unnamed reviewer', at });
}

// ---------- clinician view ----------
// Phase 1 runs on a shared device. A clinician PIN hides health detail from anyone else using it.
// This is a privacy screen, not security: the data is still on the device.
async function hash(pin) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('motionplus:' + pin));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
const KEY = 'mp-clinician';
export const pinSet = () => !!store.getState().settings.clinicianPinHash;
export function isClinician() {
  if (!pinSet()) return true;
  try { return sessionStorage.getItem(KEY) === store.getState().settings.clinicianPinHash; } catch (e) { return false; }
}
export async function unlock(pin) {
  const h = await hash(pin);
  if (h !== store.getState().settings.clinicianPinHash) return false;
  try { sessionStorage.setItem(KEY, h); } catch (e) { /* view stays locked */ }
  return true;
}
export function lock() { try { sessionStorage.removeItem(KEY); } catch (e) { /* nothing to clear */ } }
export async function setPin(pin) {
  if (!pin) { await store.saveSettings({ clinicianPinHash: '' }); lock(); return; }
  const h = await hash(pin);
  await store.saveSettings({ clinicianPinHash: h });
  try { sessionStorage.setItem(KEY, h); } catch (e) { /* view stays locked */ }
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
