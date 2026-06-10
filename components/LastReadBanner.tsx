'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import type { LastRead } from '@/lib/types';

function readLink(r: LastRead): string {
  if (r.source === 'juz' && r.sourceId) return `/juz/${r.sourceId}#verse-${r.verseNumber}`;
  if (r.source === 'hizb' && r.sourceId) return `/hizb/${r.sourceId}#verse-${r.verseNumber}`;
  return `/surah/${r.surahId}#verse-${r.verseNumber}`;
}

function readLabel(r: LastRead): string {
  if (r.source === 'juz' && r.sourceId) return `Juz ${r.sourceId}`;
  if (r.source === 'hizb' && r.sourceId) return `Hizb ${r.sourceId}`;
  return 'Continue Reading';
}

function BannerEntry({
  read,
  pinned,
  first,
}: {
  read: LastRead;
  pinned?: boolean;
  first?: boolean;
}) {
  return (
    <Link
      href={readLink(read)}
      className={`flex items-center gap-3 mx-4 p-4 border-2 border-ink rounded-lg active:bg-ink active:text-paper ${first ? 'mt-3' : 'mt-2'}`}
    >
      {pinned && (
        <svg width="13" height="16" viewBox="0 0 13 16" fill="currentColor" aria-hidden className="shrink-0">
          <path d="M1 0h11v15l-5.5-3.5L1 15V0z"/>
        </svg>
      )}
      <div className="flex-1 min-w-0">
        <span className="text-[13px] font-bold uppercase tracking-widest">
          {pinned ? 'Pinned' : readLabel(read)}
        </span>
        <div className="flex items-baseline justify-between gap-2 mt-0.5">
          <span className="font-bold text-lg truncate">{read.surahName}</span>
          <span className="text-lg shrink-0">Ayah {read.verseNumber} ›</span>
        </div>
      </div>
    </Link>
  );
}

export function LastReadBanner() {
  const lastRead = useAppStore((s) => s.lastRead);
  const juzLastRead = useAppStore((s) => s.juzLastRead);
  const hizbLastRead = useAppStore((s) => s.hizbLastRead);
  const pinnedRead = useAppStore((s) => s.pinnedRead);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const entries: { read: LastRead; pinned?: boolean }[] = [];
  if (pinnedRead) entries.push({ read: pinnedRead, pinned: true });
  if (juzLastRead) entries.push({ read: juzLastRead });
  if (hizbLastRead) entries.push({ read: hizbLastRead });
  if (lastRead) entries.push({ read: lastRead });

  if (entries.length === 0) return null;

  return (
    <>
      {entries.map((e, i) => (
        <BannerEntry key={i} read={e.read} pinned={e.pinned} first={i === 0} />
      ))}
    </>
  );
}
