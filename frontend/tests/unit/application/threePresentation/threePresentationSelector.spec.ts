import { describe, expect, it } from 'vitest';
import { ThreePresentationSelector } from '@/application/threePresentation/ThreePresentationSelector';

const displayOptions = { showPlanes: true, show2DElementsOnPlanes: true, showGrid: true, showReferenceAxes: true };

function selectorWithSpies() {
  const projectionPlanes = { select: viFn(() => [{ id: 'axis', kind: 'reference-axis', visible: true, style: { color: 1 }, renderGroup: 'axes', axis: 'x', origin: { x: 0, y: 0, z: 0 }, direction: { x: 1, y: 0, z: 0 }, length: 1, label: 'X' }]) };
  const planarElements = { select: viFn(() => []) };
  const reconstructedElements = { select: viFn(() => []) };
  const guides = { select: viFn(() => []) };
  const hinges = { select: viFn(() => []) };
  return { selector: new ThreePresentationSelector(projectionPlanes as any, planarElements as any, reconstructedElements as any, guides as any, hinges as any), projectionPlanes, planarElements, reconstructedElements, guides, hinges };
}

function viFn<T extends (...args: any[]) => any>(impl: T): T & { calls: any[][] } {
  const calls: any[][] = [];
  const fn = ((...args: any[]) => { calls.push(args); return impl(...args); }) as T & { calls: any[][] };
  fn.calls = calls;
  return fn;
}

describe('ThreePresentationSelector', () => {
  it('orchestrates concern-split selectors and passes selected IDs only to guide selection', () => {
    const { selector, projectionPlanes, planarElements, reconstructedElements, guides, hinges } = selectorWithSpies();
    const world = { marker: 'world' } as any;
    const model = selector.select({ world, displayOptions, selectedIds: ['guide-1'] });
    expect(model.projectionPlanes).toHaveLength(1);
    expect(projectionPlanes.select.calls[0]).toEqual([world, true, true, true]);
    expect(planarElements.select.calls[0]).toEqual([world, true]);
    expect(reconstructedElements.select.calls[0]).toEqual([world, true]);
    expect(guides.select.calls[0]).toEqual([world, ['guide-1']]);
    expect(hinges.select.calls[0]).toEqual([world, true]);
  });
});
