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
    ${compact ? null : html`<div class="x-legend"><span><i style="background:#F2385A"></i>Work on</span><span><i style="background:#F59E0B"></i>Watch</span><span><i style="background:#CFCFD6"></i>Even</span></div>`}
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
  if (v.length < 2) return html`<svg width=${W} height=${H} aria-hidden="true"><line x1=${pad} x2=${W - pad} y1=${H / 2} y2=${H / 2} stroke="#DCDCE2" stroke-width="2" stroke-dasharray="4 4" /></svg>`;
  const lo = Math.min(...v), hi = Math.max(...v), span = hi - lo || 1;
  const xy = v.map((y, i) => [pad + (i * (W - 2 * pad)) / (v.length - 1), H - pad - ((lowerBetter ? hi - y : y - lo) / span) * (H - 2 * pad)]);
  const d = xy.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const last = xy[xy.length - 1];
  return html`<svg width=${W} height=${H} viewBox=${'0 0 ' + W + ' ' + H} aria-hidden="true"><path d=${d} fill="none" stroke="#4A2FE0" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" /><circle cx=${last[0]} cy=${last[1]} r="4" fill="#4A2FE0" /></svg>`;
}
