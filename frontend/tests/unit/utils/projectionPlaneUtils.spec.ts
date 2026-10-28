/**
 * Unit tests for projectionPlaneUtils.ts - Phase 82.1
 * 
 * Tests for:
 * - computeLineLineIntersection3D: 3D line intersection helper
 * - computeProjectionPlaneMatrices: Complete coordinate system computation
 */

import { describe, it, expect } from 'vitest';
import { Matrix3, Vector3, Vector4 } from 'three';
import { computeLineLineIntersection3D, computePlaneEquationFromTwo3DLines, computeProjectionPlaneMatrices } from '../../../src/utils/projectionPlaneUtils';
import { Line2D, Line2DRealization2D } from '@/domain/world/Line';
import type { ProjectionPlaneRealizationContext } from '@/domain/world/projectionPlane/ProjectionPlaneContext';
import { ProjectionPlaneRealization2D, ProjectionPlaneRealization3D } from '@/domain/world/projectionPlane/ProjectionPlaneRealization';
import { applyMatrix4x3, mat3x4, mat4x3 } from '@/utils/threeUtils';

class TestLine2D extends Line2D {
  constructor(
    id: string,
    planeId: string,
    private readonly realization = new Line2DRealization2D(new Vector3(0, 0, 1), new Vector3(1, 0, 0), true)
  ) {
    super(id, planeId);
  }

  clone(): Line2D {
    return new TestLine2D(this.id, this.planeId, this.realization);
  }

  realize2D(): Line2DRealization2D {
    return this.realization;
  }
}

function makeProjectionPlaneContext(overrides: Partial<ProjectionPlaneRealizationContext> = {}): ProjectionPlaneRealizationContext {
  const lines = new Map<string, Line2D>([
    ['p1/t1', new TestLine2D('p1/t1', 'p1')],
    ['p2/t2', new TestLine2D('p2/t2', 'p2')],
    ['p1/t2Prime', new TestLine2D('p1/t2Prime', 'p1')],
  ]);
  const planes = new Map<string, any>([
    ['p1', { id: 'p1', realize2D: () => ({ feasible: true, planeToPaper2D: new Matrix3().identity() }) }],
    ['p2', { id: 'p2', realize2D: () => ({ feasible: true, planeToPaper2D: new Matrix3().identity() }) }],
  ]);

  return {
    getProjectionPlaneById: id => planes.get(id),
    getPoint2D: () => undefined,
    getLine2D: id => lines.get(id),
    getCircle2D: () => undefined,
    getHingeLineById: () => undefined,
    getProjectionPlane2DRealization: () => undefined,
    getProjectionPlane3DRealization: () => ({ feasible: true, planeTo3D: new Matrix3() } as any),
    get3DPlaneRealization: () => undefined,
    ...overrides,
  };
}

