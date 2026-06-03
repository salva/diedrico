import { describe, expect, it } from 'vitest';
import { findContentMatches, findForbiddenImports, scanTextFiles } from './helpers/sourceScanner';
import runtimeSession from '@/application/appShell/RuntimeSession.ts?raw';

const forbiddenOuterLayerImports = [
  /^@\/application(\/|$)/,
  /^@\/commands(\/|$)/,
  /^@\/services(\/|$)/,
  /^@\/components(\/|$)/,
  /^@\/stores(\/|$)/,
  /^@\/persistence(\/|$)/,
  /^\.\.\/(?:\.\.\/)*application(\/|$)/,
  /^\.\.\/(?:\.\.\/)*commands(\/|$)/,
  /^\.\.\/(?:\.\.\/)*services(\/|$)/,
  /^\.\.\/(?:\.\.\/)*components(\/|$)/,
  /^\.\.\/(?:\.\.\/)*stores(\/|$)/,
  /^\.\.\/(?:\.\.\/)*persistence(\/|$)/,
];

describe('Architecture: domain world boundary', () => {
  it('keeps every domain module independent of application, command, service, UI, store, and persistence layers', () => {
    const domainFiles = scanTextFiles(['src/domain']);

    expect(findForbiddenImports(domainFiles, forbiddenOuterLayerImports)).toEqual([]);
  });

  it('keeps World.ts specifically free of outer-layer imports', () => {
    const worldFile = scanTextFiles(['src/domain/world']).filter(file => file.projectPath === 'src/domain/world/World.ts');

    expect(worldFile).toHaveLength(1);
    expect(findForbiddenImports(worldFile, forbiddenOuterLayerImports)).toEqual([]);
  });

  it('keeps active-plane UI state out of World.ts', () => {
    const [worldFile] = scanTextFiles(['src/domain/world']).filter(file => file.projectPath === 'src/domain/world/World.ts');

    expect(worldFile.content).not.toMatch(/activePlaneId|getActivePlaneId|setActivePlaneId/);
  });

  it('keeps World realization cache storage in RealizationStore', () => {
    const files = scanTextFiles(['src/domain/world']);
    const [worldFile] = files.filter(file => file.projectPath === 'src/domain/world/World.ts');
    const [storeFile] = files.filter(file => file.projectPath === 'src/domain/world/RealizationStore.ts');

    expect(storeFile).toBeDefined();
    expect(worldFile.content).toMatch(/new RealizationStore\(\)/);
    expect(worldFile.content).not.toMatch(/pointRealizations3D|projectionPlaneRealizations2D|projectionPlaneRealizations3D|lineRealizations3D|segmentRealizations3D|planeRealizations3D/);
    expect(storeFile.content).toMatch(/new Map<string, Point3DRealization3D>/);
    expect(storeFile.content).toMatch(/new Map<string, ProjectionPlaneRealization2D>/);
  });

  it('keeps World ID allocation delegated to WorldIdAllocator', () => {
    const files = scanTextFiles(['src/domain/world']);
    const [worldFile] = files.filter(file => file.projectPath === 'src/domain/world/World.ts');
    const [allocatorFile] = files.filter(file => file.projectPath === 'src/domain/world/WorldIdAllocator.ts');

    expect(allocatorFile).toBeDefined();
    expect(worldFile.content).toMatch(/new WorldIdAllocator\(\)/);
    expect(worldFile.content).not.toMatch(/private nextId/);
    expect(allocatorFile.content).toMatch(/next\(\): number/);
    expect(allocatorFile.content).toMatch(/prefixed\(prefix: string\): string/);
  });

  it('routes RuntimeSession port subscriptions through the standalone RuntimeChangePublisher', () => {
    expect(runtimeSession).toMatch(/new RuntimeChangePublisher\(\)/);
    expect(runtimeSession).not.toMatch(/this\.world\.subscribeToChanges|this\.world\.unsubscribeFromChanges|this\.world\.getVersion\(/);
    expect(runtimeSession).toMatch(/this\.changes\.getVersion\(\)/);
  });

  it('keeps World.ts free of notification plumbing', () => {
    const [worldFile] = scanTextFiles(['src/domain/world']).filter(file => file.projectPath === 'src/domain/world/World.ts');

    expect(worldFile.content).not.toMatch(/subscribeToChanges\(/);
    expect(worldFile.content).not.toMatch(/unsubscribeFromChanges\(/);
    expect(worldFile.content).not.toMatch(/markDirty\(\)/);
    expect(worldFile.content).not.toMatch(/notifyChange\(\)/);
    expect(worldFile.content).not.toMatch(/changeListeners/);
    expect(worldFile.content).not.toMatch(/_version/);
  });

  it('keeps ProcessTree free of notification plumbing', () => {
    const [processTreeFile] = scanTextFiles(['src/domain/processTree']).filter(file => file.projectPath === 'src/domain/processTree/ProcessTree.ts');

    expect(processTreeFile).toBeDefined();
    expect(processTreeFile.content).not.toMatch(/_version/);
    expect(processTreeFile.content).not.toMatch(/listeners/);
    expect(processTreeFile.content).not.toMatch(/notifyChange/);
    expect(processTreeFile.content).not.toMatch(/getVersion/);
    expect(processTreeFile.content).not.toMatch(/subscribe\(/);
  });

  it('keeps ProcessTree generated IDs deterministic and local to the domain model', () => {
    const [processTreeFile] = scanTextFiles(['src/domain/processTree'])
      .filter(file => file.projectPath === 'src/domain/processTree/ProcessTree.ts');

    expect(processTreeFile.content).toMatch(/nextNodeCounter/);
    expect(processTreeFile.content).toMatch(/reserveNodeId/);
    expect(processTreeFile.content).not.toMatch(/Date\.now\(\)|Math\.random\(\)/);
  });

  it('keeps dependency access narrowed to query and registrar ports outside World', () => {
    const files = scanTextFiles(['src/application', 'src/commands', 'src/domain/world/projectionPlane']);
    const offenders = files
      .filter(file => file.projectPath !== 'src/domain/world/projectionPlane/ProjectionPlaneContext.ts')
      .filter(file => /getDependencyService\(\)\.(registerNode|unregisterNode|getElementsInDeletionOrder|getDependencies|getDependents|getAllDependencies|getAllDependents|getElementDependencies)/.test(file.content))
      .map(file => file.projectPath);

    expect(offenders).toEqual([]);
  });

  it('keeps domain code free of console side effects', () => {
    const domainFiles = scanTextFiles(['src/domain']);

    expect(findContentMatches(domainFiles, /console\.(log|debug|info|warn|error)\s*\(/g)).toEqual([]);
  });
});
