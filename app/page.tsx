'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getChapters } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { LastReadBanner } from '@/components/LastReadBanner';
import { SurahListItem } from '@/components/SurahListItem';

export default function HomePage() {
  const browseMode = useAppStore((s) => s.browseMode);
  // Persisted browse mode differs from prerendered HTML — wait for mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data: chapters, isLoading, error } = useQuery({
    queryKey: ['chapters'],
    queryFn: getChapters,
  });

  return (
    <div className="min-h-screen bg-paper">
      <header className="px-4 pt-5 pb-4 border-b-[3px] border-ink flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mindful Quran</h1>
          <p className="text-lg font-arabic" dir="rtl" lang="ar">
            القرآن الكريم
          </p>
        </div>
        <Link
          href="/settings"
          className="text-base font-bold border-2 border-ink rounded-lg px-3 py-2 active:bg-ink active:text-paper"
        >
          Settings
        </Link>
      </header>

      <LastReadBanner />

      {!mounted && (
        <p className="px-4 py-8 text-center text-base">Loading…</p>
      )}

      {mounted && browseMode === 'surah' && (
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

      {mounted && browseMode === 'juz' && <DivisionList kind="juz" count={30} />}
      {mounted && browseMode === 'hizb' && <DivisionList kind="hizb" count={60} />}
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
