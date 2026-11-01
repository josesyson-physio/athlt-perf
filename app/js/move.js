// Move Better: a five-stage path to move freely and spring off the ground. Release, Breathe,
// Stand tall, Turn free, Spring. Each stage opens when the one before is clear: its short
// session done on 3 different days, plus its check (a free test) done once. Nothing to buy:
// a ball or a water bottle, a wall and a tape measure.
export const DAYS_TO_CLEAR = 3;

const SAFE = 'Firm pressure is fine. Sharp or burning pain is not, so ease off.';

export const MB_STAGES = [
  { key: 'release', name: 'Release', goal: 'Loosen tight spots before you train', check: null, minutes: 6,
    items: [
      { key: 'mb-foot', name: 'Foot roll', dose: '1 min each foot', equipment: 'A ball or water bottle', steps: ['Stand and put the ball or bottle under one foot.', 'Roll slowly from heel to toes. Pause on tender spots and breathe out.', SAFE] },
      { key: 'mb-calf', name: 'Calf roll', dose: '1 min each leg', equipment: 'A water bottle', steps: ['Sit with one calf on the bottle, hands behind you.', 'Lift your hips a little and roll from ankle to knee.', 'Turn the leg in and out to reach the sides.'] },
      { key: 'mb-thigh', name: 'Front thigh roll', dose: '1 min each leg', equipment: 'A water bottle', steps: ['Lie face down on your forearms, bottle under one thigh.', 'Roll slowly from above the knee to the hip.', SAFE] },
      { key: 'mb-glute', name: 'Hip and bottom', dose: '1 min each side', equipment: 'A ball', steps: ['Sit on the ball, cross that ankle over the other knee.', 'Lean into the crossed side and make small circles.', 'Breathe out on the tender spots.'] },
      { key: 'mb-back', name: 'Upper back on the wall', dose: '1 min', equipment: 'A ball and a wall', steps: ['Put the ball between the wall and your upper back, beside the spine, never on it.', 'Bend and straighten your knees to roll it up and down.', 'Swap sides halfway.'] },
    ] },
  { key: 'breathe', name: 'Breathe', goal: 'Calm, deep breathing through the nose', check: 'breath', minutes: 3, pacer: true,
    items: [] },
  { key: 'stand', name: 'Stand tall', goal: 'Line up head, ribs and hips', check: 'posture', minutes: 7,
    items: [
      { key: 'mb-chin', name: 'Chin tucks on the wall', dose: '2 × 10, hold 3 s', equipment: 'A wall', steps: ['Stand with your back to the wall.', 'Slide your head straight back to the wall, making a double chin. Do not tip the head up.', 'Hold 3 seconds and relax.'] },
      { key: 'mb-angel', name: 'Wall angels', dose: '2 × 10', equipment: 'A wall', steps: ['Back, head and bottom on the wall, arms up like a goal post.', 'Slide your arms up and down, keeping them close to the wall.', 'Go only as far as your back stays flat.'] },
      { key: 'mb-hip', name: 'Kneeling hip stretch', dose: '2 × 30 s each side', equipment: 'Something soft for the knee', steps: ['Kneel on one knee, the other foot in front.', 'Squeeze the bottom of the back leg and shift forward gently.', 'Feel the stretch at the front of the hip. Stay tall.'] },
      { key: 'mb-bridge', name: 'Glute bridges', dose: '2 × 12', equipment: 'Nothing', steps: ['Lie on your back, knees bent.', 'Squeeze your bottom and lift your hips into a straight line.', 'Lower slowly.'] },
      { key: 'mb-tall', name: 'Tall stand', dose: '3 × 30 s', equipment: 'A wall', steps: ['Heels, bottom, shoulder blades and head on the wall.', 'Breathe slowly through your nose.', 'Step away and keep the same tall shape.'] },
    ] },
  { key: 'turn', name: 'Turn free', goal: 'Turn your spine and hips both ways', check: 'rotation', minutes: 8,
    items: [
      { key: 'mb-book', name: 'Open books', dose: '2 × 8 each side', equipment: 'Nothing', steps: ['Lie on your side, knees bent and stacked, arms straight in front.', 'Open the top arm over to the other side, following your hand with your eyes.', 'Knees stay together. Breathe out as you open.'] },
      { key: 'mb-thread', name: 'Thread the needle', dose: '2 × 8 each side', equipment: 'Nothing', steps: ['On hands and knees.', 'Slide one arm under your body along the floor, shoulder down.', 'Then open the same arm up to the ceiling.'] },
      { key: 'mb-9090', name: '90-90 hip switches', dose: '2 × 8 each way', equipment: 'Nothing', steps: ['Sit with both knees bent at right angles, both to one side.', 'Lift the knees and swing them over to the other side.', 'Sit tall. Use your hands behind you at first.'] },
      { key: 'mb-reach', name: 'Lunge, twist and reach', dose: '2 × 5 each side', equipment: 'Nothing', steps: ['Step into a long lunge, hand inside the front foot.', 'Turn and reach the other arm to the sky.', 'Back to the start and switch sides.'] },
    ] },
  { key: 'spring', name: 'Spring', goal: 'Quick, bouncy contacts off the ground', check: 'spring', minutes: 8,
    items: [
      { key: 'mb-pogo', name: 'Pogo hops', dose: '3 × 20', equipment: 'Nothing', steps: ['Small quick hops on the balls of your feet.', 'Knees almost straight. Spend as little time on the ground as you can.', 'Land quietly. Stop if your shin or Achilles hurts.'] },
      { key: 'mb-skip', name: 'Skip in place', dose: '3 × 30 s', equipment: 'Nothing, or a rope', steps: ['Skip lightly on the spot, with or without a rope.', 'Stay tall and relaxed.', 'Swap to one foot for a few hops if it feels easy.'] },
      { key: 'mb-line', name: 'Line hops', dose: '3 × 20 s', equipment: 'A line on the ground', steps: ['Hop side to side over a line with both feet.', 'Quick and light. Then try one foot.', 'Rest fully between sets.'] },
      { key: 'mb-bound', name: 'Easy bounds', dose: '3 × 20 m', equipment: 'Open ground', steps: ['Run with long, springy strides, pushing off the ground.', 'Arms drive with the legs.', 'Walk back between rounds.'] },
    ] },
];
export const stageOf = (k) => MB_STAGES.find((s) => s.key === k) || null;

