// Volume-button / scroll-rail paging.
//
// In mushaf mode the step is derived from the actual line grid of the Arabic
// paragraph under the probe point, so that:
//   - scrolling down puts the last fully visible line flush under the sticky
//     top bar (it becomes the first readable line of the new page), and
//   - scrolling up puts the first visible line flush at the viewport bottom.
// Each press re-measures the DOM, so rounding never accumulates drift.
// Falls back to 85% of the reading area when no mushaf paragraph is under
// the probe (card mode, surah dividers, search results…).

function readingTop(): number {
  // Bottom edge of the sticky TopBar — content above this line is covered.
  const nav = document.querySelector('nav.sticky');
  return nav ? nav.getBoundingClientRect().bottom : 0;
}

function mushafAt(y: number): HTMLElement | null {
  for (const el of document.elementsFromPoint(window.innerWidth / 2, y)) {
    const p = el.closest('p[data-mushaf]');
    if (p) return p as HTMLElement;
  }
  return null;
}

// Signed scroll delta for one page in the given direction (positive = down).
export function pageDelta(dir: 'up' | 'down'): number {
  const top = readingTop();
  const vh = window.innerHeight;
  const fallback = Math.round((vh - top) * 0.85);

  const p = mushafAt(dir === 'down' ? vh - 8 : top + 8);
  if (p) {
    const cs = getComputedStyle(p);
    let lh = parseFloat(cs.lineHeight);
    if (lh > 0 && lh <= 4) lh *= parseFloat(cs.fontSize); // unitless → px (WebView)
    if (lh > 4 && lh < vh - top) {
      const rect = p.getBoundingClientRect();
      const firstLineTop = rect.top + parseFloat(cs.paddingTop);
      const contentBottom = rect.bottom - parseFloat(cs.paddingBottom);
      if (dir === 'down') {
        // Last line that fits fully on screen (and inside this paragraph):
        // greatest k with firstLineTop + k·lh + lh ≤ min(vh, contentBottom).
        const k = Math.floor((Math.min(vh, contentBottom) - lh - firstLineTop) / lh);
        const delta = Math.round(firstLineTop + k * lh - top);
        if (k >= 0 && delta > 0) return delta;
      } else {
        // First line fully below the top bar; send it to the viewport bottom.
        const k = Math.max(0, Math.ceil((top - firstLineTop) / lh));
        const delta = Math.round(firstLineTop + k * lh - (vh - lh));
        if (delta < 0) return delta;
      }
    }
  }
  return dir === 'down' ? fallback : -fallback;
}
