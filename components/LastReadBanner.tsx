'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import type { LastRead } from '@/lib/types';

function readLink(r: LastRead): string {
  if (r.source === 'juz' && r.sourceId) return `/juz/${r.sourceId}#verse-${r.verseNumber}`;
  if (r.source === 'hizb' && r.sourceId) return `/hizb/${r.sourceId}#verse-${r.verseNumber}`;
  if (r.source === 'chapter') return `/surah/${r.surahId}?awrad=1#verse-${r.verseNumber}`;
  return `/surah/${r.surahId}#verse-${r.verseNumber}`;
}

function readLabel(r: LastRead): string {
  if (r.source === 'juz' && r.sourceId) return `Juz ${r.sourceId}`;
  if (r.source === 'hizb' && r.sourceId) return `Hizb ${r.sourceId}`;
  if (r.source === 'chapter') return 'Awrad';
  return 'Continue Reading';
}

export function LastReadBanner() {
  const browseMode = useAppStore((s) => s.browseMode);
  const lastRead = useAppStore((s) => s.lastRead);
  const juzLastRead = useAppStore((s) => s.juzLastRead);
  const hizbLastRead = useAppStore((s) => s.hizbLastRead);
  const awradLastRead = useAppStore((s) => s.awradLastRead);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const read: LastRead | null =
    browseMode === 'juz' ? juzLastRead
    : browseMode === 'hizb' ? hizbLastRead
    : browseMode === 'awrad' ? awradLastRead
    : lastRead;

  if (!read) return null;

  return (
    <Link
      href={readLink(read)}
      className="block mx-4 my-3 p-4 border-2 border-ink rounded-lg"
    >
      <span className="text-[15px] font-bold uppercase tracking-widest">
        {readLabel(read)}
      </span>
      <div className="flex items-baseline justify-between mt-1">
        <span className="font-bold text-lg">{read.surahName}</span>
        <span className="text-lg">Ayah {read.verseNumber} ›</span>
      </div>
    </Link>
  );
}
