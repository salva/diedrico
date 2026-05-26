import { describe, expect, it } from 'vitest';
import { findForbiddenImports, scanTextFiles } from './helpers/sourceScanner';

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
});
