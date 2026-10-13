// Turns a recorded assessment into a results snapshot using the deterministic engine.
// No value is ever guessed: anything missing is reported as missing instead.
const E = () => globalThis.MotionPlusEngine;
const M = () => globalThis.MotionPlusMetrics;

export const DOMAINS = [
  { id: 'cardio', name: 'Cardiovascular', detail: 'VO₂ max, heart rate, recovery' },
  { id: 'strength', name: 'Strength', detail: 'Handgrip trials' },
  { id: 'power', name: 'Power & speed', detail: 'Jump, sprint' },
  { id: 'mobility', name: 'Mobility', detail: 'Ankle lunge' },
  { id: 'balance', name: 'Balance', detail: 'Single-leg stance' },
];

export const ASSESSMENT_TYPES = [
  { id: 'full', name: 'Full assessment', domains: ['cardio', 'strength', 'power', 'mobility', 'balance'] },
  { id: 'cardio', name: 'Cardiovascular', domains: ['cardio'] },
  { id: 'strength_power', name: 'Strength & power', domains: ['strength', 'power'] },
  { id: 'mobility_balance', name: 'Mobility & balance', domains: ['mobility', 'balance'] },
  { id: 'rts', name: 'Return to sport', domains: ['strength', 'power', 'mobility', 'balance'] },
  { id: 'baseline', name: 'Baseline vitals & body', domains: [] },
];

const has = (v) => v !== null && v !== undefined && v !== '' && !(typeof v === 'number' && Number.isNaN(v));

export function screeningDecision(screening) {
  const s = screening || {};
  const flagged = (s.answers || []).some(Boolean);
  if (!s.consent) return { allowed: false, reason: 'Consent has not been recorded.' };
  if (flagged && !s.clinicianCleared) return { allowed: false, reason: 'Screening raised a flag and no clinician clearance is recorded.' };
  if (s.decision === 'defer' || s.decision === 'refer') return { allowed: false, reason: 'Assessor decision is ' + s.decision + '.' };
  if (s.decision !== 'proceed' && s.decision !== 'modify') return { allowed: false, reason: 'Assessor decision has not been recorded.' };
  return { allowed: true, reason: '' };
}

