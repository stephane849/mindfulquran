'use client';

import { useEffect, useState } from 'react';

// Always-visible scroll rail per Mudita Mindful Design: thin track line on the
// right edge with a solid black thumb. Indicator only — volume buttons and
// swipes do the scrolling. Hidden when the page fits in the viewport.
export function ScrollBar() {
  const [thumb, setThumb] = useState<{ top: number; height: number } | null>(null);

  useEffect(() => {
    const PAD = 12;

    const update = () => {
      const total = document.documentElement.scrollHeight;
      const vh = window.innerHeight;
      if (total <= vh + 1) {
        setThumb(null);
        return;
      }
      const trackH = vh - PAD * 2;
      const height = Math.max(32, (vh / total) * trackH);
      const maxScroll = total - vh;
      const progress = Math.min(1, Math.max(0, window.scrollY / maxScroll));
      const top = PAD + progress * (trackH - height);
      setThumb({ top, height });
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    const obs = new ResizeObserver(update);
    obs.observe(document.body);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      obs.disconnect();
    };
  }, []);

  if (!thumb) return null;

  return (
    <div
      aria-hidden
      className="fixed top-0 bottom-0 w-[10px] z-50 pointer-events-none"
      style={{ right: 'max(calc((100vw - 480px) / 2), 0px)' }}
    >
      <div className="absolute top-3 bottom-3 left-1/2 -translate-x-1/2 w-px bg-ink" />
      <div
        className="absolute left-1/2 -translate-x-1/2 w-[5px] rounded-full bg-ink"
        style={{ top: thumb.top, height: thumb.height }}
      />
    </div>
  );
}
