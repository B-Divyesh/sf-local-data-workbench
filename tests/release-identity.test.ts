import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
// The production verifier is a plain Node module so the same assertions run
// without a TypeScript loader in `npm run test:release-live`.
// @ts-expect-error The runtime module intentionally has no declaration file.
import { assertPublishedSite, assertReleaseContract } from '../scripts/release-contract.mjs';

const current = 'ca99711ec6ac723f97f86a5a7f663d4e233e7450';
const stale = '4267e98fe7427dd0b62a32ea0d922b74778b46af';
const unavailable = '6db1a5e829037728a2c124c83f390fbb9235e350';
const tag = 'v0.1.13';
const packageName = 'Local.Data.Workbench_0.1.13_amd64.AppImage';
const digest = 'a'.repeat(64);

function fixture(commit = current) {
  return {
    release: {
      tag_name: tag,
      body: `Source commit: ${commit}`,
      assets: [
        { name: packageName, digest: `sha256:${digest}` },
        { name: 'Local.Data.Workbench_0.1.13_aarch64.dmg', digest: `sha256:${digest}` },
        { name: 'Local.Data.Workbench_0.1.13_x64.dmg', digest: `sha256:${digest}` },
        { name: 'Local.Data.Workbench_0.1.13_x64-setup.exe', digest: `sha256:${digest}` },
        { name: 'latest.json', digest: `sha256:${digest}` },
        { name: 'SHA256SUMS', digest: `sha256:${digest}` }
      ]
    },
    manifest: {
      version: tag,
      commit,
      platforms: {
        linux: entry(packageName),
        'mac-arm64': entry('Local.Data.Workbench_0.1.13_aarch64.dmg'),
        'mac-x64': entry('Local.Data.Workbench_0.1.13_x64.dmg'),
        windows: entry('Local.Data.Workbench_0.1.13_x64-setup.exe')
      }
    },
    sumsText: [
      packageName,
      'Local.Data.Workbench_0.1.13_aarch64.dmg',
      'Local.Data.Workbench_0.1.13_x64.dmg',
      'Local.Data.Workbench_0.1.13_x64-setup.exe'
    ].map((name) => `${digest}  ${name}`).join('\n'),
    taggedCommit: { sha: commit },
    expectedTag: tag,
    expectedCommit: current
  };
}

function entry(name: string) {
  return {
    name,
    sha256: digest,
    url: `https://github.com/B-Divyesh/sf-local-data-workbench/releases/download/${tag}/${name}`
  };
}

describe('published release identity', () => {
  it('@regression:release-candidate-provenance rejects the exact stale release-note failure from verification 8', () => {
    expect(() => assertReleaseContract(fixture(stale))).toThrow('Release notes do not identify this checkout.');
  });

  it('@regression:release-candidate-provenance rejects a tag that points away from the candidate', () => {
    const data = fixture();
    data.taggedCommit.sha = stale;
    expect(() => assertReleaseContract(data)).toThrow('Release tag does not identify this checkout.');
  });

  it('@regression:release-candidate-provenance accepts one identity across tag, notes, manifest, packages, and checksums', () => {
    expect(() => assertReleaseContract(fixture())).not.toThrow();
  });

  it('@regression:verification-9-live-stamp rejects the exact unavailable live revision split', () => {
    const live = {
      bundles: [`const version="0.1.13",build="${unavailable}"`],
      installers: [`EXPECTED_COMMIT="${unavailable}"\nEXPECTED_VERSION="${tag}"`]
    };
    expect(() => assertPublishedSite({ ...live, expectedCommit: current, expectedTag: tag, expectedVersion: '0.1.13' }))
      .toThrow('Live site does not identify this checkout.');
  });

  it('@regression:release-version-lock keeps package, desktop, and site versions aligned', async () => {
    const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')) as { version: string };
    const files = await Promise.all([
      readFile(new URL('../src-tauri/Cargo.toml', import.meta.url), 'utf8'),
      readFile(new URL('../src-tauri/tauri.conf.json', import.meta.url), 'utf8'),
      readFile(new URL('../vite.app.config.ts', import.meta.url), 'utf8'),
      readFile(new URL('../vite.site.config.ts', import.meta.url), 'utf8'),
      readFile(new URL('../src/app.ts', import.meta.url), 'utf8'),
      readFile(new URL('../site/main.ts', import.meta.url), 'utf8'),
      readFile(new URL('../site/demo.ts', import.meta.url), 'utf8')
    ]);
    for (const source of files) expect(source).toContain(packageJson.version);
  });
});
