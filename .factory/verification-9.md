# Independent verification 9 — FAIL

Candidate: `6db1a5e829037728a2c124c83f390fbb9235e350`

Published control revision: `898a6accd207973dd44dd517ca244bb9c31d0580`

Live URL: <https://local-data-workbench.sociobot.in/>

Verified: 2026-09-02 UTC

Work order: `local-data-workbench-verify-9`

## Verdict

**FAIL — do not accept or release this candidate.** The requested candidate is
not present in the supplied repository or on GitHub, so a clean candidate
checkout and its mandatory claim tests cannot be reproduced. The live site
names that unavailable revision, while the `v0.1.12` tag, release notes,
`latest.json`, checksums, and all desktop packages name `898a6ac…`. The live
one-line installer therefore exits before downloading anything. This is fresh
evidence of a release-blocking deployment/release split, not a stale report.

The first-read gate, live demo, accessibility, privacy, offline behavior,
headers, performance, and the published control revision's functional tests
are otherwise strong. Those results cannot establish the contents or desktop
artifacts of an unavailable candidate.

## First-read gate — PASS

A cold visit at 1440 px and 390 px answers all three required questions in the
initial viewport:

- **What it does:** “Inspect local data files.”
- **For whom:** “For analysts and engineers who need to reshape CSV, JSON, or
  Parquet files without writing a one-off script.”
- **What to do first:** **Try it with sample data**, beside “Opens an isolated
  sample project.”

One activation opens `/demo/`, immediately showing five monthly orders and the
persistent “Demo — sample data, nothing is saved” banner with **Reset demo**
and **Start for real**. The desktop first-run screen also exposes **Load sample
project** and loads the five-row sample in one activation.

## Release-blocking findings

### P0 — the candidate commit cannot be checked out or audited

The supplied checkout and GitHub `main` are both
`898a6accd207973dd44dd517ca244bb9c31d0580`. The requested SHA is not in the
object database, is not advertised by any branch or tag, and cannot be fetched:

```text
$ git fetch https://github.com/B-Divyesh/sf-local-data-workbench.git \
    6db1a5e829037728a2c124c83f390fbb9235e350
fatal: remote error: upload-pack: not our ref 6db1a5e829037728a2c124c83f390fbb9235e350
fetch_rc=128
```

The GitHub commit API independently returned HTTP 422:

```json
{"message":"No commit found for SHA: 6db1a5e829037728a2c124c83f390fbb9235e350"}
```

Consequently, it was impossible to perform `npm ci`, run the claim commands,
or produce the exact production build from a clean checkout of the named
candidate. This alone fails the work order's mandatory candidate gate.

### P0 — the live candidate has no matching desktop release and cannot install

Fresh identity evidence is internally contradictory:

| Surface | Revision |
| --- | --- |
| Live footer and live `install.sh`/`install.ps1` | `6db1a5e829037728a2c124c83f390fbb9235e350` |
| GitHub `main` | `898a6accd207973dd44dd517ca244bb9c31d0580` |
| `v0.1.12` tag target | `898a6accd207973dd44dd517ca244bb9c31d0580` |
| `v0.1.12` release notes | `898a6accd207973dd44dd517ca244bb9c31d0580` |
| Published `latest.json` | `898a6accd207973dd44dd517ca244bb9c31d0580` |

The landing page correctly hides all stale download links and says “No release
matching this page’s source revision is published yet.” Running the live Linux
installer with an isolated `XDG_BIN_HOME` exits 1 before package download:

```text
Release identity mismatch. Expected v0.1.12 from
6db1a5e829037728a2c124c83f390fbb9235e350. Nothing was downloaded or installed.
```

This fails the desktop-app contract: there is no candidate AppImage/DEB/RPM,
DMG, MSI/EXE, checksum manifest, or usable detected-platform download.

As an additional control, rebuilding published `898a6ac…` with the environment
variable `VITE_BUILD_ID` forcibly set to `6db1a5e…` reproduced every served
live file byte-for-byte: all route HTML, the 404 body, JS, CSS, service worker,
installers, icons, and images. Thus the live footer proves only that an
arbitrary build-ID string was injected; it does not prove a build from the
unavailable candidate object.

### High — the brief's signed-desktop requirement remains unmet

The only published packages belong to the older control revision. Release
notes and `latest.json` explicitly mark both macOS and Windows signing as
`false`; their packages are labelled unsigned. Disclosure is correct, but the
researched brief calls for a signed desktop app. Operator certificates remain
required even after a candidate release is published.

### High — claim-like README statements remain outside the claim registry

The README makes observable statements that have no entry in
`.factory/claims.json`, including:

- “the browser fallback labels its 100-row limit before export”;
- saved recipes “contain no source rows”;
- a moved source path “can be edited in any text editor before reopening the
  recipe.”

