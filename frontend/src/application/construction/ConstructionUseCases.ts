import type { CommandOperationBuilder, ToolCommandExecutionPort } from '@/application/commandProduction/CommandProductionPorts';
import type { OperationContext } from '@/commands/operations/OperationContext';
import type { World } from '@/domain/world/World';
import { GeometryElementLookup } from '@/domain/world/GeometryElementLookup';
import type { CachedProjectionElementRealizationContext } from '@/domain/world/projectionPlane/ProjectionPlaneContext';
import type { ToolConstructionIntent, ToolCommandResult } from '@/tools/ToolCommandIntents';
import type { Point2D } from '@/domain/world/Point';
import { Line2D } from '@/domain/world/Line';
import { Circle2D } from '@/domain/world/Circle';
import { Segment2D } from '@/domain/world/Segment';
import type { Element2D } from '@/domain/world/Element2D';
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
import { PushSubprocessOp } from '@/commands/operations/processTree/PushSubprocessOp';
import { PopSubprocessOp } from '@/commands/operations/processTree/PopSubprocessOp';
import { ToggleEncapsulationOp } from '@/commands/operations/processTree/ToggleEncapsulationOp';
import { ToggleOutputOp } from '@/commands/operations/processTree/ToggleOutputOp';
import { createActionGroup } from '@/domain/processTree/ProcessTree';
import { AddProcessTreeActionGroupOp } from '@/commands/operations/processTree/AddProcessTreeActionGroupOp';
import { AddProcessTreeActionOp } from '@/commands/operations/processTree/AddProcessTreeActionOp';
import { createSegmentAction } from '@/domain/processTree/actions/CreateSegmentAction';
import { createGuideAction } from '@/domain/processTree/actions/CreateGuideAction';
import { createSiblingGuideAction } from '@/domain/processTree/actions/CreateSiblingGuideAction';
import { createAdd3DPointAction, createAdd3DLineAction, createAdd3DSegmentAction } from '@/domain/processTree/actions/Element3DActions';
import { createTangentLineToCircleThroughPointAction, createTangentLineToCircleParallelToLineAction } from '@/domain/processTree/actions/CreateTangentLineAction';
import { areLinesParallel, intersectLineCircle, intersectCircleCircle } from '@/domain/calculations/Intersections';
import { HalfHingeLine2D } from '@/domain/world/HingeLine';
import { Vector3 } from 'three';

export interface ExecuteConstructionParams {
  intent: ToolConstructionIntent;
  operationContext: OperationContext;
  commands: ToolCommandExecutionPort;
}

interface ConstructionExecutionContext {
  readonly cmd: CommandOperationBuilder;
  readonly operationContext: OperationContext;
  readonly world: World;
  readonly realizationContext: CachedProjectionElementRealizationContext;
  readonly groupId: string;
}

type IntentExecutor<T extends ToolConstructionIntent> = (context: ConstructionExecutionContext, intent: T) => void;

