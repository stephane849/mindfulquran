'use client';

import { use, useEffect, useRef, useCallback } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { getChapters, getVerses } from '@/lib/api';
import { SurahHeader } from '@/components/SurahHeader';
import { VerseCard } from '@/components/VerseCard';
import { useAppStore } from '@/lib/store';
import type { Verse } from '@/lib/types';

interface Props {
  params: Promise<{ id: string }>;
}

export default function SurahPage({ params }: Props) {
  const { id } = use(params);
  const surahId = parseInt(id, 10);
  const { translationId, setLastRead } = useAppStore();
  const loaderRef = useRef<HTMLDivElement>(null);

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
      getNextPageParam: (lastPage) => lastPage.meta.next_page ?? undefined,
    });

  // Auto-load next page when bottom sentinel enters viewport
  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '300px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

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
      <nav className="sticky top-0 z-10 bg-paper border-b border-border flex items-center gap-3 px-4 py-3">
        <Link href="/" className="text-sm text-muted min-w-[44px] py-1">
          ← Back
        </Link>
        {chapter && (
          <span className="text-sm font-medium text-ink truncate">{chapter.name_simple}</span>
        )}
      </nav>

      {chapter && <SurahHeader chapter={chapter} />}

      {isLoading && (
        <p className="px-4 py-8 text-center text-sm text-muted">Loading verses…</p>
      )}

      {error && (
        <p className="px-4 py-8 text-center text-sm text-muted">
          Could not load verses. Check your connection.
        </p>
      )}

      {allVerses.map((verse) => (
        <VisibleVerseCard key={verse.id} verse={verse} onVisible={handleVerseVisible} />
      ))}

      <div ref={loaderRef} className="py-5 text-center text-xs text-muted">
        {isFetchingNextPage
          ? 'Loading more…'
          : !hasNextPage && allVerses.length > 0
          ? 'End of surah'
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
