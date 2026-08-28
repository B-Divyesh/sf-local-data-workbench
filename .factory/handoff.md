# Local Data Workbench v0.1.0 — handoff

## What was built

- Tauri 2 desktop application with a Rust local-processing core and a Vite/TypeScript interface.
- Local CSV, JSON, JSON Lines/NDJSON, and Parquet inspection with a 100-row preview, bounded 100,000-row profile counters, inferred types, nulls, distinct counts, ranges, row counts, and source fingerprints.
- Named, ordered recipe steps for filters, derived text columns, renames, column selection, and keyed local joins. Steps can be reordered or removed by keyboard-accessible controls.
- Portable `local-data-workbench/recipe@1` JSON save/reopen flow, source relocation prompt, and fingerprint-change warning.
- Atomic full-file CSV and JSON Lines exports. Partial output is removed after failure and the chosen destination is replaced only after success.
- $29 one-time Sociobot license flow: hosted buy link, return-token capture, paste-to-restore, daily verification cache, optimistic offline unlock, and quiet invalid/revoked handling. Core CSV inspection/transforms/export and three recipe saves remain free.
- Responsive monochrome broadsheet visual system, original generated hero art, custom app icon, designed empty/loading/error/offline states, keyboard shortcuts, focus states, and reduced-motion behavior.
- OS-aware static landing site, privacy and terms pages, service-worker shell cache, checksum-verifying shell/PowerShell installers, third-party notices, and GitHub Actions matrix for macOS arm64/x64, Windows, and Linux.

## Run and verify

```sh
npm ci
npm test
npm run test:e2e
npm run build
npm run tauri build -- --bundles appimage,deb
```

Static deployment root: `dist/site` (contains `index.html`). Desktop web assets: `dist/app`.

Verified locally on 2026-08-28:

- `npm test`: 3 TypeScript tests and 3 Rust engine tests passed.
- `npm run test:e2e`: 4/4 Playwright flows passed (desktop Chromium and 390 px mobile); zero serious/critical axe violations.
- `npm run build`: passed. Site JS 2.48 KB / CSS 8.42 KB; app JS 21.50 KB / CSS 10.87 KB, all uncompressed.
- `cargo check`: passed with the full Tauri feature set.
- Native Linux release build: passed; AppImage 76 MB and Debian package 5.1 MB.
- Lighthouse mobile against the production build: Performance 100, Accessibility 100, Best Practices 100, SEO 100; LCP 1.1 s, total blocking time 0 ms, CLS 0.
- `npm audit --audit-level=high`: 0 vulnerabilities.
- Hero variants: 16 KB mobile, 38 KB medium, 112 KB desktop WebP.

## Release packaging

`.github/workflows/release.yml` runs on `v*` tags and manual dispatch. It uses Tauri's action to build four jobs (macOS arm64, macOS x64, Windows x64, Linux x64), attaches artifacts with `softprops/action-gh-release`, then publishes `SHA256SUMS` and a valid `latest.json`. The site and one-line installers consume that manifest.

## Known boundaries

- Standard JSON arrays are capped at 256 MB because serde must materialize the root array; JSON Lines is the supported streaming form for larger JSON data.
- Join reference files are CSV/JSON/JSONL and capped at 200,000 rows. Parquet is supported as a primary source but not yet as the right-hand join source.
- Profiling samples at most 100,000 rows; counts are explicitly marked estimated when sampled or capped.
- The desktop release has no auto-updater and therefore ships no updater manifest.

## Needs operator action

- The v0.1.0 workflow publishes unsigned preview builds. For production signing/notarization, configure `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD`, and `APPLE_TEAM_ID`; for Windows Authenticode configure `WINDOWS_CERT_PFX` and `WINDOWS_CERT_PASSWORD`, then add the corresponding import/sign steps to the workflow.
- Register the production paid product for slug `local-data-workbench` in the Sociobot billing engine and set its return URL before announcing sales. No opaque product ID is hardcoded.
- Submit later package metadata to Homebrew/winget only if those channels are desired; the release already provides direct installers and verified one-line installation.