The first behavior has an `@regression:browser-preview-export` test, but it is
not registered as a claim. The other two are not directly asserted by a claim
test. Under the claims acceptance contract, an unlisted claim is itself a
release-blocking finding until registered and tested or removed.

### Medium — the desktop landing walkthrough has no screenshot frames

The desktop demo contract requires a captioned three-to-five-frame screenshot
walkthrough. The live “See the sample project in three steps” section contains
three text-only bordered items and no images. The only landing image is the
editorial hero still life. The working one-click demo reduces the user impact,
but it does not satisfy this desktop-specific presentation requirement.

## Mandatory claims gate

The requested candidate claims gate is **FAIL/not reproducible** because Git
cannot resolve the candidate before dependency installation or test execution.
To gather the closest available control evidence, a separate clean clone of
published `898a6ac…` ran all 26 commands exactly as listed in
`.factory/claims.json` after `npm ci`. Twenty-five passed and one failed.

| Claim id | Control result | Evidence |
| --- | --- | --- |
| `sample-demo` | PASS | Desktop and 390 px Playwright cases passed. |
| `sample-export` | PASS | Downloaded CSV bytes exactly matched the three shipped orders. |
| `local-only-demo` | PASS | Both browser projects observed same-origin demo traffic only. |
| `offline-reload` | PASS | Both browser projects reloaded landing and demo offline. |
| `large-json-arrays` | PASS | >256 MiB streaming JSON test passed in 22.36 s. |
| `local-formats` | PASS | CSV, JSON, JSON Lines, and Parquet native test passed. |
| `numeric-profile-bounds` | PASS | Numeric minimum/maximum regression passed. |
| `parquet-profile-filter-export` | PASS | Parquet string/null/filter/export regression passed. |
| `named-transformations` | PASS | Ordered filter/derive/rename/select unit test passed. |
| `local-joins` | PASS | Native named-key join test passed. |
| `portable-recipes` | PASS | JSON save/reopen and ordered replay test passed. |
| `desktop-complete-export` | PASS | Rows beyond the 100-row preview were exported natively. |
| `free-saved-recipes` | PASS | Re-saving one recipe retained one record. |
| `unlimited-saved-recipes` | PASS | A fourth distinct recipe saved without a paywall. |
| `included-desktop-tools` | PASS | JSON Lines export and join chooser remained ungated. |
| `demo-exit-discard` | PASS | Demo-prefixed storage was removed on exit. |
| `touch-targets` | PASS | Measured controls passed in both browser projects. |
| `installer-command-access` | PASS | Label, focus, and Axe checks passed. |
| `installer-checksums` | PASS | Shell and PowerShell SHA-256 assertions passed. |
| `release-manifest-integrity` | PASS | Fixture `SHA256SUMS` verified all package entries. |
| `release-candidate-provenance` | **FAIL** | `npm run test:release-live` exited 1: “Live site does not identify this checkout.” |
| `package-signing-disclosure` | PASS | Mocked unsigned packages remained labelled and linked. |
| `local-workbench-privacy` | PASS | Selected fixture content stayed on the app origin. |
| `landing-network-privacy` | PASS | Only same-origin assets and the GitHub release API were requested. |
| `bundled-license-notices` | PASS | Clean Debian bundle contained MIT, third-party, and Apache-2.0 notices. |
| `build-identity` | PASS | Control development builds showed version and source revision. |

The single declared claim failure is sufficient for **FAIL**, independent of
the candidate's absence and the unlisted claims.

## Clean-control quality gates

These results describe the only published source revision, not the unavailable
candidate:

- `npm ci` — PASS; 66 packages installed, zero vulnerabilities.
- `npm audit --audit-level=high` — PASS; zero vulnerabilities.
- `npm test` — PASS; 15 Vitest tests and 8 Rust tests.
- `npm run test:e2e` — PASS; 36/36 cases across desktop Chromium and 390 px.
- `npx --no-install tsc --noEmit` — PASS.
- `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` — PASS.
- `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets
  --all-features -- -D warnings` — PASS.
- `npm run build` — PASS; produced `dist/app` and `dist/site`.
- `CI=true npm run test:bundle-notices` — PASS; the release-mode Debian build
  completed and contained all required notices.
- No JavaScript lint script is defined in `package.json`.

Production sizes pass the budgets: live initial JavaScript is 5,481 bytes raw
/ 2,474 bytes gzip, CSS is 12,718 / 3,456 bytes, and the mobile hero is 16,170
bytes. The control desktop UI is 20,379 bytes JavaScript and 11,435 bytes CSS.

## End-to-end and recovery evidence

- Live demo: five rows loaded; filtering `shipped` produced three rows; the
  downloaded `monthly-orders-filtered.csv` contained exactly rows 1001, 1003,
  and 1005; **Reset demo** restored five rows. No storage key was created.
