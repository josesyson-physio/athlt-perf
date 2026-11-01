// How Dr. Jose's built-in posts look: live exercise animations, memes and exercise charts.
// Loaded with the feed only when needed.
import { html, useState, useEffect, useRef } from '../vendor/preact-htm.js';
import { FIG, frame, segments, solve, POSTS, dailyPosts, DRJOSE } from '../autoposts.js';
import { byKey } from '../library.js';
import { MB_STAGES } from '../move.js';

export { POSTS, dailyPosts, DRJOSE };

const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const moveEx = (k) => MB_STAGES.flatMap((s) => s.items || []).find((e) => e.key === k) || null;
const exName = (k) => { const e = byKey(k); return e ? e.name : ''; };

// Runs a callback every animation frame, only while the element is on screen.
function useLoop(ref, cb, on) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !on) return undefined;
    let raf = 0, seen = !('IntersectionObserver' in window);
    const t0 = performance.now();
    const tick = (now) => { cb(now - t0); raf = requestAnimationFrame(tick); };
    const start = () => { if (!raf) raf = requestAnimationFrame(tick); };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    let io = null;
    if (seen) start();
    else { io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { threshold: 0.3 }); io.observe(el); }
    return () => { stop(); if (io) io.disconnect(); };
  }, [on]);
}

const line = (a, b, cls) => html`<line class=${cls} x1=${a[0].toFixed(1)} y1=${a[1].toFixed(1)} x2=${b[0].toFixed(1)} y2=${b[1].toFixed(1)} />`;
function Body({ s, ghost }) {
  return html`<g class=${'fg-body' + (ghost ? ' ghost' : '')}>${segments(s).map(([a, b, far]) => line(a, b, far ? 'far' : ''))}<circle cx=${s.head[0].toFixed(1)} cy=${s.head[1].toFixed(1)} r="11" /></g>`;
}
const PROPS = {
  step: html`<rect class="fg-prop" x="70" y="176" width="70" height="6" rx="2" />`,
  stepdown: html`<rect class="fg-prop" x="40" y="152" width="66" height="28" rx="4" />`,
  wall: html`<rect class="fg-prop" x="36" y="-26" width="8" height="206" rx="3" />`,
  anchor: html`<rect class="fg-prop" x="40" y="164" width="22" height="10" rx="4" />`,
};

// A looping exercise demo. Captions step through the cues so it works with no sound.
function FigureVideo({ p, fill }) {
  const fig = FIG[p.anim];
  const ex = byKey(p.ex);
  const mv = p.anim === 'wall-angel' ? moveEx('mb-angel') : null;
  const steps = ex ? ex.steps : mv ? mv.steps : [];
  const ref = useRef(null);
  const [st, setSt] = useState(() => frame(fig, 0));
  const [cue, setCue] = useState(0);
  const still = reduced();
  useLoop(ref, (ms) => { setSt(frame(fig, ms)); const c = Math.floor(ms / 2600) % Math.max(1, steps.length); if (c !== cue) setCue(c); }, !still);
  const ghost = still && !fig.front ? solve(fig.b) : null;
  return html`<div ref=${ref} class=${'dj-video t-' + (p.theme || 'violet') + (fill ? ' fill' : '')} role="img" aria-label=${'Animation: ' + (ex ? ex.name : p.title)}>
    <span class="dj-tag"><i></i>${ex ? ex.name + ' · ' + ex.dose : mv ? mv.name + ' · ' + mv.dose : 'Move Better'}</span>
    <svg viewBox="0 -30 200 215" aria-hidden="true">
      ${fig.shadow ? html`<ellipse class="fg-shadow" cx=${st.pose.hip[0]} cy="181" rx=${22 - st.u * 8} ry="3" />` : null}
      <line class="fg-ground" x1="0" x2="200" y1="180" y2="180" />
      ${PROPS[fig.prop] || null}
      ${ghost ? html`<${Body} s=${ghost} ghost=${true} />` : null}
      <${Body} s=${st.pose} />
    </svg>
    ${steps.length ? html`<p class="dj-cue" aria-live="off"><b>${(still ? 1 : cue + 1) + '/' + steps.length}</b>${steps[still ? 0 : cue]}</p>` : null}
  </div>`;
}

