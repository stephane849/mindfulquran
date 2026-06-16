// All data served from bundled static JSON under public/quran/.
// No network calls at runtime — the app works fully offline.

import type { Chapter, Verse, VersesResponse, SearchResponse, SearchResult } from './types';

export type ReaderSource = 'chapter' | 'juz' | 'hizb';

export const DEFAULT_TRANSLATION_ID = 85; // M.A.S. Abdel Haleem

export const ENGLISH_TRANSLATIONS = [
  { id: 20,  name: 'Saheeh International', author: 'Saheeh International' },
  { id: 85,  name: 'M.A.S. Abdel Haleem', author: 'Abdul Haleem' },
  { id: 22,  name: 'A. Yusuf Ali',         author: 'Abdullah Yusuf Ali' },
  { id: 203, name: 'Al-Hilali & Khan',     author: 'al-Hilali & Muhsin Khan' },
] as const;

export type TranslationId = (typeof ENGLISH_TRANSLATIONS)[number]['id'];

// ─── Internal offline types ───────────────────────────────────────────────────

interface OfflineVerse {
  id: number;
  verse_number: number;
  verse_key: string;
  juz_number: number;
  rub_el_hizb_number: number;
  hizb_number: number;
  ruku_number: number;
  manzil_number: number;
  sajdah_number: number | null;
  page_number: number;
  text_uthmani: string;
  /** Translations keyed by resource_id string */
  trs: Record<string, string>;
  words: Verse['words'] & {};
}

type OfflineIndex = {
  juz: Record<string, number[]>;
  rub: Record<string, number[]>;
};

type SearchEntry = { k: string; a: string; t: string };

// Bare Arabic consonants (U+0621–U+064A); matches a root query typed
// without any diacritics, e.g. "علم" to find all علم-root verses.
const ROOT_RE = /^[ء-ي]{2,5}$/;

// Strip harakat, tatweel, and small alef so bare-letter queries match
// diacritized Uthmani text in the search corpus.
function stripDiacritics(s: string): string {
  return s.replace(/[ً-ٟـٰ]/g, '');
}

// ─── In-memory cache (module-level singletons) ────────────────────────────────

let _chapters: Chapter[] | null = null;
const _surahs  = new Map<number, OfflineVerse[]>();
let _index:  OfflineIndex | null = null;
let _search: SearchEntry[]  | null = null;
let _roots:  Record<string, string[]> | null = null;

// ─── Loaders ──────────────────────────────────────────────────────────────────

async function loadChapters(): Promise<Chapter[]> {
  if (!_chapters) {
    _chapters = await (await fetch('/quran/chapters.json')).json();
  }
  return _chapters!;
}

async function loadSurah(n: number): Promise<OfflineVerse[]> {
  if (!_surahs.has(n)) {
    const d = await (await fetch(`/quran/verses/${n}.json`)).json() as { verses: OfflineVerse[] };
    _surahs.set(n, d.verses);
  }
  return _surahs.get(n)!;
}

async function loadIndex(): Promise<OfflineIndex> {
  if (!_index) {
    _index = await (await fetch('/quran/index.json')).json();
  }
  return _index!;
}

async function loadSearch(): Promise<SearchEntry[]> {
  if (!_search) {
    _search = await (await fetch('/quran/search.json')).json();
  }
  return _search!;
}

async function loadRoots(): Promise<Record<string, string[]>> {
  if (!_roots) {
    _roots = await (await fetch('/quran/roots.json')).json();
  }
  return _roots!;
}

// ─── Pagination helper ────────────────────────────────────────────────────────

const PER_PAGE = 9999; // load the entire section in one shot

function toVerse(v: OfflineVerse, translationId: number | null, withWords: boolean): Verse {
  const out: Verse = {
    id: v.id, verse_number: v.verse_number, verse_key: v.verse_key,
    hizb_number: v.hizb_number, rub_el_hizb_number: v.rub_el_hizb_number,
    ruku_number: v.ruku_number, manzil_number: v.manzil_number,
    sajdah_number: v.sajdah_number, page_number: v.page_number,
    juz_number: v.juz_number, text_uthmani: v.text_uthmani,
  };
  if (translationId !== null) {
    const text = v.trs[String(translationId)];
    if (text) out.translations = [{ id: translationId, resource_id: translationId, text }];
  }
  if (withWords) out.words = v.words;
  return out;
}

