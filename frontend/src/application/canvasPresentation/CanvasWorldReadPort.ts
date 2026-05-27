import type { Circle2D, Circle2DRealization2D } from '@/domain/world/Circle';
import type { Line2D, Line2DRealization2D } from '@/domain/world/Line';
import type { Point2D, Point2DRealization2D } from '@/domain/world/Point';
import type { Point3D } from '@/domain/world/Point3D';
import type { Line3D } from '@/domain/world/Line3D';
import type { Segment3D } from '@/domain/world/Segment3D';
import type { ProjectionPlane } from '@/domain/world/projectionPlane/ProjectionPlane';
import type { ProjectionPlaneRealization3D } from '@/domain/world/projectionPlane/ProjectionPlaneRealization';
import type { Point3DRealization3D, Line3DRealization3D, Segment3DRealization3D } from '@/domain/world/Element3DRealization3D';
import type { ProcessTree } from '@/domain/processTree/ProcessTree';
import type { ProjectionElementRealizationContext, Element3DRealizationContext } from '@/domain/world/projectionPlane/ProjectionPlaneContext';
import type { World } from '@/domain/world/World';
import type { CanvasPlaneTransformModel } from './CanvasPresentationModel';

export interface CanvasWorldReadPort {
  getAllProjectionPlanes(): ProjectionPlane[];
  getProjectionPlane2DTransform(planeId: string): CanvasPlaneTransformModel | undefined;
  getProjectionPlane3DRealization(planeId: string): ProjectionPlaneRealization3D | undefined;
  getAll3DPoints(): Point3D[];
  getAll3DLines(): Line3D[];
  getAll3DSegments(): Segment3D[];
  realizePoint2D(plane: ProjectionPlane, point: Point2D): Point2DRealization2D | undefined;
  realizeLine2D(plane: ProjectionPlane, line: Line2D): Line2DRealization2D | undefined;
  realizeCircle2D(plane: ProjectionPlane, circle: Circle2D): Circle2DRealization2D | undefined | null;
  realizePoint3D(point: Point3D): Point3DRealization3D;
  realizeLine3D(line: Line3D): Line3DRealization3D;
  realizeSegment3D(segment: Segment3D): Segment3DRealization3D;
  getProcessTree(): ProcessTree;
}

function createCanvasRealizationContext(world: World): ProjectionElementRealizationContext & Element3DRealizationContext {
  return {
    getProjectionPlaneById: id => world.getProjectionPlaneById(id),
    getPoint2D: id => world.getPoint2D(id),
    getLine2D: id => world.getLine2D(id),
    getCircle2D: id => world.getCircle2D(id),
    getProjectionPlane2DRealization: id => world.getProjectionPlane2DRealization(id),
    getProjectionPlane3DRealization: id => world.getProjectionPlane3DRealization(id),
    get3DPlaneRealization: id => world.get3DPlaneRealization(id),
    getHingeLineById: id => world.getHingeLineById(id),
    getAllProjectionPlanes: () => world.getAllProjectionPlanes(),
    getAllHingeLines: () => world.getAllHingeLines(),
  };
}

export function createCanvasWorldReadPort(world: World): CanvasWorldReadPort {
  const realizationContext = createCanvasRealizationContext(world);
  return {
    getAllProjectionPlanes: () => world.getAllProjectionPlanes(),
    getProjectionPlane2DTransform: (planeId: string) => {
      const realization = world.getProjectionPlane2DRealization(planeId);
      if (!realization) return undefined;
      return {
        planeId,
        planeToPaper: realization.planeToPaper2D,
        paperToPlane: realization.paperToPlane2D,
      };
    },
    getProjectionPlane3DRealization: (planeId: string) => world.getProjectionPlane3DRealization(planeId),
    getAll3DPoints: () => world.getAll3DPoints(),
    getAll3DLines: () => world.getAll3DLines(),
    getAll3DSegments: () => world.getAll3DSegments(),
    realizePoint2D: (plane, point) => plane.realizePoint2D(point, realizationContext),
    realizeLine2D: (plane, line) => plane.realizeLine2D(line, realizationContext),
    realizeCircle2D: (plane, circle) => plane.realizeCircle2D(circle, realizationContext),
    realizePoint3D: point => point.realize3D(realizationContext),
    realizeLine3D: line => line.realize3D(realizationContext),
    realizeSegment3D: segment => segment.realize3D(realizationContext),
    getProcessTree: () => world.getProcessTree(),
  };
}

export type CanvasPlaneTransformMap = Map<string, CanvasPlaneTransformModel>;
