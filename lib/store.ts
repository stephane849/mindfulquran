import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ENGLISH_TRANSLATIONS, DEFAULT_TRANSLATION_ID } from './api';
import type { LastRead } from './types';

interface AppStore {
  lastRead: LastRead | null;
  /** null = Arabic only, no translation */
  translationId: number | null;
  setLastRead: (data: LastRead) => void;
  setTranslationId: (id: number | null) => void;
}

const isValidTranslation = (id: number | null) =>
  id === null || ENGLISH_TRANSLATIONS.some((t) => t.id === id);

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      lastRead: null,
      translationId: DEFAULT_TRANSLATION_ID,
      setLastRead: (lastRead) => set({ lastRead }),
      setTranslationId: (translationId) => set({ translationId }),
    }),
    {
      name: 'mindful-quran',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      // v0 stored ids from a different id scheme (e.g. 131) that this API
      // doesn't recognise — reset anything invalid to the default
      migrate: (state) => {
        const s = state as Partial<AppStore>;
        if (s.translationId === undefined || !isValidTranslation(s.translationId)) {
          s.translationId = DEFAULT_TRANSLATION_ID;
        }
        return s as AppStore;
      },
    }
  )
);
