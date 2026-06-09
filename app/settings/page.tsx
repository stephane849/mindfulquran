'use client';

import { useEffect, useState } from 'react';
import { TopBar } from '@/components/TopBar';
import { useAppStore, type ArabicSize } from '@/lib/store';
import { ENGLISH_TRANSLATIONS } from '@/lib/api';

const ARABIC_SIZES: { value: ArabicSize; label: string }[] = [
  { value: 0, label: 'Small' },
  { value: 1, label: 'Medium' },
  { value: 2, label: 'Large' },
  { value: 3, label: 'Extra large' },
];

function Check() {
  return (
    <span className="text-xl font-bold" aria-label="selected">
      ✓
    </span>
  );
}

export default function SettingsPage() {
  const {
    translationId,
    showTranslation,
    arabicSize,
    tapDictionary,
    setTranslationId,
    setShowTranslation,
    setArabicSize,
    setTapDictionary,
  } = useAppStore();
  // Persisted state differs from prerendered HTML — wait for mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const rowClass =
    'w-full flex items-center justify-between py-3 divider-dotted text-left active:bg-ink active:text-paper';

  return (
    <div className="min-h-screen bg-paper">
      <TopBar title="Settings" />

      {!mounted ? (
        <p className="px-4 py-8 text-center text-base">Loading…</p>
      ) : (
        <>
          <section className="px-4 pt-5">
            <p className="text-[15px] font-bold uppercase tracking-widest mb-2">
              Translation
            </p>
            <ul>
              <li>
                <button onClick={() => setShowTranslation(false)} className={rowClass}>
                  <div>
                    <p className="text-lg font-bold">Arabic only</p>
                    <p className="text-[15px]">Continuous mushaf-style text</p>
                  </div>
                  {!showTranslation && <Check />}
                </button>
              </li>
              {ENGLISH_TRANSLATIONS.map((t) => (
                <li key={t.id}>
                  <button onClick={() => setTranslationId(t.id)} className={rowClass}>
                    <div>
                      <p className="text-lg font-bold">{t.name}</p>
                      <p className="text-[15px]">{t.author}</p>
                    </div>
                    {showTranslation && translationId === t.id && <Check />}
                  </button>
                </li>
              ))}
            </ul>
          </section>


          <section className="px-4 pt-6">
            <p className="text-[15px] font-bold uppercase tracking-widest mb-2">
              Tap dictionary
            </p>
            <button
              onClick={() => setTapDictionary(!tapDictionary)}
              aria-pressed={tapDictionary}
              className={rowClass}
            >
              <div>
                <p className="text-lg font-bold">Word meanings on tap</p>
                <p className="text-[15px]">
                  Tap any Arabic word for its translation. Off loads pages faster.
                </p>
              </div>
              <span
                className={`text-base font-bold border-2 border-ink rounded-lg px-3 py-1 shrink-0 ${
                  tapDictionary ? 'bg-ink text-paper' : ''
                }`}
              >
                {tapDictionary ? 'On' : 'Off'}
              </span>
            </button>
          </section>

          <section className="px-4 pt-6 pb-8">
            <p className="text-[15px] font-bold uppercase tracking-widest mb-2">
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
                      <span className="text-lg font-bold">{s.label}</span>
                    </div>
                    {arabicSize === s.value && <Check />}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <footer className="px-4 pb-8 text-[13px] leading-relaxed">
            Quran text and translations from Quran.com. Grammar data from the{' '}
            Quranic Arabic Corpus (corpus.quran.com), GNU GPL.
          </footer>
        </>
      )}
    </div>
  );
}
