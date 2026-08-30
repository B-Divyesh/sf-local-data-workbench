# Independent verification 2 — FAIL

- Candidate: `2cb084349a7f98b4660e5bce26ba2dc7c32b0691`
- Live URL: <https://local-data-workbench.sociobot.in>
- Verified: 2026-08-30 UTC
- Work order: `local-data-workbench-verify-2`
- Decision: **FAIL — do not release this candidate**

The deployment is available and its static files match the candidate build. The first-read and one-click demo gates pass. The candidate still fails the product contract because native Parquet strings/nulls are decoded incorrectly, numeric profile ranges are wrong, the published desktop builds are unsigned, and the claim registry does not cover most promises made by the product. The mandatory bundle-notice claim also failed on its first exact invocation in the clean worker because its declared command does not provision the Linux prerequisites it requires.

## Release-blocking findings

### Critical — Parquet string values and nulls are decoded incorrectly

Parquet is a required core format. A fresh three-row Parquet fixture contained `status = ["keep", null, "drop"]`. Directly exercising the candidate's public Rust engine returned:

```text
rows: [["1", "2", "\"keep\""], ["2", "10", "null"], ["3", "100", "\"drop\""]]
status profile: null_count: 0, min: "\"drop\"", max: "null"
```

The app therefore treats string rendering quotes as data and treats a null as the literal text `null`. Applying the ordinary named filter `status equals keep` exported only the header:

```text
Ok(ExportResult { rows_written: 0, bytes_written: 17, ... })
id,amount,status
```

Expected: one matching `keep` row and one missing status value. Actual: zero matches and no missing values. This breaks inspection, profiling, filtering, and deterministic output for common Parquet data. Reproduction fixtures and probes are under `.factory/verification-artifacts/native-*`.

### Critical — profile minimum and maximum are lexicographic for numeric columns

Both the browser and native engines classify `2`, `10`, and `100` as integers but report minimum `10` and maximum `2`. The shipped sample visibly has the same defect: its decimal amount column reports minimum `124.50` and maximum `88.00` even though it contains `61.00` and `241.25`.

Column profiling is part of the smallest useful product and is prominently promised on the landing page and README. Incorrect range facts can cause an analyst to make the wrong transformation decision.

### Critical — `.factory/claims.json` is materially incomplete

The registry has six entries, but the live page and README make additional observable claims with no `@claim:<id>` test, including:

- opening and profiling CSV, JSON, JSON Lines, and Parquet;
- filters, derived columns, renames, selections, and joins;
- saving and reopening portable recipes;
- local-only file work and no analytics in the installed app;
- free/paid feature limits and license behavior;
- installer SHA-256 verification;
- the shipped sample and desktop first-run behavior.

This gap allowed the Parquet and numeric-profile failures above to ship. In addition, `@claim:sample-export` waits for a download and checks only the suggested filename and status text; it never reads the CSV or asserts its rows. Independent QA read the file and found it correct, but the registered test does not prove the claim as required.

### High — the clean-worker package-notice claim initially exits 1

The exact declared command `CI=true npm run test:bundle-notices` initially failed because `glib-2.0.pc` was absent. After installing the same Tauri Linux packages declared by the release workflow, it passed and the generated Debian package contained `LICENSE`, `THIRD_PARTY_NOTICES.md`, `Apache-2.0.txt`, and the sample CSV.

The work order says any failing declared claim command is release-blocking. The command needs a self-contained prerequisite step or a claim harness that provisions/validates its prerequisites before attempting the assertion.

### High — published desktop applications are unsigned

The researched brief requires a signed desktop app. The release page, live page, and terms correctly disclose that v0.1.1 macOS and Windows builds are unsigned previews. Honest disclosure does not satisfy the acceptance requirement. Signing certificates remain an operator prerequisite.

### High — published build identity does not identify the candidate

- Candidate: `2cb0843…`
- Release tag `v0.1.1` and release body: `419c967d1325bdef1878d06d18230a8d09ccba3b`
- Live site footer on every route: `Build source checkout`
- Desktop app HTML footer: hard-coded `v0.1.0`, while the package/release version is `0.1.1`

The release commit is the candidate's parent and all non-`graphify-out` files are identical between them, so functional source equivalence is established. Immutable candidate provenance is not: neither the live site nor published installers name `2cb0843…`.

## Other defects

### Medium — the free “three saved recipes” limit counts save actions, not recipes

Saving the same one-row recipe three times increments `ldw:saved-recipes` to `3`; the fourth save opens the purchase dialog. The app does not track existing recipe files and cannot decrement the count when a recipe is deleted. Users can lose the promised free capacity through repeated saves, while clearing local storage resets the limit entirely.

### Medium — desktop demo state is not discarded on exit

