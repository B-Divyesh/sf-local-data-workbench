import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const RELEASE_API = 'https://api.github.com/repos/B-Divyesh/sf-local-data-workbench/releases/latest';
const CANDIDATE = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const VERSION = '0.1.11';

async function mockRelease(page: Page, body: object = {
  tag_name: `v${VERSION}`, body: `Source commit: ${CANDIDATE}\nmacOS signing: unsigned (operator certificate unavailable)\nWindows signing: unsigned (operator certificate unavailable)`, assets: [
    { name: `Local.Data.Workbench_${VERSION}_amd64.AppImage`, digest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', browser_download_url: `https://github.com/B-Divyesh/sf-local-data-workbench/releases/download/v${VERSION}/Local.Data.Workbench_${VERSION}_amd64.AppImage` },
    { name: `Local.Data.Workbench_${VERSION}_aarch64.dmg`, digest: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', browser_download_url: `https://github.com/B-Divyesh/sf-local-data-workbench/releases/download/v${VERSION}/Local.Data.Workbench_${VERSION}_aarch64.dmg` },
    { name: `Local.Data.Workbench_${VERSION}_x64.dmg`, digest: 'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc', browser_download_url: `https://github.com/B-Divyesh/sf-local-data-workbench/releases/download/v${VERSION}/Local.Data.Workbench_${VERSION}_x64.dmg` },
    { name: `Local.Data.Workbench_${VERSION}_x64-setup.exe`, digest: 'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd', browser_download_url: `https://github.com/B-Divyesh/sf-local-data-workbench/releases/download/v${VERSION}/Local.Data.Workbench_${VERSION}_x64-setup.exe` },
    { name: 'latest.json', digest: 'sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', browser_download_url: `https://github.com/B-Divyesh/sf-local-data-workbench/releases/download/v${VERSION}/latest.json` },
    { name: 'SHA256SUMS', digest: 'sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff', browser_download_url: `https://github.com/B-Divyesh/sf-local-data-workbench/releases/download/v${VERSION}/SHA256SUMS` }
  ]
}): Promise<void> {
  await page.route(RELEASE_API, (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) }));
}

test('@claim:sample-demo landing page has a one-click isolated sample path', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await mockRelease(page);
  await page.goto('http://127.0.0.1:4173/');
  await expect(page).toHaveTitle(/Local Data Workbench/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Inspect local data files/);
  await expect(page.getByRole('link', { name: 'Try it with sample data' })).toHaveAttribute('href', '/demo/');
  await expect(page.locator('#primary-download')).toHaveAttribute('href', new RegExp(`releases/download/v${VERSION.replaceAll('.', '\\.')}/`));
  await expect(page.locator('#primary-download')).not.toHaveAttribute('aria-disabled');
  await expect(page.locator('.hero-facts')).toContainText('Files stay on your device.');
  await expect(page.locator('.hero-facts')).toContainText('Works offline after the first visit.');
  await expect(page.locator('.hero-facts')).toContainText('Free. No account needed.');
  const factBox = await page.locator('.hero-facts').boundingBox();
  expect(factBox && factBox.y + factBox.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  await expect(page.getByText('Sample data stays in the page', { exact: false }).first()).toBeVisible();
  await page.getByRole('link', { name: 'Try it with sample data' }).click();
  await expect(page.getByText('Demo — sample data, nothing is saved', { exact: false })).toBeVisible();
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? ''))).toEqual([]);
  expect(errors.filter((message) => !message.includes('WebSocket') && !message.includes('[vite] failed to connect'))).toEqual([]);
});

test('@regression:installer-command-regions @claim:installer-command-access installer command regions are labelled, keyboard-focusable, and have no Axe scroll finding', async ({ page }) => {
  await mockRelease(page);
  await page.goto('http://127.0.0.1:4173/');
  const command = page.getByRole('region', { name: 'Linux installer command' });
  await expect(command).toHaveAttribute('tabindex', '0');
  await command.focus();
  await expect(command).toBeFocused();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((item) => item.id === 'scrollable-region-focusable')).toEqual([]);
});

