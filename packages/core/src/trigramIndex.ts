/**
 * Trigram inverted index — replaces the O(n^3) nested loop from the
 * Tarteel backend find_ayah_sequence with O(k) candidate retrieval.
 *
 * Build:  O(total chars). Query: O(trigrams in query + candidates).
 */
import type { QuranAyah, SerializedIndex } from "./types.js";
import { normalizeArabic } from "./normalize.js";

export interface TrigramPostings {
  [gram: string]: number[];
}

/**
 * quran-simple prefixes every surah (except 1 & 9) with the Basmala inside ayah 1.
 * Strip it from the *normalized* matching text so recited fragments score exactly.
 * Keeps "بسم الله الرحمن الرحيم" itself (Al-Fatiha 1:1) intact.
 */
export function stripBasmalaPrefix(normalized: string): string {
  const BASMALA = "بسم الله الرحمن الرحيم";
  if (normalized.startsWith(BASMALA + " ")) {
    const rest = normalized.slice(BASMALA.length + 1).trim();
    if (rest) return rest;
  }
  return normalized;
}

export function trigramsOf(s: string): string[] {
  const t = `  ${s} `;
  const out: string[] = [];
  for (let i = 0; i + 3 <= t.length; i++) out.push(t.slice(i, i + 3));
  return out;
}

export class QuranIndex {
  ayahs: QuranAyah[] = [];
  postings: TrigramPostings = {};
  edition = "quran-simple";
  /** surah -> start offset in ayahs array (ayahs sorted surah,ayah) */
  private byKey = new Map<string, number>();

  constructor(
    ayahs: Array<{ surah: number; ayah: number; number?: number; text: string }> = [],
    edition = "quran-simple",
  ) {
    this.edition = edition;
    if (ayahs.length) this.build(ayahs);
  }

  get size(): number {
    return this.ayahs.length;
  }

  build(raw: Array<{ surah: number; ayah: number; number?: number; text: string }>): this {
    this.ayahs = raw.map((a) => ({
      surah: a.surah,
      ayah: a.ayah,
      number: a.number,
      text: a.text,
      normalized: stripBasmalaPrefix(normalizeArabic(a.text)),
    }));
    // Sort for sequence windows (surah, ayah).
    this.ayahs.sort((x, y) => x.surah - y.surah || x.ayah - y.ayah);
    this.postings = {};
    this.byKey.clear();
    this.ayahs.forEach((a, idx) => {
      this.byKey.set(`${a.surah}:${a.ayah}`, idx);
      const grams = new Set(trigramsOf(a.normalized));
      for (const g of grams) {
        (this.postings[g] ??= []).push(idx);
      }
    });
    // Keep posting lists sorted for determinism.
    for (const k of Object.keys(this.postings)) this.postings[k].sort((x, y) => x - y);
    return this;
  }

  indexOf(surah: number, ayah: number): number {
    return this.byKey.get(`${surah}:${ayah}`) ?? -1;
  }

  /** Consecutive ayahs after idx (same surah), up to n (exclusive of idx). */
  nextInSurah(idx: number, n: number): QuranAyah[] {
    const out: QuranAyah[] = [];
    const base = this.ayahs[idx];
    if (!base) return out;
    for (let i = idx + 1; i < this.ayahs.length && out.length < n; i++) {
      const c = this.ayahs[i];
      if (c.surah !== base.surah) break;
      if (c.ayah !== base.ayah + out.length + 1) break;
      out.push(c);
    }
    return out;
  }

  /**
   * Retrieve top-K candidate ayah indices by trigram overlap.
   * Optional surah filter. Pure + headless (no DOM).
   */
  candidates(normalizedQuery: string, topK = 60, surah?: number): number[] {
    if (!normalizedQuery) return [];
    const grams = trigramsOf(normalizedQuery);
    const scores = new Map<number, number>();
    for (const g of grams) {
      const list = this.postings[g];
      if (!list) continue;
      for (const id of list) {
        if (surah !== undefined && this.ayahs[id].surah !== surah) continue;
        scores.set(id, (scores.get(id) ?? 0) + 1);
      }
    }
    if (scores.size === 0) {
      // Fallback: substring scan (cheap safety net for tiny indexes).
      const out: number[] = [];
      for (let i = 0; i < this.ayahs.length && out.length < topK; i++) {
        const a = this.ayahs[i];
        if (surah !== undefined && a.surah !== surah) continue;
        if (a.normalized.includes(normalizedQuery) || normalizedQuery.includes(a.normalized))
          out.push(i);
      }
      return out;
    }
    return [...scores.entries()]
      .sort((x, y) => y[1] - x[1])
      .slice(0, topK)
      .map(([id]) => id);
  }

  toJSON(): SerializedIndex {
    return { version: 1, edition: this.edition, ayahs: this.ayahs, postings: this.postings };
  }

  static fromJSON(data: SerializedIndex): QuranIndex {
    const idx = new QuranIndex([], data.edition);
    idx.ayahs = data.ayahs;
    idx.postings = data.postings;
    data.ayahs.forEach((a, i) => idx.byKey.set(`${a.surah}:${a.ayah}`, i));
    return idx;
  }
}

/** Build a QuranIndex from raw ayah rows (helper for data scripts). */
export function buildIndex(
  rows: Array<{ surah: number; ayah: number; number?: number; text: string }>,
  edition = "quran-simple",
): QuranIndex {
  return new QuranIndex().build(rows);
}