describe('computeLineLineIntersection3D', () => {
  describe('Intersecting lines', () => {
    it('should compute correct intersection for perpendicular lines', () => {
      // Line 1: along X-axis, through origin
      const line1Point = new Vector4(0, 0, 0, 1);
      const line1Dir = new Vector4(1, 0, 0, 0);
      
      // Line 2: along Y-axis, through origin
      const line2Point = new Vector4(0, 0, 0, 1);
      const line2Dir = new Vector4(0, 1, 0, 0);
      
      const intersection = computeLineLineIntersection3D(line1Point, line1Dir, line2Point, line2Dir);
      
      // Should be feasible and intersect at origin
      expect(intersection.feasible).toBe(true);
      expect(intersection.position.x).toBeCloseTo(0, 10);
      expect(intersection.position.y).toBeCloseTo(0, 10);
      expect(intersection.position.z).toBeCloseTo(0, 10);
    });
    
    it('should compute correct intersection for lines meeting at non-origin point', () => {
      // Line 1: X-axis, shifted up by 5
      const line1Point = new Vector4(0, 5, 0, 1);
      const line1Dir = new Vector4(1, 0, 0, 0);
      
      // Line 2: passes through (3, 5, 0) with direction (0, 0, 1)
      const line2Point = new Vector4(3, 5, 0, 1);
      const line2Dir = new Vector4(0, 0, 1, 0);
      
      const intersection = computeLineLineIntersection3D(line1Point, line1Dir, line2Point, line2Dir);
      
      // Should be feasible and intersect at (3, 5, 0)
      expect(intersection.feasible).toBe(true);
      expect(intersection.position.x).toBeCloseTo(3, 10);
      expect(intersection.position.y).toBeCloseTo(5, 10);
      expect(intersection.position.z).toBeCloseTo(0, 10);
    });
    
    it('should compute correct intersection for lines at arbitrary angles', () => {
      // Line 1: through (0, 0, 0), direction (1, 1, 0)
      const dir1 = new Vector3(1, 1, 0).normalize();
      const line1Point = new Vector4(0, 0, 0, 1);
      const line1Dir = new Vector4(dir1.x, dir1.y, dir1.z, 0);
      
      // Line 2: through (2, 0, 0), direction (0, 1, 0)
      const line2Point = new Vector4(2, 0, 0, 1);
      const line2Dir = new Vector4(0, 1, 0, 0);
      
      const intersection = computeLineLineIntersection3D(line1Point, line1Dir, line2Point, line2Dir);
      
      // Line 1: (x, y) = t(1, 1) => y = x
      // Line 2: (x, y) = (2, s) => x = 2
      // Intersection: x = 2, y = 2, z = 0
      expect(intersection.feasible).toBe(true);
      expect(intersection.position.x).toBeCloseTo(2, 10);
      expect(intersection.position.y).toBeCloseTo(2, 10);
      expect(intersection.position.z).toBeCloseTo(0, 10);
    });
  });
  
  describe('Parallel lines', () => {
    it('should return infeasible for parallel lines (invalid traces)', () => {
      // Line 1: along X-axis, at y=0
      const line1Point = new Vector4(0, 0, 0, 1);
      const line1Dir = new Vector4(1, 0, 0, 0);
      
      // Line 2: along X-axis, at y=5 (parallel but offset)
      const line2Point = new Vector4(0, 5, 0, 1);
      const line2Dir = new Vector4(1, 0, 0, 0);
      
      // Should return infeasible - parallel lines don't define a valid plane
      const result = computeLineLineIntersection3D(line1Point, line1Dir, line2Point, line2Dir);
      expect(result.feasible).toBe(false);
    });
    
    it('should return infeasible for coincident lines (same line)', () => {
      // Both lines along X-axis through origin (coincident within tolerance)
      const line1Point = new Vector4(0, 0, 0, 1);
      const line1Dir = new Vector4(1, 0, 0, 0);
      
      const line2Point = new Vector4(5, 0, 0, 1);  // Different point, same line
      const line2Dir = new Vector4(1, 0, 0, 0);
      
      // Coincident lines are technically parallel, should return infeasible
      const result = computeLineLineIntersection3D(line1Point, line1Dir, line2Point, line2Dir);
      expect(result.feasible).toBe(false);
    });
  });
  
  describe('Skew lines', () => {
    it('should return infeasible for skew lines (invalid traces)', () => {
      // Line 1: along X-axis at z=0
      const line1Point = new Vector4(0, 0, 0, 1);
      const line1Dir = new Vector4(1, 0, 0, 0);
      
      // Line 2: along Y-axis at z=5 (skew - don't intersect in 3D)
      const line2Point = new Vector4(0, 0, 5, 1);
      const line2Dir = new Vector4(0, 1, 0, 0);
      
      // Should return infeasible - skew lines don't define a valid plane
      const result = computeLineLineIntersection3D(line1Point, line1Dir, line2Point, line2Dir);
      expect(result.feasible).toBe(false);
    });
    
    it('should return infeasible for skew lines with offset', () => {
      // Line 1: along X-axis at y=0, z=0
      const line1Point = new Vector4(5, 0, 0, 1);
      const line1Dir = new Vector4(1, 0, 0, 0);
      
      // Line 2: along Z-axis at x=10, y=3 (skew)
      const line2Point = new Vector4(10, 3, 0, 1);
      const line2Dir = new Vector4(0, 0, 1, 0);
      
      // Should return infeasible - skew lines don't define a valid plane
      const result = computeLineLineIntersection3D(line1Point, line1Dir, line2Point, line2Dir);
      expect(result.feasible).toBe(false);
    });
  });
  
  describe('Edge cases', () => {
    it('should handle lines with unnormalized directions', () => {
      const line1Point = new Vector4(0, 0, 0, 1);
      const line1Dir = new Vector4(2, 0, 0, 0);  // Unnormalized (length 2)
      
      const line2Point = new Vector4(0, 0, 0, 1);
      const line2Dir = new Vector4(0, 3, 0, 0);  // Unnormalized (length 3)
      
      const intersection = computeLineLineIntersection3D(line1Point, line1Dir, line2Point, line2Dir);
      
      // Should be feasible and still find intersection at origin
      expect(intersection.feasible).toBe(true);
      expect(intersection.position.x).toBeCloseTo(0, 10);
      expect(intersection.position.y).toBeCloseTo(0, 10);
      expect(intersection.position.z).toBeCloseTo(0, 10);
    });
  });
});

