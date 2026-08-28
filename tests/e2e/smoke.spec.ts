import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('landing page has a clear local-first download path', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('http://127.0.0.1:4173/');
  await expect(page).toHaveTitle(/Local Data Workbench/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Your data never/);
  await expect(page.locator('#primary-download')).toHaveAttribute('href', /github\.com/);
  await expect(page.getByText('Files stay local', { exact: false }).first()).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? ''))).toEqual([]);
  expect(errors).toEqual([]);
});

test('workbench opens a CSV, profiles it, and builds a recipe with keyboard-safe controls', async ({ page }) => {
  await page.goto('http://127.0.0.1:1420/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Local Data/);
  await page.locator('#browser-file').setInputFiles({ name: 'orders.csv', mimeType: 'text/csv', buffer: Buffer.from('name,status,amount\nAda,keep,12\nBob,drop,8\n') });
  await expect(page.getByRole('columnheader', { name: 'name' })).toBeVisible();
  await expect(page.getByText('2 rows', { exact: false }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Add recipe step' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.locator('#step-column').selectOption('status');
  await page.locator('#step-value').fill('keep');
  await page.getByRole('button', { name: 'Add to recipe' }).click();
  await expect(page.getByText('Keep matching rows', { exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Ada' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Bob' })).not.toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? ''))).toEqual([]);
});