export function calculate(assessment, athlete) {
  const a = assessment;
  const v = a.vitals || {};
  const items = [];
  const missing = [];
  const domains = a.domains || [];
  const screen = screeningDecision(a.screening);
  const safety = M().vitalsFlags(v);
  const stop = safety.some((f) => f.level === 'stop');

  const push = (domain, key, name, r, method) => {
    if (r) items.push(Object.assign({ domain, key, name, method: method || '' }, r));
  };
  const measured = (domain, key, name, value, unit, method) => {
    if (has(value)) items.push({ domain, key, name, value: Number(value), unit, label: 'measured', method: method || '', formula: 'recorded', flags: [] });
  };

  // Vitals and body
  measured('vitals', 'rest_hr', 'Resting heart rate', v.restHr, 'bpm', v.restHrMethod);
  if (has(v.sbp) && has(v.dbp)) items.push({ domain: 'vitals', key: 'bp', name: 'Blood pressure', value: v.sbp + '/' + v.dbp, unit: 'mmHg', label: 'measured', method: v.bpArm ? v.bpArm + ' arm' : '', formula: 'recorded', flags: [] });
  push('vitals', 'map', 'Mean arterial pressure', M().meanArterialPressure(v.sbp, v.dbp));
  measured('vitals', 'rr', 'Respiratory rate', v.rr, '/min');
  measured('vitals', 'spo2', 'SpO₂', v.spo2, '%');
  measured('vitals', 'temp', 'Body temperature', v.tempC, '°C');
  const height = has(v.heightCm) ? v.heightCm : athlete && athlete.heightCm;
  const mass = has(v.massKg) ? v.massKg : athlete && athlete.massKg;
  measured('body', 'height', 'Height', v.heightCm, 'cm');
  measured('body', 'mass', 'Body mass', v.massKg, 'kg');
  push('body', 'bmi', 'BMI', M().bmi(v.massKg, v.heightCm));
  push('body', 'whtr', 'Waist-to-height ratio', M().waistToHeight(v.waistCm, v.heightCm));
  if (!has(v.restHr)) missing.push('Resting heart rate');
  if (!has(v.massKg)) missing.push('Body mass on the day');

  // Cardio
  let vo2 = null;
  if (domains.includes('cardio')) {
    const c = a.cardio || {};
    if (!c.protocolId) missing.push('Aerobic test protocol');
    else {
      const ath = {
        age: athlete && athlete.age != null ? Number(athlete.age) : null,
        sex: athlete && athlete.sex,
        mass_kg: has(mass) ? Number(mass) : null,
        height_cm: has(height) ? Number(height) : null,
      };
      vo2 = E().calculate(c.protocolId, {
        athlete: ath,
        inputs: c.inputs || {},
        completed: !!c.completed,
        screening: { decision: screen.allowed && !stop ? a.screening.decision : 'defer' },
      });
      if (vo2.label === 'estimated' || vo2.label === 'measured') {
        const p = E().getProtocol(c.protocolId);
        items.push({
          domain: 'cardio', key: 'vo2', name: 'VO₂ max', value: vo2.relative_ml_kg_min, unit: 'mL/kg/min', label: vo2.label,
          method: p.name + ' v' + p.version, formula: vo2.formula, flags: vo2.flags.map((f) => f.text),
          range: vo2.typical_range_ml_kg_min, tier: vo2.tier, protocol_id: p.id, qualified: vo2.qualified,
        });
        if (vo2.absolute_l_min != null) items.push({ domain: 'cardio', key: 'vo2_abs', name: 'VO₂ max (absolute)', value: vo2.absolute_l_min, unit: 'L/min', label: vo2.label, method: p.name, formula: 'relative × mass_kg / 1000', flags: [] });
        items.push({ domain: 'cardio', key: 'mets', name: 'MET equivalent', value: vo2.mets, unit: 'METs', label: vo2.label, method: p.name, formula: 'VO₂ / 3.5', flags: [] });
      } else missing.push('VO₂ max: ' + vo2.reason);
      measured('cardio', 'end_hr', 'End-exercise heart rate', c.endHr, 'bpm', c.hrMethod);
      measured('cardio', 'rpe', 'RPE (Borg 6 to 20)', c.rpe, '');
      push('cardio', 'hrr1', 'HR recovery at 1 min', M().hrRecovery(c.endHr, c.recHr60, 60), c.recoveryPosture);
      push('cardio', 'hrr2', 'HR recovery at 2 min', M().hrRecovery(c.endHr, c.recHr120, 120), c.recoveryPosture);
      if (has(c.endHr) && has(v.restHr)) {
        const peak = has(c.peakHr) ? { v: c.peakHr, s: 'measured' } : athlete && athlete.age != null ? { v: M().predictedHrMax(athlete.age).value, s: 'predicted' } : null;
        if (peak) push('cardio', 'hrr_pct', 'Heart-rate reserve used', M().hrReservePct(c.endHr, v.restHr, peak.v, peak.s));
      }
    }
  }

  if (domains.includes('strength')) {
    const s = a.strength || {};
    const g = M().grip(s.gripL, s.gripR);
    if (g) {
      items.push(Object.assign({ domain: 'strength', key: 'grip', name: 'Handgrip (best)', method: s.device || '' }, g));
    } else missing.push('Handgrip trials');
  }

  if (domains.includes('power')) {
    const p = a.power || {};
    const j = M().jump(p.standReach, p.jumpReach);
    if (j) items.push(Object.assign({ domain: 'power', key: 'jump', name: 'Vertical jump', method: 'Reach difference, ' + (p.armSwing ? 'arm swing' : 'no arm swing') }, j));
    else missing.push('Vertical jump (standing reach and at least one jump reach)');
    const sp = M().sprint(p.sprintTimes, p.sprintDistance);
    if (sp) items.push(Object.assign({ domain: 'power', key: 'sprint', name: (p.sprintDistance || '?') + ' m sprint (best)', method: p.timing || '' }, sp));
    else missing.push('Sprint times');
  }

  if (domains.includes('mobility')) {
    const m = a.mobility || {};
    const l = M().pair(m.lungeL, m.lungeR, 'cm');
    if (l) items.push(Object.assign({ domain: 'mobility', key: 'lunge', name: 'Knee-to-wall lunge', method: 'Toe-to-wall distance' }, l));
    else missing.push('Ankle lunge');
  }

  if (domains.includes('balance')) {
    const b = a.balance || {};
    const s = M().pair(b.slsL, b.slsR, 's');
    if (s) items.push(Object.assign({ domain: 'balance', key: 'sls', name: 'Single-leg stance', method: (b.eyes || 'eyes open') + ', max ' + (b.maxS || 30) + ' s' }, s));
    else missing.push('Single-leg stance');
  }

  return {
    calculated_at: new Date().toISOString(),
    versions: { engine: 'engine_v1', metrics: M().VERSION },
    screening: screen,
    safety,
    blocked_exercise: stop || !screen.allowed,
    vo2,
    items,
    missing,
  };
}