// Where the athlete is on the path. moves: [{ kind: 'move', stage, date }], results: test results.
export function moveStatus(moves, results) {
  let open = true;
  const stages = MB_STAGES.map((s) => {
    const dates = [...new Set((moves || []).filter((m) => m.kind === 'move' && m.stage === s.key).map((m) => m.date))].sort();
    const checks = s.check ? (results || []).filter((r) => r.test === s.check).map((r) => r.date).sort() : [];
    const checked = !s.check || checks.length > 0;
    const cleared = open && dates.length >= DAYS_TO_CLEAR && checked;
    // The day a stage was cleared: the later of its third session and its first check.
    const clearedOn = cleared ? [dates[DAYS_TO_CLEAR - 1], checks[0] || ''].sort().pop() : null;
    const state = cleared ? 'done' : open ? 'now' : 'locked';
    if (!cleared) open = false;
    return { key: s.key, name: s.name, days: dates.length, checked, cleared, clearedOn, state };
  });
  const index = stages.findIndex((s) => s.state === 'now');
  return { stages, index, done: index === -1, current: index === -1 ? null : stages[index] };
}

// Spring score from the phone's motion sensor. samples: [{ t: ms, a: total acceleration in m/s² }]
// while the athlete pogo hops holding the phone to the chest. In the air the phone is close to
// weightless, so a stretch under 0.35 g is a flight; the time between two flights is a ground
// contact. Hop height = g × flight² / 8. Score = height (m) / contact (s), the reactive strength index.
const G = 9.81;
const median = (v) => { const s = v.slice().sort((a, b) => a - b); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : NaN; };
export function springFromSamples(samples) {
  const flights = [];
  let start = null;
  (samples || []).forEach((p, i) => {
    const air = p.a < 0.35 * G;
    if (air && start === null) start = p.t;
    if ((!air || i === samples.length - 1) && start !== null) {
      const d = p.t - start;
      if (d >= 60 && d <= 600) flights.push({ from: start, to: p.t });
      start = null;
    }
  });
  const hops = [];
  for (let i = 1; i < flights.length; i++) {
    const contact = flights[i].from - flights[i - 1].to;
    if (contact >= 50 && contact <= 500) hops.push({ contact, flight: flights[i].to - flights[i].from });
  }
  const use = hops.length > 6 ? hops.slice(2) : hops; // the first hops are the athlete finding a rhythm
  if (use.length < 4) return null;
  const tc = median(use.map((h) => h.contact)) / 1000;
  const tf = median(use.map((h) => h.flight)) / 1000;
  const height = (G * tf * tf) / 8;
  return { score: Math.round((height / tc) * 100) / 100, contactMs: Math.round(tc * 1000), heightCm: Math.round(height * 1000) / 10, hops: use.length };
}
