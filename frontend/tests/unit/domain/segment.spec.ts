/**
 * Unit tests for Segment domain entities
 * 
 * Tests the Segment2D geometry classes:
 * - Segment2DByPoints: Defines segment by two point IDs
 * - Segment2DRealization: Computed segment with endpoints in plane coordinates
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Vector3 } from 'three';
import { Segment2DByPoints, Segment2DRealization } from '@/domain/world/Segment';
import { FreePoint2D, Point2DRealization } from '@/domain/world/Point';
import { World } from '@/domain/world/World';

describe('Segment2D', () => {
  let world: World;
  let point1Id: string;
  let point2Id: string;

  beforeEach(() => {
    world = new World();
    
    // Create two test points
    const point1 = new FreePoint2D('p1', new Vector3(0, 0, 1), 'plane_H');
    const point2 = new FreePoint2D('p2', new Vector3(100, 50, 1), 'plane_H');
    
    world.addPoint(point1);
    world.addPoint(point2);
    
    point1Id = 'p1';
    point2Id = 'p2';
  });

  describe('Segment2DByPoints', () => {
    it('should create segment with point references', () => {
      const segment = new Segment2DByPoints('seg1', point1Id, point2Id, 'plane_H');
      
      expect(segment.id).toBe('seg1');
      expect(segment.type).toBe('by-points');
      expect(segment.point1Id).toBe(point1Id);
      expect(segment.point2Id).toBe(point2Id);
      expect(segment.planeId).toBe('plane_H');
    });

    it('should clone segment correctly', () => {
      const original = new Segment2DByPoints('seg1', point1Id, point2Id, 'plane_H');
      const cloned = original.clone();
      
      expect(cloned.id).toBe('seg1');
      expect(cloned.point1Id).toBe(point1Id);
      expect(cloned.point2Id).toBe(point2Id);
      expect(cloned.planeId).toBe('plane_H');
      expect(cloned).not.toBe(original);
    });

    it('should realize segment with valid points', () => {
      const segment = new Segment2DByPoints('seg1', point1Id, point2Id, 'plane_H');
      
      // Use World's method which handles the realization properly
      world.addSegment(segment);
      const realization = world.getSegment2DRealization('seg1');
      
      expect(realization).toBeDefined();
      expect(realization!.point1.x).toBe(0);
      expect(realization!.point1.y).toBe(0);
      expect(realization!.point2.x).toBe(100);
      expect(realization!.point2.y).toBe(50);
    });

    it('should return null when first point is missing', () => {
      const segment = new Segment2DByPoints('seg1', 'missing', point2Id, 'plane_H');
      
      world.addSegment(segment);
      const realization = world.getSegment2DRealization('seg1');
      
      expect(realization).toBeNull();
    });

    it('should return null when second point is missing', () => {
      const segment = new Segment2DByPoints('seg1', point1Id, 'missing', 'plane_H');
      
      world.addSegment(segment);
      const realization = world.getSegment2DRealization('seg1');
      
      expect(realization).toBeNull();
    });

    it('should return null when both points are missing', () => {
      const segment = new Segment2DByPoints('seg1', 'missing1', 'missing2', 'plane_H');
      
      world.addSegment(segment);
      const realization = world.getSegment2DRealization('seg1');
      
      expect(realization).toBeNull();
    });

    it('should detect degenerate segment (coincident points)', () => {
      // Create two coincident points
      const point3 = new FreePoint2D('p3', new Vector3(50, 50, 1), 'plane_H');
      const point4 = new FreePoint2D('p4', new Vector3(50, 50, 1), 'plane_H');
      world.addPoint(point3);
      world.addPoint(point4);
      
      const segment = new Segment2DByPoints('seg1', 'p3', 'p4', 'plane_H');
      world.addSegment(segment);
      const realization = world.getSegment2DRealization('seg1');
      
      // Degenerate segments return null
      expect(realization).toBeNull();
    });
  });

  describe('Segment2DRealization', () => {
    it('should compute segment length', () => {
      const realization = new Segment2DRealization(
        new Vector3(0, 0, 1),
        new Vector3(3, 4, 1)
      );
      
      // Length = sqrt(3^2 + 4^2) = 5
      expect(realization.getLength()).toBe(5);
    });

    it('should compute length for horizontal segment', () => {
      const realization = new Segment2DRealization(
        new Vector3(0, 0, 1),
        new Vector3(10, 0, 1)
      );
      
      expect(realization.getLength()).toBe(10);
    });

    it('should compute length for vertical segment', () => {
      const realization = new Segment2DRealization(
        new Vector3(0, 0, 1),
        new Vector3(0, 7, 1)
      );
      
      expect(realization.getLength()).toBe(7);
    });

    it('should compute length for diagonal segment', () => {
      const realization = new Segment2DRealization(
        new Vector3(0, 0, 1),
        new Vector3(1, 1, 1)
      );
      
      // Length = sqrt(2)
      expect(realization.getLength()).toBeCloseTo(Math.sqrt(2), 10);
    });

    it('should have zero length for degenerate segment', () => {
      const realization = new Segment2DRealization(
        new Vector3(5, 5, 1),
        new Vector3(5, 5, 1)
      );
      
      expect(realization.getLength()).toBe(0);
    });

    it('should store endpoints correctly', () => {
      const point1 = new Vector3(10, 20, 1);
      const point2 = new Vector3(30, 40, 1);
      const realization = new Segment2DRealization(point1, point2);
      
      expect(realization.point1.x).toBe(10);
      expect(realization.point1.y).toBe(20);
      expect(realization.point2.x).toBe(30);
      expect(realization.point2.y).toBe(40);
    });
  });
});
