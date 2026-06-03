import type { Plane3DRealization3D } from '../Element3DRealization3D';
import type { HingeLine } from '../HingeLine';
import type { Line2D } from '../Line';
import type { Circle2D } from '../Circle';
import type { Point2D } from '../Point';
import type { ProjectionPlane } from '@/domain/world/projectionPlane/ProjectionPlane';
import type { DependencyRegistrarPort } from '@/domain/world/DependencyPorts';
import type { ProjectionPlaneRealization2D, ProjectionPlaneRealization3D } from './ProjectionPlaneRealization';

export interface ProjectionElementLookupContext {
  getProjectionPlaneById(id: string): ProjectionPlane | undefined;
  getPoint2D(id: string): Point2D | undefined;
  getLine2D(id: string): Line2D | undefined;
  getCircle2D(id: string): Circle2D | undefined;
  getHingeLineById(id: string): HingeLine | undefined;
}

export interface ProjectionRealizationLookupContext {
  getProjectionPlane2DRealization(id: string): ProjectionPlaneRealization2D | undefined;
  getProjectionPlane3DRealization(id: string): ProjectionPlaneRealization3D | undefined;
  get3DPlaneRealization(id: string): Plane3DRealization3D | undefined;
}

export interface ProjectionElementRealizationContext extends ProjectionElementLookupContext, ProjectionRealizationLookupContext {}

export interface ProjectionRealizationCollectionContext {
  getAllProjectionPlanes(): ProjectionPlane[];
  getAllHingeLines(): HingeLine[];
}

export interface ProjectionElementDiagnosticRealizationContext extends ProjectionElementRealizationContext, ProjectionRealizationCollectionContext {}


export function requireProjectionRealizationCollections(
  context: ProjectionElementRealizationContext,
  caller: string,
): asserts context is ProjectionElementDiagnosticRealizationContext {
  if (!('getAllProjectionPlanes' in context) || !('getAllHingeLines' in context)) {
    throw new Error(`${caller}: collection traversal capability is required`);
  }
}

export interface ProjectionPlaneRealizationContext extends ProjectionElementLookupContext, ProjectionRealizationLookupContext {}

export interface Element3DRealizationContext extends ProjectionElementLookupContext, ProjectionRealizationLookupContext {}

export interface HingeLineRealizationContext extends Element3DRealizationContext, ProjectionRealizationCollectionContext {}

export interface PlaneEquationRealizationContext extends ProjectionElementLookupContext, ProjectionRealizationLookupContext {}

export interface ProjectionOwnerPlaneQuery {
  getPlaneForElement(id: string): ProjectionPlane | undefined;
}

export interface ProjectionPlaneMutationContext extends ProjectionPlaneRealizationContext, ProjectionOwnerPlaneQuery {
  getNextId(): number;
  generateDefaultLabel(elementId: string, elementType: string): string;
  getDependencyRegistrar(): DependencyRegistrarPort;
  getSiblingPlaneForIntersection?(point: Point2D): string | undefined;
}
