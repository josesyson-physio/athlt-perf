// Demo: invented athletes, a physio, a coach and a trainer, free test results, posts (a comic
// story, slides, insights, training), connections, a programme and chats, so every part of the
// app can be tried on one phone. Everything is marked example and removed from Settings.
import * as store from './store.js';
import { loadExamples } from './examples.js';
import { switchTo } from './session.js';
import { sendReport } from './social.js';
import { linkActive } from './connect.js';
import { today } from './monitor.js';

export const DEMO_PASSWORD = 'demo1234';
const TEAM = 'DEMO26';
const daysAgo = (n) => new Date(Date.parse(today()) - n * 864e5).toISOString().slice(0, 10);
const hoursAgo = (h) => new Date(Date.now() - h * 36e5).toISOString();
const ex = { example: true };

async function hash(email) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('motionplus-user:' + email + ':' + DEMO_PASSWORD));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const RESULTS = {
  'Kavya Nair': [
    [35, { calf: [22, 25], lunge: [9, 11.5], bridge: [24, 26], hop: [150, 158], reach: [62, 64], sideplank: [55, 58], run12: 2600, broad: 205, sprint20: 3.32, squeeze: 0 }],
    [17, { calf: [21, 26], lunge: [8.8, 11.6], hop: [151, 165], run12: 2660, broad: 208, sprint20: 3.3 }],
    [3, { calf: [19, 27], lunge: [8.5, 11.6], bridge: [22, 27], hop: [152, 170], reach: [63, 65], sideplank: [57, 59], run12: 2720, broad: 212, sprint20: 3.28, squeeze: 0 }],
  ],
  'Rohan Mehta': [[10, { calf: [28, 29], lunge: [12, 12.5], hop: [176, 181], bridge: [27, 28], run12: 2900, sprint20: 3.15 }]],
  'Aarav Singh': [[6, { calf: [26, 27], reach: [70, 64], sideplank: [62, 64], broad: 248, sprint20: 3.22 }]],
};

const PROS = [
  { id: 'U-DEMO-COACH', role: 'physio', name: 'Anita Rao', email: 'physio@demo.motionplus', speciality: 'Knee and ankle injuries', place: 'Kochi', bio: 'Sports physio for 9 years. I help athletes come back stronger after injury and stop the next one before it starts.' },
  { id: 'U-DEMO-COACH2', role: 'coach', name: 'Vikram Das', email: 'coach@demo.motionplus', speciality: 'Sprints and jumps', place: 'Thrissur', bio: 'Former 200 m state champion. Village tracks, big dreams. Speed is a skill: we train it every week.' },
  { id: 'U-DEMO-COACH3', role: 'trainer', name: 'Meera Pillai', email: 'trainer@demo.motionplus', speciality: 'Strength with basic equipment', place: 'Kozhikode', bio: 'Strength and conditioning with a wall, a step and a towel. No gym needed.' },
];

async function addPost(id, pro, hrs, rest) {
  await store.saveRecord('posts', Object.assign({ id, authorId: pro.id, authorName: pro.name, authorRole: pro.role, teamCode: TEAM, body: '', exercises: [], panels: [], slides: [], theme: 'violet', file: null, fileName: '', fileType: '', createdAt: hoursAgo(hrs) }, rest, ex));
}

async function addMessages(a, b, list) {
  const tid = 'T-' + [a, b].sort().join('|');
  for (const [i, [from, text, hrs, attach]] of list.entries()) {
    await store.saveRecord('messages', Object.assign({ id: 'M-DEMO-' + tid + i, threadId: tid, fromId: from, toId: from === a ? b : a, text, attach: attach || null, read: true, createdAt: hoursAgo(hrs) }, ex));
  }
}

