#!/usr/bin/env python3
"""Convert Quranic Arabic Corpus morphology (mustafa0x/quran-morphology fork,
GPL, corpus.quran.com) into per-surah JSON lookups bundled with the app.

Input lines:  surah:ayah:word:segment \t form \t TAG \t feat|feat|...
Output:       public/morphology/{surah}.json
              { "ayah:word": [root, lemma, tag, "feat|feat"] }

A word's morphology comes from its stem segment — the first segment that
isn't a prefix (PREF) or a suffix (+...) — falling back to the first.
"""
import json
import sys
from collections import defaultdict
from pathlib import Path

SRC = sys.argv[1] if len(sys.argv) > 1 else '/tmp/qm/quran-morphology.txt'
OUT = Path(__file__).resolve().parent.parent / 'public' / 'morphology'
OUT.mkdir(parents=True, exist_ok=True)

# location -> list of (tag, feats)
words = defaultdict(list)

with open(SRC, encoding='utf-8') as f:
    for line in f:
        line = line.rstrip('\n')
        if not line or line.startswith('#'):
            continue
        loc, _form, tag, feats = line.split('\t')
        surah, ayah, word, _seg = loc.split(':')
        words[(int(surah), f'{ayah}:{word}')].append((tag, feats.split('|')))

surahs = defaultdict(dict)
for (surah, key), segments in words.items():
    stem = next(
        (s for s in segments
         if 'PREF' not in s[1] and not any(t.startswith('+') for t in s[1])),
        segments[0],
    )
    tag, feats = stem
    root = lemma = ''
    keep = []
    for token in feats:
        if token.startswith('ROOT:'):
            root = token[5:]
        elif token.startswith('LEM:'):
            lemma = token[4:]
        else:
            keep.append(token)
    surahs[surah][key] = [root, lemma, tag, '|'.join(keep)]

total = 0
for surah, entries in sorted(surahs.items()):
    path = OUT / f'{surah}.json'
    path.write_text(json.dumps(entries, ensure_ascii=False, separators=(',', ':')))
    total += path.stat().st_size

print(f'{len(surahs)} surahs, {sum(len(e) for e in surahs.values())} words, '
      f'{total / 1024 / 1024:.1f} MB total')
