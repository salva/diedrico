import type { Vector4 } from 'three';
import type { Line2DRealization2D } from '@/domain/world/Line';
import type { ProjectionPlaneRealization3D } from '@/domain/world/projectionPlane/ProjectionPlaneRealization';
import type { World } from '@/domain/world/World';
import { isGuide2D, isSiblingGuide2D } from '@/domain/world/Guide';
import type { ThreeEntityPresentationData } from './ThreePresentationReadModel';
import { createThreeRealizationContext } from './ThreeRealizationContext';

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

export interface ThreeGuideReadPort {
  getSelectedGuideModels(selectedIds: readonly string[]): ThreeGuideReadModel[];
  getGuideIntersectionModels(): ThreeGuideIntersectionReadModel;
}

export function createThreeGuideReadPort(world: World): ThreeGuideReadPort {
  const realizationContext = createThreeRealizationContext(world);
  return {
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
  };
}
