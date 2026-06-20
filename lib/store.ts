import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ENGLISH_TRANSLATIONS, DEFAULT_TRANSLATION_ID } from './api';
import type { LastRead } from './types';

export type BrowseMode = 'surah' | 'juz' | 'hizb' | 'awrad';
/** Index into ARABIC_SIZES: 0 small … 3 extra large */
export type ArabicSize = 0 | 1 | 2 | 3;

interface AppStore {
  lastRead: LastRead | null;
  awradLastRead: LastRead | null;
  juzLastRead: LastRead | null;
  hizbLastRead: LastRead | null;
  translationId: number;
  showTranslation: boolean;
  browseMode: BrowseMode;
  arabicSize: ArabicSize;
  tapDictionary: boolean;
  recitationSpeed: number;
  memorizeMode: boolean;
  setLastRead: (data: LastRead) => void;
  setAwradLastRead: (data: LastRead) => void;
  setJuzLastRead: (data: LastRead) => void;
  setHizbLastRead: (data: LastRead) => void;
  setTranslationId: (id: number) => void;
  setShowTranslation: (show: boolean) => void;
  setBrowseMode: (mode: BrowseMode) => void;
  setArabicSize: (size: ArabicSize) => void;
  setTapDictionary: (on: boolean) => void;
  setRecitationSpeed: (wpm: number) => void;
  setMemorizeMode: (on: boolean) => void;
}

const isValidTranslation = (id: unknown): id is number =>
  ENGLISH_TRANSLATIONS.some((t) => t.id === id);

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      lastRead: null,
      awradLastRead: null,
      juzLastRead: null,
      hizbLastRead: null,
      translationId: DEFAULT_TRANSLATION_ID,
      showTranslation: true,
      browseMode: 'surah',
      arabicSize: 1,
      tapDictionary: true,
      recitationSpeed: 90,
      memorizeMode: false,
      setLastRead: (lastRead) => set({ lastRead }),
      setAwradLastRead: (awradLastRead) => set({ awradLastRead }),
      setJuzLastRead: (juzLastRead) => set({ juzLastRead }),
      setHizbLastRead: (hizbLastRead) => set({ hizbLastRead }),
      setTranslationId: (translationId) =>
        set({ translationId, showTranslation: true }),
      setShowTranslation: (showTranslation) => set({ showTranslation }),
      setBrowseMode: (browseMode) => set({ browseMode }),
      setArabicSize: (arabicSize) => set({ arabicSize }),
      setTapDictionary: (tapDictionary) => set({ tapDictionary }),
      setRecitationSpeed: (recitationSpeed) => set({ recitationSpeed }),
      setMemorizeMode: (memorizeMode) => set({ memorizeMode }),
    }),
    {
      name: 'mindful-quran',
      storage: createJSONStorage(() => localStorage),
      version: 7,
      migrate: (state, version) => {
        const s = state as Record<string, unknown>;
        if (version < 2) {
          if (s.translationId === null) {
            s.translationId = DEFAULT_TRANSLATION_ID;
            s.showTranslation = false;
          } else if (!isValidTranslation(s.translationId)) {
            s.translationId = DEFAULT_TRANSLATION_ID;
          }
        }
        if (version < 3 && s.translationId === 20) {
          s.translationId = DEFAULT_TRANSLATION_ID;
        }
        if (version < 4) s.awradLastRead = null;
        if (version < 5) s.recitationSpeed = 90;
        if (version < 6) {
          s.juzLastRead = null;
          s.hizbLastRead = null;
        }
        if (version < 7) delete s.pinnedRead;
        return s as unknown as AppStore;
      },
    }
  )
);
