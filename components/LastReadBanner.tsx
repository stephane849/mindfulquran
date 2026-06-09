'use client';

import Link from 'next/link';
import { useAppStore } from '@/lib/store';

export function LastReadBanner() {
  const lastRead = useAppStore((s) => s.lastRead);

  if (!lastRead) return null;

  return (
    <Link
      href={`/surah/${lastRead.surahId}`}
      className="block mx-4 my-3 p-3 border border-border"
    >
      <span className="text-xs font-medium text-muted uppercase tracking-widest">
        Continue Reading
      </span>
      <div className="flex items-baseline justify-between mt-1">
        <span className="font-semibold text-ink">{lastRead.surahName}</span>
        <span className="text-sm text-muted">Ayah {lastRead.verseNumber}</span>
      </div>
    </Link>
  );
}