From `?demo=1`, saving a recipe writes `demo:ldw:saved-recipes=1`. Selecting **Start for real** removes the banner but leaves that demo key in local storage. This contradicts the demo contract that leaving demo mode discards demo state and the banner's “nothing is saved” wording.

### Medium — multiple click/touch targets are smaller than 44×44 CSS pixels

At 390 px, examples include the 40 px-wide **Demo/Home** nav links, 18 px-high download links, 15 px-high checksum links, and 35 px-high command blocks. The desktop app's add-step button is 38 px wide. Keyboard focus is visible, but the targets do not meet the product's accessibility/design contract.

### Medium — the copy audit is not a complete extraction

`.factory/copy-audit.md` contains only six selected lines, not every landing sentence as required, and claims all sentences are within 22 words. The landing sentence beginning “The portable JSON recipe…” is 24 words. The absolute heading “Nothing to breach because nothing was sent” also sits on a page that sends a GitHub Releases API request; later copy narrows the privacy promise, but the heading itself is overbroad and unregistered.

### Low — social metadata is incomplete on secondary routes

Privacy, Terms, Demo, and 404 do not each provide the complete Twitter title/description/image set required by the site-structure contract. The 404 document also logs the browser's expected failed-document 404 console message.

## Mandatory gate evidence

### Claims

The first browser command before `npm ci` could not resolve the repository's local Playwright dependency. After the locked install, browser claim results were:

| Claim | Exact command | Result |
| --- | --- | --- |
| `sample-demo` | `npm run test:e2e -- --grep @claim:sample-demo` | PASS, desktop + 390 px |
| `sample-export` | `npm run test:e2e -- --grep @claim:sample-export` | PASS, desktop + 390 px; test-content gap above |
| `local-only-demo` | `npm run test:e2e -- --grep @claim:local-only-demo` | PASS, desktop + 390 px |
| `offline-reload` | `npm run test:e2e -- --grep @claim:offline-reload` | PASS, desktop + 390 px |
| `desktop-complete-export` | `cargo test --manifest-path src-tauri/Cargo.toml --no-default-features claim_desktop_complete_export` | PASS, 1 test |
| `bundled-license-notices` | `CI=true npm run test:bundle-notices` | **FAIL initially**: missing `glib-2.0.pc`; PASS after release-workflow system packages were installed |

### Cold first-read

**PASS.** On desktop and 390 px the live first screen says:

- what it does: “Inspect local data files.”
- for whom: analysts and engineers reshaping CSV, JSON, or Parquet without a one-off script;
- what to click: **Try it with sample data**.

The CTA is visible within the initial 390×844 viewport. One click opens a populated five-order sandbox with a persistent demo banner, reset, start-for-real, filter, and export. Screenshots: `verification-artifacts/first-read-desktop.png`, `first-read-mobile.png`, and `live--demo--390.png`.

## Clean checkout and build gates

The checkout began at the exact candidate. Pre-existing `graphify-out` changes were not staged or committed.

| Check | Result |
| --- | --- |
| `npm ci` | PASS; 66 packages, 0 vulnerabilities |
| `npm audit --audit-level=high` | PASS; 0 vulnerabilities |
| `npm test` | PASS; 3 Vitest + 4 Rust tests |
| `npm run test:e2e` | PASS; 10/10 across desktop Chromium and 390 px |
| `npx --no-install tsc --noEmit` | PASS |
| `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` | PASS |
| no-default-feature Clippy | PASS with `-D warnings` |
| all-feature Clippy | PASS with `-D warnings` |
| `cargo test --manifest-path src-tauri/Cargo.toml --all-features` | PASS; 4 tests |
| `npm run build` | PASS; exact `dist/app` and `dist/site` outputs |
| `CI=true npm run test:bundle-notices` after documented Linux prerequisites | PASS; Debian bundle produced and notices found |
| native binary smoke under Xvfb | Stayed running for 15 seconds; timeout exit 124, only container EGL warnings |

No lint script exists in `package.json`.

## End-to-end behavior

### Passing paths

- Live demo: 5 rows → shipped filter → 3 rows → CSV with the correct header and exactly orders 1001, 1003, and 1005 → reset to 5 rows.
- Demo storage remained empty and all four requests were same-origin.
- Browser fallback parsed CRLF CSV, quoted commas, escaped quotes, empty cells, JSON arrays, and JSON Lines.
- Invalid numeric filter value produced “comparison value must be a number”; correcting it recovered and transformed the preview.
- A named uppercase derived-column step appeared in the downloaded portable recipe and CSV output.
- Invalid JSON produced a recovery message; a subsequent valid JSON Lines file loaded successfully.
- Browser Parquet clearly directed the user to the installed desktop app.
- Existing Rust coverage proved CSV complete-file export beyond the 100-row preview and a keyed join.
- Native probes independently opened CSV, JSON, JSON Lines, and Parquet and rejected invalid JSON and a directory.

