# Independent verification 7 — FAIL

Candidate: `04915d4900e2a951aeb17afbb946763232f77c1b`

Live URL: <https://local-data-workbench.sociobot.in/>

Date: 2026-09-02

## Verdict

**FAIL.** The live static site is byte-for-byte the requested candidate, but
the mandatory `release-candidate-provenance` claim fails. The published
`v0.1.10` release identifies older commit
`4c205328041f2a5bd721c0bb87934e5262c20c2c`, while the page and its installers
require `04915d4900e2a951aeb17afbb946763232f77c1b`. All platform links are
therefore disabled and the live shell installer refuses to install anything.
This candidate is not an installable desktop product.

The core engine also rejects JSON arrays above 256 MB, which does not meet the
brief's multi-GB JSON job. The web site's broad offline promise is incomplete:
after a cold visit to the landing page, the pre-cached demo opens offline
without its JavaScript, shows zero rows, and logs a module MIME error.

## First-read gate

**PASS.** A cold 1440×900 visit answers all three required questions in plain
words:

- What: “Inspect local data files.”
- For whom: analysts and engineers reshaping CSV, JSON, or Parquet files.
- First action: **Try it with sample data**, beside “Opens an isolated sample
  project.”

The action is visible without scrolling and opens `/demo/` in one keyboard- or
pointer-activated step. The demo immediately shows five monthly orders and the
persistent “Demo — sample data, nothing is saved” banner with **Reset demo**
and **Start for real**.

## Release-blocking findings

### P0 — mandatory release-provenance claim fails; no candidate installer is available

- From a clean detached checkout, `npm run test:release-live` exits 1 with
  `Error: Release notes do not identify this checkout.` This is one of the 25
  mandatory `.factory/claims.json` commands; the work order makes any failure
  release-blocking.
- The live footer reports `0.1.10 ·
  04915d4900e2a951aeb17afbb946763232f77c1b`.
- GitHub's latest release is `v0.1.10`, but its release notes and `latest.json`
  report source commit `4c205328041f2a5bd721c0bb87934e5262c20c2c`.
  The tag predates the candidate.
- The live page consequently renders **Downloads are being published**, has
  no primary download `href`, hides all macOS, Windows, and Linux package
  links, hides the installer command, and says “Release metadata did not match
  this page. Installer links stay disabled.”
- Running the live `install.sh` with its destination confined to a temporary
  directory exits 1 with “Release identity mismatch … Nothing was downloaded
  or installed.” No install directory is created.
- A clean candidate build produced 20 public files. Every file matched its
  live counterpart byte-for-byte by SHA-256, and the live build marker is the
  full candidate revision. This is not a stale-site false positive; the release
  artifact is the stale side of the mismatch.
- The old release is internally coherent: its 5,407,224-byte Debian package
  hashes to `c500640d76f5c554fcb4887de2113c36bbeade0639eed991ec858007255739c9`,
  matches `SHA256SUMS`, reports version 0.1.10/amd64, and contains the MIT,
  third-party, and Apache-2.0 notices. It is still not an artifact of this
  candidate.

### P1 — the core multi-GB JSON use case is rejected at 256 MB

The researched user needs to inspect a multi-GB CSV, JSON, or Parquet file.
`src-tauri/src/engine.rs` checks JSON-array metadata and rejects anything above
`256 * 1024 * 1024` bytes with “JSON arrays are limited to 256 MB.” For accepted
JSON arrays it deserializes the full value into a `Vec`, rather than streaming
the bounded preview. JSON Lines is streamed, but requiring conversion is the
workaround the brief intended the product to replace. The `local-formats`
claim uses small fixtures and does not cover the promised size boundary.

### P1 — “Works offline after the first visit” does not include the sample demo

In a fresh live browser context I visited `/`, awaited the activated service
worker, confirmed cache `local-data-workbench-site-v3`, then went offline and
opened `/demo/`. The demo HTML loaded, but it showed zero sample rows and the
browser logged:

```text
Failed to load module script: Expected a JavaScript-or-Wasm module script but
the server responded with a MIME type of "text/html".
```

`sw.js` pre-caches `/demo/` but not its hashed demo module. Its catch handler
also returns `/` HTML for a missing script request, causing the MIME failure.
The existing `offline-reload` claim only reloads the landing page, which does
work offline. It does not prove the broader landing statement or the demo
sandbox requirement that offline claims remain demonstrable in the demo.

