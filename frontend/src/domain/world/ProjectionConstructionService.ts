import { Vector3 } from 'three';
import { buildElementId } from './ElementId';
import type { DependencyRegistrarPort } from './DependencyPorts';
import type { LabelGenerator } from './LabelGenerator';
import type { WorldIdAllocator } from './WorldIdAllocator';
import { HalfHingeLine2D, type HingeLine } from './HingeLine';
import type { Line2D } from './Line';
import { Line2DByPointAndRelativeAngle, Line2DByTwoPoints, Line2DParallel, Line2DPerpendicularToLine, Line2DTangentToCircleParallelToLine, Line2DTangentToCircleThroughPoint } from './Line';
import { Segment2D } from './Segment';
import { Guide2D, SiblingGuide2D } from './Guide';
import { Circle2D, Circle2DByCenterAndPoint, Circle2DByCenterAndRadiusVector } from './Circle';
import { FreePoint2D, Point2DCircleCircleIntersection, Point2DLineCircleIntersection, Point2DLineLineIntersection, SiblingIntersectionPoint2D, type Point2D } from './Point';
import type { ProjectionPlane } from './projectionPlane/ProjectionPlane';
import type { ProjectionPlaneRealizationContext } from './projectionPlane/ProjectionPlaneContext';
import {
  requireBinaryIndex,
  requireDistinctPointIds,
  requireDistinctRealizedPointsForLine,
  requireLocalCircle,
  requireLocalLine,
  requireLocalOrWorldLine,
  requireLocalPoint,
  requirePlaneId,
  requirePrimaryIntersectionPoint,
  requireRealizedCircle,
  requireRealizedLine,
  requireWorldLine,
  resolveDefaultLabel,
  resolveElementId,
} from './projectionPlane/ProjectionPlaneElementCreation';

export interface ConstructionContext extends ProjectionPlaneRealizationContext {
  readonly idAllocator: WorldIdAllocator;
  readonly labelGenerator: LabelGenerator;
  getLine2D(id: string): Line2D | undefined;
  getPlaneForElement(id: string): ProjectionPlane | undefined;
  getHingeLineById(id: string): HingeLine | undefined;
}

export class ProjectionConstructionService {
  constructor(
    private readonly context: ConstructionContext,
    private readonly dependencies: DependencyRegistrarPort,
  ) {}

  generatePoint2DId(plane: ProjectionPlane): string {
    return buildElementId(plane.id, `point2d${this.context.idAllocator.next()}`);
  }

  generateLine2DId(plane: ProjectionPlane): string {
    return buildElementId(plane.id, `line2d${this.context.idAllocator.next()}`);
  }

  generateSegment2DId(plane: ProjectionPlane): string {
    return buildElementId(plane.id, `segment2d${this.context.idAllocator.next()}`);
  }

  generateCircle2DId(plane: ProjectionPlane): string {
    return buildElementId(plane.id, `circle2d${this.context.idAllocator.next()}`);
  }

  generateGuide2DId(plane: ProjectionPlane): string {
    return buildElementId(plane.id, `guide2d${this.context.idAllocator.next()}`);
  }

  addFreePoint2D(plane: ProjectionPlane, position: Vector3, id?: string, label?: string): FreePoint2D {
    const planeId = requirePlaneId(plane.id, 'point');
    id = resolveElementId(id, () => this.generatePoint2DId(plane));
    label = resolveDefaultLabel(label, id, 'Point2D', this.context);
    const point = new FreePoint2D(id, position, planeId, label);
    this.addPoint(plane, point);
    return point;
  }

  addLineLineIntersection(plane: ProjectionPlane, line1Id: string, line2Id: string, id?: string, label?: string): Point2DLineLineIntersection {
    const planeId = requirePlaneId(plane.id, 'point');
    const l1 = requireLocalOrWorldLine(plane, this.context, line1Id, 'line1Id');
    const l2 = requireLocalOrWorldLine(plane, this.context, line2Id, 'line2Id');
    requireRealizedLine(l1, line1Id, 'line1Id', this.context);
    requireRealizedLine(l2, line2Id, 'line2Id', this.context);
    id = resolveElementId(id, () => this.generatePoint2DId(plane));
    label ??= this.context.labelGenerator.next('Point2D');
    const point = new Point2DLineLineIntersection(id, line1Id, line2Id, planeId, label);
    this.addPoint(plane, point);
    return point;
  }

