import { describe, expect, it } from 'vitest';
import { applyPreview, validateRecipeSteps } from '../src/recipe';
import type { Recipe, RecipeStep } from '../src/types';

const source = { headers: ['name', 'status', 'amount'], rows: [[' Ada ', 'keep', '10'], ['Bob', 'drop', '4']] };

describe('portable recipe execution', () => {
  it('@claim:named-transformations applies ordered filters, derived columns, renames, and selections', () => {
    const steps: RecipeStep[] = [
      { type: 'filter', name: 'Keep approved', column: 'status', operator: 'equals', value: 'keep' },
      { type: 'derive', name: 'Clean name', column: 'name', new_column: 'clean_name', operation: 'trim', value: '' },
      { type: 'rename', name: 'Rename amount', column: 'amount', new_name: 'total' },
      { type: 'select', name: 'Publish columns', columns: ['clean_name', 'total'] }
    ];
    expect(applyPreview(source, steps)).toEqual({ headers: ['clean_name', 'total'], rows: [['Ada', '10']] });
  });

  it('reports a missing column before execution', () => {
    const steps: RecipeStep[] = [{ type: 'filter', name: 'Bad filter', column: 'missing', operator: 'equals', value: 'x' }];
    expect(validateRecipeSteps(source.headers, steps)).toContain('Step 1: column “missing” is missing.');
  });

  it('requires numeric comparison values', () => {
    const steps: RecipeStep[] = [{ type: 'filter', name: 'Threshold', column: 'amount', operator: 'greater_than', value: 'many' }];
    expect(validateRecipeSteps(source.headers, steps)[0]).toMatch(/must be a number/);
  });

  it('@claim:portable-recipes keeps source identity but no rows, supports an edited path, and replays ordered steps', () => {
    const recipe: Recipe = {
      schema: 'local-data-workbench/recipe@1',
      name: 'Approved people',
      created_at: '2026-09-02T00:00:00.000Z',
      updated_at: '2026-09-02T00:00:00.000Z',
      source: { path: '/local/people.csv', name: 'people.csv', format: 'csv', fingerprint: 'abc123' },
      steps: [{ type: 'filter', name: 'Keep approved', column: 'status', operator: 'equals', value: 'keep' }]
    };
    const saved = JSON.stringify(recipe);
    expect(saved).not.toContain(' Ada ');
    expect(saved).not.toContain('Bob');
    const reopened = JSON.parse(saved) as Recipe;
    reopened.source.path = '/moved/people.csv';
    expect(reopened.schema).toBe('local-data-workbench/recipe@1');
    expect(reopened).toMatchObject({
      name: 'Approved people',
      created_at: '2026-09-02T00:00:00.000Z',
      updated_at: '2026-09-02T00:00:00.000Z',
      source: { name: 'people.csv', format: 'csv', fingerprint: 'abc123' }
    });
    expect(reopened.source.path).toBe('/moved/people.csv');
    expect(reopened.source.fingerprint).toBe('abc123');
    expect(applyPreview(source, reopened.steps).rows).toEqual([[' Ada ', 'keep', '10']]);
  });
});
