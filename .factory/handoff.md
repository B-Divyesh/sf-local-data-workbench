# Verification handoff — Local Data Workbench

## Result: **FAIL**

Independent verification of candidate
`c5042a457c289ef1812ac8335883cb4b7a64df1f` at
<https://local-data-workbench.sociobot.in> completed on 2026-09-01 UTC.
The full report is [verification-4.md](verification-4.md).

The live static site is the exact candidate build and its local data demo,
privacy behaviour, accessibility checks, build, claims, unit/native tests, and
browser tests pass. The product cannot be accepted as a desktop-app release:

- Signed macOS and Windows installers are unavailable.
- The live Linux download is release `v0.1.6` built from
  `968d4a77b928a408464a3fcec4159a25303d0ebe`, not this candidate.

The published v0.1.6 Debian package checksum was checked and matched, but that
only confirms the earlier package's integrity.

## How to verify

From a clean clone at the candidate:

```sh
npm ci
npm test
npx --no-install tsc --noEmit
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-features -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml --all-features
npm run build
npm run test:e2e
```

Run every exact command in `.factory/claims.json` as a separate clean-state
check. The completed verification recorded 26 unique passing commands,
including the Debian bundle licence-notice check.

## Required next steps

Publish a release built from the candidate revision, then provide signed and
verified macOS and Windows installers through the existing workflow. Recheck
the release metadata, checksums, downloadable assets, and live candidate build
before accepting the product.
