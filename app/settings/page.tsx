'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAppStore, type BrowseMode, type ArabicSize } from '@/lib/store';
import { ENGLISH_TRANSLATIONS } from '@/lib/api';

const BROWSE_MODES: { value: BrowseMode; label: string; detail: string }[] = [
  { value: 'surah', label: 'Surah', detail: '114 chapters' },
  { value: 'juz', label: 'Juz', detail: '30 parts' },
  { value: 'hizb', label: 'Hizb', detail: '60 half-parts' },
];

const ARABIC_SIZES: { value: ArabicSize; label: string }[] = [
  { value: 0, label: 'Small' },
  { value: 1, label: 'Medium' },
  { value: 2, label: 'Large' },
  { value: 3, label: 'Extra large' },
];

function Check() {
  return (
    <span className="text-lg font-bold" aria-label="selected">
      ✓
    </span>
  );
}

export default function SettingsPage() {
  const {
    translationId,
    showTranslation,
    browseMode,
    arabicSize,
    setTranslationId,
    setShowTranslation,
    setBrowseMode,
    setArabicSize,
  } = useAppStore();
  // Persisted state differs from prerendered HTML — wait for mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const rowClass =
    'w-full flex items-center justify-between py-3 divider-dotted text-left active:bg-ink active:text-paper';

  return (
    <div className="min-h-screen bg-paper">
      <nav className="sticky top-0 bg-paper border-b-2 border-ink px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-sm font-bold min-w-[44px] py-1">
          ‹ Back
        </Link>
        <span className="text-sm font-bold">Settings</span>
      </nav>

      {!mounted ? (
        <p className="px-4 py-8 text-center text-sm font-bold">Loading…</p>
      ) : (
        <>
          <section className="px-4 pt-5">
            <p className="text-xs font-bold uppercase tracking-widest mb-3">
              Translation
            </p>
            <ul>
              <li>
                <button onClick={() => setShowTranslation(false)} className={rowClass}>
                  <div>
                    <p className="text-sm font-bold">Arabic only</p>
                    <p className="text-xs">No translation shown</p>
                  </div>
                  {!showTranslation && <Check />}
                </button>
              </li>
              {ENGLISH_TRANSLATIONS.map((t) => (
                <li key={t.id}>
                  <button onClick={() => setTranslationId(t.id)} className={rowClass}>
                    <div>
                      <p className="text-sm font-bold">{t.name}</p>
                      <p className="text-xs">{t.author}</p>
                    </div>
                    {showTranslation && translationId === t.id && <Check />}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="px-4 pt-6">
            <p className="text-xs font-bold uppercase tracking-widest mb-3">
              Browse by
            </p>
            <ul>
              {BROWSE_MODES.map((m) => (
                <li key={m.value}>
                  <button onClick={() => setBrowseMode(m.value)} className={rowClass}>
                    <div>
                      <p className="text-sm font-bold">{m.label}</p>
                      <p className="text-xs">{m.detail}</p>
                    </div>
                    {browseMode === m.value && <Check />}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="px-4 pt-6 pb-8">
            <p className="text-xs font-bold uppercase tracking-widest mb-3">
              Arabic text size
            </p>
            <ul>
              {ARABIC_SIZES.map((s) => (
                <li key={s.value}>
                  <button onClick={() => setArabicSize(s.value)} className={rowClass}>
                    <div className="flex items-baseline gap-3">
                      <span
                        className={`font-arabic ${
                          ['text-xl', 'text-2xl', 'text-3xl', 'text-4xl'][s.value]
                        }`}
                        dir="rtl"
                        lang="ar"
                      >
                        عربي
                      </span>
                      <span className="text-sm font-bold">{s.label}</span>
                    </div>
                    {arabicSize === s.value && <Check />}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
