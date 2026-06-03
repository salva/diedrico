import type { CommandOperationBuilder, ToolCommandExecutionPort } from '@/application/commandProduction/CommandProductionPorts';
import type { World } from '@/domain/world/World';
import type { ToolConstructionIntent, ToolCommandResult } from '@/tools/ToolCommandIntents';
import type { Point2D } from '@/domain/world/Point';
import { Line2D } from '@/domain/world/Line';
import { Circle2D } from '@/domain/world/Circle';
import { PointSequenceFactory } from '@/commands/factories/PointSequenceFactory';
import { LineSequenceFactory } from '@/commands/factories/LineSequenceFactory';
import { CircleSequenceFactory } from '@/commands/factories/CircleSequenceFactory';
import { GuideSequenceFactory } from '@/commands/factories/GuideSequenceFactory';
import { IntersectionSequenceFactory } from '@/commands/factories/IntersectionSequenceFactory';
import { PlaneSequenceFactory } from '@/commands/factories/PlaneSequenceFactory';
import { AddSegment2DByPointsOp } from '@/commands/operations/world/AddSegmentOp';
import { Add3DPointOp } from '@/commands/operations/world/Add3DPointOp';
import { Add3DLineOp } from '@/commands/operations/world/Add3DLineOp';
import { Add3DSegmentOp } from '@/commands/operations/world/Add3DSegmentOp';
import { AddLine2DTangentToCircleThroughPointOp, AddLine2DTangentToCircleParallelToLineOp } from '@/commands/operations/world/AddLineOp';
import { createActionGroup } from '@/domain/processTree/ActionGroup';
import { AddProcessTreeActionGroupOp } from '@/commands/operations/processTree/AddProcessTreeActionGroupOp';
import { AddProcessTreeActionOp } from '@/commands/operations/processTree/AddProcessTreeActionOp';
import { createSegmentAction } from '@/domain/processTree/actions/CreateSegmentAction';
import { createGuideAction } from '@/domain/processTree/actions/CreateGuideAction';
import { createSiblingGuideAction } from '@/domain/processTree/actions/CreateSiblingGuideAction';
import { createAdd3DPointAction, createAdd3DLineAction, createAdd3DSegmentAction } from '@/domain/processTree/actions/Element3DActions';
import { createTangentLineToCircleThroughPointAction, createTangentLineToCircleParallelToLineAction } from '@/domain/processTree/actions/CreateTangentLineAction';
import { areLinesParallel, intersectLineCircle, intersectCircleCircle } from '@/domain/calculations/Intersections';

export interface ExecuteConstructionParams {
  intent: ToolConstructionIntent;
  world: World;
  commands: ToolCommandExecutionPort;
}

