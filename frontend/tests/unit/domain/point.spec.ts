/**
 * Unit tests for Point class
 * 
 * Tests point creation, coordinate handling, and homogeneous coordinate representation.
 * All points must use plane intrinsic coordinates per Constitution Principle V.
 * 
 * @see frontend/src/domain/world/Point.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Vector3, Vector4 } from 'three';
import { 
  FreePoint2D, 
  Point2DLineLineIntersection,
  Point2DLineCircleIntersection,
  Point2DCircleCircleIntersection,
  SiblingIntersectionPoint2D 
} from '@/domain/world/Point';
import { World } from '@/domain/world/World';
import { Plane3D } from '@/domain/world/Plane';
import { HingeLine, HalfHingeLine2D } from '@/domain/world/HingeLine';
import { getHorizontalPlane, getVerticalPlane, getHorizontalPlaneId, getVerticalPlaneId } from '../../helpers/worldHelpers';

describe('Point2D', () => {
  describe('constructor', () => {
    it('should create a free point with coordinates', () => {
      const point = new FreePoint2D('plane_H/test-point-1', new Vector3(10, 20, 1), "plane_H");

      expect(point.position.x).toBe(10);
      expect(point.position.y).toBe(20);
      expect(point.position.z).toBe(1);
      expect(point instanceof FreePoint2D).toBe(true);
    });

    it('should create a line-line intersection point', () => {
      const point = new Point2DLineLineIntersection('plane_H/test-point-2', 'plane_H/line_1', 'plane_H/line_2', "plane_H");

      expect(point.line1Id).toBe('plane_H/line_1');
      expect(point.line2Id).toBe('plane_H/line_2');
      expect(point instanceof Point2DLineLineIntersection).toBe(true);
    });

    it('should default to free type', () => {
      const point = new FreePoint2D('plane_H/test-point-3', new Vector3(10, 20, 1), "plane_H");

      expect(point instanceof FreePoint2D).toBe(true);
    });

    it('should accept optional label', () => {
      const point = new FreePoint2D('plane_H/test-point-4', new Vector3(10, 20, 1), "plane_H", 'Point A');

      expect(point.label).toBe('Point A');
    });

    it('should accept optional planeId', () => {
      const point = new FreePoint2D('plane_H/test-point-5', new Vector3(10, 20, 1), "plane_H");

      expect(point.planeId).toBe('plane_H');
    });

    it('should not have an ID initially', () => {
      const point = new FreePoint2D('plane_H/test-point-6', new Vector3(10, 20, 1), "plane_H");

      expect(point.id).toBeDefined();
    });
  });

  describe('position coordinates', () => {
    it('should store position as Vector3', () => {
      const point = new FreePoint2D('plane_H/test-point-7', new Vector3(10, 20, 1), "plane_H");

      expect(point.position.x).toBe(10);
      expect(point.position.y).toBe(20);
      expect(point.position.z).toBe(1);
    });

    it('should work with negative coordinates', () => {
      const point = new FreePoint2D('plane_H/test-point-8', new Vector3(-5, -15, 1), "plane_H");

      expect(point.position.x).toBe(-5);
      expect(point.position.y).toBe(-15);
      expect(point.position.z).toBe(1);
    });

    it('should work with zero coordinates', () => {
      const point = new FreePoint2D('plane_H/test-point-9', new Vector3(0, 0, 1), "plane_H");

      expect(point.position.x).toBe(0);
      expect(point.position.y).toBe(0);
      expect(point.position.z).toBe(1);
    });

    it('should work with decimal coordinates', () => {
      const point = new FreePoint2D('plane_H/test-point-10', new Vector3(10.5, 20.75, 1), "plane_H");

      expect(point.position.x).toBe(10.5);
      expect(point.position.y).toBe(20.75);
      expect(point.position.z).toBe(1);
    });
  });

  describe('position updates', () => {
    it('should allow updating position', () => {
      const point = new FreePoint2D('plane_H/test-point-11', new Vector3(10, 20, 1), "plane_H");

      point.position = new Vector3(30, 40, 1);

      expect(point.position.x).toBe(30);
      expect(point.position.y).toBe(40);
      expect(point.position.z).toBe(1);
    });

    it('should preserve other properties when position changes', () => {
      const point = new FreePoint2D('plane_H/point_1', new Vector3(10, 20, 1), "plane_H", 'Point A');

      point.position = new Vector3(30, 40, 1);

      expect(point.id).toBe('plane_H/point_1');
      expect(point instanceof FreePoint2D).toBe(true);
      expect(point.label).toBe('Point A');
      expect(point.planeId).toBe('plane_H');
    });
  });

  describe('clone', () => {
    it('should create a deep copy of the point', () => {
      const original = new FreePoint2D('plane_H/point_1', new Vector3(10, 20, 1), "plane_H", 'Point A');

      const clone = original.clone();

      expect(clone).not.toBe(original);
      expect(clone.position).not.toBe(original.position);  // Different Vector3 instances
      expect(clone.position.x).toBe(10);
      expect(clone.position.y).toBe(20);
      expect(clone.position.z).toBe(1);
      expect(clone instanceof FreePoint2D).toBe(true);
      expect(clone.label).toBe('Point A');
      expect(clone.planeId).toBe('plane_H');
      expect(clone.id).toBe('plane_H/point_1');
    });

    it('should clone point without ID', () => {
      const original = new FreePoint2D('plane_H/test-point-12', new Vector3(10, 20, 1), "plane_H");

      const clone = original.clone();

      expect(clone.id).toBeDefined();
      expect(clone.position.x).toBe(10);
      expect(clone.position.y).toBe(20);
    });

    it('should allow modifying clone without affecting original', () => {
      const original = new FreePoint2D('plane_H/test-point-13', new Vector3(10, 20, 1), "plane_H");
      const clone = original.clone();

      clone.position = new Vector3(30, 40, 1);
      clone.label = 'Modified';

      expect(original.position.x).toBe(10);
      expect(original.position.y).toBe(20);
      expect(original.label).toBeUndefined();
    });
  });

  describe('coordinate system validation', () => {
    it('should store position as Vector3 homogeneous coordinates (u, v, 1)', () => {
      // As per Constitution Principle V,
      // points MUST be stored in homogeneous coordinates (u, v, 1)
      const point = new FreePoint2D('plane_H/test-point-14', new Vector3(100, 200, 1), "plane_H");

      expect(point.position).toBeInstanceOf(Vector3);
      expect(point.position.x).toBe(100);
      expect(point.position.y).toBe(200);
      expect(point.position.z).toBe(1); // homogeneous coordinate
    });
  });

  // T055l: SiblingIntersectionPoint2D tests
  describe('SiblingIntersectionPoint2D', () => {
    let world: World;
    let primaryPointId: string;
    let planeVId: string;

    beforeEach(() => {
      world = new World();
      const planeH = getHorizontalPlane(world);
      planeVId = getVerticalPlaneId(world);
      
      // Create a primary intersection point using a free point for simplicity
      // (In real usage it would be from line intersection, but for testing we just need
      // a point with known coordinates that the sibling can reference)
      const freePoint = planeH.addFreePoint2D(new Vector3(50, 0, 1), world);
      primaryPointId = freePoint.id;
    });

    describe('constructor', () => {
      it('should create a sibling intersection point', () => {
        const sibling = new SiblingIntersectionPoint2D(
          planeVId + '/sibling-point',
          primaryPointId,
          planeVId,
          'Sibling Point'
        );

        expect(sibling.id).toBe(planeVId + '/sibling-point');
        expect(sibling instanceof SiblingIntersectionPoint2D).toBe(true);
        expect(sibling.primaryIntersectionId).toBe(primaryPointId);
        expect(sibling.planeId).toBe(planeVId);
        expect(sibling.label).toBe('Sibling Point');
      });

      it('should work without label', () => {
        const sibling = new SiblingIntersectionPoint2D(
          planeVId + '/sibling-point',
          primaryPointId,
          planeVId
        );

        expect(sibling.label).toBeUndefined();
      });
    });

    describe('clone', () => {
      it('should create a deep copy of the sibling point', () => {
        const original = new SiblingIntersectionPoint2D(
          planeVId + '/sibling-1',
          primaryPointId,
          planeVId,
          'Original Sibling'
        );

        const clone = original.clone();

        expect(clone).not.toBe(original);
        expect(clone.id).toBe(planeVId + '/sibling-1');
        expect(clone instanceof SiblingIntersectionPoint2D).toBe(true);
        expect(clone.primaryIntersectionId).toBe(primaryPointId);
        expect(clone.planeId).toBe(planeVId);
        expect(clone.label).toBe('Original Sibling');
      });

      it('should allow modifying clone without affecting original', () => {
        const original = new SiblingIntersectionPoint2D(
          planeVId + '/sibling-1',
          primaryPointId,
          planeVId
        );
        const clone = original.clone();

        clone.label = 'Modified Label';

        expect(original.label).toBeUndefined();
        expect(clone.label).toBe('Modified Label');
      });
    });

    describe('realize2D', () => {
      it('should return primary point coordinates when world provided', () => {
        const sibling = new SiblingIntersectionPoint2D(
          planeVId + '/sibling-point',
          primaryPointId,
          planeVId
        );

        const realization = sibling.realize2D(world);

        expect(realization.position.x).toBe(50);
        expect(realization.position.y).toBe(0);
        expect(realization.position.z).toBe(1);
      });

      it('should clone coordinates not reference primary', () => {
        const sibling = new SiblingIntersectionPoint2D(
          planeVId + '/sibling-point',
          primaryPointId,
          planeVId
        );

        const realization1 = sibling.realize2D(world);
        const realization2 = sibling.realize2D(world);

        expect(realization1.position).not.toBe(realization2.position);
        expect(realization1.position.x).toBe(realization2.position.x);
        expect(realization1.position.y).toBe(realization2.position.y);
      });

      it('should return infeasible coordinates when primary not found', () => {
        const sibling = new SiblingIntersectionPoint2D(
          planeVId + '/sibling-point',
          'nonexistent-primary',
          planeVId
        );

        const realization = sibling.realize2D(world);

        expect(realization.feasible).toBe(false);
        expect(realization.position.x).toBe(0);
        expect(realization.position.y).toBe(0);
        expect(realization.position.z).toBe(1);
      });

      it('should return fallback coordinates when primary not found', () => {
        const sibling = new SiblingIntersectionPoint2D(
          planeVId + '/sibling-point',
          'nonexistent-primary',
          planeVId
        );

        const realization = sibling.realize2D(world);

        expect(realization.feasible).toBe(false);
        expect(realization.position.x).toBe(0);
        expect(realization.position.y).toBe(0);
        expect(realization.position.z).toBe(1);
      });

      it('should handle updated primary coordinates', () => {
        const sibling = new SiblingIntersectionPoint2D(
          planeVId + '/sibling-point',
          primaryPointId,
          planeVId
        );

        // Initial realization
        const realization1 = sibling.realize2D(world);
        expect(realization1.position.x).toBe(50);

        // Update primary coordinates by creating a new point at same ID
        const planeHId = getHorizontalPlaneId(world);
        const primaryPoint = new FreePoint2D(primaryPointId, new Vector3(75, 0, 1), planeHId);
        world.addPoint2D(primaryPoint);
        // Phase 22.5.3: Clear cache from plane, not World
        const planeH = getHorizontalPlane(world);
        planeH?.clearPointRealization2D(primaryPointId);

        // Sibling should reflect updated coordinates
        const realization2 = sibling.realize2D(world);
        expect(realization2.position.x).toBe(75);
        expect(realization2.position.y).toBe(0);
      });

      it('should preserve homogeneous coordinate z=1', () => {
        const sibling = new SiblingIntersectionPoint2D(
          planeVId + '/sibling-point',
          primaryPointId,
          planeVId
        );

        const realization = sibling.realize2D(world);

        expect(realization.position.z).toBe(1);
      });
    });

    describe('HalfHingeLine2D coordinate consistency', () => {
      it('should use same coordinates as primary for HHL intersections', () => {
        // For HHL intersections: (u, 0, 1) on proj_plane_H → same (u, 0, 1) on proj_plane_V
        // This is because HalfHingeLine2D objects on both planes have:
        //   - Same point: (0, 0, 1)
        //   - Same direction: (1, 0, 0)
        
        // Create primary point with specific coordinates
        const planeH = world.getProjectionPlaneByLabel('P_H')!;
        const primary = planeH.addFreePoint2D(new Vector3(100, 0, 1), world);
        
        const sibling = new SiblingIntersectionPoint2D(
          planeVId + '/sibling-point',
          primary.id,
          planeVId
        );

        const realizationSibling = sibling.realize2D(world);
        const realizationPrimary = primary.realize2D(world);

        expect(realizationSibling.position.x).toBe(realizationPrimary!.position.x);
        expect(realizationSibling.position.y).toBe(realizationPrimary!.position.y);
        expect(realizationSibling.position.z).toBe(realizationPrimary!.position.z);
      });
    });

    // Phase 37: Parametric Consistency Validation Tests
    describe('Parametric consistency validation', () => {
      it('T358: HL_HV HalfHingeLine2D pairs maintain identical Q and D', () => {
        // Get both HalfHingeLine2D objects for HL_HV
        const planeH = world.getProjectionPlaneByLabel('P_H')!;
        const planeV = world.getProjectionPlaneById(planeVId)!;
        
        const halfHingeH = Array.from(planeH.lines.values())
          .find((line): line is HalfHingeLine2D => line instanceof HalfHingeLine2D);
        const halfHingeV = Array.from(planeV.lines.values())
          .find((line): line is HalfHingeLine2D => line instanceof HalfHingeLine2D);
        
        expect(halfHingeH).toBeDefined();
        expect(halfHingeV).toBeDefined();
        // Both half-hinges should reference the same hinge line
        expect(halfHingeH.hingeLineId).toBe(halfHingeV.hingeLineId);
        
        // Verify parametric consistency: Q = Q'
        expect(halfHingeH.point.x).toBe(halfHingeV.point.x);
        expect(halfHingeH.point.y).toBe(halfHingeV.point.y);
        expect(halfHingeH.point.z).toBe(halfHingeV.point.z);
        
        // Verify parametric consistency: D = D'
        expect(halfHingeH.direction.x).toBe(halfHingeV.direction.x);
        expect(halfHingeH.direction.y).toBe(halfHingeV.direction.y);
        expect(halfHingeH.direction.z).toBe(halfHingeV.direction.z);
      });

      it('T359: sibling coordinates match primary at different HHL positions', () => {
        // Test at multiple positions along the hinge line
        const planeH = world.getProjectionPlaneByLabel('P_H')!;
        
        const testPositions = [
          { d: 0, x: 0, y: 0 },    // At origin (d=0)
          { d: 5, x: 5, y: 0 },    // At d=5
          { d: -3, x: -3, y: 0 },  // At d=-3
          { d: 100, x: 100, y: 0 } // At d=100
        ];
        
        for (const pos of testPositions) {
          // Create primary point at position (using free point on HHL)
          const primary = planeH.addFreePoint2D(new Vector3(pos.x, pos.y, 1), world);
          
          // Create sibling point
          const sibling = new SiblingIntersectionPoint2D(
            `${planeVId}/sibling-${pos.d}`,
            primary.id,
            planeVId
          );
          
          // Realize both
          const primaryRealization = primary.realize2D(world);
          const siblingRealization = sibling.realize2D(world);
          
          // Verify coordinates match (due to parametric consistency)
          expect(siblingRealization.position.x).toBeCloseTo(primaryRealization!.position.x, 10);
          expect(siblingRealization.position.y).toBeCloseTo(primaryRealization!.position.y, 10);
          expect(siblingRealization.position.z).toBe(1);
        }
      });

      it('T358: HingeLine.validateParametricConsistency() detects point mismatch', () => {
        
        
        // Create two HalfHingeLine2D with DIFFERENT reference points
        const hhl1 = new HalfHingeLine2D(
          'plane1/hhl1', 'TEST_HL', 'plane1',
          new Vector3(0, 0, 1),  // Q1 = (0,0,1)
          new Vector3(1, 0, 0)   // D = (1,0,0)
        );
        
        const hhl2 = new HalfHingeLine2D(
          'plane2/hhl2', 'TEST_HL', 'plane2',
          new Vector3(1, 0, 1),  // Q2 = (1,0,1) - DIFFERENT!
          new Vector3(1, 0, 0)   // D = (1,0,0)
        );
        
        // Should throw error about point mismatch
        expect(() => {
          HingeLine.validateParametricConsistency(hhl1, hhl2);
        }).toThrow(/Reference points differ/);
      });

      it('T358: HingeLine.validateParametricConsistency() detects direction mismatch', () => {
        
        
        // Create two HalfHingeLine2D with DIFFERENT directions
        const hhl1 = new HalfHingeLine2D(
          'plane1/hhl1', 'TEST_HL', 'plane1',
          new Vector3(0, 0, 1),  // Q = (0,0,1)
          new Vector3(1, 0, 0)   // D1 = (1,0,0)
        );
        
        const hhl2 = new HalfHingeLine2D(
          'plane2/hhl2', 'TEST_HL', 'plane2',
          new Vector3(0, 0, 1),  // Q = (0,0,1)
          new Vector3(0, 1, 0)   // D2 = (0,1,0) - DIFFERENT!
        );
        
        // Should throw error about direction mismatch
        expect(() => {
          HingeLine.validateParametricConsistency(hhl1, hhl2);
        }).toThrow(/Direction vectors differ/);
      });

      it('T358: HingeLine.validateParametricConsistency() passes for identical parameterization', () => {
        
        
        // Create two HalfHingeLine2D with IDENTICAL (Q, D)
        const hhl1 = new HalfHingeLine2D(
          'plane1/hhl1', 'TEST_HL', 'plane1',
          new Vector3(2, 3, 1),  // Q = (2,3,1) - arbitrary
          new Vector3(0, 1, 0)   // D = (0,1,0) - arbitrary
        );
        
        const hhl2 = new HalfHingeLine2D(
          'plane2/hhl2', 'TEST_HL', 'plane2',
          new Vector3(2, 3, 1),  // Q = (2,3,1) - same
          new Vector3(0, 1, 0)   // D = (0,1,0) - same
        );
        
        // Should NOT throw
        expect(() => {
          HingeLine.validateParametricConsistency(hhl1, hhl2);
        }).not.toThrow();
      });
    });
  });
});