## Other findings

### P2 — desktop-app skip link is below the 44 px target baseline

At 390×844, focusing **Skip to data preview** in the browser-hosted desktop UI
produces a 176.08×42 CSS-pixel box. Its 3 px oxblood focus outline is clearly
visible and activation works, but the target is 2 px below the attached
accessibility baseline. The `touch-targets` claim passes because it measures
site skip links and only the desktop app's add-step control, not the app skip
link.

### P2 — researched one-time purchase is not implemented

The researched brief specifies one-time monetization. This candidate instead
makes all tools free and has no checkout, license storage, restore-purchase
field, or verification call. This is honest and creates no paid-feature dead
end, but it remains a documented scope deviation from the acceptance brief.

## Mandatory claims gate

The 25 commands in `.factory/claims.json` were invoked exactly after `npm ci`
from a clean detached worktree at the candidate. Result: **24 passed, 1
failed**.

| Claim | Result | Direct evidence |
| --- | --- | --- |
| `sample-demo` | PASS | 2/2 Playwright cases; one-click demo and persistent banner |
| `sample-export` | PASS | 2/2; three shipped rows and exact downloaded CSV |
| `local-only-demo` | PASS | 2/2; demo requests remained same-origin |
| `offline-reload` | PASS, narrow | 2/2; landing reloads offline; demo gap documented above |
| `local-formats` | PASS, narrow | Rust fixtures open/profile CSV, JSON, JSONL, and Parquet; large JSON gap above |
| `numeric-profile-bounds` | PASS | Rust reports numeric 2…100 rather than lexical bounds |
| `parquet-profile-filter-export` | PASS | Rust Parquet string/null/filter/export fixture |
| `named-transformations` | PASS | Vitest filter/derive/rename/select pipeline |
| `local-joins` | PASS | Rust named-key join fixture with unmatched blanks |
| `portable-recipes` | PASS | Vitest serialization, source identity, reopen, ordered replay |
| `desktop-complete-export` | PASS | Rust 101-row fixture exports rows beyond the 100-row preview |
| `free-saved-recipes` | PASS | 2/2; repeat save keeps one isolated record |
| `unlimited-saved-recipes` | PASS | 2/2; fourth distinct recipe has no paid dead end |
| `included-desktop-tools` | PASS | 2/2; JSONL export and local-join chooser have no license gate |
| `demo-exit-discard` | PASS | 2/2; all `demo:` keys removed on exit |
| `touch-targets` | PASS, incomplete | Selected controls pass; app skip-link omission above |
| `installer-command-access` | PASS | 2/2; labelled, keyboard-focusable command region; Axe clean |
| `installer-checksums` | PASS | Both scripts contain platform checksum verification |
| `release-manifest-integrity` | PASS | Fixture manifest verifies every listed asset |
| `release-candidate-provenance` | **FAIL** | Live release notes identify `4c2053…`, not candidate `04915d…` |
| `package-signing-disclosure` | PASS | 2/2 against matching mocked unsigned metadata |
| `local-workbench-privacy` | PASS | 2/2; selected fixture/content never leaves app origin |
| `landing-network-privacy` | PASS | 2/2; only same-origin plus GitHub release API |
| `bundled-license-notices` | PASS | Clean Debian build contains all three notice files |
| `build-identity` | PASS | 2/2; built site/app show version and full revision |

## Clean checkout, tests, and production build

A detached worktree at the exact candidate was created at
`/tmp/ldw-verify7-clean`. It was clean before and after the following commands;
no product source was modified.

```text
PASS npm ci
PASS npm test
     Vitest: 11 passed; Rust: 7 passed
PASS npx --no-install tsc --noEmit
PASS cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
PASS cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features -- -D warnings
PASS npm run build
     dist/app and dist/site produced
PASS npm run test:e2e
     36/36 across desktop Chromium and mobile-390
PASS CI=true npm run test:bundle-notices
FAIL npm run test:release-live
```

Production output is within budget:

- Site initial JavaScript: 5.48 kB raw total; CSS: 12.72 kB raw.
- Desktop UI JavaScript: 20.38 kB raw / 7.30 kB gzip; CSS: 11.37 kB raw.
- Mobile hero: 16,170 bytes; largest hero: 113,728 bytes.
- Lighthouse transferred 30 KiB on the live mobile audit.

## End-to-end product exercise

