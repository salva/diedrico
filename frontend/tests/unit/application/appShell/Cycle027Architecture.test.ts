import { describe, expect, it } from 'vitest';
import runtimeSession from '@/application/appShell/RuntimeSession.ts?raw';
import canvasWorldReadPort from '@/application/canvasPresentation/CanvasWorldReadPort.ts?raw';
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

  it('deletes canvas process-tree visibility seam while documenting retained raw residuals in code', () => {
    expect(canvasWorldReadPort).not.toMatch(/getProcessTree\(\):|getProcessTree: \(\)/);
    expect(canvasVisibilityPolicy).not.toMatch(/Pick<World, 'getProcessTree'>|as World/);
    expect(canvasVisibilityPolicy).toMatch(/CanvasElementVisibilityPort/);
    expect(canvasWorldReadPort).toMatch(/getAllProjectionPlanes\(\): ProjectionPlane\[\]/);
    expect(canvasWorldReadPort).toMatch(/getAll3DPoints\(\): Point3D\[\]/);
    expect(canvasWorldReadPort).toMatch(/getAll3DLines\(\): Line3D\[\]/);
    expect(canvasWorldReadPort).toMatch(/getAll3DSegments\(\): Segment3D\[\]/);
  });
});
