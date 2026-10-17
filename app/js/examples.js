// Example records for trying the app. Every record is marked `example: true`
// and can be removed in one step from Settings. Values are invented, not real athletes.
import * as store from './store.js';
import { calculate } from './calc.js';
import { today } from './monitor.js';

const PEOPLE = [
  { name: 'Rohan Mehta', sex: 'male', dob: '2004-03-18', heightCm: 178, massKg: 72, sport: 'Football', position: 'Midfielder', level: 'Semi-professional', dominantSide: 'Right' },
  { name: 'Kavya Nair', sex: 'female', dob: '2002-08-05', heightCm: 166, massKg: 56, sport: 'Athletics', position: '400 m', level: 'National', dominantSide: 'Right' },
  { name: 'Aarav Singh', sex: 'male', dob: '1999-11-23', heightCm: 191, massKg: 86, sport: 'Basketball', position: 'Guard', level: 'Club', dominantSide: 'Left' },
];

function monthsAgo(n) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 10);
}

export async function loadExamples() {
  const made = [];
  for (const [i, p] of PEOPLE.entries()) {
    const athlete = await store.saveAthlete(Object.assign({ example: true, consentOnFile: true, medicalNotes: '', monitorConsent: true, monitorConsentBy: 'Athlete (18 or over)', monitorConsentDate: daysAgo(40) }, p));
    made.push(athlete);
    const base = 8 + i * 1.7;
    for (const [k, ago] of [4, 2, 0].entries()) {
      const a = store.newAssessment(athlete.id, 'full', ['cardio', 'strength', 'power', 'mobility', 'balance']);
      a.id = 'AS-EX' + i + k;
      a.example = true;
      a.date = monthsAgo(ago);
      a.assessor = 'Example assessor';
      a.context = { location: 'Clinic gym', tempC: 24, humidity: 55, surface: '400 m track', equipment: 'Polar H10 strap, Jamar dynamometer', notes: '' };
      a.screening = { answers: [], clinicianCleared: false, clearedBy: '', consent: true, decision: 'proceed' };
      a.vitals = { restHr: 62 - k * 2 - i, restHrMethod: 'Manual radial pulse, 60 s', sbp: 118 + i * 3, dbp: 76, rr: 14, spo2: 98, tempC: 36.7, heightCm: p.heightCm, massKg: p.massKg - k * 0.5, waistCm: 76 + i * 4 };
      const dist = [2650, 2400, 2550][i] + k * 70;
      a.cardio = { protocolId: 'cooper_12min', inputs: { distance_m: dist }, completed: true, hrMethod: 'Chest strap', endHr: 190 - i * 3, recHr60: 158 - k * 4 - i * 2, recHr120: 132 - k * 4, rpe: 17, recoveryPosture: 'Seated' };
      a.strength = { gripL: [40 - i * 6 + k, 41 - i * 6 + k, 39], gripR: [44 - i * 6 + k, 45 - i * 6 + k, 43], device: 'Jamar hydraulic, position 2' };
      a.power = { standReach: [228, 214, 245][i], jumpReach: [[280, 284, 279], [262, 265, 260], [302, 306, 301]][i].map((v) => v + k), armSwing: true, sprintDistance: 20, sprintTimes: [3.12 - k * 0.03 + i * 0.1, 3.18 - k * 0.03 + i * 0.1, 3.15 - k * 0.03 + i * 0.1], timing: 'Timing gates' };
      a.mobility = { lungeL: 10 + k * 0.5, lungeR: base + k * 0.5 };
      a.balance = { slsL: 30, slsR: 26 + k, eyes: 'eyes closed', maxS: 30 };
      a.results = calculate(a, Object.assign({}, athlete, { age: store.ageAt(athlete, a.date) }));
      a.status = k === 2 && i === 2 ? 'calculated' : 'approved';
      if (a.status === 'approved') a.report = { notes: '', approvedBy: 'Example assessor', approvedAt: a.date + 'T12:00:00.000Z' };
      await store.saveAssessment(a);
    }
  }
  await loadMonitoring(made);
  return made;
}

function daysAgo(n) {
  return new Date(Date.parse(today()) - n * 864e5).toISOString().slice(0, 10);
}

