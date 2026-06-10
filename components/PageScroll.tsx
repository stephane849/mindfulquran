'use client';

import { useEffect } from 'react';
import { pageDelta } from '@/lib/paging';

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

// Pages the viewport with exact one-line overlap in mushaf mode (see
// lib/paging.ts) or 85% of the reading area in card mode. When already at
// the bottom, fires mindful:advance to move to the next section; when
// already at the top, fires mindful:retreat for the previous section. The
// native Android shell calls window.__volumePage on volume key presses;
// PageUp/PageDown work in a browser for testing.
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
      window.scrollBy({ top: pageDelta(dir), behavior: 'instant' });
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
