import type { Chapter, Verse, VersesResponse } from './types';

const BASE = 'https://api.qurancdn.com/api/v4';

async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

export async function getChapters(): Promise<Chapter[]> {
  const data = await get<{ chapters: Chapter[] }>('/chapters', { language: 'en' });
  return data.chapters;
}

export type ReaderSource = 'chapter' | 'juz' | 'hizb';

const SOURCE_PATH: Record<ReaderSource, string> = {
  chapter: 'by_chapter',
  juz: 'by_juz',
  hizb: 'by_hizb',
};

export async function getVersesBy(
  source: ReaderSource,
  id: number,
  page: number,
  translationId: number | null,
  withWords = false
): Promise<VersesResponse> {
  const params: Record<string, string> = {
    fields: 'text_uthmani',
    per_page: '50',
    page: String(page),
  };
  if (translationId !== null) params.translations = String(translationId);
  if (withWords) {
    params.words = 'true';
    params.word_fields = 'text_uthmani';
  }
  return get<VersesResponse>(`/verses/${SOURCE_PATH[source]}/${id}`, params);
}

export async function searchQuran(query: string, page: number) {
  return get<import('./types').SearchResponse>('/search', {
    q: query,
    size: '20',
    page: String(page),
    language: 'en',
  });
}

// Ids verified against /resources/translations?language=en on api.qurancdn.com
export const ENGLISH_TRANSLATIONS = [
  { id: 20, name: 'Saheeh International', author: 'Saheeh International' },
  { id: 85, name: 'M.A.S. Abdel Haleem', author: 'Abdul Haleem' },
  { id: 22, name: 'A. Yusuf Ali', author: 'Abdullah Yusuf Ali' },
  { id: 203, name: 'Al-Hilali & Khan', author: 'al-Hilali & Muhsin Khan' },
] as const;

export const DEFAULT_TRANSLATION_ID = 85; // M.A.S. Abdel Haleem

export type TranslationId = (typeof ENGLISH_TRANSLATIONS)[number]['id'];
