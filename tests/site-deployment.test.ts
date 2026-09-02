import { appendFile, mkdtemp, readFile, readdir, rm, symlink } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const candidateBuild = 'scripts/build-site-candidate.sh';
const currentCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const differentCommit = execFileSync('git', ['rev-parse', 'HEAD^'], { encoding: 'utf8' }).trim();

async function cleanWorktree(): Promise<{ directory: string; remove: () => Promise<void> }> {
  const parent = await mkdtemp(join(tmpdir(), 'local-data-workbench-checkout-'));
  const directory = join(parent, 'candidate');
  execFileSync('git', ['worktree', 'add', '--detach', directory, currentCommit], { cwd: process.cwd(), stdio: 'pipe' });
  await symlink(resolve('node_modules'), join(directory, 'node_modules'), 'dir');
  return {
    directory,
    remove: async () => {
      execFileSync('git', ['worktree', 'remove', '--force', directory], { cwd: process.cwd(), stdio: 'pipe' });
      await rm(parent, { recursive: true, force: true });
    }
  };
}

describe('static deployment identity', () => {
  it('@regression:stale-static-deployment refuses to label a site built from another checkout as the requested candidate', () => {
    expect(() => execFileSync('sh', [candidateBuild, differentCommit], { cwd: process.cwd(), stdio: 'pipe' })).toThrow();
  });

  it('@regression:verification-9-unavailable-candidate refuses a source revision that is not a real Git object', () => {
    expect(() => execFileSync('sh', [candidateBuild, '6db1a5e829037728a2c124c83f390fbb9235e350'], { cwd: process.cwd(), stdio: 'pipe' }))
      .toThrow(/unknown revision|Needed a single revision|not a valid object name/);
  });

  it('@regression:verification-9-dirty-candidate refuses to stamp uncommitted source as an immutable revision', async () => {
    const worktree = await cleanWorktree();
    try {
      await appendFile(join(worktree.directory, 'site/index.html'), '\n<!-- uncommitted candidate change -->\n');
      expect(() => execFileSync('sh', [candidateBuild, currentCommit], { cwd: worktree.directory, stdio: 'pipe' }))
        .toThrow(/source changes outside/);
    } finally {
      await worktree.remove();
    }
  });

  it('@claim:static-deploy-artifact @regression:stale-static-deployment embeds the exact checked-out candidate revision in an isolated site artifact', async () => {
    const worktree = await cleanWorktree();
    const outputDirectory = await mkdtemp(join(tmpdir(), 'local-data-workbench-site-'));
    try {
      execFileSync('sh', [candidateBuild, currentCommit, outputDirectory], { cwd: worktree.directory, stdio: 'pipe' });
      const assetFiles = await readdir(join(outputDirectory, 'assets'));
      const bundles = await Promise.all(assetFiles.filter((name) => name.endsWith('.js')).map((name) => readFile(join(outputDirectory, 'assets', name), 'utf8')));
      expect(bundles.some((bundle) => bundle.includes(currentCommit))).toBe(true);
      await expect(readFile(join(outputDirectory, 'index.html'), 'utf8')).resolves.toContain('/assets/');
      const demoHtml = await readFile(join(outputDirectory, 'demo', 'index.html'), 'utf8');
      const demoModule = demoHtml.match(/src="(\/assets\/[^\"]+\.js)"/)?.[1];
      const serviceWorker = await readFile(join(outputDirectory, 'sw.js'), 'utf8');
      expect(demoModule).toBeDefined();
      expect(serviceWorker).toContain(demoModule!);
      expect(serviceWorker).toContain('if (SHELL.includes(url.pathname))');
      expect(serviceWorker).toContain("if (event.request.mode === 'navigate')");
      for (const installer of ['install.sh', 'install.ps1']) {
        const contents = await readFile(join(outputDirectory, installer), 'utf8');
        expect(contents).toContain(currentCommit);
        expect(contents).toContain('v0.1.13');
        expect(contents).not.toContain('__LDW_');
        expect(contents).not.toContain('/releases/latest/download');
      }
    } finally {
      await worktree.remove();
      await rm(outputDirectory, { recursive: true, force: true });
    }
  });
});
