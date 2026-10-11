# `@bakemono-san/verset-finder`

> Headless Quran verse finder: transcript → `surah:ayah`. No DOM, no framework, no audio leaves the device.

[![npm version](https://img.shields.io/npm/v/@bakemono-san/verset-finder.svg)](https://www.npmjs.com/package/@bakemono-san/verset-finder)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

Part of [**verset-finder**](https://github.com/Bakemono-san/verset-finder) — see the root README for the full guide, demo, and browser matrix.

## Install

```bash
pnpm add @bakemono-san/verset-finder
# npm i @bakemono-san/verset-finder
```

Requires **Node ≥ 18**. Works in browsers (Vite/Next.js), Node, and workers. Tree-shakeable, side-effect free, `<30KB gz` — the Quran text is **never bundled**; it loads at runtime (prebuilt JSON → IndexedDB → live fetch).

## Minimal usage

```ts
import { QuranIndex, detectAyah } from "@bakemono-san/verset-finder";

// From raw ayah rows…
const index = new QuranIndex([
  { surah: 112, ayah: 1, text: "قل هو الله أحد" },
  { surah: 112, ayah: 2, text: "الله الصمد" },
]);

const r = detectAyah("قل هو الله احد", index);
console.log(r.surah, r.ayah, r.status, r.confidence);
// 112 1 "accept" 0.98
```

```ts
// …or load the full Quran (6236 ayahs, Hafs quran-simple)
import { loadQuranIndex } from "@bakemono-san/verset-finder";

// 1. Prebuilt JSON you host (instant, offline-capable):
const index = await loadQuranIndex({ indexUrl: "/verset-finder-index.json" });

// 2. Live fetch (no hosting needed, internet on first load):
const live = await loadQuranIndex();
```

## Full API

### Detection

```ts
import { detectAyah } from "@bakemono-san/verset-finder";

const result = detectAyah(transcript, index, {
  surah: 112,       // restrict to one surah (default: whole Quran)
  topK: 60,         // trigram candidates before rescoring (default 60)
  rejectBelow: 0.5, // score < 0.5 → "reject" (default)
  acceptAbove: 0.6, // score > 0.6 → "accept", between → "low" (default)
  maxSpan: 3,       // 1 | 2 | 3 consecutive ayahs, same surah (default 3)
});
```

`DetectionResult`: `{ surah, ayah, endAyah, spanLength, confidence (0–1), status ("accept"|"low"|"reject"), transcript, rawTranscript, matchedText, span }`.

### Index

| Export | Description |
|---|---|
| `QuranIndex(rows?, edition?)` | Trigram inverted index: `.build(rows)`, `.candidates(query, topK, surah?)`, `.nextInSurah(idx, n)`, `.toJSON()` / `QuranIndex.fromJSON(data)` |
| `buildIndex(rows, edition?)` | Shorthand for `new QuranIndex().build(rows)` |
| `loadQuranIndex({ indexUrl?, edition?, fetchFn?, useCache? })` | Full-Quran loader: `indexUrl` JSON → IndexedDB cache → live `api.alquran.cloud`. Set `useCache: false` to skip IndexedDB |
| `trigramsOf(s)` / `stripBasmalaPrefix(s)` | Low-level helpers (padded char trigrams; Basmala-prefix strip for non-Fatiha ayah 1) |
| `loadCachedIndex` / `saveCachedIndex` / `clearCachedIndex` | IndexedDB cache primitives |

### Normalization

| Export | Description |
|---|---|
| `normalizeArabic(text)` | Canonical matching form: NFKC → strip tashkeel/tatweel → strip punctuation → unify alef/hamza/ta-marbuta/ya → collapse spaces |
| `removeDiacritics(text)` | Strip tashkeel only (keeps letters) |
| `sanitizeVoiceTranscript(text)` | Strip voice-command fillers + punctuation, keeps original script |
| `normalizeTranscript(raw)` | Recitation pipeline: recitation-safe filler strip (never removes genuine Quran words like قل) then `normalizeArabic` |
| `containsArabic(text)` | True if any Arabic-block char present |
| `calculateSimilarity(a, b)` | 0–1 similarity: exact → 1; substring fast-path with word-recall floor; Jaccard + char fallback |

### Providers (mic → transcript)

```ts
import {
  WebSpeechProvider,          // Chrome/Edge, ar-SA, continuous + interim
  createWebSpeechProvider,    // lazy variant (SSR-safe)
  transcribeRest,             // POST audio Blob → text  (POST {baseUrl}/api/transcribe)
  verifyWithServer,           // POST {baseUrl}/api/speech/add-tashkeel { text, context: "quran" }
  transcribeLive,             // WebSocket streaming: send binary chunks, receive { text, isFinal }
  createCustomProvider,       // wrap any STT pipeline behind SpeechProvider
  captureAudio, startCapture, // MediaRecorder helpers for REST/WS providers
} from "@bakemono-san/verset-finder";
```

```ts
// WebSpeech (default path)
const mic = new WebSpeechProvider();
if (mic.isSupported()) {
  mic.start({
    lang: "ar-SA",
    onResult: (text, isFinal) => { if (isFinal) console.log(detectAyah(text, index)); },
    onError: console.error,
    onEnd: () => {},
  });
}

// Whisper REST fallback (Firefox/Safari — needs your backend)
import { captureAudio, transcribeRest } from "@bakemono-san/verset-finder";
const audio = await captureAudio(15_000);
const text = await transcribeRest(audio, { baseUrl: "https://your-backend" });

// Bring-your-own provider
import { createCustomProvider } from "@bakemono-san/verset-finder";
const custom = createCustomProvider("my-stt", {
  onStart: ({ lang, signal }) => startMyEngine(lang, signal),
  onStop: () => stopMyEngine(),
});
```

All imports are **headless-safe**: importing in Node/SSR never touches `window`/`navigator`/`MediaRecorder` — those are only used inside methods at call time.

## How it works

```
mic → transcribe → normalize → trigram candidates (top-K) → similarity rescoring over spans 1–3 → onDetect
```

1. **Transcribe** — WebSpeech (`ar-SA`) produces a raw Arabic transcript.
2. **Normalize** — `normalizeTranscript` strips fillers/punctuation, unifies orthography.
3. **Retrieve** — `QuranIndex.candidates` scores ayahs by trigram overlap (O(k)).
4. **Rerank** — `calculateSimilarity` rescores each candidate over 1–3 ayah windows; best window wins with thresholds **<0.5 reject · 0.5–0.6 low · >0.6 accept**.

## License & attribution

Code: **MIT** ([`LICENSE`](./LICENSE)). Quran text (Hafs, `quran-simple`, via api.alquran.cloud / Tanzil) is **not** MIT-covered — preserve attribution per [Tanzil's terms](https://tanzil.net/trans/). Full details in the [root README](https://github.com/Bakemono-san/verset-finder#readme).
