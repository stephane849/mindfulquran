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
      <header className="px-4 pt-5 pb-4 border-b-2 border-ink flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Mindful Quran</h1>
          <p className="text-sm font-arabic" dir="rtl" lang="ar">
            القرآن الكريم
          </p>
        </div>
        <Link
          href="/settings"
          className="text-sm font-bold border-2 border-ink px-3 py-2 active:bg-ink active:text-paper"
        >
          Settings
        </Link>
      </header>

      <LastReadBanner />

      {isLoading && (
        <p className="px-4 py-8 text-center text-sm font-bold">Loading surahs…</p>
      )}

      {error && (
        <div className="px-4 py-8 text-center text-sm">
          <p className="font-bold">Could not load surahs.</p>
          <p className="mt-2">{error instanceof Error ? error.message : String(error)}</p>
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
    </div>
  );
}
