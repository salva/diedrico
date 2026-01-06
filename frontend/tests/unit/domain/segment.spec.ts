/**
 * Unit tests for Segment domain entities
 * 
 * Tests the Segment2D geometry classes:
 * - Segment2DByPoints: Defines segment by two point IDs
 * - Segment2DRealization2D: Computed segment with endpoints in plane coordinates
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Vector3 } from 'three';
import { Segment2DByPoints, Segment2DRealization2D } from '@/domain/world/Segment';
import { FreePoint2D, Point2DRealization2D } from '@/domain/world/Point';
import { World } from '@/domain/world/World';

describe('Segment2D', () => {
  let world: World;
  let point1Id: string;
  let point2Id: string;

  beforeEach(() => {
    world = new World();
    
    // Create two test points using factory method
    const point1 = world.addFreePoint2D('proj_plane_H', new Vector3(0, 0, 1), 'p1');
    const point2 = world.addFreePoint2D('proj_plane_H', new Vector3(100, 50, 1), 'p2');
    
    point1Id = point1.id;
    point2Id = point2.id;
  });

  describe('Segment2DByPoints', () => {
    it('should create segment with point references', () => {
      const segment = new Segment2DByPoints('seg1', point1Id, point2Id, 'proj_plane_H');
      
      expect(segment.id).toBe('seg1');
      expect(segment.type).toBe('by-points');
      expect(segment.point1Id).toBe(point1Id);
      expect(segment.point2Id).toBe(point2Id);
      expect(segment.planeId).toBe('proj_plane_H');
    });

    it('should clone segment correctly', () => {
      const original = new Segment2DByPoints('seg1', point1Id, point2Id, 'proj_plane_H');
      const cloned = original.clone();
      
      expect(cloned.id).toBe('seg1');
      expect(cloned.point1Id).toBe(point1Id);
      expect(cloned.point2Id).toBe(point2Id);
      expect(cloned.planeId).toBe('proj_plane_H');
      expect(cloned).not.toBe(original);
    });

    it('should realize segment with valid points', () => {
      const segment = new Segment2DByPoints('seg1', point1Id, point2Id, 'proj_plane_H');
      
      // Use World's method which handles the realization properly
      world.addSegment2D(segment);
      const realization = world.getSegment2DRealization('seg1');
      
      expect(realization).toBeDefined();
      expect(realization!.point1.x).toBe(0);
      expect(realization!.point1.y).toBe(0);
      expect(realization!.point2.x).toBe(100);
      expect(realization!.point2.y).toBe(50);
    });

    it('should return null when first point is missing', () => {
      const segment = new Segment2DByPoints('seg1', 'missing', point2Id, 'proj_plane_H');
      
      world.addSegment2D(segment);
      const realization = world.getSegment2DRealization('seg1');
      
      expect(realization).toBeUndefined();
    });

    it('should return null when second point is missing', () => {
      const segment = new Segment2DByPoints('seg1', point1Id, 'missing', 'proj_plane_H');
      
      world.addSegment2D(segment);
      const realization = world.getSegment2DRealization('seg1');
      
      expect(realization).toBeUndefined();
    });

    it('should return null when both points are missing', () => {
      const segment = new Segment2DByPoints('seg1', 'missing1', 'missing2', 'proj_plane_H');
      
      world.addSegment2D(segment);
      const realization = world.getSegment2DRealization('seg1');
      
      expect(realization).toBeUndefined();
    });

    it('should detect degenerate segment (coincident points)', () => {
      // Create two coincident points
      const point3 = new FreePoint2D('p3', new Vector3(50, 50, 1), 'proj_plane_H');
      const point4 = new FreePoint2D('p4', new Vector3(50, 50, 1), 'proj_plane_H');
      world.addPoint2D(point3);
      world.addPoint2D(point4);
      
      const segment = new Segment2DByPoints('seg1', 'p3', 'p4', 'proj_plane_H');
      world.addSegment2D(segment);
      const realization = world.getSegment2DRealization('seg1');
      
      // Degenerate segments return infeasible realization
      expect(realization).toBeDefined();
      expect(realization!.feasible).toBe(false);
    });
  });

  describe('Segment2DRealization2D', () => {
    it('should compute segment length', () => {
      const realization = new Segment2DRealization2D(
        new Vector3(0, 0, 1),
        new Vector3(3, 4, 1)
      );
      
      // Length = sqrt(3^2 + 4^2) = 5
      expect(realization.getLength()).toBe(5);
    });

    it('should compute length for horizontal segment', () => {
      const realization = new Segment2DRealization2D(
        new Vector3(0, 0, 1),
        new Vector3(10, 0, 1)
      );
      
      expect(realization.getLength()).toBe(10);
    });

    it('should compute length for vertical segment', () => {
      const realization = new Segment2DRealization2D(
        new Vector3(0, 0, 1),
        new Vector3(0, 7, 1)
      );
      
      expect(realization.getLength()).toBe(7);
    });

    it('should compute length for diagonal segment', () => {
      const realization = new Segment2DRealization2D(
        new Vector3(0, 0, 1),
        new Vector3(1, 1, 1)
      );
      
      // Length = sqrt(2)
      expect(realization.getLength()).toBeCloseTo(Math.sqrt(2), 10);
    });

    it('should have zero length for degenerate segment', () => {
      const realization = new Segment2DRealization2D(
        new Vector3(5, 5, 1),
        new Vector3(5, 5, 1)
      );
      
      expect(realization.getLength()).toBe(0);
    });

    it('should store endpoints correctly', () => {
      const point1 = new Vector3(10, 20, 1);
      const point2 = new Vector3(30, 40, 1);
      const realization = new Segment2DRealization2D(point1, point2);
      
      expect(realization.point1.x).toBe(10);
      expect(realization.point1.y).toBe(20);
      expect(realization.point2.x).toBe(30);
      expect(realization.point2.y).toBe(40);
    });
  });
});