export function executeConstructionIntent({ intent, world, commands }: ExecuteConstructionParams): ToolCommandResult {
  const result = commands.executeToolCommand(intent.description, (cmd) => {
    const groupId = `group_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const group = createActionGroup(groupId);
    cmd.addAndExecute(new AddProcessTreeActionGroupOp(group));
    executeConstructionOperations(cmd, intent, world, groupId);
    checkCreatedElementsFeasibility(cmd, world);
  });

  return result.success
    ? { success: true, message: `${intent.description} completed successfully` }
    : result;
}

function executeConstructionOperations(cmd: CommandOperationBuilder, intent: ToolConstructionIntent, world: World, groupId: string): void {
  const args = intent.args;
  const planeId = intent.planeId;

  switch (intent.type) {
    case 'point': {
      const planeCoords = args.get('position')!.planeCoords;
      validateCoordinates(planeCoords);
      if (!world.getProjectionPlaneById(planeId)) throw new Error(`Plane not found: ${planeId}`);
      PointSequenceFactory.createFreePoint(cmd, planeId, planeCoords, groupId);
      return;
    }
    case 'line': {
      const p1 = args.get('point1')!.element as Point2D;
      const p2 = args.get('point2')!.element as Point2D;
      LineSequenceFactory.createLineByTwoPoints(cmd, planeId, p1.id, p2.id, groupId);
      return;
    }
    case 'segment': {
      const p1 = args.get('point1')!.element as Point2D;
      const p2 = args.get('point2')!.element as Point2D;
      const result = cmd.addAndExecute(new AddSegment2DByPointsOp(planeId, p1.id, p2.id));
      cmd.addAndExecute(new AddProcessTreeActionOp(createSegmentAction(result.outputs.segmentId as string), groupId));
      return;
    }
    case 'circle': {
      const center = args.get('center')!.element as Point2D;
      const circumferencePoint = args.get('circumferencePoint')!.element as Point2D;
      CircleSequenceFactory.createCircleByCenterAndPoint(cmd, planeId, center.id, circumferencePoint.id, groupId);
      return;
    }
    case 'guide': {
      const referenceLineId = args.get('referenceLine')!.element!.id;
      const throughPointId = args.get('throughPoint')!.element!.id;
      const result = GuideSequenceFactory.createGuideWithSibling(cmd, planeId, referenceLineId, throughPointId, world);
      cmd.addAndExecute(new AddProcessTreeActionOp(createGuideAction(result.guideId), groupId));
      if (result.siblingGuideId) cmd.addAndExecute(new AddProcessTreeActionOp(createSiblingGuideAction(result.siblingGuideId), groupId));
      return;
    }
    case 'parallel-line': {
      const line = args.get('referenceLine')!.element as Line2D;
      const point = args.get('throughPoint')!.element as Point2D;
      LineSequenceFactory.createParallelLine(cmd, planeId, line.id, point.id, groupId);
      return;
    }
    case 'perpendicular-line': {
      const line = args.get('referenceLine')!.element as Line2D;
      const point = args.get('throughPoint')!.element as Point2D;
      LineSequenceFactory.createPerpendicularLine(cmd, planeId, line.id, point.id, groupId);
      return;
    }
    case 'intersection': {
      createIntersection(cmd, intent, world, groupId);
      return;
    }
    case 'tangent-line-to-circle-through-point': {
      const circle = args.get('circle')!.element as Circle2D;
      const point = args.get('throughPoint')!.element as Point2D;
      const tangentIndex = intent.metadata.tangentIndex;
      const result = cmd.addAndExecute(new AddLine2DTangentToCircleThroughPointOp(planeId, circle.id, point.id, tangentIndex));
      cmd.addAndExecute(new AddProcessTreeActionOp(createTangentLineToCircleThroughPointAction(result.outputs.lineId as string), groupId));
      return;
    }
    case 'tangent-line-to-circle-parallel': {
      const circle = args.get('circle')!.element as Circle2D;
      const line = args.get('referenceLine')!.element as Line2D;
      const tangentIndex = intent.metadata.tangentIndex;
      const result = cmd.addAndExecute(new AddLine2DTangentToCircleParallelToLineOp(planeId, circle.id, line.id, tangentIndex));
      cmd.addAndExecute(new AddProcessTreeActionOp(createTangentLineToCircleParallelToLineAction(result.outputs.lineId as string), groupId));
      return;
    }
    case 'create3dpoint': {
      const p1 = args.get('projection1')!.element!;
      const p2 = args.get('projection2')!.element!;
      const result = cmd.addAndExecute(new Add3DPointOp(p1.id, p2.id, p1.planeId, p2.planeId));
      cmd.addAndExecute(new AddProcessTreeActionOp(createAdd3DPointAction(result.outputs.pointId as string), groupId));
      return;
    }
    case 'create3dline': {
      const l1 = args.get('projection1')!.element!;
      const l2 = args.get('projection2')!.element!;
      const result = cmd.addAndExecute(new Add3DLineOp(l1.id, l2.id, l1.planeId, l2.planeId));
      cmd.addAndExecute(new AddProcessTreeActionOp(createAdd3DLineAction(result.outputs.lineId as string), groupId));
      return;
    }
    case 'create3dsegment': {
      const s1 = args.get('projection1')!.element!;
      const s2 = args.get('projection2')!.element!;
      const result = cmd.addAndExecute(new Add3DSegmentOp(s1.id, s2.id, s1.planeId, s2.planeId));
      cmd.addAndExecute(new AddProcessTreeActionOp(createAdd3DSegmentAction(result.outputs.segmentId as string), groupId));
      return;
    }
    case 'create3dplane': {
      const t1 = args.get('trace1')!.element!;
      const t2 = args.get('trace2')!.element!;
      PlaneSequenceFactory.create3DPlaneFromTraces(cmd, t1.id, t2.id, t1.planeId, t2.planeId, undefined, groupId);
      return;
    }
    case 'createprojectionplane': {
      const t1 = args.get('t1HingeTrace')!.element!;
      const t2 = args.get('t2OtherTrace')!.element!;
      const t2Prime = args.get('t2PrimePositionLine')!.element!;
      const { planeId: plane3DId } = PlaneSequenceFactory.create3DPlaneFromTraces(cmd, t1.id, t2.id, t1.planeId, t2.planeId, undefined, groupId);
      PlaneSequenceFactory.createAuxiliaryProjectionPlane(cmd, world, plane3DId, t1.id, t2.id, t2Prime.id, t1.planeId, undefined, groupId);
      return;
    }
    case 'interactiveprojectionsetup': {
      throw new Error('Interactive projection setup is not retained in Wave 006a application controller');
    }
    default:
      throw new Error(`Unsupported construction intent: ${(intent as any).type}`);
  }
}

function createIntersection(cmd: CommandOperationBuilder, intent: Extract<ToolConstructionIntent, { type: 'intersection' }>, world: World, groupId: string): void {
  const element1 = intent.args.get('element1')!.element!;
  const element2 = intent.args.get('element2')!.element!;
  const selectionPoint = intent.metadata.selectionPoint;
  if (element1 instanceof Line2D && element2 instanceof Line2D) {
    const r1 = element1.realize2D(world);
    const r2 = element2.realize2D(world);
    if (!r1 || !r2) throw new Error('Could not realize lines.');
    if (areLinesParallel(r1, r2)) throw new Error('Lines are parallel and do not intersect.');
    IntersectionSequenceFactory.createLineLineIntersection(cmd, intent.planeId, element1.id, element2.id, world, groupId);
  } else if (element1 instanceof Line2D && element2 instanceof Circle2D) {
    const index = lineCircleIndex(element1.id, element2.id, selectionPoint, world);
    if (index === null) throw new Error('Line and circle do not intersect.');
    IntersectionSequenceFactory.createLineCircleIntersection(cmd, intent.planeId, element1.id, element2.id, index, world, groupId);
  } else if (element1 instanceof Circle2D && element2 instanceof Line2D) {
    const index = lineCircleIndex(element2.id, element1.id, selectionPoint, world);
    if (index === null) throw new Error('Circle and line do not intersect.');
    IntersectionSequenceFactory.createLineCircleIntersection(cmd, intent.planeId, element2.id, element1.id, index, world, groupId);
  } else if (element1 instanceof Circle2D && element2 instanceof Circle2D) {
    const index = circleCircleIndex(element1.id, element2.id, selectionPoint, world);
    if (index === null) throw new Error('Circles do not intersect.');
    IntersectionSequenceFactory.createCircleCircleIntersection(cmd, intent.planeId, element1.id, element2.id, index, world, groupId);
  } else {
    throw new Error('Unsupported element type combination for intersection.');
  }
}

function lineCircleIndex(lineId: string, circleId: string, mousePos: THREE.Vector3, world: World): number | null {
  const line = world.getLine2D(lineId);
  const circle = world.getCircle2D(circleId);
  if (!line || !circle) return null;
  const lr = line.realize2D(world);
  const cr = circle.realize2D(world);
  if (!lr || !cr) return null;
  const intersections = intersectLineCircle(lr, cr);
  if (intersections.length === 0) return null;
  if (intersections.length === 1) return 0;
  return intersections[0].distanceTo(mousePos) <= intersections[1].distanceTo(mousePos) ? 0 : 1;
}

function circleCircleIndex(circle1Id: string, circle2Id: string, mousePos: THREE.Vector3, world: World): number | null {
  const c1 = world.getCircle2D(circle1Id);
  const c2 = world.getCircle2D(circle2Id);
  if (!c1 || !c2) return null;
  const r1 = c1.realize2D(world);
  const r2 = c2.realize2D(world);
  if (!r1 || !r2) return null;
  const intersections = intersectCircleCircle(r1, r2);
  if (intersections.length === 0) return null;
  if (intersections.length === 1) return 0;
  return intersections[0].distanceTo(mousePos) <= intersections[1].distanceTo(mousePos) ? 0 : 1;
}

function validateCoordinates(coords: any): void {
  if (!coords || !isFinite(coords.x) || !isFinite(coords.y) || !isFinite(coords.z)) {
    throw new Error('Invalid coordinates: NaN or Infinity not allowed');
  }
}

function checkCreatedElementsFeasibility(cmd: CommandOperationBuilder, world: World): void {
  for (const op of cmd.getOperations()) {
    for (const [key, value] of Object.entries(op.outputs)) {
      if (typeof value !== 'string' || !key.endsWith('Id') || key === 'groupId' || key === 'actionId') continue;
      const element = world.getPoint2D(value) ?? world.getLine2D(value) ?? world.getCircle2D(value);
      try {
        const realization = element?.realize2D(world);
        if (realization && !realization.feasible) console.warn(`[Feasibility] Newly created element ${value} is immediately infeasible`);
      } catch {
        // Ignore feasibility diagnostics for unresolved outputs.
      }
    }
  }
}
