// Grammar lookups from the bundled Quranic Arabic Corpus data
// (corpus.quran.com via the mustafa0x/quran-morphology fork, GPL).

/** [root, lemma, tag, "feat|feat"] as emitted by scripts/build-morphology.py */
export type MorphEntry = [string, string, string, string];
export type SurahMorphology = Record<string, MorphEntry>;

export async function getSurahMorphology(surah: number): Promise<SurahMorphology> {
  const res = await fetch(`/morphology/${surah}.json`);
  if (!res.ok) throw new Error(`morphology ${res.status}`);
  return res.json() as Promise<SurahMorphology>;
}

const POS_TAGS: Record<string, string> = {
  N: 'Noun',
  V: 'Verb',
  ADJ: 'Adjective',
  PRON: 'Pronoun',
  DEM: 'Demonstrative pronoun',
  REL: 'Relative pronoun',
  P: 'Preposition',
  T: 'Time adverb',
  LOC: 'Location adverb',
  CONJ: 'Conjunction',
  SUB: 'Subordinating conjunction',
  INTG: 'Interrogative particle',
  NEG: 'Negative particle',
  PRO: 'Prohibition particle',
  FUT: 'Future particle',
  EMPH: 'Emphatic particle',
  COND: 'Conditional particle',
  RES: 'Restriction particle',
  EXP: 'Exceptive particle',
  CERT: 'Particle of certainty',
  ANS: 'Answer particle',
  SUR: 'Surprise particle',
  VOC: 'Vocative particle',
  INC: 'Inceptive particle',
  AMD: 'Amendment particle',
  CIRC: 'Circumstantial particle',
  COM: 'Comitative particle',
  EXH: 'Exhortation particle',
  EXL: 'Explanation particle',
  EQ: 'Equalization particle',
  REM: 'Resumption particle',
  RSLT: 'Result particle',
  CAUS: 'Particle of cause',
  RET: 'Retraction particle',
  SUP: 'Supplemental particle',
  PREV: 'Preventive particle',
  AVR: 'Aversion particle',
  ACC: 'Accusative particle',
  INT: 'Particle of interpretation',
  INL: 'Quranic initials',
  IMPN: 'Imperative verbal noun',
  ATT: 'Attention particle',
};

// English gloss for the most common Quranic prepositions (keyed by lemma)
const PREP_GLOSS: Record<string, string> = {
  'فِي':    'in / within',
  'مِن':    'from / of',
  'إِلَى':  'to / toward',
  'عَلَى':  'on / over / against',
  'عَن':    'from / about / away from',
  'بِ':     'by / with / in',
  'لِ':     'for / to / belonging to',
  'كَ':     'like / as / such as',
  'حَتَّى': 'until / even / up to',
  'مَعَ':   'with / together with',
  'مُنْذُ': 'since / for (time)',
  'مُذ':    'since',
  'لَدَى':  'at / with / near',
  'لَدُن':  'from / with',
  'عِنْد':  'at / with / near',
  'بَيْن':  'between / among',
};

// Grammatical family labels for إِنّ- and كَان-type particles
const FAM_LABELS: Record<string, string> = {
  'إِنّ': 'inna group (governs accusative)',
  'كَان': 'kāna group (governs accusative predicate)',
  'كَاد': 'kāda group (verb of approximation)',
};

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

const PGN: Record<string, string> = {
  '1S':  '1st person singular',
  '1P':  '1st person plural',
  '2MS': '2nd person masculine singular',
  '2FS': '2nd person feminine singular',
  '2MD': '2nd person masculine dual',
  '2FD': '2nd person feminine dual',
  '2MP': '2nd person masculine plural',
  '2FP': '2nd person feminine plural',
  '2D':  '2nd person dual',
  '3MS': '3rd person masculine singular',
  '3FS': '3rd person feminine singular',
  '3MD': '3rd person masculine dual',
  '3FD': '3rd person feminine dual',
  '3MP': '3rd person masculine plural',
  '3FP': '3rd person feminine plural',
  '3D':  '3rd person dual',
  M:  'masculine',
  F:  'feminine',
  MS: 'masculine singular',
  FS: 'feminine singular',
  MP: 'masculine plural',
  FP: 'feminine plural',
  MD: 'masculine dual',
  FD: 'feminine dual',
  D:  'dual',
};

const FEATURES: Record<string, string> = {
  PERF:      'perfect (past)',
  IMPF:      'imperfect (present/future)',
  IMPV:      'imperative',
  PASS:      'passive',
  ACT_PCPL:  'active participle',
  PASS_PCPL: 'passive participle',
  VN:        'verbal noun',
  NOM:       'nominative',
  GEN:       'genitive',
  ACC:       'accusative',
  INDEF:     'indefinite',
  'MOOD:JUS':   'jussive mood',
  'MOOD:SUBJ':  'subjunctive mood',
  'MOOD:IND':   'indicative mood',
  'MOOD:ENERG': 'energetic mood',
  EMPH: 'emphatic',
  DIST: 'distal (that / those)',
};

export interface DecodedMorph {
  root: string;
  lemma: string;
  pos: string;
  parse: string[];
}

export function decodeMorph(entry: MorphEntry): DecodedMorph {
  const [root, lemma, tag, featString] = entry;
  const tokens = featString ? featString.split('|').filter(Boolean) : [];
  let pos = POS_TAGS[tag] ?? tag;
  const parse: string[] = [];

  // Sub-type features override the POS for nouns
  if (tag === 'N') {
    if (tokens.includes('PRON'))     pos = 'Pronoun';
    else if (tokens.includes('DEM')) pos = 'Demonstrative pronoun';
    else if (tokens.includes('REL')) pos = 'Relative pronoun';
    else if (tokens.includes('NV'))  pos = 'Verbal expression';
    else if (tokens.includes('PN'))  pos = 'Proper noun';
    else if (tokens.includes('ADJ')) pos = 'Adjective';
  }

  // For particles (tag P), the specific type is encoded in features, not the tag.
  // The first feature that maps to a POS_TAGS entry becomes the real POS.
  if (tag === 'P') {
    for (const t of tokens) {
      if (t !== 'P' && POS_TAGS[t]) { pos = POS_TAGS[t]; break; }
    }
    if (pos === 'Preposition' && PREP_GLOSS[lemma]) {
      parse.push(PREP_GLOSS[lemma]);
    }
  }

  // Tokens already consumed for POS detection — skip in parse loop
  const usedForPos = new Set(['PRON', 'DEM', 'REL', 'NV', 'PN', 'ADJ', 'P']);

  for (const token of tokens) {
    // Skip sub-type tokens already used above
    if (usedForPos.has(token)) continue;
    // Skip particle-subtype tokens already promoted to POS
    if (tag === 'P' && POS_TAGS[token]) continue;

    if (token.startsWith('VF:')) {
      const n = Number(token.slice(3));
      parse.push(`Form ${ROMAN[n - 1] ?? n}`);
    } else if (token.startsWith('FAM:')) {
      const fam = token.slice(4);
      parse.push(FAM_LABELS[fam] ?? `${fam} family`);
    } else if (PGN[token]) {
      parse.push(PGN[token]);
    } else if (FEATURES[token]) {
      parse.push(FEATURES[token]);
    }
  }

  return { root, lemma, pos, parse };
}

/** Space out root letters for display: رحم → ر ح م */
export const spaceRoot = (root: string) => root.split('').join(' ');
