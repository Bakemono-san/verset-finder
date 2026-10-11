# VersetFinder demo

Interactive playground for [`@bakemono-san/verset-finder`](https://github.com/Bakemono-san/verset-finder): manual text detection, live mic recitation, diagnostics, and copy-paste integrations.

## Prereqs

- **Node ≥ 18**
- **pnpm** (`npm i -g pnpm` if needed)
- **Chrome or Edge** for the mic sections (Web Speech with `ar-SA` only ships there — see browser matrix in the [root README](../../README.md#-browser-support))

## Run

```bash
pnpm install
pnpm --filter verset-finder-demo dev
# → http://localhost:5199
```

Production check: `pnpm --filter verset-finder-demo build` (runs `tsc --noEmit && vite build`).

## What to try

### §1 · Drop-in component (full Quran · 6236 ayahs)

`<VersetFinderMic indexUrl="/verset-finder-index.json" onDetect={…} />` loaded against the prebuilt `public/verset-finder-index.json`.

1. Click **Recite to find**, then **Allow** the microphone.
2. Recite loudly, e.g. *Qul huwa Allahu ahad, Allahu as-samad…* — the transcript appears live (RTL), then a badge like `Match · 96%` with ref `112:1–2` and the matched Arabic text.
3. The result line below simulates routing: `surah=112 ayah=1 endAyah=2 (accept, 96%)` — in a real app this is `router.push(...)` / `setCurrentSurah(...)`.

### §2 · Manual test (headless core · 7 ayahs)

Prefilled with `قل هو الله أحد الله الصمد`, scored offline against a 7-ayah in-memory `QuranIndex` (Al-Fatiha 1–3 + Al-Ikhlas) — **zero network needed**.

- Click **Detect** → expect `accept` badge (~90%+), ref `112:1–2`, matched text, and expandable raw JSON (`surah`, `ayah`, `endAyah`, `status`, `confidence`, `transcript`).
- Try a fragment (`الله الصمد`), a non-Quran sentence (expect `reject`), or a typo to see the `low` band.

### §3 · Mic diagnostics (recitation test)

Four rows, live:

| Row | Meaning | Healthy value |
|---|---|---|
| `Browser` | Web Speech API present? | `compatible (Web Speech OK)` |
| `Mic permission` | `navigator.permissions` mic state | `granted` or `prompt` |
| `Quran index` | `HEAD /verset-finder-index.json` | `ok (6236 ayahs)` |
| `Protocol` | Mic requires secure context | `https:` or `localhost` |

Plus the 5-step checklist (Chrome/Edge → Allow → recite loudly → "No speech heard" means check the mic → internet required since Google servers transcribe).

### §4 · Integration snippets

Copy-paste wiring for mon-coran (local state) and Next.js (`router.push`), plus a `locale` + `labels` customization example (default locale is `"en"`).

## Notes

- The prebuilt `public/verset-finder-index.json` is `{ edition, surahs }` raw Quran JSON (6236 ayahs) — `loadQuranIndex` accepts it directly (it also accepts serialized `{ ayahs, postings }` indexes).
- Port is fixed at **5199** (`vite.config.ts`, `dev`/`preview` scripts).
