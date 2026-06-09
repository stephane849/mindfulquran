import type { Verse } from '@/lib/types';

interface Props {
  verse: Verse;
  ref?: React.Ref<HTMLDivElement>;
}

export function VerseCard({ verse, ref }: Props) {
  const translation = verse.translations[0];
  const translationText = translation?.text.replace(/<[^>]+>/g, '') ?? '';

  return (
    <div ref={ref} id={`verse-${verse.verse_number}`} className="px-4 py-5 divider-dotted">
      <p
        className="font-arabic text-2xl leading-loose text-right"
        dir="rtl"
        lang="ar"
      >
        {verse.text_uthmani}
        <span className="text-base font-sans font-bold">&nbsp;({verse.verse_number})</span>
      </p>
      {translationText && (
        <p className="text-[15px] leading-relaxed mt-3">
          <span className="font-bold">{verse.verse_number}.</span> {translationText}
        </p>
      )}
    </div>
  );
}
