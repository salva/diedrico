import type { HingeLine } from '@/domain/world/HingeLine';
import type { Element3D } from '@/domain/world/Element3D';
import type { Line2D } from '@/domain/world/Line';
import type { Plane3DRealization3D, Point3DRealization3D, Line3DRealization3D, Segment3DRealization3D } from '@/domain/world/Element3DRealization3D';
import type { ProjectionPlane } from '@/domain/world/projectionPlane/ProjectionPlane';
import type { ProjectionPlaneRealization3D } from '@/domain/world/projectionPlane/ProjectionPlaneRealization';
import type { World } from '@/domain/world/World';
import { createThreeRealizationContext, type ThreeRealizationContext } from './ThreeRealizationContext';

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

export function createThreePresentationContext(world: World): ThreePresentationContext {
  const getProjectionPlanes = () => world.getAllProjectionPlanes();
  const getHingeLines = () => world.getAllHingeLines();
  return {
    realizationContext: createThreeRealizationContext(world, { getProjectionPlanes, getHingeLines }),
    getProjectionPlanes,
    getHingeLines,
    getProjectionPlane3DRealization: id => world.getProjectionPlane3DRealization(id),
    get3DPlaneRealization: id => world.get3DPlaneRealization(id),
    get3DPoints: () => world.getAll3DPoints(),
    get3DLines: () => world.getAll3DLines(),
    get3DSegments: () => world.getAll3DSegments(),
    get3DPlanes: () => world.getAllPlanes(),
    get3DPointRealization: id => world.get3DPointRealization(id),
    get3DLineRealization: id => world.get3DLineRealization(id),
    get3DSegmentRealization: id => world.get3DSegmentRealization(id),
    getLine2D: id => world.getLine2D(id),
  };
}
