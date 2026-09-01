# Independent verification 4 — FAIL

- Candidate: `c5042a457c289ef1812ac8335883cb4b7a64df1f`
- Live URL: <https://local-data-workbench.sociobot.in>
- Verified: 2026-09-01 UTC
- Work order: `local-data-workbench-verify-4`
- Decision: **FAIL — the published desktop application does not meet the candidate provenance or signed-installer requirements.**

## Release findings

### Critical — signed macOS and Windows desktop installers are unavailable

The researched brief requires a signed desktop app. The current release
contains Linux RPM, AppImage, and DEB files only. GitHub Release `v0.1.6` and
its `latest.json` both record `signing.macos=false` and
`signing.windows=false`; the live page therefore withholds those download
links. This is honest product behaviour, but it does not satisfy the required
signed desktop availability for the product.

### High — the downloadable desktop application is not built from the verified candidate

The live static site is correctly built from this candidate: its footer reads
`0.1.6 · c5042a457c289ef1812ac8335883cb4b7a64df1f`, and the locally built
`dist/site/index.html` plus every deployed asset had the same SHA-256 as the
live response. The download link, however, points to `v0.1.6`, whose tag,
release notes, and `latest.json` identify
`968d4a77b928a408464a3fcec4159a25303d0ebe`. A customer who follows the
live Linux download therefore receives an earlier application build, not the
candidate application.

### Medium — live performance measurement varied in this container

Two Lighthouse mobile checks using the installed Playwright Chromium produced
Performance 93 then 100, with Accessibility, Best Practices, and SEO all 100.
The first measured FCP/LCP/TBT/CLS of 1.8 s / 2.6 s / 190 ms / 0; the repeat
measured 1.2 s / 1.2 s / 70 ms / 0. Both runs produced the report after a
post-audit browser-tab crash message. The repeat is within the stated budget;
the variation should be checked again in release CI or a stable browser host.

## Mandatory claims gate — PASS

The clean detached clone ran all 26 unique exact commands listed in
`.factory/claims.json` in a fail-fast sequence and recorded `PASS`. This
includes the demo browser checks, native CSV/JSON/JSON Lines/Parquet checks,
recipe and join checks, installer and release metadata checks, privacy checks,
offline reload, touch targets, access controls, build identity, and the Debian
bundle licence-notice check.

## First read and live product exercise — PASS

A cold desktop and 390 px visit answered the required first-screen questions
in plain words: **Inspect local data files**; it names analysts and engineers
working with CSV, JSON, and Parquet; and **Try it with sample data** visibly
opens an isolated sample project. The live demo showed its persistent
“Demo — sample data, nothing is saved” notice. In both viewport sizes it
filtered to three shipped orders and downloaded
`monthly-orders-filtered.csv`.

The candidate's local browser workbench was also covered by the complete test
suite and native tests: it checks numeric bounds, invalid input feedback,
recipe steps, preview bounds, full native export, local joins, and portable
recipe replay. The native claim checks passed for CSV, JSON, JSON Lines, and
Parquet, including typed missing values and a 101-row full-file export.

## Clean-checkout quality checks — PASS

| Check | Result |
| --- | --- |
| `npm ci` | PASS — 66 packages, 0 reported dependency vulnerabilities |
| Every exact claim command | PASS — 26 unique commands |
| `npm test` | PASS — 8 Vitest tests and 7 Rust tests |
| `npx --no-install tsc --noEmit` | PASS |
| `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` | PASS |
| `cargo clippy --manifest-path src-tauri/Cargo.toml --all-features -- -D warnings` | PASS |
| `cargo test --manifest-path src-tauri/Cargo.toml --all-features` | PASS |
| `npm run build` with candidate build ID | PASS — produced `dist/app` and `dist/site` |
| `npm run test:e2e` | PASS — 34 Playwright checks across desktop and 390 px |
| `CI=true npm run test:bundle-notices` | PASS through its declared claim command |

No separate lint script is declared. The production build reports 7.51 kB gzip
of application JS, 3.34 kB of application CSS, and 1.54 kB gzip for the
landing module (plus 0.78 kB for the demo); these are within the product's
static transfer budgets.

## Privacy, accessibility, deployment, and cache checks — PASS except for the release findings above

- Live desktop and 390 px demo request logs used only the product origin and
  the documented GitHub Releases API. They contained no sample order values
  in request URLs or bodies. There were no console or page errors.
- A fresh service-worker context reloaded the landing page offline with HTTP
  200 and the correct H1. `sw.js` is `no-cache`; hashed assets are immutable
  for one year; HTML is revalidated after 30 seconds.
- Live response headers include HSTS, `nosniff`, strict-origin referrer policy,
  a restrictive permissions policy, and a CSP that permits only the product
  origin plus `https://api.github.com` for release metadata.
- Direct Axe scans of home and demo at desktop and 390 px found no serious or
  critical findings. Keyboard traversal starts at the visible skip link;
  labelled installer-command regions are reachable; 390 px has no horizontal
  overflow; and reduced-motion inspection found no active animations.
- `/`, `/demo/`, `/privacy/`, `/terms/`, `/404.html`, `robots.txt`,
  `sitemap.xml`, and `sw.js` each returned HTTP 200. The provided
  `verify-url.sh` report is in `.factory/verification-artifacts/verify-4/` and
  confirms title, `lang=en`, one H1, a main landmark, image alt text, labelled
  buttons, and no ordinary-load browser errors.
- The downloaded v0.1.6 Debian package SHA-256 was
  `b57e468b6140d5fdf892d08bf015403ab250c9040d2a47628726e592b08fea12`,
  matching its published `SHA256SUMS`. This checks the older release asset;
  it does not resolve the candidate provenance finding.

The product has no owned server-side API, account flow, or sign-in flow, so no
documented request allowance or identity-provider check applies.

## Required follow-up

1. Publish a release built from `c5042a457c289ef1812ac8335883cb4b7a64df1f`
   (or submit a new candidate and verify that exact revision).
2. Provide signed and verified macOS and Windows builds through the existing
   workflow, then publish their checksums and release metadata.
3. Re-run this independent verification against the static page and the new
   candidate-identified desktop assets.
