import { describe, expect, it, vi } from 'vitest';
import { Vector3 } from 'three';
import { createTestWorld, getHorizontalPlane } from '../../../helpers/worldHelpers';
import { FreePoint2D } from '@/domain/world/Point';
import { Circle2DByCenterAndPoint } from '@/domain/world/Circle';
import { buildThreePresentationModel, ThreePresentationSelector, type ThreePresentationBuilderInput } from '@/application/threePresentation/ThreePresentationSelector';
import { createThreePresentationContext } from '@/application/threePresentation/ThreePresentationContext';
import { buildPlanarPlaneModels } from '@/application/threePresentation/ThreePlanarElementBuilder';
import { buildProjectionPlaneModels } from '@/application/threePresentation/ThreeProjectionPlaneBuilder';
import { buildReconstructedModels } from '@/application/threePresentation/ThreeReconstructedElementBuilder';
import { buildProjectionLineModels } from '@/application/threePresentation/ThreeProjectionLineBuilder';
import { buildHingeModels } from '@/application/threePresentation/ThreeHingeBuilder';
import { buildSelectedGuideModels, buildGuideIntersectionModels } from '@/application/threePresentation/ThreeGuideBuilder';

// Exact pre-C orchestration: deliberately eager, used only as a parity/performance reference.
function eager(input: ThreePresentationBuilderInput) {
  const context = createThreePresentationContext(input.world, input.realizations, input.processTree, input.visibilityModel);
  const guides = buildSelectedGuideModels(context, input.selectedIds);
  return new ThreePresentationSelector().select({
    projectionPlanes: buildProjectionPlaneModels(context), planarPlanes: buildPlanarPlaneModels(context),
    reconstructedElements: buildReconstructedModels(context), projectionLines: buildProjectionLineModels(context),
    guides, guideIntersections: guides.length ? buildGuideIntersectionModels(context) : undefined,
    hinges: buildHingeModels(context), displayOptions: input.displayOptions,
  });
}

function fixture() {
  const { world, operationContext, visibilityModel } = createTestWorld();
  const plane = getHorizontalPlane(world);
  for (let i = 0; i < 200; i++) plane.addPoint(new FreePoint2D(`${plane.id}/fixture${i}`, new Vector3(i + 1, i % 31, 1), plane.id));
  for (let i = 0; i < 20; i++) plane.addCircle(new Circle2DByCenterAndPoint(`${plane.id}/circle${i}`, `${plane.id}/fixture${i}`, `${plane.id}/fixture${i + 1}`, plane.id));
  return { world, visibilityModel, processTree: operationContext.processTree, realizations: operationContext.realizations, selectedIds: [] };
}

const keys = ['showPlanes', 'show2DElementsOnPlanes', 'showLinkingVisuals', 'showGrid', 'showReferenceAxes'] as const;
function options(mask: number) {
  return Object.fromEntries(keys.map((key, index) => [key, Boolean(mask & (1 << index))])) as Record<typeof keys[number], boolean>;
}

describe('three category filtering', () => {
  it('preserves exact ordered DTOs for all 32 display-option combinations', () => {
    const input = fixture();
    for (let mask = 0; mask < 32; mask++) {
      const request = { ...input, displayOptions: options(mask) };
      expect(buildThreePresentationModel(request), `mask ${mask}`).toEqual(eager(request));
    }
  });

  it('avoids hidden category work while retaining independent reference axes', () => {
    const input = fixture();
    const traversal = vi.spyOn(input.world, 'getAllProjectionPlanes');
    const model = buildThreePresentationModel({ ...input, displayOptions: options(16) });
    expect(traversal).not.toHaveBeenCalled();
    expect(model.projectionPlanes.filter(item => item.kind === 'reference-axis')).toHaveLength(3);
    expect(model.planarElements).toEqual([]);
    expect(model.reconstructedElements).toEqual([]);
  });

  it('reports representative warm eager/filtered timings without a flaky speed threshold', () => {
    const input = fixture();
    for (const mask of [0, 31]) {
      const request = { ...input, displayOptions: options(mask) };
      eager(request); buildThreePresentationModel(request);
      const samples = (build: typeof eager) => {
        const values: number[] = [];
        for (let i = 0; i < 15; i++) {
          const start = performance.now(); build(request); values.push(performance.now() - start);
        }
        return values.sort((a, b) => a - b)[7]!;
      };
      console.info(JSON.stringify({ workload: '200 free points, 20 circles, initialized H/V', mask, samples: 15, eagerMedianMs: samples(eager), filteredMedianMs: samples(buildThreePresentationModel) }));
    }
  });
});
