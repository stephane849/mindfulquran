'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { pageDelta } from '@/lib/paging';

// MMD scroll rail (per mudita/MMD LazyMMD): chevron buttons at both ends —
// tap scrolls one step, long-press jumps to that end, icon turns dotted when
// already there — around a bordered track with a proportional thumb.

const LONG_PRESS_MS = 500;
const MIN_THUMB = 16;

function Chevron({ dir }: { dir: 'up' | 'down' }) {
  const d = dir === 'up' ? 'M3 13 L10 4 L17 13' : 'M3 5 L10 14 L17 5';
  return (
    <svg width="20" height="18" viewBox="0 0 20 18" aria-hidden>
      <path d={`${d} Z`} fill="#000" />
    </svg>
  );
}

function RailButton({
  dir,
  onTap,
  onLongPress,
  label,
}: {
  dir: 'up' | 'down';
  onTap: () => void;
  onLongPress: () => void;
  label: string;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longFired = useRef(false);

  const start = () => {
    longFired.current = false;
    timer.current = setTimeout(() => {
      longFired.current = true;
      onLongPress();
    }, LONG_PRESS_MS);
  };
  const end = () => {
    if (timer.current) clearTimeout(timer.current);
    if (!longFired.current) onTap();
  };
  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    longFired.current = true;
  };

  return (
    <button
      aria-label={label}
      className="py-3 px-1"
      onPointerDown={start}
      onPointerUp={end}
      onPointerLeave={cancel}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Chevron dir={dir} />
    </button>
  );
}

export function ScrollBar() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<{
    thumbTop: number;
    thumbHeight: number;
  } | null>(null);
  const [rightOffset, setRightOffset] = useState(0);

  const updateRight = useCallback(() => {
    const rect = document.documentElement.getBoundingClientRect();
    setRightOffset(Math.max(0, window.innerWidth - rect.right));
  }, []);

  const update = useCallback(() => {
    const total = document.documentElement.scrollHeight;
    const vh = window.innerHeight;
    if (total <= vh + 1) {
      setState(null);
      return;
    }
    const trackH = trackRef.current?.clientHeight ?? vh - 96;
    const thumbHeight = Math.max(MIN_THUMB, (vh / total) * trackH);
    const maxScroll = total - vh;
    const progress = Math.min(1, Math.max(0, window.scrollY / maxScroll));
    setState({
      thumbTop: progress * (trackH - thumbHeight),
      thumbHeight,
    });
  }, []);

  useEffect(() => {
    const onResize = () => { updateRight(); update(); };
    updateRight();
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', onResize);
    const obs = new ResizeObserver(onResize);
    obs.observe(document.body);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', onResize);
      obs.disconnect();
    };
  }, [update, updateRight]);

  const page = (dir: 'up' | 'down') => {
    window.scrollBy({ top: pageDelta(dir), behavior: 'instant' });
  };
  const jump = (dir: 'up' | 'down') => {
    window.scrollTo({
      top: dir === 'up' ? 0 : document.documentElement.scrollHeight,
      behavior: 'instant',
    });
  };

  if (!state) return null;

  return (
    <div
      className="fixed top-0 bottom-0 w-[28px] z-50 flex flex-col items-center bg-paper"
      style={{ right: rightOffset }}
    >
      <RailButton
        dir="up"
        onTap={() => page('up')}
        onLongPress={() => jump('up')}
        label="Scroll up (hold to jump to top)"
      />
      <div
        ref={trackRef}
        className="relative flex-1 w-[8px] border border-ink rounded-full"
      >
        <div
          className="absolute left-0 right-0 bg-ink rounded-full"
          style={{ top: state.thumbTop, height: state.thumbHeight }}
        />
      </div>
      <RailButton
        dir="down"
        onTap={() => page('down')}
        onLongPress={() => jump('down')}
        label="Scroll down (hold to jump to end)"
      />
    </div>
  );
}
