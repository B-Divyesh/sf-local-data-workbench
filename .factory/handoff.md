# Repair handoff — Local Data Workbench 0.1.9

## Released repair

The release-provenance failure in independent verification 4 is repaired and
published.

- Repaired candidate: `d456abfd26315cc15e9c4bcb13c1638243d13557`
- Git tag and release: `v0.1.9`
- Release: <https://github.com/B-Divyesh/sf-local-data-workbench/releases/tag/v0.1.9>
- Live site: <https://local-data-workbench.sociobot.in>
- Static deployment: Azure Static Web Apps deployment
  `df44261d-b73f-488d-9893-6219d8fc435e`

The release workflow resolves the tag to one immutable commit before every
platform build, checks out that commit in each build job, injects it as
`VITE_BUILD_ID`, confirms the tag again before publishing, and builds
`SHA256SUMS` plus `latest.json` from the upload filenames. The landing page
only enables downloads when the GitHub release's source-commit line, version,
checksums, and complete platform set match its own build ID. The regression
test reproduces the former stale-release condition and asserts the page keeps
all downloads disabled.

`v0.1.9` contains Linux RPM/AppImage/DEB, macOS arm64/x64 DMGs, and Windows
MSI/EXE. Its release notes, `latest.json`, and deployed page all name the
same source revision above. GitHub's asset digests match each of the seven
`SHA256SUMS` entries, and every platform item in `latest.json` uses that same
name and SHA-256. A downloaded Debian artifact was verified against the
published manifest:

```text
Local.Data.Workbench_0.1.9_amd64.deb
SHA-256 2384b85261c98755fa3d0e24e8f5f3ba9669b3842cfa236d4b9f349210c7fc5c
```

The published Debian package includes `LICENSE`, `THIRD_PARTY_NOTICES.md`,
`LICENSES/Apache-2.0.txt`, and the bundled sample data.

## Signing status

macOS and Windows packages are published as **unsigned**. Release metadata,
release notes, download labels, and one-line installers all say this plainly;
no signing claim is made. The product's paid-license path remains unavailable
until signed macOS and Windows packages are verified.

Signed/notarized macOS releases require `APPLE_CERTIFICATE`,
`APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_API_KEY`,
`APPLE_API_KEY_ID`, and `APPLE_API_ISSUER`. Signed Windows releases require
`WINDOWS_CERT_PFX` and `WINDOWS_CERT_PASSWORD` (and may use
`WINDOWS_TIMESTAMP_URL`). Those operator credentials were not read, created,
or assumed.

## Verification evidence

All checks below ran after a clean `npm ci`:

```sh
npm test
npx --no-install tsc --noEmit
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml --all-features
npm run build
npm run test:e2e
CI=true npm run test:bundle-notices
```

They passed. The browser suite ran 36 checks at desktop and 390 px, including
the two-viewport stale-provenance regression, keyboard focus, direct
Playwright Axe scans, demo isolation, privacy request recording, offline
reload, and unsigned-package disclosure. The Debian consumer-package check
rebuilt the installer and checked the three required license files.

`/opt/fleet/lib/verify-url.sh` passed both against the local production
preview and the public URL. The live result was title
`Local Data Workbench — Inspect local data files`, `lang=en`, one H1, a main
landmark, no missing image alt text, no unlabeled buttons, and no page or
console errors. Direct public Playwright checks at 1366 px and 390 px opened
the isolated demo, found the active `v0.1.9` AppImage link, and reported zero
serious/critical Axe findings. A fresh live browser context also reloaded the
landing page offline with the correct H1 and zero console errors.

The public `index.html` SHA-256 is
`3cc735ad96d1049fa6dafc4633413f1530e27fff2153c0f880ce9adae2ffc2f8` both
locally and after deployment. Its main application bundle SHA-256 is
`b4c1c4096e713caf1ea912ef7d466d6473f3ab13b62f50f629f859ed76c446c8` in
both places, and it contains build ID `d456abf…`. The live CSP limits scripts,
styles, and assets to same-origin and permits only GitHub's API for release
metadata.

## Known gap / next operator action

The researched brief asks for signed desktop installers. The release has
honest unsigned macOS and Windows artifacts because the required operator
certificates are unavailable. Add the listed signing secrets and publish a
new tagged release to meet that stronger requirement; do not relabel this
release as signed.
