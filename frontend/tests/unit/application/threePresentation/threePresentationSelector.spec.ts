import { describe, expect, it } from 'vitest';
import { ThreePresentationSelector } from '@/application/threePresentation/ThreePresentationSelector';
import type { ThreePresentationReadPorts } from '@/application/threePresentation/ThreeWorldReadPort';
import type { ProjectionPlane3DSelector } from '@/application/threePresentation/ProjectionPlane3DSelector';
import type { PlanarElement3DSelector } from '@/application/threePresentation/PlanarElement3DSelector';
import type { ReconstructedElement3DSelector } from '@/application/threePresentation/ReconstructedElement3DSelector';
import type { Guide3DSelector } from '@/application/threePresentation/Guide3DSelector';
import type { Hinge3DSelector } from '@/application/threePresentation/Hinge3DSelector';

const displayOptions = { showPlanes: true, show2DElementsOnPlanes: true, showGrid: true, showReferenceAxes: true };

function selectorWithSpies() {
  const projectionPlanes = { select: spy(() => [{ id: 'axis', kind: 'reference-axis', visible: true, style: { color: 1 }, renderGroup: 'axes', axis: 'x', origin: { x: 0, y: 0, z: 0 }, direction: { x: 1, y: 0, z: 0 }, length: 1, label: 'X' }]) };
  const planarElements = { select: spy(() => []) };
  const reconstructedElements = { select: spy(() => []) };
  const guides = { select: spy(() => []) };
  const hinges = { select: spy(() => []) };
  return {
    selector: new ThreePresentationSelector(
      projectionPlanes as unknown as ProjectionPlane3DSelector,
      planarElements as unknown as PlanarElement3DSelector,
      reconstructedElements as unknown as ReconstructedElement3DSelector,
      guides as unknown as Guide3DSelector,
      hinges as unknown as Hinge3DSelector,
    ),
    projectionPlanes,
    planarElements,
    reconstructedElements,
    guides,
    hinges,
  };
}

function spy<T extends (...args: unknown[]) => unknown>(impl: T): T & { calls: unknown[][] } {
  const calls: unknown[][] = [];
  const fn = ((...args: unknown[]) => { calls.push(args); return impl(...args); }) as T & { calls: unknown[][] };
  fn.calls = calls;
  return fn;
}

describe('ThreePresentationSelector', () => {
  it('orchestrates concern-split selectors through named read-port slices and passes selected IDs only to guide selection', () => {
    const { selector, projectionPlanes, planarElements, reconstructedElements, guides, hinges } = selectorWithSpies();
    const readPorts: ThreePresentationReadPorts = {
      projectionPlanes: { getProjectionPlaneModels: () => [], getProjectionPlaneGridSource: () => ({ plane3DRealization: undefined, projectionRealization: undefined }) },
      planarElements: { getPlanarPlaneModels: () => [] },
      reconstructedElements: { getReconstructedModels: () => ({ points: [], lines: [], segments: [], planes: [] }) },
      guides: { getSelectedGuideModels: () => [], getGuideIntersectionModels: () => ({ points: [], lines: [], segments: [] }) },
      hinges: { getHingeModels: () => [] },
    };

    const model = selector.select({ readPorts, displayOptions, selectedIds: ['guide-1'] });

    expect(model.projectionPlanes).toHaveLength(1);
    expect(projectionPlanes.select.calls[0]).toEqual([readPorts.projectionPlanes, true, true, true]);
    expect(planarElements.select.calls[0]).toEqual([readPorts.planarElements, true]);
    expect(reconstructedElements.select.calls[0]).toEqual([readPorts.reconstructedElements, true]);
    expect(guides.select.calls[0]).toEqual([readPorts.guides, ['guide-1']]);
    expect(hinges.select.calls[0]).toEqual([readPorts.hinges, true]);
  });
});
