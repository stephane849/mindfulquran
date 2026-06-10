'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { TopBar } from '@/components/TopBar';
import { searchQuran } from '@/lib/api';
import { surahNumberOf, ayahNumberOf } from '@/lib/arabic';

const stripTags = (html: string) => html.replace(/<[^>]+>/g, '');

export default function SearchPage() {
  const [input, setInput] = useState('');
  // Results render only on submit — no per-keystroke repaints on e-ink
  const [query, setQuery] = useState('');

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error } =
    useInfiniteQuery({
      queryKey: ['search', query],
      queryFn: ({ pageParam }) => searchQuran(query, pageParam),
      initialPageParam: 1,
      getNextPageParam: (lastPage) =>
        lastPage.search.current_page < lastPage.search.total_pages
          ? lastPage.search.current_page + 1
          : undefined,
      enabled: query.length > 1,
    });

  const results = data?.pages.flatMap((p) => p.search.results) ?? [];
  const total = data?.pages[0]?.search.total_results;

  return (
    <div className="min-h-screen bg-paper">
      <TopBar title="Search" />

      <form
        className="flex gap-2 px-4 py-4 border-b-2 border-ink"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(input.trim());
        }}
      >
        <input
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search the Quran…"
          autoFocus
          className="flex-1 min-w-0 h-12 px-3 text-lg bg-paper border-2 border-ink rounded-lg placeholder:text-ink/100"
        />
        <button
          type="submit"
          className="h-12 px-4 text-base font-bold border-2 border-ink rounded-lg"
        >
          Go
        </button>
      </form>

      {isLoading && query && (
        <p className="px-4 py-8 text-center text-base">Searching…</p>
      )}

      {error && (
        <div className="px-4 py-8 text-center text-base">
          <p className="font-bold">Search failed.</p>
          <p className="mt-2">{error instanceof Error ? error.message : String(error)}</p>
        </div>
      )}

      {data && (
        <p className="px-4 py-3 text-[15px] divider-dotted">
          {(() => {
            const mode = data.pages[0]?.search.mode;
            if (mode === 'root') {
              const spaced = query.split('').join(' · ');
              return <><span className="font-bold">Root</span> {spaced} — {total} verse{total === 1 ? '' : 's'}</>;
            }
            return <>{total} result{total === 1 ? '' : 's'} for &ldquo;{query}&rdquo;</>;
          })()}
        </p>
      )}

      <ol>
        {results.map((result) => {
          const surah = surahNumberOf(result.verse_key);
          const ayah = ayahNumberOf(result.verse_key);
          const translation = result.translations?.[0];
          return (
            <li key={`${result.verse_key}-${result.verse_id}`}>
              <Link
                href={`/surah/${surah}#verse-${ayah}`}
                className="block px-4 py-4 divider-dotted"
              >
                <p className="text-[15px] font-bold">{result.verse_key}</p>
                <p
                  className="font-arabic text-2xl leading-loose text-right mt-1"
                  dir="rtl"
                  lang="ar"
                >
                  {stripTags(result.text)}
                </p>
                {translation && (
                  <p className="text-base leading-relaxed mt-1">
                    {stripTags(translation.text)}
                  </p>
                )}
              </Link>
            </li>
          );
        })}
      </ol>

      {hasNextPage && (
        <div className="px-4 py-5 text-center">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="text-base font-bold border-2 border-ink rounded-lg px-5 py-2"
          >
            {isFetchingNextPage ? 'Loading…' : 'More results'}
          </button>
        </div>
      )}

      {data && results.length === 0 && (
        <p className="px-4 py-8 text-center text-base">No results.</p>
      )}
    </div>
  );
}
