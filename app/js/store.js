// On-device data store. Records live in IndexedDB in this browser; nothing is sent anywhere.
// Everything is kept in memory after load and written through on every change.

const DB_NAME = 'motionplus';
const DB_VERSION = 5;
const STORES = ['athletes', 'assessments', 'settings', 'checkins', 'sessions', 'weeklies', 'reviews', 'focus', 'results', 'reports', 'plans', 'users', 'posts', 'reactions', 'links', 'messages', 'progress'];
// Records that belong to one athlete: check-ins, training, weekly health (older data), signal notes,
// focus checks (older data), free test results, reports sent to a coach, plans sent back and training sessions ticked off.
export const MONITOR = ['checkins', 'sessions', 'weeklies', 'reviews', 'focus', 'results', 'reports', 'plans', 'progress'];
// Accounts on this device, posts in the feed, athletes' reactions, connections and chat messages.
export const SOCIAL = ['users', 'posts', 'reactions', 'links', 'messages'];

let db = null;
const state = { athletes: [], assessments: [], checkins: [], sessions: [], weeklies: [], reviews: [], focus: [], results: [], reports: [], plans: [], users: [], posts: [], reactions: [], links: [], messages: [], progress: [], settings: { id: 'app', assessorName: '', clinicName: 'MotionPlus Physio' }, ready: false, storage: 'indexeddb' };
const listeners = new Set();

