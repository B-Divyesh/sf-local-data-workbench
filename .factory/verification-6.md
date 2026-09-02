# Independent verification 6 — FAIL

Candidate: `5c8b98c6df6639cea536954e7183fb8451e1e82c`

Live URL: <https://local-data-workbench.sociobot.in/>

Date: 2026-09-02

## Verdict

**FAIL.** The static deployment is now byte-for-byte the requested candidate,
but the product is not a releasable desktop app for that candidate. No release
or installer identifies `5c8b98c…`; the page disables its package links, while
the advertised shell installer silently installs the older `d456abf…` build.
The brief's required local join is also permanently inaccessible through the
product UI. An independently enabled Axe rule finds one serious WCAG 2.5.3
accessible-name failure.

## First-read gate

**PASS.** A cold 1440×900 visit says:

- what: “Inspect local data files.”
- for whom: analysts and engineers reshaping CSV, JSON, or Parquet files;
- first action: **Try it with sample data**, with “Opens an isolated sample
  project.” beside it.

The action is visible without scrolling and opens `/demo/` in one click. The
demo immediately shows five realistic orders and the persistent “Demo — sample
data, nothing is saved” banner with **Reset demo** and **Start for real**.

## Release-blocking findings

### P0 — the candidate has no matching downloadable desktop release

- The live footer reports `0.1.9 · 5c8b98c6df6639cea536954e7183fb8451e1e82c`.
- A guarded candidate build was produced with
  `scripts/build-site-candidate.sh`. Every one of its 20 servable files matched
  production byte-for-byte by SHA-256. The static deployment mismatch from
  verification 5 is therefore fixed.
- GitHub's latest release remains `v0.1.9`. Its tag and `latest.json` resolve to
  `d456abfd26315cc15e9c4bcb13c1638243d13557`, not this candidate. The GitHub
  Actions API returned zero runs for `5c8b98c…`.
- The live page consequently says “Downloads are being published,” says no
  release matches this source revision, and removes every platform package
  link. This fails the desktop installability and immutable provenance contract.
- The visible one-line Linux command is not disabled. Running the live
  `install.sh` with `HOME` and `XDG_BIN_HOME` confined to a temporary directory
  installed `local-data-workbench.AppImage` with SHA-256
  `5b269367c9b23383c3dfddead382645da1a892179d099cfa61ee1c46a2578ecb`.
  That is the stale `d456abf…` manifest's artifact. The installer validates the
  checksum but never validates the manifest commit against the site candidate.
- The stale release declares macOS and Windows signing `false`. The researched
  brief calls for a signed desktop app.

This also makes the landing claim “Linux build available” false for the
candidate. The `release-candidate-provenance` claim test only inspects workflow
source; it does not query the published release and therefore passes while its
production claim is false.

### P0 — the required named join cannot be used

The smallest useful product in the brief must apply named filters, joins, and
transforms. The native engine contains and unit-tests a join, but no user can
reach it:

- `src/app.ts` initializes `unlocked = false` and resets it to false at startup.
- Selecting **Join reference data** closes the step dialog and opens “Paid
  access is unavailable.”
- The dialog says paid local joins are unavailable; there is no checkout link,
  license field, verification action, or other path that can set `unlocked` to
  true.

The browser evidence found zero checkout links and zero license inputs. The
`free-and-paid-features` and `paid-access-withheld` claim tests assert this
withholding as success, but it prevents the required end-to-end job.

### P1 — serious accessible-name mismatch on the home link

Explicit Axe execution of `label-content-name-mismatch` on the live 390 px page
reports one **serious** violation at `a[href="/"]`. Its visible DOM text is
concatenated as `Local DataWorkbench`, while its accessible name is “Local Data
Workbench home.” This fails WCAG 2.5.3 for speech-input users. Lighthouse 12.8.2
reports the same failing element, although the experimental audit is not
weighted into its displayed 100 accessibility score. The default Axe rules in
the repository do not enable this rule, so the existing test misses it.

### P2 — small touch targets and incomplete first-screen facts

- The privacy and terms email links measure about 150×20 CSS px at both tested
  widths, below the attached 44×44 touch-target baseline. The focused skip
  links measure 42 px high. The checked-in touch-target claim samples only
  selected controls and does not cover these links.
