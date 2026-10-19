// Small building blocks for the athlete app and sign-in screens (styles in athlete.css).
import { html, useState } from './vendor/preact-htm.js';

const P = {
  today: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  tests: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  mirror: 'M12 3v18M5 7h5M3 12h7M6 17h4M14 7h5M14 12h7M14 17h4',
  feed: 'M4 4h16v16H4zM4 9h16M9 9v11',
  me: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c1-4 4-6 8-6s7 2 8 6',
  library: 'M4 19V5a1 1 0 0 1 1-1h4v16H5a1 1 0 0 1-1-1zM9 4h5v16H9zM14 6l4-1 3 14-4 1z',
  inbox: 'M3 13l3-8h12l3 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM3 13h5l1 3h6l1-3h5',
  post: 'M12 5v14M5 12h14',
  team: 'M16 20v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 20v-1a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  tools: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z',
  back: 'M15 18l-6-6 6-6',
  next: 'M9 6l6 6-6 6',
  up: 'M12 19V5M5 12l7-7 7 7',
  down: 'M12 5v14M5 12l7 7 7-7',
  check: 'M20 6L9 17l-5-5',
  alert: 'M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  star: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z',
  fire: 'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5z',
  clap: 'M7 11l4-6a1.5 1.5 0 0 1 2.5 1.6L11 11l5-6a1.5 1.5 0 0 1 2.4 1.8L14 13l3-2a1.5 1.5 0 0 1 1.7 2.4L13 19a5 5 0 0 1-7-1l-2-3a1.5 1.5 0 0 1 2.4-1.8z',
  strong: 'M13 2L4 14h7l-1 8 9-12h-7z',
  file: 'M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8zM14 3v5h5',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z',
  run: 'M13 4a2 2 0 1 0 4 0 2 2 0 0 0-4 0M5 21l4-6 3 2 1 4M9 15l1-5 4-2 3 4h3M10 10L7 9l-2 3',
  share: 'M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13',
  print: 'M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z',
  plus: 'M12 5v14M5 12h14',
  speaker: 'M11 5L6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14',
  timer: 'M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 10v4l2 2M9 2h6',
  stop: 'M6 6h12v12H6z',
  play: 'M7 4l13 8-13 8z',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  minus: 'M5 12h14',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3',
  trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  swap: 'M7 7h13M17 3l4 4-4 4M17 17H4M7 13l-4 4 4 4',
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  train: 'M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12',
  chat: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z',
  send: 'M22 2L11 13M22 2l-7 20-4-9-9-4z',
  comic: 'M3 4h8v7H3zM13 4h8v7h-8zM3 13h18v7H3z',
  slides: 'M3 5h18v12H3zM8 21h8M12 17v4',
  play: 'M7 4l13 8-13 8z',
  image: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M15 9h.01',
  mute: 'M11 5L6 9H3v6h3l5 4zM22 9l-6 6M16 9l6 6',
  sound: 'M11 5L6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13',
  userplus: 'M15 20v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM19 8v6M16 11h6',
  pin: 'M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  link: 'M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1',
};

export function XIcon({ name, size, fill }) {
  const s = size || 22;
  return html`<svg width=${s} height=${s} viewBox="0 0 24 24" fill=${fill ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d=${P[name] || P.check} /></svg>`;
}

export function XSeg({ value, options, onChange, label, wrap }) {
  return html`<div class=${'x-seg' + (wrap ? ' wrap' : '')} role="group" aria-label=${label}>${options.map((o) => html`<button type="button" aria-pressed=${String(value === o.value)} onClick=${() => onChange(o.value)}>${o.label}</button>`)}</div>`;
}

// A 1 to 5 scale with a word under each number.
export function XScale({ value, words, onChange, label }) {
  return html`<div class="x-scale" role="group" aria-label=${label}>${words.map((w, i) => html`<button type="button" aria-pressed=${String(value === i + 1)} onClick=${() => onChange(i + 1)}><b>${i + 1}</b>${w}</button>`)}</div>`;
}

export function XField({ label, value, onInput, type, placeholder, inputmode, autocomplete, rows, min, max, step, options, id }) {
  const [fid] = useState(() => id || 'xf' + Math.random().toString(36).slice(2, 8));
  const common = { id: fid, class: 'x-input', value: value ?? '', placeholder, autocomplete, inputmode };
  return html`<label class="x-field" for=${fid}><span>${label}</span>${
    options ? html`<select ...${common} onChange=${(e) => onInput(e.target.value)}>${options.map((o) => html`<option value=${typeof o === 'string' ? o : o.value}>${typeof o === 'string' ? o : o.label}</option>`)}</select>`
    : type === 'textarea' ? html`<textarea ...${common} rows=${rows || 4} onInput=${(e) => onInput(e.target.value)}></textarea>`
    : html`<input ...${common} type=${type || 'text'} min=${min} max=${max} step=${step} onInput=${(e) => onInput(e.target.value)} />`}</label>`;
}

export const firstName = (n) => String(n || '').trim().split(/\s+/)[0] || '';
export const initial = (n) => (String(n || '?').trim()[0] || '?').toUpperCase();
export function ago(iso) {
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + ' min ago';
  if (s < 86400) return Math.floor(s / 3600) + ' h ago';
  if (s < 172800) return 'yesterday';
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
