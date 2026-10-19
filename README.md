# Sportgram, a MotionPlus product

A free sports app for athletes, built first for village and low-income athletes who could never pay for lab
testing. Athletes find their weak side with simple tests and basic equipment anyone can afford, train with a
coach, trainer or physio they choose, and learn from a feed of stories, slides, videos and insights.

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

## How it works
- **Athletes** (`app/js/pages/athlete.js`): Home (streak, daily pulse, this week's programme), Feed (a swipe
  feed plus Insights and Saved; only athletes star or react), Train (10 free tests in `engine/tests.js`, the
  Mirror, progress charts, programmes, a 26-exercise library), Chat, and Me (their coaches and physios).
- **Coaches, trainers and physios** (`app/js/pages/coach.js`): Inbox of Mirror reports with a programme
  composer (weeks and sessions per week), Athletes (connection requests and approvals), Post (comic
  stories, slides or a PDF, videos, photos, insights, training, documents), Chat, and Me (profile and the
  assessment tools).
- **Connecting** (`app/js/connect.js`): an athlete finds a pro by their posts and profile and taps Connect;
  the pro accepts. A team code connects straight away. When an athlete has two pros, each approves the
  other, then they see each other's programmes and can chat about that athlete.
- Accounts, posts and chats are kept on this phone for now; online accounts across phones need Supabase.
- **Try the demo** on the welcome screen loads invented athletes, a physio, a coach and a trainer
  (password `demo1234`).

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
