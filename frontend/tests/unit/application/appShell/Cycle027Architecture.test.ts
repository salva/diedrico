import { describe, expect, it } from 'vitest';
import runtimeSession from '@/application/appShell/RuntimeSession.ts?raw';
import canvasWorldReadPort from '@/application/canvasPresentation/CanvasWorldReadPort.ts?raw';
import canvasPresentationSelector from '@/application/canvasPresentation/CanvasPresentationSelector.ts?raw';
import projected3DCanvasSelector from '@/application/canvasPresentation/Projected3DCanvasSelector.ts?raw';
import canvasVisibilityPolicy from '@/application/canvasPresentation/CanvasVisibilityPolicy.ts?raw';
import elementsPanelReadModel from '@/application/appShell/readModels/ElementsPanelReadModel.ts?raw';
import elementVisibilityIntent from '@/application/appShell/readModels/ElementVisibilityIntent.ts?raw';

describe('Cycle 027 runtime read-model ownership boundaries', () => {
  it('removes targeted inline RuntimeSession read-model helper bodies', () => {
    expect(runtimeSession).not.toMatch(/private describeElementType|private describeCoordinates|private describeDependencies|private styleView/);
    expect(runtimeSession).not.toMatch(/private createProcessNodeViewModel|private isActionInfeasible|private countProcessNodeViewModels/);
    expect(runtimeSession).not.toMatch(/private formatElementForPanel|private getElementProperties/);
    expect(runtimeSession).toMatch(/buildPropertiesDialogViewModel/);
    expect(runtimeSession).toMatch(/buildProcessTreeReadModel/);
    expect(runtimeSession).toMatch(/buildElementsPanelReadModel/);
    expect(runtimeSession).toMatch(/toggleElementVisibility/);
  });

  it('keeps visibility intent separate from elements read model DTO construction', () => {
    expect(elementsPanelReadModel).not.toMatch(/toggleElementVisibility|markDirty\(|visualStyle\.visible =/);
    expect(elementVisibilityIntent).toMatch(/toggleElementVisibility/);
    expect(elementVisibilityIntent).toMatch(/markDirty\(\)/);
  });

  it('keeps canvas visibility process-tree seam deleted and Cycle 028 raw collection seams out of the public canvas port', () => {
    expect(canvasWorldReadPort).not.toMatch(/getProcessTree\(\):|getProcessTree: \(\)/);
    expect(canvasVisibilityPolicy).not.toMatch(/Pick<World, 'getProcessTree'>|as World/);
    expect(canvasVisibilityPolicy).toMatch(/CanvasElementVisibilityPort/);
    expect(canvasWorldReadPort).toMatch(/getCanvasPlaneTransforms\(\): CanvasPlaneTransformModel\[\]/);
    expect(canvasWorldReadPort).toMatch(/getPlaneCanvasItems\(\): CanvasPlaneCanvasItems\[\]/);
    expect(canvasWorldReadPort).toMatch(/getProjected3DCanvasItems\(planeTransforms: Map<string, CanvasPlaneTransformModel>\): CanvasRenderItem\[\]/);
    expect(canvasWorldReadPort).not.toMatch(/getAllProjectionPlanes\(\): ProjectionPlane\[\]|getAll3DPoints\(\): Point3D\[\]|getAll3DLines\(\): Line3D\[\]|getAll3DSegments\(\): Segment3D\[\]/);
    expect(canvasWorldReadPort).not.toMatch(/realizePoint2D\([^)]*\):|realizeLine2D\([^)]*\):|realizeCircle2D\([^)]*\):|realizePoint3D\([^)]*\):|realizeLine3D\([^)]*\):|realizeSegment3D\([^)]*\):/);
    expect(canvasPresentationSelector).not.toMatch(/getAllProjectionPlanes\(|plane\.getAllPoints\(|plane\.getAllLines\(|plane\.getAllCircles\(|instanceof/);
    expect(projected3DCanvasSelector).not.toMatch(/getAllProjectionPlanes\(|getAll3DPoints\(|getAll3DLines\(|getAll3DSegments\(/);
  });
});
