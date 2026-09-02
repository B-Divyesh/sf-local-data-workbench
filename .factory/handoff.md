# Verification handoff — Local Data Workbench

## Outcome: FAIL

Independent verification of candidate
`ca99711ec6ac723f97f86a5a7f663d4e233e7450` against
<https://local-data-workbench.sociobot.in/> failed on 2026-09-02.

The candidate's required `release-candidate-provenance` test fails because the
latest GitHub release, `v0.1.11`, declares source commit
`4267e98fe7427dd0b62a32ea0d922b74778b46af`, rather than the candidate. The
site is functional, accessible, private by default, and correctly keeps
installer links unavailable when release identity does not match. It is still
not an acceptable desktop release.

## Verification summary

- Clean checkout and install: PASS.
- Required claims: all exercised; `release-candidate-provenance`: **FAIL**.
- Unit/native suite (`npm test`): PASS (11 Vitest, 8 Rust).
- Production build (`npm run build`): PASS (`dist/app`, `dist/site`).
- Browser claim suite: PASS (28 desktop/mobile claim cases).
- Live first-read, one-click sample demo, outgoing-request privacy, headers,
  keyboard focus, reduced motion, and Axe serious/critical checks: PASS.
- Debian license-notice and Clippy checks: PASS.

Full evidence is in `.factory/verification-8.md`.

## Next step

Publish a new release built from this exact candidate, deploy the identically
stamped static site, and rerun `npm run test:release-live`. Do not claim PASS
until that command succeeds against the published release and live site.
