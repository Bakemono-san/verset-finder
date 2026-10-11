/**
 * Arabic normalization ported from:
 *  - mon-coran/src/utils/searchIntelligence.js (normalizeArabicSearchText, sanitizeVoiceTranscript)
 *  - Tarteel-integration-with-copilot/backend/main.py (normalize_arabic_text, remove_arabic_diacritics)
 */

const DIACRITICS_RE = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const TATWEEL_RE = /\u0640/g;
const PUNCT_RE = /[.,/#!$%^&*;:{}=\-_`~()?"'،؛:!؟[\]\\|<>«»…—–]/g;

// Voice-command fillers users say before/after the verse (search, show, surah, ayah...)
// NOTE: no \b boundaries — they don't match Arabic script reliably. Order matters (longest first).
const AR_FILLERS_RE =
  /(ابحث عن|الاية رقم|ابحث|ابغا|أبغا|اريد|أريد|هات|اعرض|أعرض|قول|قل|سورة|سوره|آية|ايه|الآية|الاية|رقم)/g;
// Recitation-safe fillers: same as above MINUS genuine Quran words (قل/قول open
// Al-Ikhlas 112:1, Al-Falaq 113:1, An-Nas 114:1 — stripping them breaks detection).
const AR_RECITATION_FILLERS_RE =
  /(ابحث عن|الاية رقم|ابحث|ابغا|أبغا|اريد|أريد|هات|اعرض|أعرض|سورة|سوره|آية|ايه|الآية|الاية|رقم)/g;
const LATIN_FILLERS_RE = /\b(search|find|show|surah|sura|ayah|verse|please)\b/gi;

/** Strip tashkeel/diacritics only (keeps letters). */
export function removeDiacritics(text: string): string {
  return (text ?? "").normalize("NFKC").replace(DIACRITICS_RE, "").replace(TATWEEL_RE, "");
}

/**
 * Canonical normalization for matching: NFKC -> strip diacritics/tatweel ->
 * strip punctuation -> unify alef/hamza/ta-marbuta/ya -> collapse spaces.
 */
export function normalizeArabic(text: string): string {
  return (text ?? "")
    .normalize("NFKC")
    .replace(DIACRITICS_RE, "")
    .replace(TATWEEL_RE, "")
    .replace(PUNCT_RE, " ")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

/** Remove voice-command fillers + punctuation; keeps original script. */
export function sanitizeVoiceTranscript(transcript: string): string {
  return (transcript ?? "")
    .normalize("NFKC")
    .replace(AR_FILLERS_RE, " ")
    .replace(LATIN_FILLERS_RE, " ")
    .replace(PUNCT_RE, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Recitation pipeline: strip command fillers (keeping Quran words) then normalize. */
export function normalizeTranscript(raw: string): string {
  const cleaned = (raw ?? "")
    .normalize("NFKC")
    .replace(AR_RECITATION_FILLERS_RE, " ")
    .replace(LATIN_FILLERS_RE, " ")
    .replace(PUNCT_RE, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalizeArabic(cleaned);
}

/** True if the string contains any Arabic block char. */
export function containsArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text ?? "");
}
