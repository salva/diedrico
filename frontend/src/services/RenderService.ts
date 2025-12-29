/**
 * RenderService.ts
 * 
 * Generic SVG rendering service following Constitution Principle IV:
 * "Principle-Based Rendering - No Hardcoded Cases"
 * 
 * This service provides generic rendering algorithms that work for ALL geometric elements,
 * including fixed elements (P_H, P_V, O, HL_HV) and user-created elements.
 * NO special-case rendering logic.
 * 
 * Reference: specs/001-dihedral-learning-mvp/ui-spec.md - Visual Hierarchy
 * Reference: specs/001-dihedral-learning-mvp/data-model.md - Coordinate Transformations
 */

import type { Point2D, Point2DRealization } from '../domain/world/Point';
import type { Plane3D } from '../domain/world/Plane3D';
import { planeToCanvas } from '../domain/calculations/CoordinateTransform';

/**
 * SVG element attributes for rendering
 */
export interface SVGElementAttributes {
  [key: string]: string | number;
}

/**
 * Render a point as an SVG circle element
 * Uses generic point-to-circle rendering algorithm
 * 
 * @param point - Point instance to render
 * @param canvasOriginX - Canvas origin X coordinate (default 400)
 * @param canvasOriginY - Canvas origin Y coordinate (default 400)
 * @returns SVG circle attributes
 */
export function renderPoint(
  point: Point2D,
  canvasOriginX: number = 400,
  canvasOriginY: number = 400
): SVGElementAttributes {
  // Transform plane intrinsic coordinates to canvas coordinates
  const [cx, cy] = planeToCanvas(
    point.u,
    point.v,
    point.planeId || 'plane_H',
    canvasOriginX,
    canvasOriginY
  );

  // Generic point rendering: all points are rendered as circles
  // Visual distinction via styling (free vs derived), not shape
  const radius = point.type === 'free' ? 5 : 4;
  const fill = point.type === 'free' ? '#4A90E2' : '#E94E77';
  const stroke = '#333333';
  const strokeWidth = 1.5;

  return {
    cx,
    cy,
    r: radius,
    fill,
    stroke,
    'stroke-width': strokeWidth,
    'data-element-id': point.id || 'unknown',
    'data-element-type': 'point',
  };
}

/**
 * Render a plane as an SVG rectangle element
 * Uses generic plane-to-rectangle rendering algorithm
 * 
 * Planes are rendered as rectangles defined by their boundaries.
 * Works for ANY plane (P_H, P_V, or auxiliary planes) - no special cases.
 * 
 * @param plane - Plane3D instance to render
 * @param canvasOriginX - Canvas origin X coordinate (default 400)
 * @param canvasOriginY - Canvas origin Y coordinate (default 400)
 * @returns SVG rect attributes
 */
export function renderPlane(
  plane: Plane3D,
  canvasOriginX: number = 400,
  canvasOriginY: number = 400
): SVGElementAttributes {
  // Get plane boundaries in plane intrinsic coordinates
  const { minU, maxU, minV, maxV } = plane;

  // Transform boundary corners to canvas coordinates
  const [x1, y1] = planeToCanvas(minU, minV, plane.id || 'plane_H', canvasOriginX, canvasOriginY);
  const [x2, y2] = planeToCanvas(maxU, maxV, plane.id || 'plane_H', canvasOriginX, canvasOriginY);

  // Calculate rectangle position and dimensions
  const x = Math.min(x1, x2);
  const y = Math.min(y1, y2);
  const width = Math.abs(x2 - x1);
  const height = Math.abs(y2 - y1);

  // Generic plane rendering: all planes are rendered as rectangles
  // Visual distinction via styling (fill color, opacity), not shape
  const fill = plane.id === 'plane_H' ? '#F0F4F8' : '#FFF8E1';
  const stroke = '#CCCCCC';
  const strokeWidth = 1;
  const opacity = 0.3;

  return {
    x,
    y,
    width,
    height,
    fill,
    stroke,
    'stroke-width': strokeWidth,
    opacity,
    'data-element-id': plane.id || 'unknown',
    'data-element-type': 'plane',
  };
}

/**
 * Render a line as an SVG line element
 * Uses generic line rendering algorithm
 * 
 * Lines are rendered from start point to end point.
 * Works for ANY line (including hinge lines, guides, user-created lines) - no special cases.
 * 
 * @param startPoint - Line start point
 * @param endPoint - Line end point
 * @param lineId - Line identifier
 * @param style - Optional line styling (color, width, dash pattern)
 * @param canvasOriginX - Canvas origin X coordinate (default 400)
 * @param canvasOriginY - Canvas origin Y coordinate (default 400)
 * @returns SVG line attributes
 */
export function renderLine(
  startPoint: { u: number; v: number; planeId?: string },
  endPoint: { u: number; v: number; planeId?: string },
  lineId: string,
  style?: {
    color?: string;
    width?: number;
    dashArray?: string;
  },
  canvasOriginX: number = 400,
  canvasOriginY: number = 400
): SVGElementAttributes {
  // Transform start and end points to canvas coordinates
  const [x1, y1] = planeToCanvas(
    startPoint.u,
    startPoint.v,
    startPoint.planeId || 'plane_H',
    canvasOriginX,
    canvasOriginY
  );
  const [x2, y2] = planeToCanvas(
    endPoint.u,
    endPoint.v,
    endPoint.planeId || 'plane_H',
    canvasOriginX,
    canvasOriginY
  );

  // Generic line rendering: all lines are rendered as SVG line elements
  // Visual distinction via styling (color, width, dash), not different elements
  const stroke = style?.color || '#333333';
  const strokeWidth = style?.width || 2;
  const strokeDasharray = style?.dashArray || 'none';

  return {
    x1,
    y1,
    x2,
    y2,
    stroke,
    'stroke-width': strokeWidth,
    'stroke-dasharray': strokeDasharray,
    'data-element-id': lineId,
    'data-element-type': 'line',
  };
}

/**
 * Apply hover state to element attributes
 * Generic hover styling that works for any element type
 * 
 * @param baseAttributes - Base SVG element attributes
 * @returns Attributes with hover state applied
 */
export function applyHoverState(baseAttributes: SVGElementAttributes): SVGElementAttributes {
  return {
    ...baseAttributes,
    stroke: '#FFD700', // Gold color for hover
    'stroke-width': (baseAttributes['stroke-width'] as number) + 1,
  };
}

/**
 * Apply selection state to element attributes
 * Generic selection styling that works for any element type
 * 
 * @param baseAttributes - Base SVG element attributes
 * @returns Attributes with selection state applied
 */
export function applySelectionState(baseAttributes: SVGElementAttributes): SVGElementAttributes {
  return {
    ...baseAttributes,
    stroke: '#FF6B35', // Orange color for selection
    'stroke-width': (baseAttributes['stroke-width'] as number) + 1.5,
  };
}