// Breathing pacer: 4 seconds in, 6 seconds out.
function Breathe({ p, fill }) {
  const ref = useRef(null);
  const [ms, setMs] = useState(0);
  const still = reduced();
  useLoop(ref, setMs, !still);
  const t = (ms / 1000) % 10, inhale = t < 4;
  const k = inhale ? t / 4 : 1 - (t - 4) / 6;
  const ease = 0.5 - 0.5 * Math.cos(k * Math.PI);
  return html`<div ref=${ref} class=${'dj-video t-' + (p.theme || 'ocean') + (fill ? ' fill' : '')} role="img" aria-label="Breathing pacer: 4 seconds in, 6 seconds out">
    <span class="dj-tag"><i></i>Move Better · breathing</span>
    <div class="dj-breath"><span style=${'transform:scale(' + (still ? 0.8 : 0.45 + ease * 0.55).toFixed(3) + ')'}></span><b>${still ? '4 in · 6 out' : inhale ? 'Breathe in' : 'Breathe out'}</b><em>${still ? 'through the nose' : Math.ceil(inhale ? 4 - t : 10 - t)}</em></div>
  </div>`;
}

function Meme({ p }) {
  const t = 'dj-meme t-' + (p.theme || 'violet');
  if (p.fmt === 'ex' || p.fmt === 'vs') {
    const rows = p.fmt === 'ex' ? [['Expectation', p.a], ['Reality', p.b]] : [['No', p.no], ['Yes', p.yes]];
    return html`<div class=${t + ' two'}>${rows.map(([lab, [emo, txt]]) => html`<div class="dj-half"><span class="dj-emo" aria-hidden="true">${emo}</span><div><small>${lab}</small><b>${txt}</b></div></div>`)}</div>`;
  }
  if (p.fmt === 'pov') return html`<div class=${t}><span class="dj-emo big" aria-hidden="true">${p.emoji}</span><b class="dj-mtext">${p.text}</b></div>`;
  return html`<div class=${t}><b class="dj-mtext">${p.top}</b><span class="dj-emo big" aria-hidden="true">${p.emoji}</span><b class="dj-mtext">${p.bottom}</b></div>`;
}

function Chart({ p }) {
  const t = 'dj-chart t-' + (p.theme || 'violet');
  if (p.kind === 'week') {
    return html`<div class=${t}><span class="dj-tag"><i></i>Weekly plan</span><div class="dj-week">${p.days.map(([d, label, lv]) => html`<div><b>${d}</b><span class="dj-hbar"><i style=${'width:' + (lv ? 18 + lv * 27 : 6) + '%'} class=${'lv' + lv}></i></span><small>${label}</small></div>`)}</div>
      <div class="dj-key"><span><i class="lv1"></i>Easy</span><span><i class="lv2"></i>Medium</span><span><i class="lv3"></i>Hard</span></div></div>`;
  }
  if (p.kind === 'ladder') {
    const max = Math.max(...p.bars.map((b) => b[2]));
    return html`<div class=${t}><span class="dj-tag"><i></i>4-week build-up</span><div class="dj-ladder">${p.bars.map(([w, dose, v]) => html`<div><small>${w}</small><span class="dj-hbar"><i style=${'width:' + Math.round((v / max) * 100) + '%'}></i></span><b>${dose}</b></div>`)}</div><p class="dj-unit">${p.unit}</p></div>`;
  }
  return html`<div class=${t}><span class="dj-tag"><i></i>Exercise chart</span><ol class="dj-rows">${p.rows.map(([k, dose, name], i) => {
    const inner = html`<span class="dj-n">${i + 1}</span><span class="grow"><b>${name || exName(k)}</b><small>${dose}</small></span>`;
    return html`<li>${k && byKey(k) ? html`<a href=${'#/library/' + k}>${inner}</a>` : html`<span class="dj-row">${inner}</span>`}</li>`;
  })}</ol></div>`;
}

