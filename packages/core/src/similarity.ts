/**
 * Similarity ported from Tarteel backend calculate_text_similarity,
 * tuned for short recited fragments (substring-aware + Jaccard + char fallback).
 */
export function calculateSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;

  // Substring fast-path: recited fragment inside ayah (or vice versa).
  if (a.includes(b) || b.includes(a)) {
    const shorter = a.length <= b.length ? a : b;
    const longer = a.length <= b.length ? b : a;
    if (longer.length === 0) return 0;
    const charRatio = shorter.length / longer.length;
    // Word-recall floor: every word of the shorter string appears in the longer
    // one (e.g. recited "قل هو الله احد" inside a Basmala-prefixed ayah).
    // Single-word queries stay on charRatio (too ambiguous to accept).
    const qWords = shorter.split(" ").filter(Boolean);
    if (qWords.length >= 2) {
      const tWords = new Set(longer.split(" ").filter(Boolean));
      if (qWords.every((w) => tWords.has(w))) {
        const floor = 0.7 + 0.3 * Math.min(1, shorter.length / 30);
        return Math.max(charRatio, floor);
      }
    }
    return charRatio;
  }

  const wordsA = a.split(" ").filter(Boolean);
  const wordsB = b.split(" ").filter(Boolean);
  if (wordsA.length === 0 || wordsB.length === 0) return 0;

  const setA = new Set(wordsA);
  const setB = new Set(wordsB);
  let inter = 0;
  for (const w of setA) if (setB.has(w)) inter++;
  const union = setA.size + setB.size - inter;
  const jaccard = union === 0 ? 0 : inter / union;

  // Short-text char fallback (both under ~50 chars).
  if (a.length < 50 || b.length < 50) {
    const ca = new Set(a);
    const cb = new Set(b);
    let ci = 0;
    for (const c of ca) if (cb.has(c)) ci++;
    const cu = ca.size + cb.size - ci;
    const charSim = cu === 0 ? 0 : ci / cu;
    return jaccard * 0.7 + charSim * 0.3;
  }
  return jaccard;
}
