import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const output = resolve('public/assets');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

async function capture(name) {
  await page.screenshot({
    path: resolve(output, name),
    type: 'jpeg',
    quality: 86,
    animations: 'disabled'
  });
}

await page.goto(process.env.WALKTHROUGH_URL ?? 'http://127.0.0.1:1420/?demo=1');
await page.locator('#sample-badge').filter({ hasText: '5 preview rows' }).waitFor();
await capture('walkthrough-open-sample.jpg');

await page.getByRole('button', { name: 'Add recipe step' }).click();
await page.locator('#step-column').selectOption('status');
await page.locator('#step-value').fill('shipped');
await capture('walkthrough-name-filter.jpg');

await page.getByRole('button', { name: 'Add to recipe' }).click();
await page.getByRole('button', { name: 'Export result' }).click();
await page.getByRole('status').filter({ hasText: 'Exported the browser preview' }).waitFor();
await page.locator('#status').scrollIntoViewIfNeeded();
await page.locator('.folio').evaluate((element) => { element.style.visibility = 'hidden'; });
await capture('walkthrough-export-result.jpg');

await browser.close();
