# Independent verification 5 — FAIL

Candidate: `d456abfd26315cc15e9c4bcb13c1638243d13557` (`v0.1.9`)  
Live URL: https://local-data-workbench.sociobot.in/  
Date: 2026-09-02

## Verdict: FAIL — candidate deployment mismatch

The live landing page's cold-browser footer reports:

```text
0.1.9 · fbfd730b2b702242ba4012d94a237ba8d55e5604
```

The requested candidate and tagged `v0.1.9` release are
`d456abfd26315cc15e9c4bcb13c1638243d13557`. The release API's `latest.json`
also names `d456…`; the live site therefore correctly reports that the release
does not match this page and keeps downloads unavailable. A production build of
the candidate with `VITE_BUILD_ID=d456…` emits `main-BF7Afm8a.js` and
`demo-BDBYITes.js`, whereas the live page references `main-DkpMe4yK.js` and
`demo-DaXu8E2g.js`.

**P0:** Deploy the exact candidate static output with `VITE_BUILD_ID=d456…`,
then recheck the live footer and enabled download state. This prevents PASS
even though the local candidate is healthy.

## First-read result

PASS: the cold first screen says “Inspect local data files,” names analysts and
engineers reshaping CSV, JSON, or Parquet without a one-off script, and has a
visible one-click **Try it with sample data** action with the explanation
“Opens an isolated sample project.”

## Candidate verification

Clean worktree at the requested SHA; `npm ci --include=dev` installed the
pinned Playwright 1.58.2 and Tauri CLI. All of the following passed:

```text
npm test                                  # 8 Vitest + 7 Rust tests
npx tsc --noEmit
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-features -- -D warnings
npm run build                             # dist/app and dist/site
CI=true npm run test:bundle-notices       # clean Debian installer inspection
```

Every **26/26** `.factory/claims.json` commands passed exactly as declared:
sample demo/export/local-only/offline; local CSV/JSON/JSONL/Parquet profiling,
numeric bounds, Parquet null/filter/export, joins and complete export;
transformations and portable recipes; free/paid/demo boundaries; touch and
installer accessibility; checksums/provenance; privacy; native license notices;
and build identity.

Independent browser exercise confirmed: a malformed JSON file announces the
parser error plus recovery action; a 101-row CSV shows exactly 100 preview rows
and clearly labels browser export as preview-bounded; the live demo filters the
five supplied monthly orders to three shipped orders, exports the expected CSV,
and resets to five rows without storage writes.

## Live quality evidence

- Desktop and 390 px: no console/page errors; title, `lang=en`, one h1, main,
  alt text, skip link, labels, keyboard operation, visible 3 px focus, and
  reduced-motion behavior all passed.
- Playwright Axe (`wcag2a,wcag2aa`) found zero violations at both viewports.
- Mobile Lighthouse: performance 0.99, accessibility 1.00, FCP 1.0 s, LCP
  1.1 s, CLS 0, TBT 100 ms, interactive 1.2 s. Its final screenshot capture
  emitted a `TARGET_CRASHED` warning after audits completed.
- Landing requests were same-origin assets plus only the disclosed GitHub
  release API. Demo requests were same-origin only. No analytics, product API,
  sign-in, checkout, or license-verification endpoint exists while paid access
  is withheld; rate-limit and tenant checks are not applicable.
- Response headers include HSTS, nosniff, strict-origin referrer policy,
  `frame-ancestors 'none'`, permissions policy, and CSP allowing only self plus
  `https://api.github.com`; hashed assets are one-year immutable cached.
- The PWA registered `/sw.js`, applied `registration.update()`, cached its
  shell, and reloaded successfully offline.

## Release artifact

GitHub tag `v0.1.9` resolves to the candidate. Downloaded
`Local.Data.Workbench_0.1.9_amd64.deb` passed the published SHA256SUMS check.
`latest.json` lists Linux, macOS arm64/x64, and Windows assets and marks macOS
and Windows unsigned as disclosed.
