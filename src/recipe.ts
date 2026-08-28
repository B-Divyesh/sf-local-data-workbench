import type { RecipeStep } from './types';

export interface TableData { headers: string[]; rows: string[][] }

function passes(value: string, operator: string, expected: string): boolean {
  switch (operator) {
    case 'equals': return value === expected;
    case 'not_equals': return value !== expected;
    case 'contains': return value.toLocaleLowerCase().includes(expected.toLocaleLowerCase());
    case 'greater_than': return Number(value) > Number(expected);
    case 'less_than': return Number(value) < Number(expected);
    case 'is_empty': return value.trim() === '';
    case 'is_not_empty': return value.trim() !== '';
    default: return true;
  }
}

export function applyPreview(source: TableData, steps: RecipeStep[]): TableData {
  let headers = [...source.headers];
  let rows = source.rows.map((row) => [...row]);

  for (const step of steps) {
    if (step.type === 'filter') {
      const index = headers.indexOf(step.column);
      if (index >= 0) rows = rows.filter((row) => passes(row[index] ?? '', step.operator, step.value));
    } else if (step.type === 'derive') {
      const index = headers.indexOf(step.column);
      if (index < 0) continue;
      headers.push(step.new_column);
      rows = rows.map((row) => {
        const input = row[index] ?? '';
        let output = input;
        if (step.operation === 'trim') output = input.trim();
        if (step.operation === 'uppercase') output = input.toLocaleUpperCase();
        if (step.operation === 'lowercase') output = input.toLocaleLowerCase();
        if (step.operation === 'prefix') output = `${step.value}${input}`;
        if (step.operation === 'suffix') output = `${input}${step.value}`;
        return [...row, output];
      });
    } else if (step.type === 'rename') {
      const index = headers.indexOf(step.column);
      if (index >= 0) headers[index] = step.new_name;
    } else if (step.type === 'select') {
      const indexes = step.columns.map((column) => headers.indexOf(column)).filter((index) => index >= 0);
      headers = indexes.map((index) => headers[index]);
      rows = rows.map((row) => indexes.map((index) => row[index] ?? ''));
    }
  }
  return { headers, rows };
}

export function validateRecipeSteps(headers: string[], steps: RecipeStep[]): string[] {
  const errors: string[] = [];
  let current = [...headers];
  steps.forEach((step, index) => {
    const label = `Step ${index + 1}`;
    if ('column' in step && !current.includes(step.column)) errors.push(`${label}: column “${step.column}” is missing.`);
    if (step.type === 'filter' && ['greater_than', 'less_than'].includes(step.operator) && Number.isNaN(Number(step.value))) errors.push(`${label}: comparison value must be a number.`);
    if (step.type === 'derive') {
      if (!step.new_column.trim()) errors.push(`${label}: new column needs a name.`);
      current.push(step.new_column);
    }
    if (step.type === 'rename') {
      const idx = current.indexOf(step.column);
      if (idx >= 0) current[idx] = step.new_name;
    }
    if (step.type === 'select') {
      const missing = step.columns.filter((column) => !current.includes(column));
      if (missing.length) errors.push(`${label}: selected columns missing: ${missing.join(', ')}.`);
      current = step.columns.filter((column) => current.includes(column));
    }
    if (step.type === 'join' && !current.includes(step.left_key)) errors.push(`${label}: join key “${step.left_key}” is missing.`);
  });
  return errors;
}
