import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const browser = await chromium.launch({ headless: true });
const result = { liveRoutes: [], demo: {}, app: {}, keyboard: {}, reducedMotion: {}, zoom: {} };

async function inspectRoute(path, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const errors = [];
  const requests = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('request', (request) => requests.push(request.url()));
  const response = await page.goto(`https://local-data-workbench.sociobot.in${path}`, { waitUntil: 'networkidle' });
  const axe = await new AxeBuilder({ page }).analyze();
  const facts = await page.evaluate(() => ({
    title: document.title,
    lang: document.documentElement.lang,
    h1: [...document.querySelectorAll('h1')].map((node) => node.textContent?.trim()),
    main: document.querySelectorAll('main').length,
    header: document.querySelectorAll('header').length,
    footer: document.querySelectorAll('footer').length,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    build: document.querySelector('[data-build-id]')?.textContent?.trim() ?? null,
    targetFailures: [...document.querySelectorAll('a,button,input,select,textarea,[tabindex="0"]')]
      .filter((node) => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && (rect.width < 44 || rect.height < 44);
      })
      .map((node) => ({ text: (node.textContent || node.getAttribute('aria-label') || node.id).trim().replace(/\s+/g, ' '), width: Math.round(node.getBoundingClientRect().width), height: Math.round(node.getBoundingClientRect().height) })),
  }));
  await page.screenshot({ path: `.factory/verification-artifacts/live-${path === '/' ? 'home' : path.replaceAll('/', '-')}-${viewport.width}.png`, fullPage: true });
  await context.close();
  return {
    path,
    viewport,
    status: response?.status(),
    headers: response?.headers(),
    requests,
    errors,
    seriousCritical: axe.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? '')).map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })),
    ...facts,
  };
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  for (const path of ['/', '/demo/', '/privacy/', '/terms/', '/not-a-real-route']) {
    result.liveRoutes.push(await inspectRoute(path, viewport));
  }
}

{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  const page = await context.newPage();
  const requests = [];
  const errors = [];
  page.on('request', (request) => requests.push(request.url()));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('https://local-data-workbench.sociobot.in/demo/', { waitUntil: 'networkidle' });
  const before = await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage }, rows: document.querySelectorAll('#sample-rows tr').length }));
  await page.locator('#status-filter').selectOption('shipped');
  await page.getByRole('button', { name: 'Apply filter' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export sample CSV' }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const csv = Buffer.concat(chunks).toString('utf8');
  const filtered = await page.locator('#sample-rows tr').count();
  const status = await page.getByRole('status').textContent();
  await page.getByRole('button', { name: 'Reset demo' }).click();
  const resetRows = await page.locator('#sample-rows tr').count();
  const after = await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } }));
  result.demo = { before, after, filtered, resetRows, csv, status, requests, errors };
  await context.close();
}

