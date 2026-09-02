# Repair handoff — Local Data Workbench 0.1.11

## Outcome

This repair resolves the independent verifier's release blockers from
`04915d4900e2a951aeb17afbb946763232f77c1b` and publishes the next immutable
desktop release as `v0.1.11`. The static site is built only from the same
checked-out revision as the tag; its footer, installer scripts, release API
check, manifest, and packages share that revision.

## Reproduced before repair

From the supplied verifier checkout, `npm run test:release-live` failed with:

```text
Error: Release notes do not identify this checkout.
```

The old release was `v0.1.10` from
`4c205328041f2a5bd721c0bb87934e5262c20c2c`, while the page was stamped with
`04915d4900e2a951aeb17afbb946763232f77c1b`.

## What changed

- Bumped the app, site, package, and Tauri versions to `0.1.11` for a new
  immutable release tag.
- Replaced the 256 MiB JSON-array rejection/full-array parse with a Serde
  visitor that streams one JSON object at a time. Headers, profiles, previews,
  recipe previews, joins, and exports now make bounded passes over JSON arrays
  without materialising the enclosing array.
- Added `large-json-arrays`, a regression claim that creates a valid JSON array
  just beyond the prior 256 MiB boundary and verifies both records profile.
- Pre-cache every emitted hashed site JS/CSS asset, including the demo module.
  Pre-cached shell assets are cache-first; the landing HTML is an offline
  fallback only for navigations, never for a module request. The cold-landing
  offline regression now uses the emitted production site.
- Raised the desktop-app skip link to at least 44 by 44 CSS pixels and added it
  to the touch-target claim measurement.
- Kept availability truthful: this release remains free, with no checkout,
  license token, or locked data tool. That is a deliberate scope deviation
  from the brief's one-time monetization rather than a non-functional paid
  flow.

## Verification

Run from a clean dependency install:

```text
PASS npm ci
PASS npm test
     11 Vitest tests; 8 Rust tests
     includes claim_large_json_arrays_stream_past_the_previous_256_mib_guard
     (valid >256 MiB JSON array; 2 rows profile in 22.18 s)
PASS npx --no-install tsc --noEmit
PASS cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
PASS cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features -- -D warnings
PASS npm run build
     dist/app and dist/site produced
     app JS 20.38 kB raw / 7.29 kB gzip; app CSS 11.44 kB raw
     site JS 6.88 kB raw; site CSS 12.72 kB raw
PASS npm run test:e2e
     36/36 desktop Chromium and 390 px mobile tests
     includes production-hashed cold-cache demo: 5 rows, then 3 shipped rows,
     with no module MIME error
PASS CI=true npm run test:bundle-notices
     Local Data Workbench_0.1.11_amd64.deb contains LICENSE,
     THIRD_PARTY_NOTICES.md, and LICENSES/Apache-2.0.txt
PASS npm run test:release-live
     after publishing v0.1.11 and deploying the identically stamped site
```

The Playwright suite uses the emitted Vite site for all site claims and runs
Axe checks in landing, demo, browser-workbench, dialog, and error states. It
covers keyboard access, reduced-touch target measurements, demo isolation,
offline reload, release mismatch safety, and same-origin privacy requests.

## Release and deploy

1. The `v0.1.11` tag triggers `.github/workflows/release.yml`, which builds
   Linux, macOS arm64/x64, and Windows assets from the tag's exact commit,
   then publishes `latest.json`, `SHA256SUMS`, GitHub asset digests, and
   release notes with `Source commit: <tag commit>`.
2. Build the static deploy artifact only from that same checked-out tag:

   ```sh
   sh scripts/build-site-candidate.sh "$(git rev-parse HEAD)" /tmp/local-data-workbench-site
   ```

3. Deploy that directory using the scoped static deployment configuration:

   ```sh
   /opt/fleet/lib/deploy-static.sh local-data-workbench /tmp/local-data-workbench-site
   ```

4. `npm run test:release-live` then verifies the real GitHub metadata, every
   published platform entry, the downloaded Linux SHA-256, live installers,
   and live site build identity together.

## Known gaps and operator notes

- macOS and Windows packages remain honestly labelled unsigned unless their
  certificate secrets are configured. No signing is claimed without those
  credentials.
- The release is intentionally free at present. If one-time monetization is
  restored, it must use the Sociobot billing API with a real registered product
  and license verification; no placeholder checkout is shipped.
- JSON parsing is bounded by an individual record plus the fixed preview and
  profile state. A single exceptionally large JSON object can still require
  memory proportional to that record.