function openDb() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in globalThis)) return reject(new Error('no indexeddb'));
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => STORES.forEach((s) => { if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s, { keyPath: 'id' }); });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function all(store) {
  return new Promise((resolve, reject) => {
    const r = db.transaction(store).objectStore(store).getAll();
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

function write(store, value, del) {
  if (!db) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    if (del) tx.objectStore(store).delete(value);
    else tx.objectStore(store).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function emit() { listeners.forEach((fn) => fn()); }
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function getState() { return state; }

export async function init() {
  try {
    db = await openDb();
    const loaded = await Promise.all(STORES.map(all));
    const [athletes, assessments, settings] = loaded;
    state.athletes = athletes;
    state.assessments = assessments;
    MONITOR.concat(SOCIAL).forEach((k) => { state[k] = loaded[STORES.indexOf(k)]; });
    if (settings[0]) state.settings = Object.assign(state.settings, settings[0]);
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  } catch (e) {
    db = null;
    state.storage = 'memory';
  }
  state.ready = true;
  emit();
}

const clone = (o) => JSON.parse(JSON.stringify(o));
const now = () => new Date().toISOString();

// ---------- athletes ----------
export function nextAthleteId() {
  const n = state.athletes.reduce((m, a) => Math.max(m, Number(String(a.id).replace(/\D/g, '')) || 0), 0) + 1;
  return 'MP-' + String(n).padStart(4, '0');
}

export function ageAt(athlete, dateIso) {
  if (!athlete) return null;
  if (athlete.dob) {
    const d = new Date(athlete.dob), at = dateIso ? new Date(dateIso) : new Date();
    let age = at.getFullYear() - d.getFullYear();
    if (at.getMonth() < d.getMonth() || (at.getMonth() === d.getMonth() && at.getDate() < d.getDate())) age--;
    return age;
  }
  return athlete.age != null && athlete.age !== '' ? Number(athlete.age) : null;
}

export function getAthlete(id) { return state.athletes.find((a) => a.id === id) || null; }

export async function saveAthlete(input, reason) {
  const existing = input.id ? getAthlete(input.id) : null;
  const rec = Object.assign({}, existing || {}, clone(input));
  rec.updatedAt = now();
  if (!existing) {
    rec.id = rec.id || nextAthleteId();
    rec.createdAt = rec.updatedAt;
    rec.history = [{ at: rec.updatedAt, by: state.settings.assessorName || 'unknown', change: 'Profile created' }];
    state.athletes.push(rec);
  } else {
    const changed = Object.keys(input).filter((k) => !['history', 'updatedAt'].includes(k) && JSON.stringify(existing[k]) !== JSON.stringify(input[k]));
    if (changed.length) {
      rec.history = (existing.history || []).concat([{ at: rec.updatedAt, by: state.settings.assessorName || 'unknown', change: 'Edited ' + changed.join(', '), reason: reason || '', before: Object.fromEntries(changed.map((k) => [k, existing[k] ?? null])) }]);
    }
    state.athletes[state.athletes.indexOf(existing)] = rec;
  }
  await write('athletes', rec);
  emit();
  return rec;
}

export async function deleteAthlete(id) {
  state.athletes = state.athletes.filter((a) => a.id !== id);
  const gone = state.assessments.filter((x) => x.athleteId === id);
  state.assessments = state.assessments.filter((x) => x.athleteId !== id);
  await write('athletes', id, true);
  await Promise.all(gone.map((g) => write('assessments', g.id, true)));
  for (const k of MONITOR) {
    const g = state[k].filter((x) => x.athleteId === id);
    state[k] = state[k].filter((x) => x.athleteId !== id);
    await Promise.all(g.map((x) => write(k, x.id, true)));
  }
  emit();
}

// ---------- assessments ----------
export function getAssessment(id) { return state.assessments.find((a) => a.id === id) || null; }

export function newAssessment(athleteId, type, domains) {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: 'AS-' + Date.now().toString(36).toUpperCase(),
    athleteId: athleteId || '',
    type: type || 'full',
    domains: domains || [],
    date: today,
    assessor: state.settings.assessorName || '',
    status: 'draft',
    context: { location: '', tempC: '', humidity: '', surface: '', equipment: '', notes: '' },
    screening: { answers: [], clinicianCleared: false, clearedBy: '', consent: false, decision: '' },
    vitals: { restHrMethod: 'Manual radial pulse, 60 s' },
    cardio: { protocolId: '', inputs: {}, completed: false, hrMethod: 'Chest strap', recoveryPosture: 'Seated' },
    strength: { gripL: ['', '', ''], gripR: ['', '', ''], device: '' },
    power: { standReach: '', jumpReach: ['', '', ''], armSwing: true, sprintDistance: 20, sprintTimes: ['', '', ''], timing: 'Hand-timed stopwatch' },
    mobility: { lungeL: '', lungeR: '' },
    balance: { slsL: '', slsR: '', eyes: 'eyes open', maxS: 30 },
    results: null,
    report: { notes: '', approvedBy: '', approvedAt: '' },
    audit: [],
    createdAt: now(),
    updatedAt: now(),
  };
}

export async function saveAssessment(rec, auditNote) {
  const r = clone(rec);
  r.updatedAt = now();
  if (auditNote) r.audit = (r.audit || []).concat([{ at: r.updatedAt, by: state.settings.assessorName || r.assessor || 'unknown', note: auditNote }]);
  const i = state.assessments.findIndex((a) => a.id === r.id);
  if (i >= 0) state.assessments[i] = r; else state.assessments.push(r);
  await write('assessments', r);
  emit();
  return r;
}

export async function deleteAssessment(id) {
  state.assessments = state.assessments.filter((a) => a.id !== id);
  await write('assessments', id, true);
  emit();
}

export function assessmentsFor(athleteId) {
  return state.assessments.filter((a) => a.athleteId === athleteId).sort((a, b) => (a.date + a.createdAt < b.date + b.createdAt ? 1 : -1));
}

// ---------- monitoring ----------
export const newId = (prefix) => prefix + '-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();

export async function saveRecord(kind, rec) {
  const r = clone(rec);
  r.updatedAt = now();
  if (!r.createdAt) r.createdAt = r.updatedAt;
  const i = state[kind].findIndex((x) => x.id === r.id);
  if (i >= 0) state[kind][i] = r; else state[kind].push(r);
  await write(kind, r);
  emit();
  return r;
}

// Saves a record as is, without the JSON copy, so files (Blobs) in it survive.
export async function putRaw(kind, rec) {
  const r = Object.assign({}, rec, { updatedAt: now() });
  if (!r.createdAt) r.createdAt = r.updatedAt;
  const i = state[kind].findIndex((x) => x.id === r.id);
  if (i >= 0) state[kind][i] = r; else state[kind].push(r);
  await write(kind, r);
  emit();
  return r;
}

export async function deleteRecord(kind, id) {
  state[kind] = state[kind].filter((x) => x.id !== id);
  await write(kind, id, true);
  emit();
}

export const monitorFor = (athleteId) => ({
  checkins: state.checkins.filter((x) => x.athleteId === athleteId),
  sessions: state.sessions.filter((x) => x.athleteId === athleteId),
  weeklies: state.weeklies.filter((x) => x.athleteId === athleteId),
});

// ---------- settings ----------
export async function saveSettings(patch) {
  state.settings = Object.assign({}, state.settings, patch, { id: 'app' });
  await write('settings', state.settings);
  emit();
}

// ---------- backup ----------
export function exportData() {
  return Object.assign({ app: 'motionplus', version: 3, exported_at: now(), athletes: state.athletes, assessments: state.assessments, settings: state.settings }, Object.fromEntries(MONITOR.map((k) => [k, state[k]])), Object.fromEntries(SOCIAL.map((k) => [k, state[k].map((x) => { const c = Object.assign({}, x); delete c.file; return c; })])));
}

export async function importData(data) {
  if (!data || data.app !== 'motionplus' || !Array.isArray(data.athletes) || !Array.isArray(data.assessments)) throw new Error('format');
  let added = 0, skipped = 0;
  for (const a of data.athletes) {
    if (!a || !a.id || !a.name || getAthlete(a.id)) { skipped++; continue; }
    state.athletes.push(a); await write('athletes', a); added++;
  }
  for (const s of data.assessments) {
    if (!s || !s.id || !s.athleteId || getAssessment(s.id)) { skipped++; continue; }
    state.assessments.push(s); await write('assessments', s); added++;
  }
  for (const k of MONITOR.concat(SOCIAL)) {
    for (const r of Array.isArray(data[k]) ? data[k] : []) {
      if (!r || !r.id || state[k].some((x) => x.id === r.id)) { skipped++; continue; }
      state[k].push(r); await write(k, r); added++;
    }
  }
  emit();
  return { added, skipped };
}

export async function clearAll() {
  for (const a of state.athletes) await write('athletes', a.id, true);
  for (const a of state.assessments) await write('assessments', a.id, true);
  for (const k of MONITOR.concat(SOCIAL)) { for (const r of state[k]) await write(k, r.id, true); state[k] = []; }
  state.athletes = [];
  state.assessments = [];
  emit();
}