{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await context.newPage();
  const requests = [];
  const errors = [];
  page.on('request', (request) => requests.push(request.url()));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:1420/', { waitUntil: 'networkidle' });

  const csv = 'name,amount,status,note\r\n"Alpha, Inc",2,keep,"quoted ""value"""\r\nBeta,10,drop,\r\nGamma,100,keep,last\r\n';
  await page.locator('#browser-file').setInputFiles({ name: 'boundary.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  const initial = await page.evaluate(() => ({ title: document.querySelector('#preview-title')?.textContent, rows: document.querySelectorAll('#data-table tbody tr').length, cells: [...document.querySelectorAll('#data-table tbody td')].map((n) => n.textContent), profiles: [...document.querySelectorAll('.profile-item')].map((n) => n.textContent?.trim().replace(/\s+/g, ' ')) }));

  await page.getByRole('button', { name: 'Add recipe step' }).click();
  await page.locator('#step-column').selectOption('amount');
  await page.locator('#step-operator').selectOption('greater_than');
  await page.locator('#step-value').fill('not-a-number');
  await page.getByRole('button', { name: 'Add to recipe' }).click();
  const invalidFilter = await page.locator('#step-error').textContent();
  await page.locator('#step-value').fill('9');
  await page.getByRole('button', { name: 'Add to recipe' }).click();
  const recoveredRows = await page.locator('#data-table tbody tr').count();

  await page.getByRole('button', { name: 'Add recipe step' }).click();
  await page.locator('#step-kind').selectOption('derive');
  await page.locator('#step-column').selectOption('name');
  await page.locator('#derive-op').selectOption('uppercase');
  await page.locator('#new-column').fill('upper_name');
  await page.getByRole('button', { name: 'Add to recipe' }).click();
  const transformedHeaders = await page.locator('#data-table th').allTextContents();
  const transformedCells = await page.locator('#data-table tbody td').allTextContents();

  const recipePromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save recipe' }).click();
  const recipeDownload = await recipePromise;
  const recipeStream = await recipeDownload.createReadStream();
  const recipeChunks = [];
  for await (const chunk of recipeStream) recipeChunks.push(chunk);
  const recipe = Buffer.concat(recipeChunks).toString('utf8');

  const exportPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export result' }).click();
  const exportDownload = await exportPromise;
  const exportStream = await exportDownload.createReadStream();
  const exportChunks = [];
  for await (const chunk of exportStream) exportChunks.push(chunk);
  const exported = Buffer.concat(exportChunks).toString('utf8');

  await page.locator('#browser-file').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('[{"a": 1},') });
  const invalidJson = await page.locator('#error-detail').textContent();
  await page.locator('#browser-file').setInputFiles({ name: 'rows.jsonl', mimeType: 'application/x-ndjson', buffer: Buffer.from('{"a":1,"b":null}\n{"a":2,"b":{"nested":true}}\n') });
  const jsonlRecovery = await page.evaluate(() => ({ rows: document.querySelectorAll('#data-table tbody tr').length, headers: [...document.querySelectorAll('#data-table th')].map((n) => n.textContent), cells: [...document.querySelectorAll('#data-table td')].map((n) => n.textContent) }));
  await page.locator('#browser-file').setInputFiles({ name: 'fake.parquet', mimeType: 'application/octet-stream', buffer: Buffer.from('PAR1not-real') });
  const parquetRecovery = await page.locator('#error-detail').textContent();
  const axe = await new AxeBuilder({ page }).analyze();
  result.app = { initial, invalidFilter, recoveredRows, transformedHeaders, transformedCells, recipe, exported, invalidJson, jsonlRecovery, parquetRecovery, requests, errors, storage: await page.evaluate(() => ({ ...localStorage })), seriousCritical: axe.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? '')).map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })) };
  await context.close();
}

{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto('https://local-data-workbench.sociobot.in/');
  const sequence = [];
  for (let i = 0; i < 15; i += 1) {
    await page.keyboard.press('Tab');
    sequence.push(await page.evaluate(() => ({ tag: document.activeElement?.tagName, text: document.activeElement?.textContent?.trim().replace(/\s+/g, ' '), href: document.activeElement?.getAttribute('href'), outline: getComputedStyle(document.activeElement).outline })));
  }
  await page.goto('https://local-data-workbench.sociobot.in/demo/');
  await page.locator('#status-filter').focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  result.keyboard = { sequence, demoRowsAfterKeyboard: await page.locator('#sample-rows tr').count(), focusAfterAction: await page.evaluate(() => ({ tag: document.activeElement?.tagName, id: document.activeElement?.id })) };
  await context.close();
}

{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('https://local-data-workbench.sociobot.in/');
  result.reducedMotion = await page.evaluate(() => ({
    matches: matchMedia('(prefers-reduced-motion: reduce)').matches,
    animated: [...document.querySelectorAll('*')].filter((n) => {
      const s = getComputedStyle(n); return parseFloat(s.animationDuration) > 0.01 || parseFloat(s.transitionDuration) > 0.01;
    }).slice(0, 10).map((n) => ({ tag: n.tagName, className: n.className, animationDuration: getComputedStyle(n).animationDuration, transitionDuration: getComputedStyle(n).transitionDuration })),
  }));
  await context.close();
}

{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto('https://local-data-workbench.sociobot.in/demo/');
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  result.zoom = await page.evaluate(() => ({ overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth, scrollHeight: document.documentElement.scrollHeight, bodyTextVisible: document.body.innerText.includes('Export sample CSV') }));
  await context.close();
}

await browser.close();
console.log(JSON.stringify(result, null, 2));