export async function loadDemo() {
  let made = store.getState().athletes.filter((a) => a.example);
  if (!made.length) made = await loadExamples();
  const S = () => store.getState();
  const uid = (name) => 'U-DEMO-' + made.find((a) => a.name === name).id;
  if (!S().users.some((u) => u.id === 'U-DEMO-COACH2')) {
    for (const p of PROS) await store.saveRecord('users', Object.assign({}, S().users.find((u) => u.id === p.id) || {}, p, { passHash: await hash(p.email), teamCode: p.id === 'U-DEMO-COACH' ? TEAM : p.id.slice(-6) }, ex));
    for (const a of made) {
      if (!S().users.some((u) => u.id === 'U-DEMO-' + a.id)) {
        const email = a.name.split(' ')[0].toLowerCase() + '@demo.motionplus';
        await store.saveRecord('users', Object.assign({ id: 'U-DEMO-' + a.id, role: 'athlete', name: a.name, email, passHash: await hash(email), athleteId: a.id, teamCode: TEAM }, ex));
      }
      for (const [ago, set] of RESULTS[a.name] || []) {
        for (const [test, v] of Object.entries(set)) {
          const vals = Array.isArray(v) ? { left: v[0], right: v[1] } : { value: v };
          await store.saveRecord('results', Object.assign({ id: 'TR-DEMO-' + a.id + test + ago, athleteId: a.id, test, date: daysAgo(ago), version: 'tests_v1' }, vals, ex));
        }
      }
    }
    const [anita, vikram, meera] = PROS;
    const kavya = uid('Kavya Nair'), rohan = uid('Rohan Mehta'), aarav = uid('Aarav Singh');

    // Who works with whom: Kavya has a physio and a coach who approved each other.
    await linkActive(kavya, anita.id, Object.assign({ createdAt: hoursAgo(400) }, ex));
    await linkActive(kavya, vikram.id, Object.assign({ createdAt: hoursAgo(300) }, ex));
    await linkActive(rohan, anita.id, Object.assign({ from: 'team' }, ex));
    await store.saveRecord('links', Object.assign({ id: 'L-' + aarav + '|' + meera.id, kind: 'athlete', athleteUserId: aarav, proId: meera.id, status: 'pending', createdAt: hoursAgo(20) }, ex));
    await store.saveRecord('links', Object.assign({ id: 'L-' + aarav + '|' + anita.id, kind: 'athlete', athleteUserId: aarav, proId: anita.id, status: 'pending', createdAt: hoursAgo(3) }, ex));
    for (const p of S().links.filter((l) => l.kind === 'pair' && l.athleteUserId === kavya)) await store.saveRecord('links', Object.assign({}, p, { approved: p.pros.slice() }, ex));

    // Posts: a comic story, slides, insights and a training session.
    await addPost('P-DEMO-1', anita, 30, { type: 'insight', theme: 'violet', title: 'Why we test one leg at a time', body: 'Most running injuries start on one side. Your two legs can look the same and still be far apart in strength.\n\nThe Mirror shows that gap. Close it before the season and you run faster and get hurt less.' });
    await addPost('P-DEMO-2', anita, 5, { type: 'training', title: 'Tuesday: calf and ankle circuit', body: 'Three rounds, 1 minute rest between rounds. Slow and controlled.', exercises: ['calf-raise', 'bent-calf', 'ankle-wall', 'hop-stick'] });
    await addPost('P-DEMO-3', vikram, 2, { type: 'story', theme: 'sunset', title: 'The day Ravi stopped skipping warm-ups', body: 'Ten minutes of warm-up is the fastest thing you will do all day.', panels: [
      { who: 'narrator', scene: 'clock', text: 'Monday, 6 am. Ravi is late again.' },
      { who: 'athlete', scene: 'run', text: 'No time for warm-up, coach. Straight to sprints!' },
      { who: 'narrator', scene: 'pain', text: 'Rep two. A sharp pull in the hamstring.' },
      { who: 'coach', scene: 'think', text: 'Two weeks out. Ten minutes would have saved you.' },
      { who: 'athlete', scene: 'win', text: 'Now I warm up first. New best: 11.9 seconds!' },
    ] });
    await addPost('P-DEMO-4', anita, 12, { type: 'slides', theme: 'ocean', title: '5 signs your calf needs work', slides: [
      { title: '5 signs your calf needs work', text: 'Swipe. Most athletes miss at least one.' },
      { title: '1. Fewer than 25 raises', text: 'Do single-leg calf raises on a step. Under 25 on one side is below normal.' },
      { title: '2. One side lags', text: 'If one leg does a lot fewer raises, the Mirror shows it in red.' },
      { title: '3. Tight after spikes', text: 'Tightness that lasts into the next day is a warning.' },
      { title: '4. Ankle does not bend', text: 'Knee-to-wall under 9 cm often goes with a weak calf.' },
      { title: '5. What to do', text: 'Calf raises on a step, 3 × 15, every day. Retest in 4 weeks.' },
    ] });
    await addPost('P-DEMO-5', meera, 8, { type: 'insight', theme: 'lime', title: 'Sleep is your best free training tool', body: 'Eight hours of sleep does more for your speed than any supplement.\n\nNo phone in bed. Same time every night. Your legs grow while you sleep.' });
    await addPost('P-DEMO-6', meera, 26, { type: 'training', title: 'No-gym strength: 20 minutes', body: 'A wall, a step and a towel. Twice a week.', exercises: ['wall-sit', 'split-squat', 'single-bridge', 'band-row', 'side-plank'] });
    await addPost('P-DEMO-7', vikram, 48, { type: 'insight', theme: 'ink', title: 'Fast starts win short races', body: 'In a 100 m, the first 20 m decide most races at district level.\n\nTest your 20 m sprint every month and watch the line on your Progress page go down.' });

    // Reports and a programme Kavya is following.
    switchTo(rohan);
    await sendReport('Knee feels fine after the match.');
    switchTo(kavya);
    const rep = await sendReport('Left calf feels tight after spikes.');
    const plan = await store.saveRecord('plans', Object.assign({ id: 'PL-DEMO-KAVYA', reportId: rep.id, athleteId: made.find((a) => a.name === 'Kavya Nair').id, coachId: anita.id, coachName: anita.name, coachRole: anita.role, text: 'Calf raises on your left leg every session, slow on the way down. Ankle stretch before each run. No spikes until we retest.', exercises: ['calf-raise', 'bent-calf', 'ankle-wall'], weeks: 4, perWeek: 3, createdAt: daysAgo(9) + 'T08:00:00.000Z' }, ex));
    await store.saveRecord('reports', Object.assign({}, rep, { status: 'answered' }));
    for (const d of [8, 6, 4, 1]) await store.saveRecord('progress', Object.assign({ id: 'PG-' + plan.id + '|' + daysAgo(d), planId: plan.id, athleteId: plan.athleteId, date: daysAgo(d) }, ex));

    // Chats: Kavya with her physio and coach, and the physio and coach about Kavya.
    await addMessages(kavya, anita.id, [
      [kavya, 'Hi Anita, should I still do calf raises on race week?', 30],
      [anita.id, 'Yes, but half the sets and no hops. Keep the ankle stretch every day.', 29],
      [kavya, 'Okay! Left side did 19 today.', 4],
      [anita.id, 'Good. Aim for 22 by next week. Try this one too:', 3, { type: 'exercise', key: 'bent-calf', dose: '3 × 15 each leg' }],
    ]);
    await addMessages(kavya, vikram.id, [
      [vikram.id, 'Great 20 m time this week, 3.28. Keep the starts sharp.', 50],
      [kavya, 'Thank you coach! Anita says no spikes for now.', 48],
    ]);
    await addMessages(anita.id, vikram.id, [
      [anita.id, 'Vikram, Kavya left calf is 30% behind. No spikes for 2 weeks please.', 47],
      [vikram.id, 'Got it. I will switch her to flat starts and hill walks until you retest.', 46],
    ]);
    await store.saveRecord('reactions', Object.assign({ id: 'P-DEMO-2|' + kavya + '|star', postId: 'P-DEMO-2', userId: kavya, kind: 'star' }, ex));
    for (const [post, who, kind] of [['P-DEMO-3', rohan, 'fire'], ['P-DEMO-3', aarav, 'clap'], ['P-DEMO-4', rohan, 'star'], ['P-DEMO-5', aarav, 'strong'], ['P-DEMO-3', kavya, 'fire']]) {
      await store.saveRecord('reactions', Object.assign({ id: post + '|' + who + '|' + kind, postId: post, userId: who, kind }, ex));
    }
  }
  switchTo(uid('Kavya Nair'));
}
