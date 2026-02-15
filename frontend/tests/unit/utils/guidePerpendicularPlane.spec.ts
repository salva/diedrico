/**
 * Tests for Phase 108: Guide Perpendicular Plane in 3D View
 * 
 * Tests 3D intersection utilities and perpendicular plane normal computation.
 */

import { describe, it, expect } from 'vitest';
import { Vector4 } from 'three';
import {
  intersectLinePlane3D,
  intersectSegmentPlane3D,
  isPointOnPlane3D,
} from '@/utils/threeUtils';

describe('intersectLinePlane3D', () => {
  it('should find perpendicular intersection', () => {
    // Line along z-axis through origin, plane at z=5 (normal along z)
    const linePoint = new Vector4(0, 0, 0, 1);
    const lineDir = { x: 0, y: 0, z: 1 };
    const planePoint = new Vector4(0, 0, 5, 1);
    const planeNormal = { x: 0, y: 0, z: 1 };

    const result = intersectLinePlane3D(linePoint, lineDir, planePoint, planeNormal);
    expect(result).not.toBeNull();
    expect(result!.x).toBeCloseTo(0);
    expect(result!.y).toBeCloseTo(0);
    expect(result!.z).toBeCloseTo(5);
    expect(result!.w).toBeCloseTo(1);
  });

  it('should find oblique intersection', () => {
    // Line from (0,0,0) direction (1,1,1), plane at z=3
    const linePoint = new Vector4(0, 0, 0, 1);
    const lineDir = { x: 1, y: 1, z: 1 };
    const planePoint = new Vector4(0, 0, 3, 1);
    const planeNormal = { x: 0, y: 0, z: 1 };

    const result = intersectLinePlane3D(linePoint, lineDir, planePoint, planeNormal);
    expect(result).not.toBeNull();
    expect(result!.x).toBeCloseTo(3);
    expect(result!.y).toBeCloseTo(3);
    expect(result!.z).toBeCloseTo(3);
  });

  it('should return null for parallel line', () => {
    // Line in z=0 plane (direction along x), plane at z=5
    const linePoint = new Vector4(0, 0, 0, 1);
    const lineDir = { x: 1, y: 0, z: 0 };
    const planePoint = new Vector4(0, 0, 5, 1);
    const planeNormal = { x: 0, y: 0, z: 1 };

    const result = intersectLinePlane3D(linePoint, lineDir, planePoint, planeNormal);
    expect(result).toBeNull();
  });

  it('should return null for line lying in the plane', () => {
    // Line in z=0 plane (direction along x), plane is z=0 itself
    const linePoint = new Vector4(0, 0, 0, 1);
    const lineDir = { x: 1, y: 0, z: 0 };
    const planePoint = new Vector4(0, 0, 0, 1);
    const planeNormal = { x: 0, y: 0, z: 1 };

    const result = intersectLinePlane3D(linePoint, lineDir, planePoint, planeNormal);
    expect(result).toBeNull();
  });

  it('should handle negative t (intersection behind line point)', () => {
    // Line from (0,0,10) direction (0,0,1), plane at z=5 → t=-5
    const linePoint = new Vector4(0, 0, 10, 1);
    const lineDir = { x: 0, y: 0, z: 1 };
    const planePoint = new Vector4(0, 0, 5, 1);
    const planeNormal = { x: 0, y: 0, z: 1 };

    const result = intersectLinePlane3D(linePoint, lineDir, planePoint, planeNormal);
    expect(result).not.toBeNull();
    expect(result!.z).toBeCloseTo(5); // Line extends infinitely, so negative t ok
  });

  it('should find intersection with tilted plane', () => {
    // Line along x-axis, plane with normal (1,0,0) at x=7
    const linePoint = new Vector4(0, 0, 0, 1);
    const lineDir = { x: 1, y: 0, z: 0 };
    const planePoint = new Vector4(7, 0, 0, 1);
    const planeNormal = { x: 1, y: 0, z: 0 };

    const result = intersectLinePlane3D(linePoint, lineDir, planePoint, planeNormal);
    expect(result).not.toBeNull();
    expect(result!.x).toBeCloseTo(7);
    expect(result!.y).toBeCloseTo(0);
    expect(result!.z).toBeCloseTo(0);
  });
});

