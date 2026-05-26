import type { Plane3DRealization3D } from '../Element3DRealization3D';
import type { HingeLine } from '../HingeLine';
import type { Line2D } from '../Line';
import type { Circle2D } from '../Circle';
import type { Point2D } from '../Point';
import type { ProjectionPlane } from '@/domain/world/projectionPlane/ProjectionPlane';
import type { ProjectionPlaneRealization2D, ProjectionPlaneRealization3D } from './ProjectionPlaneRealization';

export interface ProjectionElementRealizationContext {
  getProjectionPlaneById(id: string): ProjectionPlane | undefined;
  getPoint2D(id: string): Point2D | undefined;
  getLine2D(id: string): Line2D | undefined;
  getCircle2D(id: string): Circle2D | undefined;
  getProjectionPlane2DRealization(id: string): ProjectionPlaneRealization2D | undefined;
  getProjectionPlane3DRealization(id: string): ProjectionPlaneRealization3D | undefined;
  get3DPlaneRealization(id: string): Plane3DRealization3D | undefined;
  getHingeLineById(id: string): HingeLine | undefined;
  getAllProjectionPlanes(): ProjectionPlane[];
  getAllHingeLines(): HingeLine[];
}

export interface ProjectionPlaneRealizationContext extends ProjectionElementRealizationContext {}

export interface ProjectionOwnerPlaneQuery {
  getPlaneForElement(id: string): ProjectionPlane | undefined;
}

export interface ProjectionPlaneDependencyRegistrar {
  registerNode(id: string, dependencies: string[]): void;
  unregisterNode(id: string): void;
}

export interface ProjectionPlaneMutationContext extends ProjectionPlaneRealizationContext, ProjectionOwnerPlaneQuery {
  getNextId(): number;
  generateDefaultLabel(elementId: string, elementType: string): string;
  getDependencyService(): ProjectionPlaneDependencyRegistrar;
  markDirty(): void;
  getSiblingPlaneForIntersection?(point: Point2D): string | undefined;
}
