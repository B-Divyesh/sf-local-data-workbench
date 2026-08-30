# Independent verification — FAIL

- Candidate: `7bf2102ab66094a88a090496753198f8cfd191d8`
- Live URL: <https://local-data-workbench.sociobot.in>
- Verified: 2026-08-30 UTC
- Work order: `local-data-workbench-verify-1`
- Decision: **FAIL — do not release this candidate**

The candidate fails two explicit, release-blocking acceptance checks before the broader QA results are considered: `.factory/claims.json` is absent, and neither the landing page nor the desktop first-run screen provides a one-click sample-data demo. The cold first screen also does not plainly identify the intended analysts and engineers.

## Release-blocking findings

### Critical — the required claim registry and claim tests do not exist

Expected: `.factory/claims.json` lists every user-relevant claim and gives exactly one executable `@claim:<id>` test for each claim.

Actual evidence:

```text
$ test -f .factory/claims.json
missing
$ rg '@claim:'
no matches
```

There were therefore zero claim commands to run. Per the work order, a missing claims file is itself release-blocking. This also leaves prominent claims unregistered and unproved, including multi-gigabyte input, local-only processing, bounded memory, portable recipes, deterministic complete-file export, offline operation, daily license checking, and checksum-verifying installers.

### Critical — no one-click sample demo; first-read contract fails

Expected: the first screen says what the product does, who it is for, and what to click first, with a visible “Try it with sample data” or “Load sample project” action. A desktop product must ship the sample and show a 3–5 frame captioned walkthrough on the landing page.

Actual evidence:

- Cold live heading: “Your data never leaves the desk.” This is a privacy slogan, not the job.
- Supporting copy explains local file transformation but never names analysts or engineers.
- Primary action: “Download for Linux”. There is no sample/demo action (`demoActionCount: 0`).
- `/demo` returns HTTP 200 but is only the normal landing page with the same heading.
- The desktop first-run screen offers only “Choose source file”.
- No sample/demo asset, `.factory/demo.md`, demo storage namespace, demo banner, reset action, or “Start for real” action exists.
- The landing page has one generated still life, not a captioned product walkthrough.

This fails the mandatory first-read and demo-sandbox checks.

### High — distributed applications are unsigned

The researched brief calls for a signed desktop app. The live page, terms, release notes, and handoff all explicitly say the macOS and Windows preview builds are unsigned. This is honestly disclosed, but it does not satisfy the brief.

### High — native license notices are claimed but not shipped

The landing FAQ says native-engine “notices and licenses ship with the app,” and the brief requires native query-engine license disclosure. Inspection of both published Linux formats found no bundled `THIRD_PARTY_NOTICES`, application license, Apache Parquet/Arrow notice, or equivalent:

- Published Debian package contents: binary, desktop entry, and icons only.
- Published AppImage extraction: bundled system-library copyright files exist, but no application/Parquet/Arrow notice or license file exists.

`THIRD_PARTY_NOTICES.md` exists only in the source repository.

## Other defects

### Medium — browser fallback can promise and then omit full-file rows

With a 101-row CSV, the browser fallback correctly displayed “100 preview rows” and “Export applies this recipe to the complete file.” After filtering for `amount > 99`, the downloaded CSV contained only row 100; row 101 was omitted because export used the bounded in-memory preview. The later status says it exported the browser preview, but that contradicts the pre-export promise. The installed Rust path has a full-file export test and did not show this defect.

### Medium — mobile and keyboard target sizing is below contract

At 390 px, the landing-page nav and download/legal links measured 14–18 px high. In the workbench, the License button measured 32 px high. These are below the required 44 px touch target. The visually hidden browser file input is also a separate keyboard tab stop, so keyboard users encounter an invisible focused control after the visible “Choose source file” button.

### Medium — required site hardening and route metadata are incomplete

