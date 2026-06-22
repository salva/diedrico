import type { Element2D } from '@/domain/world/Element2D';
import type { Point2D, Point2DRealization2D } from '@/domain/world/Point';
import type { Line2D, Line2DRealization2D } from '@/domain/world/Line';
import type { Circle2D, Circle2DRealization2D } from '@/domain/world/Circle';
import type { ProjectionPlane } from '@/domain/world/projectionPlane/ProjectionPlane';

export interface ToolInteractionReadPort {
  getProjectionPlaneById(id: string): ProjectionPlane | undefined;
  getElement2D(id: string): Element2D | undefined;
  getPoint2D(id: string): Point2D | undefined;
  getLine2D(id: string): Line2D | undefined;
  getCircle2D(id: string): Circle2D | undefined;
  realizePoint2D(point: Point2D): Point2DRealization2D;
  realizeLine2D(line: Line2D): Line2DRealization2D;
  realizeCircle2D(circle: Circle2D): Circle2DRealization2D;
  areProjectionPlanesDistinct(firstPlaneId: string, secondPlaneId: string): boolean;
  getExpectedT2PrimeLineRealization(t1HingeTraceId: string, t2OtherTraceId: string): Line2DRealization2D | null;
}
