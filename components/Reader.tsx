'use client';

import { Fragment, useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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

declare global {
  interface Window {
    __readerEndState?: {
      source: string;
      id: number;
      done: boolean;
      maxId: number;
    };
  }
}

const MAX_IDS: Record<string, number> = { chapter: 114, juz: 30, hizb: 60 };
const WORDS_PER_VERSE = 12; // Quran average: ~77 k words / 6 236 verses

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
  const setAwradLastRead = useAppStore((s) => s.setAwradLastRead);
  const setJuzLastRead = useAppStore((s) => s.setJuzLastRead);
  const setHizbLastRead = useAppStore((s) => s.setHizbLastRead);
  const recitationSpeed = useAppStore((s) => s.recitationSpeed);
  const setRecitationSpeed = useAppStore((s) => s.setRecitationSpeed);
  const loaderRef = useRef<HTMLDivElement>(null);
  const resumedRef = useRef(false);
  const visibleVerseKeyRef = useRef<string | null>(null);
  const pendingScrollKeyRef = useRef<string | null>(null);
  const isAwradRef = useRef(false);
  const prevTranslationKeyRef = useRef('');
  const sheetHistoryRef = useRef(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selected, setSelected] = useState<{ word: Word; verseKey: string } | null>(null);
  const [visibleVerseKey, setVisibleVerseKey] = useState<string | null>(null);
  // Persisted state differs from the prerendered HTML — gate it until mounted
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const sp = new URLSearchParams(window.location.search);
    isAwradRef.current = sp.get('awrad') === '1';
    // Cold-start: Capacitor may restore last URL with no prior history entry.
    // Inject a home entry so hardware back navigates home instead of minimizing.
    if (window.history.length <= 1) {
      const cur = window.location.href;
      window.history.replaceState(null, '', '/');
      window.history.pushState(null, '', cur);
    }
  }, []);

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

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error } =
    useInfiniteQuery({
      queryKey: ['verses', source, id, effectiveTranslation, withWords],
      queryFn: ({ pageParam }) =>
        getVersesBy(source, id, pageParam as number, effectiveTranslation, withWords),
      initialPageParam: 1,
      getNextPageParam: (lastPage) => lastPage.pagination?.next_page ?? undefined,
      enabled: mounted,
    });

  const allVerses = data?.pages.flatMap((p) => p.verses) ?? [];
  const totalVerses: number | undefined =
    source === 'chapter'
      ? chapter?.verses_count
      : data?.pages[0]?.pagination?.total_records;

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

  // Scroll a verse element into view with its top flush below the sticky
  // TopBar rather than hidden behind it.
  const scrollToVerse = (el: HTMLElement) => {
    el.scrollIntoView({ behavior: 'instant', block: 'start' });
    const nav = document.querySelector('nav.sticky') as HTMLElement | null;
    const navH = nav ? nav.getBoundingClientRect().bottom : 64;
    window.scrollBy({ top: -navH, behavior: 'instant' });
  };

  // Resume at saved position or #end. Also restores position after a
  // translation queryKey change flushes the cached data.
  useEffect(() => {
    if (!data) return;

    // Translation toggle: scroll back to where the reader was
    if (pendingScrollKeyRef.current) {
      const key = pendingScrollKeyRef.current;
      const el = document.querySelector(`[data-verse-key="${key}"]`) as HTMLElement | null;
      if (el) {
        pendingScrollKeyRef.current = null;
        scrollToVerse(el);
      }
      return;
    }

    if (resumedRef.current) return;
    const hash = window.location.hash;

    // #end: arrived by paging backward — scroll to the bottom so
    // volume-up continues the flow seamlessly.
    if (hash === '#end') {
      if (hasNextPage) {
        if (!isFetchingNextPage) fetchNextPage();
      } else {
        resumedRef.current = true;
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
      }
      return;
    }

    // #vk-2:150 — verse_key hash from LastReadBanner (collision-free)
    if (hash.startsWith('#vk-')) {
      const verseKey = hash.slice(4);
      const el = document.querySelector(`[data-verse-key="${verseKey}"]`) as HTMLElement | null;
      if (el) {
        resumedRef.current = true;
        scrollToVerse(el);
      } else if (!hasNextPage) {
        resumedRef.current = true; // verse not found; section fully loaded
      }
      return;
    }

    // Legacy #verse-N format (bookmarks saved before the vk- switch)
    if (!hash.startsWith('#verse-')) return;
    const el = document.getElementById(hash.slice(1)) as HTMLElement | null;
    if (el) {
      resumedRef.current = true;
      scrollToVerse(el);
    } else if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    } else if (!hasNextPage) {
      resumedRef.current = true;
    }
  }, [data, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Capture the visible verse key just before a translation change invalidates
  // the query cache so we can restore position once new data loads.
  useEffect(() => {
    const key = `${showTranslation}:${translationId}`;
    if (prevTranslationKeyRef.current !== '' && prevTranslationKeyRef.current !== key) {
      pendingScrollKeyRef.current = visibleVerseKeyRef.current;
    }
    prevTranslationKeyRef.current = key;
  }, [showTranslation, translationId]);

  // Keep __readerEndState current so PageScroll can dispatch advance/retreat.
  // Set immediately (source/id available for retreat even before all pages load);
  // done=true gates auto-advance.
  useEffect(() => {
    window.__readerEndState = {
      source,
      id,
      done: !hasNextPage && allVerses.length > 0,
      maxId: MAX_IDS[source] ?? 114,
    };
    return () => {
      delete window.__readerEndState;
    };
  }, [hasNextPage, allVerses.length, source, id]);

  // Navigate forward/backward when PageScroll dispatches advance/retreat
  useEffect(() => {
    const maxId = MAX_IDS[source] ?? 114;
    const onAdvance = () => {
      if (id >= maxId) return;
      const next = source === 'chapter' ? `/surah/${id + 1}` : `/${source}/${id + 1}`;
      router.push(next);
    };
    const onRetreat = () => {
      if (isAwradRef.current || id <= 1) return;
      // #end lands at the bottom of the previous section so paging up
      // continues the flow seamlessly instead of restarting at its top.
      const prev = source === 'chapter' ? `/surah/${id - 1}#end` : `/${source}/${id - 1}#end`;
      router.push(prev);
    };
    window.addEventListener('mindful:advance', onAdvance);
    window.addEventListener('mindful:retreat', onRetreat);
    return () => {
      window.removeEventListener('mindful:advance', onAdvance);
      window.removeEventListener('mindful:retreat', onRetreat);
    };
  }, [source, id, router]);

  // Push a history entry when a sheet opens so hardware back closes it.
  useEffect(() => {
    if ((settingsOpen || selected !== null) && !sheetHistoryRef.current) {
      window.history.pushState({ mindful: 'sheet' }, '');
      sheetHistoryRef.current = true;
    }
  }, [settingsOpen, selected]);

  // Hardware back (popstate) closes any open sheet.
  useEffect(() => {
    const onPop = () => {
      if (sheetHistoryRef.current) {
        sheetHistoryRef.current = false;
        setSettingsOpen(false);
        setSelected(null);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Close helpers: sync history back when closed programmatically.
  const closeSettings = () => {
    setSettingsOpen(false);
    if (sheetHistoryRef.current) {
      sheetHistoryRef.current = false;
      window.history.back();
    }
  };

  const closeSelected = () => {
    setSelected(null);
    if (sheetHistoryRef.current) {
      sheetHistoryRef.current = false;
      window.history.back();
    }
  };

  const handleVerseVisible = useCallback(
    (verse: Verse) => {
      const surahId = surahNumberOf(verse.verse_key);
      const surah = chapters?.find((c) => c.id === surahId);
      if (!surah) return;
      const payload = {
        surahId,
        surahName: surah.name_simple,
        verseKey: verse.verse_key,
        verseNumber: ayahNumberOf(verse.verse_key),
      };
      visibleVerseKeyRef.current = verse.verse_key;
      setVisibleVerseKey(verse.verse_key);
      if (isAwradRef.current) {
        setAwradLastRead(payload);
      } else if (source === 'juz') {
        setJuzLastRead({ ...payload, source: 'juz', sourceId: id });
      } else if (source === 'hizb') {
        setHizbLastRead({ ...payload, source: 'hizb', sourceId: id });
      } else {
        setLastRead(payload);
      }
    },
    [chapters, setLastRead, setAwradLastRead]
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

  // Consecutive same-surah runs; a chapter read is always a single group
  const groups: { surahId: number; verses: Verse[] }[] = [];
  for (const verse of allVerses) {
    const surahId = surahNumberOf(verse.verse_key);
    const last = groups[groups.length - 1];
    if (last && last.surahId === surahId) last.verses.push(verse);
    else groups.push({ surahId, verses: [verse] });
  }

  const mushafMode = mounted && !showTranslation;

  // Progress only in mushaf mode; uses recitation WPM × avg words/verse
  let progressText: string | undefined;
  if (mushafMode && totalVerses && visibleVerseKey) {
    const currentNum =
      source === 'chapter'
        ? ayahNumberOf(visibleVerseKey)
        : (allVerses.findIndex((v) => v.verse_key === visibleVerseKey) + 1) || 0;
    if (currentNum > 0) {
      const pct = Math.round((currentNum / totalVerses) * 100);
      const remaining = Math.ceil(
        ((totalVerses - currentNum) * WORDS_PER_VERSE) / recitationSpeed
      );
      progressText = `${pct}% · ${remaining < 1 ? '< 1m' : `${remaining}m`}`;
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <TopBar
        title={title}
        progress={progressText}
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
      <BottomSheet open={settingsOpen} onClose={closeSettings}>
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
          Recitation speed
        </p>
        <div className="flex gap-2">
          {([45, 60, 90, 120] as const).map((wpm) => (
            <button
              key={wpm}
              onClick={() => setRecitationSpeed(wpm)}
              className={`flex-1 h-12 border-2 border-ink rounded-lg text-base font-bold ${
                recitationSpeed === wpm ? 'bg-ink text-paper' : ''
              }`}
            >
              {wpm}
            </button>
          ))}
        </div>
        <p className="text-[13px] mt-1 mb-1">words per minute</p>

        <p className="text-[15px] font-bold uppercase tracking-widest mt-5 mb-2">
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
      <BottomSheet open={selected !== null} onClose={closeSelected}>
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
      data-mushaf
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
    <span ref={ref} id={`verse-${verse.verse_number}`} data-verse-key={verse.verse_key}>
      {words?.length && onWordTap
        ? words.map((word, i) => (
            <Fragment key={word.id}>
              {i > 0 && ' '}
              <button
                onClick={() => onWordTap(word, verse.verse_key)}
                onContextMenu={(e) => e.preventDefault()}
                className="inline select-none [user-select:none] [-webkit-user-select:none]"
              >
                {word.text_uthmani}
              </button>
            </Fragment>
          ))
        : verse.text_uthmani}
      <span className={markerClass}> ﴿{toArabicDigits(ayahNumberOf(verse.verse_key))}﴾ </span>
    </span>
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

  return (
    <div ref={ref} data-verse-key={verse.verse_key}>
      <VerseCard verse={verse} arabicSize={arabicSize} onWordTap={onWordTap} />
    </div>
  );
}
