/**
 * InputService - Handles user input coordinate conversions
 * 
 * Converts between different coordinate spaces for user interactions:
 * - Screen coordinates (mouse events)
 * - Canvas coordinates (SVG viewBox)
 * - Paper coordinates (after viewport transform)
 * - Plane intrinsic coordinates (u, v in projection plane basis)
 * 
 * This service is separate from PaperService because:
 * - PaperService works at the paper level (like a plotter)
 * - InputService handles the inverse transformations for user input
 */

import { Vector3, Matrix3 } from 'three';

export interface ViewportTransform {
  zoom: number;
  panX: number;
  panY: number;
}

export class InputService {
  /**
   * Convert canvas click coordinates to plane intrinsic coordinates
   * 
   * Pipeline: Canvas → Paper (inverse viewport) → Plane (paper-to-plane transform)
   * 
   * @param canvasX X coordinate in canvas space (SVG viewBox)
   * @param canvasY Y coordinate in canvas space (SVG viewBox)
   * @param paperToPlaneTransform Paper-to-plane transformation matrix (already inverted)
   * @param viewport Viewport transformation (pan/zoom)
   * @returns Plane intrinsic coordinates (u, v, 1) or null if transform fails
   */
  canvasToPlaneCoordinates(
    canvasX: number,
    canvasY: number,
    paperToPlaneTransform: Matrix3,
    viewport: ViewportTransform
  ): Vector3 | null {
    // Step 1: Canvas → Paper (inverse viewport transform)
    // Viewport applies: canvas = (paper + pan) * zoom
    // Inverse: paper = canvas / zoom - pan
    const paperX = canvasX / viewport.zoom - viewport.panX;
    const paperY = canvasY / viewport.zoom - viewport.panY;
    
    // Step 2: Paper → Plane (use pre-computed paper-to-plane transform)
    // Apply matrix multiplication: [u, v, w] = M × [x, y, 1]
    const paperPos = new Vector3(paperX, paperY, 1);
    const planePos = paperPos.clone().applyMatrix3(paperToPlaneTransform);
    
    return planePos;
  }

  /**
   * Convert screen coordinates to canvas coordinates
   * 
   * @param screenX Mouse clientX
   * @param screenY Mouse clientY
   * @param svgRect SVG element bounding rect
   * @param canvasWidth SVG viewBox width
   * @param canvasHeight SVG viewBox height
   * @returns Canvas coordinates in SVG viewBox space
   */
  screenToCanvasCoordinates(
    screenX: number,
    screenY: number,
    svgRect: DOMRect,
    canvasWidth: number,
    canvasHeight: number
  ): { x: number; y: number } {
    const x = ((screenX - svgRect.left) / svgRect.width) * canvasWidth;
    const y = ((screenY - svgRect.top) / svgRect.height) * canvasHeight;
    return { x, y };
  }
}
