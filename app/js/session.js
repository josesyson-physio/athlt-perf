// Accounts and sign-in. Two kinds of account: athletes, and coaches (coach, trainer or physio).
// This version keeps accounts on this device only; online sign-in replaces this file's storage
// when a server is connected. Passwords are stored as salted SHA-256 hashes, never as text.
import * as store from './store.js';
import { linkActive } from './connect.js';

const KEY = 'mp-session';
let current = null;
try { current = localStorage.getItem(KEY); } catch (e) { /* stays signed out */ }

export const ROLES = { athlete: 'Athlete', coach: 'Coach', trainer: 'Trainer', physio: 'Physio' };
export const isCoachRole = (role) => role === 'coach' || role === 'trainer' || role === 'physio';

async function hash(email, password) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('motionplus-user:' + email.toLowerCase() + ':' + password));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
const cleanEmail = (e) => String(e || '').trim().toLowerCase();

export function me() {
  if (!current) return null;
  return store.getState().users.find((u) => u.id === current) || null;
}
export const myAthlete = () => { const u = me(); return u && u.athleteId ? store.getAthlete(u.athleteId) : null; };

function remember(id) {
  current = id;
  try { if (id) localStorage.setItem(KEY, id); else localStorage.removeItem(KEY); } catch (e) { /* this tab only */ }
}

// Team codes join athletes to their coach: six letters and digits, no look-alike characters.
export function newTeamCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  const r = crypto.getRandomValues(new Uint8Array(6));
  r.forEach((n) => { c += A[n % A.length]; });
  return store.getState().users.some((u) => u.teamCode === c && isCoachRole(u.role)) ? newTeamCode() : c;
}
export const teamExists = (code) => store.getState().users.some((u) => isCoachRole(u.role) && u.teamCode === String(code || '').trim().toUpperCase());
export const coachesOf = (code) => store.getState().users.filter((u) => isCoachRole(u.role) && u.teamCode === code);

export function signupErrors(f) {
  const e = [];
  if (!String(f.name || '').trim()) e.push('your name');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail(f.email))) e.push('a valid email');
  if (String(f.password || '').length < 6) e.push('a password of at least 6 characters');
  if (store.getState().users.some((u) => u.email === cleanEmail(f.email))) e.push('a different email (this one already has an account)');
  if (f.role === 'athlete') {
    const y = Number(f.birthYear), now = new Date().getFullYear();
    if (!(y > now - 80 && y < now - 7)) e.push('your birth year');
    if (!f.sex) e.push('the sex used by fitness equations');
    if (f.teamCode && !teamExists(f.teamCode)) e.push('a team code that exists (ask your coach)');
  }
  return e;
}

export async function signUp(f) {
  const email = cleanEmail(f.email);
  const user = { id: store.newId('U'), role: f.role, name: f.name.trim(), email, passHash: await hash(email, f.password) };
  if (f.role === 'athlete') {
    const a = await store.saveAthlete({ name: user.name, age: '', dob: f.birthYear ? f.birthYear + '-07-01' : '', dobApprox: true, sex: f.sex, sport: 'Athletics', position: f.event || '', level: '', dominantSide: '', medicalNotes: '', medications: '', consentOnFile: true, selfRegistered: true });
    user.athleteId = a.id;
    user.teamCode = f.teamCode ? f.teamCode.trim().toUpperCase() : '';
  } else {
    user.teamCode = newTeamCode();
    user.speciality = (f.speciality || '').trim();
    user.place = (f.place || '').trim();
    user.bio = '';
    if (!store.getState().settings.assessorName) await store.saveSettings({ assessorName: user.name });
  }
  await store.saveRecord('users', user);
  remember(user.id);
  if (user.teamCode && f.role === 'athlete') for (const c of coachesOf(user.teamCode)) await linkActive(user.id, c.id, { from: 'team' });
  return user;
}

export async function signIn(email, password) {
  const e = cleanEmail(email);
  const u = store.getState().users.find((x) => x.email === e);
  if (!u || u.passHash !== (await hash(e, password))) return null;
  remember(u.id);
  return u;
}

export function signOut() { remember(null); }
export function switchTo(userId) { remember(userId); }

export async function joinTeam(code) {
  const u = me();
  const c = String(code || '').trim().toUpperCase();
  if (!u || !teamExists(c)) return false;
  await store.saveRecord('users', Object.assign({}, u, { teamCode: c }));
  for (const p of coachesOf(c)) await linkActive(u.id, p.id, { from: 'team' });
  return true;
}

export async function updateMe(patch) {
  const u = me();
  if (!u) return null;
  return store.saveRecord('users', Object.assign({}, u, patch));
}
