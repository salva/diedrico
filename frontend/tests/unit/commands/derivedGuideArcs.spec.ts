import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { createTestWorld, getHorizontalPlane } from '../../helpers/worldHelpers';
import { executeConstructionIntent } from '@/application/construction/ConstructionUseCases';
import { RuntimeCommandProducer } from '@/application/commandProduction/RuntimeCommandProducer';
import { BrokenHalfHingeLine2D } from '@/domain/world/elements/BrokenHalfHingeLine2D';
import { GuideSequenceFactory } from '@/commands/factories/GuideSequenceFactory';
import { Command } from '@/commands/Command';
import { AddFreePoint2DOp } from '@/commands/operations/world/AddFreePointOp';
import { UpdateFreePoint2DPositionOp } from '@/commands/operations/world/UpdateFreePoint2DPositionOp';
import { deserializeOperation, serializeOperation } from '@/commands/operations/OperationRegistry';
import { buildCanvasPresentationModel } from '@/application/canvasPresentation/CanvasPresentationSelector';

describe('derived broken-hinge arcs', () => {
  it('rebuilds arcs after operation replay and source movement', () => {
    const { world, visibilityModel, commandStack, operationContext: ctx } = createTestWorld();
    expect(executeConstructionIntent({ operationContext: ctx, commands: new RuntimeCommandProducer(ctx, commandStack), intent: { type: 'create-yz-projection-plane', description: 'YZ' } }).success).toBe(true);
    const plane = getHorizontalPlane(world);
    const hinge = plane.getAllLines().find(line => line instanceof BrokenHalfHingeLine2D)!;
    const cmd = new Command('Guide', ctx);
    const pointId = cmd.addAndExecute(new AddFreePoint2DOp(plane.id, new Vector3(70, 30, 1))).outputs.pointId!;
    const pair = GuideSequenceFactory.createGuideWithSibling(cmd, plane.id, hinge.id, pointId, world, ctx.realizationContext);
    const arcs = () => buildCanvasPresentationModel(world, { zoom: 1, panX: 0, panY: 0, width: 400, height: 300 }, { activePlaneId: plane.id, visibilityModel, processTree: ctx.processTree, realizations: ctx.realizations, gridVisible: false }).renderItems.filter(item => item.kind === 'arc' && item.sourceEntityId === pair.guideId);
    const before = JSON.stringify(arcs());
    expect(arcs().length).toBeGreaterThan(0);
    const descriptors = cmd.getOperations().map(serializeOperation);
    cmd.commit(); cmd.undo();
    for (const descriptor of descriptors) expect(deserializeOperation(descriptor).apply(ctx).success).toBe(true);
    expect(JSON.stringify(arcs())).toBe(before);
    expect(new UpdateFreePoint2DPositionOp(plane.id, pointId, new Vector3(120, 90, 1)).apply(ctx).success).toBe(true);
    expect(JSON.stringify(arcs())).not.toBe(before);
  });
});
