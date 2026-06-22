import type { World } from '@/domain/world/World';
import type { ProjectionPlane } from '@/domain/world/projectionPlane/ProjectionPlane';
import type { OperationContext } from '../OperationContext';

type FeasibleRealization = {
  isFeasible(): boolean;
};

export interface ProjectionPlanePair {
  plane1: ProjectionPlane;
  plane2: ProjectionPlane;
}

export function requireProjectionPlane(world: World, planeId: string): ProjectionPlane {
  const plane = world.getProjectionPlaneById(planeId);
  if (!plane) {
    throw new Error(`Plane not found: ${planeId}`);
  }
  return plane;
}

export function invalidateRealization(context: OperationContext, elementId: string): string[] {
  return context.realizations.invalidateElement(elementId, context.dependencies, context.world.getAllProjectionPlanes());
}

export function removePointFromPlane(context: OperationContext, plane: ProjectionPlane, pointId: string): boolean {
  invalidateRealization(context, pointId);
  const removed = plane.removePoint(pointId);
  if (removed) {
    context.dependencies.unregisterNode(pointId);
  }
  return removed;
}

export function removeLineFromPlane(context: OperationContext, plane: ProjectionPlane, lineId: string): boolean {
  invalidateRealization(context, lineId);
  const removed = plane.removeLine(lineId);
  if (removed) {
    context.dependencies.unregisterNode(lineId);
  }
  return removed;
}

export function removeCircleFromPlane(context: OperationContext, plane: ProjectionPlane, circleId: string): boolean {
  invalidateRealization(context, circleId);
  const removed = plane.removeCircle(circleId);
  if (removed) {
    context.dependencies.unregisterNode(circleId);
  }
  return removed;
}

export function requireDistinctProjectionPlanes(
  world: World,
  plane1Id: string,
  plane2Id: string,
  elementLabel: string,
  projectionLabel: string = 'projections'
): ProjectionPlanePair {
  const plane1 = world.getProjectionPlaneById(plane1Id);
  const plane2 = world.getProjectionPlaneById(plane2Id);

  if (!plane1) {
    throw new Error(`Projection plane not found: ${plane1Id}`);
  }
  if (!plane2) {
    throw new Error(`Projection plane not found: ${plane2Id}`);
  }
  if (plane1Id === plane2Id) {
    throw new Error(
      `Cannot create 3D ${elementLabel}: ${projectionLabel} must be on different planes. ` +
      `Both ${projectionLabel} are on plane ${plane1Id}`
    );
  }

  return { plane1, plane2 };
}

export function requireFeasibleProjectionPair<T1 extends FeasibleRealization | null | undefined, T2 extends FeasibleRealization | null | undefined>(
  elementLabel: string,
  realization1: T1,
  realization2: T2,
  projectionLabel: string = 'projections'
): [Exclude<T1, null | undefined>, Exclude<T2, null | undefined>] {
  if (!realization1 || !realization2 || !realization1.isFeasible() || !realization2.isFeasible()) {
    throw new Error(`Cannot create 3D ${elementLabel}: one or both ${projectionLabel} are not geometrically feasible`);
  }
  return [realization1 as Exclude<T1, null | undefined>, realization2 as Exclude<T2, null | undefined>];
}
