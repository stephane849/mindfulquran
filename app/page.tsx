'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getChapters } from '@/lib/api';
import { useAppStore, type BrowseMode } from '@/lib/store';
import { LastReadBanner } from '@/components/LastReadBanner';
import { SurahListItem } from '@/components/SurahListItem';
import { Tabs } from '@/components/Tabs';
import { AwradSection } from '@/components/AwradSection';

const BROWSE_TABS: { value: BrowseMode; label: string }[] = [
  { value: 'surah', label: 'Surah' },
  { value: 'juz', label: 'Juz' },
  { value: 'hizb', label: 'Hizb' },
  { value: 'awrad', label: 'Awrad' },
];

export default function HomePage() {
  const browseMode = useAppStore((s) => s.browseMode);
  const setBrowseMode = useAppStore((s) => s.setBrowseMode);
  // Persisted browse mode differs from prerendered HTML — wait for mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data: chapters, isLoading, error } = useQuery({
    queryKey: ['chapters'],
    queryFn: getChapters,
  });

  return (
    <div className="min-h-screen bg-paper">
      <header className="pl-4 pr-4 pt-5 pb-4 border-b-[3px] border-ink flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold leading-tight">MindfulQuran</h1>
          <p className="text-base font-arabic" dir="rtl" lang="ar">
            القرآن الكريم
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link
            href="/search"
            aria-label="Search"
            className="border-2 border-ink rounded-lg p-2 active:bg-ink active:text-paper"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
            </svg>
          </Link>
          <Link
            href="/settings"
            aria-label="Settings"
            className="border-2 border-ink rounded-lg p-2 active:bg-ink active:text-paper"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
            </svg>
          </Link>
        </div>
      </header>

      <LastReadBanner />

      {!mounted ? (
        <p className="px-4 py-8 text-center text-base">Loading…</p>
      ) : (
        <>
          <Tabs tabs={BROWSE_TABS} active={browseMode} onChange={setBrowseMode} />

          {browseMode === 'surah' && (
            <>
              {isLoading && (
                <p className="px-4 py-8 text-center text-base">Loading surahs…</p>
              )}
              {error && (
                <div className="px-4 py-8 text-center text-base">
                  <p className="font-bold">Could not load surahs.</p>
                  <p className="mt-2">
                    {error instanceof Error ? error.message : String(error)}
                  </p>
                </div>
              )}
              {chapters && (
                <ol>
                  {chapters.map((chapter) => (
                    <li key={chapter.id}>
                      <SurahListItem chapter={chapter} />
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}

          {browseMode === 'juz' && <DivisionList kind="juz" count={30} />}
          {browseMode === 'hizb' && <DivisionList kind="hizb" count={60} />}
          {browseMode === 'awrad' && <AwradSection chapters={chapters} />}
        </>
      )}
    </div>
  );
}

function DivisionList({ kind, count }: { kind: 'juz' | 'hizb'; count: number }) {
  const label = kind === 'juz' ? 'Juz' : 'Hizb';
  return (
    <ol>
      {Array.from({ length: count }, (_, i) => i + 1).map((n) => (
        <li key={n}>
          <Link
            href={`/${kind}/${n}`}
            className="flex items-center gap-3 px-4 py-3 divider-dotted active:bg-ink active:text-paper"
          >
            <span className="w-8 shrink-0 text-lg font-bold tabular-nums">{n}</span>
            <span className="flex-1 font-bold text-lg">
              {label} {n}
            </span>
            {kind === 'hizb' && (
              <span className="text-[15px]">Juz {Math.ceil(n / 2)}</span>
            )}
            <span className="shrink-0 text-xl font-bold" aria-hidden>
              ›
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
