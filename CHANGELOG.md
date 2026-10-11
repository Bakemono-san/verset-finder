# Changelog

All notable changes to this project. Versions: `core` = `@bakemono-san/verset-finder`,
`react` = `@bakemono-san/verset-finder-react`. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- Pro-grade OSS hygiene: root README rewrite (badges, quickstarts, API tables, browser matrix, troubleshooting, roadmap), per-package READMEs, `apps/demo/README.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, issue/PR templates, CI (`ci.yml`: install/build/test/typecheck/publint on Node 18+20).

## react 0.1.4 / core 0.1.1 — 2026-10-11

### Added
- `VersetFinderMic`: `locale` default `"en"` with `ar`/`fr`/`en` presets + deep `labels` override prop (`states`, `status`, `indexLoading`, `ready`, `hints`, `permissionDenied`, `errors`, `unsupported`); `rtl` auto-defaults from locale.
- `compact` + `accent` props; demo page fully in English with labels usage example.

## 2026-10-11 — recitation test support (react 0.1.3)

### Added
- Core WebSpeech provider forwards `no-speech` + `onEnd` (no more silent stalls).
- Hook: transient `hint` state, mic permission query, seamless auto-restart on silence/timeout end; instant-end deemed `mic-blocked`.
- Mic UI: localized hint/permission/error messages; demo live diagnostics panel + 5-step recitation test guide.

## 2026-10-11 — mic + demo UI upgrade

### Added
- `VersetFinderMic`: status badge + confidence bar, live transcript with interim dimming, pulse ring while listening, scoped keyframes, `prefers-reduced-motion` support, `accent` prop.
- Demo card layout, status-colored result panel, full Al-Ikhlas fixture.

### Fixed
- Border shorthand warning: longhand `border-*` only in React styles.

## react 0.1.2 — 2026-10-11

### Fixed
- Mic stuck at `processing` when reciting before the index loads: detection retries once the Quran index is ready; `stop()` with empty transcript returns to `idle`.
- Mic shows live transcript, index loading state, ready ayah count; demo serves prebuilt full-Quran index locally; fixed integration snippet import.

## react 0.1.1 — 2026-10-11

### Fixed
- Replaced `workspace:` dep with `^0.1.0` range (npm does not rewrite the `workspace:` protocol on publish — it ships literally and breaks installs).

## 0.1.0 — 2026-10-11

### Added
- Initial release (`@bakemono_san` scope, later renamed to `@bakemono-san` — registry-valid, matches npm username).
- `packages/core`: headless Arabic normalization + trigram index + `detectAyah` (thresholds <0.5 reject / 0.5–0.6 low / >0.6 accept, spans 1–3), WebSpeech/WhisperREST/WS/custom providers, capture helpers.
- `packages/react`: `useVersetDetection` hook + `VersetFinderMic` component.
- `apps/demo`: Vite integration demo. publint clean, 17/17 tests passing.
