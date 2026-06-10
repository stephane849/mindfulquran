'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Chapter } from '@/lib/types';

const AWRAD_GROUPS = [
  {
    label: 'Jumuʿah (Friday)',
    ids: [18, 32, 44, 73, 85, 86, 93, 94, 97, 106, 108, 109, 110, 111, 112, 113, 114],
  },
  { label: 'After Fajr', ids: [36] },
  { label: 'After ʿAsr', ids: [56] },
  { label: 'Before Sleep', ids: [67] },
];

export function AwradSection({ chapters }: { chapters: Chapter[] | undefined }) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (!chapters) return null;

  return (
    <div>
      {AWRAD_GROUPS.map((group, gi) => {
        const isOpen = expandedIndex === gi;
        return (
          <div key={gi} className="divider-dotted">
            <button
              className="w-full flex items-center justify-between px-4 py-3 text-left active:bg-ink active:text-paper"
              onClick={() => setExpandedIndex(isOpen ? null : gi)}
              aria-expanded={isOpen}
            >
              <span className="text-lg font-bold">{group.label}</span>
              <span className="text-xl font-bold" aria-hidden>
                {isOpen ? '−' : '+'}
              </span>
            </button>
            {isOpen && (
              <ol className="border-t border-ink/30">
                {group.ids.map((surahId) => {
                  const c = chapters.find((ch) => ch.id === surahId);
                  if (!c) return null;
                  return (
                    <li key={surahId}>
                      <Link
                        href={`/surah/${surahId}?awrad=1`}
                        className="flex items-center gap-3 px-4 py-3 divider-dotted active:bg-ink active:text-paper"
                      >
                        <span className="w-8 shrink-0 text-base font-bold tabular-nums">
                          {surahId}
                        </span>
                        <span className="flex-1 font-bold">{c.name_simple}</span>
                        <span className="font-arabic text-xl" dir="rtl" lang="ar">
                          {c.name_arabic}
                        </span>
                        <span className="shrink-0 text-xl font-bold" aria-hidden>
                          ›
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        );
      })}
    </div>
  );
}
