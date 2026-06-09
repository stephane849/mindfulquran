const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export const toArabicDigits = (n: number) =>
  String(n).replace(/\d/g, (d) => ARABIC_DIGITS[Number(d)]);

// Verse text size steps (settings: small → extra large), marker one step down
export const ARABIC_TEXT_SIZES = ['text-2xl', 'text-3xl', 'text-4xl', 'text-5xl'];
export const ARABIC_MARKER_SIZES = ['text-xl', 'text-2xl', 'text-3xl', 'text-4xl'];

export const clampArabicSize = (size: number) =>
  Math.min(Math.max(size, 0), ARABIC_TEXT_SIZES.length - 1);

export const ayahNumberOf = (verseKey: string) => Number(verseKey.split(':')[1]);
export const surahNumberOf = (verseKey: string) => Number(verseKey.split(':')[0]);
