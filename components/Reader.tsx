'use client';

import { Fragment, useEffect, useRef, useState, useCallback } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getChapters, getVersesBy, ENGLISH_TRANSLATIONS, type ReaderSource } from '@/lib/api';
import { SurahHeader } from '@/components/SurahHeader';
import { TopBar } from '@/components/TopBar';
import { VerseCard } from '@/components/VerseCard';
import { BottomSheet } from '@/components/BottomSheet';
import { useAppStore, type ArabicSize } from '@/lib/store';
import { getSurahMorphology, decodeMorph, spaceRoot } from '@/lib/morphology';
import {
  toArabicDigits,
  ayahNumberOf,
  surahNumberOf,
  clampArabicSize,
  ARABIC_TEXT_SIZES,
  ARABIC_MARKER_SIZES,
} from '@/lib/arabic';
import type { Chapter, Verse, Word } from '@/lib/types';

export function Reader({ source, id }: { source: ReaderSource; id: number }) {
  const translationId = useAppStore((s) => s.translationId);
  const showTranslation = useAppStore((s) => s.showTranslation);
  const setShowTranslation = useAppStore((s) => s.setShowTranslation);
  const setTranslationId = useAppStore((s) => s.setTranslationId);
  const arabicSize = useAppStore((s) => s.arabicSize);
  const setArabicSize = useAppStore((s) => s.setArabicSize);
  const tapDictionary = useAppStore((s) => s.tapDictionary);
  const setTapDictionary = useAppStore((s) => s.setTapDictionary);
  const setLastRead = useAppStore((s) => s.setLastRead);
  const loaderRef = useRef<HTMLDivElement>(null);
  const resumedRef = useRef(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selected, setSelected] = useState<{ word: Word; verseKey: string } | null>(null);
  // Persisted state differs from the prerendered HTML — gate it until mounted
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data: chapters } = useQuery({
    queryKey: ['chapters'],
    queryFn: getChapters,
  });

  const chapter = source === 'chapter' ? chapters?.find((c) => c.id === id) : undefined;
  const title =
    source === 'chapter'
      ? chapter?.name_simple ?? `Surah ${id}`
      : source === 'juz'
      ? `Juz ${id}`
      : `Hizb ${id}`;

  const effectiveTranslation = mounted && showTranslation ? translationId : null;
  // Word-by-word glosses power the tap dictionary in both card and mushaf modes
  const withWords = mounted && tapDictionary;

  const isHizb = source === 'hizb';

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error } =
    useInfiniteQuery({
      queryKey: ['verses', source, id, effectiveTranslation, withWords],
      queryFn: ({ pageParam }) =>
        getVersesBy(source, id, pageParam, effectiveTranslation, withWords),
      // Hizb pageParam encodes quarter (1–4) and internal page as quarter*100+page.
      initialPageParam: isHizb ? 101 : 1,
      getNextPageParam: (lastPage, _all, lastPageParam) => {
        if (isHizb) {
          const quarter = Math.floor(lastPageParam / 100);
          if (lastPage.pagination?.next_page != null) {
            return quarter * 100 + lastPage.pagination.next_page;
          }
          if (quarter < 4) return (quarter + 1) * 100 + 1;
          return undefined;
        }
        return lastPage.pagination?.next_page ?? undefined;
      },
      enabled: mounted,
    });

  // Auto-load next page when bottom sentinel enters viewport
  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: '300px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Resume at #verse-N from the Continue Reading link, once content exists
  useEffect(() => {
    if (resumedRef.current || !data) return;
    const hash = window.location.hash;
    if (!hash.startsWith('#verse-')) return;
    const el = document.getElementById(hash.slice(1));
    if (el) {
      resumedRef.current = true;
      el.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
  }, [data]);

  const handleVerseVisible = useCallback(
    (verse: Verse) => {
      const surahId = surahNumberOf(verse.verse_key);
      const surah = chapters?.find((c) => c.id === surahId);
      if (!surah) return;
      setLastRead({
        surahId,
        surahName: surah.name_simple,
        verseKey: verse.verse_key,
        verseNumber: ayahNumberOf(verse.verse_key),
      });
    },
    [chapters, setLastRead]
  );

  const handleWordTap = useCallback(
    (word: Word, verseKey: string) => setSelected({ word, verseKey }),
    []
  );

  // Grammar data for the selected word's surah (bundled, cached forever)
  const selectedSurah = selected ? surahNumberOf(selected.verseKey) : null;
  const { data: morphology } = useQuery({
    queryKey: ['morphology', selectedSurah],
    queryFn: () => getSurahMorphology(selectedSurah!),
    enabled: selectedSurah !== null,
    staleTime: Infinity,
  });
  const morphEntry =
    selected && morphology
      ? morphology[`${ayahNumberOf(selected.verseKey)}:${selected.word.position}`]
      : undefined;
  const grammar = morphEntry ? decodeMorph(morphEntry) : undefined;

  const allVerses = data?.pages.flatMap((p) => p.verses) ?? [];

  // Consecutive same-surah runs; a chapter read is always a single group
  const groups: { surahId: number; verses: Verse[] }[] = [];
  for (const verse of allVerses) {
    const surahId = surahNumberOf(verse.verse_key);
    const last = groups[groups.length - 1];
    if (last && last.surahId === surahId) last.verses.push(verse);
    else groups.push({ surahId, verses: [verse] });
  }

  const mushafMode = mounted && !showTranslation;

  return (
    <div className="min-h-screen bg-paper">
      <TopBar
        title={title}
        right={
          mounted ? (
            <div className="flex gap-2">
              <button
                onClick={() => setSettingsOpen(true)}
                aria-label="Reading settings"
                className="text-base font-bold border-2 border-ink rounded-lg px-3 py-1"
              >
                Aa
              </button>
              <button
                onClick={() => setShowTranslation(!showTranslation)}
                aria-pressed={showTranslation}
                className={`text-base font-bold border-2 border-ink rounded-lg px-3 py-1 ${
                  showTranslation ? 'bg-ink text-paper' : 'bg-paper text-ink'
                }`}
              >
                EN
              </button>
            </div>
          ) : undefined
        }
      />

      {chapter && <SurahHeader chapter={chapter} />}

      {(isLoading || !mounted) && (
        <p className="px-4 py-8 text-center text-base">Loading verses…</p>
      )}

      {error && (
        <div className="px-4 py-8 text-center text-base">
          <p className="font-bold">Could not load verses.</p>
          <p className="mt-2">{error instanceof Error ? error.message : String(error)}</p>
        </div>
      )}

      {groups.map((group) => (
        <Fragment key={`${group.surahId}-${group.verses[0].id}`}>
          {source !== 'chapter' && (
            <SurahDivider chapter={chapters?.find((c) => c.id === group.surahId)} />
          )}
          {mushafMode ? (
            <MushafGroup
              verses={group.verses}
              arabicSize={arabicSize}
              onVisible={handleVerseVisible}
              onWordTap={tapDictionary ? handleWordTap : undefined}
            />
          ) : (
            group.verses.map((verse) => (
              <VisibleVerseCard
                key={verse.id}
                verse={verse}
                onVisible={handleVerseVisible}
                arabicSize={arabicSize}
                onWordTap={handleWordTap}
              />
            ))
          )}
        </Fragment>
      ))}

      <div ref={loaderRef} className="py-5 text-center text-[15px]">
        {isFetchingNextPage
          ? 'Loading more…'
          : !hasNextPage && allVerses.length > 0
          ? `· End of ${source === 'chapter' ? 'surah' : source} ·`
          : null}
      </div>

      {/* Quick reading settings */}
      <BottomSheet open={settingsOpen} onClose={() => setSettingsOpen(false)}>
        <button
          onClick={() => setTapDictionary(!tapDictionary)}
          aria-pressed={tapDictionary}
          className="w-full flex items-center justify-between py-3 mt-2 divider-dotted text-left"
        >
          <span className="text-lg font-bold">Tap dictionary</span>
          <span
            className={`text-base font-bold border-2 border-ink rounded-lg px-3 py-1 ${
              tapDictionary ? 'bg-ink text-paper' : ''
            }`}
          >
            {tapDictionary ? 'On' : 'Off'}
          </span>
        </button>

        <p className="text-[15px] font-bold uppercase tracking-widest mt-4 mb-2">
          Arabic text size
        </p>
        <div className="flex gap-2">
          {([0, 1, 2, 3] as ArabicSize[]).map((s) => (
            <button
              key={s}
              onClick={() => setArabicSize(s)}
              className={`flex-1 h-12 border-2 border-ink rounded-lg font-arabic ${
                ['text-lg', 'text-xl', 'text-2xl', 'text-3xl'][s]
              } ${arabicSize === s ? 'bg-ink text-paper' : ''}`}
              dir="rtl"
              lang="ar"
            >
              ع
            </button>
          ))}
        </div>

        <p className="text-[15px] font-bold uppercase tracking-widest mt-5 mb-2">
          Translation
        </p>
        <ul>
          <li>
            <button
              onClick={() => setShowTranslation(false)}
              className="w-full flex items-center justify-between py-3 divider-dotted text-left"
            >
              <span className="text-lg font-bold">Arabic only</span>
              {!showTranslation && <span className="text-xl font-bold">✓</span>}
            </button>
          </li>
          {ENGLISH_TRANSLATIONS.map((t) => (
            <li key={t.id}>
              <button
                onClick={() => setTranslationId(t.id)}
                className="w-full flex items-center justify-between py-3 divider-dotted text-left"
              >
                <span className="text-lg font-bold">{t.name}</span>
                {showTranslation && translationId === t.id && (
                  <span className="text-xl font-bold">✓</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </BottomSheet>

      {/* Word dictionary */}
      <BottomSheet open={selected !== null} onClose={() => setSelected(null)}>
        {selected && (
          <div className="text-center py-4">
            <p className="font-arabic text-5xl leading-loose" dir="rtl" lang="ar">
              {selected.word.text_uthmani}
            </p>
            {selected.word.transliteration?.text && (
              <p className="text-lg italic mt-1">{selected.word.transliteration.text}</p>
            )}
            {selected.word.translation?.text && (
              <p className="text-xl font-bold mt-2">{selected.word.translation.text}</p>
            )}
            {grammar && (
              <div className="mt-4 pt-3 border-t-2 border-ink text-left">
                <p className="text-[15px] font-bold uppercase tracking-widest">Grammar</p>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-lg">{grammar.pos}</span>
                  {grammar.root && (
                    <span className="font-arabic text-2xl" dir="rtl" lang="ar">
                      {spaceRoot(grammar.root)}
                      <span className="text-base">&nbsp;:جذر</span>
                    </span>
                  )}
                </div>
                {grammar.parse.length > 0 && (
                  <p className="text-base mt-1">{grammar.parse.join(' · ')}</p>
                )}
                {grammar.lemma && (
                  <p className="text-base mt-1">
                    Lemma:{' '}
                    <span className="font-arabic text-xl" dir="rtl" lang="ar">
                      {grammar.lemma}
                    </span>
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

/** Continuous mushaf-style flow: verses run inline, separated by ﴿n﴾ markers */
function MushafGroup({
  verses,
  arabicSize,
  onVisible,
  onWordTap,
}: {
  verses: Verse[];
  arabicSize: number;
  onVisible: (v: Verse) => void;
  onWordTap?: (w: Word, verseKey: string) => void;
}) {
  const size = clampArabicSize(arabicSize);
  return (
    <p
      className={`font-arabic ${ARABIC_TEXT_SIZES[size]} leading-[2.4] px-4 py-5 text-right`}
      dir="rtl"
      lang="ar"
    >
      {verses.map((verse) => (
        <MushafVerse
          key={verse.id}
          verse={verse}
          markerClass={ARABIC_MARKER_SIZES[size]}
          onVisible={onVisible}
          onWordTap={onWordTap}
        />
      ))}
    </p>
  );
}

function MushafVerse({
  verse,
  markerClass,
  onVisible,
  onWordTap,
}: {
  verse: Verse;
  markerClass: string;
  onVisible: (v: Verse) => void;
  onWordTap?: (w: Word, verseKey: string) => void;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onVisible(verse);
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [verse, onVisible]);

  const words = verse.words?.filter((w) => w.char_type_name === 'word');

  return (
    <span ref={ref} id={`verse-${verse.verse_number}`}>
      {words?.length && onWordTap
        ? words.map((word, i) => (
            <LongPressWord
              key={word.id}
              word={word}
              onLookup={(w) => onWordTap(w, verse.verse_key)}
              addLeadingSpace={i > 0}
            />
          ))
        : verse.text_uthmani}
      <span className={markerClass}> ﴿{toArabicDigits(ayahNumberOf(verse.verse_key))}﴾ </span>
    </span>
  );
}

// Mushaf flow keeps reading taps inert: only a deliberate longer press
// (400ms, without scrolling away) opens the dictionary
function LongPressWord({
  word,
  onLookup,
  addLeadingSpace,
}: {
  word: Word;
  onLookup: (w: Word) => void;
  addLeadingSpace?: boolean;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = (e: React.PointerEvent) => {
    e.preventDefault();
    timer.current = setTimeout(() => onLookup(word), 400);
  };
  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
  };

  return (
    <>
      {addLeadingSpace && ' '}
      <button
        onPointerDown={start}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        onContextMenu={(e) => e.preventDefault()}
        className="inline select-none [user-select:none] [-webkit-user-select:none]"
      >
        {word.text_uthmani}
      </button>
    </>
  );
}

function SurahDivider({ chapter }: { chapter?: Chapter }) {
  if (!chapter) return null;
  return (
    <div className="px-4 py-4 border-y-[3px] border-ink text-center bg-paper">
      <span className="font-arabic text-3xl" dir="rtl" lang="ar">
        {chapter.name_arabic}
      </span>
      <span className="block text-lg font-bold">
        {chapter.id}. {chapter.name_simple}
      </span>
    </div>
  );
}

function VisibleVerseCard({
  verse,
  onVisible,
  arabicSize,
  onWordTap,
}: {
  verse: Verse;
  onVisible: (v: Verse) => void;
  arabicSize: number;
  onWordTap: (w: Word, verseKey: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onVisible(verse);
      },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [verse, onVisible]);

  return <VerseCard ref={ref} verse={verse} arabicSize={arabicSize} onWordTap={onWordTap} />;
}
