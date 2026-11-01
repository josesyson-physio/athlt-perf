// Dr. Jose: an automated coach, not a real person. 50 posts are built into the app and show in
// every feed: animated exercise videos, memes, exercise charts, Move Better lessons and insights.
// A different post leads the feed each day (dailyPosts), ready for a real daily post later.
// Loaded only when the feed opens, so it never slows the first screen.

export const DRJOSE = { id: 'drjose', name: 'Dr. Jose', line: 'Automated coach · Sportgram' };
const START = '2026-11-01';

// Exercise videos are drawn live: a stick figure moves between two key poses (see FIG below).
// type 'video' + anim; ex links to the exercise library (or 'move' for Move Better).
// type 'meme' + fmt: tb (top and bottom text), ex (expectation and reality), vs (no and yes), pov.
// type 'chart' + kind: circuit (rows of exercises), week (a 7-day plan), ladder (4-week build-up).
// Move Better posts carry series: 'move' and link to the Move Better path.
export const POSTS = [
  { type: 'video', anim: 'squat-jump', ex: 'squat-jump', theme: 'violet', title: 'Jump high, land soft', body: 'Squat, swing your arms back, then explode up. Land quietly, like a cat. 3 × 6 with full rest. Quality beats count.' },
  { type: 'meme', fmt: 'tb', emoji: '😅', theme: 'sunset', title: 'Light session, they said', top: 'Coach: just a light session today', bottom: 'Also coach: 4 × 4 minutes hard' },
  { type: 'chart', kind: 'circuit', theme: 'ocean', title: '10-minute ankle and calf armour', rows: [['ankle-wall', '2 × 10 each side'], ['towel-curl', '3 × 30 s'], ['calf-raise', '3 × 15 each leg'], ['pogo', '3 × 20']], note: 'Three times a week. Strong calves take load off your shins and Achilles.' },
  { type: 'slides', series: 'move', theme: 'violet', title: 'Your body is one chain', link: ['#/mirror', 'Open my Mirror'], slides: [
    { title: 'Power travels', text: 'Running force starts at your foot and travels through ankle, knee, hip and trunk to your arms.' },
    { title: 'One weak link', text: 'If one link is weak or stiff, the others work harder. That is where niggles start.' },
    { title: 'Find it', text: 'The free tests compare your left and right side, so you can see the weak link.' },
    { title: 'Fix it', text: 'Train the weak side first. Retest in two weeks.' }] },
  { type: 'insight', theme: 'ink', title: 'Sleep is training', body: 'Muscles repair and new skills lock in while you sleep. Young athletes who sleep less than 8 hours get hurt more often. Aim for 8 to 10 hours, with the phone away 30 minutes before bed.' },
  { type: 'video', anim: 'calf-raise', ex: 'calf-raise', theme: 'ocean', title: 'Calf raises: slow on the way down', body: 'Rise high, then take three seconds to lower. The slow part builds the spring in your Achilles.' },
  { type: 'meme', fmt: 'ex', theme: 'lime', title: 'Back after a break', a: ['🐆', 'Sprinting like a cheetah on day one back'], b: ['🐢', 'The first 20 metres after a month off'] },
  { type: 'video', anim: 'bridge', ex: 'bridge', theme: 'sunset', title: 'Glute bridges switch on your engine', body: 'Your glutes are the biggest muscles you run with. Squeeze, lift your hips into a straight line, lower slowly. 3 × 12.' },
  { type: 'chart', kind: 'week', theme: 'violet', title: 'A balanced training week', days: [['Mon', 'Easy run', 1], ['Tue', 'Speed', 3], ['Wed', 'Strength', 2], ['Thu', 'Easy + Move Better', 1], ['Fri', 'Intervals', 3], ['Sat', 'Strength', 2], ['Sun', 'Rest', 0]], note: 'Hard days are never back to back. Rest is part of the plan.' },
  { type: 'story', theme: 'sunset', title: 'The skipped warm-up', panels: [
    { who: 'athlete', scene: 'run', text: 'No time to warm up, coach. Let\'s go!' },
    { who: 'coach', scene: 'clock', text: 'Ten minutes now saves ten weeks later.' },
    { who: 'narrator', scene: 'think', text: 'Cold muscles stretch less and tear more easily.' },
    { who: 'athlete', scene: 'win', text: 'Fine. Warm-up first.' }] },
  { type: 'video', anim: 'nordic', ex: 'nordic', theme: 'ink', title: 'Nordic lowers: hamstring armour', body: 'Studies of thousands of players show Nordic lowers cut hamstring injuries by about half. Start with 2 × 5, twice a week. Go slow. You will be sore at first.' },
  { type: 'meme', fmt: 'pov', emoji: '🧟', theme: 'ink', title: 'The day after', text: 'POV: you did Nordics yesterday and now there are stairs' },
  { type: 'slides', series: 'move', theme: 'ocean', title: 'Breathe like a sprinter', link: ['#/move', 'Start Move Better'], slides: [
    { title: 'Nose first', text: 'Breathing through your nose slows you down and fills the lower ribs.' },
    { title: '4 in, 6 out', text: 'A long breath out calms your heart rate between efforts.' },
    { title: 'Before a race', text: 'Three slow breaths settle nerves without making you sleepy.' },
    { title: 'Try it', text: 'Move Better stage 2 has a breathing pacer.' }] },
  { type: 'video', anim: 'breathe', ex: 'move', series: 'move', theme: 'ocean', title: 'Breathe with me: 4 in, 6 out', body: 'In through the nose for 4, out slowly for 6. Five rounds after training, or before you sleep.' },
  { type: 'chart', kind: 'ladder', theme: 'lime', title: 'Push-ups: a four-week ladder', unit: 'reps a session', bars: [['Week 1', '3 × 6', 18], ['Week 2', '3 × 8', 24], ['Week 3', '3 × 10', 30], ['Week 4', '3 × 12', 36]], note: 'Add a little each week. If your form breaks, stay on that week.' },
  { type: 'meme', fmt: 'vs', theme: 'violet', title: 'Smart time saving', no: ['🙅', 'Saving 10 minutes by skipping the warm-up'], yes: ['🙌', 'Saving 3 weeks by not pulling a hamstring'] },
  { type: 'video', anim: 'split-squat', ex: 'split-squat', theme: 'lime', title: 'Split squats for single-leg strength', body: 'Running is one leg at a time, so train one leg at a time. Drop the back knee, push up through the front heel. 3 × 10 each leg.' },
  { type: 'insight', theme: 'sunset', title: 'The pain rule', body: 'Hard training can feel tough, but sharp pain is a stop sign. If pain is 4 out of 10 or more, or the same spot hurts two days running, rest it and show a physio. Your daily pulse watches this for you.' },
  { type: 'video', anim: 'push-up', ex: 'push-up', theme: 'violet', title: 'Push-ups, done right', body: 'Body straight from head to heels. Chest to a fist above the floor, then push away. Your arms drive your legs when you sprint.' },
  { type: 'meme', fmt: 'tb', emoji: '😴', theme: 'ocean', title: 'Rest day', top: 'Rest day', bottom: 'My muscles: finally, time to rebuild' },
  { type: 'story', series: 'move', theme: 'violet', title: 'Stand tall', link: ['#/move', 'Start Move Better'], panels: [
    { who: 'coach', scene: 'think', text: 'Stand side-on to a mirror. What do you see?' },
    { who: 'athlete', scene: 'think', text: 'Head forward. Shoulders rounded.' },
    { who: 'coach', scene: 'strong', text: 'Wall angels and chin tucks, 5 minutes a day.' },
    { who: 'narrator', scene: 'win', text: 'A stacked posture lets your ribs move and your arms swing free.' }] },
  { type: 'chart', kind: 'circuit', theme: 'sunset', title: 'Core in 8 minutes', rows: [['bird-dog', '3 × 10 each side'], ['dead-bug', '3 × 10'], ['side-plank', '3 × 30 s each side']], note: 'A strong core keeps your hips steady when you land on one leg.' },
  { type: 'video', anim: 'bird-dog', ex: 'bird-dog', theme: 'sunset', title: 'Bird dog: still back, long reach', body: 'Reach one arm forward and the opposite leg back. Your back stays still, like a table with a cup of water on it.' },
  { type: 'meme', fmt: 'ex', theme: 'sunset', title: 'What core really means', a: ['💪', 'A six-pack from 1,000 crunches'], b: ['🧘', 'Staying rock steady while your arms and legs move'] },
  { type: 'video', anim: 'a-skips', ex: 'a-skips', theme: 'lime', title: 'A-skips: drive the knee', body: 'Knee up, foot lands under your hips, arms swing with the legs. This is sprint form in slow motion. 3 × 20 m.' },
  { type: 'insight', theme: 'violet', title: 'Left vs right', body: 'Most athletes have a stronger side. A small gap is normal. A big gap is a weak spot that takes extra load. Do the free tests, train the weaker side first, and retest.', link: ['#/mirror', 'Open my Mirror'] },
  { type: 'slides', series: 'move', theme: 'sunset', title: 'Turn free', link: ['#/move', 'Start Move Better'], slides: [
    { title: 'Running is a twist', text: 'As one leg swings forward, the opposite arm swings to balance it.' },
    { title: 'Stiff upper back?', text: 'If your spine can\'t turn, your arms cross your body and waste energy.' },
    { title: 'Daily drill', text: 'Open books and thread the needle, 2 × 8 each side.' },
    { title: 'Check it', text: 'Move Better stage 4 tests your turn both ways.' }] },
  { type: 'video', anim: 'dead-bug', ex: 'dead-bug', theme: 'ink', title: 'Dead bug: slow is strong', body: 'Lower one arm and the opposite leg slowly. Your lower back stays on the floor the whole time. 3 × 10.' },
  { type: 'meme', fmt: 'tb', emoji: '🔥', theme: 'sunset', title: 'Calf check', top: 'Nobody:', bottom: 'My calves the day after pogo hops' },
  { type: 'chart', kind: 'week', theme: 'ink', title: 'Race week', days: [['Mon', 'Recovery', 1], ['Tue', 'Speed', 2], ['Wed', 'Strength', 2], ['Thu', 'Light skills', 1], ['Fri', 'Rest', 0], ['Sat', 'Race', 3], ['Sun', 'Easy', 1]], note: 'Keep the two days before a race light. Fresh legs win races.' },
  { type: 'video', anim: 'pogo', ex: 'pogo', theme: 'violet', title: 'Pogo hops: hot coals', body: 'Small quick hops on the balls of your feet. Knees almost straight. Touch the ground like it is hot. 3 × 20.' },
  { type: 'slides', series: 'move', theme: 'lime', title: 'Spring: be a bouncy ball', link: ['#/move', 'Start Move Better'], slides: [
    { title: 'Tendons store energy', text: 'Your Achilles stretches as you land and snaps back like a spring.' },
    { title: 'Short contact', text: 'Fast athletes spend less time on the ground.' },
    { title: 'Train it', text: 'Pogo hops, skipping, and hop and hold.' },
    { title: 'Measure it', text: 'Move Better stage 5 uses your phone to score your spring.' }] },
  { type: 'insight', theme: 'ocean', title: 'Growth spurt? Go easy on jumps', body: 'In a fast growth spurt, bones grow before muscles catch up, and knees and heels can ache. Cut down jumps and sprints for a few weeks and keep up strength and balance work.', link: ['#/growth', 'Check my growth'] },
  { type: 'video', anim: 'hop-stick', ex: 'hop-stick', theme: 'ocean', title: 'Hop and hold', body: 'Hop forward on one leg, land soft with the knee over your toes, and freeze for 2 seconds. It teaches safe landings.' },
  { type: 'meme', fmt: 'vs', theme: 'lime', title: 'How PBs happen', no: ['🥵', 'Training flat out every single day'], yes: ['🏅', 'Hard, easy, hard, rest. Then a PB'] },
  { type: 'chart', kind: 'ladder', theme: 'ink', title: 'Nordic lowers: start slow', unit: 'reps a session, twice a week', bars: [['Week 1', '2 × 4', 8], ['Week 2', '2 × 5', 10], ['Week 3', '3 × 5', 15], ['Week 4', '3 × 6', 18]], note: 'Soreness after the first sessions is normal. Sharp pain is not: stop and check.' },
  { type: 'video', anim: 'wall-angel', ex: 'move', series: 'move', theme: 'violet', title: 'Wall angels for a tall back', body: 'Back, head and bottom on the wall. Slide your arms up and down, staying close to the wall. 2 × 10.' },
  { type: 'story', theme: 'ocean', title: 'The slow start', panels: [
    { who: 'athlete', scene: 'clock', text: 'I\'m always last out of the start.' },
    { who: 'coach', scene: 'run', text: 'Push the ground back, not up. Stay low for 5 steps.' },
    { who: 'narrator', scene: 'fire', text: 'Lean forward, drive the knees, punch the arms.' },
    { who: 'athlete', scene: 'win', text: 'Ten short sprints later, first out!' }] },
  { type: 'meme', fmt: 'vs', theme: 'ocean', title: 'Warm-up upgrade', no: ['🧍', 'Long, still stretches right before a sprint'], yes: ['🏃', 'Skips, swings and strides first'] },
  { type: 'video', anim: 'step-down', ex: 'step-down', theme: 'sunset', title: 'Slow step-downs for strong knees', body: 'Stand on a step on one leg and lower the other heel to the floor, slowly. Keep the knee over your middle toe. 3 × 10 each leg.' },
  { type: 'chart', kind: 'circuit', theme: 'violet', title: 'Hip and groin shield', rows: [['side-leg', '3 × 15 each side'], ['copenhagen', '3 × 20 s each side'], ['bridge', '3 × 12'], ['star-reach', '3 × 8 each leg']], note: 'Twice a week. Groin strains often come from weak inner thighs.' },
  { type: 'slides', series: 'move', theme: 'ink', title: 'Feet are your foundation', link: ['#/library', 'Open the library'], slides: [
    { title: 'Strong feet', text: 'Small foot muscles hold your arch up when you land.' },
    { title: 'Barefoot moments', text: 'Short spells barefoot on safe grass wake them up.' },
    { title: 'Daily drill', text: 'Towel toe curls and one-leg stands.' },
    { title: 'Up the chain', text: 'Steady feet help the ankle, knee and hip above them.' }] },
  { type: 'meme', fmt: 'tb', emoji: '😎', theme: 'lime', title: 'Retest day', top: 'Retest day', bottom: 'My weak side: not weak anymore' },
  { type: 'video', anim: 'accel', ex: 'accel', theme: 'ink', title: 'Short sprints, full rest', body: 'Start still, lean forward, sprint 20 m flat out. Walk back and rest fully. Speed is trained fresh. 6 × 20 m.' },
  { type: 'insight', theme: 'lime', title: 'Small and often', body: 'Ten minutes of drills every day beats one long session a week. Tendons and muscles adapt to what you do often. Same time, same place, every day.' },
  { type: 'meme', fmt: 'pov', emoji: '🫠', theme: 'violet', title: 'One more', text: 'POV: your coach says "one more rep" for the third time' },
  { type: 'chart', kind: 'circuit', theme: 'lime', title: 'Speed day drills', rows: [['a-skips', '3 × 20 m'], ['squat-jump', '3 × 6'], ['accel', '6 × 20 m, full rest']], note: 'Fresh legs only. Do these early in the session, after your warm-up.' },
  { type: 'story', series: 'move', theme: 'ink', title: 'The tense sprinter', link: ['#/move', 'Start Move Better'], panels: [
    { who: 'athlete', scene: 'fire', text: 'I try so hard and still feel slow.' },
    { who: 'coach', scene: 'think', text: 'Look at your face and shoulders. All tight.' },
    { who: 'narrator', scene: 'run', text: 'Tight muscles fight each other. Fast runners stay loose: soft jaw, loose hands.' },
    { who: 'coach', scene: 'clock', text: 'Run at nine tenths and relax. Then watch the clock.' }] },
  { type: 'meme', fmt: 'ex', theme: 'ink', title: 'The real formula', a: ['😤', 'More training = faster'], b: ['😴', 'Training + sleep + rest days = faster'] },
  { type: 'chart', kind: 'circuit', series: 'move', theme: 'ocean', title: 'Morning 10: wake your body', link: ['#/move', 'Start Move Better'], rows: [['', '1 min each foot', 'Foot roll on a bottle'], ['', '1 min', 'Breathing, 4 in and 6 out'], ['', '2 × 10', 'Wall angels'], ['open-book', '2 × 8 each side'], ['pogo', '2 × 20']], note: 'Ten minutes before school or work. Your body moves better all day.' },
].map((p, i) => Object.assign({ id: 'DJ-' + String(i + 1).padStart(2, '0'), auto: true, authorId: DRJOSE.id, authorName: DRJOSE.name, authorLine: DRJOSE.line }, p));

