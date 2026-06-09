import Link from 'next/link';
import type { Chapter } from '@/lib/types';

export function SurahListItem({ chapter }: { chapter: Chapter }) {
  return (
    <Link
      href={`/surah/${chapter.id}`}
      className="flex items-center gap-3 px-4 py-3 border-b border-border active:bg-border"
    >
      <span className="w-8 h-8 shrink-0 border border-border flex items-center justify-center text-xs font-medium text-muted">
        {chapter.id}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-ink text-sm">{chapter.name_simple}</p>
        <p className="text-xs text-muted mt-0.5">
          {chapter.translated_name.name} &middot; {chapter.verses_count} ayahs &middot;{' '}
          {chapter.revelation_place === 'makkah' ? 'Meccan' : 'Medinan'}
        </p>
      </div>
      <span className="font-arabic text-xl text-ink shrink-0" dir="rtl" lang="ar">
        {chapter.name_arabic}
      </span>
    </Link>
  );
}
