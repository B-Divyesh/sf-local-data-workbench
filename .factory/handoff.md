# Repair handoff — Local Data Workbench 0.1.6

## What was repaired

- Reproduced the independent verifier's exact Axe serious failure before
  changing it: `scrollable-region-focusable` on the macOS/Windows and Linux
  installer command `<code>` blocks, in both desktop and 390 px projects.
  The command containers are now labelled `role="region"` elements with
  `tabindex="0"`. The regression is
  `@regression:installer-command-regions` and the public claim is
  `@claim:installer-command-access`.
- Withheld every macOS and Windows download and all paid-access controls until
  a release has verifiably signed platform assets. The landing page only
  enables those links when the latest GitHub Release says the relevant signing
  verification passed. The app has no checkout, token, or license-verification
  path while this condition is unmet; CSV import, transforms, three recipes,
  reopen, and CSV export remain free.
- Replaced the release workflow with a candidate-bound flow. It confirms that
  the release tag resolves to `GITHUB_SHA`, builds Linux unconditionally, and
  only publishes macOS/Windows artifacts after codesign/notarization/spctl or
  Authenticode/signtool verification succeeds. Its release notes record the
  signing verdict and the manifest records the candidate commit.
- Added a manifest builder which first normalizes GitHub Actions' nested
  `appimage`/`deb`/`rpm` artifact folders, then creates `SHA256SUMS` from a
  temporary file; neither `SHA256SUMS` nor `latest.json` can checksum itself.
  A nested-artifact regression fixture checks `sha256sum -c SHA256SUMS`.
- Registered and tested the privacy, local-only, free-tier, signing-gate,
  release-provenance, installer-accessibility, and paid-withheld statements in
  `.factory/claims.json` (26 claims total). The privacy tests record all
  browser requests and permit only the product origin or the mocked GitHub
  Release metadata request.
- Raised the wordmark and each primary navigation link to a tested 44 × 44 CSS
  pixel target. Added the generated-Rust-output Vite watch exclusion so repeated
  browser claim commands do not exhaust the file-watch limit.

## Verification completed locally

Run from a clean checkout:

```sh
npm ci
npm test
npx --no-install tsc --noEmit
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-features -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml --all-features
npm run build
CI=true npm run test:bundle-notices
npm run test:e2e
```

All 26 exact commands listed in `.factory/claims.json` passed independently,
including `@claim:installer-command-access`,
`@claim:release-manifest-integrity`,
`@claim:release-candidate-provenance`,
`@claim:signed-platform-gating`,
`@claim:paid-access-withheld`,
`@claim:local-workbench-privacy`, and
`@claim:landing-network-privacy`.

The static production build has 1.54 kB gzip JavaScript for the release-aware
landing module and 3.26 kB gzip CSS. `/opt/fleet/lib/verify-url.sh` against the
local production preview reported HTTP 200, no console errors, `lang=en`, one
`h1`, a `main` landmark, and zero missing image alt text or unnamed buttons.
Lighthouse 12.8.2, using Playwright Chromium with full-page screenshot disabled
for this container, scored 100/100 performance, accessibility, best practices,
and SEO. Playwright runs the Axe check on desktop and 390 px views.

## Release and deployment

Candidate `v0.1.6` is commit
`968d4a77b928a408464a3fcec4159a25303d0ebe`. GitHub Actions run
`33556905445` completed successfully. Its release notes record that same
commit and report `macOS signing: unavailable` and `Windows signing:
unavailable`; it published only Linux RPM, AppImage, and DEB assets plus
`SHA256SUMS` and `latest.json`.

The published `latest.json` names candidate `v0.1.6`, the exact commit above,
`signing.macos=false`, `signing.windows=false`, and only `platforms.linux`.
The downloaded `Local.Data.Workbench_0.1.6_amd64.AppImage` passed the SHA-256
from `latest.json`; `SHA256SUMS` contains no `SHA256SUMS` or `latest.json`
self-entry.

`dist/site`, built with that exact commit as `VITE_BUILD_ID`, was deployed to
the scoped Static Web App production environment. Live
`https://local-data-workbench.sociobot.in` verifies HTTP 200 with no browser
console errors and reports `0.1.6 · 968d4a77…`. A fresh mobile browser context
resolves its Linux button to the published v0.1.6 AppImage and keeps macOS and
Windows links hidden.

The old unsigned macOS/Windows `.dmg`, `.msi`, and `.exe` assets and their old
invalid `SHA256SUMS`/`latest.json` files were removed from v0.1.0 through
v0.1.2. Their Linux RPM/AppImage/DEB assets remain available.

## Needs operator action

Signed macOS publishing requires these GitHub Actions secrets:
`APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`,
`APPLE_API_KEY`, `APPLE_API_KEY_ID`, and `APPLE_API_ISSUER`.

Signed Windows publishing requires `WINDOWS_CERT_PFX` and
`WINDOWS_CERT_PASSWORD`; `WINDOWS_TIMESTAMP_URL` is optional. Until those
credentials are present and platform verification passes, the workflow and
landing page deliberately withhold macOS/Windows installers and paid access.
