import { describe, expect, it } from 'vitest';
import { findContentMatches, scanTextFiles, type ScannedFile } from './helpers/sourceScanner';

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

const self = 'tests/unit/architecture/deletedLegacyWorldStatePaths.spec.ts';

function isThisArchitectureSpec(file: ScannedFile): boolean {
  return file.projectPath === self;
}

describe('Architecture: deleted legacy world-state paths', () => {
  it('active source and tests do not reference deleted store/workspace geometry surfaces', () => {
    const files = scanTextFiles(['src', 'tests']);
    const pattern = new RegExp(deletedPathTerms.join('|'));

    expect(findContentMatches(files, pattern, { exclude: isThisArchitectureSpec })).toEqual([]);
  });
});
