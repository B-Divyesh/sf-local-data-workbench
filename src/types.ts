export type DataFormat = 'csv' | 'json' | 'jsonl' | 'parquet';

export interface ColumnProfile {
  name: string;
  inferred_type: 'integer' | 'decimal' | 'boolean' | 'date' | 'text' | 'empty';
  null_count: number;
  distinct_count: number;
  distinct_is_estimate: boolean;
  min?: string;
  max?: string;
}

export interface DatasetSummary {
  path: string;
  name: string;
  format: DataFormat;
  size_bytes: number;
  row_count: number;
  scanned_rows: number;
  headers: string[];
  rows: string[][];
  profiles: ColumnProfile[];
  fingerprint: string;
  preview_limited: boolean;
}

export type FilterOperator = 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
export type DeriveOperation = 'trim' | 'uppercase' | 'lowercase' | 'prefix' | 'suffix';

export type RecipeStep =
  | { type: 'filter'; name: string; column: string; operator: FilterOperator; value: string }
  | { type: 'derive'; name: string; column: string; new_column: string; operation: DeriveOperation; value: string }
  | { type: 'rename'; name: string; column: string; new_name: string }
  | { type: 'select'; name: string; columns: string[] }
  | { type: 'join'; name: string; right_path: string; left_key: string; right_key: string; prefix: string };

export interface Recipe {
  schema: 'local-data-workbench/recipe@1';
  name: string;
  created_at: string;
  updated_at: string;
  source: { path: string; name: string; format: DataFormat; fingerprint: string };
  steps: RecipeStep[];
}

export interface ExportRequest {
  source_path: string;
  destination_path: string;
  format: 'csv' | 'jsonl';
  steps: RecipeStep[];
}

export interface ExportResult { rows_written: number; bytes_written: number; destination_path: string }

export function humanBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unit = units[0];
  for (let i = 1; value >= 1024 && i < units.length; i += 1) {
    value /= 1024;
    unit = units[i];
  }
  return `${value >= 10 ? value.toFixed(1) : value.toFixed(2)} ${unit}`;
}

export function recipeStepDescription(step: RecipeStep): string {
  switch (step.type) {
    case 'filter': return `${step.column} · ${step.operator.replaceAll('_', ' ')}${step.value ? ` · ${step.value}` : ''}`;
    case 'derive': return `${step.new_column} from ${step.column} · ${step.operation}${step.value ? ` “${step.value}”` : ''}`;
    case 'rename': return `${step.column} → ${step.new_name}`;
    case 'select': return step.columns.join(', ');
    case 'join': return `${step.left_key} = ${step.right_key} · ${step.right_path.split(/[\\/]/).at(-1)}`;
  }
}
