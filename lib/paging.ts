// Volume-button / scroll-rail paging — true page model.
//
// The page height is the largest whole multiple of one Arabic line that fits
// below the sticky TopBar. Every page flip scrolls to an exact integer
// multiple of that height, so lines can never be cut at a page boundary and
// drift across successive flips is impossible.
//
// Android WebView returns lineHeight as a unitless string ("2.4"), so we
// multiply by fontSize to convert to pixels when needed.

function navBottom(): number {
  const nav = document.querySelector('nav.sticky') as HTMLElement | null;
  return nav ? nav.getBoundingClientRect().bottom : 64;
}

function mushafLineHeight(): number {
  const p = document.querySelector('p[data-mushaf]') as HTMLElement | null;
  if (!p) return 0;
  const cs = getComputedStyle(p);
  let lh = parseFloat(cs.lineHeight);
  if (lh > 0 && lh <= 4) lh *= parseFloat(cs.fontSize); // unitless → px (WebView)
  return lh > 4 ? lh : 0;
}

// Largest whole-line-count height that fits the reading area.
// Falls back to 85% of reading area in card/fallback mode.
// Exported so Reader can snap the resume position to the same grid.
export function getPageHeight(): number {
  const navH = navBottom();
  const availH = window.innerHeight - navH;
  const lh = mushafLineHeight();
  if (lh > 0 && lh < availH) {
    return Math.floor(availH / lh) * lh;
  }
  return Math.round(availH * 0.85);
}

// Signed scroll delta to reach the next/previous page.
// Uses absolute page indices so every page starts at an exact multiple of
// pageHeight — pressing volume always snaps back to the grid even if the
// reader was nudged slightly by a touch drag.
export function pageDelta(dir: 'up' | 'down'): number {
  const pH = getPageHeight();
  const currentIdx = Math.floor(window.scrollY / pH);
  const targetIdx = dir === 'down' ? currentIdx + 1 : Math.max(0, currentIdx - 1);
  return targetIdx * pH - window.scrollY;
}
