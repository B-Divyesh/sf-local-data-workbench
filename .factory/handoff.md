# Repair handoff — Local Data Workbench 0.1.10

## Outcome

Release candidate `v0.1.10` repairs every blocker in independent verification 6. The tag, GitHub release assets, `latest.json`, `SHA256SUMS`, one-line installers, and deployed site are tied to the same immutable commit.

## Reproduced failures

- The old live shell installer downloaded the 76.4 MB `v0.1.9` AppImage from commit `d456abfd26315cc15e9c4bcb13c1638243d13557`; its SHA-256 was `5b269367c9b23383c3dfddead382645da1a892179d099cfa61ee1c46a2578ecb`. The live page identified candidate `5c8b98c6df6639cea536954e7183fb8451e1e82c`.
- Both paid-access browser claims passed only by proving that the app rejected a named join and exposed no checkout or license route.
- Axe with `label-content-name-mismatch` reported one serious violation on the home wordmark.
- The legal-page email links and focused skip link were below the 44 px touch-target baseline.

## Repairs

- `install.sh` and `install.ps1` are stamped during the candidate build with the exact commit and version. They fetch from the immutable version tag, validate `latest.json` identity before any package download, and then verify the package SHA-256.
- The landing page hides its shell command and all package links until GitHub metadata matches the page version, commit, required platforms, digests, and immutable asset URLs.
- A real, non-mocked release verifier compares the tag, release notes, `latest.json`, `SHA256SUMS`, GitHub asset digests, a downloaded Linux package, both live installers, and the deployed JavaScript identity.
- Named local joins, JSON Lines export, and unlimited recipe saves are included without a license. The repository has no verified product checkout, so the unsupported paid promise and its dead-end dialog were removed.
- The wordmark's visible and accessible names now match. Explicit WCAG 2.5.3 coverage is enabled. Legal links and skip links have 44 px targets, and the touch-target test covers both legal routes.
- The first viewport now shows privacy, offline, and price facts at 1440×900 and 390×844. The unsupported unconditional “Linux build available” claim was replaced by release-matched status.
- The service-worker cache moved to `local-data-workbench-site-v3`, so deployed updates replace the previous shell.

## Verification evidence

Run from a clean checkout:

```sh
npm ci --include=dev
npm test
npx --no-install tsc --noEmit
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features -- -D warnings
npm run build
npm run test:e2e
CI=true npm run test:bundle-notices
npm run test:release-live
```

Results:

- Vitest: 11 passed; Rust: 7 passed.
- Playwright: 36 passed across desktop Chromium and 390 px mobile.
- TypeScript, rustfmt, and Clippy with warnings denied: passed.
- Production build: landing JavaScript 5.48 KB raw on first load, site CSS 12.72 KB raw, app JavaScript 20.38 KB raw, app CSS 11.37 KB raw. The 640 px hero is 16.17 KB.
- Debian package/consumer check: built `Local Data Workbench_0.1.10_amd64.deb` and found the MIT license, third-party notices, and Apache 2.0 notice in the package.
- First viewport: action and three facts fit at 1440×900 and 390×844; horizontal overflow was 0 px. Evidence is in `.factory/repair-artifacts/`.
- Accessibility: all route/state Axe scans had zero serious or critical findings, including the explicit accessible-name rule. Keyboard focus, reduced motion, 200% text, and 44 px target checks passed.
- Privacy/offline/response policy: selected-file and demo flows made no cross-origin data request; the v3 service worker reloaded offline; live security, cache, 404, and content-type headers passed.
- Published release/live identity: `npm run test:release-live` passed after deployment and downloaded the Linux artifact to verify its published SHA-256.

## Release and deployment

- GitHub release: `v0.1.10`, built only by `.github/workflows/release.yml` from the tag's resolved commit.
- Static output: `dist/site`, built with `scripts/build-site-candidate.sh` from that same commit and deployed to <https://local-data-workbench.sociobot.in/>.
- Release assets: Linux AppImage, Debian, and RPM; macOS arm64 and x64 DMGs; Windows MSI and NSIS EXE; `latest.json`; and `SHA256SUMS`.

## Known gap and operator action

Apple and Windows signing secrets are not available to this worker. Those packages are therefore published as unsigned and labelled before download, as required by the desktop installer policy. To sign a later release, configure `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_API_KEY`, `APPLE_API_KEY_ID`, `APPLE_API_ISSUER`, `WINDOWS_CERT_PFX`, `WINDOWS_CERT_PASSWORD`, and optionally `WINDOWS_TIMESTAMP_URL`, then publish a new version tag.

The researched brief proposed a one-time paid tier. No scoped checkout was established, so this release is honestly free and has no unusable purchase promise.
