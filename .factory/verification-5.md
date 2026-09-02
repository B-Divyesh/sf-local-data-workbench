# Independent verification 5 — FAIL

**Candidate:** `d456abfd26315cc15e9c4bcb13c1638243d13557` (`v0.1.9`)  
**URL checked:** https://local-data-workbench.sociobot.in/  
**Date:** 2026-09-02  
**Verdict:** **FAIL — the live deployment is not the candidate.**

## Release blocker

The candidate and its published release metadata identify
`d456abfd26315cc15e9c4bcb13c1638243d13557`, but a cold Chromium visit to the
live URL reports the footer build identity
`0.1.9 · fbfd730b2b702242ba4012d94a237ba8d55e5604`.

This is not a cosmetic discrepancy. The live page consequently says that the
release does not match the page and keeps downloads unavailable, while GitHub's
published `v0.1.9` `latest.json` correctly identifies `d456…`. The candidate
build with `VITE_BUILD_ID=d456…` produces `assets/main-BF7Afm8a.js` and
`assets/demo-BDBYITes.js`; the live HTML instead references
`main-DkpMe4yK.js` and `demo-DaXu8E2g.js`.

**P0 / release blocking — deploy the exact candidate static output with
`VITE_BUILD_ID=d456abfd26315cc15e9c4bcb13c1638243d13557`, then verify the live
footer and enabled release state before re-submission.**

## First-read test

PASS for the currently deployed page's clarity. Cold first screen reads:

- **Does:** “Inspect local data files.”
- **For whom:** “For analysts and engineers who need to reshape CSV, JSON, or
  Parquet files without writing a one-off script.”
- **First action:** visible **Try it with sample data**, with “Opens an isolated
  sample project.” alongside it.

The one-click demo exists at `/demo/`. This does not override the deployment
mismatch above.

## Clean candidate checks

In a clean detached worktree at the requested SHA, `npm ci --include=dev`
installed the pinned `@playwright/test@1.58.2`, `@tauri-apps/cli@2.11.4`, and
Vitest dependencies. The following all passed:

```text
npm test                              # 8 Vitest + 7 Rust tests
npx tsc --noEmit
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
npm run build                         # dist/app and dist/site
```

`npm run build` produced a 7.51 kB gzip app JS bundle, 1.91 kB gzip landing JS,
and 3.31 kB gzip landing CSS. The largest mobile hero is 16,170 bytes WebP;
the largest shipped image is 113,728 bytes.

### Every required claim test

All **26/26** entries in `.factory/claims.json` were invoked exactly as their
`test` command specifies and passed. That includes:

- sample/demo entry, export, same-origin sample privacy, and offline reload;
- CSV, JSON, JSON Lines, and Parquet profiling; numeric range bounds; Parquet
  null/filter/export; local join; and complete export beyond 100 preview rows;
- named transformations, portable recipes, free-recipe capacity, paid-feature
  withholding, demo exit isolation, touch targets, keyboard installer access;
- installer checksums, release-manifest integrity/provenance, unsigned-package
  disclosure, no premature paid access, browser-workbench/landing privacy,
  native bundle license notices, and build identity.

`CI=true npm run test:bundle-notices` built
`Local Data Workbench_0.1.9_amd64.deb` from the clean candidate and passed its
LICENSE, third-party notice, and Apache-2.0 notice inspection.

### Independent product exercise

- Live `/demo/`, on desktop and 390 px: filtered five monthly orders to the
  three shipped orders, downloaded `monthly-orders-filtered.csv`, verified its
  header and three expected records, then reset to five rows. The demo used no
  localStorage or sessionStorage and issued only same-origin requests.
- Browser workbench: malformed `broken.json` showed “The browser preview could
  not read this file” with the parser detail and a next step. A 101-row CSV
  recovered correctly, displayed 100 rows, and stated that browser export is
  limited to the preview and the desktop app exports the complete file.
- Native claims exercised the complete-file 101-row export, all required
  local formats, profiles, recipe replay, and named-key join.

## Live quality, privacy, and security evidence

Cold desktop and 390 px Playwright visits had no console errors or page errors.
They found `<html lang="en">`, the expected title, exactly one h1, one main
landmark, meaningful hero alt text, skip link, labels, and visible 3 px focus.
Keyboard-only operation changed the demo filter and applied it. Reduced-motion
mode has no running animation and limits transition duration to `.01ms`.

Playwright Axe (`wcag2a,wcag2aa`) reported **zero serious or critical findings
(zero violations total)** at both viewports. Mobile Lighthouse recorded
performance **0.99**, accessibility **1.00**, FCP **1.0 s**, LCP **1.1 s**,
CLS **0**, TBT **100 ms**, and interactive **1.2 s**. Lighthouse emitted a
post-audit `TARGET_CRASHED` screenshot warning, but retained these completed
scores; direct Playwright checks remained error-free.

Landing request log contained only the site document/assets plus the disclosed
GitHub release API request:

```text
https://api.github.com/repos/B-Divyesh/sf-local-data-workbench/releases/latest
```

Demo flow contained only same-origin document, CSS, and JS requests. There are
no product server-side endpoints, sign-in flow, checkout call, or license
verification call to rate-limit; paid access is intentionally withheld.

Responses include HSTS, `nosniff`, strict-origin referrer policy, a CSP with
`frame-ancestors 'none'`, permissions policy, and the required
`connect-src 'self' https://api.github.com`. Hashed assets are
`public, max-age=31536000, immutable`; `sw.js` is `no-cache`.

The live PWA registered `/sw.js`, used cache `local-data-workbench-site-v2`,
accepted `registration.update()`, and reloaded `/` successfully after setting
the browser context offline.

## Release artifact check

GitHub release `v0.1.9` is tagged at the candidate SHA. `latest.json` contains
that same commit and all expected Linux, macOS arm64/x64, and Windows entries.
Downloaded `Local.Data.Workbench_0.1.9_amd64.deb` passed:

```text
Local.Data.Workbench_0.1.9_amd64.deb: OK
```

against the published `SHA256SUMS`. macOS and Windows are explicitly marked
unsigned, as expected.

## Required next action

Deploy the candidate site output rather than the current `fbfd730…` build.
Then rerun the live build-identity and release-state checks. No product-code
defect was found in the candidate's local test/build evidence, but the exact
live-candidate identity requirement makes this verification a **FAIL**.
