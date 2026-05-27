import type { Line3DRealization3D, Plane3DRealization3D, Point3DRealization3D, Segment3DRealization3D } from '@/domain/world/Element3DRealization3D';
import type { World } from '@/domain/world/World';
import type { ThreeEntityPresentationData } from './ThreePresentationReadModel';

export interface ThreeReconstructedReadModel {
  points: Array<ThreeEntityPresentationData & { realization: Point3DRealization3D | undefined }>;
  lines: Array<ThreeEntityPresentationData & { realization: Line3DRealization3D | undefined }>;
  segments: Array<ThreeEntityPresentationData & { realization: Segment3DRealization3D | undefined }>;
  planes: Array<ThreeEntityPresentationData & { realization: Plane3DRealization3D | undefined }>;
}

export interface ThreeReconstructedElementReadPort {
  getReconstructedModels(): ThreeReconstructedReadModel;
}

export function createThreeReconstructedElementReadPort(world: World): ThreeReconstructedElementReadPort {
  return {
    getReconstructedModels: () => ({
      points: world.getAll3DPoints().map(point => ({ id: point.id!, visualStyle: point.visualStyle, realization: world.get3DPointRealization(point.id!) })),
      lines: world.getAll3DLines().map(line => ({ id: line.id!, visualStyle: line.visualStyle, realization: world.get3DLineRealization(line.id!) })),
      segments: world.getAll3DSegments().map(segment => ({ id: segment.id!, visualStyle: segment.visualStyle, realization: world.get3DSegmentRealization(segment.id!) })),
      planes: world.getAllPlanes().map(plane => ({ id: plane.id!, visualStyle: plane.visualStyle, realization: world.get3DPlaneRealization(plane.id!) })),
    }),
  };
}
