// Hash routing shared by every shell. Page changes run inside a view transition, so screens
// fade and rise like a native app; phones that ask for reduced motion get an instant change.
export function parse() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, query] = raw.split('?');
  return { path, parts: path.split('/').filter(Boolean), query: new URLSearchParams(query || '') };
}

const subs = new Set();
const calm = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function changed() {
  const next = parse();
  const apply = () => { subs.forEach((fn) => fn(next)); window.scrollTo(0, 0); };
  if (!document.startViewTransition || calm() || document.hidden) return apply();
  // Preact renders on a microtask; the timeout lets the new screen paint before the transition captures it.
  document.startViewTransition(() => { apply(); return new Promise((r) => setTimeout(r, 0)); });
}

export function onRoute(fn) {
  if (!subs.size) window.addEventListener('hashchange', changed);
  subs.add(fn);
  return () => { subs.delete(fn); if (!subs.size) window.removeEventListener('hashchange', changed); };
}
