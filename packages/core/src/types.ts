/** Core public types for @bakemono-san/verset-finder (Hafs-only v1). */

export interface AyahRef {
  /** Surah number 1..114 */
  surah: number;
  /** Ayah number within surah (1-based) */
  ayah: number;
}

export interface QuranAyah extends AyahRef {
  /** Global ayah number (1..6236), optional */
  number?: number;
  /** Original Arabic text (with or without tashkeel) */
  text: string;
  /** Normalized text (diacritics stripped, alef unified, ...) */
  normalized: string;
}

export type DetectionStatus = "accept" | "low" | "reject";

export interface DetectionResult extends AyahRef {
  /** Last ayah of the matched span (== ayah for single-ayah matches) */
  endAyah: number;
  /** Number of ayahs in the matched span (1..3) */
  spanLength: 1 | 2 | 3;
  /** 0..1 similarity score */
  confidence: number;
  status: DetectionStatus;
  /** Normalized transcript that produced the match */
  transcript: string;
  /** Raw transcript before normalization */
  rawTranscript: string;
  /** Matched ayah text (original, first ayah of span) */
  matchedText: string;
  /** All ayahs in the span */
  span: AyahRef[];
}

export interface DetectOptions {
  /** Restrict search to one surah (1..114). Default: whole Quran. */
  surah?: number;
  /** Max candidates pulled from trigram index before rescoring. Default 60. */
  topK?: number;
  /** Thresholds. Defaults: rejectBelow 0.5, acceptAbove 0.6 */
  rejectBelow?: number;
  acceptAbove?: number;
  /** Max span length for sequence detection (1..3). Default 3. */
  maxSpan?: 1 | 2 | 3;
}

export interface SerializedIndex {
  version: 1;
  edition: string;
  ayahs: QuranAyah[];
  /** trigram -> sorted array of ayah indices */
  postings: Record<string, number[]>;
}

/** Optional server verification (Tarteel-compatible backend). */
export interface ServerVerifyOptions {
  baseUrl: string;
  /** POST /api/speech/add-tashkeel { text, context: "quran" } */
  addTashkeel?: boolean;
  fetchFn?: typeof fetch;
}

export interface ServerVerifyResult {
  withTashkeel?: string;
  detectedAyahs?: Array<{ surah: number; ayah: number; similarity?: number }>;
  raw: unknown;
}
