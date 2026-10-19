// Connections and chat. An athlete picks coaches and physios and taps Connect; the pro accepts.
// When an athlete has two pros, each pro approves the other before they work together on that
// athlete (see each other's plans and chat). Chat is one to one: athlete with a connected pro, or
// two pros who approved each other. Kept on this phone until online accounts are switched on.
import * as store from './store.js';
import { me, isCoachRole } from './session.js';

const S = () => store.getState();
const user = (id) => S().users.find((u) => u.id === id) || null;
const linkId = (athleteUserId, proId) => 'L-' + athleteUserId + '|' + proId;
const pairId = (athleteUserId, a, b) => 'PR-' + athleteUserId + '|' + [a, b].sort().join('|');

// ---------- athlete and pro ----------
export const pros = () => S().users.filter((u) => isCoachRole(u.role));
export const linkBetween = (athleteUserId, proId) => S().links.find((l) => l.id === linkId(athleteUserId, proId)) || null;
export const prosOf = (athleteUserId) => S().links.filter((l) => l.kind === 'athlete' && l.athleteUserId === athleteUserId && l.status === 'active').map((l) => user(l.proId)).filter(Boolean);
export const athletesOf = (proId) => S().links.filter((l) => l.kind === 'athlete' && l.proId === proId && l.status === 'active').map((l) => user(l.athleteUserId)).filter(Boolean);
export const requestsFor = (proId) => S().links.filter((l) => l.kind === 'athlete' && l.proId === proId && l.status === 'pending');

export async function connect(proId, note) {
  const u = me();
  if (!u || u.role !== 'athlete' || !user(proId)) return null;
  const old = linkBetween(u.id, proId);
  if (old) return old;
  return store.saveRecord('links', { id: linkId(u.id, proId), kind: 'athlete', athleteUserId: u.id, proId, status: 'pending', note: (note || '').trim() });
}

// Joining by team code connects straight away: the code itself is the pro's invitation.
export async function linkActive(athleteUserId, proId, extra) {
  const l = Object.assign({ id: linkId(athleteUserId, proId), kind: 'athlete', athleteUserId, proId, status: 'active' }, extra || {});
  await store.saveRecord('links', l);
  await refreshPairs(athleteUserId);
  return l;
}

export async function accept(id) {
  const l = S().links.find((x) => x.id === id);
  const u = me();
  if (!l || !u || l.proId !== u.id) return;
  await store.saveRecord('links', Object.assign({}, l, { status: 'active' }));
  await refreshPairs(l.athleteUserId);
}

export async function removeLink(id) {
  const l = S().links.find((x) => x.id === id);
  if (!l) return;
  await store.deleteRecord('links', id);
  for (const p of S().links.filter((x) => x.kind === 'pair' && x.athleteUserId === l.athleteUserId && x.pros.includes(l.proId))) await store.deleteRecord('links', p.id);
}

// ---------- pros approving each other ----------
async function refreshPairs(athleteUserId) {
  const ps = prosOf(athleteUserId);
  for (let i = 0; i < ps.length; i++) {
    for (let j = i + 1; j < ps.length; j++) {
      const id = pairId(athleteUserId, ps[i].id, ps[j].id);
      if (!S().links.some((x) => x.id === id)) await store.saveRecord('links', { id, kind: 'pair', athleteUserId, pros: [ps[i].id, ps[j].id].sort(), approved: [] });
    }
  }
}
export const pairsFor = (proId) => S().links.filter((x) => x.kind === 'pair' && x.pros.includes(proId));
export const pairActive = (p) => p.pros.every((id) => p.approved.includes(id));
export const partnerOf = (p, proId) => user(p.pros.find((id) => id !== proId));

export async function approvePair(id) {
  const p = S().links.find((x) => x.id === id);
  const u = me();
  if (!p || !u || !p.pros.includes(u.id) || p.approved.includes(u.id)) return;
  await store.saveRecord('links', Object.assign({}, p, { approved: p.approved.concat([u.id]) }));
}
export async function removePair(id) { await store.deleteRecord('links', id); }

// Pros who approved each other for this athlete: they see each other's plans.
export function teamFor(athleteUserId, proId) {
  return pairsFor(proId).filter((p) => p.athleteUserId === athleteUserId && pairActive(p)).map((p) => partnerOf(p, proId)).filter(Boolean);
}

// ---------- chat ----------
export const threadId = (a, b) => 'T-' + [a, b].sort().join('|');

export function canChat(a, b) {
  const A = user(a), B = user(b);
  if (!A || !B || a === b) return false;
  if (A.role === 'athlete' && isCoachRole(B.role)) return !!S().links.find((l) => l.id === linkId(a, b) && l.status === 'active');
  if (B.role === 'athlete' && isCoachRole(A.role)) return !!S().links.find((l) => l.id === linkId(b, a) && l.status === 'active');
  if (isCoachRole(A.role) && isCoachRole(B.role)) return pairsFor(a).some((p) => p.pros.includes(b) && pairActive(p));
  return false;
}

export function contacts(u) {
  if (!u) return [];
  const ids = new Set();
  if (u.role === 'athlete') prosOf(u.id).forEach((p) => ids.add(p.id));
  else {
    athletesOf(u.id).forEach((a) => ids.add(a.id));
    pairsFor(u.id).filter(pairActive).forEach((p) => ids.add(p.pros.find((x) => x !== u.id)));
  }
  return [...ids].map(user).filter(Boolean);
}

export const messagesIn = (tid) => S().messages.filter((m) => m.threadId === tid).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
export const unreadFor = (u, otherId) => S().messages.filter((m) => m.toId === u.id && !m.read && (!otherId || m.fromId === otherId)).length;

// Chats for the list: contacts with the latest message first, then the rest by name.
export function chats(u) {
  return contacts(u).map((o) => {
    const ms = messagesIn(threadId(u.id, o.id));
    return { other: o, last: ms[ms.length - 1] || null, unread: unreadFor(u, o.id) };
  }).sort((a, b) => (b.last ? b.last.createdAt : '') .localeCompare(a.last ? a.last.createdAt : '') || a.other.name.localeCompare(b.other.name));
}

export async function send(toId, text, attach) {
  const u = me();
  if (!u || !canChat(u.id, toId)) throw new Error('You can only chat with people you are connected to.');
  const t = String(text || '').trim();
  if (!t && !attach) return null;
  return store.saveRecord('messages', { id: store.newId('M'), threadId: threadId(u.id, toId), fromId: u.id, toId, text: t, attach: attach || null, read: false });
}

export async function markRead(otherId) {
  const u = me();
  if (!u) return;
  for (const m of S().messages.filter((x) => x.toId === u.id && x.fromId === otherId && !x.read)) await store.saveRecord('messages', Object.assign({}, m, { read: true }));
}