- No `Content-Security-Policy` response header is present.
- No canonical link, Open Graph image, Twitter card, or apple-touch icon is declared.
- An unknown route returns HTTP 200 with the home page; there is no designed 404.
- The desktop document title is only “Local Data Workbench,” not “Product — what it does”.
- Footers do not consistently include Privacy, Terms, “Built by Param Factory,” and a build identifier.
- `.factory/copy-audit.md` is absent. Several headings use the prohibited brand-lore/metaphor style, including “The recipe is the work,” “Privacy, in plain ink,” and “A desk license, not a data tax.”

### Medium — release provenance does not identify the candidate

The static deployment is byte-for-byte the candidate output, but the published v0.1.0 binaries were produced by the last successful release workflow at `3f2d83b744110a0a7dd39b4dbbbb90a3c6b47986`; tag `v0.1.0` points to `0178e4e39377ee8f7390c3a2e5dd52410c7223f8`, not the candidate. Desktop source files are unchanged between that tag and the candidate, and both binaries embed the same frontend asset names, but a downloaded binary cannot be tied to candidate `7bf2102` and is not byte-identical to a fresh candidate build.

### Low — offline landing reload logs a failed network request

The service worker successfully reloads the landing page offline, but the unconditional GitHub release-metadata request logs `net::ERR_INTERNET_DISCONNECTED`. The UI falls back correctly. This is not an uncaught exception, but it conflicts with the no-console-errors/offline-state quality bar.

### Low — installer describes an unsigned manifest as signed

`install.sh` says Python is needed to read the “signed release manifest.” `latest.json` is not cryptographically signed; it contains SHA-256 values and is fetched over HTTPS. The checksum behavior works, but the wording overstates the assurance.

## Fresh verification evidence

### Clean checkout and quality gates

Verification used a detached clean worktree at the exact candidate. The pre-existing untracked `/work/repo/graphify-out/` directory was not read or changed.

| Check | Result |
| --- | --- |
| `npm ci` | PASS; 66 packages installed, 0 vulnerabilities |
| `npm audit --audit-level=high` | PASS; 0 vulnerabilities |
| `npm test` | PASS; 3 Vitest and 3 Rust tests |
| `npm run test:e2e` | PASS; 4/4 existing Chromium cases across desktop and 390 px |
| `npx --no-install tsc --noEmit` | PASS |
| `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` | PASS |
| `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features -- -D warnings` | PASS |
| `npm run build` | PASS; `dist/app` and `dist/site` produced |
| `CI=true npm run tauri build -- --bundles appimage,deb` | PASS after installing the workflow’s documented Linux system packages; AppImage and Debian bundles produced |

The unmodified command initially rejected the worker’s nonstandard `CI=1` value (`tauri` accepts `true` or `false`). Normalizing it to the GitHub Actions value `CI=true` allowed the production build. This is a harness detail, not counted as a product defect.

No repository JavaScript lint script exists.

### End-to-end and recovery checks

The repository’s browser fallback was exercised because the product has no demo entry point. It is not a substitute for a native-demo acceptance test.

- Loaded a 101-row CRLF CSV containing quoted commas: 101 rows counted, preview bounded at 100, quoted value preserved.
- Added a numeric filter: nonnumeric comparison rejected with “comparison value must be a number”; corrected filter applied.
- Saved and parsed a `local-data-workbench/recipe@1` recipe with its ordered filter.
- Exported CSV and checked header/data content.
- Loaded two JSON Lines records and verified both rows.
- Tried Parquet in the browser fallback and received the documented desktop-required recovery message.
- Recovered from invalid JSON and Parquet errors by opening a valid CSV.
- Existing Rust tests verified full-file filtered CSV export and keyed join behavior.
- The downloaded published AppImage stayed running until a 15-second headless smoke timeout. The freshly built candidate native binary also stayed running until a 10-second smoke timeout. Container-only portal/graphics warnings were emitted; no application crash occurred.

Coverage gap: native file-dialog flows for reopening a saved recipe and real Parquet input were not automated by the repository and could not be completed through the absent demo sandbox.

### Accessibility and responsive behavior

