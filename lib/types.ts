export interface Chapter {
  id: number;
  revelation_place: 'makkah' | 'madinah';
  revelation_order: number;
  bismillah_pre: boolean;
  name_simple: string;
  name_complex: string;
  name_arabic: string;
  verses_count: number;
  pages: [number, number];
  translated_name: {
    language_name: string;
    name: string;
  };
}

export interface VerseTranslation {
  id: number;
  resource_id: number;
  text: string;
}

export interface Verse {
  id: number;
  verse_number: number;
  verse_key: string;
  hizb_number: number;
  rub_el_hizb_number: number;
  ruku_number: number;
  manzil_number: number;
  sajdah_number: number | null;
  page_number: number;
  juz_number: number;
  text_uthmani: string;
  /** Absent when no translations param is requested (Arabic-only mode) */
  translations?: VerseTranslation[];
  /** Present when words=true is requested (word-by-word dictionary) */
  words?: Word[];
}

export interface Word {
  id: number;
  position: number;
  /** 'word' for Arabic words, 'end' for the ayah marker */
  char_type_name: string;
  text_uthmani: string;
  translation?: { text: string; language_name: string };
  transliteration?: { text: string | null; language_name: string };
}

export interface SearchResult {
  verse_key: string;
  verse_id: number;
  text: string;
  translations?: { text: string; resource_id: number; name: string }[];
}

export interface SearchResponse {
  search: {
    query: string;
    total_results: number;
    current_page: number;
    total_pages: number;
    results: SearchResult[];
    /** 'root' when query matched a Quranic root; 'text' for substring search */
    mode: 'root' | 'text';
  };
}

export interface VersesResponse {
  verses: Verse[];
  pagination: {
    per_page: number;
    current_page: number;
    next_page: number | null;
    total_pages: number;
    total_records: number;
  };
}

export interface LastRead {
  surahId: number;
  surahName: string;
  verseKey: string;
  verseNumber: number;
  /** Set for juz/hizb reads so the banner links back to the right division */
  source?: 'chapter' | 'juz' | 'hizb';
  sourceId?: number;
}
