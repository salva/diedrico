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
      const point = new FreePoint2D('proj_plane_H/p1', new Vector3(1, 2, 1), 'proj_plane_H');
      expect(isElement2D(point)).toBe(true);
    });

    it('should return true for Line2D instances', () => {
      const line = new Line2DByTwoPoints('proj_plane_V/l1', 'proj_plane_V/p1', 'proj_plane_V/p2', 'proj_plane_V');
      expect(isElement2D(line)).toBe(true);
    });

    it('should return true for Circle2D instances', () => {
      const circle = new Circle2DByCenterAndPoint('proj_plane_H/c1', 'proj_plane_H/center', 'proj_plane_H/edge', 'proj_plane_H');
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
        new FreePoint2D('proj_plane_H/p1', new Vector3(1, 2, 1), 'proj_plane_H'),
        new FreePoint2D('proj_plane_V/p2', new Vector3(3, 4, 1), 'proj_plane_V'),
        new Line2DByTwoPoints('proj_plane_H/l1', 'proj_plane_H/p1', 'proj_plane_H/p3', 'proj_plane_H'),
        new Line2DByTwoPoints('proj_plane_V/l2', 'proj_plane_V/p2', 'proj_plane_V/p4', 'proj_plane_V'),
        new Circle2DByCenterAndPoint('proj_plane_H/c1', 'proj_plane_H/p5', 'proj_plane_H/p6', 'proj_plane_H'),
        new Circle2DByCenterAndPoint('proj_plane_V/c2', 'proj_plane_V/p7', 'proj_plane_V/p8', 'proj_plane_V'),
      ];

      const planeH = getElementsOnPlane(elements, 'proj_plane_H');
      const planeV = getElementsOnPlane(elements, 'proj_plane_V');

      expect(planeH).toHaveLength(3);
      expect(planeV).toHaveLength(3);

      // Verify each plane contains correct mix (using instanceof)
      expect(planeH.some((el: Element2D) => el instanceof FreePoint2D)).toBe(true);
      expect(planeH.some((el: Element2D) => el instanceof Line2DByTwoPoints)).toBe(true);
      expect(planeH.some((el: Element2D) => el instanceof Circle2DByCenterAndPoint)).toBe(true);
    });

    it('should return empty array for non-existent plane', () => {
      const elements: Element2D[] = [
        new FreePoint2D('proj_plane_H/p1', new Vector3(1, 2, 1), 'proj_plane_H'),
      ];

      const result = getElementsOnPlane(elements, 'nonexistent_plane');
      expect(result).toHaveLength(0);
    });

    it('should handle empty input array', () => {
      const result = getElementsOnPlane([], 'proj_plane_H');
      expect(result).toHaveLength(0);
    });
  });

  describe('hideElement and showElement with mixed types', () => {
    it('should hide all element types uniformly', () => {
      const elements: Element2D[] = [
        new FreePoint2D('proj_plane_H/p1', new Vector3(1, 2, 1), 'proj_plane_H'),
        new Line2DByTwoPoints('proj_plane_H/l1', 'proj_plane_H/p1', 'proj_plane_H/p2', 'proj_plane_H'),
        new Circle2DByCenterAndPoint('proj_plane_H/c1', 'proj_plane_H/center', 'proj_plane_H/edge', 'proj_plane_H'),
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
        new FreePoint2D('proj_plane_H/p1', new Vector3(1, 2, 1), 'proj_plane_H'),
        new Line2DByTwoPoints('proj_plane_H/l1', 'proj_plane_H/p1', 'proj_plane_H/p2', 'proj_plane_H'),
        new Circle2DByCenterAndPoint('proj_plane_H/c1', 'proj_plane_H/center', 'proj_plane_H/edge', 'proj_plane_H'),
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
      const point = new FreePoint2D('proj_plane_H/p1', new Vector3(1, 2, 1), 'proj_plane_H');
      const line = new Line2DByTwoPoints('proj_plane_H/l1', 'proj_plane_H/p1', 'proj_plane_H/p2', 'proj_plane_H');
      const circle = new Circle2DByCenterAndPoint('proj_plane_H/c1', 'proj_plane_H/center', 'proj_plane_H/edge', 'proj_plane_H');

      hideElement(line);

      expect(point.visualStyle?.visible !== false).toBe(true);
      expect(line.visualStyle?.visible).toBe(false);
      expect(circle.visualStyle?.visible !== false).toBe(true);
    });
  });

  describe('getElementLabel', () => {
    it('should return label when set', () => {
      const point = new FreePoint2D('proj_plane_H/p1', new Vector3(1, 2, 1), 'proj_plane_H', 'Point A');
      expect(getElementLabel(point)).toBe('Point A');
    });

    it('should return id when label not set', () => {
      const point = new FreePoint2D('proj_plane_H/p1', new Vector3(1, 2, 1), 'proj_plane_H');
      expect(getElementLabel(point)).toBe('proj_plane_H/p1');
    });

    it('should work with all element types', () => {
      const point = new FreePoint2D('proj_plane_H/p1', new Vector3(1, 2, 1), 'proj_plane_H', 'A');
      const line = new Line2DByTwoPoints('proj_plane_H/l1', 'proj_plane_H/p1', 'proj_plane_H/p2', 'proj_plane_H', 'Line AB');
      const circle = new Circle2DByCenterAndPoint('proj_plane_H/c1', 'proj_plane_H/center', 'proj_plane_H/edge', 'proj_plane_H');

      expect(getElementLabel(point)).toBe('A');
      expect(getElementLabel(line)).toBe('Line AB');
      expect(getElementLabel(circle)).toBe('proj_plane_H/c1'); // No label, uses id
    });
  });

  describe('getVisibleElements', () => {
    it('should filter visible elements from mixed array', () => {
      const elements: Element2D[] = [
        new FreePoint2D('proj_plane_H/p1', new Vector3(1, 2, 1), 'proj_plane_H'),
        new Line2DByTwoPoints('proj_plane_H/l1', 'proj_plane_H/p1', 'proj_plane_H/p2', 'proj_plane_H'),
        new Circle2DByCenterAndPoint('proj_plane_H/c1', 'proj_plane_H/center', 'proj_plane_H/edge', 'proj_plane_H'),
      ];

      hideElement(elements[1]); // Hide the line

      const visible = getVisibleElements(elements);
      expect(visible).toHaveLength(2);
      expect(visible[0].id).toBe('proj_plane_H/p1');
      expect(visible[1].id).toBe('proj_plane_H/c1');
    });

    it('should return empty array when all hidden', () => {
      const elements: Element2D[] = [
        new FreePoint2D('proj_plane_H/p1', new Vector3(1, 2, 1), 'proj_plane_H'),
        new Line2DByTwoPoints('proj_plane_H/l1', 'proj_plane_H/p1', 'proj_plane_H/p2', 'proj_plane_H'),
      ];

      elements.forEach(hideElement);

      const visible = getVisibleElements(elements);
      expect(visible).toHaveLength(0);
    });

    it('should return all elements when all visible', () => {
      const elements: Element2D[] = [
        new FreePoint2D('proj_plane_H/p1', new Vector3(1, 2, 1), 'proj_plane_H'),
        new Line2DByTwoPoints('proj_plane_H/l1', 'proj_plane_H/p1', 'proj_plane_H/p2', 'proj_plane_H'),
        new Circle2DByCenterAndPoint('proj_plane_H/c1', 'proj_plane_H/center', 'proj_plane_H/edge', 'proj_plane_H'),
      ];

      const visible = getVisibleElements(elements);
      expect(visible).toHaveLength(3);
    });
  });

  describe('countElementsByPlane', () => {
    it('should count mixed element types per plane', () => {
      const elements: Element2D[] = [
        new FreePoint2D('proj_plane_H/p1', new Vector3(1, 2, 1), 'proj_plane_H'),
        new FreePoint2D('proj_plane_H/p2', new Vector3(3, 4, 1), 'proj_plane_H'),
        new Line2DByTwoPoints('proj_plane_V/l1', 'proj_plane_V/p1', 'proj_plane_V/p2', 'proj_plane_V'),
        new Circle2DByCenterAndPoint('proj_plane_H/c1', 'proj_plane_H/center', 'proj_plane_H/edge', 'proj_plane_H'),
        new Circle2DByCenterAndPoint('proj_plane_V/c2', 'proj_plane_V/center2', 'proj_plane_V/edge2', 'proj_plane_V'),
      ];

      const counts = countElementsByPlane(elements);

      expect(counts.get('proj_plane_H')).toBe(3); // 2 points + 1 circle
      expect(counts.get('proj_plane_V')).toBe(2); // 1 line + 1 circle
    });

    it('should handle empty array', () => {
      const counts = countElementsByPlane([]);
      expect(counts.size).toBe(0);
    });

    it('should handle single plane', () => {
      const elements: Element2D[] = [
        new FreePoint2D('proj_plane_H/p1', new Vector3(1, 2, 1), 'proj_plane_H'),
        new Line2DByTwoPoints('proj_plane_H/l1', 'proj_plane_H/p1', 'proj_plane_H/p2', 'proj_plane_H'),
      ];

      const counts = countElementsByPlane(elements);

      expect(counts.size).toBe(1);
      expect(counts.get('proj_plane_H')).toBe(2);
    });
  });

  describe('Complex integration scenarios', () => {
    it('should support chaining utility functions', () => {
      const elements: Element2D[] = [
        new FreePoint2D('proj_plane_H/p1', new Vector3(1, 2, 1), 'proj_plane_H', 'A'),
        new FreePoint2D('proj_plane_V/p2', new Vector3(3, 4, 1), 'proj_plane_V', 'B'),
        new Line2DByTwoPoints('proj_plane_H/l1', 'proj_plane_H/p1', 'proj_plane_H/p3', 'proj_plane_H'),
        new Line2DByTwoPoints('proj_plane_V/l2', 'proj_plane_V/p2', 'proj_plane_V/p4', 'proj_plane_V'),
        new Circle2DByCenterAndPoint('proj_plane_H/c1', 'proj_plane_H/p5', 'proj_plane_H/p6', 'proj_plane_H'),
      ];

      // Hide all lines (using instanceof filter)
      elements.filter(el => el instanceof Line2DByTwoPoints).forEach(hideElement);

      // Get visible elements on plane H
      const visiblePlaneH = getVisibleElements(getElementsOnPlane(elements, 'proj_plane_H'));

      expect(visiblePlaneH).toHaveLength(2); // Point A and Circle c1
      expect(visiblePlaneH.some((el: Element2D) => el instanceof FreePoint2D)).toBe(true);
      expect(visiblePlaneH.some((el: Element2D) => el instanceof Circle2DByCenterAndPoint)).toBe(true);
      expect(visiblePlaneH.some((el: Element2D) => el instanceof Line2DByTwoPoints)).toBe(false); // Lines hidden
    });

    it('should handle operations on filtered subsets', () => {
      const elements: Element2D[] = [
        new FreePoint2D('proj_plane_H/p1', new Vector3(1, 2, 1), 'proj_plane_H'),
        new FreePoint2D('proj_plane_V/p2', new Vector3(3, 4, 1), 'proj_plane_V'),
        new Line2DByTwoPoints('proj_plane_H/l1', 'proj_plane_H/p1', 'proj_plane_H/p3', 'proj_plane_H'),
        new Circle2DByCenterAndPoint('proj_plane_V/c1', 'proj_plane_V/center', 'proj_plane_V/edge', 'proj_plane_V'),
      ];

      // Hide all elements on plane V
      getElementsOnPlane(elements, 'proj_plane_V').forEach(hideElement);

      // Count visible per plane
      const visibleCounts = countElementsByPlane(getVisibleElements(elements));

      expect(visibleCounts.get('proj_plane_H')).toBe(2); // p1 and l1 visible
      expect(visibleCounts.get('proj_plane_V')).toBeUndefined(); // All hidden
    });

    it('should work with instanceof checks after filtering', () => {
      const elements: Element2D[] = [
        new FreePoint2D('proj_plane_H/p1', new Vector3(1, 2, 1), 'proj_plane_H'),
        new Line2DByTwoPoints('proj_plane_H/l1', 'proj_plane_H/p1', 'proj_plane_H/p2', 'proj_plane_H'),
        new Circle2DByCenterAndPoint('proj_plane_H/c1', 'proj_plane_H/center', 'proj_plane_H/edge', 'proj_plane_H'),
      ];

      const planeH = getElementsOnPlane(elements, 'proj_plane_H');

      // All filtered elements should pass isElement2D
      planeH.forEach((el: Element2D) => expect(isElement2D(el)).toBe(true));

      // All should be instances of Element2D (one of the three types)
      expect(planeH[0]).toBeInstanceOf(FreePoint2D);
      expect(planeH[1]).toBeInstanceOf(Line2DByTwoPoints);
      expect(planeH[2]).toBeInstanceOf(Circle2DByCenterAndPoint);
    });
  });
});
