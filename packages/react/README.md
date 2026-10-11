# `@bakemono-san/verset-finder-react`

> React bindings for verset-finder: `useVersetDetection` hook + `<VersetFinderMic/>` drop-in mic button.

[![npm version](https://img.shields.io/npm/v/@bakemono-san/verset-finder-react.svg)](https://www.npmjs.com/package/@bakemono-san/verset-finder-react)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

Part of [**verset-finder**](https://github.com/Bakemono-san/verset-finder) — see the root README for the full guide, demo, and browser matrix.

## Install

```bash
pnpm add @bakemono-san/verset-finder @bakemono-san/verset-finder-react
# npm i @bakemono-san/verset-finder @bakemono-san/verset-finder-react
```

Requires **Node ≥ 18** and **React ^17 || ^18 || ^19** (peer). No Tailwind, no extra CSS — the component uses inline longhand styles and works unstyled.

> ⚠️ Import from `@bakemono-san/verset-finder-react` (the package root).
> The old `@bakemono-san/verset-finder/react` subpath is **not** supported.

## Minimal usage

```tsx
import { VersetFinderMic } from "@bakemono-san/verset-finder-react";

<VersetFinderMic
  indexUrl="/verset-finder-index.json"
  onDetect={(r) => {
    if (r.status === "reject") return; // <0.5 reject, 0.5–0.6 low, >0.6 accept
    router.push(`/surah/${r.surah}?ayah=${r.ayah}`);
  }}
/>
```

Custom design? Use the headless hook instead:

```tsx
import { useVersetDetection } from "@bakemono-san/verset-finder-react";

function CustomMic() {
  const { state, transcript, result, supported, start, stop } = useVersetDetection({
    indexUrl: "/verset-finder-index.json",
    onDetect: (r) => console.log(r.surah, r.ayah, r.status),
  });
  if (!supported) return <p>Use Chrome or Edge.</p>;
  return (
    <button onClick={state === "listening" ? stop : start}>
      {state === "listening" ? "Stop" : "Recite"} — {transcript}
    </button>
  );
}
```

## Full API

### `useVersetDetection(opts?)`

Options extend core `DetectOptions` (`surah`, `topK`, `rejectBelow`, `acceptAbove`, `maxSpan`) + `LoadDataOptions` (`indexUrl`, `edition`, `fetchFn`, `useCache`) with:

| Option | Default | Meaning |
|---|---|---|
| `lang` | `"ar-SA"` | Speech-recognition language |
| `autoDetect` | `true` | Auto-detect on every final transcript |
| `debounceMs` | `300` | Debounce after final transcript before detection |
| `onDetect` | — | Called with every `DetectionResult` |
| `onError` | — | Called with fatal error codes |

Returns:

| Field | Meaning |
|---|---|
| `state` | `"idle" \| "listening" \| "processing" \| "done" \| "error"` |
| `transcript` / `interim` | Final transcript (+ live interim suffix) / interim only |
| `result` | Last `DetectionResult \| null` |
| `error` | Fatal error code (`not-supported`, `mic-blocked`, …) or `null` |
| `hint` | Transient notice (`no-speech`) — listening continues; `null` when none |
| `permission` | `"granted" \| "prompt" \| "denied" \| "unknown"` mic permission |
| `supported` | Web Speech API present in this browser |
| `ayahCount` / `indexReady` | Loaded ayah count / index ready flag |
| `start()` / `stop()` / `reset()` | Mic controls (`stop` with no transcript returns to `idle`, never stuck in `processing`) |
| `detect(text)` | Manual detection against the loaded index |

### `<VersetFinderMic/>` props

| Prop | Default | Meaning |
|---|---|---|
| `onDetect` | — | Called with every accept/low result — wire to your router |
| `onError` | — | Called with fatal error codes |
| `lang` | `"ar-SA"` | Speech-recognition language |
| `surah` | — | Restrict detection to one surah |
| `indexUrl` | live fetch | Prebuilt index JSON URL |
| `locale` | `"en"` | `"ar" \| "fr" \| "en"` label preset |
| `labels` | — | Partial text overrides — deepest merge wins (interface below) |
| `rtl` | auto from locale | RTL layout (`true` when `locale === "ar"` unless set) |
| `className` | — | Extra wrapper class |
| `compact` | `false` | Icon-only button vs full label |
| `accent` | `"#059669"` | Mic button accent color |

**`VersetFinderLabels`** — every field optional, merged over the locale preset:

```ts
interface VersetFinderLabels {
  states?: Partial<Record<"idle" | "listening" | "processing" | "done" | "error", string>>;
  status?: Partial<Record<"accept" | "low" | "reject", string>>;
  indexLoading?: string;
  ready?: (count: string) => string;
  hints?: Record<string, string>;
  permissionDenied?: string;
  errors?: Record<string, string>;
  unsupported?: string;
}
```

```tsx
// French preset + custom idle text and ready line
<VersetFinderMic
  locale="fr"
  labels={{
    states: { idle: "Réciter un verset" },
    ready: (n) => `${n} versets prêts`,
    hints: { "no-speech": "Parlez plus fort !" },
  }}
/>
```

Thresholds: **<0.5 reject · 0.5–0.6 low · >0.6 accept**. Spans of **1–3 consecutive ayahs** (same surah). Only `accept`/`low` results render a match card; `reject` stays silent (your `onDetect` decides).

## Styling

No Tailwind, no CSS files. The component ships inline **longhand** styles only
(never `border` shorthand mixed with `borderColor` — React drops the longhand on
rerender). Override via `className` on the wrapper, `accent` for the brand color,
or `compact` for icon-only mode. Respects `prefers-reduced-motion`.

## License

MIT ([`LICENSE`](./LICENSE)). Full guide in the [root README](https://github.com/Bakemono-san/verset-finder#readme).
