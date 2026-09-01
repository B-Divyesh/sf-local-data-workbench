import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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
    expect(shell).toMatch(/No installer is published/);
    expect(shell).toMatch(/unsigned/);
    expect(powershell).toMatch(/Get-FileHash/);
    expect(powershell).toMatch(/SHA256/);
    expect(powershell).toMatch(/No Windows installer is published/);
    expect(powershell).toMatch(/unsigned/);
  });

  it('@claim:release-manifest-integrity makes a complete SHA256SUMS check without a self-entry', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'local-data-workbench-release-'));
    try {
      const appImageDirectory = join(directory, 'appimage');
      const macArmDirectory = join(directory, 'mac-arm');
      const macX64Directory = join(directory, 'mac-x64');
      const windowsDirectory = join(directory, 'windows');
      await mkdir(appImageDirectory);
      await Promise.all([mkdir(macArmDirectory), mkdir(macX64Directory), mkdir(windowsDirectory)]);
      await writeFile(join(appImageDirectory, 'Local Data Workbench_0.1.6_amd64.AppImage'), 'verified fixture\n');
      await writeFile(join(macArmDirectory, 'Local Data Workbench_0.1.6_aarch64.dmg'), 'mac arm fixture\n');
      await writeFile(join(macX64Directory, 'Local Data Workbench_0.1.6_x64.dmg'), 'mac x64 fixture\n');
      await writeFile(join(windowsDirectory, 'Local Data Workbench_0.1.6_x64-setup.exe'), 'windows fixture\n');
      execFileSync('sh', ['scripts/build-release-manifest.sh', directory, 'v0.1.6', 'candidate-commit', 'false', 'false'], { cwd: process.cwd(), stdio: 'pipe' });
      const sums = await readFile(join(directory, 'SHA256SUMS'), 'utf8');
      const latest = JSON.parse(await readFile(join(directory, 'latest.json'), 'utf8')) as { commit: string; signing: { macos: boolean; windows: boolean }; platforms: Record<string, { name: string; sha256: string; signed: boolean }> };
      expect(sums).not.toMatch(/SHA256SUMS|latest\.json/);
      expect(sums).toContain('Local.Data.Workbench_0.1.6_amd64.AppImage');
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

  it('@claim:release-candidate-provenance pins every package and its metadata to one immutable source revision', async () => {
    const workflow = await readFile(new URL('../.github/workflows/release.yml', import.meta.url), 'utf8');
    expect(workflow).toContain('Resolve the immutable release candidate');
    expect(workflow).toContain('VITE_BUILD_ID: ${{ needs.resolve-candidate.outputs.source_commit }}');
    expect(workflow).toContain('Source commit: $SOURCE_COMMIT');
    expect(workflow).toContain('test "$tag_commit" = "$SOURCE_COMMIT"');
    expect(workflow).toContain('SHA256SUMS and latest.json describe every published asset');
    expect(workflow).toContain('needs.build-macos.result == \'success\'');
    expect(workflow).toContain('needs.build-windows.result == \'success\'');
  });

  it('@regression:release-workflow publishes honest unsigned packages when operator certificates are unavailable', async () => {
    const workflow = await readFile(new URL('../.github/workflows/release.yml', import.meta.url), 'utf8');
    expect(workflow).toContain('codesign --verify --deep --strict');
    expect(workflow).toContain('spctl --assess --type open');
    expect(workflow).toContain('signtool verify /pa /all /v');
    expect(workflow).toContain("macOS signing: unsigned (operator certificate unavailable)");
    expect(workflow).toContain("Windows signing: unsigned (operator certificate unavailable)");
    expect(workflow).not.toContain("if: needs.signing-readiness.outputs.macos == 'true'\n    strategy");
  });
});
