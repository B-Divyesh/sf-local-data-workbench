# Verify local data inspection and reshaping — FAIL

**Verdict: FAIL.** One critical finding remains. The live site is stamped with
the later documentation-only Graphify commit `13298148bcb06e34a203cbadb3194fbadff15f26`,
while release `v0.1.13`, its manifest, checksums, and packages identify the
reviewed implementation commit `eca2eb9eea70e61c3a47215d9b20f0e95252932e`.
The live download UI therefore disables package links and the live Linux
installer refuses to install. There are no untested declared claims.

## Job, audience, and first action

**Job:** inspect and reshape local CSV, JSON, JSON Lines, and Parquet files,
then save a repeatable recipe and export the result.

**Audience:** analysts and engineers who need to work with local data files
without uploading them or writing a one-off script.

**First action:** **Try it with sample data**. On a fresh 1440×900 desktop and
390×844 phone browser, it is visible before scrolling beside “Opens an
isolated sample project.” One click opens five realistic monthly orders and
the persistent **Demo — sample data, nothing is saved** label, **Reset demo**,
and **Start for real** controls.

## Reviewed revisions

| Surface | Revision |
| --- | --- |
| Implementation candidate and `v0.1.13` tag | `eca2eb9eea70e61c3a47215d9b20f0e95252932e` |
| Documentation checkout `main` | `13298148bcb06e34a203cbadb3194fbadff15f26` |
| Live footer and installer scripts | `13298148bcb06e34a203cbadb3194fbadff15f26` |
| `latest.json` and release assets | `eca2eb9eea70e61c3a47215d9b20f0e95252932e` |

`eca2eb9…` is an ancestor of `1329814…`. Their only changed paths are under
`graphify-out/`; the implementation tree outside that report output is
identical. That does not make the live installer usable: its identity check is
correctly strict and rejects the release manifest.

## Finding

### Critical — live release identity split disables desktop installation

The live footer says `0.1.13 · 13298148…`. Live `install.sh` embeds
`EXPECTED_VERSION="v0.1.13"` and `EXPECTED_COMMIT="13298148…"`. The published
`latest.json` instead says `version: v0.1.13` and `commit: eca2eb9…`.

In an empty consumer directory, the documented command exited 1 before any
download or installation:

```text
Release identity mismatch. Expected v0.1.13 from 13298148….
Nothing was downloaded or installed.
```

The live download section also says “Linux packages are being published” and
“Release metadata did not match this page. Installer links stay disabled.”
This makes the public `release-candidate-provenance` claim false and blocks the
desktop product’s normal installation path.

**Required disposition:** redeploy the existing static artifact built from the
tagged implementation commit (for example, the guarded candidate build for
`eca2eb9…`). Do not stamp a release page or installer with a later Graphify or
report-only commit unless a matching release manifest and packages exist.

## Claims from a clean checkout

Created a detached clean worktree at `eca2eb9…`, ran `npm ci`, installed the
documented Tauri Linux prerequisites, then invoked every one of the 30 exact
commands in `.factory/claims.json`. Result: **29 passed, 1 failed, 0
untested**. The command log is `/tmp/ldw-v10-claims.log` in the verification
container.

| Claim | Result | Observable evidence |
| --- | --- | --- |
| sample-demo | PASS | One-click route and persistent sample label. |
| sample-export | PASS | Download contains the three filtered shipped orders. |
| desktop-walkthrough | PASS | Three decoded, captioned desktop frames. |
| local-only-demo | PASS | Demo flow requests only the product origin. |
| offline-reload | PASS | Fresh context reloads landing and filters demo offline. |
| large-json-arrays | PASS | Rust streams the >256 MiB JSON-array fixture. |
| local-formats | PASS | Rust profiles CSV, JSON, JSON Lines, and Parquet. |
| numeric-profile-bounds | PASS | Numeric minimum and maximum regression passes. |
| parquet-profile-filter-export | PASS | Native strings, nulls, filter, and export pass. |
| named-transformations | PASS | Ordered filter, derive, rename, and select pass. |
| local-joins | PASS | Native named-key join passes. |
| portable-recipes | PASS | Row-free editable recipe serializes and replays. |
| desktop-complete-export | PASS | Native export includes rows beyond the preview. |
| browser-preview-limit | PASS | Browser labels the 100-row limit before export. |
| free-saved-recipes | PASS | Re-saving one recipe keeps one record. |
| unlimited-saved-recipes | PASS | Four distinct recipes save without a paywall. |
| included-desktop-tools | PASS | JSON Lines and join chooser have no license wall. |
| demo-exit-discard | PASS | Demo storage is discarded on exit. |
| touch-targets | PASS | Registered desktop and 390px controls are at least 44px. |
| installer-command-access | PASS | Labelled focusable installer region passes Axe. |
| platform-download-detection | PASS | Mocked Linux release resolves to its AppImage. |
| installer-checksums | PASS | Both scripts check identity, unsigned state, and SHA-256. |
| release-manifest-integrity | PASS | Complete checksum fixture verifies. |
| static-deploy-artifact | PASS | Clean candidate site is correctly stamped. |
| release-candidate-provenance | **FAIL** | `npm run test:release-live`: “Live site does not identify this checkout.” |
| package-signing-disclosure | PASS | Unsigned macOS and Windows status stays explicit. |
| local-workbench-privacy | PASS | Browser fixture sends no cross-origin request. |
| landing-network-privacy | PASS | No behavioral analytics request. |
| bundled-license-notices | PASS | Fresh Debian bundle contains app and native notices. |
| build-identity | PASS | Built app and site show version and source revision. |