  addLineCircleIntersection(plane: ProjectionPlane, lineId: string, circleId: string, index: number, id?: string, label?: string): Point2DLineCircleIntersection {
    const planeId = requirePlaneId(plane.id, 'point');
    const lineElement = requireLocalLine(plane, lineId, 'lineId');
    const circleElement = requireLocalCircle(plane, circleId, 'circleId', 'Circle does not exist.');
    requireRealizedLine(lineElement, lineId, 'lineId', this.context);
    requireRealizedCircle(circleElement, circleId, 'circleId', this.context);
    requireBinaryIndex(index, 'index');
    id = resolveElementId(id, () => this.generatePoint2DId(plane));
    label ??= this.context.labelGenerator.next('Point2D');
    const point = new Point2DLineCircleIntersection(id, lineId, circleId, index, planeId, label);
    this.addPoint(plane, point);
    return point;
  }

  addCircleCircleIntersection(plane: ProjectionPlane, circle1Id: string, circle2Id: string, index: number, id?: string, label?: string): Point2DCircleCircleIntersection {
    const planeId = requirePlaneId(plane.id, 'point');
    const circle1Element = requireLocalCircle(plane, circle1Id, 'circle1Id', 'Circle does not exist.');
    const circle2Element = requireLocalCircle(plane, circle2Id, 'circle2Id', 'Circle does not exist.');
    requireRealizedCircle(circle1Element, circle1Id, 'circle1Id', this.context);
    requireRealizedCircle(circle2Element, circle2Id, 'circle2Id', this.context);
    requireBinaryIndex(index, 'index');
    id = resolveElementId(id, () => this.generatePoint2DId(plane));
    label ??= this.context.labelGenerator.next('Point2D');
    const point = new Point2DCircleCircleIntersection(id, circle1Id, circle2Id, index, planeId, label);
    this.addPoint(plane, point);
    return point;
  }

  addLine2DBetweenTwoPoints(plane: ProjectionPlane, point1Id: string, point2Id: string, id?: string, label?: string): Line2DByTwoPoints {
    const planeId = requirePlaneId(plane.id, 'line');
    const point1 = requireLocalPoint(plane, point1Id, 'point1Id');
    const point2 = requireLocalPoint(plane, point2Id, 'point2Id');
    requireDistinctPointIds(point1Id, point2Id, 'line');
    requireDistinctRealizedPointsForLine(point1, point2, point1Id, point2Id, this.context);
    id = resolveElementId(id, () => this.generateLine2DId(plane));
    label ??= this.context.labelGenerator.next('Line2D');
    const line = new Line2DByTwoPoints(id, point1Id, point2Id, planeId, label);
    this.addLine(plane, line);
    return line;
  }

  addLine2DParallelToLine(plane: ProjectionPlane, referenceLineId: string, throughPointId: string, id?: string, label?: string): Line2DParallel {
    const planeId = requirePlaneId(plane.id, 'line');
    requireLocalPoint(plane, throughPointId, 'throughPointId');
    const refLineElement = requireWorldLine(this.context, referenceLineId, 'referenceLineId');
    requireRealizedLine(refLineElement, referenceLineId, 'referenceLineId', this.context);
    id = resolveElementId(id, () => this.generateLine2DId(plane));
    label ??= this.context.labelGenerator.next('Line2D');
    const line = new Line2DParallel(id, referenceLineId, throughPointId, planeId, label);
    this.addLine(plane, line);
    return line;
  }

  addLine2DPerpendicularToLine(plane: ProjectionPlane, referenceLineId: string, throughPointId: string, id?: string, label?: string): Line2DPerpendicularToLine {
    const planeId = requirePlaneId(plane.id, 'line');
    requireLocalPoint(plane, throughPointId, 'throughPointId');
    const refLineElement = requireWorldLine(this.context, referenceLineId, 'referenceLineId');
    requireRealizedLine(refLineElement, referenceLineId, 'referenceLineId', this.context);
    id = resolveElementId(id, () => this.generateLine2DId(plane));
    label ??= this.context.labelGenerator.next('Line2D');
    const line = new Line2DPerpendicularToLine(id, referenceLineId, throughPointId, planeId, label);
    this.addLine(plane, line);
    return line;
  }

