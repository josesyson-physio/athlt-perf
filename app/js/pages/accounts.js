// Account rows shared by the athlete and coach "Me" pages: switching to another account on a
// shared phone (a real account asks for its own password), and a personal backup and restore.
import { html, useState } from '../vendor/preact-htm.js';
import { go, toast, downloadFile } from '../ui.js';
import { XIcon, XField, initial } from '../xui.js';
import * as store from '../store.js';
import { switchTo, switchWithPassword, needsPassword, ROLES } from '../session.js';
import { today } from '../monitor.js';

export function OtherAccounts({ others }) {
  const [open, setOpen] = useState(null);
  const [pw, setPw] = useState('');
  const [bad, setBad] = useState(false);
  if (!others.length) return null;
  const pick = (o) => {
    if (!needsPassword(o)) { switchTo(o.id); go('/'); return; }
    setOpen(open === o.id ? null : o.id); setPw(''); setBad(false);
  };
  const submit = async (e) => {
    e.preventDefault();
    if (await switchWithPassword(open, pw)) { setOpen(null); go('/'); } else setBad(true);
  };
  return html`<div class="x-section">Other accounts on this phone</div>
    <div class="x-list">${others.map((o) => html`<div>
      <button class="x-row" type="button" style="width:100%" aria-expanded=${needsPassword(o) ? String(open === o.id) : null} onClick=${() => pick(o)}><span class="x-avatar soft">${initial(o.name)}</span><div class="grow"><b>${o.name}</b><span class="x-small x-muted">${ROLES[o.role]}${o.example ? ' · demo' : ''}</span></div><span class="x-chev"><${XIcon} name="swap" size=${18} /></span></button>
      ${open === o.id ? html`<form class="sg-switch-pw" onSubmit=${submit} novalidate>
        <${XField} label=${'Password for ' + o.name} type="password" value=${pw} onInput=${(v) => { setPw(v); setBad(false); }} autocomplete="current-password" invalid=${bad} />
        ${bad ? html`<div class="x-err" role="alert">That password doesn't match.</div>` : null}
        <button class="x-btn sm" type="submit">Switch account</button>
      </form>` : null}
    </div>`)}</div>
    <p class="x-small x-dim" style="padding:0 4px">Each person's records stay private. Switching to someone else's account needs their password.</p>`;
}

// Reads a backup file and adds what isn't on this phone yet. Nothing already here is overwritten.
export async function restoreFile(file) {
  try {
    const r = await store.importData(JSON.parse(await file.text()));
    toast('Restored ' + r.added + ' records' + (r.skipped ? '. ' + r.skipped + ' were already here.' : '.'));
    return true;
  } catch (e) {
    toast("That file isn't a Sportgram backup.");
    return false;
  }
}

export function RestoreButton({ label, onDone }) {
  return html`<label class="x-row" style="cursor:pointer"><span class="x-badge"><${XIcon} name="up" size=${18} /></span><div class="grow"><b>${label || 'Restore from a backup'}</b><span class="x-small x-muted">Pick a Sportgram backup file. Nothing on this phone is overwritten.</span></div>
    <input type="file" accept="application/json,.json" class="sg-file" onChange=${async (e) => { const f = e.target.files[0]; e.target.value = ''; if (f && (await restoreFile(f)) && onDone) onDone(); }} /></label>`;
}

export function BackupRows({ user }) {
  const key = 'sg-backup-' + user.id;
  let last = null;
  try { last = localStorage.getItem(key); } catch (e) { last = null; }
  const days = last ? Math.floor((Date.parse(today()) - Date.parse(last)) / 864e5) : null;
  const save = () => {
    downloadFile('sportgram-' + user.name.split(' ')[0].toLowerCase() + '-' + today() + '.json', JSON.stringify(store.exportFor(user.id), null, 1));
    try { localStorage.setItem(key, today()); } catch (e) { /* private mode */ }
    toast('Backup saved to your downloads. Keep it somewhere safe.');
  };
  return html`<button class="x-row" type="button" onClick=${save}><span class=${'x-badge' + (days == null || days > 14 ? ' watch' : '')}><${XIcon} name="share" size=${18} /></span><div class="grow"><b>Download my backup</b><span class="x-small x-muted">${days == null ? 'Your records live only on this phone. Save a copy now.' : days === 0 ? 'Saved today. Only your own records are included.' : 'Last saved ' + days + (days === 1 ? ' day' : ' days') + ' ago. Only your own records are included.'}</span></div></button>
    <${RestoreButton} />`;
}
