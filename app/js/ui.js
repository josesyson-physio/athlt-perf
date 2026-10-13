// Shared UI pieces: icons, form fields, labels, charts and small helpers.
import { html, useState, useEffect } from './vendor/preact-htm.js';

export { html };

// ---------- helpers ----------
export const has = (v) => v !== null && v !== undefined && v !== '';
export function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
export const initials = (name) => (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
export const go = (path) => { location.hash = '#' + path; };
export const fmt = (v, dp) => (v == null || v === '' ? '—' : typeof v === 'number' ? v.toFixed(dp == null ? (Number.isInteger(v) ? 0 : 1) : dp) : String(v));

// ---------- toast ----------
let toastSet = null;
export function toast(msg) { if (toastSet) toastSet(msg); }
export function Toast() {
  const [msg, setMsg] = useState('');
  useEffect(() => { toastSet = (m) => { setMsg(m); clearTimeout(toastSet.t); toastSet.t = setTimeout(() => setMsg(''), 2800); }; }, []);
  return msg ? html`<div class="toast" role="status">${msg}</div>` : null;
}

// ---------- icons (24px stroke) ----------
const P = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  users: 'M16 20v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 20v-1a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  clipboard: 'M9 4h6v3H9zM9 5H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-3M9 12h6M9 16h4',
  file: 'M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8zM14 3v5h5M9 13h6M9 17h6',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  book: 'M4 4h10a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4zM18 20a2 2 0 0 0 2-2V6',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z',
  pulse: 'M3 12h4l3-8 4 16 3-8h4',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
  dumbbell: 'M6 6v12M18 6v12M3 9v6M21 9v6M6 12h12',
  move: 'M5 19c2-6 5-9 9-10M14 5l3 4-4 2M7 21l3-5',
  balance: 'M12 3v18M5 7h14M5 7l-3 6a3 3 0 0 0 6 0zM19 7l-3 6a3 3 0 0 0 6 0z',
  plus: 'M12 5v14M5 12h14',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3',
  check: 'M20 6L9 17l-5-5',
  alert: 'M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  info: 'M12 16v-4M12 8h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z',
  trend: 'M23 6l-9.5 9.5-5-5L1 18M17 6h6v6',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  back: 'M15 18l-6-6 6-6',
  next: 'M9 18l6-6-6-6',
  print: 'M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
  sparkle: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 17l.7 1.8 1.8.7-1.8.7L19 22l-.7-1.8-1.8-.7 1.8-.7z',
  scale: 'M12 3v18M3 7h18M7 21h10M6 7l-3 7h6zM18 7l-3 7h6z',
};
export function Icon({ name, size }) {
  const s = size || 18;
  return html`<svg width=${s} height=${s} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d=${P[name] || P.info} /></svg>`;
}

// ---------- labels ----------
const STATUS = { draft: 'Draft', calculated: 'Awaiting sign-off', approved: 'Signed off' };
export const StatusPill = ({ status }) => html`<span class="pill ${status}">${STATUS[status] || status}</span>`;
const EVIDENCE = { measured: ['measured', 'Measured'], calculated: ['calc', 'Calculated'], estimated: ['estimated', 'Estimated'] };
export const EvidencePill = ({ label }) => {
  const e = EVIDENCE[label] || ['draft', label];
  return html`<span class="pill ${e[0]}">${e[1]}</span>`;
};
export function Notice({ kind, children }) {
  const icon = kind === 'danger' || kind === 'warn' ? 'alert' : kind === 'good' ? 'check' : 'info';
  return html`<div class="notice ${kind || ''}" role=${kind === 'danger' ? 'alert' : null}><${Icon} name=${icon} size=${16} /><div>${children}</div></div>`;
}

// ---------- fields ----------
let uid = 0;
export function Field({ label, unit, hint, warn, type, value, onInput, min, max, step, options, placeholder, required, id, rows }) {
  const [fid] = useState(() => id || 'f' + ++uid);
  const outOfRange = type === 'number' && has(value) && ((min != null && Number(value) < min) || (max != null && Number(value) > max));
  const handle = (e) => onInput(type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value);
  let control;
  if (options) control = html`<select id=${fid} value=${value ?? ''} onChange=${handle} required=${required}>${options.map((o) => (typeof o === 'string' ? html`<option value=${o}>${o || 'Choose'}</option>` : html`<option value=${o.value}>${o.label}</option>`))}</select>`;
  else if (type === 'textarea') control = html`<textarea id=${fid} rows=${rows || 3} value=${value ?? ''} onInput=${handle} placeholder=${placeholder}></textarea>`;
  else control = html`<input id=${fid} type=${type || 'text'} inputmode=${type === 'number' ? 'decimal' : null} step=${step || (type === 'number' ? 'any' : null)} value=${value ?? ''} onInput=${handle} placeholder=${placeholder} required=${required} />`;
  return html`<label class="field" for=${fid}>
    <span>${label}${required ? ' *' : ''}</span>
    <div class="inp ${outOfRange || warn ? 'warn' : ''}">${control}${unit ? html`<span class="u">${unit}</span>` : null}</div>
    ${outOfRange ? html`<span class="err">Outside the usual range (${min} to ${max} ${unit || ''}). Check the value and units.</span>` : warn ? html`<span class="err">${warn}</span>` : hint ? html`<span class="hint">${hint}</span>` : null}
  </label>`;
}

