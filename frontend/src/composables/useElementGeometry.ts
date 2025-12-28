/**
 * useElementGeometry - Composable for geometric calculations on 2D elements
 * 
 * Provides functions for:
 * - Finding elements near a point
 * - Calculating closest point on an element
 * - Finding intersections between elements
 */

import { computed } from 'vue';
import { useWorldStore } from '@/stores/worldStore';
import { useViewStore } from '@/stores/viewStore';
import type { Element2D, Point2D, Segment2D, Line2D, Circle2D } from '@/types/ElementTypes';

/**
 * Get coordinates of a Point2D element
 */
function getPointCoordinates(point: Point2D): { x: number; y: number } | null {
  if (point.kind === 'Point2DFree' || point.kind === 'Point2DDerived') {
    return { x: point.x, y: point.y };
  }
  // For Point2DFromIntersection and Point2DFromIntersection, coordinates need to be computed
  // This is a placeholder - will be computed during recomputation
  return { x: 0, y: 0 };
}

/**
 * Calculate distance from a point to a segment
 */
function distanceToSegment(x: number, y: number, segment: Segment2D, worldStore: any): number {
  if (segment.kind !== 'Segment2DByPoints') return Infinity;
  
  const point1 = worldStore.elements2D.get(segment.point1Id) as Point2D;
  const point2 = worldStore.elements2D.get(segment.point2Id) as Point2D;
  
  if (!point1 || !point2) return Infinity;
  
  const p1 = getPointCoordinates(point1);
  const p2 = getPointCoordinates(point2);
  
  if (!p1 || !p2) return Infinity;
  
  // Vector from p1 to p2
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const lengthSquared = dx * dx + dy * dy;
  
  if (lengthSquared === 0) {
    // Degenerate segment (both points are the same)
    return Math.sqrt((x - p1.x) ** 2 + (y - p1.y) ** 2);
  }
  
  // Calculate parameter t (projection onto line)
  let t = ((x - p1.x) * dx + (y - p1.y) * dy) / lengthSquared;
  
  // Clamp t to [0, 1] for segment
  t = Math.max(0, Math.min(1, t));
  
  // Calculate closest point on segment
  const closestX = p1.x + t * dx;
  const closestY = p1.y + t * dy;
  
  // Return distance
  return Math.sqrt((x - closestX) ** 2 + (y - closestY) ** 2);
}

/**
 * Calculate distance from a point to a line
 */
function distanceToLine(_x: number, _y: number, _line: Line2D, _worldStore: any): number {
  // TODO: Implement line distance calculation
  // For now, return Infinity (not implemented)
  return Infinity;
}

/**
 * Calculate distance from a point to a circle
 */
function distanceToCircle(_x: number, _y: number, _circle: Circle2D, _worldStore: any): number {
  // TODO: Implement circle distance calculation
  // For now, return Infinity (not implemented)
  return Infinity;
}

export function useElementGeometry() {
  const worldStore = useWorldStore();
  const viewStore = useViewStore();
  
  /**
   * Get elements on the active plane
   */
  const elementsOnActivePlane = computed(() => {
    const activePlaneId = viewStore.activePlaneId;
    if (!activePlaneId) return [];
    return worldStore.allElements2D.filter((el: Element2D) => el.planeId === activePlaneId);
  });
  
  /**
   * Find the nearest element to a point within a given radius
   */
  const findNearestElement = (x: number, y: number, maxDistance: number = 15): Element2D | null => {
    let nearestElement: Element2D | null = null;
    let minDistance = maxDistance;
    
    for (const element of elementsOnActivePlane.value) {
      let distance = Infinity;
      
      // Skip points (we're looking for lines, segments, circles)
      if (element.kind.startsWith('Point2D')) continue;
      
      if (element.kind === 'Segment2DByPoints') {
        distance = distanceToSegment(x, y, element as Segment2D, worldStore);
      } else if (element.kind.startsWith('Line2D')) {
        distance = distanceToLine(x, y, element as Line2D, worldStore);
      } else if (element.kind.startsWith('Circle2D')) {
        distance = distanceToCircle(x, y, element as Circle2D, worldStore);
      }
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestElement = element;
      }
    }
    
    return nearestElement;
  };
  
  /**
   * Calculate closest point on an element
   * Returns { x, y, parameter } where parameter is the position along the element
   */
  const closestPointOnElement = (
    x: number, 
    y: number, 
    element: Element2D
  ): { x: number; y: number; parameter: number } | null => {
    if (element.kind === 'Segment2DByPoints') {
      const segment = element as Segment2D;
      const point1 = worldStore.elements2D.get(segment.point1Id) as Point2D;
      const point2 = worldStore.elements2D.get(segment.point2Id) as Point2D;
      
      if (!point1 || !point2) return null;
      
      const p1 = getPointCoordinates(point1);
      const p2 = getPointCoordinates(point2);
      
      if (!p1 || !p2) return null;
      
      // Vector from p1 to p2
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const lengthSquared = dx * dx + dy * dy;
      
      if (lengthSquared === 0) return { x: p1.x, y: p1.y, parameter: 0 };
      
      // Calculate parameter t (projection onto line)
      let t = ((x - p1.x) * dx + (y - p1.y) * dy) / lengthSquared;
      
      // Clamp t to [0, 1] for segment
      t = Math.max(0, Math.min(1, t));
      
      // Calculate closest point
      const closestX = p1.x + t * dx;
      const closestY = p1.y + t * dy;
      
      return { x: closestX, y: closestY, parameter: t };
    }
    
    // TODO: Implement for lines and circles
    return null;
  };
  
  /**
   * Find elements that intersect at or near a point
   */
  const findIntersectingElements = (
    x: number, 
    y: number, 
    maxDistance: number = 15
  ): Array<{ element1: Element2D; element2: Element2D }> => {
    const intersections: Array<{ element1: Element2D; element2: Element2D }> = [];
    
    // Find all elements near the point
    const nearbyElements = elementsOnActivePlane.value.filter((el: Element2D) => {
      if (el.kind.startsWith('Point2D')) return false;
      
      let distance = Infinity;
      if (el.kind === 'Segment2DByPoints') {
        distance = distanceToSegment(x, y, el as Segment2D, worldStore);
      } else if (el.kind.startsWith('Line2D')) {
        distance = distanceToLine(x, y, el as Line2D, worldStore);
      } else if (el.kind.startsWith('Circle2D')) {
        distance = distanceToCircle(x, y, el as Circle2D, worldStore);
      }
      
      return distance < maxDistance;
    });
    
    // Find pairs of elements that intersect
    for (let i = 0; i < nearbyElements.length; i++) {
      for (let j = i + 1; j < nearbyElements.length; j++) {
        // TODO: Calculate actual intersection and check if it's near (x, y)
        // For now, just return all pairs
        intersections.push({
          element1: nearbyElements[i],
          element2: nearbyElements[j]
        });
      }
    }
    
    return intersections;
  };
  
  return {
    findNearestElement,
    closestPointOnElement,
    findIntersectingElements,
    elementsOnActivePlane
  };
}
