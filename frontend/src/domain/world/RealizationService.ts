import type { Circle2D, Circle2DRealization2D } from './Circle';
import type { Line3DRealization3D, Plane3DRealization3D, Point3DRealization3D, Segment3DRealization3D } from './Element3DRealization3D';
import type { Line2D, Line2DRealization2D } from './Line';
import type { Plane3D } from './Plane';
import type { Point2D, Point2DRealization2D } from './Point';
import type { Line3D } from './Line3D';
import type { Point3D } from './Point3D';
import type { Segment3DFromProjections } from './Segment3D';
import type { DependencyQueryPort } from './DependencyPorts';
import type { Element3DRealizationContext, ProjectionElementRealizationContext, ProjectionPlaneRealizationContext } from './projectionPlane/ProjectionPlaneContext';
import type { ProjectionPlane } from './projectionPlane/ProjectionPlane';
import type { ProjectionPlaneRealization2D, ProjectionPlaneRealization3D } from './projectionPlane/ProjectionPlaneRealization';

export class RealizationService {
  private readonly point2D = new Map<string, Point2DRealization2D>();
  private readonly line2D = new Map<string, Line2DRealization2D>();
  private readonly circle2D = new Map<string, Circle2DRealization2D>();

  private readonly point3D = new Map<string, Point3DRealization3D>();
  private readonly line3D = new Map<string, Line3DRealization3D>();
  private readonly segment3D = new Map<string, Segment3DRealization3D>();
  private readonly plane3D = new Map<string, Plane3DRealization3D>();

  private readonly projectionPlane2D = new Map<string, ProjectionPlaneRealization2D>();
  private readonly projectionPlane3D = new Map<string, ProjectionPlaneRealization3D>();

  realizePoint2D(point: Point2D, context: ProjectionElementRealizationContext): Point2DRealization2D | undefined {
    const cached = this.point2D.get(point.id);
    if (cached) return cached;

    const realization = point.realize2D(context);
    if (realization) this.point2D.set(point.id, realization);
    return realization;
  }

  realizeLine2D(line: Line2D, context: ProjectionElementRealizationContext): Line2DRealization2D | undefined {
    const cached = this.line2D.get(line.id);
    if (cached) return cached;

    const realization = line.realize2D(context);
    if (realization) this.line2D.set(line.id, realization);
    return realization;
  }

  realizeCircle2D(circle: Circle2D, context: ProjectionElementRealizationContext): Circle2DRealization2D | undefined {
    const cached = this.circle2D.get(circle.id);
    if (cached) return cached;

    const realization = circle.realize2D(context) ?? undefined;
    if (realization) this.circle2D.set(circle.id, realization);
    return realization;
  }

  realizePoint3D(point: Point3D, context: Element3DRealizationContext): Point3DRealization3D | undefined {
    const cached = this.point3D.get(point.id);
    if (cached) return cached;

    const realization = point.realize3D(context);
    this.point3D.set(point.id, realization);
    return realization;
  }

  realizeLine3D(line: Line3D, context: Element3DRealizationContext): Line3DRealization3D | undefined {
    const cached = this.line3D.get(line.id);
    if (cached) return cached;

    const realization = line.realize3D(context);
    this.line3D.set(line.id, realization);
    return realization;
  }

  realizeSegment3D(segment: Segment3DFromProjections, context: Element3DRealizationContext): Segment3DRealization3D | undefined {
    const cached = this.segment3D.get(segment.id);
    if (cached) return cached;

    const realization = segment.realize3D(context);
    this.segment3D.set(segment.id, realization);
    return realization;
  }

  realizePlane3D(plane: Plane3D, context: Element3DRealizationContext): Plane3DRealization3D | undefined {
    const cached = this.plane3D.get(plane.id);
    if (cached) return cached;

    const realization = plane.realize3D(context);
    this.plane3D.set(plane.id, realization);
    return realization;
  }

  realizeProjectionPlane2D(plane: ProjectionPlane, context: ProjectionPlaneRealizationContext): ProjectionPlaneRealization2D | undefined {
    const cached = this.projectionPlane2D.get(plane.id);
    if (cached) return cached;

    const realization = plane.realize2D(context);
    this.projectionPlane2D.set(plane.id, realization);
    return realization;
  }

  realizeProjectionPlane3D(plane: ProjectionPlane, context: ProjectionPlaneRealizationContext): ProjectionPlaneRealization3D | undefined {
    const cached = this.projectionPlane3D.get(plane.id);
    if (cached) return cached;

    const realization = plane.realize3D(context);
    this.projectionPlane3D.set(plane.id, realization);
    return realization;
  }

  invalidateElement(elementId: string, dependencyQuery: DependencyQueryPort, projectionPlanes: Map<string, ProjectionPlane>): string[] {
    const affectedIds = [elementId, ...dependencyQuery.getAllDependents(elementId)];
    const affected = new Set(affectedIds);

    for (const id of affected) {
      this.clearElement(id);
    }

    for (const [projPlaneId, projPlane] of projectionPlanes) {
      if (
        affected.has(projPlaneId) ||
        (projPlane.plane3DId != null && affected.has(projPlane.plane3DId)) ||
        projPlane.getDependencies().some((depId) => affected.has(depId))
      ) {
        this.clearProjectionPlane(projPlaneId);
      }
    }

    return affectedIds;
  }

  clearElement(id: string): void {
    this.point2D.delete(id);
    this.line2D.delete(id);
    this.circle2D.delete(id);
    this.point3D.delete(id);
    this.line3D.delete(id);
    this.segment3D.delete(id);
    this.plane3D.delete(id);
  }

  clearProjectionPlane(id: string): void {
    this.projectionPlane2D.delete(id);
    this.projectionPlane3D.delete(id);
  }

  clear3DElementCaches(): void {
    this.point3D.clear();
    this.line3D.clear();
    this.segment3D.clear();
    this.plane3D.clear();
  }

  clear(): void {
    this.point2D.clear();
    this.line2D.clear();
    this.circle2D.clear();
    this.clear3DElementCaches();
    this.projectionPlane2D.clear();
    this.projectionPlane3D.clear();
  }
}