export function AutoBody({ p, reel }) {
  if (p.type === 'video') return p.anim === 'breathe' ? html`<${Breathe} p=${p} fill=${reel} />` : html`<${FigureVideo} p=${p} fill=${reel} />`;
  if (p.type === 'meme') return html`<${Meme} p=${p} />`;
  if (p.type === 'chart') return html`<${Chart} p=${p} />`;
  return null;
}

// Extra lines under a Dr. Jose post: the chart note and a link to try it in the app.
export function AutoFoot({ p, dark }) {
  const ex = p.type === 'video' && byKey(p.ex) ? ['#/library/' + p.ex, 'See the full drill'] : p.type === 'video' && p.ex === 'move' ? ['#/move', 'Start Move Better'] : null;
  const link = p.link || ex;
  if (!p.note && !link) return null;
  return html`<div class=${'dj-foot' + (dark ? ' dark' : '')}>${p.note ? html`<p>${p.note}</p>` : null}${link ? html`<a class="x-btn soft sm" href=${link[0]}>${link[1]}</a>` : null}</div>`;
}

// Styles for these posts arrive with this file, so the first screen stays small.
const CSS = `
.dj-avatar{position:relative;background:linear-gradient(145deg,#5B3CF5,#FF2E88);color:#fff;font-size:14px;letter-spacing:-.02em}
.dj-avatar i{position:absolute;bottom:-5px;left:50%;transform:translateX(-50%);font:800 8px/1 var(--x-font);font-style:normal;text-transform:uppercase;letter-spacing:.06em;background:#111114;color:#D9FF3F;padding:2px 4px;border-radius:5px}
.dj-video{position:relative;width:100%;border-radius:18px;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;aspect-ratio:4/5;padding:44px 12px 12px}
.dj-video.fill{border-radius:0;height:100%;aspect-ratio:auto;padding:84px 70px 190px 18px}
.dj-video svg{width:100%;max-width:340px;flex:1;min-height:0}
.fg-body line{stroke:currentColor;stroke-width:7;stroke-linecap:round}
.fg-body line.far{opacity:.45}
.fg-body circle{fill:currentColor}
.fg-body.ghost{opacity:.3}
.fg-ground{stroke:currentColor;stroke-width:2;opacity:.35}
.fg-prop{fill:currentColor;opacity:.22}
.fg-shadow{fill:#000;opacity:.18}
.dj-tag{position:absolute;top:12px;left:12px;display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:800;letter-spacing:.02em;background:rgba(0,0,0,.28);color:#fff;padding:6px 10px;border-radius:999px;max-width:calc(100% - 24px)}
.dj-video.fill .dj-tag{top:76px;left:18px}
.dj-tag i{width:7px;height:7px;border-radius:9px;background:#FF2E88;box-shadow:0 0 0 3px rgba(255,46,136,.3)}
.dj-chart .dj-tag,.dj-chart .dj-tag i{position:static}
.dj-chart .dj-tag{align-self:flex-start}
.dj-cue{display:flex;gap:10px;align-items:flex-start;width:100%;max-width:360px;margin:8px 0 0;background:rgba(0,0,0,.28);color:#fff;border-radius:14px;padding:10px 12px;font-size:15px;line-height:1.35;font-weight:600;min-height:62px}
.dj-cue b{font-size:12px;opacity:.8;padding-top:2px;flex-shrink:0}
.dj-breath{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;position:relative;width:100%}
.dj-breath span{width:min(64vw,230px);aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 35% 30%,rgba(255,255,255,.75),rgba(255,255,255,.18) 70%);box-shadow:0 0 60px rgba(255,255,255,.35)}
.dj-breath b{position:absolute;font-size:24px;font-weight:800;letter-spacing:-.02em}
.dj-breath em{font-style:normal;font-weight:700;font-size:15px;opacity:.85}
.dj-meme{width:100%;border-radius:18px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center;padding:26px 18px;aspect-ratio:1}
.dj-mtext{font-size:23px;line-height:1.15;font-weight:800;letter-spacing:-.02em;text-wrap:balance}
.dj-emo{font-size:40px;line-height:1}
.dj-emo.big{font-size:88px}
.dj-meme.two{gap:0;padding:0;overflow:hidden;aspect-ratio:auto}
.dj-half{display:flex;align-items:center;gap:14px;text-align:left;width:100%;padding:22px 18px;min-height:130px}
.dj-half+.dj-half{background:rgba(0,0,0,.18)}
.dj-half small{display:block;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;opacity:.8;margin-bottom:4px}
.dj-half b{font-size:19px;line-height:1.2;font-weight:800}
.dj-half .dj-emo{font-size:52px}
.dj-chart{width:100%;border-radius:18px;padding:16px;display:flex;flex-direction:column;gap:12px}
.dj-rows{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.dj-rows a,.dj-row{text-decoration:none;display:flex;align-items:center;gap:12px;background:rgba(255,255,255,.16);border-radius:14px;padding:10px 12px;color:inherit;min-height:52px}
.t-lime .dj-rows a,.t-lime .dj-row,.t-lime .dj-hbar{background:rgba(11,26,15,.1)}
.dj-rows b{display:block;font-size:15px}
.dj-rows small,.dj-week small,.dj-ladder small{font-size:12.5px;opacity:.85}
.dj-n{width:30px;height:30px;border-radius:99px;background:rgba(0,0,0,.25);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;flex-shrink:0}
.dj-week{display:flex;flex-direction:column;gap:7px}
.dj-week>div{display:grid;grid-template-columns:38px 1fr 104px;align-items:center;gap:10px}
.dj-week b{font-size:14px}
.dj-week small{font-size:12.5px;line-height:1.2}
.dj-key i{display:block;border-radius:4px}
.dj-week i.lv0{background:rgba(255,255,255,.45)}
.dj-chart .dj-week i.lv1,.dj-key i.lv1{background:#36E58C}
.dj-chart .dj-week i.lv2,.dj-key i.lv2{background:#FFC53D}
.dj-chart .dj-week i.lv3,.dj-key i.lv3{background:#FF2E88}
.t-lime .dj-hbar i{background:#0B1A0F}
.dj-key{display:flex;gap:14px;font-size:12px;font-weight:700}
.dj-key span{display:flex;align-items:center;gap:6px}
.dj-key i{width:12px;height:12px;border-radius:4px}
.dj-ladder{display:flex;flex-direction:column;gap:10px}
.dj-ladder>div{display:grid;grid-template-columns:58px 1fr 54px;align-items:center;gap:10px}
.dj-ladder b{text-align:right;font-size:14px}
.dj-hbar{height:22px;border-radius:8px;background:rgba(255,255,255,.14);overflow:hidden}
.dj-hbar i{display:block;height:100%;border-radius:8px;background:linear-gradient(90deg,#D9FF3F,#36E58C)}
.dj-unit{margin:0;font-size:12.5px;opacity:.85}
.dj-foot{display:flex;flex-direction:column;gap:10px;align-items:flex-start}
.dj-foot p{margin:0;color:var(--x-muted);font-size:14.5px;line-height:1.45}
.x-reel-info .dj-reel-link{display:inline-flex;align-items:center;align-self:flex-start;width:auto;min-height:40px;padding:0 16px;margin:4px 0 0;text-decoration:none}
.x-reel.kind-meme .x-reel-media,.x-reel.kind-chart .x-reel-media{padding:78px 64px 170px 14px}
.x-reel.kind-meme,.x-reel.kind-chart{background:radial-gradient(120% 80% at 20% 0%,#2A1650 0%,#0A0A0C 70%)}
`;
if (typeof document !== 'undefined' && !document.getElementById('dj-css')) {
  const s = document.createElement('style');
  s.id = 'dj-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}