- Boundary input: a 101-row CRLF CSV with quoted commas produced a bounded
  100-row browser preview while its numeric profile correctly reported 101
  distinct values, minimum 1, maximum 101.
- Invalid filter: `not-a-number` produced “Step 1: comparison value must be a
  number.” Correcting it to 99 applied the recipe and exported the preview.
- Invalid file: malformed JSON produced “The browser preview could not read
  this file” and a visible **Choose another file** recovery action. A valid
  two-row JSON Lines file then opened successfully.
- Native coverage: the Rust suite exercised CSV, JSON, JSON Lines, Parquet,
  nulls, profiling, joins, ordered transforms, >256 MiB JSON streaming, and
  complete export beyond the preview.
- The freshly built control binary and the published `898a6ac…` Debian binary
  each stayed running through an eight-second Xvfb smoke window (timeout 124),
  with only expected headless EGL warnings.

## Live privacy, accessibility, offline, and structure

- `/`, `/demo/`, `/privacy/`, and `/terms/` returned 200. The designed unknown
  route returned 404 with its own title, h1, main landmark, and route back.
- `/opt/fleet/lib/verify-url.sh` passed with title, `lang=en`, one h1, main,
  alt text, labelled buttons, and zero console/page errors.
- Axe WCAG 2 A/AA found zero serious or critical issues on all public routes
  at 1440 px and 390 px. There was no horizontal overflow or undersized visible
  interactive target in the independent scan.
- Keyboard Tab begins on the skip link, reaches the sample action, and shows a
  3 px oxblood focus outline. The demo select/filter works with arrows, Tab,
  and Enter. The app dialog focuses its close button, closes with Escape, and
  returns focus to its trigger. A 200% root text-size smoke test retained the
  primary action with no horizontal overflow.
- Reduced-motion emulation was active with no running animations.
- Live landing requests were same-origin files plus the documented GitHub
  Releases API call. The complete demo filter/export flow made same-origin
  requests only. App fixture names and content did not appear in URLs or POST
  bodies. No analytics, remote fonts, console errors, or page errors appeared.
- The service worker updated successfully, used
  `local-data-workbench-site-v4`, and reloaded both landing and filtered demo
  offline with HTTP 200 and no failed requests.
- Route titles, canonical URLs, descriptions, Open Graph/Twitter metadata,
  the 1200x630 social image, 180x180 touch icon, robots file, sitemap, privacy,
  terms, and non-fragment links all passed.

Security headers include CSP with `frame-ancestors 'none'`, HSTS, `nosniff`, a
strict referrer policy, and camera/microphone/geolocation restrictions. HTML
uses 30-second revalidation, hashed assets use one-year immutable caching, and
`sw.js` uses `no-cache`.

The product has no owned backend endpoints, account system, Sociobot unlock
call, or sign-in. Server concurrency, SQLite `/data`, API 429/`Retry-After`,
health endpoint, and Entra authority checks are therefore not applicable.

## Performance

Lighthouse 12.8.2 against the live mobile page:

| Check | Result |
| --- | ---: |
| Performance | 100 |
| Accessibility | 100 |
| Best practices | 100 |
| SEO | 100 |
| FCP | 1,031 ms |
| LCP | 1,067 ms |
| CLS | 0 |
| Total blocking time | 66.5 ms |
| Total transfer | 30,535 bytes |

INP was not available in this non-interactive lab navigation. Bundle size,
LCP, CLS, and blocking-time budgets pass comfortably.

## Published-control package evidence

Release `v0.1.12` does contain Linux AppImage/DEB/RPM, macOS arm64/x64 DMGs,
Windows EXE/MSI, `latest.json`, and `SHA256SUMS`, all for `898a6ac…`. A fresh
download of `Local.Data.Workbench_0.1.12_amd64.deb` matched both GitHub and the
manifest checksum:

```text
7da7a92e5609fe7df52ccea48ffd90f01644461318b1395483943d4f18c52ac7
```

Its contents include `LICENSE`, `THIRD_PARTY_NOTICES.md`, and
`LICENSES/Apache-2.0.txt`. This validates the older control release only; it is
intentionally unavailable from the candidate-stamped live page.

## Required before re-verification

1. Push the real candidate commit so a clean clone can resolve and audit it.
2. Publish a new immutable version/tag whose notes, `latest.json`, checksums,
   packages, installers, and live footer all identify that exact commit.
3. Run `npm run test:release-live` from the pushed candidate and require it to
   pass before requesting verification.
4. Supply signing certificates or obtain an explicit accepted deviation from
   the signed-desktop brief.
5. Register and test every README claim, and add the required screenshot-based
   desktop walkthrough.
