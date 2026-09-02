# Independent verification handoff — Local Data Workbench 0.1.10

## Outcome

**FAIL** for candidate `04915d4900e2a951aeb17afbb946763232f77c1b` at
<https://local-data-workbench.sociobot.in/> (verified 2026-09-02).

The live static deployment matches the candidate byte-for-byte, and the
first-read/demo, normal tests, static checks, build, accessibility scans,
privacy checks, and performance budgets pass. Release acceptance still fails:
the required `release-candidate-provenance` claim exits 1 because published
`v0.1.10` identifies older commit `4c205328041f2a5bd721c0bb87934e5262c20c2c`.
The site disables every package link, and its live shell installer safely
refuses the mismatched release. There is no downloadable desktop artifact for
the candidate.

Full evidence and all 25 claim results are in
[`.factory/verification-7.md`](verification-7.md).

## Blocking and material defects

1. **P0:** candidate/release provenance mismatch; no candidate installer can be
   downloaded. Publish a new version from the exact accepted revision and
   redeploy the equally stamped site.
2. **P1:** native JSON arrays above 256 MB are rejected and accepted arrays are
   fully materialized, contrary to the researched multi-GB JSON job.
3. **P1:** after only a cold landing visit, `/demo/` fails offline with zero
   rows and a JavaScript MIME error because its hashed module is not pre-cached.
4. **P2:** the focused desktop-app skip link is 42 px high, below the 44 px
   accessibility baseline.
5. **P2:** the researched one-time purchase is not implemented; the product is
   honestly free instead.

## Verification summary

From clean detached checkout `/tmp/ldw-verify7-clean` at the candidate:

```text
PASS npm ci
PASS npm test                         11 Vitest + 7 Rust
PASS npx --no-install tsc --noEmit
PASS cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
PASS cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features -- -D warnings
PASS npm run build                    dist/app + dist/site
PASS npm run test:e2e                 36/36 desktop + mobile
PASS CI=true npm run test:bundle-notices
FAIL npm run test:release-live        release notes identify older commit
```

Mandatory claims: **24 passed, 1 failed**. The first-read gate passed. Live Axe
found zero serious/critical issues on all routes at desktop and 390 px, and
`verify-url.sh` passed. Lighthouse mobile scored 100 in performance,
accessibility, best practices, and SEO (LCP 1.3 s, TBT 20 ms, CLS 0; 30 KiB
transfer). Security and cache headers are present. Live requests are same-origin
plus the disclosed GitHub release API; demo/file flows send no data cross-origin.

## How to reproduce

```sh
npm ci
npm test
npx --no-install tsc --noEmit
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features -- -D warnings
npm run build
npm run test:e2e
CI=true npm run test:bundle-notices
npm run test:release-live
```

The first eight commands pass; the final command fails on the published
release's source revision.

## Operator action

Publish a new immutable release from the accepted revision and redeploy the
matching static build. Apple and Windows signing remain unavailable and must
continue to be disclosed unless the documented certificate secrets are added.
Then address the large-JSON and offline-demo defects and repeat independent QA.

No product code was changed during verification.
