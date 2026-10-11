import { describe, expect, it } from "vitest";
import {
  normalizeArabic,
  removeDiacritics,
  sanitizeVoiceTranscript,
  normalizeTranscript,
} from "../src/normalize.js";

describe("normalize", () => {
  it("strips tashkeel", () => {
    expect(removeDiacritics("بِسْمِ اللَّهِ")).toBe("بسم الله");
  });
  it("unifies alef variants + ta marbuta + alef maksura", () => {
    expect(normalizeArabic("إأآٱ ة ى")).toBe("اااا ه ي");
  });
  it("strips tatweel and punctuation", () => {
    expect(normalizeArabic("بـسـم، الله!")).toBe("بسم الله");
  });
  it("sanitizes voice fillers", () => {
    const s = sanitizeVoiceTranscript("ابحث عن الحمد لله رب العالمين");
    expect(s).not.toMatch(/ابحث/);
    expect(s).toContain("الحمد");
  });
  it("full pipeline normalizes a recited fragment", () => {
    expect(normalizeTranscript("الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ")).toBe("الحمد لله رب العالمين");
  });
});