function paginate(
  all: OfflineVerse[],
  pageNum: number,
  translationId: number | null,
  withWords: boolean,
): VersesResponse {
  const total = all.length;
  const from  = (pageNum - 1) * PER_PAGE;
  const to    = Math.min(from + PER_PAGE, total);
  return {
    verses: all.slice(from, to).map(v => toVerse(v, translationId, withWords)),
    pagination: {
      per_page:     PER_PAGE,
      current_page: pageNum,
      next_page:    to < total ? pageNum + 1 : null,
      total_pages:  Math.ceil(total / PER_PAGE),
      total_records: total,
    },
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getChapters(): Promise<Chapter[]> {
  return loadChapters();
}

export async function getVersesBy(
  source: ReaderSource,
  id: number,
  pageNum: number,
  translationId: number | null,
  withWords = false,
): Promise<VersesResponse> {
  if (source === 'chapter') {
    return paginate(await loadSurah(id), pageNum, translationId, withWords);
  }

  const idx = await loadIndex();

  if (source === 'juz') {
    const surahIds = [...new Set(idx.juz[String(id)] ?? [])].sort((a, b) => a - b);
    const rows = (await Promise.all(surahIds.map(loadSurah)))
      .flat()
      .filter(v => v.juz_number === id);
    return paginate(rows, pageNum, translationId, withWords);
  }

  // hizb: true hizb n (1–60) spans rub_el_hizb quarters (4n−3) through (4n)
  const lo = (id - 1) * 4 + 1;
  const hi = id * 4;
  const surahSet = new Set<number>();
  for (let r = lo; r <= hi; r++) {
    (idx.rub[String(r)] ?? []).forEach(s => surahSet.add(s));
  }
  const surahIds = [...surahSet].sort((a, b) => a - b);
  const rows = (await Promise.all(surahIds.map(loadSurah)))
    .flat()
    .filter(v => v.rub_el_hizb_number >= lo && v.rub_el_hizb_number <= hi);
  return paginate(rows, pageNum, translationId, withWords);
}

export async function getVerseTranslation(
  verseKey: string,
  translationId: number,
): Promise<string | null> {
  const [surahStr, verseStr] = verseKey.split(':');
  const verses = await loadSurah(parseInt(surahStr, 10));
  const v = verses.find((v) => v.verse_number === parseInt(verseStr, 10));
  return v?.trs[String(translationId)] ?? null;
}

export async function searchQuran(query: string, pageNum: number): Promise<SearchResponse> {
  const q = query.trim();
  const PER = 20;
  const from = (pageNum - 1) * PER;

  // Root search: bare Arabic letters (no diacritics), 2–5 chars
  if (ROOT_RE.test(q)) {
    const rootMap = await loadRoots();
    const verseKeys = rootMap[q];
    if (verseKeys && verseKeys.length > 0) {
      const entries  = await loadSearch();
      const byKey    = new Map(entries.map(e => [e.k, e]));
      const results: SearchResult[] = verseKeys
        .slice(from, from + PER)
        .map(key => byKey.get(key))
        .filter((e): e is SearchEntry => e !== undefined)
        .map(e => ({
          verse_key: e.k,
          verse_id:  0,
          text:      e.a,
          translations: [{ text: e.t, resource_id: 85, name: 'M.A.S. Abdel Haleem' }],
        }));
      return {
        search: {
          query,
          total_results: verseKeys.length,
          current_page:  pageNum,
          total_pages:   Math.ceil(verseKeys.length / PER),
          results,
          mode: 'root',
        },
      };
    }
    // Unknown root — fall through to text search
  }

  // Text search: strip diacritics so bare-letter queries match Uthmani text
  const entries  = await loadSearch();
  const qStrip   = stripDiacritics(q);
  const qLower   = q.toLowerCase();
  const hits = entries.filter(
    e => stripDiacritics(e.a).includes(qStrip) || e.t.toLowerCase().includes(qLower)
  );
  const results: SearchResult[] = hits.slice(from, from + PER).map(e => ({
    verse_key: e.k,
    verse_id:  0,
    text:      e.a,
    translations: [{ text: e.t, resource_id: 85, name: 'M.A.S. Abdel Haleem' }],
  }));
  return {
    search: {
      query,
      total_results: hits.length,
      current_page:  pageNum,
      total_pages:   Math.ceil(hits.length / PER),
      results,
      mode: 'text',
    },
  };
}