// One post a day leads the feed. Day 1 is post 1; after 50 days the cycle starts again.
// Dates count back one day per post, so the feed reads like a daily series.
export function dailyPosts(today) {
  const day = Math.max(0, Math.round((Date.parse(today) - Date.parse(START)) / 864e5));
  const n = POSTS.length, lead = day % n, base = Date.parse(today + 'T06:00:00');
  return Array.from({ length: n }, (_, k) => Object.assign({}, POSTS[(lead - k + n) % n], { createdAt: new Date(base - k * 864e5).toISOString() }));
}

// ---------- stick figure poses ----------
// A pose: hip h [x,y]; trunk angle t (degrees, 0 = upright, 90 = leaning flat forward);
// ankles f and hands w as [near, far]; knee and elbow bend side kb and eb; toe angle ft.
// Facing right in a 200 × 200 box, ground at y 180. Knees and elbows are solved each frame,
// so feet stay planted while the body moves.
const STAND = { h: [100, 101], t: 0, f: [[100, 176], [100, 176]], w: [[103, 100], [99, 100]], kb: [-1, -1], eb: [1, 1], ft: [15, 15] };
const P = (x) => Object.assign({}, STAND, x);
export const FIG = {
  'squat-jump': { ms: 1600, hold: 0.25, a: P({ h: [88, 132], t: 40, w: [[85, 120], [82, 118]], eb: [-1, -1] }), b: P({ h: [100, 82], t: -3, f: [[102, 156], [100, 157]], w: [[108, -12], [104, -13]], ft: [45, 45] }), shadow: true },
  'calf-raise': { ms: 2600, hold: 0.3, a: STAND, b: P({ h: [100, 93], f: [[100, 168], [100, 168]], w: [[103, 92], [99, 92]], ft: [50, 50] }), prop: 'step' },
  'split-squat': { ms: 2400, hold: 0.2, a: P({ h: [100, 103], f: [[118, 176], [72, 172]], w: [[104, 99], [100, 99]], ft: [15, 50] }), b: P({ h: [96, 138], f: [[118, 176], [62, 174]], w: [[100, 134], [96, 134]], ft: [15, 60] }) },
  bridge: { ms: 2400, hold: 0.3, a: P({ h: [112, 166], t: -90, f: [[134, 176], [134, 176]], w: [[112, 174], [110, 174]], ft: [5, 5] }), b: P({ h: [110, 138], t: -116.6, f: [[134, 176], [134, 176]], w: [[112, 174], [110, 174]], ft: [5, 5] }) },
  'push-up': { ms: 2000, hold: 0.15, a: P({ h: [113, 143], t: 70.7, f: [[42, 168], [42, 168]], w: [[153, 178], [151, 178]], ft: [70, 70] }), b: P({ h: [116, 165], t: 85.7, f: [[42, 168], [42, 168]], w: [[153, 178], [151, 178]], ft: [70, 70] }) },
  'bird-dog': { ms: 2600, hold: 0.35, a: P({ h: [80, 128], t: 90, f: [[42, 176], [42, 176]], w: [[128, 176], [126, 176]], ft: [-10, -10] }), b: P({ h: [80, 128], t: 90, f: [[42, 176], [8, 124]], w: [[176, 124], [126, 176]], ft: [-10, 0] }) },
  'dead-bug': { ms: 2800, hold: 0.25, a: P({ h: [112, 168], t: -90, f: [[150, 130], [150, 130]], w: [[66, 120], [64, 120]], ft: [-10, -10] }), b: P({ h: [112, 168], t: -90, f: [[150, 130], [186, 160]], w: [[16, 160], [64, 120]], ft: [-10, 0] }) },
  'a-skips': { ms: 900, hold: 0.1, a: P({ h: [100, 98], f: [[138, 136], [100, 173]], w: [[80, 92], [128, 62]], ft: [30, 40] }), b: P({ h: [100, 96], f: [[100, 173], [138, 136]], w: [[128, 62], [80, 92]], ft: [40, 30] }) },
  pogo: { ms: 600, hold: 0, a: P({ h: [100, 99], f: [[100, 170], [100, 170]], w: [[112, 92], [110, 92]], ft: [55, 55] }), b: P({ h: [100, 84], f: [[100, 158], [100, 158]], w: [[112, 77], [110, 77]], ft: [55, 55] }), shadow: true },
  nordic: { ms: 3600, hold: 0.2, a: P({ h: [90, 138], f: [[52, 176], [52, 176]], w: [[104, 110], [102, 110]], ft: [0, 0] }), b: P({ h: [121, 154], t: 55, f: [[52, 176], [52, 176]], w: [[178, 150], [176, 150]], ft: [0, 0] }), prop: 'anchor' },
  'hop-stick': { ms: 2200, hold: 0.4, a: P({ h: [104, 118], t: 25, f: [[110, 176], [80, 150]], w: [[150, 95], [60, 100]], ft: [15, 30] }), b: P({ h: [100, 92], t: 10, f: [[100, 160], [80, 140]], w: [[140, 70], [70, 80]], ft: [40, 30] }), shadow: true },
  // Seen from the front, so it is drawn from fixed points (see front()).
  'wall-angel': { ms: 3000, hold: 0.2, front: true, a: { e: [[60, 58], [140, 58]], w: [[60, 28], [140, 28]] }, b: { e: [[72, 24], [128, 24]], w: [[90, -6], [110, -6]] }, prop: 'wall' },
  'step-down': { ms: 3000, hold: 0.2, a: P({ h: [90, 76], f: [[90, 150], [116, 140]], w: [[110, 74], [108, 74]] }), b: P({ h: [84, 110], t: 20, f: [[90, 150], [120, 176]], w: [[136, 88], [134, 88]] }), prop: 'stepdown' },
  accel: { ms: 1300, hold: 0.15, a: P({ h: [92, 128], t: 50, f: [[110, 176], [70, 176]], w: [[70, 120], [140, 110]], ft: [30, 30] }), b: P({ h: [104, 112], t: 45, f: [[62, 170], [124, 140]], w: [[148, 92], [104, 110]], ft: [40, 20] }) },
};

