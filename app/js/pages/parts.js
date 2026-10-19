// Pieces shared by the athlete and pro screens: the Mirror board, exercise lists and a progress line.
import { html } from '../vendor/preact-htm.js';
import { XIcon } from '../xui.js';
import { byKey as exercise } from '../library.js';

export function MirrorBoard({ rows, compact }) {
  const w = compact ? 0.62 : 1.1;
  return html`<div class=${'x-card' + (compact ? ' flat' : '')} style="padding:18px 14px 14px">
    <div class="x-mirror-head"><div>LEFT</div><div></div><div>RIGHT</div></div>
    ${rows.map((x) => x.tested ? html`<div class="x-mirror-row">
        <div class="l"><span class=${'v ' + (x.weak === 'left' && x.status !== 'even' ? x.status : '')}>${x.left}</span><span class=${'bar ' + (x.weak === 'left' && x.status !== 'even' ? x.status : '')} style=${'width:' + Math.round(x.pctL * w) + 'px'}></span></div>
        <div class="name">${x.name}</div>
        <div class="r"><span class=${'bar ' + (x.weak === 'right' && x.status !== 'even' ? x.status : '')} style=${'width:' + Math.round(x.pctR * w) + 'px'}></span><span class=${'v ' + (x.weak === 'right' && x.status !== 'even' ? x.status : '')}>${x.right}</span></div>
      </div>` : compact ? null : html`<div class="x-mirror-row untested"><div class="l"><span class="none">Not tested</span></div><div class="name">${x.name}</div><div class="r"></div></div>`)}
    ${compact ? null : html`<div class="x-legend"><span><i style="background:var(--x-work)"></i>Work on</span><span><i style="background:var(--x-watch)"></i>Watch</span><span><i style="background:var(--x-even)"></i>Even</span></div>`}
  </div>`;
}

export function ExerciseRows({ keys, bg }) {
  const list = (keys || []).map((k) => exercise(k)).filter(Boolean);
  if (!list.length) return null;
  return html`<div class="x-list" style=${bg ? 'background:' + bg : ''}>${list.map((x) => html`<a class="x-row" href=${'#/library/' + x.key}><div class="grow"><b>${x.name}</b><span class="x-small x-muted">${x.dose} · ${x.equipment}</span></div><span class="x-chev"><${XIcon} name="next" size=${16} /></span></a>`)}</div>`;
}

// Progress over time for one test: a small line chart, oldest on the left.
export function Spark({ points, lowerBetter, width, height }) {
  const W = width || 120, H = height || 40, pad = 4;
  const v = points.map((p) => p.v).filter((x) => typeof x === 'number' && isFinite(x));
  if (v.length < 2) return html`<svg width=${W} height=${H} aria-hidden="true"><line x1=${pad} x2=${W - pad} y1=${H / 2} y2=${H / 2} style="stroke:var(--x-even)" stroke-width="2" stroke-dasharray="4 4" /></svg>`;
  const lo = Math.min(...v), hi = Math.max(...v), span = hi - lo || 1;
  const xy = v.map((y, i) => [pad + (i * (W - 2 * pad)) / (v.length - 1), H - pad - ((lowerBetter ? hi - y : y - lo) / span) * (H - 2 * pad)]);
  const d = xy.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const last = xy[xy.length - 1];
  return html`<svg width=${W} height=${H} viewBox=${'0 0 ' + W + ' ' + H} aria-hidden="true"><path d=${d} fill="none" style="stroke:var(--x-tint)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" /><circle cx=${last[0]} cy=${last[1]} r="4" style="fill:var(--x-tint)" /></svg>`;
}

// The premium Mirror: a front and back body figure. Each tested area glows on both sides, and the
// glow on the weaker side grows with the gap. Tapping an area opens its drills. Words and L/R
// labels sit alongside the colour, so nobody has to rely on colour alone.
const FRONT = 85, BACK = 255;
const SPOTS = { // area: [figure centre, x offset from the centre line, y]
  core: [FRONT, 25, 116], knee: [FRONT, 17, 204], ankle: [FRONT, 18, 250], balance: [FRONT, 21, 268],
  hamstring: [BACK, 15, 176], calf: [BACK, 17, 222],
};
const WORD = { work: 'work on', watch: 'watch', even: 'even' };

