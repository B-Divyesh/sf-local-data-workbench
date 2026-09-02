# Desktop signing deviation — version 0.1.13

Status: approved for this release by work order `local-data-workbench-repair-9`
on 2026-09-02 UTC.

The controller required either resolved desktop signing or a documented approved
deviation. The repository has no Apple or Windows signing secrets available, so
version 0.1.13 ships unsigned macOS and Windows packages. Linux is not assigned
a code-signing claim.

This deviation is narrow:

- Release notes and download links label unsigned packages before download.
- `latest.json` records `signed: false` for each affected platform.
- `SHA256SUMS` and GitHub asset digests cover every package.
- The one-line installers verify the pinned release, source commit, and SHA-256.
- The workflow will sign and verify automatically when the operator provides
  the certificate secrets listed in `.factory/handoff.md`.

The deviation does not claim that a checksum replaces platform code signing.
It expires after version 0.1.13 and must be reviewed for the next release.
