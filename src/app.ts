import './styles.css';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { openUrl } from '@tauri-apps/plugin-opener';
import { applyPreview, validateRecipeSteps, type TableData } from './recipe';
import { captureReturnedLicense, getLicenseToken, optimisticUnlock, storeLicense, verifyLicense } from './license';
import type { DatasetSummary, DeriveOperation, ExportResult, FilterOperator, Recipe, RecipeStep } from './types';
import { humanBytes, recipeStepDescription } from './types';

const $ = <T extends Element>(selector: string): T => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing element: ${selector}`);
  return element;
};

const isTauri = (): boolean => '__TAURI_INTERNALS__' in window;
const empty = $('#empty-state');
const loading = $('#loading-state');
const errorState = $('#error-state');
const tableRegion = $('#table-region');
const table = $('#data-table');
const stepDialog = $<HTMLDialogElement>('#step-dialog');
const licenseDialog = $<HTMLDialogElement>('#license-dialog');
const browserFile = $<HTMLInputElement>('#browser-file');
const exportFormat = $<HTMLSelectElement>('#export-format');

let dataset: DatasetSummary | null = null;
let steps: RecipeStep[] = [];
let transformed: TableData | null = null;
let unlocked = false;
let joinPath = '';

function setStatus(message: string): void { $('#status').textContent = message; }
function showOnly(state: 'empty' | 'loading' | 'error' | 'table'): void {
  empty.toggleAttribute('hidden', state !== 'empty');
  loading.toggleAttribute('hidden', state !== 'loading');
  errorState.toggleAttribute('hidden', state !== 'error');
  tableRegion.toggleAttribute('hidden', state !== 'table');
  $('#preview-note').toggleAttribute('hidden', state !== 'table');
}

function updateConnectivity(): void {
  $('#connection-state').textContent = navigator.onLine ? 'Online · local processing' : 'Offline-ready';
}

function updateLicenseUI(reason?: string): void {
  $('#license-badge').textContent = unlocked ? 'Full desk unlocked' : 'Free desk';
  exportFormat.options[1].textContent = unlocked ? 'JSON Lines' : 'JSON Lines · license required';
  if (reason && !unlocked) $('#license-notice').textContent = reason === 'offline' ? 'Offline. The last verified license state is in use.' : 'License no longer active. You can paste another token or purchase again.';
}

function displayError(title: string, detail: string): void {
  $('#error-title').textContent = title;
  $('#error-detail').textContent = detail;
  showOnly('error');
  setStatus(`Error: ${title}`);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character);
}

function renderSource(): void {
  const card = $('#source-card');
  if (!dataset) {
    card.className = 'source-card empty';
    card.innerHTML = '<span class="source-mark" aria-hidden="true">∅</span><strong>No edition open</strong><span>Choose a file to begin.</span>';
    return;
  }
  card.className = 'source-card';
  card.innerHTML = `<span class="section-number">${escapeHtml(dataset.format)} source</span><span class="file-name">${escapeHtml(dataset.name)}</span><span class="file-meta">${humanBytes(dataset.size_bytes)} · ${dataset.row_count.toLocaleString()} rows</span><span class="file-meta">Fingerprint ${escapeHtml(dataset.fingerprint.slice(0, 12))}</span>`;
}

function renderRecipe(): void {
  const list = $('#recipe-list');
  if (!steps.length) {
    list.innerHTML = '<li class="recipe-empty">No steps yet. Your source remains unchanged.</li>';
  } else {
    list.innerHTML = steps.map((step, index) => `<li><span class="recipe-name">${escapeHtml(step.name)}</span><span class="recipe-detail">${escapeHtml(recipeStepDescription(step))}</span><span class="step-controls"><button type="button" data-action="up" data-index="${index}" aria-label="Move ${escapeHtml(step.name)} earlier"${index === 0 ? ' disabled' : ''}>↑</button><button type="button" data-action="down" data-index="${index}" aria-label="Move ${escapeHtml(step.name)} later"${index === steps.length - 1 ? ' disabled' : ''}>↓</button><button type="button" data-action="remove" data-index="${index}" aria-label="Remove ${escapeHtml(step.name)}">×</button></span></li>`).join('');
    list.querySelectorAll<HTMLButtonElement>('.step-controls button').forEach((button) => button.addEventListener('click', async () => {
      const index = Number(button.dataset.index);
      if (button.dataset.action === 'remove') steps.splice(index, 1);
      if (button.dataset.action === 'up' && index > 0) [steps[index - 1], steps[index]] = [steps[index], steps[index - 1]];
      if (button.dataset.action === 'down' && index < steps.length - 1) [steps[index], steps[index + 1]] = [steps[index + 1], steps[index]];
      renderRecipe();
      await refreshPreview();
      setStatus(button.dataset.action === 'remove' ? 'Recipe step removed.' : 'Recipe order updated.');
    }));
  }
  $<HTMLButtonElement>('#save-recipe').disabled = !dataset;
}

function renderProfiles(): void {
  const list = $('#profile-list');
  if (!dataset) { list.innerHTML = ''; return; }
  $('#profile-intro').textContent = `Profiled ${dataset.scanned_rows.toLocaleString()} rows locally. Distinct counts cap at 10,000.`;
  list.innerHTML = dataset.profiles.map((profile) => `<article class="profile-item"><div class="profile-name"><strong>${escapeHtml(profile.name)}</strong><span class="type-chip">${escapeHtml(profile.inferred_type)}</span></div><dl class="profile-stats"><div><dt>Missing</dt><dd>${profile.null_count.toLocaleString()}</dd></div><div><dt>Distinct</dt><dd>${profile.distinct_is_estimate ? '≥' : ''}${profile.distinct_count.toLocaleString()}</dd></div>${profile.min !== undefined ? `<div><dt>Minimum</dt><dd title="${escapeHtml(profile.min)}">${escapeHtml(profile.min)}</dd></div>` : ''}${profile.max !== undefined ? `<div><dt>Maximum</dt><dd title="${escapeHtml(profile.max)}">${escapeHtml(profile.max)}</dd></div>` : ''}</dl></article>`).join('');
}

function renderTable(data: TableData): void {
  const head = `<thead><tr>${data.headers.map((header) => `<th scope="col">${escapeHtml(header)}</th>`).join('')}</tr></thead>`;
  const body = `<tbody>${data.rows.map((row) => `<tr>${data.headers.map((_, index) => { const value = row[index] ?? ''; return `<td title="${escapeHtml(value)}"${value === '' ? ' class="null-value"' : ''}>${value === '' ? '∅' : escapeHtml(value)}</td>`; }).join('')}</tr>`).join('')}</tbody>`;
  table.innerHTML = head + body;
  $('#sample-badge').textContent = `${data.rows.length.toLocaleString()} preview rows`;
  $('#preview-title').textContent = steps.length ? `${dataset?.name ?? 'Result'} · ${steps.length} step${steps.length === 1 ? '' : 's'}` : dataset?.name ?? 'Preview';
  $('#preview-note').textContent = dataset?.preview_limited ? `Showing a bounded preview of ${dataset.row_count.toLocaleString()} source rows. Export applies this recipe to the complete file.` : `Showing all ${data.rows.length.toLocaleString()} rows in this source.`;
  showOnly('table');
}

async function refreshPreview(): Promise<void> {
  if (!dataset) return;
  const errors = validateRecipeSteps(dataset.headers, steps);
  if (errors.length) { displayError('This recipe does not fit the source.', errors[0]); return; }
  try {
    if (isTauri()) {
      setStatus('Applying the recipe to a bounded local preview…');
      transformed = await invoke<TableData>('preview_recipe', { path: dataset.path, steps });
    } else {
      transformed = applyPreview({ headers: dataset.headers, rows: dataset.rows }, steps);
    }
    renderTable(transformed);
  } catch (error) {
    displayError('The preview could not be transformed.', `${String(error)} Check the affected column or join file.`);
  }
}

function enableDatasetActions(enabled: boolean): void {
  $<HTMLButtonElement>('#add-step').disabled = !enabled;
  $<HTMLButtonElement>('#export-data').disabled = !enabled;
  exportFormat.disabled = !enabled;
}

async function acceptDataset(summary: DatasetSummary): Promise<void> {
  dataset = summary;
  steps = [];
  transformed = { headers: summary.headers, rows: summary.rows };
  renderSource();
  renderRecipe();
  renderProfiles();
  renderTable(transformed);
  enableDatasetActions(true);
  setStatus(`Opened ${summary.name}. ${summary.row_count.toLocaleString()} rows found locally.`);
}

async function openSource(): Promise<void> {
  if (!isTauri()) { browserFile.click(); return; }
  const selected = await open({ multiple: false, filters: [{ name: 'Data files', extensions: ['csv', 'json', 'jsonl', 'ndjson', 'parquet'] }] });
  if (!selected) return;
  showOnly('loading');
  setStatus('Reading and profiling the source locally…');
  try { await acceptDataset(await invoke<DatasetSummary>('analyze_file', { path: selected })); }
  catch (error) { displayError('The source could not be opened.', `${String(error)} Choose a valid CSV, JSON, JSONL, or Parquet file.`); }
}

function parseCsv(text: string): TableData {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"' && quoted && text[i + 1] === '"') { cell += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell); if (row.some(Boolean)) rows.push(row); row = []; cell = '';
    } else cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return { headers: rows.shift() ?? [], rows };
}

function inferProfiles(data: TableData) {
  return data.headers.map((name, index) => {
    const values = data.rows.map((row) => row[index] ?? '');
    const present = values.filter((value) => value.trim());
    const inferred_type = present.length === 0 ? 'empty' : present.every((value) => /^-?\d+$/.test(value)) ? 'integer' : present.every((value) => Number.isFinite(Number(value))) ? 'decimal' : present.every((value) => /^(true|false)$/i.test(value)) ? 'boolean' : 'text';
    const sorted = [...present].sort();
    return { name, inferred_type, null_count: values.length - present.length, distinct_count: new Set(present).size, distinct_is_estimate: false, min: sorted[0], max: sorted.at(-1) } as DatasetSummary['profiles'][number];
  });
}

async function handleBrowserFile(file: File): Promise<void> {
  showOnly('loading');
  try {
    if (file.name.toLowerCase().endsWith('.parquet')) throw new Error('Parquet inspection requires the downloadable desktop app.');
    const text = await file.text();
    let data: TableData;
    if (file.name.toLowerCase().endsWith('.csv')) data = parseCsv(text);
    else {
      const parsed = file.name.match(/\.(jsonl|ndjson)$/i) ? text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line)) : JSON.parse(text);
      const records = Array.isArray(parsed) ? parsed : [parsed];
      const headers = [...new Set(records.flatMap((record) => Object.keys(record)))];
      data = { headers, rows: records.map((record) => headers.map((header) => record[header] == null ? '' : typeof record[header] === 'object' ? JSON.stringify(record[header]) : String(record[header]))) };
    }
    await acceptDataset({ path: file.name, name: file.name, format: file.name.endsWith('.csv') ? 'csv' : file.name.match(/\.(jsonl|ndjson)$/) ? 'jsonl' : 'json', size_bytes: file.size, row_count: data.rows.length, scanned_rows: data.rows.length, headers: data.headers, rows: data.rows.slice(0, 100), profiles: inferProfiles(data), fingerprint: `browser-${file.size}-${file.lastModified}`, preview_limited: data.rows.length > 100 });
  } catch (error) { displayError('The browser preview could not read this file.', `${String(error)} Install the desktop app for Parquet and multi-gigabyte sources.`); }
}

function columnOptions(selected = ''): string {
  const headers = transformed?.headers ?? dataset?.headers ?? [];
  return headers.map((header) => `<option value="${escapeHtml(header)}"${header === selected ? ' selected' : ''}>${escapeHtml(header)}</option>`).join('');
}

function renderStepFields(): void {
  const kind = $<HTMLSelectElement>('#step-kind').value;
  const fields = $('#step-fields');
  const name = `<label for="step-name">Step name</label><input id="step-name" name="name" required value="${kind === 'filter' ? 'Keep matching rows' : kind === 'derive' ? 'Create cleaned column' : kind === 'rename' ? 'Clarify heading' : kind === 'select' ? 'Keep useful columns' : 'Join reference data'}" />`;
  if (kind === 'filter') fields.innerHTML = `${name}<div class="field-row"><div><label for="step-column">Column</label><select id="step-column">${columnOptions()}</select></div><div><label for="step-operator">Condition</label><select id="step-operator"><option value="equals">Equals</option><option value="not_equals">Does not equal</option><option value="contains">Contains</option><option value="greater_than">Greater than</option><option value="less_than">Less than</option><option value="is_empty">Is empty</option><option value="is_not_empty">Is not empty</option></select></div></div><label for="step-value">Comparison value</label><input id="step-value" />`;
  if (kind === 'derive') fields.innerHTML = `${name}<div class="field-row"><div><label for="step-column">Source column</label><select id="step-column">${columnOptions()}</select></div><div><label for="derive-op">Change</label><select id="derive-op"><option value="trim">Trim spaces</option><option value="uppercase">Uppercase</option><option value="lowercase">Lowercase</option><option value="prefix">Add prefix</option><option value="suffix">Add suffix</option></select></div></div><label for="new-column">New column name</label><input id="new-column" required /><label for="derive-value">Prefix or suffix text (when used)</label><input id="derive-value" />`;
  if (kind === 'rename') fields.innerHTML = `${name}<label for="step-column">Column</label><select id="step-column">${columnOptions()}</select><label for="new-name">New name</label><input id="new-name" required />`;
  if (kind === 'select') fields.innerHTML = `${name}<fieldset><legend>Columns to keep, in source order</legend>${(transformed?.headers ?? []).map((header, index) => `<label class="check-label"><input type="checkbox" name="selected-column" value="${escapeHtml(header)}"${index < 6 ? ' checked' : ''} /> ${escapeHtml(header)}</label>`).join('')}</fieldset>`;
  if (kind === 'join') fields.innerHTML = `${name}<p class="muted small">Join files are indexed locally with a 200,000-row safety cap.</p><button class="secondary full" id="choose-join" type="button">Choose CSV or JSON join file</button><p id="join-file" class="small">No join file chosen.</p><div class="field-row"><div><label for="left-key">This file key</label><select id="left-key">${columnOptions()}</select></div><div><label for="right-key">Other file key</label><input id="right-key" required /></div></div><label for="join-prefix">Joined column prefix</label><input id="join-prefix" value="ref_" />`;
  $('#step-error').textContent = '';
  document.querySelector('#choose-join')?.addEventListener('click', async () => {
    if (!isTauri()) { $('#step-error').textContent = 'Joins require the desktop app.'; return; }
    const selected = await open({ multiple: false, filters: [{ name: 'Join data', extensions: ['csv', 'json', 'jsonl', 'ndjson'] }] });
    if (selected) { joinPath = selected; $('#join-file').textContent = selected.split(/[\\/]/).at(-1) ?? selected; }
  });
}

async function addStep(): Promise<void> {
  const kind = $<HTMLSelectElement>('#step-kind').value as RecipeStep['type'];
  if (kind === 'join' && !unlocked) { stepDialog.close(); $('#license-notice').textContent = 'A full-desk license unlocks local joins.'; licenseDialog.showModal(); return; }
  const name = $<HTMLInputElement>('#step-name').value.trim();
  let step: RecipeStep;
  if (!name) { $('#step-error').textContent = 'Give this step a name so the recipe stays auditable.'; return; }
  if (kind === 'filter') step = { type: kind, name, column: $<HTMLSelectElement>('#step-column').value, operator: $<HTMLSelectElement>('#step-operator').value as FilterOperator, value: $<HTMLInputElement>('#step-value').value };
  else if (kind === 'derive') step = { type: kind, name, column: $<HTMLSelectElement>('#step-column').value, new_column: $<HTMLInputElement>('#new-column').value.trim(), operation: $<HTMLSelectElement>('#derive-op').value as DeriveOperation, value: $<HTMLInputElement>('#derive-value').value };
  else if (kind === 'rename') step = { type: kind, name, column: $<HTMLSelectElement>('#step-column').value, new_name: $<HTMLInputElement>('#new-name').value.trim() };
  else if (kind === 'select') step = { type: kind, name, columns: [...document.querySelectorAll<HTMLInputElement>('input[name="selected-column"]:checked')].map((input) => input.value) };
  else step = { type: kind, name, right_path: joinPath, left_key: $<HTMLSelectElement>('#left-key').value, right_key: $<HTMLInputElement>('#right-key').value.trim(), prefix: $<HTMLInputElement>('#join-prefix').value.trim() };
  const validation = validateRecipeSteps(dataset?.headers ?? [], [...steps, step]);
  if ((kind === 'join' && !joinPath) || validation.length) { $('#step-error').textContent = kind === 'join' && !joinPath ? 'Choose the local file to join.' : validation.at(-1) ?? 'Check this step.'; return; }
  steps.push(step);
  stepDialog.close();
  renderRecipe();
  await refreshPreview();
  setStatus(`Added recipe step: ${name}.`);
}

function currentRecipe(name?: string): Recipe {
  if (!dataset) throw new Error('Open a source first.');
  const now = new Date().toISOString();
  return { schema: 'local-data-workbench/recipe@1', name: name ?? `${dataset.name} recipe`, created_at: now, updated_at: now, source: { path: dataset.path, name: dataset.name, format: dataset.format, fingerprint: dataset.fingerprint }, steps };
}

async function saveRecipe(): Promise<void> {
  if (!dataset) return;
  const savedCount = Number(localStorage.getItem('ldw:saved-recipes') ?? '0');
  if (!unlocked && savedCount >= 3) { $('#license-notice').textContent = 'The free desk includes three saved recipes. A one-time license removes the limit.'; licenseDialog.showModal(); return; }
  const contents = `${JSON.stringify(currentRecipe(), null, 2)}\n`;
  if (isTauri()) {
    const destination = await save({ defaultPath: `${dataset.name.replace(/\.[^.]+$/, '')}.ldw.json`, filters: [{ name: 'Workbench recipe', extensions: ['ldw.json', 'json'] }] });
    if (!destination) return;
    await invoke('write_text_file', { path: destination, contents });
    setStatus(`Saved portable recipe to ${destination.split(/[\\/]/).at(-1)}.`);
  } else {
    const anchor = document.createElement('a'); anchor.href = URL.createObjectURL(new Blob([contents], { type: 'application/json' })); anchor.download = `${dataset.name}.ldw.json`; anchor.click(); URL.revokeObjectURL(anchor.href);
    setStatus('Saved portable recipe.');
  }
  localStorage.setItem('ldw:saved-recipes', String(savedCount + 1));
}

async function openRecipe(): Promise<void> {
  if (!isTauri()) { setStatus('Recipe opening is available in the installed desktop app.'); return; }
  const path = await open({ multiple: false, filters: [{ name: 'Workbench recipe', extensions: ['json'] }] });
  if (!path) return;
  try {
    const recipe = JSON.parse(await invoke<string>('read_text_file', { path })) as Recipe;
    if (recipe.schema !== 'local-data-workbench/recipe@1') throw new Error('Unsupported recipe version.');
    if (!unlocked && recipe.steps.some((step) => step.type === 'join')) { $('#license-notice').textContent = 'This recipe contains a local join, which needs a full-desk license.'; licenseDialog.showModal(); return; }
    showOnly('loading');
    let summary: DatasetSummary;
    try { summary = await invoke<DatasetSummary>('analyze_file', { path: recipe.source.path }); }
    catch {
      const relocated = await open({ multiple: false, title: `Locate ${recipe.source.name}`, filters: [{ name: 'Data files', extensions: ['csv', 'json', 'jsonl', 'ndjson', 'parquet'] }] });
      if (!relocated) throw new Error(`Source “${recipe.source.name}” was not found. No file was relinked.`);
      summary = await invoke<DatasetSummary>('analyze_file', { path: relocated });
    }
    dataset = summary; steps = recipe.steps; renderSource(); renderRecipe(); renderProfiles(); enableDatasetActions(true); await refreshPreview();
    setStatus(summary.fingerprint === recipe.source.fingerprint ? `Reopened ${recipe.name}; the source fingerprint matches.` : `Reopened ${recipe.name}, but the source fingerprint changed. Review before exporting.`);
  } catch (error) { displayError('The recipe could not be reopened.', `${String(error)} If the source moved, open it directly and recreate or edit the recipe path.`); }
}

async function exportData(): Promise<void> {
  if (!dataset) return;
  const format = exportFormat.value as 'csv' | 'jsonl';
  if (format === 'jsonl' && !unlocked) { $('#license-notice').textContent = 'JSON Lines export is part of the full-desk license. CSV export remains free.'; licenseDialog.showModal(); exportFormat.value = 'csv'; return; }
  if (!isTauri()) {
    const data = transformed ?? { headers: dataset.headers, rows: dataset.rows };
    const csv = [data.headers, ...data.rows].map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(',')).join('\n');
    const anchor = document.createElement('a'); anchor.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); anchor.download = `result.csv`; anchor.click(); URL.revokeObjectURL(anchor.href); setStatus('Exported the browser preview. Install the app to process the complete file.'); return;
  }
  const destination = await save({ defaultPath: `result.${format}`, filters: [{ name: format === 'csv' ? 'CSV result' : 'JSON Lines result', extensions: [format] }] });
  if (!destination) return;
  setStatus('Applying the recipe to the complete source…');
  try {
    const result = await invoke<ExportResult>('export_result', { request: { source_path: dataset.path, destination_path: destination, format, steps } });
    setStatus(`Exported ${result.rows_written.toLocaleString()} rows (${humanBytes(result.bytes_written)}) deterministically.`);
  } catch (error) { displayError('The result could not be exported.', `${String(error)} Confirm that the destination is writable and the recipe columns still exist.`); }
}

async function submitLicense(): Promise<void> {
  const token = $<HTMLTextAreaElement>('#license-token').value.trim();
  if (!token) { $('#license-notice').textContent = 'Paste the license token from your receipt.'; return; }
  storeLicense(token); $('#license-notice').textContent = 'Verifying with Sociobot…';
  const verdict = await verifyLicense(token, true); unlocked = verdict.valid; updateLicenseUI(verdict.reason);
  $('#license-notice').textContent = verdict.valid ? 'License verified. The full workbench is unlocked.' : verdict.reason === 'offline' ? 'Could not reach verification. The free desk remains available.' : 'This license is not active for Local Data Workbench.';
}

function bindEvents(): void {
  ['#open-file', '#empty-open', '#error-open'].forEach((selector) => $(selector).addEventListener('click', openSource));
  browserFile.addEventListener('change', () => { const file = browserFile.files?.[0]; if (file) void handleBrowserFile(file); });
  $('#add-step').addEventListener('click', () => { joinPath = ''; renderStepFields(); stepDialog.showModal(); });
  $('#step-kind').addEventListener('change', renderStepFields);
  $('#confirm-step').addEventListener('click', addStep);
  $('#save-recipe').addEventListener('click', saveRecipe);
  $('#open-recipe').addEventListener('click', openRecipe);
  $('#export-data').addEventListener('click', exportData);
  $('#license-button').addEventListener('click', () => { $<HTMLTextAreaElement>('#license-token').value = getLicenseToken(); licenseDialog.showModal(); });
  $('#verify-license').addEventListener('click', submitLicense);
  document.querySelectorAll<HTMLAnchorElement>('a[href^="https://"]').forEach((anchor) => anchor.addEventListener('click', (event) => {
    if (!isTauri()) return;
    event.preventDefault();
    void openUrl(anchor.href);
  }));
  window.addEventListener('online', updateConnectivity); window.addEventListener('offline', updateConnectivity);
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'o') { event.preventDefault(); void openSource(); }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); void saveRecipe(); }
  });
}

async function start(): Promise<void> {
  captureReturnedLicense();
  unlocked = optimisticUnlock();
  updateLicenseUI(); updateConnectivity(); renderSource(); renderRecipe(); bindEvents(); showOnly('empty');
  if (getLicenseToken()) {
    const verdict = await verifyLicense(); unlocked = verdict.valid; updateLicenseUI(verdict.reason);
  }
}

void start();
