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
    expect(shell).toMatch(/No verified installer is published/);
    expect(powershell).toMatch(/Get-FileHash/);
    expect(powershell).toMatch(/SHA256/);
    expect(powershell).toMatch(/No verified Windows installer is published/);
    expect(`${shell}\n${powershell}`).not.toMatch(/unsigned|SmartScreen/i);
  });

  it('@claim:release-manifest-integrity makes a complete SHA256SUMS check without a self-entry', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'local-data-workbench-release-'));
    try {
      const appImageDirectory = join(directory, 'appimage');
      await mkdir(appImageDirectory);
      await writeFile(join(appImageDirectory, 'Local Data Workbench_0.1.6_amd64.AppImage'), 'verified fixture\n');
      execFileSync('sh', ['scripts/build-release-manifest.sh', directory, 'v0.1.6', 'candidate-commit', 'false', 'false'], { cwd: process.cwd(), stdio: 'pipe' });
      const sums = await readFile(join(directory, 'SHA256SUMS'), 'utf8');
      const latest = JSON.parse(await readFile(join(directory, 'latest.json'), 'utf8')) as { commit: string; signing: { macos: boolean; windows: boolean }; platforms: Record<string, unknown> };
      expect(sums).not.toMatch(/SHA256SUMS|latest\.json/);
      expect(sums).toContain('Local.Data.Workbench_0.1.6_amd64.AppImage');
      expect((latest.platforms.linux as { name: string }).name).toBe('Local.Data.Workbench_0.1.6_amd64.AppImage');
      expect(() => execFileSync('sha256sum', ['-c', 'SHA256SUMS'], { cwd: directory, stdio: 'pipe' })).not.toThrow();
      expect(latest).toMatchObject({ commit: 'candidate-commit', signing: { macos: false, windows: false } });
      expect(Object.keys(latest.platforms)).toEqual(['linux']);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('@claim:release-candidate-provenance publishes immutable source revision and signed-only assets', async () => {
    const workflow = await readFile(new URL('../.github/workflows/release.yml', import.meta.url), 'utf8');
    expect(workflow).toContain('VITE_BUILD_ID: ${{ github.sha }}');
    expect(workflow).toContain('Build commit: $GITHUB_SHA');
    expect(workflow).toContain('macOS signing: verified');
    expect(workflow).toContain('Windows signing: verified');
    expect(workflow).toContain('needs.build-macos.result == \'success\'');
    expect(workflow).toContain('needs.build-windows.result == \'success\'');
  });

  it('@regression:release-workflow verifies OS signatures before publishing optional assets', async () => {
    const workflow = await readFile(new URL('../.github/workflows/release.yml', import.meta.url), 'utf8');
    expect(workflow).toContain('codesign --verify --deep --strict');
    expect(workflow).toContain('spctl --assess --type open');
    expect(workflow).toContain('signtool verify /pa /all /v');
    expect(workflow).not.toContain('Preview builds are unsigned');
  });
});
