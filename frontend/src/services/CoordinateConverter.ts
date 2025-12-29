/**
 * CoordinateConverter - Utilities for converting between coordinate systems
 * 
 * Coordinate systems in the application:
 * 1. Screen coordinates: Pixel coordinates in the browser (e.g., mouse events)
 * 2. Canvas coordinates: Screen coords after accounting for canvas position/offset
 * 3. Paper coordinates: Unified 2D space where all planes are laid out
 * 4. Plane coordinates: Intrinsic <u,v> coordinates in each projection plane's local basis
 * 
 * Transformations:
 * - Forward (rendering): Plane <u,v> → Paper → Canvas → Screen
 * - Inverse (input): Screen → Canvas → Paper → Plane <u,v>
 * 
 * @see specs/001-dihedral-learning-mvp/data-model.md#coordinate-transformations
 */

import type { ViewportTransform } from './SVGRenderer';
import type { PlaneTransform } from './PaperService';
import { paperToPlane } from './PaperService';

/**
 * Convert screen coordinates to plane coordinates
 * Complete inverse pipeline for mouse input processing
 * 
 * Pipeline:
 * Screen coords → Canvas coords → Paper coords → Plane <u,v> coords
 * 
 * @param screenX - X coordinate in screen space (pixels)
 * @param screenY - Y coordinate in screen space (pixels)
 * @param canvasOffset - Canvas element offset from viewport (getBoundingClientRect)
 * @param viewport - Current viewport transform (pan/zoom)
 * @param planeTransform - Plane-to-paper transformation matrix
 * @returns [u, v] coordinates in the plane's intrinsic space
 */
export function screenToPlane(
  screenX: number,
  screenY: number,
  canvasOffset: { left: number; top: number },
  viewport: ViewportTransform,
  planeTransform: PlaneTransform
): [number, number] {
  // Step 1: Screen → Canvas (remove canvas offset)
  const canvasX = screenX - canvasOffset.left;
  const canvasY = screenY - canvasOffset.top;

  // Step 2: Canvas → Paper (inverse viewport transform: un-zoom then un-pan)
  const paperX = canvasX / viewport.zoom - viewport.panX;
  const paperY = canvasY / viewport.zoom - viewport.panY;

  // Step 3: Paper → Plane (inverse plane transform)
  const [u, v] = paperToPlane(paperX, paperY, planeTransform);

  return [u, v];
}

/**
 * Convert plane coordinates to screen coordinates
 * Complete forward pipeline for coordinate display/debugging
 * 
 * Pipeline:
 * Plane <u,v> coords → Paper coords → Canvas coords → Screen coords
 * 
 * @param u - U coordinate in plane's intrinsic space
 * @param v - V coordinate in plane's intrinsic space
 * @param planeTransform - Plane-to-paper transformation matrix
 * @param viewport - Current viewport transform (pan/zoom)
 * @param canvasOffset - Canvas element offset from viewport
 * @returns [x, y] coordinates in screen space (pixels)
 */
export function planeToScreen(
  u: number,
  v: number,
  planeTransform: PlaneTransform,
  viewport: ViewportTransform,
  canvasOffset: { left: number; top: number }
): [number, number] {
  // Step 1: Plane → Paper (plane transform matrix)
  const [m11, m12, m13, m21, m22, m23, m31, m32, m33] = planeTransform.matrix;
  const paperXH = m11 * u + m12 * v + m13;
  const paperYH = m21 * u + m22 * v + m23;
  const paperW = m31 * u + m32 * v + m33;
  const paperX = paperXH / paperW;
  const paperY = paperYH / paperW;

  // Step 2: Paper → Canvas (viewport transform: pan then zoom)
  const canvasX = (paperX + viewport.panX) * viewport.zoom;
  const canvasY = (paperY + viewport.panY) * viewport.zoom;

  // Step 3: Canvas → Screen (add canvas offset)
  const screenX = canvasX + canvasOffset.left;
  const screenY = canvasY + canvasOffset.top;

  return [screenX, screenY];
}

/**
 * Determine which plane a screen coordinate is over
 * Useful for hit testing when multiple planes are visible
 * 
 * @param screenX - X coordinate in screen space
 * @param screenY - Y coordinate in screen space
 * @param canvasOffset - Canvas element offset
 * @param viewport - Current viewport transform
 * @param planeTransforms - Map of all plane transforms
 * @param planeBounds - Bounding boxes for each plane in paper space
 * @returns planeId of the plane under the cursor, or null if none
 */
export function screenToPlaneId(
  screenX: number,
  screenY: number,
  canvasOffset: { left: number; top: number },
  viewport: ViewportTransform,
  planeBounds: Map<string, { minX: number; maxX: number; minY: number; maxY: number }>
): string | null {
  // Convert screen → paper
  const canvasX = screenX - canvasOffset.left;
  const canvasY = screenY - canvasOffset.top;
  const paperX = canvasX / viewport.zoom - viewport.panX;
  const paperY = canvasY / viewport.zoom - viewport.panY;

  // Check which plane bounds contain this paper coordinate
  for (const [planeId, bounds] of planeBounds) {
    if (
      paperX >= bounds.minX &&
      paperX <= bounds.maxX &&
      paperY >= bounds.minY &&
      paperY <= bounds.maxY
    ) {
      return planeId;
    }
  }

  return null;
}

/**
 * Convert a distance in plane space to screen space
 * Useful for determining if a click is "close enough" to an element
 * 
 * @param distanceInPlane - Distance in plane units
 * @param planeTransform - Plane-to-paper transformation matrix
 * @param viewport - Current viewport transform
 * @returns Distance in screen pixels
 */
export function planeDistanceToScreen(
  distanceInPlane: number,
  planeTransform: PlaneTransform,
  viewport: ViewportTransform
): number {
  // Extract scale from plane transform (use first column for X scale)
  const [m11, , , m21] = planeTransform.matrix;
  const planeScale = Math.sqrt(m11 * m11 + m21 * m21);

  // Apply plane scale and viewport zoom
  return distanceInPlane * planeScale * viewport.zoom;
}

/**
 * Convert a distance in screen space to plane space
 * Useful for snap tolerance and selection radius
 * 
 * @param distanceInScreen - Distance in screen pixels
 * @param planeTransform - Plane-to-paper transformation matrix
 * @param viewport - Current viewport transform
 * @returns Distance in plane units
 */
export function screenDistanceToPlane(
  distanceInScreen: number,
  planeTransform: PlaneTransform,
  viewport: ViewportTransform
): number {
  // Extract scale from plane transform
  const [m11, , , m21] = planeTransform.matrix;
  const planeScale = Math.sqrt(m11 * m11 + m21 * m21);

  // Reverse: divide by zoom and plane scale
  return distanceInScreen / (planeScale * viewport.zoom);
}