describe('intersectSegmentPlane3D', () => {
  it('should find intersection when segment crosses plane', () => {
    // Segment from (0,0,0) to (0,0,10), plane at z=5
    const segStart = new Vector4(0, 0, 0, 1);
    const segEnd = new Vector4(0, 0, 10, 1);
    const planePoint = new Vector4(0, 0, 5, 1);
    const planeNormal = { x: 0, y: 0, z: 1 };

    const result = intersectSegmentPlane3D(segStart, segEnd, planePoint, planeNormal);
    expect(result).not.toBeNull();
    expect(result!.x).toBeCloseTo(0);
    expect(result!.y).toBeCloseTo(0);
    expect(result!.z).toBeCloseTo(5);
  });

  it('should return null when segment does not reach plane (t > 1)', () => {
    // Segment from (0,0,0) to (0,0,3), plane at z=5
    const segStart = new Vector4(0, 0, 0, 1);
    const segEnd = new Vector4(0, 0, 3, 1);
    const planePoint = new Vector4(0, 0, 5, 1);
    const planeNormal = { x: 0, y: 0, z: 1 };

    const result = intersectSegmentPlane3D(segStart, segEnd, planePoint, planeNormal);
    expect(result).toBeNull();
  });

  it('should return null when segment is before plane (t < 0)', () => {
    // Segment from (0,0,6) to (0,0,10), plane at z=5
    const segStart = new Vector4(0, 0, 6, 1);
    const segEnd = new Vector4(0, 0, 10, 1);
    const planePoint = new Vector4(0, 0, 5, 1);
    const planeNormal = { x: 0, y: 0, z: 1 };

    const result = intersectSegmentPlane3D(segStart, segEnd, planePoint, planeNormal);
    expect(result).toBeNull();
  });

  it('should find intersection at segment endpoint (t = 0)', () => {
    // Segment starts on the plane
    const segStart = new Vector4(0, 0, 5, 1);
    const segEnd = new Vector4(0, 0, 10, 1);
    const planePoint = new Vector4(0, 0, 5, 1);
    const planeNormal = { x: 0, y: 0, z: 1 };

    const result = intersectSegmentPlane3D(segStart, segEnd, planePoint, planeNormal);
    expect(result).not.toBeNull();
    expect(result!.z).toBeCloseTo(5);
  });

  it('should find intersection at segment end (t = 1)', () => {
    // Segment ends on the plane
    const segStart = new Vector4(0, 0, 0, 1);
    const segEnd = new Vector4(0, 0, 5, 1);
    const planePoint = new Vector4(0, 0, 5, 1);
    const planeNormal = { x: 0, y: 0, z: 1 };

    const result = intersectSegmentPlane3D(segStart, segEnd, planePoint, planeNormal);
    expect(result).not.toBeNull();
    expect(result!.z).toBeCloseTo(5);
  });

  it('should return null for parallel segment', () => {
    const segStart = new Vector4(0, 0, 0, 1);
    const segEnd = new Vector4(10, 0, 0, 1);
    const planePoint = new Vector4(0, 0, 5, 1);
    const planeNormal = { x: 0, y: 0, z: 1 };

    const result = intersectSegmentPlane3D(segStart, segEnd, planePoint, planeNormal);
    expect(result).toBeNull();
  });

  it('should find oblique segment-plane intersection', () => {
    // Segment from (0,0,0) to (10,10,10), plane at z=5
    const segStart = new Vector4(0, 0, 0, 1);
    const segEnd = new Vector4(10, 10, 10, 1);
    const planePoint = new Vector4(0, 0, 5, 1);
    const planeNormal = { x: 0, y: 0, z: 1 };

    const result = intersectSegmentPlane3D(segStart, segEnd, planePoint, planeNormal);
    expect(result).not.toBeNull();
    expect(result!.x).toBeCloseTo(5);
    expect(result!.y).toBeCloseTo(5);
    expect(result!.z).toBeCloseTo(5);
  });
});

describe('isPointOnPlane3D', () => {
  it('should return true for point on the plane', () => {
    const point = new Vector4(3, 7, 5, 1);
    const planePoint = new Vector4(0, 0, 5, 1);
    const planeNormal = { x: 0, y: 0, z: 1 };

    expect(isPointOnPlane3D(point, planePoint, planeNormal)).toBe(true);
  });

  it('should return false for point off the plane', () => {
    const point = new Vector4(3, 7, 8, 1);
    const planePoint = new Vector4(0, 0, 5, 1);
    const planeNormal = { x: 0, y: 0, z: 1 };

    expect(isPointOnPlane3D(point, planePoint, planeNormal)).toBe(false);
  });

  it('should use custom tolerance', () => {
    const point = new Vector4(0, 0, 5.3, 1);
    const planePoint = new Vector4(0, 0, 5, 1);
    const planeNormal = { x: 0, y: 0, z: 1 };

    // Default tolerance should include this (0.5)
    expect(isPointOnPlane3D(point, planePoint, planeNormal)).toBe(true);
    // Tight tolerance should exclude it
    expect(isPointOnPlane3D(point, planePoint, planeNormal, 0.1)).toBe(false);
  });

  it('should work with tilted plane', () => {
    // Plane with normal (1,0,0) at x=3 → point (3, anything, anything) is on it
    const point = new Vector4(3, 10, 20, 1);
    const planePoint = new Vector4(3, 0, 0, 1);
    const planeNormal = { x: 1, y: 0, z: 0 };

    expect(isPointOnPlane3D(point, planePoint, planeNormal)).toBe(true);
  });
});

