# Local Data Workbench

Local Data Workbench is a desktop tool for analysts and engineers who need to inspect or reshape CSV, JSON, JSON Lines, or Parquet files without writing a throwaway script.

Use the one-click [sample demo](https://local-data-workbench.sociobot.in/demo/) to filter monthly orders and export a sample CSV without touching a real file.

## What it does

- Opens local CSV, JSON, JSON Lines, and Parquet files.
- Streams JSON arrays record by record without materialising the surrounding array, including files larger than 256 MiB.
- Profiles columns and provides named filters, local joins, derived columns, renames, and selections.
- Saves readable `.ldw.json` recipes with source fingerprints.
- Exports the complete native source; the browser fallback labels its 100-row limit before export.

This release includes local joins, CSV and JSON Lines export, recipe reopening, and unlimited saved recipes without an account.

## Develop

Prerequisites: Node 22+, Rust stable, and the [Tauri 2 system dependencies](https://v2.tauri.app/start/prerequisites/) for your operating system.

```sh
npm ci
npm run dev          # browser workbench fallback on :1420
npm run dev:site     # landing site on :5173
npm run tauri dev    # native desktop app
```

Browser development mode provides the bounded preview covered by the claim tests. The installed build runs the registered native-engine claims through the Rust core.

## Test and build

```sh
npm test             # TypeScript + Rust engine tests
npm run test:e2e     # Chromium desktop and 390px accessibility flows
npm run test:release-live # published release, package checksum, installer, and live-site identity
npm run build        # dist/app and dist/site
npm run build:site   # exact static deploy output: dist/site
npm run tauri build  # current-platform desktop bundle
npm run test:bundle-notices # builds a Debian bundle and checks its notices
```

The static factory deploy publishes `dist/site`, with `index.html` at its root. Check out a released candidate in an isolated worktree. Build it with `sh scripts/build-site-candidate.sh <40-character-commit> <output-directory>`. The command refuses a mismatched checkout and verifies the embedded revision before deployment. GitHub Actions builds Linux, macOS, and Windows packages from the tagged commit. macOS and Windows packages are signed only when the operator supplies the required certificates. Otherwise they are published as unsigned and labelled that way. Release builds receive the immutable Git commit as `VITE_BUILD_ID`. The app and site footer display it.

## Install

The landing page detects the visitor's operating system and resolves assets only when the release tag and source commit match the page.

```sh
curl -fsSL https://local-data-workbench.sociobot.in/install.sh | sh
```

The Linux installer pins its version and source commit, then verifies SHA-256 before installing the AppImage. The Windows script applies the same identity and checksum checks. Each script prints an explicit warning when its package is unsigned.

## Recipe format

Recipes declare `local-data-workbench/recipe@1`, source path/name/format/fingerprint, timestamps, and an ordered `steps` array. They contain no source rows. If a source moves, its path can be edited in any text editor before reopening the recipe.

## Privacy and releases

The demo request log, selected-file privacy check, offline reload, complete native export, and package-notice checks are listed in [.factory/claims.json](.factory/claims.json). See the shipped [privacy notice](site/privacy/index.html), [terms](site/terms/index.html), MIT [license](LICENSE), and [third-party notices](THIRD_PARTY_NOTICES.md). Desktop bundles include the application license, Apache 2.0 license, and third-party notice file.

The visual system and generated-asset provenance are documented in [.factory/design.md](.factory/design.md).

The three-frame landing walkthrough is captured from the sample desktop UI with `npm run capture:walkthrough` while the app development server is running.