### Failing paths

- Parquet string/null inspection and string filtering fail as detailed above.
- Numeric ranges are wrong in both execution paths.
- Repeated saves consume the three-recipe allowance even when they are the same recipe.
- Desktop demo state is retained after **Start for real**.

Native file-dialog automation for physically reopening a saved recipe was not available. The core recipe parsing/replay path was inspected and existing transformation tests passed, but this remains an automation coverage gap.

## Accessibility and responsive QA

- `/opt/fleet/lib/verify-url.sh` passed on live home and demo: HTTPS 200, title, `lang`, one h1, main landmark, alt text, labeled buttons, and zero ordinary-load console/page errors.
- Playwright Axe found zero serious/critical violations on Home, Demo, Privacy, Terms, 404, the browser app, transformed data, and an open modal at desktop and 390 px.
- Keyboard tab order is logical; all observed focus rings are 3 px oxblood outlines.
- The transform dialog focuses its close button, Escape closes it, and focus returns to **Add recipe step**.
- The demo filter works with arrows, Tab, and Enter.
- Reduced-motion media emulation left no effective animations/transitions.
- No page overflow occurred at 390 px; a 200% text-size smoke test retained controls/content without horizontal overflow.
- Remaining target-size defects are listed above.

## Privacy, headers, caching, and offline

- The complete live demo filter/export/reset flow requested only its own document, JS, and CSS. No analytics, fonts, filenames, sample content, or third-party request was observed.
- The browser workbench flow requested only local Vite resources during QA.
- The landing page additionally calls the disclosed GitHub Releases API to resolve downloads; no console/page error occurred.
- HTML carries CSP, HSTS, `nosniff`, strict-origin referrer policy, and restrictive camera/microphone/geolocation policy.
- Hashed JS/CSS/images use `max-age=31536000, immutable`; HTML uses 30-second revalidation; `sw.js` uses `no-cache`.
- Live service-worker `update()` succeeded. Home and populated Demo both reloaded offline with HTTP 200 and no console error.
- The product has no owned backend, account, health endpoint, shared database, or sign-in, so concurrency, SQLite `/data`, and Entra checks are not applicable.
- No Sociobot billing endpoint was contacted. The explicit resource boundary forbids connecting to non-`sf-local-data-workbench` services, so no 429 allowance was observed for the external checkout/verify service.

## Performance

Fresh Lighthouse mobile against live:

| Category / metric | Result |
| --- | ---: |
| Performance | 100 |
| Accessibility | 100 |
| Best practices | 100 |
| SEO | 100 |
| FCP | 0.87 s |
| LCP | 0.93 s |
| Total blocking time | 30 ms |
| CLS | 0 |
| Transfer size | 29 KiB |

Build payloads are within budget: site JS is 0.71 + 2.45 KiB (demo adds 1.35 KiB), site CSS 11.21 KiB, mobile hero 16.17 KiB; app JS 22.87 KiB and CSS 11.35 KiB, all uncompressed.

## Deployment, releases, and installers

- Home, Demo, Privacy, Terms, all hashed JS/CSS, hero sizes, social image, service worker, installers, robots, and sitemap were byte-for-byte equal between `dist/site` and live.
- Unknown routes return a designed HTTP 404.
- Release v0.1.1 has macOS arm64/x64 DMGs, Windows EXE/MSI, Linux AppImage/DEB/RPM, `latest.json`, and `SHA256SUMS`.
- Every manifest platform URL returned 200 and every manifest hash matched `SHA256SUMS`.
- Downloaded Debian SHA-256: `551e6509a8b383189948f55a2ccedf595791ddfa90e4bd47a40979b2192bdc66`; it contained the application binary, sample, MIT license, third-party notice, and Apache notice.
- The live Linux one-line installer downloaded the AppImage into an isolated directory, verified SHA-256 `c5139c9e07996f2c8136d762c33468919180d0281435cd6ca3c127a0787a9cec`, and installed an executable file.
- All crawled same-origin and GitHub links returned their expected 200/404 status. Billing and mail links were excluded by scope.

## Required before re-verification

1. Decode Parquet values by field type so strings have no rendering quotes and nulls remain missing; add claim/regression coverage for profiling, filtering, and exporting Parquet.
2. Compute numeric/date profile bounds using typed comparison; add boundary tests such as 2/10/100 and the shipped amount sample.
3. Inventory every live/README claim in `.factory/claims.json`; make sample-export inspect CSV bytes and make claim commands reproducible from the worker setup.
4. Produce signed macOS/Windows releases or obtain an explicit accepted scope deviation.
5. Publish candidate-identified site/installers and correct the app's displayed version/build identity.
6. Track actual saved recipes or word the allowance honestly; clear the demo namespace when leaving demo mode.
7. Bring every interactive target to at least 44×44 CSS px and complete the copy/metadata audits.
