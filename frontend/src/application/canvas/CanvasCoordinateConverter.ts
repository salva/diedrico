import type { Matrix3, Vector3 } from 'three';
import { InputService, type ViewportTransform } from './InputService';

const inputService = new InputService();

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
  return inputService.canvasToPlaneCoordinates(
    canvasPoint.x,
    canvasPoint.y,
    paperToPlaneTransform,
    viewport,
  );
}

export type { ViewportTransform };