test('@claim:sample-export demo filters and exports only the selected sample rows', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/demo/');
  await page.locator('#status-filter').selectOption('shipped');
  await page.getByRole('button', { name: 'Apply filter' }).click();
  await expect(page.locator('#sample-rows tr')).toHaveCount(3);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export sample CSV' }).click();
  const file = await download;
  expect(await file.suggestedFilename()).toBe('monthly-orders-filtered.csv');
  const downloadedPath = await file.path();
  expect(downloadedPath).not.toBeNull();
  expect(await readFile(downloadedPath!, 'utf8')).toBe([
    '"order_id","region","status","amount"',
    '"1001","North","shipped","124.50"',
    '"1003","North","shipped","241.25"',
    '"1005","West","shipped","199.99"'
  ].join('\n'));
  await expect(page.getByRole('status')).toContainText('Exported 3 sample orders');
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.locator('#sample-rows tr')).toHaveCount(5);
  await expect(page.getByRole('status')).toContainText('Showing 5 sample orders');
});

test('@regression:numeric-profile-bounds browser profiles compare numeric values as numbers', async ({ page }) => {
  await page.goto('http://127.0.0.1:1420/');
  await page.locator('#browser-file').setInputFiles({
    name: 'numbers.csv', mimeType: 'text/csv', buffer: Buffer.from('amount\n2\n10\n100\n')
  });
  const profile = page.locator('.profile-item').filter({ hasText: 'amount' });
  await expect(profile).toContainText('Minimum2');
  await expect(profile).toContainText('Maximum100');
});

test('@claim:free-saved-recipes saving the same recipe again keeps one saved-recipe record', async ({ page }) => {
  await page.goto('http://127.0.0.1:1420/?demo=1');
  await expect(page.locator('#demo-banner')).toBeVisible();
  await page.getByRole('button', { name: 'Save recipe' }).click();
  await page.getByRole('button', { name: 'Save recipe' }).click();
  const keys = await page.evaluate(() => JSON.parse(localStorage.getItem('demo:ldw:saved-recipe-keys') ?? '[]'));
  expect(keys).toHaveLength(1);
});

test('@claim:demo-exit-discard leaving desktop demo removes its isolated storage', async ({ page }) => {
  await page.goto('http://127.0.0.1:1420/?demo=1');
  await page.evaluate(() => localStorage.setItem('demo:ldw:saved-recipe-keys', '["sample"]'));
  await page.getByRole('button', { name: 'Start for real' }).click();
  await expect(page).toHaveURL('http://127.0.0.1:1420/');
  expect(await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('demo:')))).toEqual([]);
});

test('@claim:touch-targets important mobile controls are at least 44 pixels tall', async ({ page }) => {
  await mockRelease(page);
  await page.goto('http://127.0.0.1:4173/');
  for (const control of ['.site-header .wordmark', '.site-header nav a', '#primary-download', '[data-platform="linux"]']) {
    const boxes = await page.locator(control).evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().toJSON()));
    for (const box of boxes) {
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
    }
  }
  for (const route of ['/privacy/', '/terms/']) {
    await page.goto(`http://127.0.0.1:4173${route}`);
    await page.locator('.skip-link').focus();
    for (const box of await page.locator('.skip-link, .legal a[href], .site-footer a[href]').evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().toJSON()))) {
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
    }
  }
  await page.goto('http://127.0.0.1:1420/');
  await page.locator('.skip-link').focus();
  const appSkip = await page.locator('.skip-link').boundingBox();
  expect(appSkip?.width).toBeGreaterThanOrEqual(44);
  expect(appSkip?.height).toBeGreaterThanOrEqual(44);
  expect((await page.locator('#add-step').boundingBox())?.width).toBeGreaterThanOrEqual(44);
});

test('@claim:included-desktop-tools @regression:named-join-path exposes joins and JSON Lines without a paid dead end', async ({ page }) => {
  await page.goto('http://127.0.0.1:1420/?demo=1');
  await expect(page.locator('#export-format')).toContainText('JSON Lines');
  await page.locator('#export-format').selectOption('jsonl');
  const exportDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export result' }).click();
  const exported = await exportDownload;
  expect(exported.suggestedFilename()).toBe('result.jsonl');
  const exportedPath = await exported.path();
  expect(exportedPath).not.toBeNull();
  expect((await readFile(exportedPath!, 'utf8')).split('\n')).toHaveLength(5);
  await page.getByRole('button', { name: 'Add recipe step' }).click();
  await page.locator('#step-kind').selectOption('join');
  await expect(page.getByRole('button', { name: 'Choose CSV or JSON join file' })).toBeVisible();
  await page.getByRole('button', { name: 'Choose CSV or JSON join file' }).click();
  await expect(page.locator('#step-error')).toHaveText('Joins require the desktop app.');
  await expect(page.locator('#license-dialog')).toHaveCount(0);
});

