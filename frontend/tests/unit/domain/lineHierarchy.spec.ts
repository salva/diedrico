/**
 * Tests for Line2D Hierarchy (Phase 22.5)
 * 
 * Verifies unified line hierarchy where all line-like elements extend Line2D base class:
 * - Line2DByTwoPoints (infinite lines)
 * - Segment2DByPoints (bounded segments)
 * - Guide2D (construction guides)
 * - HalfHingeLine2D (hinge projections)
 * 
 * Tests polymorphism, realization types, and bounded segment features.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Vector3 } from 'three';
import { World } from '../../../src/domain/world/World';
import { Line2D, Line2DByTwoPoints, Line2DRealization2D } from '../../../src/domain/world/Line';
import { Segment2DByPoints } from '../../../src/domain/world/Segment';
import { Guide2D } from '../../../src/domain/world/Guide';
import { HalfHingeLine2D } from '../../../src/domain/world/HingeLine';
import { getHorizontalPlane } from '../../helpers/worldHelpers';

describe('Line2D Hierarchy (Phase 22.5)', () => {
  let world: World;
  let planeH: any;
  let p1Id: string;
  let p2Id: string;

  beforeEach(() => {
    world = new World();
    // Get horizontal projection plane
    planeH = getHorizontalPlane(world);
    
    // Create test points using plane factory method
    const p1 = planeH.addFreePoint2D(new Vector3(0, 0, 1), world);
    const p2 = planeH.addFreePoint2D(new Vector3(10, 10, 1), world);
    
    p1Id = p1.id;
    p2Id = p2.id;
  });

  describe('Line2D base class', () => {
    it('Line2D should be abstract (cannot instantiate)', () => {
      // This is a compile-time check - TypeScript prevents instantiation of abstract classes
      // Just verify that concrete subclasses exist
      expect(Line2DByTwoPoints).toBeDefined();
      expect(Segment2DByPoints).toBeDefined();
    });

    it('all line types should extend Line2D', () => {
      const lineId = planeH.generateLine2DId(world);
      const segmentId = planeH.generateLine2DId(world);
      const guideId = planeH.generateLine2DId(world);
      const line = new Line2DByTwoPoints(lineId, p1Id, p2Id, planeH.id);
      const segment = new Segment2DByPoints(segmentId, p1Id, p2Id, planeH.id);
      const guide = new Guide2D(guideId, lineId, p1Id, planeH.id);

      expect(line).toBeInstanceOf(Line2D);
      expect(segment).toBeInstanceOf(Line2D);
      expect(guide).toBeInstanceOf(Line2D);
    });

    it('Line2D instances should have common properties', () => {
      const lineId = planeH.generateLine2DId(world);
      const line = new Line2DByTwoPoints(lineId, p1Id, p2Id, planeH.id, 'Test Line');
      
      expect(line.id).toBe(lineId);
      expect(line.planeId).toBe(planeH.id);
      expect(line.label).toBe('Test Line');
      expect(line.visible).toBe(true);
    });

    it('Line2D should have realize2D() method', () => {
      const lineId = planeH.generateLine2DId(world);
      const line = new Line2DByTwoPoints(lineId, p1Id, p2Id, planeH.id);
      
      // realize2D() is abstract method - concrete classes must implement it
      expect(typeof line.realize2D).toBe('function');
    });
  });

  describe('Line2DRealization2D unified realization', () => {
    it('should store infinite line as point1 (finite) + point2 (direction)', () => {
      const point1 = new Vector3(5, 5, 1);  // w=1 for finite point
      const point2 = new Vector3(1, 0, 0);  // w=0 for direction vector
      
      const realization = new Line2DRealization2D(point1, point2);
      
      expect(realization.point1.equals(point1)).toBe(true);
      expect(realization.point2.equals(point2)).toBe(true);
      expect(realization.point2.z).toBe(0);  // Direction has z=0
      expect(realization.feasible).toBe(true);
      expect(realization.isBounded()).toBe(false);  // Infinite line
    });

    it('should store segment as point1 + point2 (both finite)', () => {
      const point1 = new Vector3(0, 0, 1);   // Start point (z=1)
      const point2 = new Vector3(10, 10, 1); // End point (z=1)
      
      const realization = new Line2DRealization2D(point1, point2);
      
      expect(realization.point1.equals(point1)).toBe(true);
      expect(realization.point2.equals(point2)).toBe(true);
      expect(realization.point1.z).toBe(1);  // Finite point
      expect(realization.point2.z).toBe(1);  // Finite point
      expect(realization.isBounded()).toBe(true);  // Bounded segment
    });

    it('isBounded() should detect infinite lines vs segments by z coordinate', () => {
      // Infinite line: point2.z = 0 (direction)
      const lineRealization = new Line2DRealization2D(
        new Vector3(0, 0, 1),    // point1: finite
        new Vector3(1, 0, 0)     // point2: direction (z=0)
      );
      expect(lineRealization.isBounded()).toBe(false);
      
      // Segment: point2.z = 1 (finite endpoint)
      const segmentRealization = new Line2DRealization2D(
        new Vector3(0, 0, 1),    // point1: start
        new Vector3(10, 0, 1)    // point2: end (z=1)
      );
      expect(segmentRealization.isBounded()).toBe(true);
    });

    it('getLength() should return segment length', () => {
      const point1 = new Vector3(0, 0, 1);
      const point2 = new Vector3(10, 0, 1);
      
      const realization = new Line2DRealization2D(point1, point2);
      
      expect(realization.getLength()).toBe(10);
    });

    it('getLength() should return undefined for infinite lines', () => {
      const point1 = new Vector3(0, 0, 1);      // Finite point
      const point2 = new Vector3(1, 0, 0);      // Direction (z=0)
      
      const realization = new Line2DRealization2D(point1, point2);
      
      expect(realization.getLength()).toBeUndefined();
    });

    it('getLength() should compute diagonal lengths correctly', () => {
      const point1 = new Vector3(0, 0, 1);
      const point2 = new Vector3(3, 4, 1);
      
      const realization = new Line2DRealization2D(point1, point2);
      
      expect(realization.getLength()).toBe(5);  // 3-4-5 triangle
    });

    it('getDirection() should work for both lines and segments', () => {
      // Infinite line: point2 IS the direction (not normalized per data-model.md)
      const lineRealization = new Line2DRealization2D(
        new Vector3(0, 0, 1),
        new Vector3(1, 0, 0)  // Horizontal direction
      );
      const lineDir = lineRealization.getDirection();
      expect(lineDir.z).toBe(0);  // Direction has z=0
      expect(lineDir.x).toBe(1);  // Raw direction (NOT normalized)
      expect(lineDir.y).toBe(0);
      
      // Segment: direction computed from endpoints (NOT normalized per data-model.md)
      const segmentRealization = new Line2DRealization2D(
        new Vector3(0, 0, 1),
        new Vector3(10, 0, 1)
      );
      const segDir = segmentRealization.getDirection();
      expect(segDir.z).toBe(0);  // Direction has z=0
      expect(segDir.x).toBe(10);  // Raw direction (NOT normalized)
      expect(segDir.y).toBe(0);
    });
  });

  describe('Segment2DByPoints extends Line2D', () => {
    it('should be instance of Line2D', () => {
      const segmentId = planeH.generateLine2DId(world);
      const segment = new Segment2DByPoints(segmentId, p1Id, p2Id, planeH.id);
      
      expect(segment).toBeInstanceOf(Line2D);
      expect(segment.type).toBe('segment');
    });

    it('realize2D() should return Line2DRealization2D with endpoints', () => {
      const segmentId = planeH.generateLine2DId(world);
      const segment = new Segment2DByPoints(segmentId, p1Id, p2Id, planeH.id);
      const realization = segment.realize2D(world);
      
      expect(realization).toBeInstanceOf(Line2DRealization2D);
      expect(realization).not.toBeNull();
      expect(realization!.isBounded()).toBe(true);
      expect(realization!.point1).toBeDefined();
      expect(realization!.point2).toBeDefined();
    });

    it('segment realization endpoints should be finite points (w=1)', () => {
      const segmentId = planeH.generateLine2DId(world);
      const segment = new Segment2DByPoints(segmentId, p1Id, p2Id, planeH.id);
      const realization = segment.realize2D(world);
      
      expect(realization).not.toBeNull();
      // For segments, both point1 and point2 should be finite points (z=1)
      expect(realization!.point1.z).toBe(1);
      expect(realization!.point2.z).toBe(1);
      // Segments are bounded (both endpoints finite)
      expect(realization!.isBounded()).toBe(true);
    });

    it('should compute correct segment length', () => {
      const segmentId = planeH.generateLine2DId(world);
      const segment = new Segment2DByPoints(segmentId, p1Id, p2Id, planeH.id);
      const realization = segment.realize2D(world);
      
      expect(realization).not.toBeNull();
      const length = realization!.getLength();
      expect(length).toBeCloseTo(Math.sqrt(200), 5);  // sqrt((10-0)^2 + (10-0)^2)
    });
  });

  describe('Line2DByTwoPoints extends Line2D', () => {
    it('should be instance of Line2D', () => {
      const lineId = planeH.generateLine2DId(world);
      const line = new Line2DByTwoPoints(lineId, p1Id, p2Id, planeH.id);
      
      expect(line).toBeInstanceOf(Line2D);
      expect(line.type).toBe('by-two-points');
    });

    it('realize2D() should return Line2DRealization2D without endpoints', () => {
      const lineId = planeH.generateLine2DId(world);
      const line = new Line2DByTwoPoints(lineId, p1Id, p2Id, planeH.id);
      const realization = line.realize2D(world);
      
      expect(realization).toBeInstanceOf(Line2DRealization2D);
      expect(realization).not.toBeNull();
      expect(realization!.isBounded()).toBe(false);
      // For infinite lines: point1 is finite (z=1), point2 is direction (z=0)
      expect(realization!.point1).toBeDefined();
      expect(realization!.point2).toBeDefined();
      expect(realization!.point1.z).toBe(1);  // Finite point
      expect(realization!.point2.z).toBe(0);  // Direction vector
    });

    it('infinite line should have undefined length', () => {
      const lineId = planeH.generateLine2DId(world);
      const line = new Line2DByTwoPoints(lineId, p1Id, p2Id, planeH.id);
      const realization = line.realize2D(world);
      
      expect(realization).not.toBeNull();
      expect(realization!.getLength()).toBeUndefined();
    });
  });

  describe('Guide2D extends Line2D', () => {
    it('should be instance of Line2D', () => {
      const lineId = planeH.generateLine2DId(world);
      const guideId = planeH.generateLine2DId(world);
      const line = new Line2DByTwoPoints(lineId, p1Id, p2Id, planeH.id);
      planeH.addLine(line);
      
      const guide = new Guide2D(guideId, lineId, p1Id, planeH.id);
      
      expect(guide).toBeInstanceOf(Line2D);
      expect(guide.type).toBe('guide');
    });

    it('realize2D() should return Line2DRealization2D', () => {
      const lineId = planeH.generateLine2DId(world);
      const guideId = planeH.generateLine2DId(world);
      const line = new Line2DByTwoPoints(lineId, p1Id, p2Id, planeH.id);
      planeH.addLine(line);
      
      const guide = new Guide2D(guideId, lineId, p1Id, planeH.id);
      const realization = guide.realize2D(world);
      
      expect(realization).toBeInstanceOf(Line2DRealization2D);
    });
  });

  describe('Polymorphism - Line2D as common interface', () => {
    it('should store different line types in Line2D array', () => {
      const lineId = planeH.generateLine2DId(world);
      const segmentId = planeH.generateLine2DId(world);
      const lines: Line2D[] = [
        new Line2DByTwoPoints(lineId, p1Id, p2Id, planeH.id),
        new Segment2DByPoints(segmentId, p1Id, p2Id, planeH.id)
      ];
      
      expect(lines.length).toBe(2);
      lines.forEach(line => {
        expect(line).toBeInstanceOf(Line2D);
        expect(line.id).toBeDefined();
        expect(line.planeId).toBe(planeH.id);
      });
    });

    it('should distinguish line types via type property', () => {
      const lineId = planeH.generateLine2DId(world);
      const segmentId = planeH.generateLine2DId(world);
      const line = new Line2DByTwoPoints(lineId, p1Id, p2Id, planeH.id);
      const segment = new Segment2DByPoints(segmentId, p1Id, p2Id, planeH.id);
      
      expect(line.type).toBe('by-two-points');
      expect(segment.type).toBe('segment');
    });

    it('should call correct realize2D() implementation polymorphically', () => {
      const lineId = planeH.generateLine2DId(world);
      const segmentId = planeH.generateLine2DId(world);
      const lines: Line2D[] = [
        new Line2DByTwoPoints(lineId, p1Id, p2Id, planeH.id),
        new Segment2DByPoints(segmentId, p1Id, p2Id, planeH.id)
      ];
      
      const realizations = lines.map(line => line.realize2D(world));
      
      expect(realizations[0]).not.toBeNull();
      expect(realizations[1]).not.toBeNull();
      
      // Line should not be bounded
      expect(realizations[0]!.isBounded()).toBe(false);
      
      // Segment should be bounded
      expect(realizations[1]!.isBounded()).toBe(true);
    });
  });

  describe('Type narrowing and instanceof checks', () => {
    it('should narrow Line2D to Segment2DByPoints', () => {
      const segmentId = planeH.generateLine2DId(world);
      const line: Line2D = new Segment2DByPoints(segmentId, p1Id, p2Id, planeH.id);
      
      if (line instanceof Segment2DByPoints) {
        // TypeScript knows this is Segment2DByPoints now
        expect(line.point1Id).toBe(p1Id);
        expect(line.point2Id).toBe(p2Id);
      } else {
        throw new Error('Should be Segment2DByPoints');
      }
    });

    it('should narrow Line2D to Line2DByTwoPoints', () => {
      const lineId = planeH.generateLine2DId(world);
      const line: Line2D = new Line2DByTwoPoints(lineId, p1Id, p2Id, planeH.id);
      
      if (line instanceof Line2DByTwoPoints) {
        // TypeScript knows this is Line2DByTwoPoints now
        expect(line.point1Id).toBe(p1Id);
        expect(line.point2Id).toBe(p2Id);
        expect(line.type).toBe('by-two-points');
      } else {
        throw new Error('Should be Line2DByTwoPoints');
      }
    });

    it('should distinguish segments via type discriminator', () => {
      const segmentId = planeH.generateLine2DId(world);
      const line: Line2D = new Segment2DByPoints(segmentId, p1Id, p2Id, planeH.id);
      
      if (line.type === 'segment') {
        // TypeScript can narrow based on type discriminator
        const segment = line as Segment2DByPoints;
        expect(segment.point1Id).toBe(p1Id);
        expect(segment.point2Id).toBe(p2Id);
      } else {
        throw new Error('Should have type "segment"');
      }
    });
  });
});
