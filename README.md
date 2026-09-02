# Local Data Workbench

Local Data Workbench is a desktop tool for analysts and engineers who need to inspect or reshape CSV, JSON, JSON Lines, or Parquet files without writing a throwaway script.

Use the one-click [sample demo](https://local-data-workbench.sociobot.in/demo/) to filter monthly orders and export a sample CSV without touching a real file.

## What it does

- Opens local CSV, JSON, JSON Lines, and Parquet files.
- Profiles columns and provides named filters, derived columns, renames, and selections.
- Saves readable `.ldw.json` recipes with source fingerprints.
- Exports the complete native source; the browser fallback labels its 100-row limit before export.

The free desk includes inspection, transformations, CSV export, recipe reopening, and three saved recipes. Paid access is withheld until signed macOS and Windows installers are verifiably available.

## Develop

Prerequisites: Node 22+, Rust stable, and the [Tauri 2 system dependencies](https://v2.tauri.app/start/prerequisites/) for your operating system.

```sh
npm ci
npm run dev          # browser workbench fallback on :1420
npm run dev:site     # landing site on :5173
npm run tauri dev    # native desktop app
```

Browser development mode supports a bounded CSV/JSON preview. Parquet, complete-file export, native file dialogs, and recipe reopening use the Rust desktop core.

## Test and build

```sh
npm test             # TypeScript + Rust engine tests
npm run test:e2e     # Chromium desktop and 390px accessibility flows
npm run build        # dist/app and dist/site
npm run build:site   # exact static deploy output: dist/site
npm run tauri build  # current-platform desktop bundle
npm run test:bundle-notices # builds a Debian bundle and checks its notices
```

The static factory deploy publishes `dist/site`, with `index.html` at its root. Check out a released candidate in an isolated worktree. Build it with `sh scripts/build-site-candidate.sh <40-character-commit> <output-directory>`. The command refuses a mismatched checkout and verifies the embedded revision before deployment. GitHub Actions builds Linux, macOS, and Windows packages from the tagged commit. macOS and Windows packages are signed only when the operator supplies the required certificates. Otherwise they are published as unsigned and labelled that way. Release builds receive the immutable Git commit as `VITE_BUILD_ID`. The app and site footer display it.

## Install

The landing page detects the visitor's operating system and resolves assets from the latest release manifest.

```sh
curl -fsSL https://local-data-workbench.sociobot.in/install.sh | sh
```

The Linux installer verifies SHA-256 before installing the downloaded AppImage. The macOS and Windows installers also verify SHA-256. They print an explicit warning if their package is unsigned. The manifest is delivered over HTTPS and is not cryptographically signed.

## Recipe format

Recipes declare `local-data-workbench/recipe@1`, source path/name/format/fingerprint, timestamps, and an ordered `steps` array. They contain no source rows. If a source moves, its path can be edited in any text editor before reopening the recipe.

## Privacy and releases

The demo request log, selected-file privacy check, offline reload, complete native export, and package-notice checks are listed in [.factory/claims.json](.factory/claims.json). See the shipped [privacy notice](site/privacy/index.html), [terms](site/terms/index.html), MIT [license](LICENSE), and [third-party notices](THIRD_PARTY_NOTICES.md). Desktop bundles include the application license, Apache 2.0 license, and third-party notice file.

The visual system and generated-asset provenance are documented in [.factory/design.md](.factory/design.md).
