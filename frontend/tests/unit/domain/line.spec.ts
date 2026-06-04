/**
 * Unit tests for Line2D classes
 * 
 * Tests:
 * - Line2DRealization2D parametric representation
 * - Line2DByTwoPoints creation and realization
 * - Clone functionality
 * - Edge cases (degenerate lines, missing points)
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md#line2d
 */

import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import {
  Line2DRealization2D,
  Line2DByTwoPoints
} from '@/domain/world/Line';
import { createTestWorld } from '../../helpers/worldHelpers';

describe('Line2DRealization2D', () => {
  it('should store point and direction', () => {
    const point1 = new Vector3(1, 2, 1);
    const point2 = new Vector3(3, 4, 0);  // Direction vector (z=0)
    
    const realization = new Line2DRealization2D(point1, point2);
    
    expect(realization.point1).toEqual(point1);
    expect(realization.point2).toEqual(point2);
    expect(realization.point2.z).toBe(0); // Direction has no translation (point2.z === 0)
  });
});

describe('Line2DByTwoPoints', () => {
  it('should create line with required properties', () => {
    const line = new Line2DByTwoPoints(
      'P_H/line1',
      'P_H/point1',
      'P_H/point2',
      'P_H',
      'Line AB'
    );
    
    expect(line.id).toBe('P_H/line1');
    expect(line).toBeInstanceOf(Line2DByTwoPoints);
    expect(line.point1Id).toBe('P_H/point1');
    expect(line.point2Id).toBe('P_H/point2');
    expect(line.planeId).toBe('P_H');
    expect(line.label).toBe('Line AB');
  });

  it('should create line without label', () => {
    const line = new Line2DByTwoPoints(
      'P_V/line1',
      'P_V/point1',
      'P_V/point2',
      'P_V'
    );
    
    expect(line.id).toBe('P_V/line1');
    expect(line.label).toBeUndefined();
  });

  it('should clone line with all properties', () => {
    const original = new Line2DByTwoPoints(
      'P_H/line1',
      'P_H/point1',
      'P_H/point2',
      'P_H',
      'Line AB'
    );
    
    const clone = original.clone();
    
    expect(clone.id).toBe(original.id);
    expect(clone.type).toBe(original.type);
    expect(clone.point1Id).toBe(original.point1Id);
    expect(clone.point2Id).toBe(original.point2Id);
    expect(clone.planeId).toBe(original.planeId);
    expect(clone.label).toBe(original.label);
    
    // Should be different object
    expect(clone).not.toBe(original);
  });

  it('should realize line from two points', () => {
    const { world } = createTestWorld();
    const plane = world.getProjectionPlaneByLabel('P_H')!;
    const p1 = world.getConstructionService().addFreePoint2D(plane, new Vector3(0, 0, 1));
    const p2 = world.getConstructionService().addFreePoint2D(plane, new Vector3(10, 0, 1));
    
    const line = world.getConstructionService().addLine2DBetweenTwoPoints(plane, p1.id, p2.id);
    
    const realization = line.realize2D(world);
    
    expect(realization).not.toBeNull();
    expect(realization!.point1.x).toBeCloseTo(0, 10);
    expect(realization!.point1.y).toBeCloseTo(0, 10);
    expect(realization!.point1.z).toBe(1);
    
    // point2 is raw direction (p2 - p1) = (10, 0, 0) with z=0 for infinite line
    expect(realization!.point2.x).toBeCloseTo(10, 10);
    expect(realization!.point2.y).toBeCloseTo(0, 10);
    expect(realization!.point2.z).toBe(0);
  });

  it('should realize line with diagonal direction', () => {
    const { world } = createTestWorld();
    const plane = world.getProjectionPlaneByLabel('P_H')!;
    const p1 = world.getConstructionService().addFreePoint2D(plane, new Vector3(0, 0, 1));
    const p2 = world.getConstructionService().addFreePoint2D(plane, new Vector3(3, 4, 1));
    
    const line = world.getConstructionService().addLine2DBetweenTwoPoints(plane, p1.id, p2.id);
    
    const realization = line.realize2D(world);
    
    expect(realization).not.toBeNull();
    
    // point2 is raw direction (p2 - p1) = (3, 4, 0) with z=0 for infinite line
    expect(realization!.point2.x).toBeCloseTo(3, 10);
    expect(realization!.point2.y).toBeCloseTo(4, 10);
    expect(realization!.point2.z).toBe(0);
  });

  it('should return null if both points are too close (degenerate line)', () => {
    const { world } = createTestWorld();
    const plane = world.getProjectionPlaneByLabel('P_H')!;
    const p1 = world.getConstructionService().addFreePoint2D(plane, new Vector3(0, 0, 1));
    const p2 = world.getConstructionService().addFreePoint2D(plane, new Vector3(0.0000001, 0.0000001, 1));
    
    const line = world.getConstructionService().addLine2DBetweenTwoPoints(plane, p1.id, p2.id);
    
    const realization = line.realize2D(world);
    
    // Should return infeasible realization, not null (per Phase 23 infeasibility handling)
    expect(realization).not.toBeNull();
    expect(realization!.feasible).toBe(false);
  });

  it('should realize line with negative coordinates', () => {
    const { world } = createTestWorld();
    const plane = world.getProjectionPlaneByLabel('P_V')!;
    const p1 = world.getConstructionService().addFreePoint2D(plane, new Vector3(-10, -5, 1));
    const p2 = world.getConstructionService().addFreePoint2D(plane, new Vector3(5, 10, 1));
    
    const line = world.getConstructionService().addLine2DBetweenTwoPoints(plane, p1.id, p2.id);
    
    const realization = line.realize2D(world);
    
    expect(realization).not.toBeNull();
    expect(realization!.point1.x).toBeCloseTo(-10, 10);
    expect(realization!.point1.y).toBeCloseTo(-5, 10);
    
    // point2 is raw direction (p2 - p1) = (15, 15, 0) with z=0 for infinite line
    expect(realization!.point2.x).toBeCloseTo(15, 10);
    expect(realization!.point2.y).toBeCloseTo(15, 10);
  });

  it('should work with vertical line', () => {
    const { world } = createTestWorld();
    const plane = world.getProjectionPlaneByLabel('P_H')!;
    const p1 = world.getConstructionService().addFreePoint2D(plane, new Vector3(5, 0, 1));
    const p2 = world.getConstructionService().addFreePoint2D(plane, new Vector3(5, 10, 1));
    
    const line = world.getConstructionService().addLine2DBetweenTwoPoints(plane, p1.id, p2.id);
    
    const realization = line.realize2D(world);
    
    expect(realization).not.toBeNull();
    
    // point2 is raw direction (p2 - p1) = (0, 10, 0) with z=0 for infinite line
    expect(realization!.point2.x).toBeCloseTo(0, 10);
    expect(realization!.point2.y).toBeCloseTo(10, 10);
    expect(realization!.point2.z).toBe(0);
  });

  it('should work with horizontal line', () => {
    const { world } = createTestWorld();
    const plane = world.getProjectionPlaneByLabel('P_V')!;
    const p1 = world.getConstructionService().addFreePoint2D(plane, new Vector3(0, 7, 1));
    const p2 = world.getConstructionService().addFreePoint2D(plane, new Vector3(20, 7, 1));
    
    const line = world.getConstructionService().addLine2DBetweenTwoPoints(plane, p1.id, p2.id);
    
    const realization = line.realize2D(world);
    
    expect(realization).not.toBeNull();
    
    // point2 is raw direction (p2 - p1) = (20, 0, 0) with z=0 for infinite line
    expect(realization!.point2.x).toBeCloseTo(20, 10);
    expect(realization!.point2.y).toBeCloseTo(0, 10);
    expect(realization!.point2.z).toBe(0);
  });
});
