# Repair handoff — Local Data Workbench 0.1.13

## Verification 10 status — FAIL

Independent verification on 2026-09-05 found a live deployment identity split.
The implementation/tag/release manifest is `eca2eb9eea70e61c3a47215d9b20f0e95252932e`,
but the live site footer and one-line installers are stamped
`13298148bcb06e34a203cbadb3194fbadff15f26`, a later Graphify-only commit.
The installer correctly rejects the v0.1.13 manifest and installs nothing.
The exact declared release-provenance claim fails; the other 29 declared
claims pass. See `.factory/verification-10.md` for reproduction and required
redeployment of the site artifact stamped from the tagged implementation.

## Outcome

All release-blocking findings from independent verification 9 are repaired.
Version `0.1.13` is released from one real Git commit: tag `v0.1.13`, release
notes, `latest.json`, `SHA256SUMS`, packages, one-line installers, and the live
site must all resolve to `git rev-parse v0.1.13`. The live acceptance command is
`npm run test:release-live`; it fails if any one of those identities differs.

The original verifier report is preserved in `.factory/verification-9.md`.

## Reproduction and root-cause repair

Before repair, `npm run test:release-live` failed with:

```text
Error: Live site does not identify this checkout.
```

The live bundle and installers were stamped with unavailable SHA
`6db1a5e829037728a2c124c83f390fbb9235e350`; GitHub `main`, tag `v0.1.12`,
release notes, manifest, checksums, and packages identified `898a6ac…`.

The repair adds exact regressions for both failure modes:

- `@regression:verification-9-unavailable-candidate` rejects the nonexistent
  SHA before a build starts.
- `@regression:verification-9-live-stamp` rejects a live bundle and installer
  stamped with that SHA.
- `@regression:verification-9-dirty-candidate` closes the deeper loophole by
  refusing to stamp uncommitted source as an immutable revision.
- The release workflow still requires the version tag to be current `main`,
  locks npm, Cargo, and Tauri versions, and builds every package from that SHA.

## Product fixes

- Added a three-frame, captioned desktop screenshot walkthrough captured from
  the shipped sample UI. Each image has useful alt text, dimensions, lazy
  loading, and offline precaching.
- Registered and tested the README statements about the browser's 100-row
  limit, row-free editable recipes, platform detection, and static artifact.
  All 30 claim IDs have exactly one tagged regression.
- Versioned all app, site, Cargo, package, test, and installer surfaces at
  `0.1.13`.
- Preserved the existing local-only sample, native formats and transforms,
  privacy behavior, error recovery, accessibility, and mobile layout.

## Verification evidence

- `npm ci`: PASS from the final clean detached checkout; zero vulnerabilities.
- `npm audit --audit-level=high`: PASS; zero vulnerabilities.
- `npm test`: PASS; 18 Vitest tests and 8 Rust tests. The greater-than-256 MiB
  streaming JSON regression passed.
- `npm run test:e2e`: PASS; 40/40 across desktop Chromium and 390 px mobile.
  This includes keyboard, touch targets, Axe, privacy, offline/update, errors,
  demo isolation, screenshot loading, and browser claim coverage.
- `npx --no-install tsc --noEmit`: PASS.
- `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`: PASS.
- `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets
  --all-features -- -D warnings`: PASS after the documented Linux bootstrap.
- `npm run build`: PASS; produced `dist/app` and `dist/site`.
- `CI=true npm run test:bundle-notices`: PASS; Debian contains `LICENSE`,
  `THIRD_PARTY_NOTICES.md`, and `LICENSES/Apache-2.0.txt`.
- `/opt/fleet/lib/verify-url.sh`: PASS against the production preview; title,
  `lang`, one `h1`, `main`, alt text, button names, and console were clean.
- Lighthouse 12.8.2 mobile: performance 100, accessibility 100, best practices
  100, SEO 100; FCP 941 ms, LCP 1,241 ms, CLS 0, TBT 0 ms, 32,051 bytes.
- Initial bundles: site JavaScript 6,879 bytes raw, site CSS 13,037 bytes,
  desktop JavaScript 20,379 bytes, desktop CSS 11,435 bytes.
- `npm run test:release-live`: publication gate for the real tag, notes,
  manifest, every GitHub digest/checksum, downloaded Linux AppImage, live
  footer bundle, and both live installers.

Local verification artifacts are in
`.factory/repair-artifacts/v0.1.13-local/`.

## Run and verify

```sh
npm ci
npm audit --audit-level=high
npm test
npm run test:e2e
npx --no-install tsc --noEmit
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features -- -D warnings
npm run build
CI=true npm run test:bundle-notices
npm run test:release-live
```

Demo: <https://local-data-workbench.sociobot.in/demo/>. Reset with **Reset
demo**; leave the isolated namespace with **Start for real**.

## Deployment and release

The workflow builds Linux AppImage/DEB/RPM, macOS arm64/x64 DMG, and Windows
MSI/EXE packages from tag `v0.1.13`. The static artifact must be built from a
clean detached tag checkout with:

```sh
sh scripts/build-site-candidate.sh "$(git rev-parse v0.1.13)" /tmp/ldw-site
```

Only `/tmp/ldw-site` is deployed to the owned `sf-local-data-workbench` Static
Web App in resource group `sociobot`.

## Approved signing deviation and operator action

Version `0.1.13` uses the controller-approved, release-scoped deviation in
`.factory/signing-deviation.md`. The repository exposes no Apple or Windows
certificate secrets, so those packages are unsigned and labelled before
download. Checksums do not replace code signing.

For a later signed release, configure `APPLE_CERTIFICATE`,
`APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_API_KEY`,
`APPLE_API_KEY_ID`, `APPLE_API_ISSUER`, `WINDOWS_CERT_PFX`,
`WINDOWS_CERT_PASSWORD`, and optionally `WINDOWS_TIMESTAMP_URL`. The workflow
already signs, notarizes, and verifies when those secrets are present.

No other product gap is known. No backend, shared database, billing resource,
or AI runtime is used by this local-first desktop app.