const R = Math.PI / 180, LT = 48, LL = 38, LU = 26, LF = 24;
function joint(a, e, l1, l2, s) {
  let dx = e[0] - a[0], dy = e[1] - a[1], d = Math.hypot(dx, dy) || 1;
  const m = Math.min(d, l1 + l2 - 0.5);
  const k = (l1 * l1 - l2 * l2 + m * m) / (2 * m), h = Math.sqrt(Math.max(0, l1 * l1 - k * k));
  dx /= d; dy /= d;
  return [a[0] + dx * k - s * dy * h, a[1] + dy * k + s * dx * h];
}
const mix = (a, b, u) => (Array.isArray(a) ? a.map((x, i) => mix(x, b[i], u)) : a + (b - a) * u);

// Turns a pose into drawable points.
export function solve(p) {
  const t = p.t * R, hip = p.h;
  const neck = [hip[0] + LT * Math.sin(t), hip[1] - LT * Math.cos(t)];
  const head = [neck[0] + 15 * Math.sin(t), neck[1] - 15 * Math.cos(t)];
  const limb = (i) => {
    const ank = p.f[i], knee = joint(hip, ank, LL, LL, p.kb[i]);
    const ft = p.ft[i] * R, toe = [ank[0] + 12 * Math.cos(ft), ank[1] + 12 * Math.sin(ft)];
    const elb = joint(neck, p.w[i], LU, LF, p.eb[i]);
    return { knee, ank, toe, elb, hand: p.w[i] };
  };
  return { hip, neck, head, near: limb(0), far: limb(1) };
}