- `/opt/fleet/lib/verify-url.sh`: PASS; HTTPS 200, title/lang/main present, one h1, no missing image alt, no unlabeled button, no console/page error.
- Playwright axe on live desktop, live 390 px, Privacy, Terms, browser-workbench desktop/mobile, transformed table, and open dialog: zero serious/critical findings.
- Ordinary keyboard focus rings are visible at 3 px, native dialogs focus the close control, Escape closes the dialog, and no trap was found.
- Reduced-motion media query activates and removes effective animation/transition duration.
- No horizontal page overflow at 390 px.
- Touch-target and hidden-tab-stop defects are listed above.

### Privacy, networking, and headers

- Full local browser-workbench flow made only three same-origin requests: document, hashed JS, hashed CSS. No filename, content, analytics, font, or third-party request was observed.
- Live landing load requested only its own document/assets plus the documented GitHub Releases API metadata call.
- Ordinary live loads had no console or page errors.
- Response headers include HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and restrictive camera/microphone/geolocation policy.
- Missing: Content Security Policy.
- Hashed assets use `cache-control: public, max-age=31536000, immutable`; HTML uses 30-second revalidation; `sw.js` uses `no-cache`.
- The service worker was active, `registration.update()` completed, and an offline reload returned the cached page with HTTP 200.

The candidate has no owned backend and no sign-in, so concurrency, SQLite `/data`, Entra authority, health/build endpoint, and product-owned 429 allowance checks are not applicable. The external Sociobot billing/verification service was not contacted because this work order expressly forbids connecting to resources outside the product scope; therefore its rate limit and current product registration were not tested.

### Performance and deployment identity

Fresh Lighthouse mobile result:

| Category/metric | Result |
| --- | ---: |
| Performance | 94 |
| Accessibility | 100 |
| Best practices | 100 |
| SEO | 100 |
| FCP | 1.53 s |
| LCP | 1.53 s |
| CLS | 0.0097 |
| Total blocking time | 284 ms |
| Transfer size | 28,346 bytes |

Build sizes are comfortably within budget: site JS 2.78 KB, CSS 8.42 KB, mobile hero 16.17 KB; app JS 21.50 KB and CSS 10.87 KB, all uncompressed.

The live home HTML and built candidate `dist/site/index.html` shared SHA-256 `4a7be63b658a97173ae4561d692743e2814b6bc6c59000ea9b2da00f30786adf`. Live/built JS, CSS, and mobile hero hashes also matched exactly.

### Release assets and installers

- GitHub release v0.1.0 exposes macOS arm64/x64 DMGs, Windows MSI/EXE, Linux AppImage/DEB/RPM, `latest.json`, and `SHA256SUMS`.
- Downloaded Debian package passed its published checksum: `d92375051ebb8b629bb7d7d17e2561ff4ecab3d1918cc97c11fa9e8f04888a37`.
- The Linux one-line installer was run with an isolated `XDG_BIN_HOME`; it downloaded the AppImage, verified SHA-256 `4d2549a84b86b9994f402e9c2aeb16a8b4dd2d37309c7140d14ca8ba17f7123b`, and installed an executable file.
- Every tested same-origin, GitHub source/release, manifest, and checksum link returned HTTP 200. The checkout URL was deliberately excluded under the resource-access restriction.

## Required before re-verification

1. Add `.factory/claims.json` and one observable demo-sandbox test per claim; remove or narrow every claim not covered.
2. Ship a real one-click sample project and `/demo` flow with isolated demo state, reset/start-real controls, `.factory/demo.md`, and the required landing walkthrough.
3. Rewrite the first screen to state the job and intended user plainly.
4. Either sign supported desktop releases or obtain and document an accepted scope deviation.
5. Bundle the application, Apache/Arrow, and other required license notices in every installer.
6. Fix the bounded-preview export contradiction, 44 px targets, invisible file-input tab stop, CSP/404/metadata/footer gaps, and copy audit.
7. Publish artifacts from the accepted commit and expose an immutable build identity.
