// Example records for trying the app. Every record is marked `example: true`
// and can be removed in one step from Settings. Values are invented, not real athletes.
import * as store from './store.js';
import { calculate } from './calc.js';

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
    const athlete = await store.saveAthlete(Object.assign({ example: true, consentOnFile: true, medicalNotes: '' }, p));
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
  return made;
}

export async function removeExamples() {
  const s = store.getState();
  for (const a of s.athletes.filter((x) => x.example)) await store.deleteAthlete(a.id);
}