export function Check({ label, checked, onChange, id }) {
  const [fid] = useState(() => id || 'c' + ++uid);
  return html`<label class="check" for=${fid}><input id=${fid} type="checkbox" checked=${!!checked} onChange=${(e) => onChange(e.target.checked)} /><span>${label}</span></label>`;
}

export function Seg({ value, options, onChange, label }) {
  return html`<div class="seg" role="group" aria-label=${label}>${options.map((o) => html`<button type="button" aria-pressed=${String(value === o.value)} disabled=${o.disabled} onClick=${() => onChange(o.value)}>${o.label}</button>`)}</div>`;
}

export function Trials({ label, unit, values, onChange, min, max, count }) {
  const n = count || values.length;
  const vals = Array.from({ length: n }, (_, i) => values[i] ?? '');
  return html`<div class="field"><span>${label}</span><div class="trials">${vals.map((v, i) => html`<${Field} label=${'Trial ' + (i + 1)} unit=${unit} type="number" min=${min} max=${max} value=${v} onInput=${(x) => { const next = vals.slice(); next[i] = x; onChange(next); }} />`)}</div></div>`;
}

export function Empty({ icon, title, text, children }) {
  return html`<div class="empty"><${Icon} name=${icon || 'info'} size=${28} /><h3>${title}</h3>${text ? html`<p>${text}</p>` : null}${children}</div>`;
}

// ---------- line chart ----------
const COLORS = ['var(--teal)', 'var(--blue)', 'var(--violet)', 'var(--green)', 'var(--amber)'];
export function LineChart({ series, height, unit }) {
  const pts = series.flatMap((s) => s.points);
  if (!pts.length) return html`<p class="muted small">Not enough data to draw a trend yet.</p>`;
  const W = 640, H = height || 220, L = 44, R = 12, T = 12, B = 28;
  const xs = pts.map((p) => +new Date(p.x)), ys = pts.map((p) => p.y);
  let x0 = Math.min(...xs), x1 = Math.max(...xs);
  if (x0 === x1) { x0 -= 864e5 * 15; x1 += 864e5 * 15; }
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  const pad = (y1 - y0) * 0.15 || Math.abs(y1) * 0.1 || 1;
  y0 -= pad; y1 += pad;
  const sx = (x) => L + ((x - x0) / (x1 - x0)) * (W - L - R);
  const sy = (y) => T + (1 - (y - y0) / (y1 - y0)) * (H - T - B);
  const ticks = Array.from({ length: 4 }, (_, i) => y0 + ((y1 - y0) * i) / 3);
  const nx = Math.max(2, Math.min(5, new Set(xs).size));
  const xt = Array.from({ length: nx }, (_, i) => x0 + ((x1 - x0) * i) / (nx - 1));
  const dec = y1 - y0 < 10 ? 1 : 0;
  return html`<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label=${'Trend chart' + (unit ? ' in ' + unit : '')}>
    ${ticks.map((t) => html`<line x1=${L} x2=${W - R} y1=${sy(t)} y2=${sy(t)} stroke="var(--line)" stroke-width="1" /><text x=${L - 6} y=${sy(t) + 3} text-anchor="end">${t.toFixed(dec)}</text>`)}
    ${xt.map((t, i) => html`<text x=${sx(t)} y=${H - 8} text-anchor=${i === 0 ? "start" : i === xt.length - 1 ? "end" : "middle"}>${new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</text>`)}
    ${series.map((s, i) => {
      const c = s.color || COLORS[i % COLORS.length];
      const sorted = s.points.slice().sort((a, b) => +new Date(a.x) - +new Date(b.x));
      const d = sorted.map((p, j) => (j ? 'L' : 'M') + sx(+new Date(p.x)).toFixed(1) + ' ' + sy(p.y).toFixed(1)).join(' ');
      return html`<g><path d=${d} fill="none" stroke=${c} stroke-width="2.2" stroke-linejoin="round" />
        ${sorted.map((p, j) => html`<circle cx=${sx(+new Date(p.x))} cy=${sy(p.y)} r=${j === sorted.length - 1 ? 4.5 : 3} fill=${j === sorted.length - 1 ? c : 'var(--panel)'} stroke=${c} stroke-width="2"><title>${fmtDate(p.x)}: ${p.y} ${unit || ''}</title></circle>`)}</g>`;
    })}
  </svg>${series.length > 1 ? html`<div class="legend">${series.map((s, i) => html`<span><i style=${'background:' + (s.color || COLORS[i % COLORS.length])}></i>${s.name}</span>`)}</div>` : null}</div>`;
}

// Download a file. Works in the installed app and normal browsers.
export function downloadFile(name, text, type) {
  const blob = new Blob([text], { type: type || 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}
