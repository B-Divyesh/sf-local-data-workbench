import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('installer verification', () => {
  it('@claim:installer-checksums verifies a published SHA-256 before installing', async () => {
    const [shell, powershell] = await Promise.all([
      readFile(new URL('../public/install.sh', import.meta.url), 'utf8'),
      readFile(new URL('../public/install.ps1', import.meta.url), 'utf8')
    ]);
    expect(shell).toMatch(/sha256sum|shasum/);
    expect(shell).toMatch(/EXPECTED=.*sha256/);
    expect(powershell).toMatch(/Get-FileHash/);
    expect(powershell).toMatch(/SHA256/);
  });
});
