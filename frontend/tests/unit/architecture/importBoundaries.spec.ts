import { describe, expect, it } from 'vitest';
import { findContentMatches, findForbiddenImports, scanTextFiles, type ScannedFile } from './helpers/sourceScanner';

const frontendSourceAndTests = () => scanTextFiles(['src', 'tests']);

const staleBackendProjectTerms = new RegExp([
  ['localhost:3000', 'api', 'projects'].join('/'),
  '/api/' + 'projects',
  'Project' + 'DTO',
  'Project' + 'Metadata',
  'Open' + 'Project' + 'Dialog',
].join('|'));

function isArchitectureSpec(file: ScannedFile): boolean {
  return file.projectPath.startsWith('tests/unit/architecture/');
}


const wave012ConsoleHygieneFiles = [
  'src/services/GoogleDriveService.ts',
  'src/utils/rectangleGrid.ts',
  'src/utils/projectionPlaneUtils.ts',
  'src/domain/world/HingeLine.ts',
  'src/domain/world/Guide.ts',
  'src/commands/operations/world/UpdateElementStyleOp.ts',
  'src/commands/operations/world/RemoveElementOps.ts',
  'src/commands/operations/processTree/ToggleOutputOp.ts',
  'src/commands/operations/processTree/ToggleEncapsulationOp.ts',
];

function isWave012ConsoleHygieneFile(file: ScannedFile): boolean {
  return wave012ConsoleHygieneFiles.includes(file.projectPath);
}

function isWave010NegativeE2EGuard(file: ScannedFile): boolean {
  return file.projectPath === 'tests/e2e/wave010-app-shell-project-flow.spec.ts';
}

describe('Architecture: import boundaries', () => {
  it('keeps UI components from importing command construction surfaces', () => {
    const componentFiles = scanTextFiles(['src/components']);

    expect(findForbiddenImports(componentFiles, [
      /^@\/commands(\/|$)/,
      /^@\/application\/commands(\/|$)/,
      /commands\/operations/,
      /CommandStack$/,
      /CommandFactory$/,
    ])).toEqual([]);
  });

  it('keeps command construction available to application/use-case modules', () => {
    const applicationFiles = scanTextFiles(['src/application']);
    const commandImports = applicationFiles.flatMap(file =>
      file.imports
        .filter(importSource => /^@\/commands(\/|$)/.test(importSource) || /commands\/operations/.test(importSource))
        .map(importSource => `${file.projectPath} imports ${importSource}`),
    );

    expect(commandImports.length).toBeGreaterThan(0);
  });

  it('forbids frontend source and tests from importing backend implementation files', () => {
    const files = frontendSourceAndTests();

    expect(findForbiddenImports(files, [/backend\/src/, /^backend\/src/])).toEqual([]);
    expect(findContentMatches(files, /backend\/src\//g, { exclude: isArchitectureSpec })).toEqual([]);
  });

  it('keeps stale backend project API and DTO terms out of active frontend code', () => {
    const files = frontendSourceAndTests();

    expect(findContentMatches(files, staleBackendProjectTerms, {
      exclude: file => isArchitectureSpec(file) || isWave010NegativeE2EGuard(file),
    })).toEqual([]);
  });

  it('does not reference deleted debug/example/placeholder operation surfaces from active source or tests', () => {
    const files = frontendSourceAndTests();

    expect(findContentMatches(files, /operations\/(paper|toolbar|debug)|ExamplesMenu|AddExampleSetupOp|projection-plane-setup|basic-3d-point-setup/g, {
      exclude: isArchitectureSpec,
    })).toEqual([]);
  });

  it('keeps routine console noise out of the Wave 012 cleanup files only', () => {
    const files = frontendSourceAndTests().filter(isWave012ConsoleHygieneFile);

    expect(files.map(file => file.projectPath).sort()).toEqual([...wave012ConsoleHygieneFiles].sort());
    expect(findContentMatches(files, /console\.(log|debug|info)\s*\(/g)).toEqual([]);
  });
});