// Four weeks of invented monitoring. Kavya develops calf pain and harder intervals (Look at today and Keep an eye on),
// Rohan stops checking in (No answers yet), Aarav sleeps short on three nights (Keep an eye on).
async function loadMonitoring(made) {
  const [rohan, kavya, aarav] = made;
  const ex = { example: true };
  for (let n = 27; n >= 0; n--) {
    const date = daysAgo(n);
    const dow = new Date(date + 'T12:00:00Z').getUTCDay();
    const wobble = (n * 7) % 3;
    if (n >= 2) await store.saveRecord('checkins', Object.assign({ id: 'CI-EX0' + n, athleteId: rohan.id, date, pain: false, regions: [], fatigue: 2 + (wobble === 2 ? 1 : 0), soreness: dow === 0 ? 3 : 2, sleepHours: 7.5, sleepQuality: 4, ill: false, redFlags: { chest: false, bone: false, head: false }, sensitive: {}, secondsToComplete: 38 + wobble * 6 }, ex));
    const calf = [4, 2, 1, 0].includes(n);
    await store.saveRecord('checkins', Object.assign({ id: 'CI-EX1' + n, athleteId: kavya.id, date, pain: calf, regions: calf ? ['Calf or shin'] : [], painScore: calf ? { 4: 2, 2: 3, 1: 3, 0: 4 }[n] : '', painAffectsRunning: n === 0, fatigue: n < 5 ? 4 - (n % 2) : 2 + (wobble === 1 ? 1 : 0), soreness: calf ? 3 : 2, sleepHours: 8, sleepQuality: 4, ill: false, redFlags: { chest: false, bone: false, head: false }, sensitive: {}, secondsToComplete: 45 + wobble * 5 }, ex));
    await store.saveRecord('checkins', Object.assign({ id: 'CI-EX2' + n, athleteId: aarav.id, date, pain: false, regions: [], fatigue: 3, soreness: 2, sleepHours: [5, 3, 1].includes(n) ? 5.5 : 7, sleepQuality: [5, 3, 1].includes(n) ? 2 : 4, ill: false, redFlags: { chest: false, bone: false, head: false }, sensitive: {}, secondsToComplete: 33 + wobble * 7 }, ex));
    const sess = (i, a, type, min, rpe, extra) => store.saveRecord('sessions', Object.assign({ id: 'TS-EX' + i + n, athleteId: a.id, date, type, plannedMin: min, actualMin: min, plannedKm: '', actualKm: '', surface: '', route: '', footwear: '', warmup: true, prevention: dow === 1, rpe, notes: '' }, extra || {}, ex));
    if ([1, 3, 5].includes(dow) && n >= 2) await sess(0, rohan, 'Team or skills practice', 90, 5 + (wobble === 2 ? 1 : 0), { surface: 'Grass', footwear: 'Boots or studs' });
    if (dow === 6 && n >= 2) await sess(0, rohan, 'Match or race', 95, 8, { surface: 'Grass', footwear: 'Boots or studs' });
    if ([2, 5].includes(dow)) await sess(1, kavya, 'Intervals', 60, n <= 6 ? 8 + (n <= 2 ? 1 : 0) : 6 + (wobble === 1 ? 1 : 0) - (wobble === 2 ? 1 : 0), { surface: 'Track', route: 'College track', footwear: 'Spikes', actualKm: 6 });
    if ([1, 4].includes(dow)) await sess(1, kavya, 'Easy run', 40, 3, { surface: 'Road', route: 'Campus loop', footwear: 'Trainers', actualKm: 7 });
    if (dow === 3) await sess(1, kavya, 'Strength and gym', 50, 5, { surface: 'Gym' });
    if ([1, 2, 4, 5].includes(dow)) await sess(2, aarav, 'Team or skills practice', 100, 6, { surface: 'Indoor court', footwear: 'Court shoes' });
  }
}

export async function removeExamples() {
  const s = store.getState();
  for (const a of s.athletes.filter((x) => x.example)) await store.deleteAthlete(a.id);
  for (const k of store.SOCIAL) for (const r of s[k].filter((x) => x.example)) await store.deleteRecord(k, r.id);
}
