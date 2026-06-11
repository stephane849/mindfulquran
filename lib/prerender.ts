// Build-time verse loading for prerendered reader pages.
//
// Server components read the bundled JSON straight from public/quran/ so
// every surah/juz/hizb HTML file ships with its full Arabic text — the
// first paint shows content instead of a loading message. Mirrors the
// runtime slicing in lib/api.ts. Only the fields the mushaf flow renders
// are kept, so the baked HTML stays small.

import { promises as fs } from 'fs';
import path from 'path';
import type { Chapter, Verse, Prerendered } from './types';

const ROOT = path.join(process.cwd(), 'public', 'quran');

interface DiskVerse {
  id: number;
  verse_number: number;
  verse_key: string;
  juz_number: number;
  rub_el_hizb_number: number;
  text_uthmani: string;
}

async function readJson<T>(rel: string): Promise<T> {
  return JSON.parse(await fs.readFile(path.join(ROOT, rel), 'utf8')) as T;
}

// Module-level caches persist across the 204 page builds in one worker
let _chapters: Chapter[] | null = null;
async function loadChapters(): Promise<Chapter[]> {
  _chapters ??= await readJson<Chapter[]>('chapters.json');
  return _chapters;
}

const _surahs = new Map<number, DiskVerse[]>();
async function loadSurah(n: number): Promise<DiskVerse[]> {
  if (!_surahs.has(n)) {
    _surahs.set(n, (await readJson<{ verses: DiskVerse[] }>(`verses/${n}.json`)).verses);
  }
  return _surahs.get(n)!;
}

function strip(v: DiskVerse): Verse {
  return {
    id: v.id,
    verse_number: v.verse_number,
    verse_key: v.verse_key,
    text_uthmani: v.text_uthmani,
  } as Verse;
}

async function chaptersIn(verses: DiskVerse[]): Promise<Chapter[]> {
  const all = await loadChapters();
  const ids = new Set(verses.map((v) => parseInt(v.verse_key, 10)));
  return all.filter((c) => ids.has(c.id));
}

export async function prerenderChapter(id: number): Promise<Prerendered> {
  const verses = await loadSurah(id);
  const all = await loadChapters();
  return { verses: verses.map(strip), chapters: all.filter((c) => c.id === id) };
}

export async function prerenderJuz(id: number): Promise<Prerendered> {
  const idx = await readJson<{ juz: Record<string, number[]> }>('index.json');
  const surahIds = [...new Set(idx.juz[String(id)] ?? [])].sort((a, b) => a - b);
  const rows = (await Promise.all(surahIds.map(loadSurah)))
    .flat()
    .filter((v) => v.juz_number === id);
  return { verses: rows.map(strip), chapters: await chaptersIn(rows) };
}

export async function prerenderHizb(id: number): Promise<Prerendered> {
  const idx = await readJson<{ rub: Record<string, number[]> }>('index.json');
  // true hizb n (1–60) spans rub_el_hizb quarters (4n−3) through (4n)
  const lo = (id - 1) * 4 + 1;
  const hi = id * 4;
  const surahSet = new Set<number>();
  for (let r = lo; r <= hi; r++) {
    (idx.rub[String(r)] ?? []).forEach((s) => surahSet.add(s));
  }
  const surahIds = [...surahSet].sort((a, b) => a - b);
  const rows = (await Promise.all(surahIds.map(loadSurah)))
    .flat()
    .filter((v) => v.rub_el_hizb_number >= lo && v.rub_el_hizb_number <= hi);
  return { verses: rows.map(strip), chapters: await chaptersIn(rows) };
}
