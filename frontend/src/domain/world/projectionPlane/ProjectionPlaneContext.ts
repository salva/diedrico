import type { Circle2D } from '../Circle';
import type { HingeLine } from '../HingeLine';
import type { Line2D } from '../Line';
import type { Point2D } from '../Point';
import type { ProjectionPlane } from '@/domain/world/projectionPlane/ProjectionPlane';

export interface ProjectionPlaneRealizationContext {
  getLine2D(id: string): Line2D | undefined;
}

export interface ProjectionPlaneElementRealizationContext extends ProjectionPlaneRealizationContext {
  getPoint2D?(id: string): Point2D | undefined;
  getCircle2D?(id: string): Circle2D | undefined;
  getProjectionPlaneById(id: string): ProjectionPlane | undefined;
}

export interface ProjectionPlaneDependencyRegistrar {
  registerNode(id: string, dependencies: string[]): void;
  unregisterNode(id: string): void;
}

export interface ProjectionPlaneMutationContext extends ProjectionPlaneElementRealizationContext {
  getNextId(): number;
  generateDefaultLabel(elementId: string, elementType: string): string;
  getDependencyService(): ProjectionPlaneDependencyRegistrar;
  markDirty(): void;
  getHingeLineById(id: string): HingeLine | undefined;
  getPlaneForElement(id: string): ProjectionPlane | undefined;
  getSiblingPlaneForIntersection?(point: Point2D): string | undefined;
}
