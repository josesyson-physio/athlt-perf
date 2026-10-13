# MotionPlus VO2 (cardio module) — prototype

Built from "MotionPlus Manual Sports Assessment & AI Reporting Engine" v1.0 (sections 7, 10, 11, 14, 15.3).

## Use the app
Once GitHub Pages is on (Settings → Pages → Source: GitHub Actions), the app is at
https://josesyson-physio.github.io/athlt-perf/. Open it once with signal, then install it:
Android/Chrome shows **Install app**; on iPhone tap Share → Add to Home Screen.
After that it works with no signal. Results stay on the phone; use **Download backup** to keep a copy.

## Develop
- `npm test` — engine unit tests
- `npm run build` — builds `dist/` (offline app) and `prototype/motionplus-vo2.html` (single-file preview)
- `npm run serve` — build and serve `dist/` at http://localhost:8080

## What's here
- `engine/engine.js` — deterministic, versioned VO2 max equations with evidence labels, population checks,
  error ranges, input snapshots. Works in browser and Node. No AI in the calculation path.
- `engine/engine.test.js` — 14 tests (`npm test`), including the spec's Cooper example
  (2,800 m → 51.3 mL/kg/min, 3.59 L/min) and the published Rockport worked example (→ 42.3).
- `prototype/template.html` — the app UI, shared by both build outputs.
- `app/` — offline layer: service worker, install prompt, backup/restore, manifest and icons.
- `.github/workflows/ci.yml` — runs tests on every PR and publishes `dist/` to GitHub Pages from main.

## Priority: maximum accuracy (jose, 2026-10-13)
Tests are ranked in accuracy tiers: A direct gas analysis (lab or portable analyser, entered as Measured),
B max-effort field tests, C submaximal HR tests, D no-exercise. Use the highest tier the athlete can safely do.

## Methods
| Test | Cost | Error | Equation source |
|---|---|---|---|
| Activity questionnaire (Jackson 1990) | free | ±5 mL/kg/min | Med Sci Sports Exerc 1990;22:863 |
| Resting/max HR ratio (Uth 2004) | free | ~7% (measured HRmax) | Eur J Appl Physiol 2004;91:111 |
| Queens College step | a 41.3 cm step | ~16% | McArdle 1972 |
| Rockport 1-mile walk | measured course | ±4.4–5 | Kline 1987 |
| Cooper 12-min run | track | not reported | Cooper 1968 |
| 1.5-mile run | track | not reported | ACSM field equation |

## Ethics and safety built in
Screening gate (8 questions; any yes locks exercise tests until a clinician clears), consent required,
never guesses inputs, incomplete test = invalid, out-of-population flags, no percentiles/ratings without a
cited matched reference set, data stays on device, binary-sex limitation of equations disclosed,
optical/camera HR bias on darker skin and during motion disclosed.

## Suggested next steps
1. Personal calibration: one gas-analysis test per athlete corrects their later field-test estimates.
2. Add reference norms only from cited sources (e.g. ACSM tables, FRIEND registry) with population labels.
3. Assessor/athlete roles, audit trail, PDF report, AI draft text over approved result objects only.
4. Validation pilot against lab gas analysis before any accuracy claims.
