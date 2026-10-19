// App shell: hash router, navigation and data subscription.
import { html, render, useState, useEffect } from './vendor/preact-htm.js';
import * as store from './store.js';
import { Toast } from './ui.js';
import { initPwa } from './pwa.js';
import { initAccess } from './access.js';
import { Welcome, SignUp, SignIn } from './pages/welcome.js';
import { AthleteApp } from './pages/athlete.js';
import { CoachApp, COACH_PATHS } from './pages/coach.js';
import { me, isCoachRole } from './session.js';
import { Logo } from './logo.js';
import { parse, onRoute } from './route.js';

const Loading = () => html`<div class="x"><div class="x-page plain" style="align-items:center;justify-content:center;min-height:80vh"><${Logo} size=${72} animate=${true} /></div></div>`;

// The coach workspace is a separate download, fetched the first time a coach opens it.
let proModule = null;
function Pro() {
  const [mod, setMod] = useState(proModule);
  useEffect(() => { if (!mod) import('./pro.js').then((m) => { proModule = m; setMod(m); }); }, []);
  return mod ? html`<${mod.App} />` : html`<${Loading} />`;
}

// Signed out: welcome and sign-in. Athletes: the athlete app. Coaches: the coach app, with the
// assessment tools in the full workspace below.
function Root() {
  const [r, setR] = useState(parse());
  const [, setTick] = useState(0);
  useEffect(() => {
    const off = onRoute(setR);
    const unsub = store.subscribe(() => setTick((t) => t + 1));
    setTick((t) => t + 1);
    return () => { off(); unsub(); };
  }, []);
  const s = store.getState();
  if (!s.ready) return html`<${Loading} />`;
  const u = me();
  const [a, b] = r.parts;
  let view;
  if (!u) {
    view = a === 'join' ? html`<${SignUp} key=${b} role=${b === 'athlete' ? 'athlete' : 'coach'} />` : a === 'signin' ? html`<${SignIn} />` : html`<${Welcome} />`;
    view = html`<div class="x">${view}</div>`;
  } else if (!isCoachRole(u.role)) view = html`<${AthleteApp} r=${r} />`;
  else if (COACH_PATHS.includes(a || '')) view = html`<${CoachApp} r=${r} />`;
  else return html`<${Pro} />`;
  document.body.dataset.ui = 'x';
  return html`${view}<${Toast} />`;
}

render(html`<${Root} />`, document.getElementById('root'));
store.init();
initPwa();
initAccess();
