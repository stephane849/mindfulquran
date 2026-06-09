'use client';

import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { ENGLISH_TRANSLATIONS } from '@/lib/api';

export default function SettingsPage() {
  const { translationId, setTranslationId } = useAppStore();

  return (
    <div className="min-h-screen bg-paper">
      <nav className="sticky top-0 bg-paper border-b-2 border-ink px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-sm font-bold min-w-[44px] py-1">
          ‹ Back
        </Link>
        <span className="text-sm font-bold">Settings</span>
      </nav>

      <section className="px-4 pt-5">
        <p className="text-xs font-bold uppercase tracking-widest mb-3">Translation</p>
        <ul>
          {ENGLISH_TRANSLATIONS.map((t) => (
            <li key={t.id}>
              <button
                onClick={() => setTranslationId(t.id)}
                className="w-full flex items-center justify-between py-3 divider-dotted text-left active:bg-ink active:text-paper"
              >
                <div>
                  <p className="text-sm font-bold">{t.name}</p>
                  <p className="text-xs">{t.author}</p>
                </div>
                {translationId === t.id && (
                  <span className="text-lg font-bold" aria-label="selected">
                    ✓
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
