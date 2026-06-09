'use client';

import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { ENGLISH_TRANSLATIONS } from '@/lib/api';

export default function SettingsPage() {
  const { translationId, setTranslationId } = useAppStore();

  return (
    <div className="min-h-screen bg-paper">
      <nav className="sticky top-0 bg-paper border-b border-border px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-sm text-muted min-w-[44px] py-1">
          ← Back
        </Link>
        <span className="text-sm font-medium text-ink">Settings</span>
      </nav>

      <section className="px-4 pt-5">
        <p className="text-xs font-medium text-muted uppercase tracking-widest mb-3">
          Translation
        </p>
        <ul>
          {ENGLISH_TRANSLATIONS.map((t) => (
            <li key={t.id}>
              <button
                onClick={() => setTranslationId(t.id)}
                className="w-full flex items-center justify-between py-3 border-b border-border text-left active:bg-border"
              >
                <div>
                  <p className="text-sm font-medium text-ink">{t.name}</p>
                  <p className="text-xs text-muted">{t.author}</p>
                </div>
                {translationId === t.id && (
                  <span className="text-xs font-semibold text-accent">✓</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
