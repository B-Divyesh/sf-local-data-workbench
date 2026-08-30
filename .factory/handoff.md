# Verification handoff — FAIL

## Decision

**FAIL — do not release candidate `2cb084349a7f98b4660e5bce26ba2dc7c32b0691`.**

Verified on 2026-08-30 against <https://local-data-workbench.sociobot.in>. The live static deployment is healthy and byte-for-byte matches the candidate build, and the cold first-read/one-click sample demo pass. The release is blocked by incorrect core data results and acceptance gaps.

## Release blockers

- Native Parquet strings are returned with literal quotes and nulls as `null`; filtering `status = keep` exported 0 rows instead of 1.
- Numeric profiles compare strings: 2/10/100 reports minimum 10 and maximum 2. The shipped sample visibly reports wrong amount bounds.
- `.factory/claims.json` omits most product promises; its sample-export test never reads the exported CSV.
- The exact package-notice claim initially exited 1 in the clean worker due undeclared/unprovisioned GLib prerequisites; it passed after installing the release workflow's Linux packages.
- Published macOS/Windows builds are unsigned, contrary to the researched brief.
- Release v0.1.1 identifies parent `419c967…`, the live site says `Build source checkout`, and the app footer says v0.1.0 instead of v0.1.1.

Other findings: save actions consume the three-recipe allowance, demo storage is not discarded on exit, multiple targets are under 44×44 px, and the copy audit is incomplete.

## Verification summary

- `npm ci`, audit, `npm test`, full E2E (10/10), typecheck, Rust fmt, all-feature/no-default Clippy, all-feature tests, and `npm run build`: PASS.
- All six declared claims pass after prerequisites, but the clean first bundle-notice invocation failed as noted above.
- Tauri Debian production bundle and packaged notices: PASS after Linux prerequisites.
- Live demo CSV contents, reset, same-origin privacy, service-worker update/offline Home+Demo: PASS.
- Axe serious/critical: zero across live routes, mobile, app states, and modal. Keyboard/focus/reduced motion: PASS except undersized targets.
- Lighthouse mobile: 100 performance/accessibility/best-practices/SEO; LCP 0.93 s, TBT 30 ms, CLS 0.
- Release manifests/checksums/assets and isolated Linux installer: PASS.
- No product-owned backend/sign-in exists. External Sociobot billing rate limits were not contacted because the resource boundary forbids access outside `sf-local-data-workbench`.

Full evidence and reproduction details: [.factory/verification-2.md](verification-2.md). Key screenshots and native fixtures are in `.factory/verification-artifacts/`.

## Re-run

```sh
npm ci
npm test
npm run test:e2e
npx --no-install tsc --noEmit
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features -- -D warnings
npm run build
CI=true npm run test:bundle-notices
```

Before the last command on Ubuntu, install the system packages listed in `.github/workflows/release.yml`.
