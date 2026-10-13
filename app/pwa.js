/* Offline app layer: install, offline status, backups and persistent storage. Not used in the web preview. */
(function () {
  'use strict';
  const app = window.MotionPlusApp;
  const header = document.querySelector('header.top');

  // ---------- status bar ----------
  const bar = document.createElement('div');
  bar.className = 'appbar';
  bar.innerHTML =
    '<span class="chip" id="netChip"></span>' +
    '<span class="muted" id="appMsg"></span>' +
    '<span class="btns"><button class="btn small" type="button" id="installBtn" hidden>Install app</button>' +
    '<button class="btn small primary" type="button" id="updateBtn" hidden>Update now</button></span>';
  header.insertAdjacentElement('afterend', bar);
  const style = document.createElement('style');
  style.textContent =
    '.appbar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:14px}' +
    '.appbar .btns{margin-left:auto}' +
    '@media (display-mode: standalone){#installBtn{display:none!important}}';
  document.head.appendChild(style);

  const chip = document.getElementById('netChip');
  const msg = document.getElementById('appMsg');
  function net() {
    const on = navigator.onLine;
    chip.className = 'chip ' + (on ? 'measured' : 'estimated');
    chip.textContent = on ? 'Online' : 'Offline';
  }
  window.addEventListener('online', net);
  window.addEventListener('offline', net);
  net();

  // ---------- service worker ----------
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then((reg) => {
      const offerUpdate = (worker) => {
        const btn = document.getElementById('updateBtn');
        btn.hidden = false;
        msg.textContent = 'A new version is ready.';
        btn.onclick = () => worker.postMessage('skipWaiting');
      };
      if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        w.addEventListener('statechange', () => {
          if (w.state === 'installed') {
            if (navigator.serviceWorker.controller) offerUpdate(w);
            else msg.textContent = 'Ready to use offline.';
          }
        });
      });
    }).catch(() => { msg.textContent = 'Offline mode is not available in this browser.'; });
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded) return;
      reloaded = true;
      location.reload();
    });
  }

  // ---------- install ----------
  let deferred = null;
  const installBtn = document.getElementById('installBtn');
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    installBtn.hidden = false;
  });
  installBtn.onclick = async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    deferred = null;
    installBtn.hidden = true;
  };
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (ios && !standalone) msg.textContent = 'To install: tap Share, then Add to Home Screen.';

  // ---------- keep saved results ----------
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  // ---------- backup and restore ----------
  const row = document.getElementById('histBtns');
  const dl = document.createElement('button');
  dl.className = 'btn small'; dl.type = 'button'; dl.id = 'backupBtn'; dl.textContent = 'Download backup';
  const upLabel = document.createElement('label');
  upLabel.className = 'btn small'; upLabel.setAttribute('for', 'restoreInput'); upLabel.textContent = 'Restore backup';
  upLabel.tabIndex = 0;
  const up = document.createElement('input');
  up.type = 'file'; up.id = 'restoreInput'; up.accept = 'application/json,.json'; up.hidden = true;
  row.prepend(dl, upLabel, up);

  dl.onclick = () => {
    const records = app.load();
    const blob = new Blob([JSON.stringify({ app: 'motionplus-vo2', version: 1, exported_at: new Date().toISOString(), records }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'motionplus-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    app.note('Backup of ' + records.length + ' records downloaded. It contains health data, so store it securely.');
  };

  up.onchange = () => {
    const file = up.files && up.files[0];
    if (!file) return;
    file.text().then((txt) => {
      const merged = mergeBackup(app.load(), JSON.parse(txt));
      if (!app.persist(merged.records)) throw new Error('storage');
      app.renderHist();
      app.note('Restored ' + merged.added + ' new record' + (merged.added === 1 ? '' : 's') + '.' + (merged.skipped ? ' Skipped ' + merged.skipped + ' already saved or unreadable.' : ''));
    }).catch((e) => {
      app.note(e.message === 'storage' ? 'This browser blocked storage, so nothing was restored.' : 'That file is not a MotionPlus backup. Nothing was changed.');
    }).finally(() => { up.value = ''; });
  };

  function mergeBackup(current, backup) {
    if (!backup || backup.app !== 'motionplus-vo2' || !Array.isArray(backup.records)) throw new Error('format');
    const key = (r) => r.at + '|' + r.athlete_id + '|' + (r.result && r.result.protocol_id);
    const seen = new Set(current.map(key));
    let added = 0;
    let skipped = 0;
    const out = current.slice();
    backup.records.forEach((r) => {
      const valid = r && typeof r.at === 'string' && r.result && typeof r.result.relative_ml_kg_min === 'number' && typeof r.result.protocol_id === 'string';
      if (!valid || seen.has(key(r))) { skipped++; return; }
      seen.add(key(r)); out.push(r); added++;
    });
    out.sort((a, b) => (a.at < b.at ? 1 : -1));
    return { records: out, added, skipped };
  }
})();