## Product exercise and recovery

- Sample starts with five orders; filtering `shipped` leaves three. The CSV has
  order IDs 1001, 1003, and 1005. Reset restores five rows.
- Demo localStorage and sessionStorage were empty before and after the flow.
  Its request log contains only document, CSS, and same-origin JavaScript.
- A fresh live service-worker context reloaded `/` offline with HTTP 200,
  opened `/demo/`, and filtered to three rows without console errors.
- The direct released Linux AppImage matched `SHA256SUMS` and remained running
  for a 12-second Xvfb clean-consumer smoke test. This is separate from, and
  does not repair, the broken one-line installer.
- The product has no owned backend, account system, or product API. Tenant
  isolation, SQLite restart persistence, health checks, and 429/Retry-After
  checks are not applicable.

## Live browser, accessibility, privacy, and routes

- Fresh desktop and phone checks found no console or page errors on `/`,
  `/demo/`, `/privacy/`, or `/terms/`. The 404 response deliberately logs its
  failed document request; it has a designed page, a route back, one h1, and
  one main landmark, so this is expected rather than a defect.
- Every inspected route has `lang="en"`, a route-specific title, one h1, one
  main landmark, and no horizontal overflow. Axe found zero serious or critical
  issues at 1440px and 390px. No visible interactive control was below 44px.
- Keyboard traversal begins with the skip link and has a 3px visible focus
  ring. The demo select, filter, and export work with arrows, Tab, and Enter.
  At 200% text size the export control remains visible without horizontal
  overflow. Reduced-motion emulation found zero running animations.
- Response headers include CSP with `frame-ancestors 'none'`, HSTS, nosniff,
  strict referrer policy, and denied camera/microphone/geolocation. Links to
  product, source, release, legal, and mailto targets were checked; deliberate
  404 back-link handling is the only 404.

## Quality checks

- `npm test`: PASS — 18 Vitest and 8 Rust tests.
- `npm run test:e2e`: PASS — 40 Playwright cases.
- `npm run build`: PASS — `dist/app` and `dist/site` produced; initial site JS
  is 4.77 KB raw / 2.05 KB gzip and CSS is 13.04 KB raw / 3.51 KB gzip.
- `npx --no-install tsc --noEmit`, Rust format check, and Clippy with warnings
  denied: PASS.

## Earlier findings

| Earlier issue | Current disposition |
| --- | --- |
| Missing claims and one-click demo | Resolved: 30 registered commands; demo and reset exercised. |
| Parquet/null decoding and numeric ranges | Resolved: native claim regressions pass. |
| License notices and checksum manifest | Resolved: fresh Debian bundle and manifest claim pass. |
| Preview/export wording, recipe cap, join paywall, demo storage | Resolved: bounded browser disclosure and related claims pass. |
| Touch targets, hidden focus, metadata, CSP, 404, and copy audit | Resolved in live checks. |
| Offline demo gap | Resolved: fresh live offline demo filter passes. |
| Screenshot walkthrough | Resolved: three real captioned frames pass. |
| macOS and Windows signing | Accepted, release-scoped deviation is present and download disclosure passes. |
| One-time monetization concern | Current public product explicitly states that all local tools are free and has no checkout; treated as the present product decision, not a hidden paid dead end. |
| Previous candidate/release splits | Regressed: the current live site and installer are again stamped with a non-release Graphify SHA. |

## Final result

**FAIL — 1 critical finding, 0 untested claims.**
