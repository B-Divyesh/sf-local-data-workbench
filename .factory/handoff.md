# Repair handoff — Local Data Workbench 0.1.9

## What changed

This repair resolves the verifier's release-provenance failure. The release
workflow now resolves the release tag to one immutable commit before any build
starts, checks out that exact revision for Linux, macOS, and Windows, injects
that commit into every application build, and verifies the tag again before
uploading assets.

The landing page now enables installers only when GitHub release metadata has:

- the exact `v0.1.9` version and the exact page build commit in `Source commit`;
- a SHA-256 digest for every platform package, `latest.json`, and `SHA256SUMS`;
- all Linux, macOS arm64/x64, and Windows package entries.

If a release is stale, incomplete, or does not match the page revision, every
installer link remains disabled. The regression test reproduces the former
failure with a stale release commit.

macOS and Windows packages are now built on every release. When the operator
has not supplied signing credentials they remain downloadable, explicitly say
“unsigned,” and are never described as signed. The one-line installers verify
SHA-256 and print the same unsigned warning before opening or running those
packages. Paid access remains paused until signed macOS and Windows releases
are available.

## Verification completed locally

From a clean `npm ci` installation:

```sh
npm test
npx --no-install tsc --noEmit
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-features -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml --all-features
npm run build
npm run test:e2e
CI=true npm run test:bundle-notices
```

All commands passed. The browser suite ran 36 checks across desktop Chromium
and the 390 px project. It includes the stale-release regression, offline
reload, keyboard focus, direct Playwright Axe checks, demo isolation, local
request privacy, and package-signing disclosure. The optimized Debian bundle
was built and checked for `LICENSE`, `THIRD_PARTY_NOTICES.md`, and
`LICENSES/Apache-2.0.txt`.

`/opt/fleet/lib/verify-url.sh` passed against the production static build on a
local preview: HTTP 200, title, `lang=en`, one H1, main landmark, image alt
text, labelled buttons, and no page or console errors. The standalone Axe CLI
could not start because its system ChromeDriver supports Chrome 152 while the
provided Playwright Chromium is 145; the equivalent in-suite Axe scans passed
at both required viewports.

`actionlint` accepted `.github/workflows/release.yml`. The static build is
within budget: application JavaScript is 7.51 kB gzip, landing JavaScript is
1.91 kB gzip, and landing CSS is 3.31 kB gzip.

## Release and deployment procedure

`v0.1.7` is retained as an unsuccessful audit tag: its macOS jobs exposed that
empty Apple signing variables still trigger Tauri's certificate import.
`v0.1.8` is retained as a metadata audit tag: GitHub normalized the macOS
filenames from spaces to dots while its manifest still contained the old
names. This candidate normalizes every downloaded release asset before it
calculates `SHA256SUMS` or `latest.json`; a flat-artifact regression test
reproduces that exact upload path. Tag `v0.1.9` at this handoff commit and
push the commit and tag. The GitHub
workflow builds the packages from the tagged commit, checks every published
binary against `SHA256SUMS`, and writes the same commit to `latest.json` and
release notes. Verify the release through the GitHub API: the `Source commit`
line must equal the tag commit, every listed asset must have a GitHub
`sha256:` digest, and downloading `SHA256SUMS` followed by
`sha256sum -c SHA256SUMS` must succeed.

Deploy `dist/site` only after that release succeeds. Its footer build ID must
equal the source commit in the release notes; otherwise the page deliberately
keeps download links disabled.

## Operator action

Signed macOS releases require `APPLE_CERTIFICATE`,
`APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_API_KEY`,
`APPLE_API_KEY_ID`, and `APPLE_API_ISSUER`. Signed Windows releases require
`WINDOWS_CERT_PFX` and `WINDOWS_CERT_PASSWORD` (plus optional
`WINDOWS_TIMESTAMP_URL`). These credentials were not read or assumed by this
repair. Without them, the workflow publishes honest unsigned macOS and Windows
artifacts and the release metadata says so.

## Known gap

The original researched brief calls for signed desktop installers. The product
can build and disclose unsigned macOS and Windows packages now, but the owner
must add the listed certificates for a signed/notarized release. No signing
claim is made until the workflow's platform verification step has passed.