- The cold first screen answers the required what/who/first-action gate, but it
  does not show the plain-words baseline's three privacy/offline/price facts.
  Its proof strip is below the first viewport and says “Linux build available,”
  which conflicts with the disabled candidate downloads.

## Mandatory claims gate

After `npm ci --include=dev`, all 26 commands listed in
`.factory/claims.json` were invoked exactly and passed. Browser claims ran in
both the desktop and 390 px Playwright projects.

| Claim | Result | Direct evidence |
| --- | --- | --- |
| `sample-demo` | PASS | 2/2 Playwright cases; visible one-click demo and banner |
| `sample-export` | PASS | 2/2; three shipped rows and exact downloaded CSV |
| `local-only-demo` | PASS | 2/2; demo requests remained same-origin |
| `offline-reload` | PASS | 2/2; fresh contexts reloaded the cached landing page offline |
| `local-formats` | PASS | Rust fixture test opened/profiled CSV, JSON, JSONL, Parquet |
| `numeric-profile-bounds` | PASS | Rust test reported numeric 2…100 rather than lexical bounds |
| `parquet-profile-filter-export` | PASS | Rust Parquet null/string/filter/export fixture |
| `named-transformations` | PASS | Vitest ordered filter/derive/rename/select fixture |
| `local-joins` | PASS | Rust engine join fixture; UI reachability fails separately above |
| `portable-recipes` | PASS | Vitest serialization, reopen, and ordered replay |
| `desktop-complete-export` | PASS | Rust 101-row source exported rows beyond the preview |
| `free-saved-recipes` | PASS | 2/2; repeated save used one demo key |
| `free-recipe-capacity` | PASS | 2/2; three unique recipes accepted, fourth refused |
| `free-and-paid-features` | PASS | 2/2; test confirms joins/JSONL are withheld |
| `demo-exit-discard` | PASS | 2/2; all `demo:` storage removed |
| `touch-targets` | PASS | 2/2 for the test's selected controls; omissions noted above |
| `installer-command-access` | PASS | 2/2; command region keyboard-focusable; default Axe clean |
| `installer-checksums` | PASS | Vitest found SHA-256 verification in both scripts |
| `release-manifest-integrity` | PASS | generated fixture manifest passed `sha256sum -c` |
| `release-candidate-provenance` | PASS | static workflow inspection; live provenance fails above |
| `package-signing-disclosure` | PASS | 2/2 against mocked matching unsigned metadata |
| `paid-access-withheld` | PASS | 2/2 against mocked metadata; core join impact noted above |
| `local-workbench-privacy` | PASS | 2/2; selected fixture/content never left app origin |
| `landing-network-privacy` | PASS | 2/2 with mocked release metadata |
| `bundled-license-notices` | PASS | clean Debian build contained MIT, third-party, Apache notices |
| `build-identity` | PASS | 2/2 local pages showed version and full Git revision |

The bundle-notices claim completed a real release-mode Debian build in 12m52s.
The pre-install invocation of browser claims could not load the absent local
`@playwright/test`; this was normal clean-clone bootstrap behavior. The table
above records the required post-`npm ci` executions.

## Clean checkout and production build

A detached worktree at the candidate was created under `/tmp`, then installed
with `npm ci --include=dev`. No product source changes were made.

```text
PASS npm test
     10 Vitest tests; 7 Rust tests; 0 failures
PASS npx --no-install tsc --noEmit
PASS cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
PASS cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features -- -D warnings
PASS npm run build
     dist/app and dist/site produced
PASS npm run test:e2e
     36/36 tests across desktop Chromium and mobile-390
PASS CI=true npm run test:bundle-notices
```

Production output sizes are well within budget:

- site JS: 5,084 bytes raw / 3,130 bytes gzip total;
- site CSS: 12,021 bytes raw / 3,317 bytes gzip;
- mobile hero: 16,170 bytes; largest hero: 113,728 bytes;
- desktop-app JS: 21.23 kB raw / 7.51 kB gzip;
- desktop-app CSS: 11.37 kB raw / 3.34 kB gzip.

## End-to-end product exercise

The live sample demo started with five orders, filtered to the three shipped
orders, downloaded the exact expected CSV, announced “Exported 3 sample
orders,” and reset to five rows. Local and session storage remained empty.

The browser workbench was exercised with quoted CSV fields, a missing value,
numeric values `2`, `10`, and `100`, malformed JSON, JSON Lines containing a
nested object and null, and a fake Parquet file:

