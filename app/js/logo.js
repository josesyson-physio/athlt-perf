// The Sportgram logo: a running track with lanes for every athlete. The outer lane has a gap
// and the yellow dot (the athlete) fills it. `animate` plays the short intro on the sign-in screens.
import { html } from './vendor/preact-htm.js';

let n = 0;
const TRACK = 'M198 150H314A106 106 0 0 1 314 362H198A106 106 0 0 1 198 150Z';

export function Logo({ size, animate, flat }) {
  const id = 'sg' + (++n);
  return html`<svg class=${'sg-logo' + (animate ? ' anim' : '')} width=${size || 40} height=${size || 40} viewBox="0 0 512 512" role="img" aria-label="Sportgram">
    <defs><linearGradient id=${id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3D2BE8" /><stop offset=".55" stop-color="#B23CF0" /><stop offset="1" stop-color="#FF3D7F" /></linearGradient></defs>
    ${flat ? null : html`<rect class="sg-bg" width="512" height="512" rx="116" fill=${'url(#' + id + ')'} />`}
    <g class="sg-l3"><rect x="196" y="236" width="120" height="40" rx="20" fill="none" stroke="#FFE066" stroke-width="18" /></g>
    <g class="sg-l2"><rect x="148" y="200" width="216" height="112" rx="56" fill="none" stroke="#FFB8D2" stroke-width="22" /></g>
    <g class="sg-l1"><path d=${TRACK} fill="none" stroke="#fff" stroke-width="40" stroke-linecap="round" pathLength="100" stroke-dasharray="90 10" stroke-dashoffset="-19" /></g>
    <g class="sg-dot"><circle cx="358" cy="160" r="31" fill="#FFE066" /></g>
  </svg>`;
}

export function Wordmark({ size, sub, animate, light }) {
  return html`<div class=${'sg-word' + (animate ? ' anim' : '') + (light ? ' light' : '')} style=${'font-size:' + (size || 22) + 'px'}><b>Sportgram</b>${sub ? html`<span>${sub}</span>` : null}</div>`;
}

export const TAGLINE = 'Every athlete. Every gap.';
