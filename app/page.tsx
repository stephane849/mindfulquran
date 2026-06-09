'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { getChapters } from '@/lib/api';
import { LastReadBanner } from '@/components/LastReadBanner';
import { SurahListItem } from '@/components/SurahListItem';

export default function HomePage() {
  const { data: chapters, isLoading, error } = useQuery({
    queryKey: ['chapters'],
    queryFn: getChapters,
  });

  return (
    <div className="min-h-screen bg-paper">
      <header className="px-4 pt-5 pb-4 border-b border-border flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-ink">Mindful Quran</h1>
          <p className="text-xs text-muted font-arabic" dir="rtl" lang="ar">
            القرآن الكريم
          </p>
        </div>
        <Link
          href="/settings"
          className="text-xs text-muted border border-border px-2 py-1 active:bg-border"
        >
          Settings
        </Link>
      </header>

      <LastReadBanner />

      {isLoading && (
        <p className="px-4 py-8 text-center text-sm text-muted">Loading surahs…</p>
      )}

      {error && (
        <p className="px-4 py-8 text-center text-sm text-muted">
          Could not load surahs. Check your connection.
        </p>
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
    </div>
  );
}
