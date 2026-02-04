/**
 * Integration tests for Element2D utility functions
 * 
 * These tests verify that the generic utility functions work correctly
 * with mixed arrays of different Element2D types (points, lines, circles).
 * 
 * Tests demonstrate:
 * - Utilities work uniformly across all Element2D types
 * - Type guards correctly identify Element2D instances
 * - Filtering and manipulation functions handle mixed arrays
 * - Edge cases (empty arrays, null values, etc.) are handled correctly
 */

import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import {
  isElement2D,
  getElementsOnPlane,
  hideElement,
  showElement,
  getElementLabel,
  getVisibleElements,
  countElementsByPlane,
  Element2D
} from '../../../src/domain/world/index';
import { FreePoint2D } from '../../../src/domain/world/Point';
import { Line2DByTwoPoints } from '../../../src/domain/world/Line';
import { Circle2DByCenterAndPoint } from '../../../src/domain/world/Circle';

describe('Element2DUtils Integration Tests', () => {
  describe('isElement2D type guard', () => {
    it('should return true for Point2D instances', () => {
      const point = new FreePoint2D('projPlaneH/p1', new Vector3(1, 2, 1), 'projPlaneH');
      expect(isElement2D(point)).toBe(true);
    });

    it('should return true for Line2D instances', () => {
      const line = new Line2DByTwoPoints('projPlaneV/l1', 'projPlaneV/p1', 'projPlaneV/p2', 'projPlaneV');
      expect(isElement2D(line)).toBe(true);
    });

    it('should return true for Circle2D instances', () => {
      const circle = new Circle2DByCenterAndPoint('projPlaneH/c1', 'projPlaneH/center', 'projPlaneH/edge', 'projPlaneH');
      expect(isElement2D(circle)).toBe(true);
    });

    it('should return false for non-Element2D objects', () => {
      expect(isElement2D(null)).toBe(false);
      expect(isElement2D(undefined)).toBe(false);
      expect(isElement2D({})).toBe(false);
      expect(isElement2D({ id: 'test' })).toBe(false);
      expect(isElement2D({ id: 'test', planeId: 'plane' })).toBe(false); // Missing other properties
      expect(isElement2D(42)).toBe(false);
      expect(isElement2D('string')).toBe(false);
    });
  });

  describe('getElementsOnPlane with mixed element types', () => {
    it('should filter mixed array by plane ID', () => {
      const elements: Element2D[] = [
        new FreePoint2D('projPlaneH/p1', new Vector3(1, 2, 1), 'projPlaneH'),
        new FreePoint2D('projPlaneV/p2', new Vector3(3, 4, 1), 'projPlaneV'),
        new Line2DByTwoPoints('projPlaneH/l1', 'projPlaneH/p1', 'projPlaneH/p3', 'projPlaneH'),
        new Line2DByTwoPoints('projPlaneV/l2', 'projPlaneV/p2', 'projPlaneV/p4', 'projPlaneV'),
        new Circle2DByCenterAndPoint('projPlaneH/c1', 'projPlaneH/p5', 'projPlaneH/p6', 'projPlaneH'),
        new Circle2DByCenterAndPoint('projPlaneV/c2', 'projPlaneV/p7', 'projPlaneV/p8', 'projPlaneV'),
      ];

      const planeH = getElementsOnPlane(elements, 'projPlaneH');
      const planeV = getElementsOnPlane(elements, 'projPlaneV');

      expect(planeH).toHaveLength(3);
      expect(planeV).toHaveLength(3);

      // Verify each plane contains correct mix (using instanceof)
      expect(planeH.some((el: Element2D) => el instanceof FreePoint2D)).toBe(true);
      expect(planeH.some((el: Element2D) => el instanceof Line2DByTwoPoints)).toBe(true);
      expect(planeH.some((el: Element2D) => el instanceof Circle2DByCenterAndPoint)).toBe(true);
    });

    it('should return empty array for non-existent plane', () => {
      const elements: Element2D[] = [
        new FreePoint2D('projPlaneH/p1', new Vector3(1, 2, 1), 'projPlaneH'),
      ];

      const result = getElementsOnPlane(elements, 'nonexistent_plane');
      expect(result).toHaveLength(0);
    });

    it('should handle empty input array', () => {
      const result = getElementsOnPlane([], 'projPlaneH');
      expect(result).toHaveLength(0);
    });
  });

  describe('hideElement and showElement with mixed types', () => {
    it('should hide all element types uniformly', () => {
      const elements: Element2D[] = [
        new FreePoint2D('projPlaneH/p1', new Vector3(1, 2, 1), 'projPlaneH'),
        new Line2DByTwoPoints('projPlaneH/l1', 'projPlaneH/p1', 'projPlaneH/p2', 'projPlaneH'),
        new Circle2DByCenterAndPoint('projPlaneH/c1', 'projPlaneH/center', 'projPlaneH/edge', 'projPlaneH'),
      ];

      // All visible initially (visualStyle not set, defaults to visible)
      elements.forEach(el => expect(el.visualStyle?.visible !== false).toBe(true));

      // Hide all
      elements.forEach(hideElement);

      // All hidden now
      elements.forEach(el => expect(el.visualStyle?.visible).toBe(false));
    });

    it('should show all element types uniformly', () => {
      const elements: Element2D[] = [
        new FreePoint2D('projPlaneH/p1', new Vector3(1, 2, 1), 'projPlaneH'),
        new Line2DByTwoPoints('projPlaneH/l1', 'projPlaneH/p1', 'projPlaneH/p2', 'projPlaneH'),
        new Circle2DByCenterAndPoint('projPlaneH/c1', 'projPlaneH/center', 'projPlaneH/edge', 'projPlaneH'),
      ];

      // Hide all first
      elements.forEach(hideElement);
      elements.forEach(el => expect(el.visualStyle?.visible).toBe(false));

      // Show all
      elements.forEach(showElement);

      // All visible now
      elements.forEach(el => expect(el.visualStyle?.visible).toBe(true));
    });

    it('should allow selective visibility changes', () => {
      const point = new FreePoint2D('projPlaneH/p1', new Vector3(1, 2, 1), 'projPlaneH');
      const line = new Line2DByTwoPoints('projPlaneH/l1', 'projPlaneH/p1', 'projPlaneH/p2', 'projPlaneH');
      const circle = new Circle2DByCenterAndPoint('projPlaneH/c1', 'projPlaneH/center', 'projPlaneH/edge', 'projPlaneH');

      hideElement(line);

      expect(point.visualStyle?.visible !== false).toBe(true);
      expect(line.visualStyle?.visible).toBe(false);
      expect(circle.visualStyle?.visible !== false).toBe(true);
    });
  });

  describe('getElementLabel', () => {
    it('should return label when set', () => {
      const point = new FreePoint2D('projPlaneH/p1', new Vector3(1, 2, 1), 'projPlaneH', 'Point A');
      expect(getElementLabel(point)).toBe('Point A');
    });

    it('should return id when label not set', () => {
      const point = new FreePoint2D('projPlaneH/p1', new Vector3(1, 2, 1), 'projPlaneH');
      expect(getElementLabel(point)).toBe('projPlaneH/p1');
    });

    it('should work with all element types', () => {
      const point = new FreePoint2D('projPlaneH/p1', new Vector3(1, 2, 1), 'projPlaneH', 'A');
      const line = new Line2DByTwoPoints('projPlaneH/l1', 'projPlaneH/p1', 'projPlaneH/p2', 'projPlaneH', 'Line AB');
      const circle = new Circle2DByCenterAndPoint('projPlaneH/c1', 'projPlaneH/center', 'projPlaneH/edge', 'projPlaneH');

      expect(getElementLabel(point)).toBe('A');
      expect(getElementLabel(line)).toBe('Line AB');
      expect(getElementLabel(circle)).toBe('projPlaneH/c1'); // No label, uses id
    });
  });

  describe('getVisibleElements', () => {
    it('should filter visible elements from mixed array', () => {
      const elements: Element2D[] = [
        new FreePoint2D('projPlaneH/p1', new Vector3(1, 2, 1), 'projPlaneH'),
        new Line2DByTwoPoints('projPlaneH/l1', 'projPlaneH/p1', 'projPlaneH/p2', 'projPlaneH'),
        new Circle2DByCenterAndPoint('projPlaneH/c1', 'projPlaneH/center', 'projPlaneH/edge', 'projPlaneH'),
      ];

      hideElement(elements[1]); // Hide the line

      const visible = getVisibleElements(elements);
      expect(visible).toHaveLength(2);
      expect(visible[0].id).toBe('projPlaneH/p1');
      expect(visible[1].id).toBe('projPlaneH/c1');
    });

    it('should return empty array when all hidden', () => {
      const elements: Element2D[] = [
        new FreePoint2D('projPlaneH/p1', new Vector3(1, 2, 1), 'projPlaneH'),
        new Line2DByTwoPoints('projPlaneH/l1', 'projPlaneH/p1', 'projPlaneH/p2', 'projPlaneH'),
      ];

      elements.forEach(hideElement);

      const visible = getVisibleElements(elements);
      expect(visible).toHaveLength(0);
    });

    it('should return all elements when all visible', () => {
      const elements: Element2D[] = [
        new FreePoint2D('projPlaneH/p1', new Vector3(1, 2, 1), 'projPlaneH'),
        new Line2DByTwoPoints('projPlaneH/l1', 'projPlaneH/p1', 'projPlaneH/p2', 'projPlaneH'),
        new Circle2DByCenterAndPoint('projPlaneH/c1', 'projPlaneH/center', 'projPlaneH/edge', 'projPlaneH'),
      ];

      const visible = getVisibleElements(elements);
      expect(visible).toHaveLength(3);
    });
  });

  describe('countElementsByPlane', () => {
    it('should count mixed element types per plane', () => {
      const elements: Element2D[] = [
        new FreePoint2D('projPlaneH/p1', new Vector3(1, 2, 1), 'projPlaneH'),
        new FreePoint2D('projPlaneH/p2', new Vector3(3, 4, 1), 'projPlaneH'),
        new Line2DByTwoPoints('projPlaneV/l1', 'projPlaneV/p1', 'projPlaneV/p2', 'projPlaneV'),
        new Circle2DByCenterAndPoint('projPlaneH/c1', 'projPlaneH/center', 'projPlaneH/edge', 'projPlaneH'),
        new Circle2DByCenterAndPoint('projPlaneV/c2', 'projPlaneV/center2', 'projPlaneV/edge2', 'projPlaneV'),
      ];

      const counts = countElementsByPlane(elements);

      expect(counts.get('projPlaneH')).toBe(3); // 2 points + 1 circle
      expect(counts.get('projPlaneV')).toBe(2); // 1 line + 1 circle
    });

    it('should handle empty array', () => {
      const counts = countElementsByPlane([]);
      expect(counts.size).toBe(0);
    });

    it('should handle single plane', () => {
      const elements: Element2D[] = [
        new FreePoint2D('projPlaneH/p1', new Vector3(1, 2, 1), 'projPlaneH'),
        new Line2DByTwoPoints('projPlaneH/l1', 'projPlaneH/p1', 'projPlaneH/p2', 'projPlaneH'),
      ];

      const counts = countElementsByPlane(elements);

      expect(counts.size).toBe(1);
      expect(counts.get('projPlaneH')).toBe(2);
    });
  });

  describe('Complex integration scenarios', () => {
    it('should support chaining utility functions', () => {
      const elements: Element2D[] = [
        new FreePoint2D('projPlaneH/p1', new Vector3(1, 2, 1), 'projPlaneH', 'A'),
        new FreePoint2D('projPlaneV/p2', new Vector3(3, 4, 1), 'projPlaneV', 'B'),
        new Line2DByTwoPoints('projPlaneH/l1', 'projPlaneH/p1', 'projPlaneH/p3', 'projPlaneH'),
        new Line2DByTwoPoints('projPlaneV/l2', 'projPlaneV/p2', 'projPlaneV/p4', 'projPlaneV'),
        new Circle2DByCenterAndPoint('projPlaneH/c1', 'projPlaneH/p5', 'projPlaneH/p6', 'projPlaneH'),
      ];

      // Hide all lines (using instanceof filter)
      elements.filter(el => el instanceof Line2DByTwoPoints).forEach(hideElement);

      // Get visible elements on plane H
      const visiblePlaneH = getVisibleElements(getElementsOnPlane(elements, 'projPlaneH'));

      expect(visiblePlaneH).toHaveLength(2); // Point A and Circle c1
      expect(visiblePlaneH.some((el: Element2D) => el instanceof FreePoint2D)).toBe(true);
      expect(visiblePlaneH.some((el: Element2D) => el instanceof Circle2DByCenterAndPoint)).toBe(true);
      expect(visiblePlaneH.some((el: Element2D) => el instanceof Line2DByTwoPoints)).toBe(false); // Lines hidden
    });

    it('should handle operations on filtered subsets', () => {
      const elements: Element2D[] = [
        new FreePoint2D('projPlaneH/p1', new Vector3(1, 2, 1), 'projPlaneH'),
        new FreePoint2D('projPlaneV/p2', new Vector3(3, 4, 1), 'projPlaneV'),
        new Line2DByTwoPoints('projPlaneH/l1', 'projPlaneH/p1', 'projPlaneH/p3', 'projPlaneH'),
        new Circle2DByCenterAndPoint('projPlaneV/c1', 'projPlaneV/center', 'projPlaneV/edge', 'projPlaneV'),
      ];

      // Hide all elements on plane V
      getElementsOnPlane(elements, 'projPlaneV').forEach(hideElement);

      // Count visible per plane
      const visibleCounts = countElementsByPlane(getVisibleElements(elements));

      expect(visibleCounts.get('projPlaneH')).toBe(2); // p1 and l1 visible
      expect(visibleCounts.get('projPlaneV')).toBeUndefined(); // All hidden
    });

    it('should work with instanceof checks after filtering', () => {
      const elements: Element2D[] = [
        new FreePoint2D('projPlaneH/p1', new Vector3(1, 2, 1), 'projPlaneH'),
        new Line2DByTwoPoints('projPlaneH/l1', 'projPlaneH/p1', 'projPlaneH/p2', 'projPlaneH'),
        new Circle2DByCenterAndPoint('projPlaneH/c1', 'projPlaneH/center', 'projPlaneH/edge', 'projPlaneH'),
      ];

      const planeH = getElementsOnPlane(elements, 'projPlaneH');

      // All filtered elements should pass isElement2D
      planeH.forEach((el: Element2D) => expect(isElement2D(el)).toBe(true));

      // All should be instances of Element2D (one of the three types)
      expect(planeH[0]).toBeInstanceOf(FreePoint2D);
      expect(planeH[1]).toBeInstanceOf(Line2DByTwoPoints);
      expect(planeH[2]).toBeInstanceOf(Circle2DByCenterAndPoint);
    });
  });
});
