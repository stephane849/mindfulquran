import type { Chapter } from '@/lib/types';

const BISMILLAH = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';

export function SurahHeader({ chapter }: { chapter: Chapter }) {
  return (
    <div className="px-4 pt-5 pb-4 border-b-2 border-ink text-center">
      <p className="font-arabic text-4xl mb-1" dir="rtl" lang="ar">
        {chapter.name_arabic}
      </p>
      <p className="font-bold text-base">{chapter.name_simple}</p>
      <p className="text-sm">{chapter.translated_name.name}</p>
      <p className="text-xs font-bold mt-1">
        {chapter.verses_count} ayahs &middot;{' '}
        {chapter.revelation_place === 'makkah' ? 'Meccan' : 'Medinan'}
      </p>
      {chapter.bismillah_pre && (
        <p className="font-arabic text-3xl mt-5" dir="rtl" lang="ar">
          {BISMILLAH}
        </p>
      )}
    </div>
  );
}
