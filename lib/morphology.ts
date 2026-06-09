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

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

const PGN: Record<string, string> = {
  '1S': '1st person singular',
  '1P': '1st person plural',
  '2MS': '2nd person masculine singular',
  '2FS': '2nd person feminine singular',
  '2MP': '2nd person masculine plural',
  '2FP': '2nd person feminine plural',
  '2D': '2nd person dual',
  '3MS': '3rd person masculine singular',
  '3FS': '3rd person feminine singular',
  '3MP': '3rd person masculine plural',
  '3FP': '3rd person feminine plural',
  '3D': '3rd person dual',
  '3MD': '3rd person masculine dual',
  '3FD': '3rd person feminine dual',
  M: 'masculine',
  F: 'feminine',
  MS: 'masculine singular',
  FS: 'feminine singular',
  MP: 'masculine plural',
  FP: 'feminine plural',
  MD: 'masculine dual',
  FD: 'feminine dual',
  D: 'dual',
};

const FEATURES: Record<string, string> = {
  PERF: 'perfect (past)',
  IMPF: 'imperfect (present)',
  IMPV: 'imperative',
  PASS: 'passive',
  ACT_PCPL: 'active participle',
  PASS_PCPL: 'passive participle',
  VN: 'verbal noun',
  NOM: 'nominative',
  GEN: 'genitive',
  ACC: 'accusative',
  'MOOD:JUS': 'jussive mood',
  'MOOD:SUBJ': 'subjunctive mood',
  'MOOD:IND': 'indicative mood',
  'MOOD:ENERG': 'energetic mood',
  PN: 'proper noun',
  ADJ: 'adjective',
  EMPH: 'emphatic',
  DIST: 'distal',
};

export interface DecodedMorph {
  root: string;
  lemma: string;
  pos: string;
  parse: string[];
}

export function decodeMorph(entry: MorphEntry): DecodedMorph {
  const [root, lemma, tag, featString] = entry;
  const tokens = featString ? featString.split('|') : [];
  let pos = POS_TAGS[tag] ?? tag;
  const parse: string[] = [];

  for (const token of tokens) {
    if (token === 'PN') {
      pos = 'Proper noun';
    } else if (token === 'ADJ' && tag === 'N') {
      pos = 'Adjective';
    } else if (token.startsWith('VF:')) {
      const n = Number(token.slice(3));
      parse.push(`Form ${ROMAN[n - 1] ?? n}`);
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
