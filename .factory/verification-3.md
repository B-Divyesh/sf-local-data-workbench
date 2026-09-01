# Independent verification 3 — FAIL

- Candidate: `7d03b77dd55094f793b91fd6fb3cbb7684f551ff`
- Live URL: <https://local-data-workbench.sociobot.in>
- Verified: 2026-09-01 UTC
- Work order: `local-data-workbench-verify-3`
- Decision: **FAIL — do not release this candidate**

The repaired data paths, one-click demo, site deployment, and declared claim
commands all check out. The candidate does not meet the desktop-app acceptance
contract: its desktop releases remain unsigned; the published desktop release
does not identify this candidate; the live landing page has an Axe serious
finding; and several public promises do not have registered claim tests.

## Release-blocking findings

### Critical — required signed desktop app is not available

The researched brief calls for a signed desktop app. The landing page says
“Current builds are unsigned previews”; the release workflow and handoff also
state that macOS and Windows signing credentials are still needed. Honest
disclosure is present, but it does not satisfy the signed-app requirement.

### High — published desktop installers are not candidate-identified

The live static site identifies itself as `0.1.2 ·
7d03b77dd55094f793b91fd6fb3cbb7684f551ff` on Home, Demo, Privacy, and
Terms. The public desktop release is tag `v0.1.2`, which resolves to
`a0eb5877027843db3c86e36001898099d1674862`, not the verified candidate.
The release workflow supplies `VITE_BUILD_ID: ${{ github.sha }}`, so that
release cannot show the candidate revision. The site downloads those older
release artifacts. The static deployment is byte-for-byte equal to the
candidate build, but the desktop release provenance does not match it.

### High — Axe reports a serious landing-page keyboard finding

Fresh Playwright Axe scans on both desktop and 390 px returned
`scrollable-region-focusable` (serious). The affected elements are the
scrollable Windows and Linux installer command blocks:

```html
<code>irm https://local-data-workbench.sociobot.in/install.ps1 | iex</code>
<code>curl -fsSL https://local-data-workbench.sociobot.in/install.sh | sh</code>
```

They have neither focusable content nor a focusable container. This contradicts
the required Axe serious/critical gate. Lighthouse's aggregate accessibility
score does not replace the direct Axe result.

### High — the claim registry is incomplete for visible promises

`.factory/claims.json` contains 18 entries and every listed command passes,
but the landing page, browser app, privacy page, and terms contain additional
reliance claims without corresponding entries/tests. Examples include:

- “The app does not include analytics, account sync, or content logging.”
- “A paid license check sends its token, not a filename or file content.”
- “No upload, telemetry, filename collection, or content logging.”
- the free-tier promise to save three recipes and reopen them;
- “File contents, names, profiles, recipes, and outputs stay on your
  computer.”

The existing `local-only-demo` test records only the separate sample-page flow;
it does not establish the installed/browser-app privacy promises. The claims
contract requires each public claim to be listed and observed in its sandbox.

## Other findings

### Medium — header touch targets are below the 44 × 44 CSS-pixel requirement

At 390 px, the Home wordmark measured `102.1 × 43` CSS pixels and the **Demo**
link measured `40.3 × 44`. Both are interactive controls; each falls below
the required 44-pixel minimum in one dimension. The selected download and
toolbar controls covered by the narrower `touch-targets` claim do pass.

### Medium — `SHA256SUMS` cannot pass a standard complete verification

The published `SHA256SUMS` lists a hash for `SHA256SUMS` itself. In a release
directory containing the manifest and all assets, `sha256sum -c SHA256SUMS`
will always report that entry as mismatched because the manifest's contents
include the entry. The downloaded Debian asset itself matched its listed hash:

```text
2a1ac3ce4e89267db10bc69871da9f9bd5abbbf269b9e87433030ef1daaef7af
```

The selected-asset installer verification is therefore intact, but the release
checksum manifest does not satisfy a complete manifest verification.

## Mandatory claims gate — PASS

This was the first product test activity after `npm ci` in a detached clean
checkout at the candidate. Every exact command declared in
`.factory/claims.json` passed. Browser claims ran on both desktop Chromium and
the 390 px project. The bundle-notices command provisioned its documented
Linux dependencies, built a Debian bundle, and checked `LICENSE`,
`THIRD_PARTY_NOTICES.md`, and `Apache-2.0.txt`.