test('@regression:wordmark-accessible-name visible wordmark text is contained in its accessible name', async ({ page }) => {
  await mockRelease(page);
  await page.goto('http://127.0.0.1:4173/');
  const results = await new AxeBuilder({ page }).withRules(['label-content-name-mismatch']).analyze();
  expect(results.violations).toEqual([]);
});

test('@claim:build-identity built pages identify their version and source revision', async ({ page }) => {
  await mockRelease(page);
  await page.goto('http://127.0.0.1:4173/');
  await expect(page.locator('[data-build-id]').last()).not.toContainText('source checkout');
  await page.goto('http://127.0.0.1:1420/');
  await expect(page.locator('#build-id')).not.toContainText('source checkout');
  await expect(page.locator('#build-id')).toContainText(VERSION);
});

test('@claim:local-only-demo demo sends no third-party requests', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.goto('http://127.0.0.1:4173/demo/');
  await page.getByRole('button', { name: 'Apply filter' }).click();
  expect(requests.every((url) => new URL(url).origin === 'http://127.0.0.1:4173')).toBe(true);
});

test('@claim:offline-reload @regression:offline-demo-cold-landing landing and sample demo open from a cold cache offline', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await mockRelease(page);
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('http://127.0.0.1:4173/');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  expect(await page.evaluate(async () => caches.keys())).toEqual(['local-data-workbench-site-v4']);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Inspect local data files/);
  await page.goto('http://127.0.0.1:4173/demo/');
  await expect(page.locator('#sample-rows tr')).toHaveCount(5);
  await page.locator('#status-filter').selectOption('shipped');
  await page.getByRole('button', { name: 'Apply filter' }).click();
  await expect(page.locator('#sample-rows tr')).toHaveCount(3);
  expect(errors.filter((message) => !message.includes('WebSocket') && !message.includes('[vite] failed to connect'))).toEqual([]);
  await context.close();
});

test('@regression:browser-preview-export workbench describes bounded browser export honestly', async ({ page }) => {
  await page.goto('http://127.0.0.1:1420/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Inspect local/);
  await expect(page.locator('#access-badge')).toHaveText('All tools included');
  await expect(page.locator('#browser-file')).toHaveAttribute('tabindex', '-1');
  const source = ['name,status,amount', ...Array.from({ length: 101 }, (_, index) => `Order ${index + 1},keep,${index + 1}`)].join('\n');
  await page.locator('#browser-file').setInputFiles({ name: 'orders.csv', mimeType: 'text/csv', buffer: Buffer.from(source) });
  await expect(page.getByRole('columnheader', { name: 'name' })).toBeVisible();
  await expect(page.getByText('100 preview rows', { exact: true })).toBeVisible();
  await expect(page.getByText('Browser export includes only these preview rows', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Add recipe step' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.locator('#step-column').selectOption('amount');
  await page.locator('#step-operator').selectOption('greater_than');
  await page.locator('#step-value').fill('99');
  await page.getByRole('button', { name: 'Add to recipe' }).click();
  await expect(page.getByText('Keep matching rows', { exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Order 100' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Order 101' })).not.toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? ''))).toEqual([]);
});

test('@claim:local-workbench-privacy selected browser fixtures never make a cross-origin request', async ({ page }) => {
  const requests: { url: string; postData: string | null }[] = [];
  page.on('request', (request) => requests.push({ url: request.url(), postData: request.postData() }));
  await page.goto('http://127.0.0.1:1420/');
  await page.locator('#browser-file').setInputFiles({
    name: 'private-ledger.csv', mimeType: 'text/csv', buffer: Buffer.from('name,status\nprivate-amount,keep\n')
  });
  await page.getByRole('button', { name: 'Add recipe step' }).click();
  await page.locator('#step-column').selectOption('status');
  await page.locator('#step-value').fill('keep');
  await page.getByRole('button', { name: 'Add to recipe' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export result' }).click();
  await download;
  const documentRequests = requests.filter(({ url }) => new URL(url).protocol.startsWith('http'));
  expect(documentRequests.every(({ url }) => new URL(url).origin === 'http://127.0.0.1:1420')).toBe(true);
  expect(documentRequests.some(({ url, postData }) => url.includes('private-ledger') || (postData ?? '').includes('private-amount'))).toBe(false);
});

test('@claim:landing-network-privacy landing load has no behavioral-analytics request', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await mockRelease(page);
  await page.goto('http://127.0.0.1:4173/');
  expect(requests.every((url) => {
    const origin = new URL(url).origin;
    return origin === 'http://127.0.0.1:4173' || origin === 'https://api.github.com';
  })).toBe(true);
  expect(requests.some((url) => url.includes('analytics'))).toBe(false);
});

test('@claim:unlimited-saved-recipes saves a fourth unique recipe without a paid-access dead end', async ({ page }) => {
  await page.goto('http://127.0.0.1:1420/?demo=1');
  for (let index = 1; index <= 3; index += 1) {
    await page.locator('#browser-file').setInputFiles({
      name: `recipe-${index}.csv`, mimeType: 'text/csv', buffer: Buffer.from(`id,status\n${index},keep${'x'.repeat(index)}\n`)
    });
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Save recipe' }).click();
    await download;
  }
  await page.locator('#browser-file').setInputFiles({ name: 'recipe-four.csv', mimeType: 'text/csv', buffer: Buffer.from('id,status\n4444,keep-final\n') });
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save recipe' }).click();
  await download;
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('demo:ldw:saved-recipe-keys') ?? '[]'))).toHaveLength(4);
});