export function executeConstructionIntent({ intent, operationContext, commands }: ExecuteConstructionParams): ToolCommandResult {
  const result = commands.executeToolCommand(intent.description, (cmd) => {
    if (intent.type === 'create3dpoint-by-coordinates') {
      executeCreate3DPointByCoordinatesCommand({
        cmd,
        operationContext,
        world: operationContext.world,
        realizationContext: operationContext.realizationContext,
        groupId: '',
      }, intent);
      checkCreatedElementsFeasibility(cmd, operationContext.world, operationContext.realizationContext);
      return;
    }

    const groupId = `group_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const group = createActionGroup(groupId);
    cmd.addAndExecute(new AddProcessTreeActionGroupOp(group));
    executeConstructionOperations({
      cmd,
      operationContext,
      world: operationContext.world,
      realizationContext: operationContext.realizationContext,
      groupId,
    }, intent);
    checkCreatedElementsFeasibility(cmd, operationContext.world, operationContext.realizationContext);
  });

  return result.success
    ? { success: true, message: `${intent.description} completed successfully` }
    : result;
}

const executors: { [K in ToolConstructionIntent['type']]: IntentExecutor<Extract<ToolConstructionIntent, { type: K }>> } = {
  point: executePointIntent,
  line: executeLineIntent,
  segment: executeSegmentIntent,
  circle: executeCircleIntent,
  guide: executeGuideIntent,
  'parallel-line': executeParallelLineIntent,
  'perpendicular-line': executePerpendicularLineIntent,
  intersection: executeIntersectionIntent,
  'tangent-line-to-circle-through-point': executeTangentThroughPointIntent,
  'tangent-line-to-circle-parallel': executeTangentParallelIntent,
  create3dpoint: executeCreate3DPointIntent,
  'create3dpoint-by-coordinates': executeCreate3DPointByCoordinatesIntent,
  create3dline: executeCreate3DLineIntent,
  create3dsegment: executeCreate3DSegmentIntent,
  create3dplane: executeCreate3DPlaneIntent,
  createprojectionplane: executeCreateProjectionPlaneIntent,
};

function executeConstructionOperations(context: ConstructionExecutionContext, intent: ToolConstructionIntent): void {
  executors[intent.type](context, intent as never);
}

function executePointIntent({ cmd, world, groupId }: ConstructionExecutionContext, intent: Extract<ToolConstructionIntent, { type: 'point' }>): void {
  validateCoordinates(intent.position);
  requireProjectionPlane(world, intent.planeId, 'target');
  PointSequenceFactory.createFreePoint(cmd, intent.planeId, intent.position, groupId);
}

function executeLineIntent({ cmd, world, groupId }: ConstructionExecutionContext, intent: Extract<ToolConstructionIntent, { type: 'line' }>): void {
  requirePointOnPlane(world, intent.point1Id, intent.planeId, 'point1');
  requirePointOnPlane(world, intent.point2Id, intent.planeId, 'point2');
  LineSequenceFactory.createLineByTwoPoints(cmd, intent.planeId, intent.point1Id, intent.point2Id, groupId);
}

function executeSegmentIntent({ cmd, world, groupId }: ConstructionExecutionContext, intent: Extract<ToolConstructionIntent, { type: 'segment' }>): void {
  requirePointOnPlane(world, intent.point1Id, intent.planeId, 'point1');
  requirePointOnPlane(world, intent.point2Id, intent.planeId, 'point2');
  const result = cmd.addAndExecute(new AddSegment2DByPointsOp(intent.planeId, intent.point1Id, intent.point2Id));
  cmd.addAndExecute(new AddProcessTreeActionOp(createSegmentAction(result.outputs.segmentId as string), groupId));
}

function executeCircleIntent({ cmd, world, groupId }: ConstructionExecutionContext, intent: Extract<ToolConstructionIntent, { type: 'circle' }>): void {
  requirePointOnPlane(world, intent.centerPointId, intent.planeId, 'center point');
  requirePointOnPlane(world, intent.circumferencePointId, intent.planeId, 'circumference point');
  CircleSequenceFactory.createCircleByCenterAndPoint(cmd, intent.planeId, intent.centerPointId, intent.circumferencePointId, groupId);
}

function executeGuideIntent({ cmd, world, realizationContext, groupId }: ConstructionExecutionContext, intent: Extract<ToolConstructionIntent, { type: 'guide' }>): void {
  requireLineOnPlane(world, intent.referenceLineId, intent.planeId, 'reference line');
  requirePointOnPlane(world, intent.throughPointId, intent.planeId, 'through point');
  const result = GuideSequenceFactory.createGuideWithSibling(cmd, intent.planeId, intent.referenceLineId, intent.throughPointId, world, realizationContext);
  cmd.addAndExecute(new AddProcessTreeActionOp(createGuideAction(result.guideId), groupId));
  if (result.siblingGuideId) cmd.addAndExecute(new AddProcessTreeActionOp(createSiblingGuideAction(result.siblingGuideId), groupId));
}

function executeParallelLineIntent({ cmd, world, groupId }: ConstructionExecutionContext, intent: Extract<ToolConstructionIntent, { type: 'parallel-line' }>): void {
  requireLineOnPlane(world, intent.referenceLineId, intent.planeId, 'reference line');
  requirePointOnPlane(world, intent.throughPointId, intent.planeId, 'through point');
  LineSequenceFactory.createParallelLine(cmd, intent.planeId, intent.referenceLineId, intent.throughPointId, groupId);
}

function executePerpendicularLineIntent({ cmd, world, groupId }: ConstructionExecutionContext, intent: Extract<ToolConstructionIntent, { type: 'perpendicular-line' }>): void {
  requireLineOnPlane(world, intent.referenceLineId, intent.planeId, 'reference line');
  requirePointOnPlane(world, intent.throughPointId, intent.planeId, 'through point');
  LineSequenceFactory.createPerpendicularLine(cmd, intent.planeId, intent.referenceLineId, intent.throughPointId, groupId);
}

function executeIntersectionIntent(context: ConstructionExecutionContext, intent: Extract<ToolConstructionIntent, { type: 'intersection' }>): void {
  createIntersection(context, intent);
}

function executeTangentThroughPointIntent({ cmd, world, groupId }: ConstructionExecutionContext, intent: Extract<ToolConstructionIntent, { type: 'tangent-line-to-circle-through-point' }>): void {
  requireCircleOnPlane(world, intent.circleId, intent.planeId, 'circle');
  requirePointOnPlane(world, intent.throughPointId, intent.planeId, 'through point');
  const result = cmd.addAndExecute(new AddLine2DTangentToCircleThroughPointOp(intent.planeId, intent.circleId, intent.throughPointId, intent.tangentIndex));
  cmd.addAndExecute(new AddProcessTreeActionOp(createTangentLineToCircleThroughPointAction(result.outputs.lineId as string), groupId));
}

function executeTangentParallelIntent({ cmd, world, groupId }: ConstructionExecutionContext, intent: Extract<ToolConstructionIntent, { type: 'tangent-line-to-circle-parallel' }>): void {
  requireCircleOnPlane(world, intent.circleId, intent.planeId, 'circle');
  requireLineOnPlane(world, intent.referenceLineId, intent.planeId, 'reference line');
  const result = cmd.addAndExecute(new AddLine2DTangentToCircleParallelToLineOp(intent.planeId, intent.circleId, intent.referenceLineId, intent.tangentIndex));
  cmd.addAndExecute(new AddProcessTreeActionOp(createTangentLineToCircleParallelToLineAction(result.outputs.lineId as string), groupId));
}

function executeCreate3DPointIntent({ cmd, world, groupId }: ConstructionExecutionContext, intent: Extract<ToolConstructionIntent, { type: 'create3dpoint' }>): void {
  const p1 = requirePoint(world, intent.projection1PointId, 'projection1 point');
  const p2 = requirePoint(world, intent.projection2PointId, 'projection2 point');
  const result = cmd.addAndExecute(new Add3DPointOp(p1.id, p2.id, p1.planeId, p2.planeId));
  cmd.addAndExecute(new AddProcessTreeActionOp(createAdd3DPointAction(result.outputs.pointId as string), groupId));
}

function executeCreate3DPointByCoordinatesIntent(context: ConstructionExecutionContext, intent: Extract<ToolConstructionIntent, { type: 'create3dpoint-by-coordinates' }>): void {
  executeCreate3DPointByCoordinatesCommand(context, intent);
}

function executeCreate3DPointByCoordinatesCommand(
  context: ConstructionExecutionContext,
  intent: Extract<ToolConstructionIntent, { type: 'create3dpoint-by-coordinates' }>
): void {
  validateCoordinates(intent.coordinates);

  const { cmd, world, realizationContext, operationContext } = context;
  const horizontalPlane = requireProjectionPlaneByName(world, 'P_H');
  const verticalPlane = requireProjectionPlaneByName(world, 'P_V');
  const horizontalHinge = requireHalfHingeLine(world, horizontalPlane.id, 'P_H half hinge line');

  const subprocessResult = cmd.addAndExecute(new PushSubprocessOp('Create 3D point from coordinates'));
  const subprocessId = subprocessResult.outputs.subprocessId as string;
  const groupId = `group_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  cmd.addAndExecute(new AddProcessTreeActionGroupOp(createActionGroup(groupId)));

  const x = intent.coordinates.x;
  const y = intent.coordinates.y;
  const z = intent.coordinates.z;

  const pointA = PointSequenceFactory.createFreePoint(cmd, horizontalPlane.id, new Vector3(x, y, 1), groupId);
  const verticalGuide = GuideSequenceFactory.createGuideWithSibling(
    cmd,
    horizontalPlane.id,
    horizontalHinge.id,
    pointA.pointId,
    world,
    realizationContext,
  );
  recordGuideActions(cmd, verticalGuide, groupId);
  if (!verticalGuide.siblingGuideId) {
    throw new Error('Could not create the vertical transfer guide on P_V.');
  }

  const pointB = PointSequenceFactory.createFreePoint(cmd, verticalPlane.id, new Vector3(x - 1, z, 1), groupId);
  const horizontalGuide = GuideSequenceFactory.createGuideWithSibling(
    cmd,
    verticalPlane.id,
    verticalGuide.siblingGuideId,
    pointB.pointId,
    world,
    realizationContext,
  );
  recordGuideActions(cmd, horizontalGuide, groupId);

  const pointC = IntersectionSequenceFactory.createLineLineIntersection(
    cmd,
    verticalPlane.id,
    verticalGuide.siblingGuideId,
    horizontalGuide.guideId,
    world,
    groupId,
  );

  const point3D = cmd.addAndExecute(new Add3DPointOp(pointA.pointId, pointC.pointId, horizontalPlane.id, verticalPlane.id));
  cmd.addAndExecute(new AddProcessTreeActionOp(createAdd3DPointAction(point3D.outputs.pointId as string), groupId));

  hideProducedElementAction(operationContext, pointB.pointId, cmd);
  hideProducedElementAction(operationContext, verticalGuide.guideId, cmd);
  hideProducedElementAction(operationContext, verticalGuide.siblingGuideId, cmd);
  hideProducedElementAction(operationContext, horizontalGuide.guideId, cmd);
  if (horizontalGuide.siblingGuideId) hideProducedElementAction(operationContext, horizontalGuide.siblingGuideId, cmd);
  cmd.addAndExecute(new ToggleEncapsulationOp(subprocessId));
  cmd.addAndExecute(new PopSubprocessOp());
}

function executeCreate3DLineIntent({ cmd, world, groupId }: ConstructionExecutionContext, intent: Extract<ToolConstructionIntent, { type: 'create3dline' }>): void {
  const l1 = requireLine(world, intent.projection1LineId, 'projection1 line');
  const l2 = requireLine(world, intent.projection2LineId, 'projection2 line');
  const result = cmd.addAndExecute(new Add3DLineOp(l1.id, l2.id, l1.planeId, l2.planeId));
  cmd.addAndExecute(new AddProcessTreeActionOp(createAdd3DLineAction(result.outputs.lineId as string), groupId));
}

function executeCreate3DSegmentIntent({ cmd, world, groupId }: ConstructionExecutionContext, intent: Extract<ToolConstructionIntent, { type: 'create3dsegment' }>): void {
  const s1 = requireSegment(world, intent.projection1SegmentId, 'projection1 segment');
  const s2 = requireSegment(world, intent.projection2SegmentId, 'projection2 segment');
  const result = cmd.addAndExecute(new Add3DSegmentOp(s1.id, s2.id, s1.planeId, s2.planeId));
  cmd.addAndExecute(new AddProcessTreeActionOp(createAdd3DSegmentAction(result.outputs.segmentId as string), groupId));
}

function executeCreate3DPlaneIntent({ cmd, world, groupId }: ConstructionExecutionContext, intent: Extract<ToolConstructionIntent, { type: 'create3dplane' }>): void {
  const t1 = requireLine(world, intent.trace1LineId, 'trace1 line');
  const t2 = requireLine(world, intent.trace2LineId, 'trace2 line');
  PlaneSequenceFactory.create3DPlaneFromTraces(cmd, t1.id, t2.id, t1.planeId, t2.planeId, undefined, groupId);
}

function executeCreateProjectionPlaneIntent({ cmd, world, groupId }: ConstructionExecutionContext, intent: Extract<ToolConstructionIntent, { type: 'createprojectionplane' }>): void {
  const t1 = requireLine(world, intent.t1HingeTraceLineId, 'T1 hinge trace line');
  const t2 = requireLine(world, intent.t2OtherTraceLineId, 'T2 other trace line');
  const t2Prime = requireLine(world, intent.t2PrimePositionLineId, "T2' position line");
  const { planeId: plane3DId } = PlaneSequenceFactory.create3DPlaneFromTraces(cmd, t1.id, t2.id, t1.planeId, t2.planeId, undefined, groupId);
  PlaneSequenceFactory.createAuxiliaryProjectionPlane(cmd, world, plane3DId, t1.id, t2.id, t2Prime.id, t1.planeId, undefined, groupId);
}

function createIntersection({ cmd, world, groupId, realizationContext }: ConstructionExecutionContext, intent: Extract<ToolConstructionIntent, { type: 'intersection' }>): void {
  const element1 = requireLineOrCircleOnPlane(world, intent.element1Id, intent.planeId, 'element1');
  const element2 = requireLineOrCircleOnPlane(world, intent.element2Id, intent.planeId, 'element2');
  const selectionPoint = intent.selectionPoint;
  if (element1 instanceof Line2D && element2 instanceof Line2D) {
    const r1 = element1.realize2D(realizationContext);
    const r2 = element2.realize2D(realizationContext);
    if (!r1 || !r2) throw new Error('Could not realize lines.');
    if (areLinesParallel(r1, r2)) throw new Error('Lines are parallel and do not intersect.');
    IntersectionSequenceFactory.createLineLineIntersection(cmd, intent.planeId, element1.id, element2.id, world, groupId);
  } else if (element1 instanceof Line2D && element2 instanceof Circle2D) {
    const index = lineCircleIndex(element1.id, element2.id, selectionPoint, world, realizationContext);
    if (index === null) throw new Error('Line and circle do not intersect.');
    IntersectionSequenceFactory.createLineCircleIntersection(cmd, intent.planeId, element1.id, element2.id, index, world, groupId);
  } else if (element1 instanceof Circle2D && element2 instanceof Line2D) {
    const index = lineCircleIndex(element2.id, element1.id, selectionPoint, world, realizationContext);
    if (index === null) throw new Error('Circle and line do not intersect.');
    IntersectionSequenceFactory.createLineCircleIntersection(cmd, intent.planeId, element2.id, element1.id, index, world, groupId);
  } else if (element1 instanceof Circle2D && element2 instanceof Circle2D) {
    const index = circleCircleIndex(element1.id, element2.id, selectionPoint, world, realizationContext);
    if (index === null) throw new Error('Circles do not intersect.');
    IntersectionSequenceFactory.createCircleCircleIntersection(cmd, intent.planeId, element1.id, element2.id, index, world, groupId);
  } else {
    throw new Error('Unsupported element type combination for intersection.');
  }
}

function requireProjectionPlane(world: World, planeId: string, role: string): void {
  if (!world.getProjectionPlaneById(planeId)) throw new Error(`${role} plane not found: ${planeId}`);
}

function requireProjectionPlaneByName(world: World, name: string) {
  const plane = world.getAllProjectionPlanes().find(candidate => candidate.name === name);
  if (!plane) throw new Error(`Projection plane not found with name: ${name}`);
  return plane;
}

function requireHalfHingeLine(world: World, planeId: string, role: string): HalfHingeLine2D {
  const plane = world.getProjectionPlaneById(planeId);
  const line = plane?.getAllLines().find((candidate): candidate is HalfHingeLine2D => candidate instanceof HalfHingeLine2D);
  if (!line) throw new Error(`${role} not found on plane: ${planeId}`);
  return line;
}

function requirePoint(world: World, pointId: string, role: string): Point2D {
  const point = new GeometryElementLookup(world).getPoint2D(pointId);
  if (!point) throw new Error(`${role} not found or is not a point: ${pointId}`);
  return point;
}

function requireLine(world: World, lineId: string, role: string): Line2D {
  const line = new GeometryElementLookup(world).getLine2D(lineId);
  if (!line) throw new Error(`${role} not found or is not a line: ${lineId}`);
  return line;
}

function requireCircle(world: World, circleId: string, role: string): Circle2D {
  const circle = new GeometryElementLookup(world).getCircle2D(circleId);
  if (!circle) throw new Error(`${role} not found or is not a circle: ${circleId}`);
  return circle;
}

function requireSegment(world: World, segmentId: string, role: string): Segment2D {
  const line = requireLine(world, segmentId, role);
  if (!(line instanceof Segment2D)) throw new Error(`${role} is not a segment: ${segmentId}`);
  return line;
}

function requirePointOnPlane(world: World, pointId: string, planeId: string, role: string): Point2D {
  const point = requirePoint(world, pointId, role);
  requireElementOnPlane(point, planeId, role);
  return point;
}

function requireLineOnPlane(world: World, lineId: string, planeId: string, role: string): Line2D {
  const line = requireLine(world, lineId, role);
  requireElementOnPlane(line, planeId, role);
  return line;
}

function requireCircleOnPlane(world: World, circleId: string, planeId: string, role: string): Circle2D {
  const circle = requireCircle(world, circleId, role);
  requireElementOnPlane(circle, planeId, role);
  return circle;
}

function requireLineOrCircleOnPlane(world: World, elementId: string, planeId: string, role: string): Line2D | Circle2D {
  const lookup = new GeometryElementLookup(world);
  const element = lookup.getLine2D(elementId) ?? lookup.getCircle2D(elementId);
  if (!element) throw new Error(`${role} not found or is not a line/circle: ${elementId}`);
  requireElementOnPlane(element, planeId, role);
  return element;
}

function requireElementOnPlane(element: Element2D, planeId: string, role: string): void {
  if (element.planeId !== planeId) throw new Error(`${role} belongs to plane ${element.planeId}, expected ${planeId}: ${element.id}`);
}

function lineCircleIndex(lineId: string, circleId: string, mousePos: Vector3, world: World, realizationContext: CachedProjectionElementRealizationContext): number | null {
  const lookup = new GeometryElementLookup(world);
  const line = lookup.getLine2D(lineId);
  const circle = lookup.getCircle2D(circleId);
  if (!line) throw new Error(`Line not found for line-circle intersection: ${lineId}`);
  if (!circle) throw new Error(`Circle not found for line-circle intersection: ${circleId}`);
  const lr = line.realize2D(realizationContext);
  const cr = circle.realize2D(realizationContext);
  if (!lr || !cr) return null;
  const intersections = intersectLineCircle(lr, cr);
  if (intersections.length === 0) return null;
  if (intersections.length === 1) return 0;
  return intersections[0].distanceTo(mousePos) <= intersections[1].distanceTo(mousePos) ? 0 : 1;
}

function circleCircleIndex(circle1Id: string, circle2Id: string, mousePos: Vector3, world: World, realizationContext: CachedProjectionElementRealizationContext): number | null {
  const lookup = new GeometryElementLookup(world);
  const c1 = lookup.getCircle2D(circle1Id);
  const c2 = lookup.getCircle2D(circle2Id);
  if (!c1) throw new Error(`Circle not found for circle-circle intersection: ${circle1Id}`);
  if (!c2) throw new Error(`Circle not found for circle-circle intersection: ${circle2Id}`);
  const r1 = c1.realize2D(realizationContext);
  const r2 = c2.realize2D(realizationContext);
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

function recordGuideActions(
  cmd: CommandOperationBuilder,
  result: { guideId: string; siblingGuideId?: string },
  groupId: string
): void {
  cmd.addAndExecute(new AddProcessTreeActionOp(createGuideAction(result.guideId), groupId));
  if (result.siblingGuideId) cmd.addAndExecute(new AddProcessTreeActionOp(createSiblingGuideAction(result.siblingGuideId), groupId));
}

function hideProducedElementAction(operationContext: OperationContext, elementId: string | undefined, cmd: CommandOperationBuilder): void {
  if (!elementId) return;
  const action = operationContext.processTree.getActionsProducingElement(elementId)[0];
  if (!action) throw new Error(`No process action found for created element: ${elementId}`);
  cmd.addAndExecute(new ToggleOutputOp(action.id));
}

function checkCreatedElementsFeasibility(cmd: CommandOperationBuilder, world: World, realizationContext: CachedProjectionElementRealizationContext): void {
  const lookup = new GeometryElementLookup(world);
  for (const op of cmd.getOperations()) {
    for (const [key, value] of Object.entries(op.outputs)) {
      if (typeof value !== 'string' || !key.endsWith('Id') || key === 'groupId' || key === 'actionId') continue;
      if (!value.includes('/')) continue;

      const element = lookup.getElement2D(value);
      if (!element) throw new Error(`Operation ${op.type} reported missing 2D output ${key}: ${value}`);

      const realization = element.realize2D(realizationContext);
      if (realization && !realization.feasible) {
        throw new Error(`Operation ${op.type} created infeasible 2D output ${key}: ${value}`);
      }
    }
  }
}
