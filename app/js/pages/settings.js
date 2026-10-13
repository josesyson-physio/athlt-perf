import { html, useState, useEffect } from '../vendor/preact-htm.js';
import { Icon, Field, Notice, toast, downloadFile } from '../ui.js';
import * as store from '../store.js';
import { loadExamples, removeExamples } from '../examples.js';
import { canInstall, onInstallChange, promptInstall, isIos, isStandalone } from '../pwa.js';

export function Settings() {
  const s = store.getState();
  const [name, setName] = useState(s.settings.assessorName || '');
  const [clinic, setClinic] = useState(s.settings.clinicName || '');
  const [confirm, setConfirm] = useState(false);
  const [msg, setMsg] = useState('');
  const [, force] = useState(0);
  useEffect(() => onInstallChange(() => force((n) => n + 1)), []);
  const hasExamples = s.athletes.some((a) => a.example);

  const backup = () => {
    downloadFile('motionplus-backup-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(store.exportData(), null, 2));
    setMsg('Backup downloaded. It contains health data, so store it securely.');
  };
  const restore = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const r = await store.importData(JSON.parse(await file.text()));
      setMsg('Restored ' + r.added + ' records.' + (r.skipped ? ' Skipped ' + r.skipped + ' already here or unreadable.' : ''));
    } catch (err) {
      setMsg('That file is not a MotionPlus backup. Nothing was changed.');
    }
  };

  return html`<div class="head"><div><div class="eyebrow">Settings</div><h1>Settings and data</h1><p>Your details, backups and how this app stores records.</p></div></div>
  <div class="grid cols-2">
    <div class="card"><h2>You and your clinic</h2>
      <div class="fields"><${Field} label="Your name and role" value=${name} onInput=${setName} placeholder="Dr. A. Kumar, Physiotherapist" /><${Field} label="Clinic name (shown on reports)" value=${clinic} onInput=${setClinic} /></div>
      <div><button class="btn primary" onClick=${async () => { await store.saveSettings({ assessorName: name.trim(), clinicName: clinic.trim() }); toast('Settings saved.'); }}>Save</button></div>
    </div>
    <div class="card"><h2>Install the app</h2>
      ${isStandalone() ? html`<${Notice} kind="good">MotionPlus is installed on this device and works offline.</${Notice}>`
      : canInstall() ? html`<p class="muted small">Install MotionPlus to open it from your home screen and use it with no signal.</p><div><button class="btn primary" onClick=${promptInstall}><${Icon} name="download" size=${16} />Install app</button></div>`
      : isIos() ? html`<p class="muted small">On iPhone or iPad: tap Share, then Add to Home Screen.</p>`
      : html`<p class="muted small">Use your browser’s menu and choose Install app or Add to Home Screen. Once opened online, the app keeps working offline.</p>`}
    </div>
    <div class="card"><h2>Backup and restore</h2>
      <p class="muted small">Records are stored only in this browser on this device (${s.athletes.length} athletes, ${s.assessments.length} assessments). Download a backup regularly, and use it to move records to another device.</p>
      <div class="row"><button class="btn" onClick=${backup}><${Icon} name="download" size=${16} />Download backup</button>
        <label class="btn" for="restoreFile" tabindex="0"><${Icon} name="upload" size=${16} />Restore from backup</label><input id="restoreFile" type="file" accept="application/json,.json" hidden onChange=${restore} /></div>
      ${msg ? html`<p class="small" role="status">${msg}</p>` : null}
    </div>
    <div class="card"><h2>Example data</h2>
      <p class="muted small">Three invented athletes with assessment history, for trying the app or showing it to colleagues.</p>
      <div>${hasExamples ? html`<button class="btn" onClick=${async () => { await removeExamples(); toast('Example data removed.'); }}>Remove example data</button>` : html`<button class="btn" onClick=${async () => { await loadExamples(); toast('Example athletes loaded.'); }}>Load example data</button>`}</div>
    </div>
    <div class="card"><h2>Privacy and limits</h2><ul class="small muted" style="margin:0;padding-left:18px;display:grid;gap:4px">
      <li>No account, server or tracking. Nothing leaves this device unless you download a backup.</li>
      <li>Anyone who can open this browser can see the records. Use a device passcode.</li>
      <li>Observations are drafted by fixed rules, not an AI model. They never add numbers.</li>
      <li>Cloud accounts, shared clinic records and AI-written report text need a secure server and are planned for later.</li></ul></div>
    <div class="card"><h2>Delete all records</h2><p class="muted small">Removes every athlete and assessment from this device. Download a backup first if you may need them.</p>
      ${confirm ? html`<div class="row"><button class="btn danger" onClick=${async () => { await store.clearAll(); setConfirm(false); toast('All records deleted from this device.'); }}>Delete everything</button><button class="btn ghost" onClick=${() => setConfirm(false)}>Cancel</button></div>` : html`<div><button class="btn danger" onClick=${() => setConfirm(true)}><${Icon} name="trash" size=${16} />Delete all records</button></div>`}</div>
  </div>`;
}
