import type { Circle2D, Circle2DRealization2D } from '../Circle';
import type { DependencyRegistrarPort } from '../DependencyPorts';
import type { Line2D, Line2DRealization2D } from '../Line';
import type { Point2D, Point2DRealization2D } from '../Point';

export interface ProjectionPlaneStoreMutationContext {
  /**
   * Supplied by World, which owns the concrete DependencyService.
   * Projection-plane storage only needs the registration port.
   */
  getDependencyRegistrar(): DependencyRegistrarPort;
}

export class ProjectionPlaneElementStore {
  private readonly points = new Map<string, Point2D>();
  private readonly lines = new Map<string, Line2D>();
  private readonly circles = new Map<string, Circle2D>();
  private readonly pointRealizations = new Map<string, Point2DRealization2D>();
  private readonly lineRealizations = new Map<string, Line2DRealization2D>();
  private readonly circleRealizations = new Map<string, Circle2DRealization2D>();

  clear(): void {
    this.points.clear();
    this.lines.clear();
    this.circles.clear();
    this.pointRealizations.clear();
    this.lineRealizations.clear();
    this.circleRealizations.clear();
  }

  addPoint(point: Point2D, context?: ProjectionPlaneStoreMutationContext): void {
    if (!point.id) throw new Error('Cannot add point without ID');
    this.points.set(point.id, point);
    context?.getDependencyRegistrar().registerNode(point.id, point.getDependencies());
  }

  getPoint(id: string): Point2D | undefined { return this.points.get(id); }
  getAllPoints(): Point2D[] { return Array.from(this.points.values()); }
  removePoint(id: string, context?: ProjectionPlaneStoreMutationContext): boolean {
    this.pointRealizations.delete(id);
    const removed = this.points.delete(id);
    if (removed && context) {
      context.getDependencyRegistrar().unregisterNode(id);
    }
    return removed;
  }
  getPointRealization2D(id: string): Point2DRealization2D | undefined { return this.pointRealizations.get(id); }
  setPointRealization2D(id: string, realization: Point2DRealization2D): void { this.pointRealizations.set(id, realization); }
  clearPointRealization2D(id: string): void { this.pointRealizations.delete(id); }

  addLine(line: Line2D, context?: ProjectionPlaneStoreMutationContext): void {
    if (!line.id) throw new Error('Cannot add line without ID');
    this.lines.set(line.id, line);
    context?.getDependencyRegistrar().registerNode(line.id, line.getDependencies());
  }
  getLine(id: string): Line2D | undefined { return this.lines.get(id); }
  getAllLines(): Line2D[] { return Array.from(this.lines.values()); }
  removeLine(id: string, context?: ProjectionPlaneStoreMutationContext): boolean {
    this.lineRealizations.delete(id);
    const removed = this.lines.delete(id);
    if (removed && context) {
      context.getDependencyRegistrar().unregisterNode(id);
    }
    return removed;
  }
  getLineRealization2D(id: string): Line2DRealization2D | undefined { return this.lineRealizations.get(id); }
  setLineRealization2D(id: string, realization: Line2DRealization2D): void { this.lineRealizations.set(id, realization); }
  clearLineRealization2D(id: string): void { this.lineRealizations.delete(id); }

  addCircle(circle: Circle2D, context?: ProjectionPlaneStoreMutationContext): void {
    if (!circle.id) throw new Error('Cannot add circle without ID');
    this.circles.set(circle.id, circle);
    context?.getDependencyRegistrar().registerNode(circle.id, circle.getDependencies());
  }
  getCircle(id: string): Circle2D | undefined { return this.circles.get(id); }
  getAllCircles(): Circle2D[] { return Array.from(this.circles.values()); }
  removeCircle(id: string, context?: ProjectionPlaneStoreMutationContext): boolean {
    this.circleRealizations.delete(id);
    const removed = this.circles.delete(id);
    if (removed && context) {
      context.getDependencyRegistrar().unregisterNode(id);
    }
    return removed;
  }
  getCircleRealization2D(id: string): Circle2DRealization2D | undefined { return this.circleRealizations.get(id); }
  setCircleRealization2D(id: string, realization: Circle2DRealization2D): void { this.circleRealizations.set(id, realization); }
  clearCircleRealization2D(id: string): void { this.circleRealizations.delete(id); }

  clearRealizationCaches(id: string): void {
    this.pointRealizations.delete(id);
    this.lineRealizations.delete(id);
    this.circleRealizations.delete(id);
  }
}
