import type { HingeLine } from '@/domain/world/HingeLine';
import type { Element3D } from '@/domain/world/Element3D';
import type { Line2D } from '@/domain/world/Line';
import type { Plane3DRealization3D, Point3DRealization3D, Line3DRealization3D, Segment3DRealization3D } from '@/domain/world/Element3DRealization3D';
import type { ProjectionPlane } from '@/domain/world/projectionPlane/ProjectionPlane';
import type { ProjectionPlaneRealization3D } from '@/domain/world/projectionPlane/ProjectionPlaneRealization';
import type { RealizationService } from '@/domain/world/RealizationService';
import type { World } from '@/domain/world/World';
import { createThreeRealizationContext, type ThreeRealizationContext } from './ThreeRealizationContext';
import { GeometryElementLookup } from '@/domain/world/GeometryElementLookup';

export interface ThreePresentationContext {
  readonly realizationContext: ThreeRealizationContext;
  getProjectionPlanes(): ProjectionPlane[];
  getHingeLines(): HingeLine[];
  getProjectionPlane3DRealization(id: string): ProjectionPlaneRealization3D | undefined;
  get3DPlaneRealization(id: string): Plane3DRealization3D | undefined;
  get3DPoints(): Element3D[];
  get3DLines(): Element3D[];
  get3DSegments(): Element3D[];
  get3DPlanes(): Element3D[];
  get3DPointRealization(id: string): Point3DRealization3D | undefined;
  get3DLineRealization(id: string): Line3DRealization3D | undefined;
  get3DSegmentRealization(id: string): Segment3DRealization3D | undefined;
  getLine2D(id: string): Line2D | undefined;
}

export function createThreePresentationContext(world: World, realizations: RealizationService): ThreePresentationContext {
  const lookup = new GeometryElementLookup(world);
  const getProjectionPlanes = () => world.getAllProjectionPlanes();
  const getHingeLines = () => world.getAllHingeLines();
  const realizationContext = createThreeRealizationContext(world, realizations, { getProjectionPlanes, getHingeLines });
  return {
    realizationContext,
    getProjectionPlanes,
    getHingeLines,
    getProjectionPlane3DRealization: id => {
      const plane = world.getProjectionPlaneById(id);
      return plane ? realizations.realizeProjectionPlane3D(plane, realizationContext) : undefined;
    },
    get3DPlaneRealization: id => {
      const plane = world.get3DPlane(id);
      return plane ? realizations.realizePlane3D(plane, realizationContext) : undefined;
    },
    get3DPoints: () => world.getAll3DPoints(),
    get3DLines: () => world.getAll3DLines(),
    get3DSegments: () => world.getAll3DSegments(),
    get3DPlanes: () => world.getAllPlanes(),
    get3DPointRealization: id => {
      const point = world.get3DPoint(id);
      return point ? realizations.realizePoint3D(point, realizationContext) : undefined;
    },
    get3DLineRealization: id => {
      const line = world.get3DLine(id);
      return line ? realizations.realizeLine3D(line, realizationContext) : undefined;
    },
    get3DSegmentRealization: id => {
      const segment = world.get3DSegment(id);
      return segment ? realizations.realizeSegment3D(segment, realizationContext) : undefined;
    },
    getLine2D: id => lookup.getLine2D(id),
  };
}
