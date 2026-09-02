import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const candidateBuild = 'scripts/build-site-candidate.sh';
const currentCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const differentCommit = execFileSync('git', ['rev-parse', 'HEAD^'], { encoding: 'utf8' }).trim();

describe('static deployment identity', () => {
  it('@regression:stale-static-deployment refuses to label a site built from another checkout as the requested candidate', () => {
    expect(() => execFileSync('sh', [candidateBuild, differentCommit], { cwd: process.cwd(), stdio: 'pipe' })).toThrow();
  });

  it('@regression:stale-static-deployment embeds the exact checked-out candidate revision in an isolated site artifact', async () => {
    const outputDirectory = await mkdtemp(join(tmpdir(), 'local-data-workbench-site-'));
    try {
      execFileSync('sh', [candidateBuild, currentCommit, outputDirectory], { cwd: process.cwd(), stdio: 'pipe' });
      const assetFiles = await readdir(join(outputDirectory, 'assets'));
      const bundles = await Promise.all(assetFiles.filter((name) => name.endsWith('.js')).map((name) => readFile(join(outputDirectory, 'assets', name), 'utf8')));
      expect(bundles.some((bundle) => bundle.includes(currentCommit))).toBe(true);
      await expect(readFile(join(outputDirectory, 'index.html'), 'utf8')).resolves.toContain('/assets/');
      for (const installer of ['install.sh', 'install.ps1']) {
        const contents = await readFile(join(outputDirectory, installer), 'utf8');
        expect(contents).toContain(currentCommit);
        expect(contents).toContain('v0.1.10');
        expect(contents).not.toContain('__LDW_');
        expect(contents).not.toContain('/releases/latest/download');
      }
    } finally {
      await rm(outputDirectory, { recursive: true, force: true });
    }
  });
});