  addLine2DByPointAndRelativeAngle(plane: ProjectionPlane, referenceLineId: string, throughPointId: string, angleRadians: number, id?: string, label?: string): Line2DByPointAndRelativeAngle {
    const planeId = requirePlaneId(plane.id, 'line');
    requireLocalPoint(plane, throughPointId, 'throughPointId');
    const refLineElement = requireWorldLine(this.context, referenceLineId, 'referenceLineId');
    requireRealizedLine(refLineElement, referenceLineId, 'referenceLineId', this.context);
    id = resolveElementId(id, () => this.generateLine2DId(plane));
    label ??= this.context.labelGenerator.next('Line2D');
    const line = new Line2DByPointAndRelativeAngle(id, referenceLineId, throughPointId, angleRadians, planeId, label);
    this.addLine(plane, line);
    return line;
  }

  addLine2DTangentToCircleThroughPoint(plane: ProjectionPlane, circleId: string, throughPointId: string, tangentIndex: 0 | 1, id?: string, label?: string): Line2DTangentToCircleThroughPoint {
    const planeId = requirePlaneId(plane.id, 'line');
    requireLocalCircle(plane, circleId, 'circleId');
    requireLocalPoint(plane, throughPointId, 'throughPointId');
    requireBinaryIndex(tangentIndex, 'tangentIndex');
    id = resolveElementId(id, () => this.generateLine2DId(plane));
    label ??= this.context.labelGenerator.next('Line2D');
    const line = new Line2DTangentToCircleThroughPoint(id, circleId, throughPointId, tangentIndex, planeId, label);
    this.addLine(plane, line);
    return line;
  }

  addLine2DTangentToCircleParallelToLine(plane: ProjectionPlane, circleId: string, referenceLineId: string, tangentIndex: 0 | 1, id?: string, label?: string): Line2DTangentToCircleParallelToLine {
    const planeId = requirePlaneId(plane.id, 'line');
    requireLocalCircle(plane, circleId, 'circleId');
    const refLineElement = requireWorldLine(this.context, referenceLineId, 'referenceLineId');
    requireRealizedLine(refLineElement, referenceLineId, 'referenceLineId', this.context);
    requireBinaryIndex(tangentIndex, 'tangentIndex');
    id = resolveElementId(id, () => this.generateLine2DId(plane));
    label ??= this.context.labelGenerator.next('Line2D');
    const line = new Line2DTangentToCircleParallelToLine(id, circleId, referenceLineId, tangentIndex, planeId, label);
    this.addLine(plane, line);
    return line;
  }

  addSegment2DBetweenPoints(plane: ProjectionPlane, point1Id: string, point2Id: string, id?: string, label?: string): Segment2D {
    const planeId = requirePlaneId(plane.id, 'segment');
    requireLocalPoint(plane, point1Id, 'point1Id');
    requireLocalPoint(plane, point2Id, 'point2Id');
    requireDistinctPointIds(point1Id, point2Id, 'segment');
    id = resolveElementId(id, () => this.generateSegment2DId(plane));
    label ??= this.context.labelGenerator.next('Segment2D');
    const segment = new Segment2D(id, point1Id, point2Id, planeId, label);
    this.addLine(plane, segment);
    return segment;
  }

  addCircle2DByCenterAndPoint(plane: ProjectionPlane, centerPointId: string, circumferencePointId: string, id?: string, label?: string): Circle2DByCenterAndPoint {
    const planeId = requirePlaneId(plane.id, 'circle');
    requireLocalPoint(plane, centerPointId, 'centerPointId');
    requireLocalPoint(plane, circumferencePointId, 'circumferencePointId');
    if (centerPointId === circumferencePointId) {
      throw new Error('Cannot create circle with center and circumference point being the same point.');
    }
    id = resolveElementId(id, () => this.generateCircle2DId(plane));
    label ??= this.context.labelGenerator.next('Circle2D');
    const circle = new Circle2DByCenterAndPoint(id, centerPointId, circumferencePointId, planeId, label);
    this.addCircle(plane, circle);
    return circle;
  }

  addCircle2DByCenterAndRadiusVector(plane: ProjectionPlane, centerPointId: string, radiusVector: Vector3, id?: string, label?: string): Circle2DByCenterAndRadiusVector {
    const planeId = requirePlaneId(plane.id, 'circle');
    requireLocalPoint(plane, centerPointId, 'centerPointId');
    id = resolveElementId(id, () => this.generateCircle2DId(plane));
    label ??= this.context.labelGenerator.next('Circle2D');
    const circle = new Circle2DByCenterAndRadiusVector(id, centerPointId, radiusVector, planeId, label);
    this.addCircle(plane, circle);
    return circle;
  }

