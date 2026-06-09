import type { Verse } from '@/lib/types';

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const toArabicDigits = (n: number) =>
  String(n).replace(/\d/g, (d) => ARABIC_DIGITS[Number(d)]);

// Verse text size steps (settings: small → extra large), marker one step down
const TEXT_SIZES = ['text-2xl', 'text-3xl', 'text-4xl', 'text-5xl'];
const MARKER_SIZES = ['text-xl', 'text-2xl', 'text-3xl', 'text-4xl'];

interface Props {
  verse: Verse;
  arabicSize?: number;
  ref?: React.Ref<HTMLDivElement>;
}

export function VerseCard({ verse, arabicSize = 1, ref }: Props) {
  const translation = verse.translations?.[0];
  const translationText = translation?.text.replace(/<[^>]+>/g, '') ?? '';
  const ayahNumber = Number(verse.verse_key.split(':')[1]);
  const size = Math.min(Math.max(arabicSize, 0), TEXT_SIZES.length - 1);

  return (
    <div ref={ref} id={`verse-${verse.verse_number}`} className="px-4 py-5 divider-dotted">
      <p
        className={`font-arabic ${TEXT_SIZES[size]} leading-loose text-right`}
        dir="rtl"
        lang="ar"
      >
        {verse.text_uthmani}
        <span className={MARKER_SIZES[size]}>&nbsp;﴿{toArabicDigits(ayahNumber)}﴾</span>
      </p>
      {translationText && (
        <p className="text-[15px] leading-relaxed mt-3">
          <span className="font-bold">{verse.verse_key}.</span> {translationText}
        </p>
      )}
    </div>
  );
}
