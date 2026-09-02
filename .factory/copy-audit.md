# Landing copy audit — 2026-09-02

Source: `site/index.html`. Counts exclude punctuation, code, and the generated
release version. Every sentence is at most 22 words. The landing page contains
no banned plain-words terms.

| Copy | Words | Result |
| --- | ---: | --- |
| Local desktop app | 3 | pass |
| Inspect local data files. | 4 | pass |
| For analysts and engineers who need to reshape CSV, JSON, or Parquet files without writing a one-off script. | 18 | pass |
| Try it with sample data | 6 | pass |
| Opens an isolated sample project. | 5 | pass |
| Checking desktop downloads | 3 | pass |
| Files stay on your device. | 5 | pass |
| Works offline after the first visit. | 6 | pass |
| Free. No account needed. | 4 | pass |
| Sample opens in one click | 5 | pass |
| Sample data stays in the page | 6 | pass |
| Recipes are JSON files | 4 | pass |
| Downloads match this build | 4 | pass |
| Every package shows its checksum and signing status. | 8 | pass |
| macOS and Windows may be unsigned until operator certificates are available. | 10 | pass |
| Turn a source file into a repeatable result. | 9 | pass |
| Open a file, name each change, and save the recipe beside your output. | 14 | pass |
| Read CSV, JSON/JSONL, and Parquet directly from disk. | 8 | pass |
| See inferred types, missing values, distinct counts, ranges, total rows, and a source fingerprint. | 14 | pass |
| Filter, clean, rename, and select through explicit recipe steps. | 9 | pass |
| Save a readable .ldw.json recipe and reopen it for the same source. | 11 | pass |
| Keep each transformation in a JSON recipe. | 8 | pass |
| Every step has a name, inputs, and a fixed position. | 11 | pass |
| The JSON recipe carries a source fingerprint and schema version for review and replay. | 14 | pass |
| Readable, diffable JSON | 3 | pass |
| Source identity and format | 4 | pass |
| Ordered transformation docket | 3 | pass |
| Portable recipe file | 3 | pass |
| Test local file work before you rely on it. | 10 | pass |
| The browser-workbench check opens, filters, and exports a selected fixture without a request to another origin. | 15 | pass |
| Use every local tool for free. | 6 | pass |
| Inspect files, join reference data, save recipes, reopen them, and export CSV or JSON Lines. | 15 | pass |
| Free | 1 | pass |
| No account needed | 3 | pass |
| This release has no checkout, license token, or locked data tool. | 11 | pass |
| macOS packages are being published. | 5 | pass |
| Windows packages are being published. | 5 | pass |
| Signing status loads with the release. | 6 | pass |
| The installer checks the release version, source commit, and SHA-256 before installing. | 12 | pass |
| See the sample project in three steps. | 8 | pass |
| The desktop app shows five monthly orders with source details, a preview table, and column profiles. | 15 | pass |
| Monthly orders appears with types and totals. | 7 | pass |
| The desktop app filter dialog names a step that keeps orders whose status is shipped. | 14 | pass |
| Keep only completed rows with a named step. | 9 | pass |
| The desktop app shows three filtered orders and confirms the CSV export in its status bar. | 15 | pass |
| Download the transformed sample without touching a real file. | 9 | pass |
| It opens, filters, and exports a selected fixture while recording no request to another origin. | 14 | pass |
| Its SHA-256 checksum is published, but no macOS or Windows signature is claimed. | 14 | pass |
| The release card states the current signing status. | 9 | pass |
| Every desktop installer includes the MIT application license, third-party notices, and the Apache 2.0 notice for the Arrow Parquet dependency. | 21 | pass |
| Inspect and reshape local data files with saved recipes. | 9 | pass |

Dynamic release text is intentionally limited to release version, immutable
source revision, installer filename, checksum availability, and an explicit
signed or unsigned package status.

## Terminology

| Concept | One term used |
| --- | --- |
| Input | source file |
| Ordered changes | recipe |
| Result | output / export |
| Sample mode | demo / sample project |
| Included product | free release |
| Data summary | profile |
