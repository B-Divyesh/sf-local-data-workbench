import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('installer verification', () => {
  it('@claim:installer-checksums verifies a published SHA-256 before installing', async () => {
    const [shell, powershell] = await Promise.all([
      readFile(new URL('../public/install.sh', import.meta.url), 'utf8'),
      readFile(new URL('../public/install.ps1', import.meta.url), 'utf8')
    ]);
    expect(shell).toMatch(/sha256sum|shasum/);
    expect(shell).toMatch(/EXPECTED=.*sha256/);
    expect(shell).toContain('manifest.get("commit") == sys.argv[2]');
    expect(shell).toContain('manifest.get("version") == sys.argv[3]');
    expect(shell).not.toContain('/releases/latest/download');
    expect(shell).toMatch(/No installer is published/);
    expect(shell).toMatch(/unsigned/);
    expect(powershell).toMatch(/Get-FileHash/);
    expect(powershell).toMatch(/SHA256/);
    expect(powershell).toContain('$manifest.commit -ne $expectedCommit');
    expect(powershell).toContain('$manifest.version -ne $expectedVersion');
    expect(powershell).not.toContain('/releases/latest/download');
    expect(powershell).toMatch(/No Windows installer is published/);
    expect(powershell).toMatch(/unsigned/);
  });

  it('@regression:stale-shell-installer rejects a mismatched manifest before downloading an asset', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'local-data-workbench-stale-installer-'));
    try {
      await writeFile(join(directory, 'latest.json'), JSON.stringify({
        version: 'v0.1.9', commit: 'd456abfd26315cc15e9c4bcb13c1638243d13557',
        platforms: { linux: { url: 'https://example.invalid/stale.AppImage', sha256: '0'.repeat(64) } }
      }));
      expect(() => execFileSync('sh', ['public/install.sh'], {
        cwd: process.cwd(),
        env: { ...process.env, HOME: directory, XDG_BIN_HOME: join(directory, 'bin'), LDW_RELEASE_ROOT: `file://${directory}` },
        stdio: 'pipe'
      })).toThrow(/Release identity mismatch/);
      await expect(readFile(join(directory, 'bin', 'local-data-workbench.AppImage'))).rejects.toThrow();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('@claim:release-manifest-integrity @regression:flat-release-asset-names makes a complete SHA256SUMS check against the exact GitHub upload names', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'local-data-workbench-release-'));
    try {
      await writeFile(join(directory, 'Local Data Workbench_0.1.6_amd64.AppImage'), 'verified fixture\n');
      await writeFile(join(directory, 'Local Data Workbench_0.1.6_aarch64.dmg'), 'mac arm fixture\n');
      await writeFile(join(directory, 'Local Data Workbench_0.1.6_x64.dmg'), 'mac x64 fixture\n');
      await writeFile(join(directory, 'Local Data Workbench_0.1.6_x64-setup.exe'), 'windows fixture\n');
      execFileSync('sh', ['scripts/build-release-manifest.sh', directory, 'v0.1.6', 'candidate-commit', 'false', 'false'], { cwd: process.cwd(), stdio: 'pipe' });
      const sums = await readFile(join(directory, 'SHA256SUMS'), 'utf8');
      const latest = JSON.parse(await readFile(join(directory, 'latest.json'), 'utf8')) as { commit: string; signing: { macos: boolean; windows: boolean }; platforms: Record<string, { name: string; sha256: string; signed: boolean }> };
      expect(sums).not.toMatch(/SHA256SUMS|latest\.json/);
      expect(sums).toContain('Local.Data.Workbench_0.1.6_aarch64.dmg');
      expect((latest.platforms.linux as { name: string }).name).toBe('Local.Data.Workbench_0.1.6_amd64.AppImage');
      expect(() => execFileSync('sha256sum', ['-c', 'SHA256SUMS'], { cwd: directory, stdio: 'pipe' })).not.toThrow();
      expect(latest).toMatchObject({ commit: 'candidate-commit', signing: { macos: false, windows: false } });
      expect(Object.keys(latest.platforms)).toEqual(['linux', 'mac-arm64', 'mac-x64', 'windows']);
      expect(latest.platforms['mac-arm64']).toMatchObject({ signed: false, name: 'Local.Data.Workbench_0.1.6_aarch64.dmg' });
      expect(latest.platforms.windows).toMatchObject({ signed: false, name: 'Local.Data.Workbench_0.1.6_x64-setup.exe' });
      expect(Object.values(latest.platforms).every(({ sha256 }) => /^[0-9a-f]{64}$/.test(sha256))).toBe(true);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('@regression:release-workflow-provenance pins every package and its metadata to one immutable source revision', async () => {
    const workflow = await readFile(new URL('../.github/workflows/release.yml', import.meta.url), 'utf8');
    expect(workflow).toContain('Resolve the immutable release candidate');
    expect(workflow).toContain('VITE_BUILD_ID: ${{ needs.resolve-candidate.outputs.source_commit }}');
    expect(workflow).toContain('Source commit: $SOURCE_COMMIT');
    expect(workflow).toContain('test "$source_commit" = "$(git rev-parse origin/main)"');
    expect(workflow).toContain('test "$RELEASE_TAG" = "v$package_version"');
    expect(workflow).toContain('test "$package_version" = "$tauri_version"');
    expect(workflow).toContain('test "$package_version" = "$cargo_version"');
    expect(workflow).toContain('test "$tag_commit" = "$SOURCE_COMMIT"');
    expect(workflow).toContain('SHA256SUMS and latest.json describe every published asset');
    expect(workflow).toContain('needs.build-macos.result == \'success\'');
    expect(workflow).toContain('needs.build-windows.result == \'success\'');
  });

  it('@regression:macos-unsigned-environment removes empty Apple signing variables before bundling', async () => {
    const workflow = await readFile(new URL('../.github/workflows/release.yml', import.meta.url), 'utf8');
    expect(workflow).toContain('codesign --verify --deep --strict');
    expect(workflow).toContain('spctl --assess --type open');
    expect(workflow).toContain('signtool verify /pa /all /v');
    expect(workflow).toContain("macOS signing: unsigned (approved operator-certificate deviation for this release)");
    expect(workflow).toContain("Windows signing: unsigned (approved operator-certificate deviation for this release)");
    expect(workflow).toContain('unset APPLE_CERTIFICATE APPLE_CERTIFICATE_PASSWORD APPLE_SIGNING_IDENTITY');
    expect(workflow).not.toContain("if: needs.signing-readiness.outputs.macos == 'true'\n    strategy");
  });
});
