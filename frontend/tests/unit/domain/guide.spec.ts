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
import type { World } from '@/domain/world/World';
import { createTestWorld } from '../../helpers/worldHelpers';
import { getHorizontalPlane, getHorizontalPlaneId, getVerticalPlane, getVerticalPlaneId, getMainHingeLine } from '../../helpers/worldHelpers';

describe('Guide2D', () => {
  let world: World;
  let referenceLineId: string;
  let throughPointId: string;
  let point1Id: string;
  let point2Id: string;

  beforeEach(() => {
    const { world: w } = createTestWorld();
    world = w;
    const plane = getHorizontalPlane(world);
    const planeId = getHorizontalPlaneId(world);
    
    // Create reference line (horizontal line along X-axis)
    const p1 = new FreePoint2D(world.getConstructionService().generatePoint2DId(plane), new Vector3(0, 0, 1), planeId);
    const p2 = new FreePoint2D(world.getConstructionService().generatePoint2DId(plane), new Vector3(100, 0, 1), planeId);
    plane.addPoint(p1);
    plane.addPoint(p2);
    
    const referenceLine = new Line2DByTwoPoints(world.getConstructionService().generateLine2DId(plane), p1.id, p2.id, planeId);
    plane.addLine(referenceLine);
    
    // Create through-point above the line
    const throughPoint = new FreePoint2D(world.getConstructionService().generatePoint2DId(plane), new Vector3(50, 30, 1), planeId);
    plane.addPoint(throughPoint);
    
    referenceLineId = referenceLine.id;
    throughPointId = throughPoint.id;
    point1Id = p1.id;
    point2Id = p2.id;
  });

  describe('Guide2D', () => {
    it('should create guide with reference line and through-point', () => {
      const plane = getHorizontalPlane(world);
      const planeId = getHorizontalPlaneId(world);
      const guideId = world.getConstructionService().generateLine2DId(plane);
      const guide = new Guide2D(guideId, referenceLineId, throughPointId, planeId);
      
      expect(guide.id).toBe(guideId);
      expect(guide).toBeInstanceOf(Guide2D);
      expect(guide.referenceLineId).toBe(referenceLineId);
      expect(guide.throughPointId).toBe(throughPointId);
      expect(guide.planeId).toBe(planeId);
    });

    it('should clone guide correctly', () => {
      const plane = getHorizontalPlane(world);
      const planeId = getHorizontalPlaneId(world);
      const guideId = world.getConstructionService().generateLine2DId(plane);
      const original = new Guide2D(guideId, referenceLineId, throughPointId, planeId);
      const cloned = original.clone();
      
      expect(cloned.id).toBe(guideId);
      expect(cloned.referenceLineId).toBe(referenceLineId);
      expect(cloned.throughPointId).toBe(throughPointId);
      expect(cloned.planeId).toBe(planeId);
      expect(cloned).not.toBe(original);
    });

    it('should realize guide perpendicular to horizontal reference line', () => {
      // Reference line is horizontal (direction: 1, 0, 0)
      // Perpendicular guide should be vertical (direction: 0, 1, 0)
      const plane = getHorizontalPlane(world);
      const guide = world.getConstructionService().addGuide2D(plane, referenceLineId, throughPointId);
      
      const realization = guide.realize2D(world);
      
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
      const plane = getHorizontalPlane(world);
      const planeId = getHorizontalPlaneId(world);
      const p3 = world.getConstructionService().addFreePoint2D(plane, new Vector3(0, 0, 1));
      const p4 = world.getConstructionService().addFreePoint2D(plane, new Vector3(0, 100, 1));
      
      const verticalLine = world.getConstructionService().addLine2DBetweenTwoPoints(plane, p3.id, p4.id);
      
      // Create through-point to the right of the vertical line
      const throughPoint2 = world.getConstructionService().addFreePoint2D(plane, new Vector3(30, 50, 1));
      
      // Create guide perpendicular to vertical line
      const guide = world.getConstructionService().addGuide2D(plane, verticalLine.id, throughPoint2.id);
      
      const realization = guide.realize2D(world);
      
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
      const plane = getHorizontalPlane(world);
      const p3 = world.getConstructionService().addFreePoint2D(plane, new Vector3(0, 0, 1));
      const p4 = world.getConstructionService().addFreePoint2D(plane, new Vector3(100, 100, 1));
      
      const diagonalLine = world.getConstructionService().addLine2DBetweenTwoPoints(plane, p3.id, p4.id);
      
      // Create through-point
      const throughPoint2 = world.getConstructionService().addFreePoint2D(plane, new Vector3(50, 50, 1));
      
      // Create guide perpendicular to diagonal line
      const guide = world.getConstructionService().addGuide2D(plane, diagonalLine.id, throughPoint2.id);
      
      const realization = guide.realize2D(world);
      
      expect(realization).toBeDefined();
      
      // Reference line direction: (100, 100, 0) unnormalized
      // Perpendicular: (-100, 100, 0) - perpendicular to 45° line, unnormalized
      expect(realization!.point2.x).toBeCloseTo(-100, 5);
      expect(realization!.point2.y).toBeCloseTo(100, 5);
      expect(realization!.point2.z).toBeCloseTo(0, 5);
    });

    it('should throw error when reference line is missing', () => {
      const plane = getHorizontalPlane(world);
      const planeId = getHorizontalPlaneId(world);
      const missingLineId = `${planeId}/missing-line`;
      expect(() => {
        world.getConstructionService().addGuide2D(plane, missingLineId, throughPointId);
      }).toThrow('Invalid referenceLineId');
    });

    it('should throw error when through-point is missing', () => {
      const plane = getHorizontalPlane(world);
      const planeId = getHorizontalPlaneId(world);
      const missingPointId = `${planeId}/missing-point`;
      expect(() => {
        world.getConstructionService().addGuide2D(plane, referenceLineId, missingPointId);
      }).toThrow('Invalid throughPointId');
    });

    it('should use homogeneous coordinates for perpendicular calculation', () => {
      // This test verifies the perpendicular calculation uses the correct formula:
      // For direction vector (dx, dy, 0), perpendicular is (-dy, dx, 0)
      const plane = getHorizontalPlane(world);
      const guide = world.getConstructionService().addGuide2D(plane, referenceLineId, throughPointId);
      
      const realization = guide.realize2D(world);
      
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

  describe('SiblingGuide2D (Phase 36 - Refactored)', () => {
    it('should create sibling guide with primary guide reference (no throughPointId)', () => {
      // Create a sibling guide using coordinate correspondence pattern
      const plane = world.getProjectionPlaneByLabel('P_V');
      const planeId = plane.id!;
      const guideId = world.getConstructionService().generateLine2DId(plane);
      const primaryGuideId = world.getConstructionService().generateLine2DId(getHorizontalPlane(world));
      const siblingGuide = new SiblingGuide2D(
        guideId,
        referenceLineId,
        planeId,  // Sibling plane
        primaryGuideId,  // Primary guide ID
        'Test Guide'
      );
      
      expect(siblingGuide.id).toBe(guideId);
      expect(siblingGuide).toBeInstanceOf(SiblingGuide2D);
      expect(siblingGuide.referenceLineId).toBe(referenceLineId);
      expect(siblingGuide.planeId).toBe(planeId);
      expect(siblingGuide.primaryGuideId).toBe(primaryGuideId);
      expect(siblingGuide.label).toBe('Test Guide');
      // throughPointId should not exist
      expect((siblingGuide as any).throughPointId).toBeUndefined();
    });

    it('should clone sibling guide correctly', () => {
      const plane = world.getProjectionPlaneByLabel('P_V');
      const planeId = plane.id!;
      const guideId = world.getConstructionService().generateLine2DId(plane);
      const primaryGuideId = world.getConstructionService().generateLine2DId(getHorizontalPlane(world));
      const original = new SiblingGuide2D(guideId, referenceLineId, planeId, primaryGuideId, 'Test');
      const cloned = original.clone();
      
      expect(cloned.id).toBe(guideId);
      expect(cloned.referenceLineId).toBe(referenceLineId);
      expect(cloned.planeId).toBe(planeId);
      expect(cloned.primaryGuideId).toBe(primaryGuideId);
      expect(cloned.label).toBe('Test');
      expect(cloned).not.toBe(original);
      expect((cloned as any).throughPointId).toBeUndefined();
    });

    it('should realize sibling guide using coordinate correspondence with primary guide', () => {
      // Setup: Create primary guide in plane H that intersects half_HL_HV_on_PH at (50, 0, 1)
      const planeH = getHorizontalPlane(world);
      const planeHId = getHorizontalPlaneId(world);
      
      // Get the horizontal half hinge line
      const halfHLH = world.getHalfHingeLines2D(planeHId)[0];
      
      // Create a through-point for the primary guide at (50, 30, 1)
      const throughPoint = world.getConstructionService().addFreePoint2D(planeH, new Vector3(50, 30, 1));
      
      // Create primary guide perpendicular to half_HL_HV_on_PH, passing through (50, 30, 1)
      // half_HL_HV_on_PH is at (0, 0, 1) with direction (1, 0, 0) - horizontal
      // Primary guide will be vertical passing through (50, 30, 1)
      // It intersects half_HL_HV_on_PH at (50, 0, 1)
      const primaryGuide = world.getConstructionService().addGuide2D(planeH, halfHLH.id, throughPoint.id);
      
      // Verify primary guide realization
      const primaryRealization = primaryGuide.realize2D(world);
      expect(primaryRealization).toBeDefined();
      expect(primaryRealization!.feasible).toBe(true);
      
      // Create sibling guide in plane V
      // It should use coordinate correspondence: primary intersects its HalfHL at (50, 0, 1)
      // Sibling should use SAME (50, 0, 1) on half_HL_HV_on_PV and be perpendicular to it
      const planeV = getVerticalPlane(world);
      const planeVId = getVerticalPlaneId(world);
      const halfHLV = world.getHalfHingeLines2D(planeVId)[0];
      const siblingGuide = new SiblingGuide2D(world.getConstructionService().generateLine2DId(planeV), halfHLV.id, planeVId, primaryGuide.id);
      planeV.addLine(siblingGuide);
      
      // Verify sibling guide realization
      const siblingRealization = siblingGuide.realize2D(world);
      expect(siblingRealization).toBeDefined();
      expect(siblingRealization!.feasible).toBe(true);
      
      // Sibling guide should pass through (50, 0, 1) - the twin position
      // This is where primary guide intersects its HalfHingeLine
      expect(siblingRealization!.point1.x).toBeCloseTo(50, 5);
      expect(siblingRealization!.point1.y).toBeCloseTo(0, 5);
      expect(siblingRealization!.point1.z).toBeCloseTo(1, 5);
      
      // Sibling guide should be perpendicular to half_HL_HV_on_PV (horizontal)
      // half_HL_HV_on_PV has direction (1, 0, 0), so perpendicular is (0, 1, 0)
      expect(siblingRealization!.point2.x).toBeCloseTo(0, 5);
      expect(siblingRealization!.point2.y).toBeCloseTo(1, 5);
      expect(siblingRealization!.point2.z).toBeCloseTo(0, 5);
    });

    it('should have bidirectional links between Guide2D and SiblingGuide2D', () => {
      const planeH = getHorizontalPlane(world);
      const planeHId = getHorizontalPlaneId(world);
      const planeV = world.getProjectionPlaneByLabel('P_V');
      const planeVId = planeV.id!;
      const guideId = world.getConstructionService().generateLine2DId(planeH);
      const siblingId = world.getConstructionService().generateLine2DId(planeV);
      
      // Create primary guide with siblingGuideId
      const primaryGuide = new Guide2D(guideId, referenceLineId, throughPointId, planeHId, 'Primary', siblingId);
      expect(primaryGuide.siblingGuideId).toBe(siblingId);
      
      // Create sibling guide with primaryGuideId (no throughPointId parameter)
      const siblingGuide = new SiblingGuide2D(siblingId, referenceLineId, planeVId, guideId);
      expect(siblingGuide.primaryGuideId).toBe(guideId);
    });

    it('should use isSiblingGuide2D type guard correctly', () => {
      const planeH = getHorizontalPlane(world);
      const planeHId = getHorizontalPlaneId(world);
      const planeV = world.getProjectionPlaneByLabel('P_V');
      const planeVId = planeV.id!;
      const guideId = world.getConstructionService().generateLine2DId(planeH);
      const siblingId = world.getConstructionService().generateLine2DId(planeV);
      
      const primaryGuide = new Guide2D(guideId, referenceLineId, throughPointId, planeHId);
      const siblingGuide = new SiblingGuide2D(siblingId, referenceLineId, planeVId, guideId);
      
      expect(isSiblingGuide2D(siblingGuide)).toBe(true);
      expect(isSiblingGuide2D(primaryGuide)).toBe(false);
    });
  });
});
