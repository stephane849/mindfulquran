'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';

export function LastReadBanner() {
  const lastRead = useAppStore((s) => s.lastRead);
  // Pre-rendered HTML has no banner; render only after mount so hydration matches
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !lastRead) return null;

  return (
    <Link
      href={`/surah/${lastRead.surahId}#verse-${lastRead.verseNumber}`}
      className="block mx-4 my-3 p-4 border-2 border-ink rounded-lg active:bg-ink active:text-paper"
    >
      <span className="text-[15px] font-bold uppercase tracking-widest">
        Continue Reading
      </span>
      <div className="flex items-baseline justify-between mt-1">
        <span className="font-bold text-lg">{lastRead.surahName}</span>
        <span className="text-lg">Ayah {lastRead.verseNumber} ›</span>
      </div>
    </Link>
  );
}