function Figure({ cx }) {
  const limb = (x1, y1, x2, y2, w) => html`<line x1=${cx + x1} y1=${y1} x2=${cx + x2} y2=${y2} stroke-width=${w} />`;
  const both = (x1, y1, x2, y2, w) => [limb(-x1, y1, -x2, y2, w), limb(x1, y1, x2, y2, w)];
  return html`<g class="sg-fig">
    <circle cx=${cx} cy="30" r="15" />
    ${limb(0, 44, 0, 56, 12)}
    <path d=${`M${cx - 31} 60 Q${cx - 37} 62 ${cx - 34} 74 L${cx - 23} 126 Q${cx - 28} 140 ${cx - 26} 150 L${cx + 26} 150 Q${cx + 28} 140 ${cx + 23} 126 L${cx + 34} 74 Q${cx + 37} 62 ${cx + 31} 60 Z`} stroke-width="8" />
    ${both(34, 66, 42, 110, 13)}${both(42, 110, 46, 150, 10)}
    ${both(14, 148, 17, 204, 22)}${both(17, 204, 18, 256, 15)}
    <ellipse cx=${cx - 20} cy="266" rx="10" ry="5" /><ellipse cx=${cx + 20} cy="266" rx="10" ry="5" />
  </g>`;
}

export function BodyMirror({ rows, groin }) {
  const tested = rows.filter((x) => x.tested);
  const zones = [];
  tested.forEach((x) => {
    const spot = SPOTS[x.area];
    if (!spot) return;
    const [cx, dx, y] = spot;
    const gap = 100 - Math.min(x.pctL, x.pctR);
    // Front view: the athlete's left is on the viewer's right. Back view: on the viewer's left.
    ['left', 'right'].forEach((side) => {
      const weak = x.weak === side && x.status !== 'even';
      const status = weak ? x.status : 'even';
      const onRight = (side === 'left') === (cx === FRONT);
      const r = weak ? Math.min(24, 11 + gap * 0.55) : 9;
      const share = side === 'left' ? x.pctL : x.pctR;
      zones.push({ key: x.area + side, area: x.area, x: cx + (onRight ? dx : -dx), y, r, status,
        label: (side === 'left' ? 'Left ' : 'Right ') + x.name.toLowerCase() + ': ' + WORD[status] + ', ' + share + '% of your stronger side. Open drills.' });
    });
  });
  if (groin && groin !== 'even') zones.push({ key: 'groin', area: 'groin', x: FRONT, y: 154, r: 13, status: groin, label: 'Groin: ' + WORD[groin] + '. Open drills.' });
  const lr = (cx, front) => html`<text x=${cx - 30} y="292" class="sg-lr">${front ? 'R' : 'L'}</text><text x=${cx + 30} y="292" class="sg-lr">${front ? 'L' : 'R'}</text>`;
  return html`<div class="x-card sg-body">
    <svg viewBox="0 0 340 312" role="group" aria-label="Your body, front and back. Glowing areas show where one side is weaker.">
      <defs>${['work', 'watch', 'even'].map((s) => html`<radialGradient id=${'sg-g-' + s}><stop offset="0" class=${'sg-s0 ' + s} /><stop offset=".55" class=${'sg-s1 ' + s} /><stop offset="1" class=${'sg-s2 ' + s} /></radialGradient>`)}</defs>
      <${Figure} cx=${FRONT} /><${Figure} cx=${BACK} />
      ${lr(FRONT, true)}${lr(BACK, false)}
      <text x=${FRONT} y="310" class="sg-view">FRONT</text><text x=${BACK} y="310" class="sg-view">BACK</text>
      ${zones.map((z) => html`<a key=${z.key} href=${'#/library?area=' + z.area} aria-label=${z.label} class=${'sg-zone ' + z.status}>
        <circle cx=${z.x} cy=${z.y} r=${z.r} fill=${'url(#sg-g-' + z.status + ')'} class="glow" />
        <circle cx=${z.x} cy=${z.y} r=${z.status === 'even' ? 3 : 4} class="core" />
        <circle cx=${z.x} cy=${z.y} r="22" fill="transparent" />
      </a>`)}
    </svg>
    <div class="x-legend"><span><i class="sg-key work"></i>Work on</span><span><i class="sg-key watch"></i>Watch</span><span><i class="sg-key even"></i>Even</span></div>
    ${tested.length ? html`<p class="x-small x-muted" style="text-align:center">Tap a glowing spot for its drills. A bigger glow means a bigger gap.</p>`
      : html`<p class="x-small x-muted" style="text-align:center">Do a left and right test and your body lights up here.</p>`}
  </div>`;
}
