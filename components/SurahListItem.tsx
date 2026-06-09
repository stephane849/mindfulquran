import Link from 'next/link';
import type { Chapter } from '@/lib/types';

export function SurahListItem({ chapter }: { chapter: Chapter }) {
  return (
    <Link
      href={`/surah/${chapter.id}`}
      className="flex items-center gap-3 px-4 py-3 divider-dotted active:bg-ink active:text-paper"
    >
      <span className="w-9 shrink-0 text-lg font-bold tabular-nums">{chapter.id}</span>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-lg leading-tight">{chapter.name_simple}</p>
        <p className="text-[15px] mt-0.5">
          {chapter.translated_name.name} &middot; {chapter.verses_count} ayahs
        </p>
      </div>
      <span className="font-arabic text-2xl shrink-0" dir="rtl" lang="ar">
        {chapter.name_arabic}
      </span>
      <span className="shrink-0 text-xl font-bold" aria-hidden>
        ›
      </span>
    </Link>
  );
}