- quoted commas/quotes and the empty cell were preserved;
- numeric profile bounds were 2 and 100;
- a nonnumeric numeric-filter value produced “comparison value must be a
  number,” then accepted `9` and recovered to two rows;
- an uppercase derived column produced `BETA` and `GAMMA`;
- the saved portable recipe contained the source identity and both ordered
  steps;
- exported CSV contained the two transformed rows exactly;
- malformed JSON showed its parser error and recovery instruction;
- a following valid JSONL file loaded successfully with two rows;
- browser Parquet rejection accurately directed the user to the desktop app.

Native claim tests separately exercised real Parquet data, a 101-row
complete-file export, joins, nulls, and invalid/boundary behavior. Launching the
candidate's release binary under Xvfb for 12 seconds produced no application
error; only expected software-rendering DRI warnings appeared before the
intentional timeout.

## Live browser, accessibility, privacy, and PWA evidence

- Routes `/`, `/demo/`, `/privacy/`, and `/terms/` returned 200; the designed
  unknown route returned 404. Each had `lang=en`, one h1, a main landmark, a
  route-specific title, no page overflow at 1440 or 390 px, and no unexpected
  console/page errors. All real links resolved; mail links were excluded.
- `/opt/fleet/lib/verify-url.sh` passed: title, language, h1, main, alt text,
  labelled buttons, and no load errors (`loadMs: 900`).
- Default Playwright Axe found zero serious/critical findings on all five routes
  at both widths and on the transformed workbench state. The explicitly enabled
  WCAG 2.5.3 rule found the serious defect above.
- Keyboard-only navigation reached the skip link, navigation, sample action,
  installer command, disclosures, and footer in order. Every focused item had a
  visible `3px rgb(141, 33, 30)` outline. Keyboard selection and activation
  filtered the demo to three rows.
- With `prefers-reduced-motion: reduce`, the media query matched and no element
  retained a material animation or transition. At simulated 200% text, the
  390 px demo retained all copy/actions with zero page-level horizontal
  overflow.
- Cold landing requests were same-origin assets plus the disclosed GitHub
  release API. Demo and selected-file transform/export flows were same-origin
  only; filenames and fixture contents did not appear in requests. There were
  no analytics, sign-in, product API, checkout, or license-verification calls.
- The service worker registered `/sw.js`, updated, populated
  `local-data-workbench-site-v2`, and reloaded the correct h1/build identity
  offline with no console error.
- Root headers include HSTS, `nosniff`, strict-origin referrer policy,
  camera/microphone/geolocation denial, and a CSP limited to self plus the
  GitHub release API with `frame-ancestors 'none'`. HTML caches for 30 seconds;
  hashed assets cache one year immutable; `sw.js` is `no-cache`.
- Lighthouse 12.8.2 mobile: performance 1.00, accessibility 1.00, best practices
  1.00, SEO 1.00; FCP 1.4 s, LCP 1.4 s, TBT 0 ms, CLS 0, total transfer 30 KiB.
  INP is not available from a lab navigation.

There is no product backend, authentication, or runtime billing call, so API
rate-limit, persistence-boundary, health, and Entra checks are not applicable.

## Published artifact evidence

The stale `v0.1.9` Debian asset downloaded successfully. Its published
`SHA256SUMS` entry verified, package metadata reports version 0.1.9/amd64, and
the archive contains the application binary plus `LICENSE`,
`THIRD_PARTY_NOTICES.md`, and `LICENSES/Apache-2.0.txt`. This proves the old
artifact is internally checksummed; it does not make it a candidate artifact.

## Required next steps

1. Restore the required named-join path for real users: either keep it free or
   implement the one-time Sociobot license flow and make a valid unlock state
   reachable.
2. Tag and publish the exact accepted candidate with Linux, macOS arm64/x64,
   and Windows assets, valid `latest.json`/`SHA256SUMS`, and the required
   signatures. Redeploy the site with that exact source revision.
3. Make both one-line installers reject a release whose manifest commit does
   not match the deployed candidate. Add a live, non-mocked provenance test.
4. Fix the home-link text/name mismatch and expand touch-target coverage to
   every interactive element.
5. Remove or conditionally hide “Linux build available” and the installer
   command whenever candidate-matching assets are unavailable.
