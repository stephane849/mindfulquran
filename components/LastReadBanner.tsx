'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getChapters } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { BottomSheet } from '@/components/BottomSheet';
import type { LastRead } from '@/lib/types';

function readLink(r: LastRead): string {
  const frag = `#vk-${r.verseKey}`;
  if (r.source === 'juz' && r.sourceId) return `/juz/${r.sourceId}${frag}`;
  if (r.source === 'hizb' && r.sourceId) return `/hizb/${r.sourceId}${frag}`;
  if (r.source === 'chapter') return `/surah/${r.surahId}?awrad=1${frag}`;
  return `/surah/${r.surahId}${frag}`;
}

function readLabel(r: LastRead): string {
  if (r.source === 'juz' && r.sourceId) return `Juz ${r.sourceId}`;
  if (r.source === 'hizb' && r.sourceId) return `Hizb ${r.sourceId}`;
  if (r.source === 'chapter') return 'Awrad';
  return 'Continue Reading';
}

export function LastReadBanner() {
  const browseMode = useAppStore((s) => s.browseMode);
  const lastRead = useAppStore((s) => s.lastRead);
  const juzLastRead = useAppStore((s) => s.juzLastRead);
  const hizbLastRead = useAppStore((s) => s.hizbLastRead);
  const awradLastRead = useAppStore((s) => s.awradLastRead);
  const setLastRead = useAppStore((s) => s.setLastRead);
  const setJuzLastRead = useAppStore((s) => s.setJuzLastRead);
  const setHizbLastRead = useAppStore((s) => s.setHizbLastRead);
  const setAwradLastRead = useAppStore((s) => s.setAwradLastRead);
  const [mounted, setMounted] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [draftKey, setDraftKey] = useState('');
  const [inputError, setInputError] = useState('');

  useEffect(() => setMounted(true), []);

  // Chapters are already cached by the home page query — this is instant.
  const { data: chapters } = useQuery({
    queryKey: ['chapters'],
    queryFn: getChapters,
    staleTime: Infinity,
  });

  if (!mounted) return null;

  const read: LastRead | null =
    browseMode === 'juz' ? juzLastRead
    : browseMode === 'hizb' ? hizbLastRead
    : browseMode === 'awrad' ? awradLastRead
    : lastRead;

  if (!read) return null;

  const openEditor = () => {
    setDraftKey(read.verseKey);
    setInputError('');
    setEditOpen(true);
  };

  const handleSave = () => {
    const parts = draftKey.trim().split(':');
    if (parts.length !== 2) { setInputError('Enter a verse like 2:150'); return; }
    const surahId = parseInt(parts[0], 10);
    const verseNumber = parseInt(parts[1], 10);
    if (!surahId || !verseNumber) { setInputError('Enter a verse like 2:150'); return; }
    const chapter = chapters?.find((c) => c.id === surahId);
    if (!chapter) { setInputError(`Surah ${surahId} not found (1–114)`); return; }
    if (verseNumber < 1 || verseNumber > chapter.verses_count) {
      setInputError(`${chapter.name_simple} has ${chapter.verses_count} verses`);
      return;
    }
    const updated: LastRead = {
      surahId,
      surahName: chapter.name_simple,
      verseKey: `${surahId}:${verseNumber}`,
      verseNumber,
      source: read.source,
      sourceId: read.sourceId,
    };
    if (browseMode === 'juz') setJuzLastRead(updated);
    else if (browseMode === 'hizb') setHizbLastRead(updated);
    else if (browseMode === 'awrad') setAwradLastRead(updated);
    else setLastRead(updated);
    setEditOpen(false);
  };

  return (
    <>
      <div className="flex mx-4 my-3 border-2 border-ink rounded-lg overflow-hidden">
        <Link href={readLink(read)} className="flex-1 p-4 block">
          <span className="text-[15px] font-bold uppercase tracking-widest">
            {readLabel(read)}
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="font-bold text-lg">{read.surahName}</span>
            <span className="text-lg">Ayah {read.verseNumber} ›</span>
          </div>
        </Link>
        <button
          onClick={openEditor}
          aria-label="Edit bookmark"
          className="border-l-2 border-ink px-4 shrink-0 flex items-center"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
          </svg>
        </button>
      </div>

      <BottomSheet open={editOpen} onClose={() => setEditOpen(false)}>
        <p className="text-[15px] font-bold uppercase tracking-widest mt-2 mb-1">
          Edit Bookmark
        </p>
        <p className="text-base mb-4 text-ink">
          Enter a verse reference (Surah:Ayah)
        </p>
        <input
          type="text"
          inputMode="numeric"
          value={draftKey}
          onChange={(e) => { setDraftKey(e.target.value); setInputError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          placeholder="2:150"
          className="w-full border-2 border-ink rounded-lg px-3 py-3 text-xl font-bold bg-paper text-ink"
        />
        {inputError && (
          <p className="text-base font-bold mt-2">{inputError}</p>
        )}
        <button
          onClick={handleSave}
          className="mt-4 w-full border-2 border-ink rounded-lg py-3 text-base font-bold bg-ink text-paper"
        >
          Set Bookmark
        </button>
      </BottomSheet>
    </>
  );
}
