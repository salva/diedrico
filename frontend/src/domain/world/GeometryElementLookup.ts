import type { Point2D } from './Point';
import { Line2D } from './Line';
import { Circle2D } from './Circle';
import { HingeLine } from './HingeLine';
import { Plane3D } from './Plane';
import type { ProjectionPlane } from './projectionPlane/ProjectionPlane';
import type { Element2D } from './Element2D';
import type { Point3D } from './Point3D';
import type { Line3D } from './Line3D';
import type { Segment3DFromProjections } from './Segment3D';
import { getContainerIdFromElementId } from './ElementId';
import type { World } from './World';

export class GeometryElementLookup {
  constructor(private readonly world: World) {}

  getElement2D(id: string): Element2D | undefined {
    const plane = this.getProjectionPlaneForElementId(id, 'element');
    if (!plane) return undefined;
    return plane.getPoint(id) || plane.getLine(id) || plane.getCircle(id);
  }

  getPoint2D(id: string): Point2D | undefined {
    const plane = this.requireProjectionPlaneForElementId(id, 'point');
    return plane.getPoint(id);
  }

  getLine2D(id: string): Line2D | undefined {
    const plane = this.requireProjectionPlaneForElementId(id, 'line');
    return plane.getLine(id);
  }

  getCircle2D(id: string): Circle2D | undefined {
    const plane = this.requireProjectionPlaneForElementId(id, 'circle');
    return plane.getCircle(id);
  }

  getElement3DById(id: string): Point3D | Line3D | Segment3DFromProjections | Plane3D | HingeLine | undefined {
    return this.world.get3DPoint(id)
      || this.world.get3DLine(id)
      || this.world.get3DSegment(id)
      || this.world.get3DPlane(id)
      || this.world.getHingeLineById(id);
  }

  private getProjectionPlaneForElementId(id: string, role: string): ProjectionPlane | undefined {
    const containerId = getContainerIdFromElementId(id);
    const plane = this.world.getProjectionPlaneById(containerId);
    if (!plane && containerId === id) return undefined;
    if (!plane) {
      throw new Error(`[INTERNAL ERROR] Plane ${containerId} not found when looking up ${role} ${id}. This indicates corrupted element ID or missing plane registration.`);
    }
    return plane;
  }

  private requireProjectionPlaneForElementId(id: string, role: string): ProjectionPlane {
    const plane = this.getProjectionPlaneForElementId(id, role);
    if (!plane) {
      throw new Error(`[INTERNAL ERROR] Plane ${id} not found when looking up ${role} ${id}. This indicates corrupted element ID or missing plane registration.`);
    }
    return plane;
  }
}
