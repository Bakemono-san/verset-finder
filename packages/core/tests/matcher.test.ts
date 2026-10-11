import { describe, expect, it } from "vitest";
import { QuranIndex } from "../src/trigramIndex.js";
import { detectAyah } from "../src/matcher.js";

const ROWS = [
  { surah: 1, ayah: 1, number: 1, text: "بسم الله الرحمن الرحيم" },
  { surah: 1, ayah: 2, number: 2, text: "الحمد لله رب العالمين" },
  { surah: 1, ayah: 3, number: 3, text: "الرحمن الرحيم" },
  { surah: 1, ayah: 4, number: 4, text: "مالك يوم الدين" },
  { surah: 112, ayah: 1, number: 6223, text: "قل هو الله أحد" },
  { surah: 112, ayah: 2, number: 6224, text: "الله الصمد" },
];

function makeIndex() {
  return new QuranIndex(ROWS);
}

describe("matcher", () => {
  it("accepts an exact recitation", () => {
    const idx = makeIndex();
    const r = detectAyah("الحمد لله رب العالمين", idx);
    expect(r.surah).toBe(1);
    expect(r.ayah).toBe(2);
    expect(r.status).toBe("accept");
    expect(r.confidence).toBeGreaterThan(0.6);
  });
  it("accepts tashkeel input via normalization", () => {
    const idx = makeIndex();
    const r = detectAyah("الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ", idx);
    expect(r.surah).toBe(1);
    expect(r.ayah).toBe(2);
    expect(r.status).toBe("accept");
  });
  it("detects a 2-ayah sequence span", () => {
    const idx = makeIndex();
    const r = detectAyah("الحمد لله رب العالمين الرحمن الرحيم", idx);
    expect(r.surah).toBe(1);
    expect(r.ayah).toBe(2);
    expect(r.spanLength).toBe(2);
    expect(r.endAyah).toBe(3);
    expect(r.status).toBe("accept");
  });
  it("rejects unrelated text below threshold", () => {
    const idx = makeIndex();
    const r = detectAyah("مرحبا كيف حالك اليوم صديقي", idx);
    expect(r.status).toBe("reject");
    expect(r.confidence).toBeLessThan(0.5);
  });
  it("respects surah filter", () => {
    const idx = makeIndex();
    const r = detectAyah("الله الصمد", idx, { surah: 112 });
    expect(r.surah).toBe(112);
    expect(r.status).toBe("accept");
  });
  it("returns reject on empty transcript", () => {
    const idx = makeIndex();
    expect(detectAyah("   ", idx).status).toBe("reject");
  });
});

describe("matcher — recitation regressions", () => {
  it("keeps قل: detects Al-Ikhlas 112:1", async () => {
    const { normalizeTranscript } = await import("../src/normalize.js");
    expect(normalizeTranscript("قل هو الله أحد")).toContain("قل");
    const idx = new QuranIndex([
      { surah: 3, ayah: 2, text: "الله لا إله إلا هو الحي القيوم" },
      { surah: 112, ayah: 1, text: "قل هو الله أحد" },
    ]);
    const r = detectAyah("قل هو الله أحد", idx);
    expect(r.surah).toBe(112);
    expect(r.ayah).toBe(1);
    expect(r.status).toBe("accept");
  });
});

describe("matcher — basmala prefixed editions", () => {
  const ROWS_BASMALA = [
    { surah: 1, ayah: 1, text: "بسم الله الرحمن الرحيم" },
    { surah: 112, ayah: 1, text: "بسم الله الرحمن الرحيم قل هو الله أحد" },
    { surah: 112, ayah: 2, text: "الله الصمد" },
  ];
  it("accepts fragment recited without the prefixed Basmala", () => {
    const idx = new QuranIndex(ROWS_BASMALA);
    const r = detectAyah("قل هو الله أحد", idx);
    expect(r.surah).toBe(112);
    expect(r.ayah).toBe(1);
    expect(r.status).toBe("accept");
  });
  it("still detects Al-Fatiha 1:1 (Basmala itself)", () => {
    const idx = new QuranIndex(ROWS_BASMALA);
    const r = detectAyah("بسم الله الرحمن الرحيم", idx);
    expect(r.surah).toBe(1);
    expect(r.ayah).toBe(1);
    expect(r.status).toBe("accept");
  });
  it("rejects single ambiguous words", () => {
    const idx = new QuranIndex(ROWS_BASMALA);
    expect(detectAyah("الله", idx).status).toBe("reject");
  });
});
