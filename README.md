# Local Data Workbench

Local Data Workbench is a private desktop tool for analysts and engineers who need to inspect or reshape large CSV, JSON, JSON Lines, or Parquet files without uploading them or writing a throwaway script.

The durable output is a portable `.ldw.json` recipe: named, ordered filters, derived columns, renames, selections, and local joins that can be reopened to reproduce a complete CSV or JSON Lines export.

## What v0.1 does

- Streams CSV and JSON Lines; reads Parquet locally with Apache Arrow's Rust reader.
- Profiles up to 100,000 rows with bounded distinct counters and displays a 100-row preview.
- Handles ordinary JSON arrays up to 256 MB and gives a clear JSON Lines migration message for larger files.
- Applies named transformations to the full source during export.
- Stores no source data in a cloud service and includes no telemetry.
- Saves versioned, readable recipe JSON with a source fingerprint.

The free desk includes inspection, transformations, CSV export, recipe reopening, and three saved recipes. A $29 one-time license unlocks unlimited saved recipes, local joins, and JSON Lines export through the Sociobot billing API. Accessibility and CSV export are never gated.

## Develop

Prerequisites: Node 22+, Rust stable, and the [Tauri 2 system dependencies](https://v2.tauri.app/start/prerequisites/) for your operating system.

```sh
npm ci
npm run dev          # browser workbench fallback on :1420
npm run dev:site     # landing site on :5173
npm run tauri dev    # native desktop app
```

Browser development mode supports bounded CSV/JSON preview. Parquet, full-file export, native file dialogs, joins, and recipe reopening use the Rust desktop core.

## Test and build

```sh
npm test             # TypeScript + Rust engine tests
npm run test:e2e     # Chromium desktop and 390px accessibility flows
npm run build        # dist/app and dist/site
npm run build:site   # exact static deploy output: dist/site
npm run tauri build  # current-platform desktop bundle
```

The static factory deploy publishes `dist/site` (with `index.html` at that root). GitHub Actions builds unsigned `.dmg`, `.msi`/`.exe`, `.AppImage`, `.deb`, and `.rpm` assets on tagged releases.

## Install

The landing page detects the visitor's operating system and resolves assets from the latest release manifest.

```sh
curl -fsSL https://local-data-workbench.sociobot.in/install.sh | sh
```

```powershell
irm https://local-data-workbench.sociobot.in/install.ps1 | iex
```

Both installers verify SHA-256 before opening or installing the downloaded artifact. Preview binaries are unsigned; macOS users must right-click → Open, and Windows may show SmartScreen.

## Recipe format

Recipes declare `local-data-workbench/recipe@1`, source path/name/format/fingerprint, timestamps, and an ordered `steps` array. They contain no source rows. If a source moves, its path can be edited in any text editor before reopening the recipe.

## Privacy and licenses

File contents, names, profiles, recipes, and outputs remain local. Paid-license verification sends only the license token to `api.sociobot.in` at most once per day. See the shipped [privacy notice](site/privacy/index.html), [terms](site/terms/index.html), MIT [license](LICENSE), and [third-party notices](THIRD_PARTY_NOTICES.md).

The visual system and generated-asset provenance are documented in [.factory/design.md](.factory/design.md).
