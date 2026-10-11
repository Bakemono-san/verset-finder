# 🎙️ VersetFinder

> Drop-in Quran verse finder: user clicks mic → recites → your app navigates to `surah:ayah`.

[![npm version core](https://img.shields.io/npm/v/@bakemono-san/verset-finder.svg?label=core)](https://www.npmjs.com/package/@bakemono-san/verset-finder)
[![npm version react](https://img.shields.io/npm/v/@bakemono-san/verset-finder-react.svg?label=react)](https://www.npmjs.com/package/@bakemono-san/verset-finder-react)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![Build](https://img.shields.io/github/actions/workflow/status/Bakemono-san/verset-finder/ci.yml?branch=main&label=build)](https://github.com/Bakemono-san/verset-finder/actions)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)

**Why?** Finding a verse by reciting it should be one component, not a research project.
VersetFinder is **local-first**: the mic transcript never leaves the device by default —
Arabic normalization → trigram inverted index → similarity rescoring, all in the browser.
No API keys, no backend, no Tailwind dependency. Hafs-only in v1.

```
┌─────────┐   ┌────────────┐   ┌───────────┐   ┌──────────┐   ┌────────┐   ┌───────────┐
│   Mic   │──▶│ Transcribe │──▶│ Normalize │──▶│ Trigram  │──▶│ Rerank │──▶│ onDetect  │
│ (Web    │   │ (WebSpeech │   │ (tashkeel │   │ index    │   │ spans  │   │ surah:    │
│ Speech) │   │  ar-SA)    │   │ strip…)   │   │ top-K    │   │ 1–3    │   │ ayah      │
└─────────┘   └────────────┘   └───────────┘   └──────────┘   └────────┘   └───────────┘
```

> 📸 **Screenshot / GIF placeholder** — a 20-second clip goes here: click mic → recite
> Surah Al-Ikhlas → badge `Match · 98%` → app navigates to `112:1–4`.
> (`docs/demo.gif` — contributions welcome!)

---

## ✨ Features

- **Headless core** (`@bakemono-san/verset-finder`) — framework-free, tree-shakeable, `<30KB gz` (Quran text loads at runtime, never bundled).
- **React bindings** (`@bakemono-san/verset-finder-react`) — `useVersetDetection` hook + unstyled `<VersetFinderMic/>` button (inline styles, RTL included, no Tailwind).
- **Trigram inverted index** over 6236 ayahs — O(k) candidate retrieval + similarity rescoring, with **1–3 ayah span** detection (same surah).
- **Arabic-aware normalization** — tashkeel/tatweel strip, alef/hamza/ta-marbuta/ya unification, Basmala-prefix handling, voice-filler removal (recitation-safe: never strips genuine Quran words like قل).
- **Providers** — WebSpeech-first mic (Chrome/Edge, `ar-SA`), optional Whisper REST (`POST /api/transcribe`), streaming WS, server verify (`POST /api/speech/add-tashkeel`, Tarteel-compatible), or bring-your-own via `createCustomProvider`.
- **Localized UI** — `locale` presets `ar` / `fr` / `en` (default `en`) + deep `labels` override prop.
- **IndexedDB-cached index** — downloads once, instant afterwards (`useCache: false` to skip).

---

## 🚀 Quickstart

```bash
pnpm add @bakemono-san/verset-finder @bakemono-san/verset-finder-react
# npm i …  /  yarn add …  work too
```

**React + Vite (10 lines):**

```tsx
import { VersetFinderMic } from "@bakemono-san/verset-finder-react";

export function Finder() {
  return (
    <VersetFinderMic
      indexUrl="/verset-finder-index.json"
      onDetect={(r) => {
        if (r.status === "reject") return; // <0.5 reject, 0.5–0.6 low, >0.6 accept
        setCurrentSurah(r.surah);
        setCurrentAyah(r.ayah);
      }}
    />
  );
}
```

**Next.js (app router, 10 lines):**

```tsx
"use client";
import { VersetFinderMic } from "@bakemono-san/verset-finder-react";
import { useRouter } from "next/navigation";

export function Finder() {
  const router = useRouter();
  return (
    <VersetFinderMic
      indexUrl="/verset-finder-index.json"
      onDetect={(r) => {
        if (r.status === "reject") return;
        router.push(`/surah/${r.surah}?ayah=${r.ayah}`);
      }}
    />
  );
}
```

> Copy `/verset-finder-index.json` (6236 ayahs, prebuilt — see
> [`apps/demo/public/verset-finder-index.json`](./apps/demo/public/verset-finder-index.json))
> into your app's `public/` folder, or omit `indexUrl` to fetch live from
> `api.alquran.cloud` (requires internet on first load).

---

## 📖 API reference

### Core — `@bakemono-san/verset-finder`

| Export | Usage |
|---|---|
| `detectAyah(transcript, index, opts?)` | → `DetectionResult { surah, ayah, endAyah, spanLength 1–3, confidence 0–1, status, matchedText, span }` |
| `QuranIndex` / `buildIndex(rows)` / `loadQuranIndex({ indexUrl? })` | Trigram index; IndexedDB-cached; loads Hafs `quran-simple` |
| `normalizeArabic` / `sanitizeVoiceTranscript` / `normalizeTranscript` / `removeDiacritics` / `containsArabic` | Normalizers (mon-coran + Tarteel ports) |
| `calculateSimilarity(a, b)` | 0–1 similarity (substring-aware + Jaccard + char fallback) |
| `WebSpeechProvider` / `createWebSpeechProvider()` | WebSpeech-first mic (Chrome/Edge, `ar-SA`) |
| `transcribeRest(audio, { baseUrl })` / `verifyWithServer(text, { baseUrl })` | Optional server paths (Tarteel-compatible) |
| `transcribeLive({ wsUrl, onText })` | Streaming transcription over WebSocket |
| `createCustomProvider(name, hooks)` | Bring-your-own STT pipeline |
| `captureAudio(maxMs?)` / `startCapture()` | MediaRecorder mic capture for REST/WS providers |
| `loadCachedIndex` / `saveCachedIndex` / `clearCachedIndex` | IndexedDB cache primitives |

**`DetectOptions`:**

| Option | Default | Meaning |
|---|---|---|
| `surah` | whole Quran | Restrict search to surah 1–114 |
| `topK` | `60` | Candidates pulled from trigram index before rescoring |
| `rejectBelow` | `0.5` | Score below this → `status: "reject"` |
| `acceptAbove` | `0.6` | Score above this → `status: "accept"` (between → `"low"`) |
| `maxSpan` | `3` | Max consecutive-ayah window (`1 \| 2 \| 3`, same surah) |

Thresholds: **<0.5 reject · 0.5–0.6 low · >0.6 accept**. Spans of **1–3 consecutive ayahs**.

### React — `@bakemono-san/verset-finder-react`

| Export | Usage |
|---|---|
| `useVersetDetection(opts?)` | Headless hook: mic → transcript → local detect. Returns `{ state, transcript, interim, result, error, hint, permission, supported, ayahCount, indexReady, start, stop, reset, detect }` |
| `<VersetFinderMic/>` | Drop-in mic button (unstyled, inline styles, RTL). Custom UI alternative to the hook |

**`<VersetFinderMic/>` props:**

| Prop | Default | Meaning |
|---|---|---|
| `onDetect` | — | Called with every accept/low `DetectionResult`. Wire to your router |
| `onError` | — | Called with fatal error codes (`not-supported`, `mic-blocked`, …) |
| `lang` | `"ar-SA"` | Speech-recognition language |
| `surah` | — | Restrict detection to one surah |
| `indexUrl` | live fetch | Prebuilt index JSON URL (e.g. `"/verset-finder-index.json"`) |
| `locale` | `"en"` | `"ar" \| "fr" \| "en"` label preset |
| `labels` | — | Partial text overrides — deepest merge wins (see interface below) |
| `rtl` | auto from locale | Right-to-left layout (`true` when `locale === "ar"` unless set) |
| `className` | — | Extra wrapper class (no Tailwind required) |
| `compact` | `false` | Icon-only button vs full label |
| `accent` | `"#059669"` | Mic button accent color |

**`VersetFinderLabels` interface** (every field optional, merged over the locale preset):

```ts
interface VersetFinderLabels {
  states?: Partial<Record<"idle" | "listening" | "processing" | "done" | "error", string>>;
  status?: Partial<Record<"accept" | "low" | "reject", string>>;
  indexLoading?: string;
  ready?: (count: string) => string;
  hints?: Record<string, string>;            // e.g. { "no-speech": "…" }
  permissionDenied?: string;
  errors?: Record<string, string>;           // by code, falls back to raw code
  unsupported?: string;
}
```

```tsx
// Example: Arabic preset + targeted overrides (default locale is "en")
<VersetFinderMic
  locale="ar"
  labels={{ states: { idle: "ابدأ التلاوة" }, ready: (n) => `${n} آية` }}
/>
```

---

## 🧭 Demo

Prereqs: **Node ≥ 18**, **pnpm**, **Chrome or Edge** (mic needs Web Speech).

```bash
pnpm install
pnpm --filter verset-finder-demo dev
# → http://localhost:5199
```

**What to try:**

1. **Manual test** (§2) — the input is prefilled with `قل هو الله أحد الله الصمد`; click **Detect** → expect badge `accept · ~90%+`, ref `112:1–2`, matched Arabic text + raw JSON. Zero network needed (7-ayah offline fixture).
2. **Mic recitation** (§1) — click **Recite to find**, **Allow** the microphone, recite loudly (e.g. *Qul huwa Allahu ahad, Allahu as-samad…*). The transcript appears live (RTL), then a badge `Match · N%` with `112:1…` and the matched text. Internet required (Google transcription servers).
3. **Diagnostics panel** (§3) — four rows: `Browser` (Web Speech present?), `Mic permission` (`granted`/`prompt`/`denied`), `Quran index` (`ok (6236 ayahs)` = prebuilt JSON served), `Protocol` (mic needs `https` or `localhost`). All green = ready.

Full guide: [`apps/demo/README.md`](./apps/demo/README.md).

---

## 🌍 Browser support

| Browser | Mic (WebSpeech) | Why | Fallback |
|---|---|---|---|
| Chrome / Edge (desktop + Android) | ✅ Yes | Only engines shipping the Web Speech API with `ar-SA` Arabic models | — (default path) |
| Firefox | ❌ No | Mozilla never shipped `SpeechRecognition` (privacy stance, no Arabic model) | Whisper REST/WS provider + `captureAudio` (`transcribeRest(blob, { baseUrl })`) |
| Safari (macOS/iOS) | ❌ No / partial | `webkitSpeechRecognition` exists on macOS but no Arabic support; absent on iOS | Same Whisper fallback; iOS also needs `https` + user gesture |
| Node / SSR | N/A (headless-safe) | All providers are import-safe (no DOM at import); mic methods throw `not-supported` / `capture-not-supported` outside browsers | `detectAyah` + `buildIndex` fully work in Node 18+ |

---

## 🔧 Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Stuck on **"Matching…" / processing** | Quran index still downloading (large first load), transcript arrived before index ready | Wait for `Loading Quran index…` to clear; the hook auto-retries detection once the index arrives. Serve the prebuilt `/verset-finder-index.json` locally to make loads instant |
| **"No speech heard"** hint | Silence / mic too far / tab muted / wrong input device | Move closer, speak up, check OS mic + tab mute; the hint is transient — listening continues |
| **"Microphone blocked"** error | Permission denied, or `onend` fired <1.5s after start (autoplay policy / no mic) | Click 🔒 in the address bar → allow mic → retry. Serve over `https` or `localhost`; requires a user click (no autostart) |
| `404` / empty version right after `pnpm add` (first install) | npm registry lag after a fresh publish | Wait a few minutes, retry `pnpm add`; pin the exact version (`@0.1.x`) to bypass stale metadata |
| `not-supported` banner | Firefox / Safari / insecure context | Use Chrome/Edge, or wire the Whisper fallback (`transcribeRest` + `captureAudio`) |
| Wrong verse / `low` confidence | Short fragment, heavy accent, background noise | Recite 1 full ayah minimum; raise `topK`, or confirm `low` results in UI instead of auto-navigating |

---

## 🗺️ Roadmap

- [ ] **Warsh recitation support** — second index edition alongside Hafs `quran-simple` (`edition` option already plumbed).
- [ ] **React Native / Flutter bindings** — core is headless; needs native STT bridges (no WebSpeech on mobile).
- [ ] **Threshold calibration tool** — per-surah ROC curves over a labeled recitation corpus to tune `rejectBelow`/`acceptAbove` (currently fixed at 0.5/0.6 from heuristics).
- [ ] `docs/demo.gif` — 20s screen recording for the hero.
- [ ] E2E tests (Playwright) for the demo; unit tests for the React hook.

---

## 📜 License & Quran text attribution

- **Code: MIT** — see [`LICENSE`](./LICENSE) (also shipped in both packages).
- **Quran text** (Hafs, `quran-simple` edition) is fetched at build time from **api.alquran.cloud** (Tanzil / King Fahd Glorious Quran Printing Complex data). It is **not** covered by MIT — downstream apps must preserve attribution and respect [Tanzil's terms](https://tanzil.net/trans/).

---

## 🤝 Contributing

PRs welcome! See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for setup, workspace commands,
code style, provider guide, and the release process. Please read the
[`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md) and [`SECURITY.md`](./SECURITY.md).