  addGuide2D(plane: ProjectionPlane, referenceLineId: string, throughPointId: string, id?: string, label?: string): Guide2D {
    const planeId = requirePlaneId(plane.id, 'guide');
    requireLocalPoint(plane, throughPointId, 'throughPointId');
    const refLineElement = requireWorldLine(this.context, referenceLineId, 'referenceLineId');
    requireRealizedLine(refLineElement, referenceLineId, 'referenceLineId', this.context, 'Line cannot be realized.');
    id = resolveElementId(id, () => this.generateGuide2DId(plane));
    label ??= this.context.labelGenerator.next('Guide2D');
    const guide = new Guide2D(id, referenceLineId, throughPointId, planeId, label);
    this.addLine(plane, guide);
    return guide;
  }

  addSiblingGuide2D(plane: ProjectionPlane, primaryGuideId: string, referenceLineId: string, id?: string): SiblingGuide2D {
    const planeId = requirePlaneId(plane.id, 'sibling guide');
    const refLineElement = requireWorldLine(this.context, referenceLineId, 'referenceLineId');
    requireRealizedLine(refLineElement, referenceLineId, 'referenceLineId', this.context, 'Line cannot be realized.');
    const primaryGuide = this.context.getLine2D(primaryGuideId);
    if (!primaryGuide) {
      throw new Error(`Invalid primaryGuideId: ${primaryGuideId}. Primary guide does not exist.`);
    }
    id = resolveElementId(id, () => this.generateGuide2DId(plane));
    const siblingGuide = new SiblingGuide2D(id, referenceLineId, planeId, primaryGuideId, primaryGuide.label);
    this.addLine(plane, siblingGuide);
    return siblingGuide;
  }

  addSiblingIntersectionPoint(plane: ProjectionPlane, primaryIntersectionId: string, id?: string): SiblingIntersectionPoint2D {
    const planeId = requirePlaneId(plane.id, 'sibling intersection point');
    const primaryPoint = requirePrimaryIntersectionPoint(primaryIntersectionId, this.context);
    const isIntersection = primaryPoint instanceof Point2DLineLineIntersection ||
      primaryPoint instanceof Point2DLineCircleIntersection ||
      primaryPoint instanceof Point2DCircleCircleIntersection;
    if (!isIntersection) {
      throw new Error(`Primary point must be an intersection type, got: ${primaryPoint.constructor.name}`);
    }
    id = resolveElementId(id, () => this.generatePoint2DId(plane));
    const siblingPoint = new SiblingIntersectionPoint2D(id, primaryIntersectionId, planeId, primaryPoint.label);
    primaryPoint.siblingPointId = siblingPoint.id;
    this.addPoint(plane, siblingPoint);
    return siblingPoint;
  }

  addOriginPoint2D(plane: ProjectionPlane, position: Vector3, id?: string, label?: string): FreePoint2D {
    const planeId = requirePlaneId(plane.id, 'origin point');
    id = resolveElementId(id, () => this.generatePoint2DId(plane));
    const originPoint = new FreePoint2D(id, position, planeId, label);
    originPoint.locked = true;
    this.addPoint(plane, originPoint);
    return originPoint;
  }

  addHalfHingeLine2D(plane: ProjectionPlane, hingeLineId: string, id?: string): HalfHingeLine2D {
    const planeId = requirePlaneId(plane.id, 'half hinge line');
    id = resolveElementId(id, () => this.generateLine2DId(plane));
    const hingeLine = this.context.getHingeLineById(hingeLineId);
    if (!hingeLine) {
      throw new Error(`Cannot add HalfHingeLine2D: HingeLine ${hingeLineId} not found`);
    }
    const halfHingeLine = new HalfHingeLine2D(id, hingeLine.id, planeId);
    this.addLine(plane, halfHingeLine);
    return halfHingeLine;
  }

  private addPoint(plane: ProjectionPlane, point: Point2D): void {
    plane.addPoint(point);
    this.dependencies.registerNode(point.id, point.getDependencies());
  }

  private addLine(plane: ProjectionPlane, line: Line2D): void {
    plane.addLine(line);
    this.dependencies.registerNode(line.id, line.getDependencies());
  }

  private addCircle(plane: ProjectionPlane, circle: Circle2D): void {
    plane.addCircle(circle);
    this.dependencies.registerNode(circle.id, circle.getDependencies());
  }
}
