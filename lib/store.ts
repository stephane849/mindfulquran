import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ENGLISH_TRANSLATIONS, DEFAULT_TRANSLATION_ID } from './api';
import type { LastRead } from './types';

export type BrowseMode = 'surah' | 'juz' | 'hizb';
/** Index into ARABIC_SIZES: 0 small … 3 extra large */
export type ArabicSize = 0 | 1 | 2 | 3;

interface AppStore {
  lastRead: LastRead | null;
  /** Which translation to use when translation display is on */
  translationId: number;
  /** Toggled by the EN button in the reader and "Arabic only" in settings */
  showTranslation: boolean;
  browseMode: BrowseMode;
  arabicSize: ArabicSize;
  setLastRead: (data: LastRead) => void;
  setTranslationId: (id: number) => void;
  setShowTranslation: (show: boolean) => void;
  setBrowseMode: (mode: BrowseMode) => void;
  setArabicSize: (size: ArabicSize) => void;
}

const isValidTranslation = (id: unknown): id is number =>
  ENGLISH_TRANSLATIONS.some((t) => t.id === id);

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      lastRead: null,
      translationId: DEFAULT_TRANSLATION_ID,
      showTranslation: true,
      browseMode: 'surah',
      arabicSize: 1,
      setLastRead: (lastRead) => set({ lastRead }),
      setTranslationId: (translationId) =>
        set({ translationId, showTranslation: true }),
      setShowTranslation: (showTranslation) => set({ showTranslation }),
      setBrowseMode: (browseMode) => set({ browseMode }),
      setArabicSize: (arabicSize) => set({ arabicSize }),
    }),
    {
      name: 'mindful-quran',
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: (state, version) => {
        const s = state as Record<string, unknown>;
        if (version < 2) {
          // v1 used translationId: null for Arabic-only; v0 used foreign ids
          if (s.translationId === null) {
            s.translationId = DEFAULT_TRANSLATION_ID;
            s.showTranslation = false;
          } else if (!isValidTranslation(s.translationId)) {
            s.translationId = DEFAULT_TRANSLATION_ID;
          }
        }
        return s as unknown as AppStore;
      },
    }
  )
);
