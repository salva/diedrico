import type { Vector4 } from 'three';
import type { Circle2DRealization2D } from '@/domain/world/Circle';
import type { Line2DRealization2D } from '@/domain/world/Line';
import type { Point2DRealization2D } from '@/domain/world/Point';
import type { Point3DRealization3D, Line3DRealization3D, Segment3DRealization3D, Plane3DRealization3D } from '@/domain/world/Element3DRealization3D';
import { AuxiliaryProjectionPlane } from '@/domain/world/projectionPlane/AuxiliaryProjectionPlane';
import type { ProjectionPlaneRealization3D } from '@/domain/world/projectionPlane/ProjectionPlaneRealization';
import type { VisualStyle } from '@/domain/world/VisualStyle';
import type { ProjectionElementRealizationContext, Element3DRealizationContext } from '@/domain/world/projectionPlane/ProjectionPlaneContext';
import type { World } from '@/domain/world/World';
import { isGuide2D, isSiblingGuide2D } from '@/domain/world/Guide';
import { Segment2DByPoints } from '@/domain/world/Segment';

export interface ThreeEntityPresentationData { id: string; visualStyle?: VisualStyle }

export interface ThreeProjectionPlaneReadModel {
  id: string;
  kind: 'fixed' | 'auxiliary';
  plane3DId: string | undefined;
  realization: ProjectionPlaneRealization3D | undefined;
}

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

export interface ThreeReconstructedReadModel {
  points: Array<ThreeEntityPresentationData & { realization: Point3DRealization3D | undefined }>;
  lines: Array<ThreeEntityPresentationData & { realization: Line3DRealization3D | undefined }>;
  segments: Array<ThreeEntityPresentationData & { realization: Segment3DRealization3D | undefined }>;
  planes: Array<ThreeEntityPresentationData & { realization: Plane3DRealization3D | undefined }>;
}

export interface ThreeGuideReadModel extends ThreeEntityPresentationData {
  planeId: string;
  planeRealization: ProjectionPlaneRealization3D | undefined;
  realization: Line2DRealization2D | undefined;
}

export interface ThreeGuideIntersectionReadModel {
  points: Array<ThreeEntityPresentationData & { cartesian: [number, number, number] | undefined }>;
  lines: Array<ThreeEntityPresentationData & { point: Vector4 | undefined; direction: Vector4 | undefined }>;
  segments: Array<ThreeEntityPresentationData & { startPoint: Vector4 | undefined; endPoint: Vector4 | undefined }>;
}

export interface ThreeHingeReadModel extends ThreeEntityPresentationData { realization: Line3DRealization3D | undefined }

export interface ThreeWorldReadPort {
  getProjectionPlaneModels(): ThreeProjectionPlaneReadModel[];
  getProjectionPlaneGridSource(planeId: string): { plane3DRealization: Plane3DRealization3D | undefined; projectionRealization: ProjectionPlaneRealization3D | undefined };
  getPlanarPlaneModels(): ThreePlanarPlaneReadModel[];
  getReconstructedModels(): ThreeReconstructedReadModel;
  getSelectedGuideModels(selectedIds: readonly string[]): ThreeGuideReadModel[];
  getGuideIntersectionModels(): ThreeGuideIntersectionReadModel;
  getHingeModels(): ThreeHingeReadModel[];
}

export function createThreeWorldReadPort(world: World): ThreeWorldReadPort {
  const realizationContext: ProjectionElementRealizationContext & Element3DRealizationContext = world;
  return {
    getProjectionPlaneModels: () => world.getAllProjectionPlanes().map(plane => ({
      id: plane.id,
      kind: plane instanceof AuxiliaryProjectionPlane ? 'auxiliary' : 'fixed',
      plane3DId: plane instanceof AuxiliaryProjectionPlane ? plane.plane3DId : plane.id,
      realization: world.getProjectionPlane3DRealization(plane.id),
    })),
    getProjectionPlaneGridSource: (planeId: string) => {
      const plane = world.getProjectionPlaneById(planeId);
      const plane3DId = plane instanceof AuxiliaryProjectionPlane ? plane.plane3DId : plane?.id;
      return {
        plane3DRealization: plane3DId ? world.get3DPlaneRealization(plane3DId) : undefined,
        projectionRealization: world.getProjectionPlane3DRealization(planeId),
      };
    },
    getPlanarPlaneModels: () => world.getAllProjectionPlanes().map(plane => ({
      id: plane.id,
      realization: world.getProjectionPlane3DRealization(plane.id),
      points: plane.getAllPoints().map(point => ({ id: point.id, visualStyle: point.visualStyle, realization: point.realize2D(realizationContext) })),
      lines: plane.getAllLines().map(line => ({ id: line.id, visualStyle: line.visualStyle, realization: line.realize2D(realizationContext), isSegment: line instanceof Segment2DByPoints })),
      circles: plane.getAllCircles().map(circle => ({ id: circle.id, visualStyle: circle.visualStyle, realization: circle.realize2D(realizationContext) })),
    })),
    getReconstructedModels: () => ({
      points: world.getAll3DPoints().map(point => ({ id: point.id!, visualStyle: point.visualStyle, realization: world.get3DPointRealization(point.id!) })),
      lines: world.getAll3DLines().map(line => ({ id: line.id!, visualStyle: line.visualStyle, realization: world.get3DLineRealization(line.id!) })),
      segments: world.getAll3DSegments().map(segment => ({ id: segment.id!, visualStyle: segment.visualStyle, realization: world.get3DSegmentRealization(segment.id!) })),
      planes: world.getAllPlanes().map(plane => ({ id: plane.id!, visualStyle: plane.visualStyle, realization: world.get3DPlaneRealization(plane.id!) })),
    }),
    getSelectedGuideModels: (selectedIds: readonly string[]) => selectedIds.flatMap(selectedId => {
      try {
        const line = world.getLine2D(selectedId);
        if (!line || (!isGuide2D(line) && !isSiblingGuide2D(line))) return [];
        return [{ id: line.id, visualStyle: line.visualStyle, planeId: line.planeId, planeRealization: world.getProjectionPlane3DRealization(line.planeId), realization: line.realize2D(realizationContext) }];
      } catch {
        return [];
      }
    }),
    getGuideIntersectionModels: () => ({
      points: world.getAll3DPoints().map(point => {
        const realization = world.get3DPointRealization(point.id!);
        return { id: point.id!, visualStyle: point.visualStyle, cartesian: realization?.isFeasible() ? realization.getCartesian() : undefined };
      }),
      lines: world.getAll3DLines().map(line => {
        const realization = world.get3DLineRealization(line.id!);
        return { id: line.id!, visualStyle: line.visualStyle, point: realization?.isFeasible() ? realization.point : undefined, direction: realization?.isFeasible() ? realization.getDirection() : undefined };
      }),
      segments: world.getAll3DSegments().map(segment => {
        const realization = world.get3DSegmentRealization(segment.id!);
        return { id: segment.id!, visualStyle: segment.visualStyle, startPoint: realization?.isFeasible() ? realization.startPoint : undefined, endPoint: realization?.isFeasible() ? realization.endPoint : undefined };
      }),
    }),
    getHingeModels: () => world.getAllHingeLines().map(hingeLine => ({ id: hingeLine.id, visualStyle: hingeLine.visualStyle, realization: hingeLine.realize3D(realizationContext) })),
  };
}
