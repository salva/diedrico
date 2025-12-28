/**
 * Unit tests for BHL projection calculations
 */

import { describe, it, expect } from 'vitest';
import {
  intersectPlanes3D,
  projectLineOntoHorizontalPlane,
  projectLineOntoVerticalPlane,
  tracesToPlane3D,
  computeBHLProjections,
  type Plane3DEquation,
  type Line2DGeometry
} from '@/domain/calculations/bhlProjections';

describe('BHL Projection Calculations', () => {
  describe('intersectPlanes3D', () => {
    it('should compute intersection of two non-parallel planes', () => {
      // Horizontal plane (z = 0): 0x + 0y + 1z = 0
      const plane1: Plane3DEquation = { a: 0, b: 0, c: 1, d: 0 };
      
      // Vertical plane (y = 0): 0x + 1y + 0z = 0
      const plane2: Plane3DEquation = { a: 0, b: 1, c: 0, d: 0 };
      
      const result = intersectPlanes3D(plane1, plane2);
      
      expect(result).not.toBeNull();
      // Should be along x-axis (direction can be +1 or -1)
      expect(Math.abs(result?.direction.x ?? 0)).toBeCloseTo(1, 5);
      expect(result?.direction.y).toBeCloseTo(0, 5);
      expect(result?.direction.z).toBeCloseTo(0, 5);
    });

    it('should return null for parallel planes', () => {
      // Two horizontal planes at different heights
      const plane1: Plane3DEquation = { a: 0, b: 0, c: 1, d: 0 };
      const plane2: Plane3DEquation = { a: 0, b: 0, c: 1, d: 5 };
      
      const result = intersectPlanes3D(plane1, plane2);
      
      expect(result).toBeNull();
    });

    it('should compute intersection of tilted planes', () => {
      // Plane 1: x + y + z = 0
      const plane1: Plane3DEquation = { a: 1, b: 1, c: 1, d: 0 };
      
      // Plane 2: x - y = 0
      const plane2: Plane3DEquation = { a: 1, b: -1, c: 0, d: 0 };
      
      const result = intersectPlanes3D(plane1, plane2);
      
      expect(result).not.toBeNull();
      // Direction should be perpendicular to both normals
      if (result) {
        const dot1 = result.direction.x * plane1.a + result.direction.y * plane1.b + result.direction.z * plane1.c;
        const dot2 = result.direction.x * plane2.a + result.direction.y * plane2.b + result.direction.z * plane2.c;
        expect(dot1).toBeCloseTo(0, 5);
        expect(dot2).toBeCloseTo(0, 5);
      }
    });
  });

  describe('projectLineOntoHorizontalPlane', () => {
    it('should project line onto z=0 plane', () => {
      const line3D = {
        origin: { x: 1, y: 2, z: 3 },
        direction: { x: 1, y: 0, z: 0 }
      };
      
      const projection = projectLineOntoHorizontalPlane(line3D);
      
      expect(projection.point1.x).toBe(1);
      expect(projection.point1.y).toBe(2);
      expect(projection.point2.x).toBeGreaterThan(projection.point1.x);
      expect(projection.point2.y).toBe(2); // y should remain constant
    });

    it('should project diagonal line correctly', () => {
      const line3D = {
        origin: { x: 0, y: 0, z: 5 },
        direction: { x: 0.707, y: 0.707, z: 0 }
      };
      
      const projection = projectLineOntoHorizontalPlane(line3D);
      
      expect(projection.point1.x).toBe(0);
      expect(projection.point1.y).toBe(0);
      // Should project along x-y diagonal
      expect(Math.abs(projection.point2.x - projection.point2.y)).toBeLessThan(0.1);
    });
  });

  describe('projectLineOntoVerticalPlane', () => {
    it('should project line onto y=0 plane', () => {
      const line3D = {
        origin: { x: 1, y: 2, z: 3 },
        direction: { x: 0, y: 0, z: 1 }
      };
      
      const projection = projectLineOntoVerticalPlane(line3D);
      
      expect(projection.point1.x).toBe(1);
      expect(projection.point1.y).toBe(3); // z becomes y in 2D
      expect(projection.point2.x).toBe(1); // x should remain constant
      expect(projection.point2.y).toBeGreaterThan(projection.point1.y);
    });

    it('should project horizontal line as point in vertical plane', () => {
      const line3D = {
        origin: { x: 1, y: 2, z: 3 },
        direction: { x: 0, y: 1, z: 0 }
      };
      
      const projection = projectLineOntoVerticalPlane(line3D);
      
      expect(projection.point1.x).toBe(1);
      expect(projection.point1.y).toBe(3);
      expect(projection.point2.x).toBe(1); // Same x
      expect(projection.point2.y).toBe(3); // Same z
    });
  });

  describe('tracesToPlane3D', () => {
    it('should convert horizontal and vertical traces to 3D plane', () => {
      // Horizontal trace on z=0: from (0,0) to (10,0)
      const traceH: Line2DGeometry = {
        point1: { x: 0, y: 0 },
        point2: { x: 10, y: 0 }
      };
      
      // Vertical trace on y=0: from (0,0) to (0,10) (in 2D, but z in 3D)
      const traceV: Line2DGeometry = {
        point1: { x: 0, y: 0 },
        point2: { x: 0, y: 10 }
      };
      
      const plane = tracesToPlane3D(traceH, traceV);
      
      expect(plane).not.toBeNull();
      
      // Verify that the traces lie on the plane
      if (plane) {
        // Point from horizontal trace
        const testH = plane.a * 5 + plane.b * 0 + plane.c * 0;
        expect(testH).toBeCloseTo(plane.d, 5);
        
        // Point from vertical trace
        const testV = plane.a * 0 + plane.b * 0 + plane.c * 5;
        expect(testV).toBeCloseTo(plane.d, 5);
      }
    });

    it('should return null for parallel traces', () => {
      // Both traces parallel (along x-axis)
      const traceH: Line2DGeometry = {
        point1: { x: 0, y: 0 },
        point2: { x: 10, y: 0 }
      };
      
      const traceV: Line2DGeometry = {
        point1: { x: 0, y: 0 },
        point2: { x: 10, y: 0 }
      };
      
      const plane = tracesToPlane3D(traceH, traceV);
      
      expect(plane).toBeNull();
    });
  });

  describe('computeBHLProjections', () => {
    it('should compute BHL projections for two intersecting planes', () => {
      // Plane 1: z = 2 (horizontal plane above origin)
      const plane1: Plane3DEquation = { a: 0, b: 0, c: 1, d: 2 };
      
      // Plane 2: tilted plane x + z = 5
      const plane2: Plane3DEquation = { a: 1, b: 0, c: 1, d: 5 };
      
      const result = computeBHLProjections(plane1, plane2);
      
      expect(result).not.toBeNull();
      expect(result?.horizontalProjection).toBeDefined();
      expect(result?.verticalProjection).toBeDefined();
    });

    it('should return null for parallel planes', () => {
      // Two horizontal planes
      const plane1: Plane3DEquation = { a: 0, b: 0, c: 1, d: 0 };
      const plane2: Plane3DEquation = { a: 0, b: 0, c: 1, d: 5 };
      
      const result = computeBHLProjections(plane1, plane2);
      
      expect(result).toBeNull();
    });

    it('should compute projections for perpendicular planes', () => {
      // Plane 1: x = 3 (vertical plane perpendicular to x-axis)
      const plane1: Plane3DEquation = { a: 1, b: 0, c: 0, d: 3 };
      
      // Plane 2: y = 4 (vertical plane perpendicular to y-axis)
      const plane2: Plane3DEquation = { a: 0, b: 1, c: 0, d: 4 };
      
      const result = computeBHLProjections(plane1, plane2);
      
      expect(result).not.toBeNull();
      // Intersection should be a vertical line at (3, 4, z)
      // The projections should show this line correctly
      expect(result).toBeDefined();
    });
  });
});
