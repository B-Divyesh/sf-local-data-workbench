# Landing copy audit — 2026-09-01

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
| Download the desktop app | 5 | pass |
| Sample opens in one click | 5 | pass |
| Sample data stays in the page | 6 | pass |
| Recipes are JSON files | 4 | pass |
| Linux build available | 3 | pass |
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
| Use the free local workbench today. | 7 | pass |
| Inspect files, transform rows, save three recipes, reopen recipes, and export CSV without a paid license. | 16 | pass |
| Paid access paused | 3 | pass |
| No checkout or license verification is offered until signed macOS and Windows installers are verified. | 15 | pass |
| Linux builds are available. | 4 | pass |
| macOS and Windows downloads stay withheld until signed installers are verified. | 11 | pass |
| Signed macOS installers are not available yet. | 7 | pass |
| Signed Windows installers are not available yet. | 7 | pass |
| The installer verifies SHA-256 before placing the AppImage in ~/.local/bin. | 10 | pass |
| See the sample project in three steps. | 8 | pass |
| Monthly orders appears with types and totals. | 7 | pass |
| Keep only completed rows with a named step. | 9 | pass |
| Download the transformed sample without touching a real file. | 9 | pass |
| It opens, filters, and exports a selected fixture while recording no request to another origin. | 14 | pass |
| They are withheld until their installers are signed and the release workflow verifies those signatures. | 15 | pass |
| Every desktop installer includes the MIT application license, third-party notices, and the Apache 2.0 notice for the Arrow Parquet dependency. | 21 | pass |
| Inspect and reshape local data files with saved recipes. | 9 | pass |

Dynamic release text is intentionally limited to release version, immutable
source revision, installer filename, and checksum availability.

## Terminology

| Concept | One term used |
| --- | --- |
| Input | source file |
| Ordered changes | recipe |
| Result | output / export |
| Sample mode | demo / sample project |
| Free product | free desk |
| Data summary | profile |
