// Basic exercise library: no machines, only things anyone can find or afford.
// area matches the free tests and the Mirror rows. dose is a starting point a coach can change.
export const AREAS = { ankle: 'Ankle and foot', calf: 'Calf', knee: 'Knee', hamstring: 'Hamstring', groin: 'Hip and groin', core: 'Core', balance: 'Balance', upper: 'Upper body', stamina: 'Stamina', speed: 'Speed and power' };

export const EXERCISES = [
  { key: 'ankle-wall', area: 'ankle', name: 'Ankle stretch, knee to wall', equipment: 'A wall', dose: '2 × 10 each side', steps: ['Foot a hand-width from the wall.', 'Push the knee to the wall, heel down.', 'Hold 2 seconds, back, repeat.'] },
  { key: 'towel-curl', area: 'ankle', name: 'Towel toe curls', equipment: 'A towel', dose: '3 × 30 s', steps: ['Sit with a towel flat under your foot.', 'Pull the towel towards you with your toes.', 'Keep the heel on the ground.'] },
  { key: 'calf-raise', area: 'calf', name: 'Calf raises on a step', equipment: 'A step', dose: '3 × 15 each leg', steps: ['Balls of the foot on the edge of a step.', 'Rise high, then lower slowly below the step.', 'Three seconds down.'] },
  { key: 'bent-calf', area: 'calf', name: 'Bent-knee calf raises', equipment: 'A wall', dose: '3 × 15 each leg', steps: ['Stand on one leg, knee slightly bent.', 'Rise onto the toes keeping the bend.', 'Lower slowly.'] },
  { key: 'pogo', area: 'calf', name: 'Pogo hops', equipment: 'Nothing', dose: '3 × 20', steps: ['Small quick hops on the balls of the feet.', 'Knees almost straight, stay bouncy.', 'Land quietly.'] },
  { key: 'wall-sit', area: 'knee', name: 'Wall sit', equipment: 'A wall', dose: '5 × 30 s', steps: ['Back flat on the wall.', 'Slide down until knees are at a right angle.', 'Hold. Knees over toes.'] },
  { key: 'step-down', area: 'knee', name: 'Slow step-downs', equipment: 'A step', dose: '3 × 10 each leg', steps: ['Stand on a step on one leg.', 'Lower the other heel to touch the floor, slowly.', 'Knee stays over the middle toe.'] },
  { key: 'split-squat', area: 'knee', name: 'Split squats', equipment: 'Nothing', dose: '3 × 10 each leg', steps: ['One foot forward, one back.', 'Drop the back knee towards the floor.', 'Push up through the front heel.'] },
  { key: 'bridge', area: 'hamstring', name: 'Glute bridges', equipment: 'Nothing', dose: '3 × 12', steps: ['Lie on your back, knees bent.', 'Lift your hips until in a line with knees and shoulders.', 'Lower slowly.'] },
  { key: 'single-bridge', area: 'hamstring', name: 'Single-leg bridge on a bench', equipment: 'A bench', dose: '3 × 8 each leg', steps: ['One heel on a bench, other leg up.', 'Push through the heel to lift your hips.', 'Lower with control.'] },
  { key: 'nordic', area: 'hamstring', name: 'Nordic hamstring lowers', equipment: 'A partner to hold your ankles', dose: '2 × 5, twice a week', steps: ['Kneel, partner holds your ankles.', 'Lean forward as slowly as you can, body straight.', 'Catch yourself with your hands, push back up.'] },
  { key: 'side-leg', area: 'groin', name: 'Side-lying leg raises', equipment: 'Nothing', dose: '3 × 15 each side', steps: ['Lie on your side, bottom knee bent.', 'Lift the top leg, toes forward.', 'Lower slowly.'] },
  { key: 'copenhagen', area: 'groin', name: 'Copenhagen side plank, short version', equipment: 'A bench or partner', dose: '3 × 20 s each side', steps: ['Side plank with the top knee resting on a bench.', 'Lift your hips into a straight line.', 'Hold. Start with the knee, not the foot.'] },
  { key: 'bird-dog', area: 'core', name: 'Bird dog', equipment: 'Nothing', dose: '3 × 10 each side', steps: ['On hands and knees.', 'Reach one arm forward and the opposite leg back.', 'Keep your back still. Switch.'] },
  { key: 'side-plank', area: 'core', name: 'Side plank', equipment: 'Nothing', dose: '3 × 30 s each side', steps: ['Elbow under shoulder, feet stacked.', 'Lift your hips into a straight line.', 'Hold without sagging.'] },
  { key: 'dead-bug', area: 'core', name: 'Dead bug', equipment: 'Nothing', dose: '3 × 10', steps: ['On your back, arms up, knees bent at right angles.', 'Lower one arm and the opposite leg slowly.', 'Lower back stays on the floor.'] },
  { key: 'one-leg-stand', area: 'balance', name: 'One-leg stand, eyes open then closed', equipment: 'Nothing', dose: '3 × 30 s each leg', steps: ['Stand on one leg near a wall.', 'Hold 30 seconds with eyes open.', 'Then try with eyes closed.'] },
  { key: 'star-reach', area: 'balance', name: 'Star reach', equipment: 'Tape or chalk lines', dose: '3 × 8 each leg', steps: ['Stand on one leg in the middle of the star.', 'Reach the other foot forward, side and back.', 'Tap lightly, return, stay balanced.'] },
  { key: 'hop-stick', area: 'balance', name: 'Hop and hold', equipment: 'Nothing', dose: '3 × 8 each leg', steps: ['Hop forward on one leg.', 'Land softly, knee over toes.', 'Hold still for 2 seconds.'] },
  { key: 'push-up', area: 'upper', name: 'Push-ups', equipment: 'Nothing', dose: '3 × 10', steps: ['Hands under shoulders, body straight.', 'Lower the chest to a fist above the floor.', 'Push back up.'] },
  { key: 'band-row', area: 'upper', name: 'Towel or band rows', equipment: 'A towel or band and a post', dose: '3 × 15', steps: ['Loop around a post and hold both ends.', 'Lean back, arms straight.', 'Pull your chest to your hands.'] },
  { key: 'easy-run', area: 'stamina', name: 'Easy run', equipment: 'Nothing', dose: '30 to 45 min', steps: ['Run at a pace where you can still talk.', 'Keep it relaxed the whole way.', 'Walk breaks are fine.'] },
  { key: 'intervals', area: 'stamina', name: 'Hard and easy intervals', equipment: 'A phone stopwatch', dose: '4 × 4 min hard, 3 min easy', steps: ['Warm up 10 minutes.', 'Run 4 minutes hard, 3 minutes easy jog.', 'Repeat 4 times, then cool down.'] },
  { key: 'a-skips', area: 'speed', name: 'A-skips', equipment: 'Nothing', dose: '3 × 20 m', steps: ['Skip, driving one knee high.', 'Land on the ball of the foot under your hips.', 'Arms swing with the legs.'] },
  { key: 'squat-jump', area: 'speed', name: 'Squat jumps', equipment: 'Nothing', dose: '3 × 6', steps: ['Squat down, arms back.', 'Jump as high as you can.', 'Land softly and reset.'] },
  { key: 'accel', area: 'speed', name: 'Short sprints', equipment: 'Nothing', dose: '6 × 20 m, full rest', steps: ['Start still, one foot forward.', 'Sprint 20 m flat out.', 'Walk back and rest fully.'] },
];

export const byKey = (k) => EXERCISES.find((e) => e.key === k) || null;
// Test area to library areas, for suggesting exercises next to a Mirror row.
export const forArea = (area) => EXERCISES.filter((e) => e.area === area);
