# Local Data Workbench v0.1.1 — repair handoff

## Release status

Repair candidate is buildable and ready to publish from this commit. It repairs every verifier finding from `f42737df23030a172421689ee19ba8e9a6dac9e9` against candidate `7bf2102ab66094a88a090496753198f8cfd191d8`.

## What changed

- Added `.factory/claims.json` with observable, executable coverage for the demo, demo privacy, offline reload, complete native export, and packaged license notices.
- Added `/demo/`: an isolated five-order monthly-orders sandbox with a persistent banner, reset, start-for-real link, filter, and CSV export. `.factory/demo.md` documents the namespace and reset behavior.
- Added **Load sample project** to the desktop first-run screen. The bundled sample is separate from real source data and has a persistent demo banner.
- Rewrote the first screen around the job and intended users: analysts and engineers inspect local data files and can try the sample first.
- Reproduced the exact 101-row browser preview failure. Browser UI now says its bounded preview export is limited; the Rust regression proves native export includes rows 100 and 101.
- Added 44 px navigation/license controls, removed the invisible file-input tab stop, and made the horizontally scrolling demo table keyboard-focusable.
- Added CSP response headers, social/canonical metadata, apple touch icon, sitemap demo entry, a styled 404 response, consistent footer identity/build ID, and `.factory/copy-audit.md`.
- Removed the false “signed manifest” wording. Preview packages are plainly marked unsigned until signing certificates are available.
- Bundled `LICENSE`, `THIRD_PARTY_NOTICES.md`, `LICENSES/Apache-2.0.txt`, and the sample resource into desktop installers. The Debian package check observed all four paths.
- Added immutable `VITE_BUILD_ID` workflow provenance. Release notes record the Git commit and app/site builds display that ID.

## Run and verify

```sh
npm ci
npm test
npx tsc --noEmit
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features -- -D warnings
npm run test:e2e
npm run build
CI=true npm run test:bundle-notices
```

Verified in this repair container on 2026-08-30:

- `npm ci`: passed, 0 audit vulnerabilities.
- `npm test`: 3 Vitest + 4 Rust tests passed.
- `npx tsc --noEmit`, Rust fmt, and full-feature clippy: passed.
- `npm run test:e2e`: 10/10 desktop Chromium and 390 px tests passed, including Playwright Axe serious/critical checks, keyboard control sizing, demo export, request privacy, offline reload, and the exact preview-export regression.
- `npm run build`: passed; `dist/app` and `dist/site` include the demo and `404.html`. Initial app JS is 8.14 KB gzip; site JS is 1.21 KB gzip.
- `CI=true npm run test:bundle-notices`: passed. Debian package `Local Data Workbench_0.1.1_amd64.deb` contains the application MIT license, third-party notice, Apache notice, and bundled sample.
- `/opt/fleet/lib/verify-url.sh http://127.0.0.1:4173/ <evidence-dir>`: passed, 735 ms local load, zero page/console errors, title/lang/one h1/main/alt/button checks all passed.

The standalone `@axe-core/cli` could not start because its Selenium Chrome binary is absent in this image. The pinned Playwright Axe integration ran against desktop and 390 px pages instead and passed.

## Deployment and release

Deploy `dist/site` using the static work-order configuration after this commit is pushed. Tag the accepted commit `v0.1.1`; `.github/workflows/release.yml` builds macOS, Windows, and Linux artifacts, attaches checksums and `latest.json`, and embeds the tagged commit ID as the build identity.

## Needs operator action

The researched brief calls for signed desktop releases. This repair removes any contradictory signed-package claim, but cannot create certificates. Before a signed production release, provide `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`, `WINDOWS_CERT_PFX`, and `WINDOWS_CERT_PASSWORD`, then enable signing/notarization in the release workflow. Until then, published builds remain explicitly unsigned previews.
