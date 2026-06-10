'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    __volumePage?: (dir: 'up' | 'down') => void;
    __readerEndState?: {
      source: string;
      id: number;
      done: boolean;
      maxId: number;
    };
  }
}

// One-line overlap step: the last visible line becomes the first on the next
// page. Android WebView returns lineHeight as a unitless string ("2.4"), so
// multiply by fontSize to convert to pixels when needed.
function getStep(): number {
  const p = document.querySelector('p.font-arabic') as HTMLElement | null;
  if (p) {
    const cs = getComputedStyle(p);
    let lh = parseFloat(cs.lineHeight);
    if (lh > 0 && lh <= 4) lh = lh * parseFloat(cs.fontSize); // unitless → px
    if (lh > 4) return Math.max(lh, window.innerHeight - lh);
  }
  return Math.round(window.innerHeight * 0.85);
}

// Pages the viewport with one-line overlap (mushaf mode) or 85% (card mode).
// When already at the bottom, fires mindful:advance to move to the next
// section; when already at the top, fires mindful:retreat for the previous
// section. The native Android shell calls window.__volumePage on volume key
// presses; PageUp/PageDown work in a browser for testing.
export function PageScroll() {
  useEffect(() => {
    const page = (dir: 'up' | 'down') => {
      if (dir === 'down') {
        const atBottom =
          window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
        if (atBottom && window.__readerEndState?.done) {
          window.dispatchEvent(new CustomEvent('mindful:advance'));
          return;
        }
      } else {
        const atTop = window.scrollY <= 4;
        if (atTop && window.__readerEndState) {
          window.dispatchEvent(new CustomEvent('mindful:retreat'));
          return;
        }
      }
      const step = getStep();
      window.scrollBy({ top: dir === 'down' ? step : -step, behavior: 'instant' });
    };

    window.__volumePage = page;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'PageDown') {
        e.preventDefault();
        page('down');
      } else if (e.key === 'PageUp') {
        e.preventDefault();
        page('up');
      }
    };
    window.addEventListener('keydown', onKey);

    return () => {
      delete window.__volumePage;
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  return null;
}
