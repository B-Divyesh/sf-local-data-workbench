# Independent verification 8 — FAIL

Candidate: `ca99711ec6ac723f97f86a5a7f663d4e233e7450`  
Live URL: <https://local-data-workbench.sociobot.in/>  
Verified: 2026-09-02

## Verdict

**FAIL.** The required `release-candidate-provenance` claim fails from a clean,
detached candidate checkout. The live site is a valid, usable static shell, but
the latest published desktop release is `v0.1.11` built from
`4267e98fe7427dd0b62a32ea0d922b74778b46af`, not this candidate. The candidate
has not been released as immutable installable desktop artifacts, so it does
not meet the desktop-app acceptance contract.

## First-read gate — PASS

A cold live visit, at desktop and 390 px, plainly answers the three required
questions without scrolling:

- **What:** “Inspect local data files.”
- **For whom:** “For analysts and engineers who need to reshape CSV, JSON, or
  Parquet files without writing a one-off script.”
- **First action:** the visible **Try it with sample data** action, with
  “Opens an isolated sample project.”

One activation opens `/demo/`, which immediately shows the working monthly
orders sample and the persistent “Demo — sample data, nothing is saved” banner
with **Reset demo** and **Start for real**.

## Release-blocking defect

### P0 — the published release is not the requested candidate

`npm run test:release-live` exited 1 from `/tmp/local-data-workbench-verify-8`
after a clean `npm ci` and checkout of `ca99711…`:

```text
Error: Release notes do not identify this checkout.
```

Fresh GitHub API evidence:

- Latest release: `v0.1.11`, published `2026-09-02T03:59:29Z`.
- Its release notes state `Source commit:
  4267e98fe7427dd0b62a32ea0d922b74778b46af`.
- `refs/tags/v0.1.11` resolves to `c522398024cd349882f7e9cd7530d5c7d4c436ff`.
- `main` and the checked-out candidate resolve to
  `ca99711ec6ac723f97f86a5a7f663d4e233e7450`.

The live landing page fetches that release metadata and, correctly, avoids
offering it as a matching candidate download. This is a release-blocking claim
failure, not a browser or network false positive.

## Mandatory claims gate

All 26 entries in `.factory/claims.json` were invoked using their declared test
commands from the clean checkout. Browser claim coverage was run as the full
`npm run test:e2e -- --grep '@claim:'` suite (28 cases: desktop Chromium and
390 px), which passed. The individual native and unit selectors also passed.

| Claims | Result | Evidence |
| --- | --- | --- |
| `sample-demo`, `sample-export`, `local-only-demo`, `offline-reload` | PASS | Playwright claim suite passed; emitted Vite site used for the offline demo coverage. |
| `large-json-arrays` | PASS | Native >256 MiB valid JSON-array stream test passed in 22.40 s. |
| `local-formats`, `numeric-profile-bounds`, `parquet-profile-filter-export`, `local-joins`, `desktop-complete-export` | PASS | Each declared Rust selector passed. |
| `named-transformations`, `portable-recipes`, `installer-checksums`, `release-manifest-integrity` | PASS | Each declared Vitest selector passed. |
| `free-saved-recipes`, `unlimited-saved-recipes`, `included-desktop-tools`, `demo-exit-discard` | PASS | Playwright claim suite passed in both browser projects. |
| `touch-targets`, `installer-command-access`, `package-signing-disclosure` | PASS | Playwright claim suite passed in both browser projects. |
| `local-workbench-privacy`, `landing-network-privacy`, `build-identity` | PASS | Playwright claim suite passed in both browser projects. |
| `bundled-license-notices` | PASS | Clean Debian package contains `LICENSE`, `THIRD_PARTY_NOTICES.md`, and `LICENSES/Apache-2.0.txt`. |
| `release-candidate-provenance` | **FAIL** | `npm run test:release-live` reports the release-note source-commit mismatch above. |

The failed provenance claim is sufficient for **FAIL** irrespective of the
remaining package-notice command's result.

## Local quality checks

- `npm ci` — PASS (clean detached checkout).
- `npm test` — PASS: 11 Vitest tests and all 8 Rust tests; the large JSON test
  completed as part of the native suite.
- `npm run build` — PASS; generated `dist/app` and `dist/site`.
- Production bundle sizes — PASS: desktop UI JavaScript 20.38 kB raw / 7.29
  kB gzip; site JavaScript 6.88 kB raw total / 3.23 kB gzip; site CSS 12.72 kB
  raw / 3.45 kB gzip; mobile hero 16,170 bytes.
- `npx --no-install tsc --noEmit`, `cargo fmt --check`, and
  `cargo clippy --all-targets --all-features -- -D warnings` — PASS.
- `CI=true npm run test:bundle-notices` — PASS; its clean Debian package
  contains the MIT application license, third-party notices, and Arrow's
  Apache-2.0 notice.

## End-to-end exercise

- Browser workbench demo loaded `monthly-orders.csv` (five rows), retained its
  isolated demo banner, and exported `result.csv` successfully.
- Invalid numeric filter input `nope` was rejected with “comparison value must
  be a number.” A valid numeric value could then be entered in the same dialog.
- Malformed JSON produced “The browser preview could not read this file” with
  a visible **Choose another file** recovery action.
- The native claim suite covers local CSV, JSON, JSON Lines, Parquet,
  profiling, null values, named joins, ordered recipes, and full export beyond
  the 100-row preview.

## Live deployment, privacy, accessibility, and performance

- Live `/`, `/demo/`, `/privacy/`, and `/terms/` returned HTTP 200. Cold live
  browser checks recorded no console or page errors at 1440 px and 390 px.
- Incoming headers include HSTS, `nosniff`, strict referrer policy,
  Permissions-Policy, and a CSP with `frame-ancestors 'none'`; hashed assets
  are `max-age=31536000, immutable`, while the service worker is `no-cache`.
- Requests on landing were same-origin assets plus the documented GitHub
  release API. Demo navigation added only same-origin assets. No analytics or
  selected-file content was observed leaving the page.
- Axe WCAG 2 A/AA scans found zero serious or critical issues on all four live
  routes at desktop and 390 px. Keyboard Tab begins with the skip link and
  reaches navigation and the demo action with a visible 3 px focus outline.
  Reduced-motion emulation yields `animation: none` and a 0.00001-second
  transition fallback.
- The 390 px layout had the primary action fully visible and 350 px wide; the
  cold first screen satisfies the plain-language and one-click-demo gates.

## Required repair and re-verification

Create and publish a new immutable release whose tag, release notes,
`latest.json`, `SHA256SUMS`, installers, platform packages, and deployed site
all identify `ca99711ec6ac723f97f86a5a7f663d4e233e7450`. Then rerun
`npm run test:release-live` against the live URL before requesting another
verification. Do not make the site point at the current `v0.1.11` release.
