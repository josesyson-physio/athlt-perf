// Private energy check: warning signs of low energy availability (REDs), from the IOC consensus
// statement (Mountjoy et al., Br J Sports Med 2023) and the LEAF-Q and LEAM-Q questionnaires.
// It is a screen, not a diagnosis, and it stays on the athlete's phone.
export const QUESTIONS = [
  { key: 'weight', text: 'Have you lost weight in the last 3 months without trying?' },
  { key: 'tired', text: 'Do you often feel tired or flat, even after rest days?' },
  { key: 'bone', text: 'Have you had a stress fracture or bone stress injury in the last year?', strong: true },
  { key: 'ill', text: 'Are you getting colds or other illnesses more often than usual?' },
  { key: 'drop', text: 'Has your performance dropped even though you are training well?' },
  { key: 'gut', text: 'Do you often have stomach cramps, bloating or an upset stomach?' },
  { key: 'periods', text: 'Have your periods stopped, or have you missed 3 or more in a row (not because of the pill)?', strong: true, only: 'female' },
  { key: 'late', text: 'Are you 16 or older and have not had your first period yet?', strong: true, only: 'female' },
  { key: 'drive', text: 'Have you had less interest in sex, or fewer morning erections, than usual?', only: 'male', adult: true },
];

export const questionsFor = (sex, age) => QUESTIONS.filter((q) => (!q.only || q.only === sex) && (!q.adult || Number(age) >= 18));

export function energyResult(answers, sex, age) {
  const qs = questionsFor(sex, age);
  if (qs.some((q) => typeof answers[q.key] !== 'boolean')) return null;
  const yes = qs.filter((q) => answers[q.key]);
  const strong = yes.some((q) => q.strong);
  const level = strong || yes.length >= 3 ? 'talk' : yes.length ? 'watch' : 'clear';
  const text = {
    talk: 'Some of your answers are warning signs that your body may not be getting enough energy for your training. Please talk to your physio or a doctor soon. This is a screen, not a diagnosis.',
    watch: 'One or two warning signs. Keep an eye on them and do this check again in a month. Talk to your physio if they stay.',
    clear: 'No warning signs today. Do this check again in a few months.',
  }[level];
  return { level, yes: yes.length, text };
}
