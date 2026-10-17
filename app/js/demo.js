// Demo: invented athletes, a physio, free test results, posts and a report, so both sides of the
// app can be tried on one phone. Everything is marked example and removed from Settings.
import * as store from './store.js';
import { loadExamples } from './examples.js';
import { switchTo } from './session.js';
import { sendReport } from './social.js';
import { today } from './monitor.js';

export const DEMO_PASSWORD = 'demo1234';
const TEAM = 'DEMO26';
const daysAgo = (n) => new Date(Date.parse(today()) - n * 864e5).toISOString().slice(0, 10);

async function hash(email) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('motionplus-user:' + email + ':' + DEMO_PASSWORD));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const RESULTS = {
  'Kavya Nair': [
    [35, { calf: [22, 25], lunge: [9, 11.5], bridge: [24, 26], hop: [150, 158], reach: [62, 64], sideplank: [55, 58], run12: 2600, broad: 205, sprint20: 3.32, squeeze: 0 }],
    [3, { calf: [19, 27], lunge: [8.5, 11.6], bridge: [22, 27], hop: [152, 170], reach: [63, 65], sideplank: [57, 59], run12: 2720, broad: 212, sprint20: 3.28, squeeze: 0 }],
  ],
  'Rohan Mehta': [[10, { calf: [28, 29], lunge: [12, 12.5], hop: [176, 181], bridge: [27, 28], run12: 2900, sprint20: 3.15 }]],
  'Aarav Singh': [[6, { calf: [26, 27], reach: [70, 64], sideplank: [62, 64], broad: 248, sprint20: 3.22 }]],
};

export async function loadDemo() {
  let made = store.getState().athletes.filter((a) => a.example);
  if (!made.length) made = await loadExamples();
  const ex = { example: true };
  const coachEmail = 'physio@demo.motionplus';
  if (!store.getState().users.some((u) => u.email === coachEmail)) {
    const coach = await store.saveRecord('users', Object.assign({ id: 'U-DEMO-COACH', role: 'physio', name: 'Anita Rao', email: coachEmail, passHash: await hash(coachEmail), teamCode: TEAM }, ex));
    for (const a of made) {
      const email = a.name.split(' ')[0].toLowerCase() + '@demo.motionplus';
      await store.saveRecord('users', Object.assign({ id: 'U-DEMO-' + a.id, role: 'athlete', name: a.name, email, passHash: await hash(email), athleteId: a.id, teamCode: TEAM }, ex));
      for (const [ago, set] of RESULTS[a.name] || []) {
        for (const [test, v] of Object.entries(set)) {
          const vals = Array.isArray(v) ? { left: v[0], right: v[1] } : { value: v };
          await store.saveRecord('results', Object.assign({ id: 'TR-DEMO-' + a.id + test + ago, athleteId: a.id, test, date: daysAgo(ago), version: 'tests_v1' }, vals, ex));
        }
      }
    }
    const post = (id, hoursAgo, rest) => store.saveRecord('posts', Object.assign({ id, authorId: coach.id, authorName: coach.name, authorRole: coach.role, teamCode: TEAM, body: '', exercises: [], file: null, fileName: '', fileType: '', createdAt: new Date(Date.now() - hoursAgo * 36e5).toISOString() }, rest, ex));
    await post('P-DEMO-1', 30, { type: 'insight', title: 'Why we test one leg at a time', body: 'Most running injuries start on one side. Your two legs can look the same and still be 20% apart in strength.\n\nThe Mirror shows that gap. Close it before the season and you run faster and get hurt less.' });
    await post('P-DEMO-2', 5, { type: 'training', title: 'Tuesday: calf and ankle circuit', body: 'Three rounds, 1 minute rest between rounds. Slow and controlled.', exercises: ['calf-raise', 'bent-calf', 'ankle-wall', 'hop-stick'] });
    // Rohan sends his Mirror so the physio inbox has a report waiting.
    switchTo('U-DEMO-' + made[0].id);
    await sendReport('Knee feels fine after the match.');
    const kavya = made.find((a) => a.name === 'Kavya Nair');
    await store.saveRecord('reactions', Object.assign({ id: 'P-DEMO-2|U-DEMO-' + kavya.id + '|star', postId: 'P-DEMO-2', userId: 'U-DEMO-' + kavya.id, kind: 'star' }, ex));
  }
  const kavya = made.find((a) => a.name === 'Kavya Nair') || made[0];
  switchTo('U-DEMO-' + kavya.id);
}
