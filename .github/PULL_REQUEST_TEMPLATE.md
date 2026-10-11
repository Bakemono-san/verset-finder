## What
<!-- One-line summary of the change -->

## Why
<!-- Link issue(s): Fixes #… / context -->

## How
<!-- Approach, alternatives considered -->

## Verification
- [ ] `pnpm build` (all packages + demo)
- [ ] `pnpm --filter @bakemono-san/verset-finder test` (17+ vitest tests pass)
- [ ] `tsc --noEmit` typechecks (core + react + demo)
- [ ] `publint` clean for changed packages (`npx publint packages/<name>`)
- [ ] Demo checked at http://localhost:5199 (for UI/matcher changes — attach screenshot/GIF)
- [ ] READMEs + CHANGELOG updated (if user-facing)

## Notes for reviewer
<!-- Breaking changes, follow-ups, threshold impacts -->
