// First screens: choose athlete or coach, create an account, or sign in.
import { html, useState } from '../vendor/preact-htm.js';
import { go } from '../ui.js';
import { XIcon, XField, XSeg } from '../xui.js';
import { signUp, signIn, signupErrors, ROLES } from '../session.js';
import { loadDemo } from '../demo.js';

const Mark = () => html`<div class="x-mark" aria-hidden="true"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"><path d="M12 3v18M6 8h4M4 12h6M7 16h3M14 8h4M14 12h6M14 16h3"/></svg></div>`;

export function Welcome() {
  const [busy, setBusy] = useState(false);
  return html`<div class="x-page plain">
    <div class="x-hero"><${Mark} />
      <h1>Find what's holding you back.</h1>
      <p class="x-sub" style="font-size:17px">Free tests with basic equipment, a daily pulse, and your coach in your pocket.</p>
    </div>
    <a class="x-choice" href="#/join/athlete"><span class="x-badge"><${XIcon} name="run" /></span><div style="flex:1"><b>I'm an athlete</b><span class="x-muted x-small">Track your body, beat your ghost, get plans.</span></div><span class="x-chev"><${XIcon} name="next" size=${18} /></span></a>
    <a class="x-choice" href="#/join/coach"><span class="x-badge"><${XIcon} name="team" /></span><div style="flex:1"><b>I'm a coach, trainer or physio</b><span class="x-muted x-small">Read reports, send plans, post to your team.</span></div><span class="x-chev"><${XIcon} name="next" size=${18} /></span></a>
    <a class="x-btn ghost" href="#/signin">I already have an account</a>
    <button class="x-btn soft" disabled=${busy} onClick=${async () => { setBusy(true); await loadDemo(); go('/'); }}>${busy ? 'Setting up the demo…' : 'Try the demo'}</button>
    <p class="x-small x-dim" style="text-align:center;padding:4px 8px">Accounts are kept on this phone for now. Online sign-in across phones is coming next.</p>
  </div>`;
}

const EVENTS = ['', 'Sprints (100 to 400 m)', 'Middle distance (800 to 1500 m)', 'Long distance', 'Hurdles', 'Jumps', 'Throws', 'Combined events', 'Race walking', 'Not sure yet'];

export function SignUp({ role }) {
  const athlete = role === 'athlete';
  const [f, setF] = useState({ role: athlete ? 'athlete' : 'coach', name: '', email: '', password: '', birthYear: '', sex: '', event: '', teamCode: '' });
  const [errs, setErrs] = useState([]);
  const set = (k) => (v) => setF(Object.assign({}, f, { [k]: v }));
  const submit = async (e) => {
    e.preventDefault();
    const er = signupErrors(f);
    setErrs(er);
    if (er.length) return;
    await signUp(f);
    go('/');
  };
  return html`<form class="x-page plain" onSubmit=${submit} novalidate>
    <div class="x-topbar"><a class="x-link" href="#/welcome"><${XIcon} name="back" size=${20} />Back</a></div>
    <div><h1 class="x-title">${athlete ? 'Join as an athlete' : 'Join as a coach'}</h1><p class="x-sub">${athlete ? 'Athletics first. More sports soon.' : 'Coaches, trainers and physios.'}</p></div>
    ${!athlete ? html`<div class="x-card"><span class="x-small x-muted" style="font-weight:600">I am a</span><${XSeg} label="Role" value=${f.role} onChange=${set('role')} options=${['coach', 'trainer', 'physio'].map((r) => ({ value: r, label: ROLES[r] }))} /></div>` : null}
    <div class="x-card" style="gap:14px">
      <${XField} label="Full name" value=${f.name} onInput=${set('name')} autocomplete="name" />
      <${XField} label="Email" type="email" value=${f.email} onInput=${set('email')} autocomplete="email" inputmode="email" />
      <${XField} label="Password" type="password" value=${f.password} onInput=${set('password')} autocomplete="new-password" />
    </div>
    ${athlete ? html`<div class="x-card" style="gap:14px">
      <${XField} label="Birth year" type="number" inputmode="numeric" value=${f.birthYear} onInput=${set('birthYear')} placeholder="2008" />
      <div class="x-field"><span>Sex (fitness equations use it)</span><${XSeg} label="Sex" value=${f.sex} onChange=${set('sex')} options=${[{ value: 'female', label: 'Female' }, { value: 'male', label: 'Male' }]} /></div>
      <${XField} label="Main event" value=${f.event} onInput=${set('event')} options=${EVENTS.map((e) => ({ value: e, label: e || 'Choose' }))} />
      <${XField} label="Team code from your coach (optional)" value=${f.teamCode} onInput=${(v) => set('teamCode')(v.toUpperCase())} placeholder="ABC234" />
    </div>` : null}
    ${errs.length ? html`<div class="x-err" role="alert">Please add ${errs.join(', ')}.</div>` : null}
    <button class="x-btn" type="submit">Create account</button>
    <p class="x-small x-dim" style="text-align:center">${athlete ? 'If you are under 18, show this app to a parent or guardian before you start.' : 'You will get a team code to give your athletes.'}</p>
  </form>`;
}

export function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [bad, setBad] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    const u = await signIn(email, password);
    if (!u) { setBad(true); return; }
    go('/');
  };
  return html`<form class="x-page plain" onSubmit=${submit} novalidate>
    <div class="x-topbar"><a class="x-link" href="#/welcome"><${XIcon} name="back" size=${20} />Back</a></div>
    <h1 class="x-title">Sign in</h1>
    <div class="x-card" style="gap:14px">
      <${XField} label="Email" type="email" value=${email} onInput=${setEmail} autocomplete="email" inputmode="email" />
      <${XField} label="Password" type="password" value=${password} onInput=${setPassword} autocomplete="current-password" />
    </div>
    ${bad ? html`<div class="x-err" role="alert">That email and password don't match an account on this phone.</div>` : null}
    <button class="x-btn" type="submit">Sign in</button>
  </form>`;
}
