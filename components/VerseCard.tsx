import type { Verse } from '@/lib/types';
import {
  toArabicDigits,
  ayahNumberOf,
  clampArabicSize,
  ARABIC_TEXT_SIZES,
  ARABIC_MARKER_SIZES,
} from '@/lib/arabic';

interface Props {
  verse: Verse;
  arabicSize?: number;
  ref?: React.Ref<HTMLDivElement>;
}

export function VerseCard({ verse, arabicSize = 1, ref }: Props) {
  const translation = verse.translations?.[0];
  const translationText = translation?.text.replace(/<[^>]+>/g, '') ?? '';
  const size = clampArabicSize(arabicSize);

  return (
    <div ref={ref} id={`verse-${verse.verse_number}`} className="px-4 py-5 divider-dotted">
      <p
        className={`font-arabic ${ARABIC_TEXT_SIZES[size]} leading-loose text-right`}
        dir="rtl"
        lang="ar"
      >
        {verse.text_uthmani}
        <span className={ARABIC_MARKER_SIZES[size]}>
          &nbsp;﴿{toArabicDigits(ayahNumberOf(verse.verse_key))}﴾
        </span>
      </p>
      {translationText && (
        <p className="text-lg leading-relaxed mt-3">
          <span className="font-bold">{verse.verse_key}</span> {translationText}
        </p>
      )}
    </div>
  );
}