| Claims | Result |
| --- | --- |
| sample demo/export/local-only/offline | PASS |
| native CSV/JSON/JSON Lines/Parquet/profile/export | PASS |
| named transforms, joins, portable recipes | PASS |
| free/paid limits, demo exit, touch checks | PASS |
| installer checksums, bundle notices, build identity | PASS |

The native regressions specifically passed for numeric `2, 10, 100` bounds,
typed Parquet `keep` / missing / `drop` values, a keyed join, and a 101-row
complete-file export.

## First read and end-to-end evidence

**First read: PASS.** Cold loading the live desktop and 390 px pages answers
the required questions in plain words: it says “Inspect local data files,”
names analysts and engineers reshaping CSV/JSON/Parquet files, and provides a
visible **Try it with sample data** action. The 390 px CTA is fully visible
(`209.6 × 48` CSS pixels) in the first viewport.

The live one-click demo passed independently: it displayed the persistent
“Demo — sample data, nothing is saved” banner, filtered to the three shipped
orders, exported the expected four-line CSV (header plus orders 1001, 1003,
and 1005), and reset to five rows. The local browser-app exercise:

- showed a clear invalid-JSON error and then recovered with **Load sample
  project**;
- showed correct sample decimal bounds of `61.00` through `241.25`;
- rejected `banana` as a numeric comparison value with a clear correction;
- had no ordinary-load console or page errors.

## Clean-checkout quality gates

| Check | Result |
| --- | --- |
| `npm ci` | PASS — 66 packages, 0 vulnerabilities |
| all 18 exact claim commands | PASS |
| `npm test` | PASS — 5 Vitest tests, 7 Rust tests |
| `npm run test:e2e` | PASS — 22/22 across desktop and 390 px |
| `npx --no-install tsc --noEmit` | PASS |
| `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` | PASS |
| Clippy no-default and all-features (`-D warnings`) | PASS |
| Rust tests with all features | PASS — 7 tests |
| `npm run build` | PASS — produced `dist/app` and `dist/site` |
| `CI=true npm run test:bundle-notices` | PASS — Debian bundle built |

No standalone lint script is declared. The initial site JS is 0.71 + 2.49 KiB
uncompressed (demo adds 1.40 KiB), CSS is 11.42 KiB, the mobile hero is 16.17
KiB, and the app JS/CSS are 23.37/11.37 KiB; these meet the stated transfer
budgets. A fresh Lighthouse mobile artifact reported Performance 98,
Accessibility 100, Best Practices 100, SEO 100, FCP 1.2 s, LCP 1.2 s, TBT
160 ms, CLS 0. It emitted a post-run browser-tab crash message after producing
the report; the direct Axe result above remains the accessibility decision.

## Deployment, privacy, accessibility, and caching

- The complete `dist/site/assets` set was byte-for-byte equal to the live
  assets, and live build footers carry the candidate revision.
- The live demo request log contained only its HTML, same-origin JS, and
  same-origin CSS. The landing page additionally made the documented GitHub
  Releases API request to resolve downloads. No analytics, file name, or sample
  content request was observed.
- The landing and populated demo both reloaded offline after service-worker
  activation with HTTP 200 and no page/console error.
- Response headers include HSTS, `nosniff`, strict-origin referrer policy,
  restrictive permissions policy, and CSP with `connect-src 'self'
  https://api.github.com`. Hashed assets are immutable for one year, HTML is
  revalidated after 30 seconds, and `sw.js` is `no-cache`.
- Keyboard starts with the visible skip link (3 px oxblood focus outline).
  There was no horizontal overflow at 390 px; reduced-motion inspection found
  no active animations. The direct Axe serious finding and target-size finding
  remain.
- Home, Demo, Privacy, Terms, 404, robots, and sitemap returned their expected
  responses. The product has no owned backend, account, or sign-in flow. No
  documented server-side allowance applies. External billing endpoints were
  not contacted because they are outside this product's permitted resource
  boundary.

## Required before another verification

1. Produce signed macOS and Windows desktop releases, then publish a desktop
   release built from and displaying `7d03b77…` (or verify a newly supplied
   candidate and its tag together).
2. Make both installer command regions keyboard-focusable or remove their
   horizontal scroll requirement; rerun Axe at desktop and 390 px.
3. Add sandbox tests and claim entries for every public privacy, local-only,
   license-data, and free-tier capacity promise; tag the native claim tests in
   the registry's required form as well.
4. Make every interactive target at least 44 × 44 CSS pixels, including the
   wordmark and Demo navigation link at 390 px.
5. Generate `SHA256SUMS` without an unverifiable self-entry and confirm a
   complete manifest check passes.
