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
import { FreePoint2D, IntersectionPoint2D, SiblingIntersectionPoint2D } from '@/domain/world/Point';
import { World } from '@/domain/world/World';
import { Plane3D } from '@/domain/world/Plane';

describe('Point2D', () => {
  describe('constructor', () => {
    it('should create a free point with coordinates', () => {
      const point = new FreePoint2D('test-point-1', new Vector3(10, 20, 1), "plane_H");

      expect(point.position.x).toBe(10);
      expect(point.position.y).toBe(20);
      expect(point.position.z).toBe(1);
      expect(point.type).toBe('free');
    });

    it('should create an intersection point', () => {
      const point = new IntersectionPoint2D('test-point-2', 'line_1', 'circle_2', 0, "plane_H");

      expect(point.element1Id).toBe('line_1');
      expect(point.element2Id).toBe('circle_2');
      expect(point.index).toBe(0);
      expect(point.type).toBe('intersection');
    });

    it('should default to free type', () => {
      const point = new FreePoint2D('test-point-3', new Vector3(10, 20, 1), "plane_H");

      expect(point.type).toBe('free');
    });

    it('should accept optional label', () => {
      const point = new FreePoint2D('test-point-4', new Vector3(10, 20, 1), "plane_H", 'Point A');

      expect(point.label).toBe('Point A');
    });

    it('should accept optional planeId', () => {
      const point = new FreePoint2D('test-point-5', new Vector3(10, 20, 1), "plane_H");

      expect(point.planeId).toBe('plane_H');
    });

    it('should not have an ID initially', () => {
      const point = new FreePoint2D('test-point-6', new Vector3(10, 20, 1), "plane_H");

      expect(point.id).toBeDefined();
    });
  });

  describe('position coordinates', () => {
    it('should store position as Vector3', () => {
      const point = new FreePoint2D('test-point-7', new Vector3(10, 20, 1), "plane_H");

      expect(point.position.x).toBe(10);
      expect(point.position.y).toBe(20);
      expect(point.position.z).toBe(1);
    });

    it('should work with negative coordinates', () => {
      const point = new FreePoint2D('test-point-8', new Vector3(-5, -15, 1), "plane_H");

      expect(point.position.x).toBe(-5);
      expect(point.position.y).toBe(-15);
      expect(point.position.z).toBe(1);
    });

    it('should work with zero coordinates', () => {
      const point = new FreePoint2D('test-point-9', new Vector3(0, 0, 1), "plane_H");

      expect(point.position.x).toBe(0);
      expect(point.position.y).toBe(0);
      expect(point.position.z).toBe(1);
    });

    it('should work with decimal coordinates', () => {
      const point = new FreePoint2D('test-point-10', new Vector3(10.5, 20.75, 1), "plane_H");

      expect(point.position.x).toBe(10.5);
      expect(point.position.y).toBe(20.75);
      expect(point.position.z).toBe(1);
    });
  });

  describe('position updates', () => {
    it('should allow updating position', () => {
      const point = new FreePoint2D('test-point-11', new Vector3(10, 20, 1), "plane_H");

      point.position = new Vector3(30, 40, 1);

      expect(point.position.x).toBe(30);
      expect(point.position.y).toBe(40);
      expect(point.position.z).toBe(1);
    });

    it('should preserve other properties when position changes', () => {
      const point = new FreePoint2D('point_1', new Vector3(10, 20, 1), "plane_H", 'Point A');

      point.position = new Vector3(30, 40, 1);

      expect(point.id).toBe('point_1');
      expect(point.type).toBe('free');
      expect(point.label).toBe('Point A');
      expect(point.planeId).toBe('plane_H');
    });
  });

  describe('clone', () => {
    it('should create a deep copy of the point', () => {
      const original = new FreePoint2D('point_1', new Vector3(10, 20, 1), "plane_H", 'Point A');

      const clone = original.clone();

      expect(clone).not.toBe(original);
      expect(clone.position).not.toBe(original.position);  // Different Vector3 instances
      expect(clone.position.x).toBe(10);
      expect(clone.position.y).toBe(20);
      expect(clone.position.z).toBe(1);
      expect(clone.type).toBe('free');
      expect(clone.label).toBe('Point A');
      expect(clone.planeId).toBe('plane_H');
      expect(clone.id).toBe('point_1');
    });

    it('should clone point without ID', () => {
      const original = new FreePoint2D('test-point-12', new Vector3(10, 20, 1), "plane_H");

      const clone = original.clone();

      expect(clone.id).toBeDefined();
      expect(clone.position.x).toBe(10);
      expect(clone.position.y).toBe(20);
    });

    it('should allow modifying clone without affecting original', () => {
      const original = new FreePoint2D('test-point-13', new Vector3(10, 20, 1), "plane_H");
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
      const point = new FreePoint2D('test-point-14', new Vector3(100, 200, 1), "plane_H");

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

    beforeEach(() => {
      world = new World();
      
      // Create a primary intersection point using a free point for simplicity
      // (In real usage it would be from line intersection, but for testing we just need
      // a point with known coordinates that the sibling can reference)
      const freePoint = world.addFreePoint2D('proj_plane_H', new Vector3(50, 0, 1));
      primaryPointId = freePoint.id;
    });

    describe('constructor', () => {
      it('should create a sibling intersection point', () => {
        const sibling = new SiblingIntersectionPoint2D(
          'sibling-point',
          primaryPointId,
          'proj_plane_V',
          'Sibling Point'
        );

        expect(sibling.id).toBe('sibling-point');
        expect(sibling.type).toBe('sibling-intersection');
        expect(sibling.primaryIntersectionId).toBe(primaryPointId);
        expect(sibling.planeId).toBe('proj_plane_V');
        expect(sibling.label).toBe('Sibling Point');
      });

      it('should work without label', () => {
        const sibling = new SiblingIntersectionPoint2D(
          'sibling-point',
          primaryPointId,
          'proj_plane_V'
        );

        expect(sibling.label).toBeUndefined();
      });
    });

    describe('clone', () => {
      it('should create a deep copy of the sibling point', () => {
        const original = new SiblingIntersectionPoint2D(
          'sibling-1',
          primaryPointId,
          'proj_plane_V',
          'Original Sibling'
        );

        const clone = original.clone();

        expect(clone).not.toBe(original);
        expect(clone.id).toBe('sibling-1');
        expect(clone.type).toBe('sibling-intersection');
        expect(clone.primaryIntersectionId).toBe(primaryPointId);
        expect(clone.planeId).toBe('proj_plane_V');
        expect(clone.label).toBe('Original Sibling');
      });

      it('should allow modifying clone without affecting original', () => {
        const original = new SiblingIntersectionPoint2D(
          'sibling-1',
          primaryPointId,
          'proj_plane_V'
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
          'sibling-point',
          primaryPointId,
          'proj_plane_V'
        );

        const realization = sibling.realize2D(undefined, world);

        expect(realization.position.x).toBe(50);
        expect(realization.position.y).toBe(0);
        expect(realization.position.z).toBe(1);
      });

      it('should clone coordinates not reference primary', () => {
        const sibling = new SiblingIntersectionPoint2D(
          'sibling-point',
          primaryPointId,
          'proj_plane_V'
        );

        const realization1 = sibling.realize2D(undefined, world);
        const realization2 = sibling.realize2D(undefined, world);

        expect(realization1.position).not.toBe(realization2.position);
        expect(realization1.position.x).toBe(realization2.position.x);
        expect(realization1.position.y).toBe(realization2.position.y);
      });

      it('should return fallback coordinates when world not provided', () => {
        const sibling = new SiblingIntersectionPoint2D(
          'sibling-point',
          primaryPointId,
          'proj_plane_V'
        );

        const realization = sibling.realize2D();

        expect(realization.position.x).toBe(0);
        expect(realization.position.y).toBe(0);
        expect(realization.position.z).toBe(1);
      });

      it('should return fallback coordinates when primary not found', () => {
        const sibling = new SiblingIntersectionPoint2D(
          'sibling-point',
          'nonexistent-primary',
          'proj_plane_V'
        );

        const realization = sibling.realize2D(undefined, world);

        expect(realization.position.x).toBe(0);
        expect(realization.position.y).toBe(0);
        expect(realization.position.z).toBe(1);
      });

      it('should handle updated primary coordinates', () => {
        const sibling = new SiblingIntersectionPoint2D(
          'sibling-point',
          primaryPointId,
          'proj_plane_V'
        );

        // Initial realization
        const realization1 = sibling.realize2D(undefined, world);
        expect(realization1.position.x).toBe(50);

        // Update primary coordinates by creating a new point at same ID
        world.points.set(primaryPointId, new FreePoint2D(primaryPointId, new Vector3(75, 0, 1), 'proj_plane_H'));
        world.pointRealizations2D.delete(primaryPointId); // Clear cache

        // Sibling should reflect updated coordinates
        const realization2 = sibling.realize2D(undefined, world);
        expect(realization2.position.x).toBe(75);
        expect(realization2.position.y).toBe(0);
      });

      it('should preserve homogeneous coordinate z=1', () => {
        const sibling = new SiblingIntersectionPoint2D(
          'sibling-point',
          primaryPointId,
          'proj_plane_V'
        );

        const realization = sibling.realize2D(undefined, world);

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
        const primary = world.addFreePoint2D('proj_plane_H', new Vector3(100, 0, 1));
        
        const sibling = new SiblingIntersectionPoint2D(
          'sibling-point',
          primary.id,
          'proj_plane_V'
        );

        const realizationSibling = sibling.realize2D(undefined, world);
        const realizationPrimary = world.getPoint2DRealization(primary.id);

        expect(realizationSibling.position.x).toBe(realizationPrimary!.position.x);
        expect(realizationSibling.position.y).toBe(realizationPrimary!.position.y);
        expect(realizationSibling.position.z).toBe(realizationPrimary!.position.z);
      });
    });
  });
});