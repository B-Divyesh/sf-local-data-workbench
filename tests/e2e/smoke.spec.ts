import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';

test('@claim:sample-demo landing page has a one-click isolated sample path', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('http://127.0.0.1:4173/');
  await expect(page).toHaveTitle(/Local Data Workbench/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Inspect local data files/);
  await expect(page.getByRole('link', { name: 'Try it with sample data' })).toHaveAttribute('href', '/demo/');
  await expect(page.locator('#primary-download')).toHaveAttribute('href', /github\.com/);
  await expect(page.getByText('Files are processed locally', { exact: false }).first()).toBeVisible();
  await page.getByRole('link', { name: 'Try it with sample data' }).click();
  await expect(page.getByText('Demo — sample data, nothing is saved', { exact: false })).toBeVisible();
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? ''))).toEqual([]);
  expect(errors.filter((message) => !message.includes('WebSocket') && !message.includes('[vite] failed to connect'))).toEqual([]);
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

test('@claim:free-saved-recipes saving the same recipe again uses one free recipe slot', async ({ page }) => {
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
  await page.goto('http://127.0.0.1:4173/');
  for (const control of ['#primary-download', '[data-platform="windows"]', '[data-platform="linux"]']) {
    expect((await page.locator(control).boundingBox())?.height).toBeGreaterThanOrEqual(44);
  }
  await page.goto('http://127.0.0.1:1420/');
  expect((await page.locator('#license-button').boundingBox())?.height).toBeGreaterThanOrEqual(44);
  expect((await page.locator('#add-step').boundingBox())?.width).toBeGreaterThanOrEqual(44);
});

test('@claim:free-and-paid-features keeps CSV transforms free and marks paid options clearly', async ({ page }) => {
  await page.goto('http://127.0.0.1:1420/?demo=1');
  await expect(page.locator('#export-format')).toContainText('JSON Lines · license required');
  await page.getByRole('button', { name: 'Add recipe step' }).click();
  await page.locator('#step-kind').selectOption('join');
  await page.getByRole('button', { name: 'Add to recipe' }).click();
  await expect(page.getByRole('dialog', { name: /Unlock the full workbench/ })).toBeVisible();
  await expect(page.getByText('CSV inspection, transformations, recipe reuse, and export stay free.')).toBeVisible();
});

test('@claim:build-identity built pages identify their version and source revision', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/');
  await expect(page.locator('[data-build-id]').last()).not.toContainText('source checkout');
  await page.goto('http://127.0.0.1:1420/');
  await expect(page.locator('#build-id')).not.toContainText('source checkout');
  await expect(page.locator('#build-id')).toContainText('0.1.2');
});

test('@claim:local-only-demo demo sends no third-party requests', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.goto('http://127.0.0.1:4173/demo/');
  await page.getByRole('button', { name: 'Apply filter' }).click();
  expect(requests.every((url) => new URL(url).origin === 'http://127.0.0.1:4173')).toBe(true);
});

test('@claim:offline-reload landing reloads from its cache offline', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('http://127.0.0.1:4173/');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Inspect local data files/);
  expect(errors.filter((message) => !message.includes('WebSocket') && !message.includes('[vite] failed to connect'))).toEqual([]);
  await context.close();
});

test('@regression:browser-preview-export workbench describes bounded browser export honestly', async ({ page }) => {
  await page.goto('http://127.0.0.1:1420/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Inspect local/);
  expect((await page.locator('#license-button').boundingBox())?.height).toBeGreaterThanOrEqual(44);
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
