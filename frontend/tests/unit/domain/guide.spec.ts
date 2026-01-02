/**
 * Unit tests for Guide domain entities
 * 
 * Tests the Guide2D geometry classes:
 * - Guide2DPerpendicularToLine: Defines guide perpendicular to reference line through a point
 * - Guide2DRealization2D: Computed guide line geometry (point + direction)
 * - Perpendicular calculation using homogeneous coordinates
 * 
 * Reference: 
 * - specs/001-dihedral-learning-mvp/data-model.md#guide
 * - specs/001-dihedral-learning-mvp/spec.md#guides
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Vector3 } from 'three';
import { Guide2DPerpendicularToLine, Guide2DRealization2D } from '@/domain/world/Guide';
import { Line2DByTwoPoints } from '@/domain/world/Line';
import { FreePoint2D } from '@/domain/world/Point';
import { World } from '@/domain/world/World';

describe('Guide2D', () => {
  let world: World;
  let referenceLineId: string;
  let throughPointId: string;
  let point1Id: string;
  let point2Id: string;

  beforeEach(() => {
    world = new World();
    
    // Create reference line (horizontal line along X-axis)
    const p1 = new FreePoint2D('p1', new Vector3(0, 0, 1), 'proj_plane_H');
    const p2 = new FreePoint2D('p2', new Vector3(100, 0, 1), 'proj_plane_H');
    world.addPoint2D(p1);
    world.addPoint2D(p2);
    
    const referenceLine = new Line2DByTwoPoints('line1', 'p1', 'p2', 'proj_plane_H');
    world.addLine2D(referenceLine);
    
    // Create through-point above the line
    const throughPoint = new FreePoint2D('p3', new Vector3(50, 30, 1), 'proj_plane_H');
    world.addPoint2D(throughPoint);
    
    referenceLineId = 'line1';
    throughPointId = 'p3';
    point1Id = 'p1';
    point2Id = 'p2';
  });

  describe('Guide2DPerpendicularToLine', () => {
    it('should create guide with reference line and through-point', () => {
      const guide = new Guide2DPerpendicularToLine('g1', referenceLineId, throughPointId, 'proj_plane_H');
      
      expect(guide.id).toBe('g1');
      expect(guide.type).toBe('perpendicular-to-line');
      expect(guide.referenceLineId).toBe(referenceLineId);
      expect(guide.throughPointId).toBe(throughPointId);
      expect(guide.planeId).toBe('proj_plane_H');
    });

    it('should clone guide correctly', () => {
      const original = new Guide2DPerpendicularToLine('g1', referenceLineId, throughPointId, 'proj_plane_H');
      const cloned = original.clone();
      
      expect(cloned.id).toBe('g1');
      expect(cloned.referenceLineId).toBe(referenceLineId);
      expect(cloned.throughPointId).toBe(throughPointId);
      expect(cloned.planeId).toBe('proj_plane_H');
      expect(cloned).not.toBe(original);
    });

    it('should realize guide perpendicular to horizontal reference line', () => {
      // Reference line is horizontal (direction: 1, 0, 0)
      // Perpendicular guide should be vertical (direction: 0, 1, 0)
      const guide = world.addGuide2D('proj_plane_H', referenceLineId, throughPointId, 'g1');
      
      const realization = world.getGuide2DRealization('g1');
      
      expect(realization).toBeDefined();
      
      // Guide should pass through the through-point (50, 30, 1)
      expect(realization!.point.x).toBeCloseTo(50, 5);
      expect(realization!.point.y).toBeCloseTo(30, 5);
      
      // Direction should be perpendicular to horizontal line
      // Reference line direction: (1, 0, 0)
      // Perpendicular: (0, 1, 0) - vertical
      expect(realization!.direction.x).toBeCloseTo(0, 5);
      expect(realization!.direction.y).toBeCloseTo(1, 5);
      expect(realization!.direction.z).toBeCloseTo(0, 5);
    });

    it('should realize guide perpendicular to vertical reference line', () => {
      // Create vertical reference line
      const p3 = new FreePoint2D('p4', new Vector3(0, 0, 1), 'proj_plane_H');
      const p4 = new FreePoint2D('p5', new Vector3(0, 100, 1), 'proj_plane_H');
      world.addPoint2D(p3);
      world.addPoint2D(p4);
      
      const verticalLine = new Line2DByTwoPoints('line2', 'p4', 'p5', 'proj_plane_H');
      world.addLine2D(verticalLine);
      
      // Create through-point to the right of the vertical line
      const throughPoint2 = new FreePoint2D('p6', new Vector3(30, 50, 1), 'proj_plane_H');
      world.addPoint2D(throughPoint2);
      
      // Create guide perpendicular to vertical line
      const guide = world.addGuide2D('proj_plane_H', 'line2', 'p6', 'g2');
      
      const realization = world.getGuide2DRealization('g2');
      
      expect(realization).toBeDefined();
      
      // Guide should pass through the through-point (30, 50, 1)
      expect(realization!.point.x).toBeCloseTo(30, 5);
      expect(realization!.point.y).toBeCloseTo(50, 5);
      
      // Direction should be perpendicular to vertical line
      // Reference line direction: (0, 1, 0) - vertical
      // Perpendicular: (1, 0, 0) - horizontal (due to 90-degree rotation)
      // Note: (-dy, dx) = (-(1), 0) = (-1, 0), normalized
      expect(realization!.direction.x).toBeCloseTo(-1, 5);
      expect(realization!.direction.y).toBeCloseTo(0, 5);
      expect(realization!.direction.z).toBeCloseTo(0, 5);
    });

    it('should realize guide perpendicular to diagonal reference line', () => {
      // Create diagonal reference line (45 degrees)
      const p3 = new FreePoint2D('p4', new Vector3(0, 0, 1), 'proj_plane_H');
      const p4 = new FreePoint2D('p5', new Vector3(100, 100, 1), 'proj_plane_H');
      world.addPoint2D(p3);
      world.addPoint2D(p4);
      
      const diagonalLine = new Line2DByTwoPoints('line2', 'p4', 'p5', 'proj_plane_H');
      world.addLine2D(diagonalLine);
      
      // Create through-point
      const throughPoint2 = new FreePoint2D('p6', new Vector3(50, 50, 1), 'proj_plane_H');
      world.addPoint2D(throughPoint2);
      
      // Create guide perpendicular to diagonal line
      const guide = world.addGuide2D('proj_plane_H', 'line2', 'p6', 'g2');
      
      const realization = world.getGuide2DRealization('g2');
      
      expect(realization).toBeDefined();
      
      // Reference line direction: (1, 1, 0) normalized to (1/√2, 1/√2, 0)
      // Perpendicular: (-dy, dx) = (-1/√2, 1/√2) - perpendicular to 45° line
      const expectedDir = 1 / Math.sqrt(2);
      expect(realization!.direction.x).toBeCloseTo(-expectedDir, 5);
      expect(realization!.direction.y).toBeCloseTo(expectedDir, 5);
      expect(realization!.direction.z).toBeCloseTo(0, 5);
    });

    it('should throw error when reference line is missing', () => {
      expect(() => {
        world.addGuide2D('proj_plane_H', 'missing-line', throughPointId, 'g1');
      }).toThrow('Invalid referenceLineId');
    });

    it('should throw error when through-point is missing', () => {
      expect(() => {
        world.addGuide2D('proj_plane_H', referenceLineId, 'missing-point', 'g1');
      }).toThrow('Invalid throughPointId');
    });

    it('should use homogeneous coordinates for perpendicular calculation', () => {
      // This test verifies the perpendicular calculation uses the correct formula:
      // For direction vector (dx, dy, 0), perpendicular is (-dy, dx, 0)
      
      const guide = world.addGuide2D('proj_plane_H', referenceLineId, throughPointId, 'g1');
      
      const realization = world.getGuide2DRealization('g1');
      
      expect(realization).toBeDefined();
      
      // Verify z-component is 0 (direction vector, not a point)
      expect(realization!.direction.z).toBeCloseTo(0, 10);
      
      // Verify direction is normalized (length = 1)
      const length = Math.sqrt(
        realization!.direction.x ** 2 + 
        realization!.direction.y ** 2
      );
      expect(length).toBeCloseTo(1.0, 5);
    });
  });

  describe('Guide2DRealization2D', () => {
    it('should store point and direction correctly', () => {
      const point = new Vector3(10, 20, 1);
      const direction = new Vector3(0, 1, 0);
      
      const realization = new Guide2DRealization2D(point, direction);
      
      expect(realization.point.x).toBe(10);
      expect(realization.point.y).toBe(20);
      expect(realization.point.z).toBe(1);
      
      // Direction should be normalized
      expect(realization.direction.lengthSq()).toBeCloseTo(1.0, 5);
    });

    it('should inherit from Line2DRealization2D', () => {
      const point = new Vector3(0, 0, 1);
      const direction = new Vector3(1, 0, 0);
      
      const realization = new Guide2DRealization2D(point, direction);
      
      // Should have getPointAt method from Line2DRealization2D
      const pointAt5 = realization.getPointAt(5);
      expect(pointAt5.x).toBeCloseTo(5, 5);
      expect(pointAt5.y).toBeCloseTo(0, 5);
    });
  });
});
