import { Vector3, type Matrix3 } from 'three';

export interface ViewportTransform {
  zoom: number;
  panX: number;
  panY: number;
}

export interface CanvasPoint {
  readonly x: number;
  readonly y: number;
}

export function screenToCanvasPoint(svg: SVGSVGElement, clientX: number, clientY: number): CanvasPoint | null {
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;

  const ctm = svg.getScreenCTM();
  if (!ctm) return null;

  const canvasPoint = point.matrixTransform(ctm.inverse());
  return { x: canvasPoint.x, y: canvasPoint.y };
}

export function canvasToPlaneCoordinates(
  canvasPoint: CanvasPoint,
  paperToPlaneTransform: Matrix3,
  viewport: ViewportTransform,
): Vector3 | null {
  const paperX = canvasPoint.x / viewport.zoom - viewport.panX;
  const paperY = canvasPoint.y / viewport.zoom - viewport.panY;

  return new Vector3(paperX, paperY, 1).applyMatrix3(paperToPlaneTransform);
}
