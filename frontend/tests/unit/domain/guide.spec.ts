/**
 * Unit tests for Guide domain entities
 * 
 * Tests the Guide2D geometry classes:
 * - Guide2DPerpendicularToLine: Defines guide perpendicular to reference line through a point
 * - Line2DRealization2D: Computed guide line geometry (point + direction)
 *   NOTE: Guides use Line2DRealization2D directly per Phase 34 architectural principle
 * - Perpendicular calculation using homogeneous coordinates
 * 
 * Reference: 
 * - specs/001-dihedral-learning-mvp/data-model.md#guide
 * - specs/001-dihedral-learning-mvp/spec.md#guides
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Vector3 } from 'three';
import { Guide2D, SiblingGuide2D, isSiblingGuide2D } from '@/domain/world/Guide';
import { Line2DByTwoPoints, Line2DRealization2D } from '@/domain/world/Line';
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
    const plane = world.getProjectionPlaneById('proj_plane_H')!;
    
    // Create reference line (horizontal line along X-axis)
    const p1 = new FreePoint2D('p1', new Vector3(0, 0, 1), 'proj_plane_H');
    const p2 = new FreePoint2D('p2', new Vector3(100, 0, 1), 'proj_plane_H');
    plane.addPoint(p1);
    plane.addPoint(p2);
    
    const referenceLine = new Line2DByTwoPoints('line1', 'p1', 'p2', 'proj_plane_H');
    plane.addLine(referenceLine);
    
    // Create through-point above the line
    const throughPoint = new FreePoint2D('p3', new Vector3(50, 30, 1), 'proj_plane_H');
    plane.addPoint(throughPoint);
    
    referenceLineId = 'line1';
    throughPointId = 'p3';
    point1Id = 'p1';
    point2Id = 'p2';
  });

  describe('Guide2D', () => {
    it('should create guide with reference line and through-point', () => {
      const guide = new Guide2D('g1', referenceLineId, throughPointId, 'proj_plane_H');
      
      expect(guide.id).toBe('g1');
      expect(guide.type).toBe('perpendicular-to-line');
      expect(guide.referenceLineId).toBe(referenceLineId);
      expect(guide.throughPointId).toBe(throughPointId);
      expect(guide.planeId).toBe('proj_plane_H');
    });

    it('should clone guide correctly', () => {
      const original = new Guide2D('g1', referenceLineId, throughPointId, 'proj_plane_H');
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
      const plane = world.getProjectionPlaneById('proj_plane_H')!;
      const guide = plane.addGuide2D(referenceLineId, throughPointId, world, 'g1');
      
      const realization = world.getLine2DRealization('g1');
      
      expect(realization).toBeDefined();
      
      // Guide should pass through the through-point (50, 30, 1)
      expect(realization!.point1.x).toBeCloseTo(50, 5);
      expect(realization!.point1.y).toBeCloseTo(30, 5);
      
      // point2 is perpendicular direction to horizontal line
      // Reference line direction: (100, 0, 0) unnormalized
      // Perpendicular: (0, 100, 0) - vertical, z=0, unnormalized
      expect(realization!.point2.x).toBeCloseTo(0, 5);
      expect(realization!.point2.y).toBeCloseTo(100, 5);
      expect(realization!.point2.z).toBeCloseTo(0, 5);
    });

    it('should realize guide perpendicular to vertical reference line', () => {
      // Create vertical reference line
      const plane = world.getProjectionPlaneById('proj_plane_H')!;
      const p3 = new FreePoint2D('p4', new Vector3(0, 0, 1), 'proj_plane_H');
      const p4 = new FreePoint2D('p5', new Vector3(0, 100, 1), 'proj_plane_H');
      plane.addPoint(p3);
      plane.addPoint(p4);
      
      const verticalLine = new Line2DByTwoPoints('line2', 'p4', 'p5', 'proj_plane_H');
      plane.addLine(verticalLine);
      
      // Create through-point to the right of the vertical line
      const throughPoint2 = new FreePoint2D('p6', new Vector3(30, 50, 1), 'proj_plane_H');
      plane.addPoint(throughPoint2);
      
      // Create guide perpendicular to vertical line
      const guide = plane.addGuide2D('line2', 'p6', world, 'g2');
      
      const realization = world.getLine2DRealization('g2');
      
      expect(realization).toBeDefined();
      
      // Guide should pass through the through-point (30, 50, 1)
      expect(realization!.point1.x).toBeCloseTo(30, 5);
      expect(realization!.point1.y).toBeCloseTo(50, 5);
      
      // point2 is perpendicular direction to vertical line
      // Reference line direction: (0, 100, 0) - vertical, unnormalized
      // Perpendicular: (-100, 0, 0) - horizontal (due to 90-degree rotation)
      // Note: (-dy, dx) = (-(100), 0) = (-100, 0), unnormalized
      expect(realization!.point2.x).toBeCloseTo(-100, 5);
      expect(realization!.point2.y).toBeCloseTo(0, 5);
      expect(realization!.point2.z).toBeCloseTo(0, 5);
    });

    it('should realize guide perpendicular to diagonal reference line', () => {
      // Create diagonal reference line (45 degrees)
      const plane = world.getProjectionPlaneById('proj_plane_H')!;
      const p3 = new FreePoint2D('p4', new Vector3(0, 0, 1), 'proj_plane_H');
      const p4 = new FreePoint2D('p5', new Vector3(100, 100, 1), 'proj_plane_H');
      plane.addPoint(p3);
      plane.addPoint(p4);
      
      const diagonalLine = new Line2DByTwoPoints('line2', 'p4', 'p5', 'proj_plane_H');
      plane.addLine(diagonalLine);
      
      // Create through-point
      const throughPoint2 = new FreePoint2D('p6', new Vector3(50, 50, 1), 'proj_plane_H');
      plane.addPoint(throughPoint2);
      
      // Create guide perpendicular to diagonal line
      const guide = plane.addGuide2D('line2', 'p6', world, 'g2');
      
      const realization = world.getLine2DRealization('g2');
      
      expect(realization).toBeDefined();
      
      // Reference line direction: (100, 100, 0) unnormalized
      // Perpendicular: (-100, 100, 0) - perpendicular to 45° line, unnormalized
      expect(realization!.point2.x).toBeCloseTo(-100, 5);
      expect(realization!.point2.y).toBeCloseTo(100, 5);
      expect(realization!.point2.z).toBeCloseTo(0, 5);
    });

    it('should throw error when reference line is missing', () => {
      const plane = world.getProjectionPlaneById('proj_plane_H')!;
      expect(() => {
        plane.addGuide2D('missing-line', throughPointId, world, 'g1');
      }).toThrow('Invalid referenceLineId');
    });

    it('should throw error when through-point is missing', () => {
      const plane = world.getProjectionPlaneById('proj_plane_H')!;
      expect(() => {
        plane.addGuide2D(referenceLineId, 'missing-point', world, 'g1');
      }).toThrow('Invalid throughPointId');
    });

    it('should use homogeneous coordinates for perpendicular calculation', () => {
      // This test verifies the perpendicular calculation uses the correct formula:
      // For direction vector (dx, dy, 0), perpendicular is (-dy, dx, 0)
      const plane = world.getProjectionPlaneById('proj_plane_H')!;
      const guide = plane.addGuide2D(referenceLineId, throughPointId, world, 'g1');
      
      const realization = world.getLine2DRealization('g1');
      
      expect(realization).toBeDefined();
      
      // Verify z-component is 0 (direction vector, not a point)
      expect(realization!.point2.z).toBeCloseTo(0, 10);
      
      // Verify perpendicular relationship: for horizontal line (100, 0, 0)
      // perpendicular should be (0, 100, 0)
      expect(realization!.point2.x).toBeCloseTo(0, 5);
      expect(realization!.point2.y).toBeCloseTo(100, 5);
    });
  });

  // NOTE: Guide2DRealization2D class removed in Phase 34
  // Guides now use Line2DRealization2D directly per architectural principle
  // Test removed as class no longer exists

  describe('SiblingGuide2D (Phase 36)', () => {
    it('should create sibling guide with primary guide reference', () => {
      // Create a sibling guide
      const siblingGuide = new SiblingGuide2D(
        'sg1',
        referenceLineId,
        throughPointId,
        'proj_plane_V',  // Sibling plane
        'g1',  // Primary guide ID
        'Test Guide'
      );
      
      expect(siblingGuide.id).toBe('sg1');
      expect(siblingGuide.type).toBe('sibling-guide');
      expect(siblingGuide.referenceLineId).toBe(referenceLineId);
      expect(siblingGuide.throughPointId).toBe(throughPointId);
      expect(siblingGuide.planeId).toBe('proj_plane_V');
      expect(siblingGuide.primaryGuideId).toBe('g1');
      expect(siblingGuide.label).toBe('Test Guide');
    });

    it('should clone sibling guide correctly', () => {
      const original = new SiblingGuide2D('sg1', referenceLineId, throughPointId, 'proj_plane_V', 'g1', 'Test');
      const cloned = original.clone();
      
      expect(cloned.id).toBe('sg1');
      expect(cloned.referenceLineId).toBe(referenceLineId);
      expect(cloned.throughPointId).toBe(throughPointId);
      expect(cloned.planeId).toBe('proj_plane_V');
      expect(cloned.primaryGuideId).toBe('g1');
      expect(cloned.label).toBe('Test');
      expect(cloned).not.toBe(original);
    });

    it('should realize sibling guide perpendicular to reference line (same as Guide2D)', () => {
      // Create reference line in plane V (horizontal)
      const planeV = world.getProjectionPlaneById('proj_plane_V')!;
      const p1V = new FreePoint2D('p1v', new Vector3(0, 0, 1), 'proj_plane_V');
      const p2V = new FreePoint2D('p2v', new Vector3(100, 0, 1), 'proj_plane_V');
      planeV.addPoint(p1V);
      planeV.addPoint(p2V);
      
      const refLineV = new Line2DByTwoPoints('lineV', 'p1v', 'p2v', 'proj_plane_V');
      planeV.addLine(refLineV);
      
      // Create through-point
      const throughPointV = new FreePoint2D('p3v', new Vector3(50, 30, 1), 'proj_plane_V');
      planeV.addPoint(throughPointV);
      
      // Create sibling guide
      const siblingGuide = new SiblingGuide2D('sg1', 'lineV', 'p3v', 'proj_plane_V', 'g1');
      planeV.addLine(siblingGuide);
      
      const realization = world.getLine2DRealization('sg1');
      
      expect(realization).toBeDefined();
      
      // Guide should pass through the through-point (50, 30, 1)
      expect(realization!.point1.x).toBeCloseTo(50, 5);
      expect(realization!.point1.y).toBeCloseTo(30, 5);
      
      // Perpendicular direction should be vertical (0, 100, 0)
      expect(realization!.point2.x).toBeCloseTo(0, 5);
      expect(realization!.point2.y).toBeCloseTo(100, 5);
      expect(realization!.point2.z).toBeCloseTo(0, 5);
    });

    it('should have bidirectional links between Guide2D and SiblingGuide2D', () => {
      // Create primary guide with siblingGuideId
      const primaryGuide = new Guide2D('g1', referenceLineId, throughPointId, 'proj_plane_H', 'Primary', 'sg1');
      expect(primaryGuide.siblingGuideId).toBe('sg1');
      
      // Create sibling guide with primaryGuideId
      const siblingGuide = new SiblingGuide2D('sg1', referenceLineId, throughPointId, 'proj_plane_V', 'g1');
      expect(siblingGuide.primaryGuideId).toBe('g1');
    });

    it('should use isSiblingGuide2D type guard correctly', () => {
      const primaryGuide = new Guide2D('g1', referenceLineId, throughPointId, 'proj_plane_H');
      const siblingGuide = new SiblingGuide2D('sg1', referenceLineId, throughPointId, 'proj_plane_V', 'g1');
      
      expect(isSiblingGuide2D(siblingGuide)).toBe(true);
      expect(isSiblingGuide2D(primaryGuide)).toBe(false);
    });
  });
});
