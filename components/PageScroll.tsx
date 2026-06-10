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

// In mushaf mode, span[data-verse-key] gives us actual Arabic line-height so
// pressing down makes the last visible line the first line of the next page.
function getStep(): number {
  const el = document.querySelector('span[data-verse-key]') as HTMLElement | null;
  if (el) {
    const lh = parseFloat(getComputedStyle(el).lineHeight);
    if (lh > 4) return Math.max(lh, window.innerHeight - lh);
  }
  return Math.round(window.innerHeight * 0.85);
}

// Pages the viewport by ~85% of its height (card mode) or exactly one
// Arabic line short of the full viewport (mushaf mode) with no animation
// (e-ink safe). The native Android shell calls window.__volumePage on volume
// key presses; PageUp/PageDown work everywhere for testing in a browser.
export function PageScroll() {
  useEffect(() => {
    const page = (dir: 'up' | 'down') => {
      const step = getStep();
      window.scrollBy({ top: dir === 'down' ? step : -step, behavior: 'instant' });
      if (dir === 'down') {
        const atBottom =
          window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
        if (atBottom && window.__readerEndState?.done) {
          window.dispatchEvent(new CustomEvent('mindful:advance'));
        }
      }
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
