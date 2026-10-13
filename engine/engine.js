/*
 * MotionPlus VO2 calculation engine (prototype).
 * Deterministic, versioned field-test equations. No network, no AI.
 * Every result carries an evidence label, formula version, input snapshot and quality flags,
 * following sections 7, 10 and 11 of the MotionPlus specification.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MotionPlusEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const LB_PER_KG = 2.20462;

  const LABEL = {
    MEASURED: 'measured',
    CALCULATED: 'calculated',
    ESTIMATED: 'estimated',
    NOT_AVAILABLE: 'not_available',
    INVALID: 'invalid',
  };

  // Tanaka, Monahan & Seals (2001): HRmax = 208 - 0.7 * age. SD about 10 bpm.
  function predictedHrMax(age) {
    return 208 - 0.7 * age;
  }

  // Accuracy tiers: A = direct measurement, B = maximal-effort field test,
  // C = submaximal heart-rate test, D = no exercise.
  const TIERS = {
    A: 'Reference: direct gas analysis',
    B: 'Max-effort field test',
    C: 'Submaximal heart-rate test',
    D: 'No-exercise estimate',
  };

  const PROTOCOLS = [
    {
      id: 'measured_gas_analysis',
      version: '1.0',
      name: 'Lab or portable gas analysis',
      tier: 'A',
      evidence: 'measured',
      exertion: 'maximal',
      equipment: 'Metabolic cart or validated portable analyser, calibrated on the day',
      inputs: [{ key: 'vo2_ml_kg_min', label: 'Measured VO2 max or VO2 peak', unit: 'mL/kg/min', min: 10, max: 95 }],
      population: { ageMin: 0, ageMax: 120, sex: null, note: 'Criterion method for anyone safely able to do a maximal test.' },
      error: { type: 'pct', value: 4 },
      errorNote: 'Day-to-day variation of a well-run test is about 3 to 5%. Record the device, protocol and calibration.',
      source: 'ATS/ACCP Statement on Cardiopulmonary Exercise Testing, Am J Respir Crit Care Med 2003;167:211-277.',
      formula: 'entered as measured',
      compute: (i) => i.vo2_ml_kg_min,
    },
    {
      id: 'cooper_12min',
      version: '1.0',
      tier: 'B',
      name: 'Cooper 12-minute run',
      exertion: 'maximal',
      equipment: 'Measured track or course, stopwatch',
      inputs: [{ key: 'distance_m', label: 'Distance covered in 12 min', unit: 'm', min: 800, max: 5000 }],
      population: { ageMin: 17, ageMax: 52, sex: 'male', note: 'Derived in 115 US Air Force men aged 17 to 52.' },
      error: null,
      errorNote: 'The original paper reports correlation only (r = 0.90). Error for an individual is not established.',
      source: 'Cooper KH. JAMA 1968;203(3):201-204.',
      formula: '(distance_m - 504.9) / 44.73',
      compute: (i) => (i.distance_m - 504.9) / 44.73,
    },
    {
      id: 'acsm_1_5mile',
      version: '1.0',
      tier: 'B',
      name: '1.5-mile (2.4 km) run',
      exertion: 'maximal',
      equipment: 'Measured 2.4 km course, stopwatch',
      inputs: [{ key: 'time_min', label: 'Time to finish 2.4 km', unit: 'min', min: 6, max: 30 }],
      population: { ageMin: 18, ageMax: 40, sex: null, note: 'Young, healthy, run-trained adults.' },
      error: null,
      errorNote: 'Prediction error is not reported with the commonly used equation.',
      source: 'ACSM Guidelines for Exercise Testing and Prescription (field-test equation).',
      formula: '3.5 + 483 / time_min',
      compute: (i) => 3.5 + 483 / i.time_min,
    },
    {
      id: 'rockport_1mile',
      version: '1.0',
      tier: 'C',
      name: 'Rockport 1-mile walk',
      exertion: 'submaximal',
      equipment: 'Measured 1-mile (1,609 m) course, stopwatch, pulse count or HR strap',
      inputs: [
        { key: 'time_min', label: 'Walk time for 1 mile', unit: 'min', min: 8, max: 30 },
        { key: 'end_hr_bpm', label: 'Heart rate at finish', unit: 'bpm', min: 60, max: 220 },
      ],
      athleteInputs: ['age', 'sex', 'mass_kg'],
      population: { ageMin: 30, ageMax: 69, sex: null, note: 'Derived in 343 men and women aged 30 to 69.' },
      error: { type: 'abs', value: 5.0 },
      errorNote: 'Standard error of estimate about 4.4 to 5.0 mL/kg/min.',
      source: 'Kline GM et al. Med Sci Sports Exerc 1987;19(3):253-259.',
      formula: '132.853 - 0.0769*mass_lb - 0.3877*age + 6.315*male - 3.2649*time_min - 0.1565*end_hr_bpm',
      compute: (i, a) =>
        132.853 - 0.0769 * (a.mass_kg * LB_PER_KG) - 0.3877 * a.age + 6.315 * (a.sex === 'male' ? 1 : 0) -
        3.2649 * i.time_min - 0.1565 * i.end_hr_bpm,
    },
    {
      id: 'queens_step',
      version: '1.0',
      tier: 'C',
      name: 'Queens College step test',
      exertion: 'submaximal',
      equipment: '41.3 cm (16.25 in) step, metronome, stopwatch',
      inputs: [{ key: 'recovery_hr_bpm', label: 'Recovery HR, 5 to 20 s after stopping (15 s count x 4)', unit: 'bpm', min: 60, max: 220 }],
      athleteInputs: ['sex'],
      population: { ageMin: 18, ageMax: 30, sex: null, note: 'College-age men and women.' },
      error: { type: 'pct', value: 16 },
      errorNote: 'Commonly cited error about 16% of the predicted value.',
      source: 'McArdle WD et al. Med Sci Sports 1972;4(4):182-186.',
      formula: 'male: 111.33 - 0.42*hr; female: 65.81 - 0.1847*hr',
      protocolNote: '3 minutes, up-up-down-down. Cadence 24 steps/min (men, metronome 96) or 22 steps/min (women, metronome 88).',
      compute: (i, a) => (a.sex === 'male' ? 111.33 - 0.42 * i.recovery_hr_bpm : 65.81 - 0.1847 * i.recovery_hr_bpm),
    },
    {
      id: 'jackson_nonexercise',
      version: '1.0',
      tier: 'D',
      name: 'No-exercise estimate (activity questionnaire)',
      exertion: 'none',
      equipment: 'None',
      inputs: [{ key: 'par', label: 'Activity level (0 to 7)', unit: 'score', min: 0, max: 7, integer: true }],
      athleteInputs: ['age', 'sex', 'mass_kg', 'height_cm'],
      population: { ageMin: 18, ageMax: 70, sex: null, note: 'Derived in 2,009 adult employees aged 18 to 70.' },
      error: { type: 'abs', value: 5.0 },
      errorNote: 'Standard error of estimate about 5 mL/kg/min. Tends to underestimate very fit athletes.',
      source: 'Jackson AS et al. Med Sci Sports Exerc 1990;22(6):863-870.',
      formula: '56.363 + 1.921*par - 0.381*age - 0.754*bmi + 10.987*male',
      compute: (i, a) => {
        const bmi = a.mass_kg / Math.pow(a.height_cm / 100, 2);
        return 56.363 + 1.921 * i.par - 0.381 * a.age - 0.754 * bmi + 10.987 * (a.sex === 'male' ? 1 : 0);
      },
    },
    {
      id: 'uth_hr_ratio',
      version: '1.0',
      tier: 'C',
      name: 'Heart-rate ratio (resting vs maximum HR)',
      exertion: 'none',
      equipment: 'Resting pulse count; a measured max HR if available',
      inputs: [
        { key: 'rest_hr_bpm', label: 'Resting HR (seated, 60 s count)', unit: 'bpm', min: 30, max: 110 },
        { key: 'max_hr_bpm', label: 'Measured maximum HR (leave blank to predict from age)', unit: 'bpm', min: 140, max: 225, optional: true },
      ],
      athleteInputs: ['sex', 'age'],
      population: { ageMin: 21, ageMax: 51, sex: null, note: 'Derived in well-trained men aged 21 to 51 and trained women.' },
      error: { type: 'pct', value: 7 },
      errorNote: 'About 7% error when max HR is measured. Predicting max HR from age adds roughly 10 bpm of uncertainty.',
      source: 'Uth N et al. Eur J Appl Physiol 2004;91:111-115; women: Int J Sports Med 2005.',
      formula: 'factor * max_hr / rest_hr (factor 15.3 men, 14.5 women)',
      compute: (i, a) => {
        const max = i.max_hr_bpm != null ? i.max_hr_bpm : predictedHrMax(a.age);
        return (a.sex === 'male' ? 15.3 : 14.5) * (max / i.rest_hr_bpm);
      },
    },
  ];

  const ATHLETE_FIELDS = {
    age: { label: 'Age', unit: 'years', min: 10, max: 100 },
    sex: { label: 'Sex used by the equation', unit: '', values: ['male', 'female'] },
    mass_kg: { label: 'Body mass', unit: 'kg', min: 25, max: 250 },
    height_cm: { label: 'Height', unit: 'cm', min: 100, max: 230 },
  };

  function getProtocol(id) {
    return PROTOCOLS.find((p) => p.id === id) || null;
  }

  function isBlank(v) {
    return v === undefined || v === null || v === '' || (typeof v === 'number' && Number.isNaN(v));
  }

  function round(v, dp) {
    const f = Math.pow(10, dp);
    return Math.round(v * f) / f;
  }

  function notAvailable(protocol, reason, extra) {
    return Object.assign(
      { label: LABEL.NOT_AVAILABLE, protocol_id: protocol ? protocol.id : null, reason, flags: [] },
      extra || {}
    );
  }

  function invalid(protocol, reason, flags) {
    return { label: LABEL.INVALID, protocol_id: protocol.id, reason, flags: flags || [] };
  }

  /**
   * calculate(protocolId, { athlete, inputs, completed, screening })
   * athlete: { age, sex, mass_kg, height_cm }
   * screening: { decision: 'proceed' | 'modify' | 'defer' | 'refer' }
   */
  function calculate(protocolId, ctx) {
    const protocol = getProtocol(protocolId);
    if (!protocol) return notAvailable(null, 'Protocol is not in the approved registry.');
    const athlete = ctx.athlete || {};
    const inputs = ctx.inputs || {};
    const decision = ctx.screening && ctx.screening.decision;

    if (protocol.exertion !== 'none' && decision !== 'proceed') {
      return notAvailable(protocol, 'Safety screening has not cleared this athlete for an exercise test.');
    }
    if (protocol.exertion !== 'none' && ctx.completed !== true) {
      return invalid(protocol, 'Test was not completed as written, so the equation does not apply.');
    }

    const missing = [];
    (protocol.athleteInputs || []).forEach((k) => {
      if (isBlank(athlete[k])) missing.push(ATHLETE_FIELDS[k].label);
    });
    protocol.inputs.forEach((f) => {
      if (!f.optional && isBlank(inputs[f.key])) missing.push(f.label);
    });
    if (missing.length) return notAvailable(protocol, 'Required inputs are missing: ' + missing.join(', ') + '.', { missing });

    const flags = [];
    const clean = {};
    for (const f of protocol.inputs) {
      const raw = inputs[f.key];
      if (isBlank(raw)) {
        clean[f.key] = null;
        continue;
      }
      const v = Number(raw);
      if (!Number.isFinite(v)) return invalid(protocol, f.label + ' is not a number.');
      if (f.integer && !Number.isInteger(v)) return invalid(protocol, f.label + ' must be a whole number.');
      if (v < f.min || v > f.max) {
        return invalid(protocol, f.label + ' of ' + v + ' ' + f.unit + ' is outside the plausible range ' + f.min + ' to ' + f.max + '. Check the units.');
      }
      clean[f.key] = v;
    }
    for (const k of protocol.athleteInputs || []) {
      const spec = ATHLETE_FIELDS[k];
      const v = athlete[k];
      if (spec.values) {
        if (!spec.values.includes(v)) return invalid(protocol, spec.label + ' must be one of: ' + spec.values.join(', ') + '.');
      } else if (Number(v) < spec.min || Number(v) > spec.max) {
        return invalid(protocol, spec.label + ' of ' + v + ' ' + spec.unit + ' is outside the plausible range.');
      }
    }

    const pop = protocol.population;
    let outside = false;
    if (!isBlank(athlete.age) && (athlete.age < pop.ageMin || athlete.age > pop.ageMax)) {
      outside = true;
      flags.push({ code: 'outside_age', text: 'Age ' + athlete.age + ' is outside the ' + pop.ageMin + ' to ' + pop.ageMax + ' range the equation was built on.' });
    }
    if (pop.sex && athlete.sex && athlete.sex !== pop.sex) {
      outside = true;
      flags.push({ code: 'outside_sex', text: 'The equation was built only on ' + pop.sex + ' participants.' });
    }
    if (protocol.id === 'uth_hr_ratio' && clean.max_hr_bpm == null) {
      if (isBlank(athlete.age)) return notAvailable(protocol, 'Enter a measured max HR or the athlete age.');
      flags.push({ code: 'predicted_hrmax', text: 'Max HR was predicted from age (208 - 0.7 x age), which adds about 10 bpm of uncertainty.' });
    }
    if (decision === 'modify') flags.push({ code: 'modified', text: 'Screening marked this athlete as modify. Record what was changed.' });

    const athleteSnapshot = {};
    (protocol.athleteInputs || []).forEach((k) => (athleteSnapshot[k] = athlete[k]));
    let rel = protocol.compute(clean, Object.assign({}, athlete, { age: Number(athlete.age), mass_kg: Number(athlete.mass_kg), height_cm: Number(athlete.height_cm) }));
    if (!Number.isFinite(rel) || rel <= 0) return invalid(protocol, 'The equation produced an impossible value from these inputs.');
    if (rel < 10 || rel > 90) flags.push({ code: 'implausible_output', text: 'Result is outside 10 to 90 mL/kg/min. Recheck the inputs.' });

    let low = null;
    let high = null;
    if (protocol.error) {
      const e = protocol.error.type === 'abs' ? protocol.error.value : (rel * protocol.error.value) / 100;
      low = round(Math.max(rel - e, 0), 1);
      high = round(rel + e, 1);
    }
    const measured = protocol.evidence === 'measured';
    let tier = protocol.tier;
    if (protocol.id === 'uth_hr_ratio' && clean.max_hr_bpm == null) tier = 'D';
    const result = {
      label: measured ? LABEL.MEASURED : LABEL.ESTIMATED,
      tier,
      tier_name: TIERS[tier],
      qualified: outside,
      protocol_id: protocol.id,
      protocol_version: protocol.version,
      formula: protocol.formula,
      source: protocol.source,
      relative_ml_kg_min: round(rel, 1),
      typical_range_ml_kg_min: low == null ? null : [low, high],
      error_note: protocol.errorNote,
      absolute_l_min: !isBlank(athlete.mass_kg) ? round((rel * Number(athlete.mass_kg)) / 1000, 2) : null,
      mets: round(rel / 3.5, 1),
      input_snapshot: { inputs: clean, athlete: athleteSnapshot },
      flags,
      limitations: measured
        ? ['Direct measurement. Quality depends on calibration, protocol and a true maximal effort.']
        : ['Field-test prediction. Not a direct gas-analysis measurement.'],
    };
    return result;
  }

  PROTOCOLS.sort((a, b) => a.tier.localeCompare(b.tier));

  return { PROTOCOLS, TIERS, ATHLETE_FIELDS, LABEL, calculate, getProtocol, predictedHrMax };
});
