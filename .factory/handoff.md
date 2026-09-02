# Repair handoff — Local Data Workbench 0.1.9

## Outcome

Independent verification 5's only release blocker is repaired: the public
static site now is the exact `d456abfd26315cc15e9c4bcb13c1638243d13557`
candidate built with that value in `VITE_BUILD_ID`.

- Candidate and v0.1.9 release: `d456abfd26315cc15e9c4bcb13c1638243d13557`
- Release: <https://github.com/B-Divyesh/sf-local-data-workbench/releases/tag/v0.1.9>
- Live site: <https://local-data-workbench.sociobot.in>
- Static Web App deployment ID: `18834203-9e83-4f76-8ba4-fa3470c118b0`

The failure was reproduced before deployment. The previous public page loaded
`/assets/main-DkpMe4yK.js`, which embedded
`fbfd730b2b702242ba4012d94a237ba8d55e5604`, while the v0.1.9 GitHub release
declared `d456abf…`. Its safe release check therefore disabled download links.

The deployed isolated candidate worktree emitted the verifier-expected
`main-BF7Afm8a.js` and `demo-BDBYITes.js`. Production now loads
`main-BF7Afm8a.js`; its SHA-256 is
`b4c1c4096e713caf1ea912ef7d466d6473f3ab13b62f50f629f859ed76c446c8` and it
embeds the full candidate revision. The live `index.html` SHA-256 is
`3cc735ad96d1049fa6dafc4633413f1530e27fff2153c0f880ce9adae2ffc2f8`.

In a fresh live browser context the footer reads:

```text
0.1.9 · d456abfd26315cc15e9c4bcb13c1638243d13557
```

Release metadata says `v0.1.9 matches this page’s source commit`, and the
Linux AppImage download is enabled. The release API and page therefore prove
the candidate, release metadata, and deployed site identify one revision.

## Repair implementation

- Added `scripts/build-site-candidate.sh`. It requires a 40-character source
  commit, refuses to build if `HEAD` differs, uses an isolated output
  directory, injects `VITE_BUILD_ID`, and verifies the built JS contains that
  exact revision.
- `vite.site.config.ts` accepts `SITE_OUTPUT_DIR`, allowing a candidate artifact
  to be built outside a potentially stale `dist/site`.
- Added `tests/site-deployment.test.ts` with the
  `@regression:stale-static-deployment` test. It reproduces the root class of
  failure by requesting a different checkout (which must fail), then proves an
  isolated artifact embeds the exact checked-out source revision.
- Documented the guarded candidate build in `README.md`.

To build a future release candidate safely:

```sh
git worktree add --detach /tmp/local-data-workbench-candidate <candidate-sha>
cd /tmp/local-data-workbench-candidate
npm ci --include=dev
sh scripts/build-site-candidate.sh <candidate-sha> /tmp/local-data-workbench-site
```

Deploy only that output directory.

## Verification

After a clean `npm ci --include=dev`, all checks passed:

```sh
npm test                              # 10 Vitest + 7 Rust tests
npx --no-install tsc --noEmit
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features -- -D warnings
npm run build                         # dist/app and dist/site
npm run test:e2e                      # 36/36 desktop + 390 px checks
CI=true npm run test:bundle-notices
```

All 26 commands in `.factory/claims.json` were also invoked exactly as
registered and passed. The bundle inspection found `LICENSE`,
`THIRD_PARTY_NOTICES.md`, and `LICENSES/Apache-2.0.txt` inside the rebuilt
Debian package.

`/opt/fleet/lib/verify-url.sh` passed against the live URL: title, `lang=en`,
one h1, main landmark, alt text, and no console/page errors. Live Playwright
Axe scans found zero `wcag2a`/`wcag2aa` violations at desktop and 390 px. A
fresh live service-worker context updated, reloaded offline, preserved the
h1, and had no console errors. Its only request origins were the product and
the disclosed GitHub release API.

Production response policy was checked: HSTS, `nosniff`, strict-origin
referrer policy, permissions policy, and a CSP limiting content to same-origin
plus `https://api.github.com`, with `frame-ancestors 'none'`.

## Known gap / operator action

macOS and Windows v0.1.9 packages remain honestly labelled **unsigned**. The
brief's signed-installer goal still requires the operator-provided
`APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`,
`APPLE_API_KEY`, `APPLE_API_KEY_ID`, `APPLE_API_ISSUER`, `WINDOWS_CERT_PFX`,
and `WINDOWS_CERT_PASSWORD` secrets. No credentials were read, created, or
assumed during this repair.
