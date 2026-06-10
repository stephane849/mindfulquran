#!/usr/bin/env python3
"""
Fetch all Quran data from api.qurancdn.com and save as static JSON under
public/quran/ for fully offline use.

Run once from the project root:
  python3 scripts/fetch-offline-data.py

Only standard-library modules required (Python 3.6+).
"""

import json
import time
import sys
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.parse import urlencode
from urllib.error import URLError

BASE = 'https://api.qurancdn.com/api/v4'
OUT  = Path('public/quran')
TRANSLATION_IDS = [85, 20, 22, 203]   # Abdel Haleem, Saheeh Int, Yusuf Ali, al-Hilali
DELAY = 0.3   # seconds between requests (be polite to the API)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://quran.com/',
    'Origin': 'https://quran.com',
}


# ─── HTTP helper ─────────────────────────────────────────────────────────────

def get(path, **params):
    url = BASE + path
    if params:
        url += '?' + urlencode({k: v for k, v in params.items() if v is not None})
    for attempt in range(4):
        try:
            req = Request(url, headers=HEADERS)
            with urlopen(req, timeout=30) as r:
                return json.loads(r.read().decode())
        except Exception as exc:
            if attempt == 3:
                raise RuntimeError(f'Failed after 4 attempts: {url}') from exc
            wait = 2 ** attempt
            print(f'  [retry {attempt+1}/3 in {wait}s: {exc}]', flush=True)
            time.sleep(wait)


def fetch_surah_pages(chapter_n):
    """Fetch every paginated page of verses for one chapter."""
    all_verses = []
    page = 1
    while True:
        data = get(
            f'/verses/by_chapter/{chapter_n}',
            fields='text_uthmani,juz_number,rub_el_hizb_number,hizb_number,'
                   'ruku_number,manzil_number,sajdah_number,page_number',
            translations=','.join(str(t) for t in TRANSLATION_IDS),
            words='true',
            word_fields='text_uthmani,translation,transliteration',
            per_page=50,
            page=page,
        )
        all_verses.extend(data['verses'])
        if data['pagination']['next_page'] is None:
            break
        page += 1
        time.sleep(DELAY)
    return all_verses


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'verses').mkdir(exist_ok=True)

    # ── Chapters ──────────────────────────────────────────────────────────────
    print('Fetching chapters…', flush=True)
    chapters = get('/chapters', language='en')['chapters']
    (OUT / 'chapters.json').write_text(
        json.dumps(chapters, ensure_ascii=False, separators=(',', ':')),
        encoding='utf-8',
    )
    print(f'  {len(chapters)} chapters saved.')

    # ── Per-surah data + index accumulation ───────────────────────────────────
    juz_surahs: dict[str, set] = {str(i): set() for i in range(1, 31)}
    rub_surahs: dict[str, set] = {str(i): set() for i in range(1, 241)}
    search: list[dict] = []

    for n in range(1, 115):
        sys.stdout.write(f'\rSurah {n:3}/114…')
        sys.stdout.flush()

        raw = fetch_surah_pages(n)
        verses_out = []

        for v in raw:
            # translations dict keyed by resource_id string
            trs: dict[str, str] = {}
            for tr in v.get('translations') or []:
                trs[str(tr['resource_id'])] = tr['text']

            # words — keep only char_type_name == 'word' (skip end-marker glyphs)
            words = []
            for w in v.get('words') or []:
                if w.get('char_type_name') != 'word':
                    continue
                entry: dict = {
                    'id':             w['id'],
                    'position':       w['position'],
                    'char_type_name': 'word',
                    'text_uthmani':   w.get('text_uthmani', ''),
                }
                if w.get('translation'):
                    entry['translation'] = w['translation']
                if w.get('transliteration'):
                    entry['transliteration'] = w['transliteration']
                words.append(entry)

            verse_out = {
                'id':                  v['id'],
                'verse_number':        v['verse_number'],
                'verse_key':           v['verse_key'],
                'juz_number':          v['juz_number'],
                'rub_el_hizb_number':  v['rub_el_hizb_number'],
                'hizb_number':         v.get('hizb_number') or 0,
                'ruku_number':         v.get('ruku_number') or 0,
                'manzil_number':       v.get('manzil_number') or 0,
                'sajdah_number':       v.get('sajdah_number'),
                'page_number':         v.get('page_number') or 0,
                'text_uthmani':        v['text_uthmani'],
                'trs':                 trs,
                'words':               words,
            }
            verses_out.append(verse_out)

            juz_surahs[str(v['juz_number'])].add(n)
            rub_surahs[str(v['rub_el_hizb_number'])].add(n)
            search.append({'k': v['verse_key'], 'a': v['text_uthmani'], 't': trs.get('85', '')})

        (OUT / 'verses' / f'{n}.json').write_text(
            json.dumps({'verses': verses_out}, ensure_ascii=False, separators=(',', ':')),
            encoding='utf-8',
        )
        time.sleep(DELAY)

    print(f'\r{" " * 30}\rAll 114 surahs saved.', flush=True)

    # ── Index (juz / rub_el_hizb → surah IDs) ─────────────────────────────────
    print('Saving index.json…', flush=True)
    (OUT / 'index.json').write_text(
        json.dumps({
            'juz': {k: sorted(v) for k, v in juz_surahs.items()},
            'rub': {k: sorted(v) for k, v in rub_surahs.items()},
        }, separators=(',', ':')),
        encoding='utf-8',
    )

    # ── Search index (Arabic + Abdel Haleem, all 6 236 verses) ───────────────
    print('Saving search.json…', flush=True)
    (OUT / 'search.json').write_text(
        json.dumps(search, ensure_ascii=False, separators=(',', ':')),
        encoding='utf-8',
    )

    print(f'Done — {len(search)} verses bundled.')


if __name__ == '__main__':
    main()
