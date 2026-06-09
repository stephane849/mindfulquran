import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { LastRead } from './types';

interface AppStore {
  lastRead: LastRead | null;
  translationId: number;
  setLastRead: (data: LastRead) => void;
  setTranslationId: (id: number) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      lastRead: null,
      translationId: 131,
      setLastRead: (lastRead) => set({ lastRead }),
      setTranslationId: (translationId) => set({ translationId }),
    }),
    {
      name: 'mindful-quran',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
