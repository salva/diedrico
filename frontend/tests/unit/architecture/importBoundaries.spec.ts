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

function isProductionSource(file: ScannedFile): boolean {
  return file.projectPath.startsWith('src/');
}


const consoleHygieneFiles = [
  'src/infrastructure/googleDrive/GoogleDriveService.ts',
  'src/utils/rectangleGrid.ts',
  'src/utils/projectionPlaneUtils.ts',
  'src/domain/world/HingeLine.ts',
  'src/domain/world/Guide.ts',
  'src/commands/operations/world/UpdateElementStyleOp.ts',
  'src/commands/operations/world/RemoveElementOps.ts',
  'src/commands/operations/processTree/ToggleOutputOp.ts',
  'src/commands/operations/processTree/ToggleEncapsulationOp.ts',
];

function isConsoleHygieneFile(file: ScannedFile): boolean {
  return consoleHygieneFiles.includes(file.projectPath);
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

  it('keeps UI components from importing service-layer helpers', () => {
    const componentFiles = scanTextFiles(['src/components']);

    expect(findForbiddenImports(componentFiles, [/^@\/services(\/|$)/, /\.\.\/services(\/|$)/])).toEqual([]);
  });

  it('keeps UI components from importing concrete tools', () => {
    const componentFiles = scanTextFiles(['src/components']);

    expect(findForbiddenImports(componentFiles, [/^@\/tools(\/|$)/, /\.\.\/tools(\/|$)/])).toEqual([]);
  });

  it('keeps SvgCanvas from importing the direct tool store', () => {
    const svgCanvasFiles = scanTextFiles(['src/components/workspace'])
      .filter(file => file.projectPath === 'src/components/workspace/SvgCanvas.vue');

    expect(svgCanvasFiles).toHaveLength(1);
    expect(findForbiddenImports(svgCanvasFiles, [
      /^@\/stores\/toolStore$/,
    ])).toEqual([]);
  });

  it('keeps UI components from importing domain process-tree model modules', () => {
    const componentFiles = scanTextFiles(['src/components']);

    expect(findForbiddenImports(componentFiles, [
      /^@\/domain\/processTree(\/|$)/,
      /(^|\/)domain\/processTree(\/|$)/,
    ])).toEqual([]);
  });

  it('keeps tools independent of stores', () => {
    const toolFiles = scanTextFiles(['src/tools']);

    expect(findForbiddenImports(toolFiles, [/^@\/stores(\/|$)/, /\.\.\/stores(\/|$)/])).toEqual([]);
  });

  it('keeps tools independent of application modules', () => {
    const toolFiles = scanTextFiles(['src/tools']);

    expect(findForbiddenImports(toolFiles, [/^@\/application(\/|$)/, /\.\.\/application(\/|$)/])).toEqual([]);
  });

  it('keeps the tool protocol owned by the tools layer', () => {
    const toolProtocolFiles = scanTextFiles(['src/tools'])
      .filter(file => file.projectPath === 'src/tools/ITool.ts');
    const applicationToolProtocolFiles = scanTextFiles(['src/application/tools'])
      .filter(file => file.projectPath === 'src/application/tools/CanvasTool.ts');

    expect(toolProtocolFiles).toHaveLength(1);
    expect(applicationToolProtocolFiles).toEqual([]);
    expect(findForbiddenImports(toolProtocolFiles, [/^@\/application\/tools\/CanvasTool$/])).toEqual([]);
  });

  it('keeps argument collection from mapping tool names through application intent taxonomy', () => {
    const argumentCollectorFiles = scanTextFiles(['src/tools'])
      .filter(file => file.projectPath === 'src/tools/ArgumentCollectorTool.ts');

    expect(argumentCollectorFiles).toHaveLength(1);
    expect(findContentMatches(argumentCollectorFiles, /constructionIntentTypeFromToolName/g)).toEqual([]);
  });

  it('keeps factories and render/input helpers out of the services directory', () => {
    const files = scanTextFiles(['src']);

    expect(findContentMatches(files, /src\/services\/factories|@\/services\/GeometryService|@\/services\/factories\//g, {
      exclude: isArchitectureSpec,
    })).toEqual([]);
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

  it('keeps routine console noise out of selected high-churn source files', () => {
    const files = frontendSourceAndTests().filter(isConsoleHygieneFile);

    expect(files.map(file => file.projectPath).sort()).toEqual([...consoleHygieneFiles].sort());
    expect(findContentMatches(files, /console\.(log|debug|info)\s*\(/g)).toEqual([]);
  });

  it('keeps routine console log/debug/info calls out of active source', () => {
    const files = scanTextFiles(['src']);

    expect(findContentMatches(files, /console\.(log|debug|info)\s*\(/g)).toEqual([]);
  });

  it('keeps active source free of compatibility and test-only implementation comments', () => {
    const files = scanTextFiles(['src']);

    expect(findContentMatches(files, /backward compatibility|FOR TESTS ONLY/gi)).toEqual([]);
  });

  it('keeps runtime view ports free of store, concrete-tool, and rendering implementation imports', () => {
    const runtimeViewPortFiles = scanTextFiles(['src/application/appShell'])
      .filter(file => file.projectPath === 'src/application/appShell/RuntimeViewPorts.ts');

    expect(runtimeViewPortFiles).toHaveLength(1);
    expect(findForbiddenImports(runtimeViewPortFiles, [
      /^@\/stores(\/|$)/,
      /^@\/tools\/(?!ToolCommandIntents$)/,
      /^@\/rendering(\/|$)/,
    ])).toEqual([]);
    expect(findContentMatches(runtimeViewPortFiles, /CanvasTool|invokeToolClick/g)).toEqual([]);
  });

  it('keeps app-shell ports free of store imports', () => {
    const appShellPortFiles = scanTextFiles(['src/application/appShell'])
      .filter(file => file.projectPath === 'src/application/appShell/AppShellPorts.ts');

    expect(appShellPortFiles).toHaveLength(1);
    expect(findForbiddenImports(appShellPortFiles, [/^@\/stores(\/|$)/, /stores\//])).toEqual([]);
  });

  it('keeps production code from importing deleted compatibility modules', () => {
    const productionFiles = scanTextFiles(['src']).filter(isProductionSource);

    expect(findForbiddenImports(productionFiles, [
      /ProjectSessionPersistenceAdapter$/,
      /ProjectSessionPersistenceTargets$/,
      /RuntimeSessionPersistenceSnapshotHandle$/,
      /RuntimeSessionPersistenceRestoreHandle$/,
      /ThreeWorldReadPort$/,
      /Projected3DCanvasReadPort$/,
    ])).toEqual([]);
  });

  it('keeps construction execution on typed intents instead of generic argument maps', () => {
    const constructionExecutionFiles = scanTextFiles(['src/application/construction', 'src/application/commandProduction'])
      .filter(isProductionSource);

    expect(findContentMatches(constructionExecutionFiles, /intent\.args\b|\bArgumentValue\b/g)).toEqual([]);
    expect(findForbiddenImports(constructionExecutionFiles, [/ToolArgumentCollector$/])).toEqual([]);
  });

  it('keeps presentation code from importing deleted read-port bridge modules', () => {
    const presentationFiles = scanTextFiles(['src/application/canvasPresentation', 'src/application/threePresentation'])
      .filter(isProductionSource);

    expect(findForbiddenImports(presentationFiles, [
      /ThreeWorldReadPort$/,
      /Projected3DCanvasReadPort$/,
    ])).toEqual([]);
    expect(findContentMatches(presentationFiles, /createThreePresentationReadPorts|ThreeWorldReadPort|Projected3DCanvasReadPort/g)).toEqual([]);
  });
});
