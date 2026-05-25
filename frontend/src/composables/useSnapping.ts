import type { Ref } from 'vue';
import { useWorldStore } from '@/stores/worldStore';
import { useViewStore } from '@/stores/viewStore';
import type { Point2D } from '@/types/ElementTypes';

/**
 * Composable for point snapping functionality
 * Finds nearby points and elements within a snap radius
 */
export function useSnapping(snapRadius: Ref<number> = { value: 10 } as Ref<number>) {
  const worldStore = useWorldStore();
  const viewStore = useViewStore();

  /**
   * Find nearest point to given coordinates within snap radius
   */
  const findNearestPoint = (x: number, y: number): Point2D | null => {
    const activePlaneId = viewStore.activePlaneId;
    if (!activePlaneId) return null;

    const points = worldStore.allElements2D.filter(
      (el): el is Point2D => el.kind.startsWith('Point2D') && el.planeId === activePlaneId
    );

    let nearest: Point2D | null = null;
    let minDistance = snapRadius.value;

    for (const point of points) {
      const px = getPointX(point);
      const py = getPointY(point);
      const distance = Math.sqrt((x - px) ** 2 + (y - py) ** 2);

      if (distance < minDistance) {
        minDistance = distance;
        nearest = point;
      }
    }

    return nearest;
  };

  /**
   * Find all points within snap radius
   */
  const findPointsNear = (x: number, y: number): Point2D[] => {
    const activePlaneId = viewStore.activePlaneId;
    if (!activePlaneId) return [];

    const points = worldStore.allElements2D.filter(
      (el): el is Point2D => el.kind.startsWith('Point2D') && el.planeId === activePlaneId
    );

    return points.filter(point => {
      const px = getPointX(point);
      const py = getPointY(point);
      const distance = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
      return distance <= snapRadius.value;
    });
  };

  /**
   * Check if coordinates are near a point
   */
  const isNearPoint = (x: number, y: number): boolean => {
    return findNearestPoint(x, y) !== null;
  };

  /**
   * Snap coordinates to nearest point if within radius
   */
  const snapToPoint = (x: number, y: number): { x: number; y: number; snapped: boolean } => {
    const nearest = findNearestPoint(x, y);
    if (nearest) {
      return {
        x: getPointX(nearest),
        y: getPointY(nearest),
        snapped: true
      };
    }
    return { x, y, snapped: false };
  };

  return {
    findNearestPoint,
    findPointsNear,
    isNearPoint,
    snapToPoint
  };
}

/**
 * Helper to get X coordinate from Point2D union type
 */
function getPointX(point: Point2D): number {
  if (point.kind === 'Point2DFree' || point.kind === 'Point2DDerived') {
    return (point as any).x;
  }
  // For Point2DOnElement and Point2DFromIntersection, would need to compute
  // For now return 0 as placeholder
  return 0;
}

/**
 * Helper to get Y coordinate from Point2D union type
 */
function getPointY(point: Point2D): number {
  if (point.kind === 'Point2DFree' || point.kind === 'Point2DDerived') {
    return (point as any).y;
  }
  // For Point2DOnElement and Point2DFromIntersection, would need to compute
  // For now return 0 as placeholder
  return 0;
}