- Live demo: opened five realistic monthly orders, filtered to the three
  shipped rows, downloaded `monthly-orders-filtered.csv` with the exact header
  and rows, announced the result, and reset to five rows.
- Browser workbench: opened quoted CSV with an embedded comma and newline plus
  a missing cell; showed three rows and numeric bounds 2…100. Malformed JSON
  produced a specific error and recovery action. A following valid file opened
  successfully.
- Invalid transform: numeric comparison `abc` was rejected with “comparison
  value must be a number.” Replacing it with `9` closed the dialog, added the
  named step, and returned two rows.
- Existing native tests exercised CSV, JSON, JSON Lines, Parquet, null handling,
  named joins, numeric profiles, ordered transforms, and complete export beyond
  the preview. The candidate's release binary remained running under Xvfb for
  the eight-second smoke interval; only expected headless DRI warnings appeared.
- Demo storage isolation, repeat saves, four distinct saves, JSON Lines export,
  and demo discard all passed in both Playwright projects.

## Live accessibility, privacy, routing, and performance

- `/`, `/demo/`, `/privacy/`, and `/terms/` return 200. The designed unknown
  route returns 404. All pages have `lang=en`, one h1, one main landmark,
  route-specific titles, image alt text, and zero page-level horizontal
  overflow at 1440×900 and 390×844.
- `/opt/fleet/lib/verify-url.sh` passed with a 778 ms network-idle load, no
  console errors, title, language, one h1, main, alt text, and labelled buttons.
- Playwright Axe found zero serious/critical findings on every live route at
  both widths and on the app's sample, dialog, and error states. The app dialog
  focuses its close button, Escape closes it, and focus returns to **Add recipe
  step**.
- Keyboard traversal starts at the skip link and reaches navigation and the
  sample action in order. Every sampled target has a visible 3 px
  `rgb(141, 33, 30)` outline. Enter opens `/demo/`; demo controls are reachable.
- All visible live controls measured at least 44×44 CSS pixels at 390 px. The
  separate desktop-app skip-link exception is documented above. Mobile and
  desktop layouts have no page-level overflow. Reduced motion leaves only
  0.00001-second transitions/animations on the site and none in the app.
- Axe reports no contrast failure. The explicit single warm-paper theme matches
  `.factory/design.md`; no third-party fonts or scripts load.
- Cold landing requests are same-origin assets plus the documented GitHub
  release API. Demo and selected-file filter/export requests are same-origin;
  filenames and fixture content do not appear in any request. There are no
  analytics, account, checkout, license, or AI calls.
- Browser-observed headers include HSTS, `nosniff`, strict-origin referrer
  policy, camera/microphone/geolocation denial, and a CSP limited to self plus
  the GitHub release API with `frame-ancestors 'none'`. HTML caches for 30
  seconds, hashed assets for one year immutable, and `sw.js` uses `no-cache`.
- Lighthouse 12.8.2 mobile scores: performance 100, accessibility 100, best
  practices 100, SEO 100. FCP 1.3 s, LCP 1.3 s, total blocking time 20 ms, CLS
  0, maximum potential input delay 90 ms. Lab INP is unavailable.
- All crawled same-origin and GitHub links returned 200; `mailto:` and in-page
  anchors were excluded. `robots.txt`, `sitemap.xml`, metadata, social image,
  favicon, privacy, terms, MIT license, and README are present.

There is no product backend, sign-in, or server-side unlock endpoint. Rate
limit, concurrency, persistence, health/build-identity API, and Entra checks are
therefore not applicable. The browser has only in-memory demo state; native
file processing is local.

## Required next steps

1. Publish a new version tag from the exact accepted candidate (bumping the
   application version if necessary), wait for all Linux/macOS/Windows assets,
   `latest.json`, and `SHA256SUMS`, then deploy a site build stamped with that
   same revision. Re-run `npm run test:release-live` before release.
2. Stream JSON arrays or provide an equally direct bounded-memory path that
   handles the brief's multi-GB JSON files; add a size-boundary claim test.
3. Pre-cache the demo's hashed JavaScript (and other required shell assets),
   avoid serving `/` HTML as fallback for module requests, and extend the
   offline claim to open and use the demo from a fresh landing-only cache.
4. Raise the desktop-app skip link to at least 44 CSS pixels and include it in
   the touch-target claim test.
5. Either implement the researched one-time Sociobot purchase path or record
   an explicit product decision to remain free.
