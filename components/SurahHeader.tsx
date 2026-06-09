import type { Chapter } from '@/lib/types';

const BISMILLAH = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';

export function SurahHeader({ chapter }: { chapter: Chapter }) {
  return (
    <div className="px-4 pt-5 pb-4 border-b border-border text-center">
      <p className="font-arabic text-3xl text-ink mb-1" dir="rtl" lang="ar">
        {chapter.name_arabic}
      </p>
      <p className="font-semibold text-ink text-base">{chapter.name_simple}</p>
      <p className="text-sm text-muted">{chapter.translated_name.name}</p>
      <p className="text-xs text-muted mt-1">
        {chapter.verses_count} ayahs &middot;{' '}
        {chapter.revelation_place === 'makkah' ? 'Meccan' : 'Medinan'}
      </p>
      {chapter.bismillah_pre && (
        <p className="font-arabic text-2xl text-ink mt-5" dir="rtl" lang="ar">
          {BISMILLAH}
        </p>
      )}
    </div>
  );
}
