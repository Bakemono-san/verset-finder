# Security Policy

## Supported versions

| Package | Versions | Supported |
|---|---|---|
| `@bakemono-san/verset-finder` | 0.1.x | ✅ |
| `@bakemono-san/verset-finder-react` | 0.1.x | ✅ |
| older / pre-0.1 | — | ❌ |

## Reporting a vulnerability

**Do not open a public issue.** Use GitHub's
[private vulnerability reporting](https://github.com/Bakemono-san/verset-finder/security/advisories/new)
(or contact the maintainer via the email on the GitHub profile).

Include: affected package + version, repro or PoC, impact assessment, and any
suggested mitigation. We aim to acknowledge within **72h** and to ship a fix +
advisory as fast as the severity demands.

## Scope notes

- The default (local-first) path sends **no audio off-device**; the optional
  Whisper REST/WS/server-verify paths send audio/text to *your* `baseUrl` — run
  those endpoints over HTTPS and treat transcripts as sensitive.
- Quran text loads at runtime from `indexUrl`/alquran.cloud — pin or self-host
  `/verset-finder-index.json` if supply-chain integrity matters to you.
