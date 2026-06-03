import type { ProjectionPlaneRealization2D, ProjectionPlaneRealization3D } from './projectionPlane/ProjectionPlaneRealization';
import type { Line3DRealization3D, Plane3DRealization3D, Point3DRealization3D, Segment3DRealization3D } from './Element3DRealization3D';

export class RealizationStore {
  private point3D = new Map<string, Point3DRealization3D>();
  private projectionPlane2D = new Map<string, ProjectionPlaneRealization2D>();
  private projectionPlane3D = new Map<string, ProjectionPlaneRealization3D>();
  private line3D = new Map<string, Line3DRealization3D>();
  private segment3D = new Map<string, Segment3DRealization3D>();
  private plane3D = new Map<string, Plane3DRealization3D>();

  getPoint3D(id: string): Point3DRealization3D | undefined {
    return this.point3D.get(id);
  }

  setPoint3D(id: string, realization: Point3DRealization3D): void {
    this.point3D.set(id, realization);
  }

  clearPoint3D(id: string): void {
    this.point3D.delete(id);
  }

  getProjectionPlane2D(id: string): ProjectionPlaneRealization2D | undefined {
    return this.projectionPlane2D.get(id);
  }

  setProjectionPlane2D(id: string, realization: ProjectionPlaneRealization2D): void {
    this.projectionPlane2D.set(id, realization);
  }

  clearProjectionPlane2D(id: string): void {
    this.projectionPlane2D.delete(id);
  }

  getProjectionPlane3D(id: string): ProjectionPlaneRealization3D | undefined {
    return this.projectionPlane3D.get(id);
  }

  setProjectionPlane3D(id: string, realization: ProjectionPlaneRealization3D): void {
    this.projectionPlane3D.set(id, realization);
  }

  clearProjectionPlane3D(id: string): void {
    this.projectionPlane3D.delete(id);
  }

  getLine3D(id: string): Line3DRealization3D | undefined {
    return this.line3D.get(id);
  }

  setLine3D(id: string, realization: Line3DRealization3D): void {
    this.line3D.set(id, realization);
  }

  clearLine3D(id: string): void {
    this.line3D.delete(id);
  }

  getSegment3D(id: string): Segment3DRealization3D | undefined {
    return this.segment3D.get(id);
  }

  setSegment3D(id: string, realization: Segment3DRealization3D): void {
    this.segment3D.set(id, realization);
  }

  clearSegment3D(id: string): void {
    this.segment3D.delete(id);
  }

  getPlane3D(id: string): Plane3DRealization3D | undefined {
    return this.plane3D.get(id);
  }

  setPlane3D(id: string, realization: Plane3DRealization3D): void {
    this.plane3D.set(id, realization);
  }

  clearPlane3D(id: string): void {
    this.plane3D.delete(id);
  }

  clear3DElements(id: string): void {
    this.clearPoint3D(id);
    this.clearLine3D(id);
    this.clearSegment3D(id);
    this.clearPlane3D(id);
  }

  clearProjectionPlanes(): void {
    this.projectionPlane2D.clear();
    this.projectionPlane3D.clear();
  }

  clear(): void {
    this.clearProjectionPlanes();
    this.clear3DElementCaches();
  }

  clear3DElementCaches(): void {
    this.point3D.clear();
    this.line3D.clear();
    this.segment3D.clear();
    this.plane3D.clear();
  }
}
