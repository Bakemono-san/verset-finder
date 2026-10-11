# 🎙️ `@bakemono_san/verset-finder`

Drop-in Quran verse finder: user clicks mic → recites → your app navigates to `surah:ayah`.

- **Local-first**: Web Speech transcript → Arabic normalization → trigram inverted index → similarity rescoring. No audio leaves the device by default.
- **Optional server verify**: `POST /api/speech/add-tashkeel` + `POST /api/transcribe` (Tarteel-compatible).
- **Hafs-only v1**, headless core + optional `<VersetFinderMic/>` UI. No Tailwind dependency. RTL included.

## 5-line quickstart

```tsx
import { VersetFinderMic } from "@bakemono_san/verset-finder-react";

<VersetFinderMic onDetect={(r) => {
  if (r.status === "reject") return;          // <0.5 reject, 0.5–0.6 low, >0.6 accept
  router.push(`/surah/${r.surah}?ayah=${r.ayah}`); // or setCurrentSurah/setCurrentAyah
}} />
```

```bash
pnpm add @bakemono_san/verset-finder @bakemono_san/verset-finder-react
```

## API contract

| Export | Usage |
|---|---|
| `detectAyah(transcript, index, { surah?, topK?, rejectBelow?, acceptAbove?, maxSpan? })` | → `DetectionResult { surah, ayah, endAyah, spanLength 1..3, confidence 0..1, status, matchedText, span }` |
| `QuranIndex` / `buildIndex(rows)` / `loadQuranIndex({ indexUrl? })` | trigram index; IndexedDB-cached; fetch `quran-simple` (Hafs) |
| `normalizeArabic / sanitizeVoiceTranscript / normalizeTranscript` | normalizers (mon-coran + Tarteel ports) |
| `WebSpeechProvider` / `createWebSpeechProvider()` | WebSpeech-first mic (Chrome/Edge, `ar-SA`) |
| `transcribeRest(audio, { baseUrl })` / `verifyWithServer(text, { baseUrl })` / `transcribeLive({ wsUrl })` / `createCustomProvider()` | optional server paths |
| `useVersetDetection(opts)` / `<VersetFinderMic/>` (`@bakemono_san/verset-finder-react`) | React hook + unstyled mic button (rtl, locale ar/fr/en) |

Thresholds: **&lt;0.5 reject · 0.5–0.6 low · &gt;0.6 accept**. Spans of **1–3 consecutive ayahs** (same surah).

## Integrations

```tsx
// mon-coran (React+Vite)
<VersetFinderMic onDetect={(r) => {
  if (r.status === "reject") return;
  setCurrentSurah(r.surah); setCurrentAyah(r.ayah);
}} />

// Next.js (quran-com-clone)
const router = useRouter();
<VersetFinderMic onDetect={(r) => {
  if (r.status === "reject") return;
  router.push(`/surah/${r.surah}?ayah=${r.ayah}`);
}} />
```

## License & Quran text attribution

- Code: **MIT** (see `LICENSE`).
- Quran text (Hafs, `quran-simple` edition) is fetched at build time from **api.alquran.cloud** (Tanzil / King Fahd Complex data). It is **not** covered by MIT — preserve attribution and respect Tanzil terms in downstream apps.
