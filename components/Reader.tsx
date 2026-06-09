'use client';

import { Fragment, useEffect, useRef, useState, useCallback } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { getChapters, getVersesBy, type ReaderSource } from '@/lib/api';
import { SurahHeader } from '@/components/SurahHeader';
import { VerseCard } from '@/components/VerseCard';
import { useAppStore } from '@/lib/store';
import type { Chapter, Verse } from '@/lib/types';

const surahOf = (verse: Verse) => Number(verse.verse_key.split(':')[0]);

export function Reader({ source, id }: { source: ReaderSource; id: number }) {
  const translationId = useAppStore((s) => s.translationId);
  const showTranslation = useAppStore((s) => s.showTranslation);
  const setShowTranslation = useAppStore((s) => s.setShowTranslation);
  const arabicSize = useAppStore((s) => s.arabicSize);
  const setLastRead = useAppStore((s) => s.setLastRead);
  const loaderRef = useRef<HTMLDivElement>(null);
  const resumedRef = useRef(false);
  // Persisted state differs from the prerendered HTML — gate it until mounted
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data: chapters } = useQuery({
    queryKey: ['chapters'],
    queryFn: getChapters,
  });

  const chapter = source === 'chapter' ? chapters?.find((c) => c.id === id) : undefined;
  const title =
    source === 'chapter'
      ? chapter?.name_simple ?? `Surah ${id}`
      : source === 'juz'
      ? `Juz ${id}`
      : `Hizb ${id}`;

  const effectiveTranslation = mounted && showTranslation ? translationId : null;

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error } =
    useInfiniteQuery({
      queryKey: ['verses', source, id, effectiveTranslation],
      queryFn: ({ pageParam }) => getVersesBy(source, id, pageParam, effectiveTranslation),
      initialPageParam: 1,
      getNextPageParam: (lastPage) => lastPage.pagination?.next_page ?? undefined,
      enabled: mounted,
    });

  // Auto-load next page when bottom sentinel enters viewport
  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: '300px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Resume at #verse-N from the Continue Reading link, once content exists
  useEffect(() => {
    if (resumedRef.current || !data) return;
    const hash = window.location.hash;
    if (!hash.startsWith('#verse-')) return;
    const el = document.getElementById(hash.slice(1));
    if (el) {
      resumedRef.current = true;
      el.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
  }, [data]);

  const handleVerseVisible = useCallback(
    (verse: Verse) => {
      const surahId = surahOf(verse);
      const surah = chapters?.find((c) => c.id === surahId);
      if (!surah) return;
      setLastRead({
        surahId,
        surahName: surah.name_simple,
        verseKey: verse.verse_key,
        verseNumber: Number(verse.verse_key.split(':')[1]),
      });
    },
    [chapters, setLastRead]
  );

  const allVerses = data?.pages.flatMap((p) => p.verses) ?? [];

  return (
    <div className="min-h-screen bg-paper">
      <nav className="sticky top-0 z-10 bg-paper border-b-2 border-ink flex items-center gap-3 px-4 py-3">
        <Link href="/" className="text-sm font-bold min-w-[44px] py-1">
          ‹ Back
        </Link>
        <span className="text-sm font-bold truncate flex-1">{title}</span>
        {mounted && (
          <button
            onClick={() => setShowTranslation(!showTranslation)}
            aria-pressed={showTranslation}
            className={`text-sm font-bold border-2 border-ink px-3 py-1 ${
              showTranslation ? 'bg-ink text-paper' : 'bg-paper text-ink'
            }`}
          >
            EN
          </button>
        )}
      </nav>

      {chapter && <SurahHeader chapter={chapter} />}

      {(isLoading || !mounted) && (
        <p className="px-4 py-8 text-center text-sm font-bold">Loading verses…</p>
      )}

      {error && (
        <div className="px-4 py-8 text-center text-sm">
          <p className="font-bold">Could not load verses.</p>
          <p className="mt-2">{error instanceof Error ? error.message : String(error)}</p>
        </div>
      )}

      {allVerses.map((verse, i) => {
        const surahId = surahOf(verse);
        const startsNewSurah =
          source !== 'chapter' && (i === 0 || surahOf(allVerses[i - 1]) !== surahId);
        const surah = startsNewSurah ? chapters?.find((c) => c.id === surahId) : undefined;
        return (
          <Fragment key={verse.id}>
            {surah && <SurahDivider chapter={surah} />}
            <VisibleVerseCard
              verse={verse}
              onVisible={handleVerseVisible}
              arabicSize={arabicSize}
            />
          </Fragment>
        );
      })}

      <div ref={loaderRef} className="py-5 text-center text-xs font-bold">
        {isFetchingNextPage
          ? 'Loading more…'
          : !hasNextPage && allVerses.length > 0
          ? `· End of ${source === 'chapter' ? 'surah' : source} ·`
          : null}
      </div>
    </div>
  );
}

function SurahDivider({ chapter }: { chapter: Chapter }) {
  return (
    <div className="px-4 py-4 border-y-2 border-ink text-center bg-paper">
      <span className="font-arabic text-2xl" dir="rtl" lang="ar">
        {chapter.name_arabic}
      </span>
      <span className="block text-sm font-bold">
        {chapter.id}. {chapter.name_simple}
      </span>
    </div>
  );
}

function VisibleVerseCard({
  verse,
  onVisible,
  arabicSize,
}: {
  verse: Verse;
  onVisible: (v: Verse) => void;
  arabicSize: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onVisible(verse);
      },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [verse, onVisible]);

  return <VerseCard ref={ref} verse={verse} arabicSize={arabicSize} />;
}