test('@claim:package-signing-disclosure unsigned macOS and Windows packages remain downloadable with an explicit status', async ({ page }) => {
  const releaseRoot = `https://github.com/B-Divyesh/sf-local-data-workbench/releases/download/v${VERSION}`;
  await mockRelease(page, {
    tag_name: `v${VERSION}`, body: `Source commit: ${CANDIDATE}\nmacOS signing: unsigned (operator certificate unavailable)\nWindows signing: unsigned (operator certificate unavailable)`, assets: [
      { name: `Local.Data.Workbench_${VERSION}_aarch64.dmg`, digest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', browser_download_url: `${releaseRoot}/Local.Data.Workbench_${VERSION}_aarch64.dmg` },
      { name: `Local.Data.Workbench_${VERSION}_x64.dmg`, digest: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', browser_download_url: `${releaseRoot}/Local.Data.Workbench_${VERSION}_x64.dmg` },
      { name: `Local.Data.Workbench_${VERSION}_x64-setup.exe`, digest: 'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc', browser_download_url: `${releaseRoot}/Local.Data.Workbench_${VERSION}_x64-setup.exe` },
      { name: `Local.Data.Workbench_${VERSION}_amd64.AppImage`, digest: 'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd', browser_download_url: `${releaseRoot}/Local.Data.Workbench_${VERSION}_amd64.AppImage` },
      { name: 'latest.json', digest: 'sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', browser_download_url: `${releaseRoot}/latest.json` },
      { name: 'SHA256SUMS', digest: 'sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff', browser_download_url: `${releaseRoot}/SHA256SUMS` }
    ]
  });
  await page.goto('http://127.0.0.1:4173/');
  await expect(page.locator('[data-platform="mac-arm64"]')).toHaveAttribute('href', `${releaseRoot}/Local.Data.Workbench_${VERSION}_aarch64.dmg`);
  await expect(page.locator('[data-platform="mac-x64"]')).toHaveAttribute('href', `${releaseRoot}/Local.Data.Workbench_${VERSION}_x64.dmg`);
  await expect(page.locator('[data-platform="windows"]')).toHaveAttribute('href', `${releaseRoot}/Local.Data.Workbench_${VERSION}_x64-setup.exe`);
  await expect(page.locator('[data-signing-status="macos"]')).toHaveText('Unsigned package — certificate unavailable.');
  await expect(page.locator('[data-signing-status="windows"]')).toHaveText('Unsigned package — certificate unavailable.');
  await expect(page.locator('[data-platform="linux"]')).toHaveAttribute('href', `${releaseRoot}/Local.Data.Workbench_${VERSION}_amd64.AppImage`);
});

test('@regression:release-provenance-mismatch stale release assets never become downloadable from a repaired page', async ({ page }) => {
  await mockRelease(page, {
    tag_name: `v${VERSION}`, body: 'Source commit: 0000000000000000000000000000000000000000\nmacOS signing: verified and notarized\nWindows signing: verified', assets: []
  });
  await page.goto('http://127.0.0.1:4173/');
  await expect(page.locator('#primary-download')).toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator('#primary-download')).not.toHaveAttribute('href');
  await expect(page.locator('[data-platform="linux"]')).toBeHidden();
  await expect(page.locator('[data-installer-command]')).toBeHidden();
  await expect(page.locator('#release-state')).toContainText('did not match this page');
});
