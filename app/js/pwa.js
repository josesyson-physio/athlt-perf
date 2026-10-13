// Offline layer: service worker, update prompt, install prompt and connection status.
import { html, useState, useEffect } from './vendor/preact-htm.js';
import { toast } from './ui.js';

let installEvent = null;
const installListeners = new Set();
export function canInstall() { return !!installEvent; }
export function onInstallChange(fn) { installListeners.add(fn); return () => installListeners.delete(fn); }
export async function promptInstall() {
  if (!installEvent) return;
  installEvent.prompt();
  await installEvent.userChoice;
  installEvent = null;
  installListeners.forEach((f) => f());
}
export const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
export const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

export function initPwa() {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvent = e; installListeners.forEach((f) => f()); });
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  navigator.serviceWorker.register('sw.js').then((reg) => {
    const offer = (w) => {
      toast('A new version is ready. Reloading to update…');
      setTimeout(() => w.postMessage('skipWaiting'), 1500);
    };
    if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w.addEventListener('statechange', () => {
        if (w.state !== 'installed') return;
        if (navigator.serviceWorker.controller) offer(w);
        else toast('Ready to use offline.');
      });
    });
  }).catch(() => {});
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded) { reloaded = true; location.reload(); } });
}

export function NetStatus() {
  const [on, setOn] = useState(navigator.onLine);
  useEffect(() => {
    const u = () => setOn(navigator.onLine);
    window.addEventListener('online', u);
    window.addEventListener('offline', u);
    return () => { window.removeEventListener('online', u); window.removeEventListener('offline', u); };
  }, []);
  return on ? null : html`<span class="pill estimated" title="Everything still works and saves on this device">Offline</span>`;
}
