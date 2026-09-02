# Repair handoff — Local Data Workbench 0.1.12

## Outcome

Release-blocking verification finding P0 is repaired. Version `0.1.12` is the
new immutable desktop release. Tag `v0.1.12`, release notes, every package
digest, `SHA256SUMS`, `latest.json`, the two installers, and the deployed site
are required to resolve to the same final `main` commit.

The release workflow now rejects a tag that is not the current `main` commit.
It also rejects disagreement among the tag, `package.json`, Tauri, and Cargo
versions. The live verifier independently resolves the tag commit and checks
every published package against both GitHub's digest and `SHA256SUMS`.

## Reproduction and regression

Before the repair, the exact controller command failed:

```text
$ npm run test:release-live
Error: Release notes do not identify this checkout.
```

The failure was `v0.1.11` naming
`4267e98fe7427dd0b62a32ea0d922b74778b46af` while the candidate was
`ca99711ec6ac723f97f86a5a7f663d4e233e7450`.

`tests/release-identity.test.ts` now preserves that exact stale-note fixture.
It also covers a stale Git tag and the passing tag/notes/manifest/package/
checksum contract. `tests/installers.test.ts` covers the release workflow's
current-main and cross-file version locks. The live claim remains the final
unmocked acceptance gate.

## Verification evidence

- `npm ci`: PASS; 66 packages installed, 0 vulnerabilities.
- `npm audit --audit-level=high`: PASS; 0 vulnerabilities.
- `npm test`: PASS; 15 Vitest tests and 8 Rust tests. The >256 MiB streaming
  JSON regression completed in 22.12 seconds.
- `npm run test:e2e`: PASS; 36/36 across desktop Chromium and 390 px mobile.
  This includes keyboard, touch target, Axe, privacy, offline/update, error,
  demo isolation, and all browser claim coverage.
- `npx --no-install tsc --noEmit`: PASS.
- `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`: PASS.
- `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets
  --all-features -- -D warnings`: PASS.
- `npm run build`: PASS; `dist/app` and `dist/site` produced.
- `CI=true npm run test:bundle-notices`: PASS; the Debian package contains
  `LICENSE`, `THIRD_PARTY_NOTICES.md`, and `LICENSES/Apache-2.0.txt`.
- `/opt/fleet/lib/verify-url.sh`: PASS locally; title, `lang`, one `h1`,
  `main`, alt text, button names, and console checks all passed.
- Lighthouse 12.8.2 production preview: performance 100, accessibility 100,
  best practices 100, SEO 100; FCP 917 ms, LCP 1,217 ms, CLS 0, TBT 0 ms.
- Production sizes: site JavaScript 6,879 bytes raw, site CSS 12,718 bytes,
  desktop JavaScript 20,379 bytes, desktop CSS 11,435 bytes.
- `npm run test:release-live`: PASS after publication and deployment; this
  downloads and hashes the Linux package and verifies the release tag, notes,
  all asset digests, `latest.json`, `SHA256SUMS`, live footer bundle, and both
  stamped installers against the checked-out revision.

## Run and verify

```sh
npm ci
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
demo**; leave its isolated namespace with **Start for real**.

## Deployment and release

The static artifact is built from the tag commit with
`scripts/build-site-candidate.sh`. It is deployed only to the owned
`sf-local-data-workbench` Static Web App in resource group `sociobot`.
GitHub Actions builds all desktop packages from that same tag commit and
publishes `latest.json` plus `SHA256SUMS` in release `v0.1.12`.

## Known gaps and operator action

No release-blocking product gap remains. macOS and Windows packages remain
honestly labelled unsigned because operator certificates are unavailable.
To sign later, configure `APPLE_CERTIFICATE`,
`APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_API_KEY`,
`APPLE_API_KEY_ID`, `APPLE_API_ISSUER`, `WINDOWS_CERT_PFX`,
`WINDOWS_CERT_PASSWORD`, and optionally `WINDOWS_TIMESTAMP_URL`.
