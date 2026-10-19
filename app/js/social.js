// Feed, reactions, reports, plans and training progress.
// Coaches, trainers and physios post; athletes can only star or react. Posts are open to every
// athlete, so they can find a pro through their insights. Athletes send their Mirror to the pros
// they are connected to; a pro sends back a plan of a few weeks, which the athlete ticks off.
import * as store from './store.js';
import { me, isCoachRole } from './session.js';
import { prosOf } from './connect.js';

const T = globalThis.MotionPlusTests;
export const REACTIONS = [
  { key: 'star', label: 'Star' },
  { key: 'fire', label: 'Fire' },
  { key: 'clap', label: 'Clap' },
  { key: 'strong', label: 'Strong' },
];
export const POST_TYPES = { insight: 'Insight', story: 'Story', slides: 'Slides', video: 'Video', photo: 'Photo', training: 'Training', document: 'Document' };
export const MAX_FILE = 8 * 1024 * 1024;
export const MAX_VIDEO = 40 * 1024 * 1024;
// Background colours for text, story and slide posts.
export const THEMES = ['violet', 'sunset', 'lime', 'ocean', 'ink'];

// ---------- feed ----------
export function feedFor(user) {
  const u = user || me();
  if (!u) return [];
  return store.getState().posts.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export const postsBy = (userId) => feedFor().filter((p) => p.authorId === userId);

export async function createPost(p) {
  const u = me();
  if (!u || !isCoachRole(u.role)) throw new Error('Only coaches can post.');
  if (p.file && p.file.size > (p.type === 'video' ? MAX_VIDEO : MAX_FILE)) throw new Error('File too big');
  return store.putRaw('posts', {
    id: store.newId('P'), authorId: u.id, authorName: u.name, authorRole: u.role, teamCode: u.teamCode,
    type: p.type, title: p.title.trim(), body: (p.body || '').trim(), exercises: p.exercises || [], theme: p.theme || 'violet',
    panels: (p.panels || []).filter((x) => x.text.trim()).map((x) => ({ who: x.who || 'coach', text: x.text.trim(), scene: x.scene || '' })),
    slides: (p.slides || []).filter((x) => x.title.trim() || x.text.trim()).map((x) => ({ title: x.title.trim(), text: x.text.trim() })),
    file: p.file || null, fileName: p.file ? p.file.name : '', fileType: p.file ? p.file.type : '',
  });
}

export async function deletePost(id) {
  const u = me();
  const p = store.getState().posts.find((x) => x.id === id);
  if (!u || !p || p.authorId !== u.id) return;
  for (const r of store.getState().reactions.filter((x) => x.postId === id)) await store.deleteRecord('reactions', r.id);
  await store.deleteRecord('posts', id);
}

export const reactionsOn = (postId) => store.getState().reactions.filter((r) => r.postId === postId);
export const myReaction = (postId, kind) => { const u = me(); return !!u && reactionsOn(postId).some((r) => r.userId === u.id && r.kind === kind); };

export async function toggleReaction(postId, kind) {
  const u = me();
  if (!u || u.role !== 'athlete') return;
  const id = postId + '|' + u.id + '|' + kind;
  if (store.getState().reactions.some((r) => r.id === id)) await store.deleteRecord('reactions', id);
  else await store.saveRecord('reactions', { id, postId, userId: u.id, kind });
}
export const starred = (user) => store.getState().reactions.filter((r) => r.userId === user.id && r.kind === 'star').map((r) => r.postId);

// ---------- reports ----------
export function resultsFor(athleteId) { return store.getState().results.filter((r) => r.athleteId === athleteId); }

function lastWeekPulse(athleteId) {
  const since = new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10);
  const c = store.getState().checkins.filter((x) => x.athleteId === athleteId && x.date >= since);
  const painDays = c.filter((x) => x.pain);
  return {
    days: c.length,
    painDays: painDays.length,
    painAreas: [...new Set(painDays.flatMap((x) => x.regions || []))],
    shortSleep: c.filter((x) => Number(x.sleepHours) < 6).length,
    tired: c.filter((x) => Number(x.fatigue) >= 4).length,
  };
}

