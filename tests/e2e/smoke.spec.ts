import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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
  await expect(page.getByRole('status')).toContainText('Exported 3 sample orders');
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
