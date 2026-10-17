# MotionPlus: find your weak side, close the gap

A free training app for athletes, built first for village and low-income athletes who could never pay for lab
testing. Athletes do simple tests with basic equipment anyone can afford (a wall, a step, a tape measure, a
phone stopwatch), and the **Mirror** shows where the left side lags the right. Coaches, trainers and physios
get the athlete's report and send back a plan; athletes see their posts in a feed and star or react.

## Use the app
Once GitHub Pages is on (Settings → Pages → Source: GitHub Actions), the app is at
https://josesyson-physio.github.io/athlt-perf/. Open it once with signal, then install it:
Android/Chrome shows **Install app**; on iPhone tap Share → Add to Home Screen.
After that it works with no signal. Results stay on the phone; use **Download backup** to keep a copy.

## Develop
- `npm test` — engine, metrics and app calculation tests
- `npm run build` — builds `dist/` (offline app) and `prototype/motionplus-vo2.html` (single-file preview)
- `npm run serve` — build and serve `dist/` at http://localhost:8080

## What's here
- `engine/engine.js` — deterministic, versioned VO2 max equations with evidence labels, population checks,
  error ranges, input snapshots. Works in browser and Node. No AI in the calculation path.
- `engine/metrics.js` — BMI, waist-to-height, MAP, HR recovery and reserve, grip/jump/sprint summaries,
  left/right differences and vitals safety flags.
- `app/` — the web app (Preact + htm, no build step). `app/js/pages/` holds one file per screen,
  `calc.js` turns an assessment into a result record, `insights.js` drafts rule-based observations
  (never new numbers), `store.js` keeps records in IndexedDB on the device, `sw.js` makes it work offline.
- `engine/monitor.js` — problem-detection rules (`monitor_rules_v1`): daily check-in, weekly OSTRC-H2,
  session RPE load. Compares each athlete with their own baseline; never predicts injury or clears anyone.
- `prototype/` — the earlier single-file VO2 tool, still built for reference.
- `.github/workflows/ci.yml` — runs tests on every PR and publishes `dist/` to GitHub Pages from main.

## Priority: maximum accuracy (jose, 2026-10-13)
Tests are ranked in accuracy tiers: A direct gas analysis (lab or portable analyser, entered as Measured),
B max-effort field tests, C submaximal HR tests, D no-exercise. Use the highest tier the athlete can safely do.

## Two sides of the app
- **Athletes** (`app/js/pages/athlete.js`): Today (streak, daily pulse, Mirror, beat your ghost), Tests (10 free
  field tests in `engine/tests.js`, each cut-off from a published study), Mirror (left vs right per body area,
  send to coach, save as PDF), Feed (coach posts; only athletes can star or react), Library (26 basic exercises).
- **Coaches, trainers and physios** (`app/js/pages/coach.js`): Inbox of athlete reports with a plan composer,
  Post (insights, documents and training sessions to the team feed), Team (share a 6-character team code),
  Library, and Tools (the full assessment, VO2 and Signals screens).
- Accounts are kept on this phone for now (`app/js/session.js`); online accounts across phones need a server.
- **Try the demo** on the welcome screen loads invented athletes and a physio (password `demo1234`).

## Signals: problem detection
The daily pulse (pain and where, tiredness, soreness, sleep, illness, 3 urgent questions) feeds **Signals**
(`engine/monitor.js`): Stop and get help, Look at today, Keep an eye on, No answers yet. Each athlete is
compared with their own usual. Thresholds are a starting point, not validated cut-offs.
OSTRC-H2 wording is copyright (BMJ/OSTRC): get permission before any commercial use.

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
Urgent symptoms stop the app and show emergency advice (112); hard tests have a safety check,
never guesses inputs, incomplete test = invalid, out-of-population flags, no percentiles/ratings without a
cited matched reference set, data stays on device, binary-sex limitation of equations disclosed,
optical/camera HR bias on darker skin and during motion disclosed.

## Suggested next steps
1. Personal calibration: one gas-analysis test per athlete corrects their later field-test estimates.
2. Add reference norms only from cited sources (e.g. ACSM tables, FRIEND registry) with population labels.
3. Logo, cloud accounts and shared clinic records (needs a secure server), AI-written report text over signed-off results only.
4. Validation pilot against lab gas analysis before any accuracy claims.
