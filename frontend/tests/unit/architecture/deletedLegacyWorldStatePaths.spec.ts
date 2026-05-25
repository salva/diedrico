import { describe, expect, it } from 'vitest';

const deletedPathTerms = [
  'worldStore',
  'useWorldStore',
  'Workspace2D',
  'ElementRenderer',
  'ElementTypes',
  'useSnapping',
  'useElementGeometry',
  'getWorld',
];

describe('Architecture: deleted legacy world-state paths', () => {
  it('active source and tests do not reference deleted store/workspace geometry surfaces', () => {
    const fs = require('fs');
    const path = require('path');
    const sourceRoots = ['src', 'tests'].map((sourceRoot: string) => path.join(process.cwd(), sourceRoot));
    const ignoredPathFragments = [
      path.join('tests', 'unit', 'architecture', 'deletedLegacyWorldStatePaths.spec.ts'),
    ];

    function listTextFiles(directory: string): string[] {
      return fs.readdirSync(directory).flatMap((entry: string) => {
        const filePath = path.join(directory, entry);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          return listTextFiles(filePath);
        }

        if (/\.(ts|tsx|vue)$/.test(filePath)) {
          return [filePath];
        }

        return [];
      });
    }

    const violations = sourceRoots
      .flatMap(listTextFiles)
      .filter((filePath: string) => !ignoredPathFragments.some(fragment => filePath.endsWith(fragment)))
      .flatMap((filePath: string) => {
        const content = fs.readFileSync(filePath, 'utf-8');
        return deletedPathTerms
          .filter(term => content.includes(term))
          .map(term => `${path.relative(process.cwd(), filePath)} contains ${term}`);
      });

    expect(violations).toEqual([]);
  });
});
