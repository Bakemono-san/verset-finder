# Contributing to VersetFinder

Thanks for helping! This is a `pnpm` monorepo: `packages/core` (headless matcher),
`packages/react` (hook + mic button), `apps/demo` (Vite playground, port 5199).

## Setup

```bash
pnpm install
pnpm build          # builds all packages (core → react → demo)
pnpm test           # vitest across packages (core holds the 17 logic tests)
pnpm demo           # alias: pnpm --filter verset-finder-demo dev → http://localhost:5199
```

Prereqs: **Node ≥ 18**, **pnpm**, **Chrome/Edge** for mic testing.

## Workspace commands

```bash
pnpm -r build                          # all packages
pnpm --filter @bakemono-san/verset-finder build
pnpm --filter @bakemono-san/verset-finder-react build
pnpm --filter @bakemono-san/verset-finder test        # vitest run (17 tests)
pnpm --filter @bakemono-san/verset-finder typecheck   # tsc --noEmit
pnpm --filter @bakemono-san/verset-finder-react typecheck
pnpm --filter verset-finder-demo build # tsc --noEmit && vite build
npx publint packages/core              # package publish lint (needs built dist)
npx publint packages/react
```

There is no root `typecheck` aggregator — run it per package (CI does `pnpm -r typecheck`).

## Code style

- **TypeScript strict**, ES2020 target, `moduleResolution: bundler`. No `any` without justification.
- **Longhand CSS only in `packages/react`** — never mix `border` shorthand with `borderColor` (React warns and drops the longhand on rerender). Inline styles, no Tailwind, no CSS files in the package.
- **Tests for matcher/normalizer**: any change to `packages/core/src/matcher.ts`, `normalize.ts`, `similarity.ts`, or `trigramIndex.ts` must extend `packages/core/tests/` (currently `matcher` 10, `normalize` 5, `index` 2). Run `vitest run` before pushing.
- **Headless-safe core**: `packages/core` must never touch `window`/`navigator`/`MediaRecorder`/`WebSocket` at import time — only inside methods at call time (SSR/Node compat).
- Keep the core bundle lean: Quran text is **never bundled** into `dist` (runtime-loaded via `indexUrl`/IndexedDB/live fetch).

## How to add a provider

1. Implement the `SpeechProvider` contract from `packages/core/src/providers.ts`:
   ` { name, isSupported(), start({ lang, onResult, onError, onEnd }), stop(), abort?() }`.
2. Put it in `packages/core/src/` (e.g. `myProvider.ts`), export from `src/index.ts`, or use `createCustomProvider(name, hooks)` for thin wrappers (see `src/custom.ts`).
3. Error contract: forward raw codes (`no-speech`, `mic-blocked`, `not-supported`…); the React hook decides hint-vs-error. Never swallow `no-speech` — UIs get stuck.
4. Add tests where the logic is pure; document the provider in `packages/core/README.md` + root README table.

## PR process

1. Fork → feature branch (`feat/…`, `fix/…`, `docs/…`).
2. Keep PRs focused; update READMEs + `CHANGELOG.md` if user-facing.
3. Ensure green: `pnpm build`, `vitest` (17+ tests), `tsc` typechecks, `publint` both packages, `apps/demo` build.
4. Fill the [PR template](.github/PULL_REQUEST_TEMPLATE.md); link issues; attach the demo screenshot/GIF for UI changes.
5. Maintainer squash-merges with a [Conventional Commits](https://www.conventionalcommits.org/) message (see below).

## Release process (manual — no changesets)

Order matters: **core first, then react** (react depends on core via `^` range).

1. Bump versions: `packages/core/package.json`, then `packages/react/package.json` (update its `@bakemono-san/verset-finder` dep floor if core had breaking changes).
2. Update `CHANGELOG.md` (new entries on top), verify READMEs show current versions.
3. Verify: clean `pnpm install && pnpm build && pnpm test`, both typechecks, both `publint`, demo build.
4. Commit (`chore(release): core 0.x.y, react 0.x.z`), tag (`core-v0.x.y`, `react-v0.x.z`), push, then publish from the package dirs:
   ```bash
   pnpm --filter @bakemono-san/verset-finder publish --access public
   pnpm --filter @bakemono-san/verset-finder-react publish --access public
   ```
5. ⚠️ **NEVER publish with `npm publish`/`npm pack` when a dependency uses `workspace:`** — npm does not rewrite the `workspace:` protocol (it ships it literally and the install breaks). This repo keeps the react→core dep as a `^` range for that reason. With pnpm, `pnpm publish` rewrites `workspace:^` correctly — or keep the plain `^` range.

## Commit convention

[Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:` … with scope where useful (`feat(react): …`, `fix(core): …`). Example: `feat: English-default UI with customizable labels (react 0.1.4, core 0.1.1)`.
