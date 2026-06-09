import type { Verse } from '@/lib/types';

interface Props {
  verse: Verse;
  ref?: React.Ref<HTMLDivElement>;
}

export function VerseCard({ verse, ref }: Props) {
  const translation = verse.translations[0];
  const translationText = translation?.text.replace(/<[^>]+>/g, '') ?? '';

  return (
    <div ref={ref} className="px-4 py-5 border-b border-border">
      <div className="flex items-start gap-3 flex-row-reverse">
        <p
          className="font-arabic text-2xl leading-loose text-ink text-right flex-1"
          dir="rtl"
          lang="ar"
        >
          {verse.text_uthmani}
        </p>
        <span className="shrink-0 w-7 h-7 border border-border flex items-center justify-center text-xs text-muted mt-1">
          {verse.verse_number}
        </span>
      </div>
      {translationText && (
        <p className="text-sm leading-relaxed text-muted mt-3">{translationText}</p>
      )}
    </div>
  );
}
