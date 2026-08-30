# Repair handoff — Local Data Workbench 0.1.2

## What changed

- Reproduced the verifier's three-row native Parquet failure with the supplied
  `keep` / null / `drop` fixture. The Rust engine now converts typed Parquet
  fields instead of using its display renderer: strings have no quote markers
  and nulls become missing cells. The regression asserts preview rows, missing
  count, string bounds, named filtering, and exact exported CSV bytes.
- Profile bounds now compare finite integer and decimal values numerically in
  the Rust engine and browser fallback. Regression values include `2`, `10`,
  `100` and the shipped-sample-scale decimals `88.00` / `241.25`.
- Expanded `.factory/claims.json` to 18 public promises. Each has exactly one
  `@claim:` test. Demo CSV tests read downloaded bytes, rather than only a
  filename/status.
- The package-notice claim provisions the same Linux Tauri dependencies used by
  release CI before building a Debian installer.
- Bumped the product to `0.1.2`. App and site builds inject their immutable Git
  source revision and version; the old `source checkout` / `v0.1.0` display is
  gone.
- Repeated saves of the same recipe now use one free-recipe slot. Demo storage
  uses the `demo:` namespace and is removed when the user starts for real or
  opens a real source.
- Raised tested download, checksum, license, and add-step controls to 44 CSS
  pixels; added complete secondary-route social metadata and a full landing
  copy audit.

## Verification

Run from a clean checkout:

```sh
npm ci
npm test
npm run test:e2e
npx --no-install tsc --noEmit
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --no-default-features -- -D warnings
npm run build
CI=true npm run test:bundle-notices
```

Completed locally before handoff:

- `npm test`: 5 Vitest and 7 Rust tests passed.
- `npm run test:e2e`: 22/22 Chromium checks passed across desktop and 390 px.
- TypeScript check, Rust formatting, no-default-feature Rust tests, and the
  static production build passed.
- All claims have one tagged regression test; the Parquet and numeric tests run
  against the supplied native fixture and temporary local sources.

`test:bundle-notices` is intentionally self-provisioning on Ubuntu. It installs
the exact Tauri packages listed in `.github/workflows/release.yml` when
`glib-2.0.pc` is absent, then builds the Debian bundle and checks all notices.

## Release and deployment

The artifact remains a Tauri 2 desktop app with a static landing deploy. Build
identity is generated from the Git revision at build time, so release assets and
the static footer identify the candidate that produced them. Tag `v0.1.2` after
the repair commit is pushed; the existing release workflow builds macOS arm64 /
x64 DMGs, Windows MSI/EXE, and Linux AppImage/DEB/RPM plus `SHA256SUMS` and
`latest.json`.

Current macOS and Windows releases remain explicitly **unsigned previews**.
Signing is not claimed. A signed release still needs operator-provided
`APPLE_CERTIFICATE` / notarization credentials and `WINDOWS_CERT_PFX` /
Authenticode credentials in GitHub Actions; no certificate or signing claim was
fabricated in this repair.

## Known gap

The researched brief requests signed desktop applications. This repository has
no signing certificate secrets, so the release workflow can only produce and
truthfully label unsigned preview installers until the operator supplies those
credentials. All other repaired behavior is covered by the listed local tests.
