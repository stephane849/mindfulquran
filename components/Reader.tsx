'use client';

import { Fragment, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getChapters, getVersesBy, getVerseTranslation, ENGLISH_TRANSLATIONS, type ReaderSource } from '@/lib/api';
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
import { getPageHeight } from '@/lib/paging';
import type { Chapter, Verse, Word, Prerendered } from '@/lib/types';

declare global {
  interface Window {
    __readerEndState?: {
      source: string;
      id: number;
      done: boolean;
      maxId: number;
    };
    __volumePage?: (dir: 'up' | 'down') => void;
  }
}

const MAX_IDS: Record<string, number> = { chapter: 114, juz: 30, hizb: 60 };

export function Reader({
  source,
  id,
  prerendered,
}: {
  source: ReaderSource;
  id: number;
  prerendered?: Prerendered;
}) {
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
  const sheetHistoryRef = useRef(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selected, setSelected] = useState<{ word: Word; verseKey: string } | null>(null);
  const [selectedTransKey, setSelectedTransKey] = useState<string | null>(null);
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

  // Use prerendered chapters for first paint; switch to query data once loaded
  const effectiveChapters = chapters ?? prerendered?.chapters;
  const chapter = source === 'chapter' ? effectiveChapters?.find((c) => c.id === id) : undefined;
  const title =
    source === 'chapter'
      ? chapter?.name_simple ?? `Surah ${id}`
      : source === 'juz'
      ? `Juz ${id}`
      : `Hizb ${id}`;

  const effectiveTranslation = mounted && showTranslation ? translationId : null;
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
  // Show prerendered Arabic text on first paint; switch to query data once
  // mounted and loaded so translations and word-dictionary data are included.
  const displayVerses =
    !mounted || allVerses.length === 0 ? (prerendered?.verses ?? []) : allVerses;

  // Cumulative Arabic word counts for accurate reading-time estimates.
  // The 12-words/verse approximation was wildly off (e.g. Al-Baqarah averages
  // ~28 words/verse). We count actual words from text_uthmani instead.
  const wordMap = useMemo(() => {
    const verses = allVerses.length > 0 ? allVerses : (prerendered?.verses ?? []);
    const map = new Map<string, number>();
    let total = 0;
    for (const v of verses) {
      total += v.text_uthmani.trim().split(/\s+/).filter(Boolean).length;
      map.set(v.verse_key, total);
    }
    return { map, total };
  }, [data, prerendered]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const scrollToVerse = (el: HTMLElement) => {
    requestAnimationFrame(() => {
      const nav = document.querySelector('nav.sticky') as HTMLElement | null;
      const navH = nav ? nav.getBoundingClientRect().bottom : 64;
      const verseDocTop = el.getBoundingClientRect().top + window.scrollY - navH;
      const pH = getPageHeight();
      const pageStart = Math.max(0, Math.floor(verseDocTop / pH)) * pH;
      window.scrollTo({ top: pageStart, behavior: 'instant' });
    });
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

    if (hash === '#end') {
      if (hasNextPage) {
        if (!isFetchingNextPage) fetchNextPage();
      } else {
        resumedRef.current = true;
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
      }
      return;
    }

    if (hash.startsWith('#vk-')) {
      const verseKey = decodeURIComponent(hash.slice(4));
      const el = document.querySelector(`[data-verse-key="${verseKey}"]`) as HTMLElement | null;
      if (el) {
        resumedRef.current = true;
        scrollToVerse(el);
      } else if (!hasNextPage) {
        resumedRef.current = true;
      }
      return;
    }

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

  useEffect(() => {
    const maxId = MAX_IDS[source] ?? 114;
    const onAdvance = () => {
      if (id >= maxId) return;
      const next = source === 'chapter' ? `/surah/${id + 1}` : `/${source}/${id + 1}`;
      router.push(next);
    };
    const onRetreat = () => {
      if (isAwradRef.current || id <= 1) return;
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

  useEffect(() => {
    if ((settingsOpen || selected !== null || selectedTransKey !== null) && !sheetHistoryRef.current) {
      window.history.pushState({ mindful: 'sheet' }, '');
      sheetHistoryRef.current = true;
    }
  }, [settingsOpen, selected, selectedTransKey]);

  useEffect(() => {
    const onPop = () => {
      if (sheetHistoryRef.current) {
        sheetHistoryRef.current = false;
        setSettingsOpen(false);
        setSelected(null);
        setSelectedTransKey(null);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Tap zones: left-half tap → page up, right-half tap → page down.
  // Skipped when the tap lands on a button/link/input/nav or a sheet is open.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (settingsOpen || selected !== null) return;
      if ((e.target as Element).closest('button, a, input, nav, select, [data-tap-ignore]')) return;
      window.__volumePage?.(e.clientX < window.innerWidth / 2 ? 'up' : 'down');
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [settingsOpen, selected]);

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
      const surah = effectiveChapters?.find((c) => c.id === surahId);
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
        setAwradLastRead({ ...payload, source: 'chapter' });
      } else if (source === 'juz') {
        setJuzLastRead({ ...payload, source: 'juz', sourceId: id });
      } else if (source === 'hizb') {
        setHizbLastRead({ ...payload, source: 'hizb', sourceId: id });
      } else {
        setLastRead(payload);
      }
    },
    [effectiveChapters, source, id, setLastRead, setAwradLastRead, setJuzLastRead, setHizbLastRead]
  );

  const handleWordTap = useCallback(
    (word: Word, verseKey: string) => setSelected({ word, verseKey }),
    []
  );

  const { data: verseTransText } = useQuery({
    queryKey: ['verse-trans', selectedTransKey, translationId],
    queryFn: () => getVerseTranslation(selectedTransKey!, translationId),
    enabled: selectedTransKey !== null,
    staleTime: Infinity,
  });

  const selectedTransVerse = selectedTransKey
    ? displayVerses.find((v) => v.verse_key === selectedTransKey) ?? null
    : null;
  const selectedTransSurahId = selectedTransKey ? surahNumberOf(selectedTransKey) : null;
  const selectedTransChapter = selectedTransSurahId
    ? effectiveChapters?.find((c) => c.id === selectedTransSurahId)
    : null;
  const transName = ENGLISH_TRANSLATIONS.find((t) => t.id === translationId)?.name ?? '';

  const closeTranslation = () => {
    setSelectedTransKey(null);
    if (sheetHistoryRef.current) {
      sheetHistoryRef.current = false;
      window.history.back();
    }
  };

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

  const groups: { surahId: number; verses: Verse[] }[] = [];
  for (const verse of displayVerses) {
    const surahId = surahNumberOf(verse.verse_key);
    const last = groups[groups.length - 1];
    if (last && last.surahId === surahId) last.verses.push(verse);
    else groups.push({ surahId, verses: [verse] });
  }

  // Before mount, always render mushaf so the server-rendered HTML matches the
  // first client render exactly (avoids hydration mismatch when showTranslation
  // is persisted as true in localStorage).
  const mushafMode = !mounted ? true : !showTranslation;

  // Call synchronously inside a click handler (before setState) so the DOM
  // still reflects the old layout when we read bounding rects.
  const captureTopVerse = () => {
    const navH = (document.querySelector('nav.sticky') as HTMLElement | null)
      ?.getBoundingClientRect().bottom ?? 64;
    let bestKey: string | null = null;
    let bestBelowTop = Infinity;
    let bestAboveKey: string | null = null;
    let bestAboveTop = -Infinity;
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('[data-verse-key]'))) {
      const rect = el.getBoundingClientRect();
      if (rect.bottom <= navH || rect.top >= window.innerHeight) continue;
      const key = el.dataset.verseKey;
      if (!key) continue;
      if (rect.top >= navH) {
        if (rect.top < bestBelowTop) { bestBelowTop = rect.top; bestKey = key; }
      } else {
        if (rect.top > bestAboveTop) { bestAboveTop = rect.top; bestAboveKey = key; }
      }
    }
    pendingScrollKeyRef.current = bestKey ?? bestAboveKey ?? visibleVerseKeyRef.current;
  };

  // Progress: percentage + time remaining, both from real Arabic word counts
  let progressText: string | undefined;
  if (mounted && wordMap.total > 0) {
    const wordsRead = wordMap.map.get(visibleVerseKey ?? '') ?? 0;
    const pct = Math.round((wordsRead / wordMap.total) * 100);
    const remaining = Math.ceil((wordMap.total - wordsRead) / recitationSpeed);
    const timeStr = remaining < 1 ? '< 1m' : `${remaining}m`;
    progressText = `${pct}% · ${timeStr}`;
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
                onClick={() => { captureTopVerse(); setShowTranslation(!showTranslation); }}
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

      {(isLoading || !mounted) && displayVerses.length === 0 && (
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
            <SurahDivider chapter={effectiveChapters?.find((c) => c.id === group.surahId)} />
          )}
          {mushafMode ? (
            <MushafGroup
              verses={group.verses}
              arabicSize={arabicSize}
              onVisible={handleVerseVisible}
              onWordTap={tapDictionary ? handleWordTap : undefined}
              onMarkerTap={setSelectedTransKey}
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
        {mounted && (
          isFetchingNextPage
            ? 'Loading more…'
            : !hasNextPage && allVerses.length > 0
            ? `· End of ${source === 'chapter' ? 'surah' : source} ·`
            : null
        )}
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
              onClick={() => { captureTopVerse(); setShowTranslation(false); }}
              className="w-full flex items-center justify-between py-3 divider-dotted text-left"
            >
              <span className="text-lg font-bold">Arabic only</span>
              {!showTranslation && <span className="text-xl font-bold">✓</span>}
            </button>
          </li>
          {ENGLISH_TRANSLATIONS.map((t) => (
            <li key={t.id}>
              <button
                onClick={() => { captureTopVerse(); setTranslationId(t.id); }}
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

      {/* Verse translation (tap ﴿n﴾ marker in mushaf mode) */}
      <BottomSheet open={selectedTransKey !== null} onClose={closeTranslation}>
        {selectedTransVerse && (
          <div className="py-4">
            <p className="text-[13px] font-bold uppercase tracking-widest text-center mb-4">
              {selectedTransChapter?.name_simple} · {selectedTransKey}
            </p>
            <p className="font-arabic text-2xl leading-loose text-right px-2 mb-4" dir="rtl" lang="ar">
              {selectedTransVerse.text_uthmani}
            </p>
            {verseTransText && (
              <>
                <p className="text-[13px] font-bold uppercase tracking-widest mb-2">{transName}</p>
                <p className="text-lg leading-relaxed">{verseTransText}</p>
              </>
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
  onMarkerTap,
}: {
  verses: Verse[];
  arabicSize: number;
  onVisible: (v: Verse) => void;
  onWordTap?: (w: Word, verseKey: string) => void;
  onMarkerTap?: (verseKey: string) => void;
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
          onMarkerTap={onMarkerTap}
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
  onMarkerTap,
}: {
  verse: Verse;
  markerClass: string;
  onVisible: (v: Verse) => void;
  onWordTap?: (w: Word, verseKey: string) => void;
  onMarkerTap?: (verseKey: string) => void;
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
    <span
      ref={ref}
      id={`verse-${verse.verse_number}`}
      data-verse-key={verse.verse_key}
    >
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
      {onMarkerTap ? (
        <button
          type="button"
          onClick={() => onMarkerTap(verse.verse_key)}
          className={`${markerClass} inline`}
        >
          {' '}﴿{toArabicDigits(ayahNumberOf(verse.verse_key))}﴾{' '}
        </button>
      ) : (
        <span className={markerClass}> ﴿{toArabicDigits(ayahNumberOf(verse.verse_key))}﴾ </span>
      )}
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
    <div
      ref={ref}
      data-verse-key={verse.verse_key}
    >
      <VerseCard verse={verse} arabicSize={arabicSize} onWordTap={onWordTap} />
    </div>
  );
}