describe('computePlaneEquationFromTwo3DLines', () => {
  it('creates a plane from two distinct parallel lines', () => {
    const equation = computePlaneEquationFromTwo3DLines(
      new Vector4(0, 5, 0, 1),
      new Vector4(1, 0, 0, 0),
      new Vector4(0, 0, 10, 1),
      new Vector4(1, 0, 0, 0)
    );

    expect(equation).not.toBeNull();
    expect(Math.abs(equation!.x)).toBeLessThan(1e-10);
    expect(Math.abs(equation!.y)).toBeCloseTo(2 / Math.sqrt(5), 10);
    expect(Math.abs(equation!.z)).toBeCloseTo(1 / Math.sqrt(5), 10);
  });

  it('rejects coincident parallel lines because infinitely many planes pass through them', () => {
    const equation = computePlaneEquationFromTwo3DLines(
      new Vector4(0, 0, 0, 1),
      new Vector4(1, 0, 0, 0),
      new Vector4(5, 0, 0, 1),
      new Vector4(1, 0, 0, 0)
    );

    expect(equation).toBeNull();
  });
});

// TODO: Add comprehensive tests for computeProjectionPlaneMatrices once we have test fixtures
// These tests require a full World instance with projection planes, which is complex to set up
// For now, testing the helper function computeLineLineIntersection3D provides good coverage
// of the core geometric algorithm

