/**
 * detectAyah: local-first verse detection over a QuranIndex.
 * Thresholds: <0.5 reject, 0.5–0.6 low, >0.6 accept. Spans of 1..3 ayahs.
 */
import type { DetectionResult, DetectOptions, AyahRef } from "./types.js";
import type { QuranIndex } from "./trigramIndex.js";
import { normalizeTranscript, sanitizeVoiceTranscript } from "./normalize.js";
import { calculateSimilarity } from "./similarity.js";

export { calculateSimilarity };

const DEFAULTS = { topK: 60, rejectBelow: 0.5, acceptAbove: 0.6, maxSpan: 3 as const };

export function detectAyah(
  rawTranscript: string,
  index: QuranIndex,
  opts: DetectOptions = {},
): DetectionResult {
  const { topK, rejectBelow, acceptAbove, maxSpan } = { ...DEFAULTS, ...opts };
  const maxSpanN = Math.max(1, Math.min(3, maxSpan ?? 3)) as 1 | 2 | 3;
  const raw = (rawTranscript ?? "").trim();
  const transcript = normalizeTranscript(raw);

  const empty: DetectionResult = {
    surah: 0,
    ayah: 0,
    endAyah: 0,
    spanLength: 1,
    confidence: 0,
    status: "reject",
    transcript,
    rawTranscript: raw,
    matchedText: "",
    span: [],
  };
  if (!transcript || index.size === 0) return empty;

  const candIds = index.candidates(transcript, topK, opts.surah);
  const ids = candIds.length > 0 ? candIds : fallbackScan(index, transcript, opts.surah, topK);

  let best: { idx: number; span: number; score: number } | null = null;

  for (const id of ids) {
    const base = index.ayahs[id];
    // span 1
    let text = base.normalized;
    let score = calculateSimilarity(transcript, text);
    if (!best || score > best.score) best = { idx: id, span: 1, score };
    // spans 2..maxSpan
    const next = index.nextInSurah(id, maxSpanN - 1);
    let concat = base.normalized;
    for (let s = 2; s <= maxSpanN; s++) {
      const nxt = next[s - 2];
      if (!nxt) break;
      concat += " " + nxt.normalized;
      const ss = calculateSimilarity(transcript, concat);
      if (!best || ss > best.score) best = { idx: id, span: s as 1 | 2 | 3, score: ss };
    }
  }

  if (!best) return empty;
  const base = index.ayahs[best.idx];
  const next = index.nextInSurah(best.idx, best.span - 1);
  const spanAyahs: AyahRef[] = [
    { surah: base.surah, ayah: base.ayah },
    ...next.map((a) => ({ surah: a.surah, ayah: a.ayah })),
  ];
  const endAyah = spanAyahs[spanAyahs.length - 1].ayah;
  const status = best.score < rejectBelow! ? "reject" : best.score <= acceptAbove! ? "low" : "accept";

  return {
    surah: base.surah,
    ayah: base.ayah,
    endAyah,
    spanLength: best.span as 1 | 2 | 3,
    confidence: round3(best.score),
    status,
    transcript,
    rawTranscript: raw,
    matchedText: base.text,
    span: spanAyahs,
  };
}

function fallbackScan(
  index: QuranIndex,
  transcript: string,
  surah: number | undefined,
  topK: number,
): number[] {
  const out: number[] = [];
  const words = transcript.split(" ").filter(Boolean);
  for (let i = 0; i < index.size && out.length < topK; i++) {
    const a = index.ayahs[i];
    if (surah !== undefined && a.surah !== surah) continue;
    if (words.some((w) => w.length >= 3 && a.normalized.includes(w))) out.push(i);
  }
  return out;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