// Front view: straight legs and both arms moving together.
function front(p) {
  const pt = { head: [100, 38], neck: [100, 53], hip: [100, 101] };
  const sh = [[82, 58], [118, 58]], hp = [[90, 101], [110, 101]], kn = [[89, 138], [111, 138]], an = [[88, 176], [112, 176]], to = [[80, 179], [120, 179]];
  const seg = [[pt.neck, pt.hip], [sh[0], sh[1]], [hp[0], hp[1]]];
  for (const i of [0, 1]) seg.push([sh[i], p.e[i]], [p.e[i], p.w[i]], [hp[i], kn[i]], [kn[i], an[i]], [an[i], to[i]]);
  return { head: pt.head, hip: pt.hip, seg: seg.map((x) => [x[0], x[1], false]) };
}

export function frame(fig, ms) {
  const cyc = (ms % fig.ms) / fig.ms, hold = fig.hold || 0;
  // a → b → a with a short pause at each end; cosine easing.
  let u = cyc < 0.5 ? cyc * 2 : 2 - cyc * 2;
  u = Math.min(1, Math.max(0, (u - hold / 2) / (1 - hold)));
  u = 0.5 - 0.5 * Math.cos(u * Math.PI);
  const a = fig.a, b = fig.b;
  if (fig.front) return { pose: front({ e: mix(a.e, b.e, u), w: mix(a.w, b.w, u) }), u };
  return { pose: solve({ h: mix(a.h, b.h, u), t: mix(a.t, b.t, u), f: mix(a.f, b.f, u), w: mix(a.w, b.w, u), ft: mix(a.ft, b.ft, u), kb: a.kb, eb: a.eb }), u };
}

// Line segments to draw: [from, to, far?]. Far limbs are drawn first and fainter.
export function segments(s) {
  if (s.seg) return s.seg;
  const L = (l, far) => [[s.hip, l.knee, far], [l.knee, l.ank, far], [l.ank, l.toe, far], [s.neck, l.elb, far], [l.elb, l.hand, far]];
  return L(s.far, true).concat([[s.hip, s.neck, false]], L(s.near, false));
}
