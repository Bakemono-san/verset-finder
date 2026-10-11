import { describe, expect, it } from "vitest";
import { QuranIndex } from "../src/trigramIndex.js";

describe("trigram index", () => {
  it("retrieves candidates without O(n^3) scan", () => {
    const idx = new QuranIndex([
      { surah: 1, ayah: 2, text: "الحمد لله رب العالمين" },
      { surah: 112, ayah: 1, text: "قل هو الله أحد" },
    ]);
    expect(idx.size).toBe(2);
    const cands = idx.candidates("الحمد لله", 10);
    expect(cands.length).toBeGreaterThan(0);
    expect(idx.ayahs[cands[0]].ayah).toBe(2);
  });
  it("round-trips through JSON", () => {
    const idx = new QuranIndex([{ surah: 1, ayah: 1, text: "بسم الله الرحمن الرحيم" }]);
    const revived = QuranIndex.fromJSON(idx.toJSON());
    expect(revived.size).toBe(1);
    expect(revived.candidates("بسم الله", 5)).toHaveLength(1);
  });
});
