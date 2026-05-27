import type { Circle2DRealization2D } from '@/domain/world/Circle';
import type { Line2DRealization2D } from '@/domain/world/Line';
import type { Point2DRealization2D } from '@/domain/world/Point';
import type { ProjectionPlaneRealization3D } from '@/domain/world/projectionPlane/ProjectionPlaneRealization';
import { Segment2DByPoints } from '@/domain/world/Segment';
import type { World } from '@/domain/world/World';
import type { ThreeEntityPresentationData } from './ThreePresentationReadModel';
import { createThreeRealizationContext } from './ThreeRealizationContext';

export interface ThreePlanarPointReadModel extends ThreeEntityPresentationData { realization: Point2DRealization2D | undefined }
export interface ThreePlanarLineReadModel extends ThreeEntityPresentationData { realization: Line2DRealization2D | undefined; isSegment: boolean }
export interface ThreePlanarCircleReadModel extends ThreeEntityPresentationData { realization: Circle2DRealization2D | undefined | null }

export interface ThreePlanarPlaneReadModel {
  id: string;
  realization: ProjectionPlaneRealization3D | undefined;
  points: ThreePlanarPointReadModel[];
  lines: ThreePlanarLineReadModel[];
  circles: ThreePlanarCircleReadModel[];
}

export interface ThreePlanarElementReadPort {
  getPlanarPlaneModels(): ThreePlanarPlaneReadModel[];
}

export function createThreePlanarElementReadPort(world: World): ThreePlanarElementReadPort {
  const getProjectionPlanes = () => world.getAllProjectionPlanes();
  const realizationContext = createThreeRealizationContext(world, {
    getProjectionPlanes,
    getHingeLines: () => [],
  });
  return {
    getPlanarPlaneModels: () => getProjectionPlanes().map(plane => ({
      id: plane.id,
      realization: world.getProjectionPlane3DRealization(plane.id),
      points: plane.getAllPoints().map(point => ({ id: point.id, visualStyle: point.visualStyle, realization: point.realize2D(realizationContext) })),
      lines: plane.getAllLines().map(line => ({ id: line.id, visualStyle: line.visualStyle, realization: line.realize2D(realizationContext), isSegment: line instanceof Segment2DByPoints })),
      circles: plane.getAllCircles().map(circle => ({ id: circle.id, visualStyle: circle.visualStyle, realization: circle.realize2D(realizationContext) })),
    })),
  };
}
