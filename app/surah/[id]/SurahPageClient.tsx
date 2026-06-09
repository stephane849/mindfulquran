'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { getChapters, getVerses } from '@/lib/api';
import { SurahHeader } from '@/components/SurahHeader';
import { VerseCard } from '@/components/VerseCard';
import { useAppStore } from '@/lib/store';
import type { Verse } from '@/lib/types';

export function SurahPageClient({ surahId }: { surahId: number }) {
  const translationId = useAppStore((s) => s.translationId);
  const setLastRead = useAppStore((s) => s.setLastRead);
  const loaderRef = useRef<HTMLDivElement>(null);
  const resumedRef = useRef(false);

  const { data: chapters } = useQuery({
    queryKey: ['chapters'],
    queryFn: getChapters,
  });

  const chapter = chapters?.find((c) => c.id === surahId);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error } =
    useInfiniteQuery({
      queryKey: ['verses', surahId, translationId],
      queryFn: ({ pageParam }) => getVerses(surahId, pageParam, translationId),
      initialPageParam: 1,
      getNextPageParam: (lastPage) => lastPage.pagination?.next_page ?? undefined,
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
      if (!chapter) return;
      setLastRead({
        surahId,
        surahName: chapter.name_simple,
        verseKey: verse.verse_key,
        verseNumber: verse.verse_number,
      });
    },
    [chapter, surahId, setLastRead]
  );

  const allVerses = data?.pages.flatMap((p) => p.verses) ?? [];

  return (
    <div className="min-h-screen bg-paper">
      <nav className="sticky top-0 z-10 bg-paper border-b-2 border-ink flex items-center gap-3 px-4 py-3">
        <Link href="/" className="text-sm font-bold min-w-[44px] py-1">
          ‹ Back
        </Link>
        {chapter && (
          <span className="text-sm font-bold truncate">{chapter.name_simple}</span>
        )}
      </nav>

      {chapter && <SurahHeader chapter={chapter} />}

      {isLoading && (
        <p className="px-4 py-8 text-center text-sm font-bold">Loading verses…</p>
      )}

      {error && (
        <div className="px-4 py-8 text-center text-sm">
          <p className="font-bold">Could not load verses.</p>
          <p className="mt-2">{error instanceof Error ? error.message : String(error)}</p>
        </div>
      )}

      {allVerses.map((verse) => (
        <VisibleVerseCard key={verse.id} verse={verse} onVisible={handleVerseVisible} />
      ))}

      <div ref={loaderRef} className="py-5 text-center text-xs font-bold">
        {isFetchingNextPage
          ? 'Loading more…'
          : !hasNextPage && allVerses.length > 0
          ? '· End of surah ·'
          : null}
      </div>
    </div>
  );
}

function VisibleVerseCard({
  verse,
  onVisible,
}: {
  verse: Verse;
  onVisible: (v: Verse) => void;
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

  return <VerseCard ref={ref} verse={verse} />;
}
