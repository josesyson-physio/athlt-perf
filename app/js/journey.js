// Road to the Olympics: points, levels, weekly quests and badges, all worked out from what the
// athlete already does (pulse, tests, sessions, warm-ups, Move Better). Points reward showing up
// and closing gaps, never raw talent, so a beginner climbs as fast as an elite athlete.
// Nothing extra is stored: the same records always give the same points.
import { moveStatus, MB_STAGES } from './move.js';

const T = () => globalThis.MotionPlusTests;

export const LEVELS = [
  { key: 'rookie', name: 'Rookie', points: 0 },
  { key: 'local', name: 'Local Star', points: 200 },
  { key: 'district', name: 'District', points: 600 },
  { key: 'state', name: 'State', points: 1300 },
  { key: 'national', name: 'National', points: 2400 },
  { key: 'olympian', name: 'Olympian', points: 4000 },
];
export const POINTS = { pulse: 10, test: 20, best: 30, gap: 50, session: 20, warmup: 15, move: 15, stage: 60, quest: 40 };
export const EARN = [
  ['Daily pulse', POINTS.pulse], ['Any test', POINTS.test], ['Beat your ghost', POINTS.best], ['Close a left-right gap', POINTS.gap],
  ['Programme session', POINTS.session], ['Smart warm-up', POINTS.warmup], ['Move Better session', POINTS.move], ['Clear a Move Better stage', POINTS.stage], ['Finish a weekly quest', POINTS.quest],
];

export const BADGES = [
  { key: 'first', name: 'First step', how: 'Do your first test', icon: 'tests' },
  { key: 'fire7', name: '7-day fire', how: 'Pulse 7 days in a row', icon: 'fire' },
  { key: 'best', name: 'Ghost buster', how: 'Beat one of your ghosts', icon: 'star' },
  { key: 'gap', name: 'Gap closed', how: 'Bring a weaker side level', icon: 'mirror' },
  { key: 'mirror', name: 'Full Mirror', how: 'Test every left-right area', icon: 'me' },
  { key: 'quest', name: 'Quest week', how: 'Finish all 3 quests in a week', icon: 'flag' },
  { key: 'move', name: 'Move Better', how: 'Clear all 5 stages', icon: 'strong' },
  { key: 'olympian', name: 'Olympian', how: 'Reach the top level', icon: 'run' },
];

// ---------- dates ----------
const dayN = (iso) => Math.round(Date.parse(String(iso).slice(0, 10) + 'T00:00:00Z') / 864e5);
const isoOf = (n) => new Date(n * 864e5).toISOString().slice(0, 10);
export const weekStart = (iso) => { const n = dayN(iso); return isoOf(n - ((new Date(n * 864e5).getUTCDay() + 6) % 7)); };
const inWeek = (date, ws) => date >= ws && date < isoOf(dayN(ws) + 7);
const order = (a, b) => (a.date + (a.createdAt || '') < b.date + (b.createdAt || '') ? -1 : 1);

// ---------- what happened, in order ----------
// Each saved test result: was it a new best (beat the ghost) and did it close a gap?
export function testEvents(results) {
  const t = T();
  const done = [], out = [], status = {};
  results.slice().sort(order).forEach((r) => {
    const test = t.byKey(r.test);
    if (!test) return;
    const g = t.ghost(done, r.test);
    let best = false;
    if (g) {
      if (test.sides) best = ['left', 'right'].some((s) => g[s] != null && Number(r[s]) > g[s]);
      else if (g.value != null) best = test.lowerBetter ? Number(r.value) < g.value : Number(r.value) > g.value;
    }
    done.push(r);
    let gap = false;
    if (test.sides) {
      const row = t.mirror(done).find((x) => x.area === test.area);
      const now = row && row.tested ? row.status : null;
      if ((status[test.area] === 'work' || status[test.area] === 'watch') && now === 'even') gap = true;
      status[test.area] = now;
    }
    out.push({ date: r.date, test: r.test, best, gap });
  });
  return out;
}

function bestStreak(dates) {
  const d = [...new Set(dates)].sort();
  let best = 0, run = 0, prev = null;
  d.forEach((x) => { run = prev && dayN(x) - dayN(prev) === 1 ? run + 1 : 1; best = Math.max(best, run); prev = x; });
  return best;
}

