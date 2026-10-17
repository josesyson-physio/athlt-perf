// Feed, reactions, reports and plans between athletes and their coaches.
// Coaches post (insights, documents, training); athletes can only star or react.
// Athletes send their Mirror to their team's coaches; coaches send a plan back.
import * as store from './store.js';
import { me, isCoachRole } from './session.js';

const T = globalThis.MotionPlusTests;
export const REACTIONS = [
  { key: 'star', label: 'Star' },
  { key: 'fire', label: 'Fire' },
  { key: 'clap', label: 'Clap' },
  { key: 'strong', label: 'Strong' },
];
export const POST_TYPES = { insight: 'Insight', document: 'Document', training: 'Training' };
export const MAX_FILE = 8 * 1024 * 1024;

// ---------- feed ----------
export function feedFor(user) {
  const u = user || me();
  if (!u) return [];
  const posts = store.getState().posts.filter((p) => (isCoachRole(u.role) ? p.authorId === u.id || p.teamCode === u.teamCode : u.teamCode && p.teamCode === u.teamCode));
  return posts.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function createPost(p) {
  const u = me();
  if (!u || !isCoachRole(u.role)) throw new Error('Only coaches can post.');
  if (p.file && p.file.size > MAX_FILE) throw new Error('File too big');
  return store.putRaw('posts', {
    id: store.newId('P'), authorId: u.id, authorName: u.name, authorRole: u.role, teamCode: u.teamCode,
    type: p.type, title: p.title.trim(), body: (p.body || '').trim(), exercises: p.exercises || [],
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
  if (!u || u.role !== 'athlete' || !u.teamCode) throw new Error('Join a team first.');
  const results = resultsFor(u.athleteId);
  return store.saveRecord('reports', {
    id: store.newId('R'), athleteId: u.athleteId, userId: u.id, athleteName: u.name, teamCode: u.teamCode,
    note: (note || '').trim(), status: 'new',
    mirror: T.mirror(results), strengths: T.improvements(results), pulse: lastWeekPulse(u.athleteId),
    latest: T.TESTS.map((t) => T.history(results, t.key)[0]).filter(Boolean),
  });
}

export function inbox(user) {
  const u = user || me();
  if (!u) return [];
  return store.getState().reports.filter((r) => r.teamCode === u.teamCode).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
export const myReports = (u) => store.getState().reports.filter((r) => r.userId === u.id).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

export async function sendPlan(report, text, exercises) {
  const u = me();
  if (!u || !isCoachRole(u.role)) throw new Error('Only coaches can send plans.');
  await store.saveRecord('plans', { id: store.newId('PL'), reportId: report.id, athleteId: report.athleteId, coachId: u.id, coachName: u.name, coachRole: u.role, text: text.trim(), exercises: exercises || [] });
  await store.saveRecord('reports', Object.assign({}, report, { status: 'answered' }));
}
export const plansFor = (athleteId) => store.getState().plans.filter((p) => p.athleteId === athleteId).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
