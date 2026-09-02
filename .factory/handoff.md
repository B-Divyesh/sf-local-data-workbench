# Verification handoff — Local Data Workbench

## Outcome

**FAIL — candidate `6db1a5e829037728a2c124c83f390fbb9235e350`
must not be accepted or released.**

Independent QA was performed on 2026-09-02 UTC for work order
`local-data-workbench-verify-9` against
<https://local-data-workbench.sociobot.in/>. Full evidence is in
[`.factory/verification-9.md`](verification-9.md).

## Release blockers

1. The requested candidate does not exist in the supplied Git object database
   or on GitHub. Direct fetch fails with `upload-pack: not our ref`; the GitHub
   commit API returns HTTP 422 “No commit found.” A clean candidate checkout,
   claim run, and production build are therefore impossible.
2. Live HTML and installers identify `6db1a5e…`, but GitHub `main`, tag
   `v0.1.12`, release notes, `latest.json`, checksums, and every desktop package
   identify `898a6accd207973dd44dd517ca244bb9c31d0580`.
3. The live Linux installer exits 1 with “Release identity mismatch” before it
   downloads a package. The landing page correctly offers no candidate
   download, so the desktop product is not installable.
4. The mandatory control claim `release-candidate-provenance` fails. The
   requested candidate's claim gate cannot start because the SHA is absent.
5. The brief's signed desktop requirement remains unmet: the only published
   macOS and Windows packages belong to the older revision and are unsigned.
6. Several README claims are not registered in `.factory/claims.json`, and the
   required three-to-five-frame desktop screenshot walkthrough is absent.

## What was verified

The requested commit was unavailable, so functional control checks used a
fresh detached clone of the only published revision, `898a6ac…`. Results:

- Claims: 25/26 passed; `release-candidate-provenance` failed.
- `npm test`: PASS — 15 Vitest and 8 Rust tests.
- `npm run test:e2e`: PASS — 36/36 desktop and 390 px cases.
- TypeScript, Rust format, Rust Clippy, npm audit, and `npm run build`: PASS.
- Debian bundle-notice build: PASS.
- First-read and one-click sample-data gates: PASS.
- Live demo filter/export/reset and local app invalid-input recovery: PASS.
- Live privacy request log and selected-fixture local-only flow: PASS.
- Live service-worker update and offline landing/demo reload: PASS.
- Axe serious/critical findings: zero across all public routes at both widths.
- Keyboard, focus return, 44 px targets, reduced motion, and 200% text smoke:
  PASS.
- Lighthouse mobile: 100 performance, 100 accessibility, 100 best practices,
  100 SEO; LCP 1,067 ms; CLS 0; TBT 66.5 ms.
- Security headers and caching: PASS; initial live JS is 5,481 bytes raw and
  CSS is 12,718 bytes.
- Published `898a6ac…` Debian checksum and bundled license notices: PASS, but
  this package is not the candidate.

Every served live file is byte-identical to a build of published `898a6ac…`
with `VITE_BUILD_ID` manually overridden to the unavailable `6db1a5e…`. The
visible footer is therefore not proof that candidate source was built.

## Reproduce the decisive failures

```sh
git fetch https://github.com/B-Divyesh/sf-local-data-workbench.git \
  6db1a5e829037728a2c124c83f390fbb9235e350

npm run test:release-live

tmp_dir=$(mktemp -d)
curl -fsSL https://local-data-workbench.sociobot.in/install.sh -o "$tmp_dir/install.sh"
XDG_BIN_HOME="$tmp_dir/bin" sh "$tmp_dir/install.sh"
```

Expected current results: Git fetch exits 128; the release claim exits 1; the
installer exits 1 without installing a file.

## Required next steps

1. Push the actual candidate commit.
2. Publish a new version whose tag, notes, manifest, checksums, packages,
   installers, and live site all identify that same immutable commit.
3. Rerun every `.factory/claims.json` command and `npm run test:release-live`
   from a clean candidate checkout.
4. Resolve signing or record an explicitly approved brief deviation.
5. Register the remaining README claims and add the desktop screenshot
   walkthrough.

No product code, deployment, DNS, billing, secrets, or infrastructure was
modified during this verification.
