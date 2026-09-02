# Verification handoff — Local Data Workbench — FAIL

## Outcome

**FAIL** for candidate `5c8b98c6df6639cea536954e7183fb8451e1e82c`
at <https://local-data-workbench.sociobot.in/> on 2026-09-02.

The previous static deployment mismatch is fixed: a guarded candidate build
was compared with production and all 20 servable files matched byte-for-byte.
The live footer also shows the full candidate revision.

Release acceptance still fails. The latest `v0.1.9` tag, release notes, and
`latest.json` identify `d456abfd26315cc15e9c4bcb13c1638243d13557`.
Production disables all candidate package links, but its visible shell
installer still installs that older AppImage. A confined installer run proved
the stale artifact hash is
`5b269367c9b23383c3dfddead382645da1a892179d099cfa61ee1c46a2578ecb`.
macOS and Windows release metadata also says both packages are unsigned.

The brief's required named join is not usable. The UI always starts locked,
rejects a join with “Paid access is unavailable,” and provides no checkout,
license restore, or verification path. The Rust engine test passes, but the
real product cannot complete that required job.

An explicit Axe WCAG 2.5.3 scan also reports one serious
`label-content-name-mismatch` on the home wordmark. Privacy/terms email links
are only about 20 px high, below the 44 px baseline. See
`.factory/verification-6.md` for full evidence and required fixes.

## What passed

- First-read gate and one-click isolated sample demo.
- All 26 exact `.factory/claims.json` commands after clean dependency install.
- Detached clean-checkout gates: `npm test`, TypeScript, rustfmt, Clippy with
  warnings denied, `npm run build`, and all 36 Playwright tests.
- Real Debian notice bundle build and old-release Debian checksum inspection.
- Normal/boundary/invalid/recovery transforms and exact CSV/recipe downloads.
- Desktop/390 px rendering, default Axe, keyboard, visible focus, reduced
  motion, 200% text, privacy request logs, security/cache headers, and offline
  service-worker reload.
- Lighthouse mobile: 100 performance/accessibility/best-practices/SEO, LCP
  1.4 s, TBT 0 ms, CLS 0, total transfer 30 KiB.

## Reproduce

```sh
npm ci --include=dev
npm test
npx --no-install tsc --noEmit
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features -- -D warnings
npm run build
npm run test:e2e
CI=true npm run test:bundle-notices
sh scripts/build-site-candidate.sh 5c8b98c6df6639cea536954e7183fb8451e1e82c /tmp/local-data-workbench-site
```

The verifier modified no product code. Pre-existing generated `graphify-out`
worktree changes were preserved and excluded from the verification commit.

## Operator and builder actions

1. Make named joins reachable through a real free or paid path.
2. Create a candidate-matching release and provide the Apple/Windows signing
   material required by the brief.
3. Prevent `install.sh`/`install.ps1` from installing a stale release when the
   site rejects that release's source commit.
4. Fix the serious wordmark accessible-name mismatch and undersized links.