// ---------- weekly quests ----------
// Three quests a week, chosen from the athlete's own record up to the Monday: keep the pulse
// going, go after the weakest area, and one more that rotates each week.
export function questsFor(data, ws, events) {
  const t = T();
  const before = data.results.filter((r) => r.date < ws);
  const week = (list) => list.filter((x) => inWeek(x.date, ws));
  const pulseDays = new Set(week(data.checkins).map((c) => c.date)).size;
  const q = [{ key: 'pulse', text: 'Do your daily pulse on 5 days', href: '#/pulse', have: Math.min(pulseDays, 5), need: 5 }];
  const rank = { work: 0, watch: 1 };
  const gaps = t.mirror(before).filter((x) => x.tested && rank[x.status] != null).sort((a, b) => rank[a.status] - rank[b.status]);
  if (gaps.length) {
    const g = gaps[0];
    q.push({ key: 'retest', text: 'Work on your ' + g.name.toLowerCase() + ', then retest it', href: '#/tests/' + g.test, have: week(data.results).some((r) => r.test === g.test) ? 1 : 0, need: 1 });
  } else {
    const tried = new Set(before.map((r) => r.test));
    const fresh = t.TESTS.find((x) => !tried.has(x.key));
    if (fresh) q.push({ key: 'newtest', text: 'Try a test you have never done', href: '#/tests/' + fresh.key, have: week(data.results).some((r) => !tried.has(r.test)) ? 1 : 0, need: 1 });
    else q.push({ key: 'retestany', text: 'Retest any two tests', href: '#/train', have: Math.min(week(data.results).length, 2), need: 2 });
  }
  const pathDone = moveStatus(data.moves.filter((m) => m.date < ws), before).done;
  const extra = [
    { key: 'warmup', text: 'Do the smart warm-up twice', href: '#/warmup', have: Math.min(new Set(week(data.moves).filter((m) => m.kind === 'warmup').map((m) => m.date)).size, 2), need: 2 },
    pathDone ? null : { key: 'move', text: 'Do 3 Move Better sessions', href: '#/move', have: Math.min(week(data.moves).filter((m) => m.kind === 'move').length, 3), need: 3 },
    { key: 'best', text: 'Beat one of your ghosts', href: '#/train', have: (events || testEvents(data.results)).some((e) => e.best && inWeek(e.date, ws)) ? 1 : 0, need: 1 },
  ].filter(Boolean);
  q.push(extra[Math.floor(dayN(ws) / 7) % extra.length]);
  return q.map((x) => Object.assign(x, { done: x.have >= x.need }));
}

// ---------- the whole journey ----------
// data: { checkins, results, progress, moves } for one athlete. today: ISO date.
export function journey(data, today) {
  const d = { checkins: data.checkins || [], results: data.results || [], progress: data.progress || [], moves: data.moves || [] };
  const pulseDates = [...new Set(d.checkins.map((c) => c.date))];
  const ev = testEvents(d.results);
  const warmDays = new Set(d.moves.filter((m) => m.kind === 'warmup').map((m) => m.date)).size;
  const moveDays = new Set(d.moves.filter((m) => m.kind === 'move').map((m) => m.stage + m.date)).size;
  const path = moveStatus(d.moves, d.results);
  const cleared = path.stages.filter((s) => s.cleared).length;

  // Every week from the first record to this one, for quests.
  const all = [].concat(pulseDates, d.results.map((r) => r.date), d.progress.map((p) => p.date), d.moves.map((m) => m.date)).filter(Boolean).sort();
  const thisWeek = weekStart(today);
  const weeks = [];
  if (all.length) for (let w = weekStart(all[0]); w <= thisWeek; w = isoOf(dayN(w) + 7)) weeks.push(w);
  const questWeeks = weeks.map((w) => ({ week: w, list: questsFor(d, w, ev) }));
  const questsDone = questWeeks.reduce((n, w) => n + w.list.filter((q) => q.done).length, 0);
  const current = questWeeks.length && questWeeks[questWeeks.length - 1].week === thisWeek ? questWeeks[questWeeks.length - 1].list : questsFor(d, thisWeek, ev);

  const parts = {
    pulse: pulseDates.length * POINTS.pulse,
    test: d.results.length * POINTS.test,
    best: ev.filter((e) => e.best).length * POINTS.best,
    gap: ev.filter((e) => e.gap).length * POINTS.gap,
    session: d.progress.length * POINTS.session,
    warmup: warmDays * POINTS.warmup,
    move: moveDays * POINTS.move,
    stage: cleared * POINTS.stage,
    quest: questsDone * POINTS.quest,
  };
  const points = Object.values(parts).reduce((a, b) => a + b, 0);
  const li = LEVELS.reduce((k, l, i) => (points >= l.points ? i : k), 0);
  const level = LEVELS[li], next = LEVELS[li + 1] || null;
  const pct = next ? Math.round(((points - level.points) / (next.points - level.points)) * 100) : 100;

  const t = T();
  const sideAreas = t.AREAS.filter((a) => t.TESTS.some((x) => x.sides && x.area === a.key));
  const testedAreas = new Set(t.mirror(d.results).filter((x) => x.tested).map((x) => x.area));
  const earned = {
    first: d.results.length > 0,
    fire7: bestStreak(pulseDates) >= 7,
    best: ev.some((e) => e.best),
    gap: ev.some((e) => e.gap),
    mirror: sideAreas.every((a) => testedAreas.has(a.key)),
    quest: questWeeks.some((w) => w.list.every((q) => q.done)),
    move: cleared === MB_STAGES.length,
    olympian: level.key === 'olympian',
  };
  return {
    points, parts, level, levelIndex: li, next, toNext: next ? next.points - points : 0, pct,
    quests: current, questsDone, week: thisWeek,
    badges: BADGES.map((b) => Object.assign({}, b, { earned: !!earned[b.key] })),
    path,
  };
}
