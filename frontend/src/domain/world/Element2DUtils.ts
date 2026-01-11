/**
 * Generic utility functions for Element2D
 * 
 * These utilities work with any Element2D regardless of specific type (Point2D, Line2D, Circle2D).
 * They leverage the uniform Element2D interface to provide type-safe generic operations.
 * 
 * Benefits:
 * - Type-safe: All functions use proper type guards
 * - Generic: Work with mixed arrays of points, lines, circles
 * - Consistent: Uniform interface across all 2D element types
 * - Testable: Pure functions, easy to unit test
 * 
 * Usage Examples:
 * ```typescript
 * // Filter elements by plane
 * const planeHElements = getElementsOnPlane(allElements, 'proj_plane_H');
 * 
 * // Hide all elements on a plane
 * getElementsOnPlane(allElements, 'proj_plane_V').forEach(hideElement);
 * 
 * // Check if object is Element2D
 * if (isElement2D(obj)) {
 *   console.log(`Element ${obj.id} on plane ${obj.planeId}`);
 * }
 * 
 * // Get visible elements only
 * const visible = allElements.filter(el => el.visible);
 * ```
 * 
 * @module Element2DUtils
 */

import { Element2D } from './Element2D';

/**
 * Type guard to check if an object is an Element2D
 * 
 * Verifies that the object has all required Element2D properties:
 * - id: string
 * - planeId: string
 * - label: string | undefined
 * - visible: boolean
 * - type: string
 * 
 * @param obj - Object to check
 * @returns True if object is Element2D, false otherwise
 * 
 * @example
 * ```typescript
 * const obj: unknown = getElement();
 * if (isElement2D(obj)) {
 *   // TypeScript now knows obj is Element2D
 *   console.log(obj.id, obj.planeId);
 * }
 * ```
 */
export function isElement2D(obj: any): obj is Element2D {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.planeId === 'string' &&
    (obj.label === undefined || typeof obj.label === 'string') &&
    typeof obj.visible === 'boolean' &&
    typeof obj.type === 'string'
  );
}

/**
 * Filter elements by plane ID
 * 
 * Returns all elements that belong to the specified projection plane.
 * Works with mixed arrays of points, lines, and circles.
 * 
 * @param elements - Array of Element2D objects (points, lines, circles)
 * @param planeId - Plane ID to filter by (e.g., 'proj_plane_H', 'proj_plane_V')
 * @returns Array of elements on the specified plane
 * 
 * @example
 * ```typescript
 * const allElements: Element2D[] = [point1, line1, circle1, point2];
 * const planeH = getElementsOnPlane(allElements, 'proj_plane_H');
 * console.log(`Found ${planeH.length} elements on horizontal plane`);
 * ```
 */
export function getElementsOnPlane(elements: Element2D[], planeId: string): Element2D[] {
  return elements.filter(el => el.planeId === planeId);
}

/**
 * Hide an element by setting its visible property to false
 * 
 * Mutates the element in place. Works with any Element2D type.
 * 
 * @param element - Element2D to hide (point, line, or circle)
 * 
 * @example
 * ```typescript
 * const point = new FreePoint2D('p1', new Vector3(1, 2, 1), 'proj_plane_H');
 * hideElement(point);
 * console.log(point.visible); // false
 * ```
 */
export function hideElement(element: Element2D): void {
  element.visible = false;
}

/**
 * Show an element by setting its visible property to true
 * 
 * Mutates the element in place. Works with any Element2D type.
 * 
 * @param element - Element2D to show (point, line, or circle)
 * 
 * @example
 * ```typescript
 * const line = new Line2DByTwoPoints('l1', 'p1', 'p2', 'proj_plane_V');
 * line.visible = false;
 * showElement(line);
 * console.log(line.visible); // true
 * ```
 */
export function showElement(element: Element2D): void {
  element.visible = true;
}

/**
 * Get label for an element, with fallback to ID if no label set
 * 
 * Returns the element's label if defined, otherwise returns the ID.
 * Useful for displaying element names in UI.
 * 
 * @param element - Element2D to get label for
 * @returns Label string (either label or id as fallback)
 * 
 * @example
 * ```typescript
 * const labeled = new FreePoint2D('p1', pos, 'proj_plane_H', 'Point A');
 * console.log(getElementLabel(labeled)); // "Point A"
 * 
 * const unlabeled = new FreePoint2D('p2', pos, 'proj_plane_H');
 * console.log(getElementLabel(unlabeled)); // "p2"
 * ```
 */
export function getElementLabel(element: Element2D): string {
  return element.label || element.id;
}

/**
 * Filter elements by visibility
 * 
 * Returns only visible elements (visible=true).
 * 
 * @param elements - Array of Element2D objects
 * @returns Array of visible elements
 * 
 * @example
 * ```typescript
 * const allElements: Element2D[] = [point1, line1, circle1];
 * line1.visible = false;
 * const visible = getVisibleElements(allElements);
 * // Returns [point1, circle1]
 * ```
 */
export function getVisibleElements(elements: Element2D[]): Element2D[] {
  return elements.filter(el => el.visible);
}

/**
 * Filter elements by type
 * 
 * Returns all elements matching the specified type string.
 * Type strings include: 'free', 'line-line-intersection', 'by-two-points', 'by-center-and-point', etc.
 * 
 * @param elements - Array of Element2D objects
 * @param type - Type string to filter by
 * @returns Array of elements with matching type
 * 
 * @example
 * ```typescript
 * const allElements: Element2D[] = [freePoint, intersectionPoint, line, circle];
 * const freePoints = getElementsByType(allElements, 'free');
 * const lines = getElementsByType(allElements, 'by-two-points');
 * ```
 */
export function getElementsByType(elements: Element2D[], type: string): Element2D[] {
  return elements.filter(el => el.type === type);
}

/**
 * Count elements by plane
 * 
 * Returns a map of plane IDs to element counts.
 * Useful for statistics and UI display.
 * 
 * @param elements - Array of Element2D objects
 * @returns Map of planeId -> count
 * 
 * @example
 * ```typescript
 * const counts = countElementsByPlane(allElements);
 * console.log(`Plane H: ${counts.get('proj_plane_H')} elements`);
 * console.log(`Plane V: ${counts.get('proj_plane_V')} elements`);
 * ```
 */
export function countElementsByPlane(elements: Element2D[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const element of elements) {
    counts.set(element.planeId, (counts.get(element.planeId) || 0) + 1);
  }
  return counts;
}
