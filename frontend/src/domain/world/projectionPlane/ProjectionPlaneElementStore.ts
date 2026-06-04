import type { Circle2D } from '../Circle';
import type { Line2D } from '../Line';
import type { Point2D } from '../Point';

export class ProjectionPlaneElementStore {
  private readonly points = new Map<string, Point2D>();
  private readonly lines = new Map<string, Line2D>();
  private readonly circles = new Map<string, Circle2D>();

  clear(): void {
    this.points.clear();
    this.lines.clear();
    this.circles.clear();
  }

  addPoint(point: Point2D): void {
    if (!point.id) throw new Error('Cannot add point without ID');
    this.points.set(point.id, point);
  }

  getPoint(id: string): Point2D | undefined { return this.points.get(id); }
  getAllPoints(): Point2D[] { return Array.from(this.points.values()); }
  removePoint(id: string): boolean {
    return this.points.delete(id);
  }

  addLine(line: Line2D): void {
    if (!line.id) throw new Error('Cannot add line without ID');
    this.lines.set(line.id, line);
  }
  getLine(id: string): Line2D | undefined { return this.lines.get(id); }
  getAllLines(): Line2D[] { return Array.from(this.lines.values()); }
  removeLine(id: string): boolean {
    return this.lines.delete(id);
  }

  addCircle(circle: Circle2D): void {
    if (!circle.id) throw new Error('Cannot add circle without ID');
    this.circles.set(circle.id, circle);
  }
  getCircle(id: string): Circle2D | undefined { return this.circles.get(id); }
  getAllCircles(): Circle2D[] { return Array.from(this.circles.values()); }
  removeCircle(id: string): boolean {
    return this.circles.delete(id);
  }
}
