import type { Circle2D } from '../Circle';
import type { ConstructionContext } from '../ConstructionService';
import type { Line2D } from '../Line';
import type { Point2D } from '../Point';

export interface ProjectionPlaneElementLookup {
  readonly id: string;
  readonly name: string;
  getPoint(id: string): Point2D | undefined;
  getLine(id: string): Line2D | undefined;
  getCircle(id: string): Circle2D | undefined;
}

export function requirePlaneId(planeId: string | undefined, elementName: string): string {
  if (!planeId) {
    throw new Error(`Cannot add ${elementName} to plane without ID`);
  }
  return planeId;
}

export function resolveElementId(
  id: string | undefined,
  generateId: () => string
): string {
  return id || generateId();
}

export function resolveDefaultLabel(
  label: string | undefined,
  id: string,
  elementType: string,
  world: ConstructionContext
): string {
  return label || world.generateDefaultLabel(id, elementType);
}

export function requireLocalPoint(
  plane: ProjectionPlaneElementLookup,
  pointId: string,
  fieldName: string
): Point2D {
  const point = plane.getPoint(pointId);
  if (!point) {
    throw new Error(`Invalid ${fieldName}: ${pointId}. Point does not exist on this plane.`);
  }
  return point;
}

export function requireLocalCircle(
  plane: ProjectionPlaneElementLookup,
  circleId: string,
  fieldName: string,
  missingMessage: string = 'Circle does not exist on this plane.'
): Circle2D {
  const circle = plane.getCircle(circleId);
  if (!circle) {
    throw new Error(`Invalid ${fieldName}: ${circleId}. ${missingMessage}`);
  }
  return circle;
}

export function requireWorldLine(
  world: ConstructionContext,
  lineId: string,
  fieldName: string
): Line2D {
  const line = world.getLine2D(lineId);
  if (!line) {
    throw new Error(`Invalid ${fieldName}: ${lineId}. Line does not exist.`);
  }
  return line;
}

export function requireLocalOrWorldLine(
  plane: ProjectionPlaneElementLookup,
  world: ConstructionContext,
  lineId: string,
  fieldName: string
): Line2D {
  const line = plane.getLine(lineId) || world.getLine2D(lineId);
  if (!line) {
    throw new Error(`Invalid ${fieldName}: ${lineId}. Line does not exist.`);
  }
  return line;
}

export function requireLocalLine(
  plane: ProjectionPlaneElementLookup,
  lineId: string,
  fieldName: string
): Line2D {
  const line = plane.getLine(lineId);
  if (!line) {
    throw new Error(`Invalid ${fieldName}: ${lineId}. Line does not exist.`);
  }
  return line;
}

export function requireRealizedLine(
  line: Line2D,
  lineId: string,
  fieldName: string,
  world: ConstructionContext,
  missingMessage: string = 'Line does not exist.'
): void {
  const realization = line.realize2D(world);
  if (!realization) {
    throw new Error(`Invalid ${fieldName}: ${lineId}. ${missingMessage}`);
  }
}

export function requireRealizedCircle(
  circle: Circle2D,
  circleId: string,
  fieldName: string,
  world: ConstructionContext
): void {
  const realization = circle.realize2D(world);
  if (!realization) {
    throw new Error(`Invalid ${fieldName}: ${circleId}. Circle does not exist.`);
  }
}

export function requireDistinctPointIds(
  point1Id: string,
  point2Id: string,
  elementName: 'line' | 'segment'
): void {
  if (point1Id === point2Id) {
    throw new Error(`Cannot create ${elementName} from a point to itself. point1Id and point2Id must be different.`);
  }
}

export function requireBinaryIndex(index: number, fieldName: string): void {
  if (index !== 0 && index !== 1) {
    throw new Error(`Invalid ${fieldName}: ${index}. Must be 0 or 1.`);
  }
}

export function requireDistinctRealizedPointsForLine(
  point1: Point2D,
  point2: Point2D,
  point1Id: string,
  point2Id: string,
  world: ConstructionContext
): void {
  const point1Realization = point1.realize2D(world);
  const point2Realization = point2.realize2D(world);

  if (!point1Realization || !point2Realization) {
    throw new Error('Cannot compute point realizations. Points may depend on missing elements.');
  }

  const distance = point1Realization.position.distanceTo(point2Realization.position);
  if (distance < 1e-10) {
    throw new Error(`Points ${point1Id} and ${point2Id} are too close (distance: ${distance}). Cannot create line.`);
  }
}

export function requirePrimaryIntersectionPoint(
  primaryIntersectionId: string,
  world: ConstructionContext
): Point2D {
  const primaryPlane = world.getPlaneForElement(primaryIntersectionId);
  if (!primaryPlane) {
    throw new Error(`Primary intersection point not found: ${primaryIntersectionId}`);
  }

  const primaryPoint = primaryPlane.getPoint(primaryIntersectionId);
  if (!primaryPoint) {
    throw new Error(`Primary intersection point not found: ${primaryIntersectionId}`);
  }

  return primaryPoint;
}