export async function sendReport(note) {
  const u = me();
  const to = u && u.role === 'athlete' ? prosOf(u.id).map((p) => p.id) : [];
  if (!to.length) throw new Error('Connect with a coach or physio first.');
  const results = resultsFor(u.athleteId);
  return store.saveRecord('reports', {
    id: store.newId('R'), athleteId: u.athleteId, userId: u.id, athleteName: u.name, teamCode: u.teamCode || '', toIds: to,
    note: (note || '').trim(), status: 'new',
    mirror: T.mirror(results), strengths: T.improvements(results), pulse: lastWeekPulse(u.athleteId),
    latest: T.TESTS.map((t) => T.history(results, t.key)[0]).filter(Boolean),
  });
}

export function inbox(user) {
  const u = user || me();
  if (!u) return [];
  return store.getState().reports.filter((r) => (r.toIds ? r.toIds.includes(u.id) : r.teamCode === u.teamCode)).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
export const myReports = (u) => store.getState().reports.filter((r) => r.userId === u.id).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

// A plan is a training programme: the exercises, how many weeks, and sessions per week.
export async function sendPlan(report, text, exercises, weeks, perWeek) {
  const u = me();
  if (!u || !isCoachRole(u.role)) throw new Error('Only coaches can send plans.');
  await store.saveRecord('plans', { id: store.newId('PL'), reportId: report.id, athleteId: report.athleteId, coachId: u.id, coachName: u.name, coachRole: u.role, text: text.trim(), exercises: exercises || [], weeks: Number(weeks) || 4, perWeek: Number(perWeek) || 3 });
  await store.saveRecord('reports', Object.assign({}, report, { status: 'answered' }));
}
export const plansFor = (athleteId) => store.getState().plans.filter((p) => p.athleteId === athleteId).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

// ---------- training progress ----------
const dayIso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
export const sessionsDone = (plan) => store.getState().progress.filter((x) => x.planId === plan.id).sort((a, b) => (a.date < b.date ? -1 : 1));

// Where the athlete is in the programme: week number, sessions this week and in total.
export function planStatus(plan) {
  const weeks = plan.weeks || 4, perWeek = plan.perWeek || 3;
  const start = Date.parse(plan.createdAt.slice(0, 10));
  const week = Math.min(weeks, Math.floor((Date.parse(dayIso(new Date())) - start) / (7 * 864e5)) + 1);
  const done = sessionsDone(plan);
  const weekStart = dayIso(new Date(start + (week - 1) * 7 * 864e5));
  const thisWeek = done.filter((x) => x.date >= weekStart).length;
  const total = weeks * perWeek;
  return { week, weeks, perWeek, thisWeek, done: done.length, total, finished: done.length >= total, today: done.some((x) => x.date === dayIso(new Date())) };
}

export async function tickSession(plan) {
  const today = dayIso(new Date());
  const id = 'PG-' + plan.id + '|' + today;
  if (store.getState().progress.some((x) => x.id === id)) { await store.deleteRecord('progress', id); return false; }
  await store.saveRecord('progress', { id, planId: plan.id, athleteId: plan.athleteId, date: today });
  return true;
}

// ---------- return-to-run ladder ----------
// One ladder per athlete at a time; the newest is the live one.
export const ladderFor = (athleteId) => store.getState().ladders.filter((l) => l.athleteId === athleteId && !l.stopped).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0] || null;

export async function startLadder(athleteId, athleteUserId, stages, note) {
  const u = me();
  if (!u || !isCoachRole(u.role)) throw new Error('Only a coach or physio can set a ladder.');
  if (!stages.length) throw new Error('Pick at least one stage.');
  const old = ladderFor(athleteId);
  if (old) await store.saveRecord('ladders', Object.assign({}, old, { stopped: true }));
  return store.saveRecord('ladders', { id: store.newId('LD'), athleteId, athleteUserId, proId: u.id, proName: u.name, proRole: u.role, stages, note: (note || '').trim(), log: [] });
}

export async function logLadder(ladder, entry) {
  return store.saveRecord('ladders', Object.assign({}, ladder, { log: (ladder.log || []).concat([Object.assign({ date: dayIso(new Date()) }, entry)]) }));
}