describe('computeProjectionPlaneMatrices - TODO', () => {
  it('throws a precise invariant error when a selected trace line is missing', () => {
    const context = makeProjectionPlaneContext({ getLine2D: id => id === 'p1/t1' ? undefined : new TestLine2D(id, 'p1') });

    expect(() => computeProjectionPlaneMatrices('p1/t1', 'p2/t2', 'p1/t2Prime', context)).toThrow('T1 hinge trace line not found: p1/t1');
  });

  it('throws a precise invariant error when a source projection plane realization is missing', () => {
    const context = makeProjectionPlaneContext({ getProjectionPlane3DRealization: id => id === 'p1' ? undefined : ({ feasible: true } as any) });

    expect(() => computeProjectionPlaneMatrices('p1/t1', 'p2/t2', 'p1/t2Prime', context)).toThrow('T1 source projection plane 3D realization not found: p1');
  });

  it('solves the common trace origin in 3D even when the same point has different 2D coordinates per projection plane', () => {
    const p1PlaneTo3D = mat4x3(
      1, 0, 0,
      0, 1, 0,
      0, 0, 0,
      0, 0, 1
    );
    const p1ThreeDToPlane = mat3x4(
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 0, 1
    );
    const p2PlaneTo3D = mat4x3(
      1, 0, 0,
      0, 0, 7,
      0, 1, 0,
      0, 0, 1
    );
    const p2ThreeDToPlane = mat3x4(
      1, 0, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    );
    const paper = new Matrix3().identity();

    const lines = new Map<string, Line2D>([
      ['p1/t1', new TestLine2D('p1/t1', 'p1', new Line2DRealization2D(
        new Vector3(4, 7, 1),
        new Vector3(1, 0, 0),
        true
      ))],
      ['p2/t2', new TestLine2D('p2/t2', 'p2', new Line2DRealization2D(
        new Vector3(4, 0, 1),
        new Vector3(0, 1, 0),
        true
      ))],
      ['p1/t2Prime', new TestLine2D('p1/t2Prime', 'p1', new Line2DRealization2D(
        new Vector3(4, 7, 1),
        new Vector3(0, 1, 0),
        true
      ))],
    ]);
    const plane2D = new Map([
      ['p1', new ProjectionPlaneRealization2D('p1', paper, paper.clone(), true)],
      ['p2', new ProjectionPlaneRealization2D('p2', paper, paper.clone(), true)],
    ]);
    const plane3D = new Map([
      ['p1', new ProjectionPlaneRealization3D('p1', p1PlaneTo3D, p1ThreeDToPlane, true)],
      ['p2', new ProjectionPlaneRealization3D('p2', p2PlaneTo3D, p2ThreeDToPlane, true)],
    ]);
    const context = makeProjectionPlaneContext({
      getLine2D: id => lines.get(id),
      getProjectionPlaneById: id => ({ id, realize2D: () => plane2D.get(id) } as any),
      getProjectionPlane3DRealization: id => plane3D.get(id),
    });

    expect(applyMatrix4x3(new Vector3(4, 7, 1), p1PlaneTo3D)).toMatchObject({ x: 4, y: 7, z: 0, w: 1 });
    expect(applyMatrix4x3(new Vector3(4, 0, 1), p2PlaneTo3D)).toMatchObject({ x: 4, y: 7, z: 0, w: 1 });

    const matrices = computeProjectionPlaneMatrices('p1/t1', 'p2/t2', 'p1/t2Prime', context);

    expect(matrices).not.toBeNull();
    const auxOriginIn3D = applyMatrix4x3(new Vector3(0, 0, 1), matrices!.planeTo3D);
    expect(auxOriginIn3D.x).toBeCloseTo(4, 10);
    expect(auxOriginIn3D.y).toBeCloseTo(7, 10);
    expect(auxOriginIn3D.z).toBeCloseTo(0, 10);
    expect(auxOriginIn3D.w).toBeCloseTo(1, 10);
  });

  it('rejects distinct parallel traces for a finite-crossing auxiliary layout', () => {
    const to3D = mat4x3(1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1);
    const from3D = mat3x4(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1);
    const lines = new Map([
      ['p1/t1', new TestLine2D('p1/t1', 'p1')],
      ['p2/t2', new TestLine2D('p2/t2', 'p2', new Line2DRealization2D(new Vector3(0, 5, 1), new Vector3(1, 0, 0), true))],
      ['p1/t2Prime', new TestLine2D('p1/t2Prime', 'p1', new Line2DRealization2D(new Vector3(0, 5, 1), new Vector3(1, 0, 0), true))],
    ]);
    const context = makeProjectionPlaneContext({
      getLine2D: id => lines.get(id),
      getProjectionPlane3DRealization: id => new ProjectionPlaneRealization3D(id, to3D, from3D, true),
    });
    expect(computeProjectionPlaneMatrices('p1/t1', 'p2/t2', 'p1/t2Prime', context)).toBeNull();
  });

  it.todo('should satisfy paper layout constraints: v=0 coincides with T1');
  it.todo('should satisfy paper layout constraints: origin at T1-T2\' intersection');
  it.todo('should satisfy paper layout constraints: V perpendicular to U');
  it.todo('should satisfy paper layout constraints: V orientation via T2 side test');
  
  it.todo('should satisfy 3D constraints: U perpendicular to V');
  it.todo('should satisfy 3D constraints: U and V normalized');
  it.todo('should satisfy 3D constraints: U and V lie in plane Q');
  it.todo('should satisfy 3D constraints: origin on T1');
  it.todo('should satisfy 3D constraints: origin on T2');
  
  it.todo('should produce invertible matrices (round-trip preserves points)');
  it.todo('should maintain consistency between paper and 3D coordinate systems');
});
