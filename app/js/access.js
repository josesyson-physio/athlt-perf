// Comfort settings kept on this phone: large text, and swipe from the left edge to go back.
const KEY = 'sg-large';
export const isLarge = () => { try { return localStorage.getItem(KEY) === 'on'; } catch (e) { return false; } };
export function setLargeText(on) {
  try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) { /* this visit only */ }
  document.documentElement.classList.toggle('sg-large', !!on);
}

// A swipe that starts at the left edge and moves right goes back, like a native app.
// Pages with their own sideways swipes are left alone because the swipe must start at the edge.
export function initAccess() {
  document.documentElement.classList.toggle('sg-large', isLarge());
  let x0 = null, y0 = 0;
  addEventListener('touchstart', (e) => { const t = e.touches[0]; x0 = t.clientX <= 24 ? t.clientX : null; y0 = t.clientY; }, { passive: true });
  addEventListener('touchend', (e) => {
    if (x0 == null) return;
    const t = e.changedTouches[0], dx = t.clientX - x0, dy = Math.abs(t.clientY - y0);
    x0 = null;
    if (dx > 70 && dy < 50 && location.hash && location.hash !== '#/' && history.length > 1) history.back();
  }, { passive: true });
}
