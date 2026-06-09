'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    __volumePage?: (dir: 'up' | 'down') => void;
  }
}

// Pages the viewport by ~85% of its height with no animation (e-ink safe).
// The native Android shell calls window.__volumePage on volume key presses;
// PageUp/PageDown work everywhere for testing in a browser.
export function PageScroll() {
  useEffect(() => {
    const page = (dir: 'up' | 'down') => {
      const step = Math.round(window.innerHeight * 0.85);
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