describe('Perpendicular plane normal computation', () => {
  it('should compute correct normal for guide on P_H', () => {
    // P_H: planeTo3D maps (u,v) → (x,y,0), so:
    //   U-axis = (1,0,0), V-axis = (0,1,0), plane normal = (0,0,1)
    // Guide perpendicular to hinge (along x-axis) has direction (0,1,0) in 2D
    // Guide direction in 3D = (0,1,0)
    // Perpendicular plane normal = cross((0,1,0), (0,0,1)) = (1,0,0)
    // → The perpendicular plane has normal along x-axis

    const guideDir3D = { x: 0, y: 1, z: 0 };
    const projPlaneNormal = { x: 0, y: 0, z: 1 };
    
    const perpNormal = {
      x: guideDir3D.y * projPlaneNormal.z - guideDir3D.z * projPlaneNormal.y,
      y: guideDir3D.z * projPlaneNormal.x - guideDir3D.x * projPlaneNormal.z,
      z: guideDir3D.x * projPlaneNormal.y - guideDir3D.y * projPlaneNormal.x
    };

    expect(perpNormal.x).toBeCloseTo(1);
    expect(perpNormal.y).toBeCloseTo(0);
    expect(perpNormal.z).toBeCloseTo(0);
  });

  it('should compute correct normal for guide on P_V', () => {
    // P_V: planeTo3D maps (u,v) → (x,0,v), so:
    //   U-axis = (1,0,0), V-axis = (0,0,1), plane normal = cross((1,0,0),(0,0,1)) = (0,-1,0)
    // Guide perpendicular to hinge (along x-axis) has direction (0,1,0) in 2D
    // Guide direction in 3D (lifted): since V-axis = (0,0,1), direction (0,1,0) → (0,0,1)
    // Perpendicular plane normal = cross((0,0,1), (0,-1,0)) = (1,0,0)

    const guideDir3D = { x: 0, y: 0, z: 1 };
    const projPlaneNormal = { x: 0, y: -1, z: 0 };
    
    const perpNormal = {
      x: guideDir3D.y * projPlaneNormal.z - guideDir3D.z * projPlaneNormal.y,
      y: guideDir3D.z * projPlaneNormal.x - guideDir3D.x * projPlaneNormal.z,
      z: guideDir3D.x * projPlaneNormal.y - guideDir3D.y * projPlaneNormal.x
    };

    expect(perpNormal.x).toBeCloseTo(1);
    expect(perpNormal.y).toBeCloseTo(0);
    expect(perpNormal.z).toBeCloseTo(0);
  });

  it('should compute correct normal for diagonal guide on P_H', () => {
    // P_H plane normal = (0,0,1)
    // Guide direction in 3D = (1,1,0) (45° diagonal on P_H)
    // Perpendicular plane normal = cross((1,1,0), (0,0,1)) = (1,-1,0)

    const guideDir3D = { x: 1, y: 1, z: 0 };
    const projPlaneNormal = { x: 0, y: 0, z: 1 };
    
    const perpNormal = {
      x: guideDir3D.y * projPlaneNormal.z - guideDir3D.z * projPlaneNormal.y,
      y: guideDir3D.z * projPlaneNormal.x - guideDir3D.x * projPlaneNormal.z,
      z: guideDir3D.x * projPlaneNormal.y - guideDir3D.y * projPlaneNormal.x
    };

    // Normal should be (1, -1, 0), normalized = (1/√2, -1/√2, 0)
    const len = Math.sqrt(perpNormal.x ** 2 + perpNormal.y ** 2 + perpNormal.z ** 2);
    expect(len).toBeGreaterThan(0);
    expect(perpNormal.x / len).toBeCloseTo(1 / Math.sqrt(2));
    expect(perpNormal.y / len).toBeCloseTo(-1 / Math.sqrt(2));
    expect(perpNormal.z / len).toBeCloseTo(0);
  });
});
