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
import { World } from '@/domain/world/World';

describe('Line2DRealization2D', () => {
  it('should create realization with normalized direction', () => {
    const point = new Vector3(1, 2, 1);
    const direction = new Vector3(3, 4, 0); // Length = 5
    
    const realization = new Line2DRealization2D(point, direction);
    
    expect(realization.point).toEqual(point);
    
    // Direction should be normalized
    const expectedDirX = 3 / 5; // 0.6
    const expectedDirY = 4 / 5; // 0.8
    expect(realization.direction.x).toBeCloseTo(expectedDirX, 10);
    expect(realization.direction.y).toBeCloseTo(expectedDirY, 10);
    expect(realization.direction.z).toBe(0); // Direction has no translation
  });

  it('should compute point at parameter t correctly', () => {
    const point = new Vector3(10, 20, 1);
    const direction = new Vector3(1, 0, 0); // Unit vector along x
    
    const realization = new Line2DRealization2D(point, direction);
    
    // At t=0, should return original point
    const p0 = realization.getPointAt(0);
    expect(p0.x).toBeCloseTo(10, 10);
    expect(p0.y).toBeCloseTo(20, 10);
    expect(p0.z).toBe(1);
    
    // At t=5, should move 5 units in x direction
    const p5 = realization.getPointAt(5);
    expect(p5.x).toBeCloseTo(15, 10);
    expect(p5.y).toBeCloseTo(20, 10);
    expect(p5.z).toBe(1);
    
    // At t=-3, should move 3 units in negative x direction
    const pNeg3 = realization.getPointAt(-3);
    expect(pNeg3.x).toBeCloseTo(7, 10);
    expect(pNeg3.y).toBeCloseTo(20, 10);
    expect(pNeg3.z).toBe(1);
  });

  it('should compute point at parameter t with diagonal direction', () => {
    const point = new Vector3(0, 0, 1);
    const direction = new Vector3(3, 4, 0); // Will be normalized to (0.6, 0.8)
    
    const realization = new Line2DRealization2D(point, direction);
    
    // At t=5, should move 5 units along normalized direction
    const p5 = realization.getPointAt(5);
    expect(p5.x).toBeCloseTo(3, 10); // 5 * 0.6
    expect(p5.y).toBeCloseTo(4, 10); // 5 * 0.8
    expect(p5.z).toBe(1);
  });
});

describe('Line2DByTwoPoints', () => {
  it('should create line with required properties', () => {
    const line = new Line2DByTwoPoints(
      'line1',
      'point1',
      'point2',
      'P_H',
      'Line AB'
    );
    
    expect(line.id).toBe('line1');
    expect(line.type).toBe('by-two-points');
    expect(line.point1Id).toBe('point1');
    expect(line.point2Id).toBe('point2');
    expect(line.planeId).toBe('P_H');
    expect(line.label).toBe('Line AB');
  });

  it('should create line without label', () => {
    const line = new Line2DByTwoPoints(
      'line1',
      'point1',
      'point2',
      'P_V'
    );
    
    expect(line.id).toBe('line1');
    expect(line.label).toBeUndefined();
  });

  it('should clone line with all properties', () => {
    const original = new Line2DByTwoPoints(
      'line1',
      'point1',
      'point2',
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
    const world = new World();
    const p1 = world.addFreePoint2D('proj_plane_H', new Vector3(0, 0, 1), 'point1');
    const p2 = world.addFreePoint2D('proj_plane_H', new Vector3(10, 0, 1), 'point2');
    
    const line = new Line2DByTwoPoints(
      'line1',
      'point1',
      'point2',
      'proj_plane_H'
    );
    
    const realization = line.realize2D(world);
    
    expect(realization).not.toBeNull();
    expect(realization!.point.x).toBeCloseTo(0, 10);
    expect(realization!.point.y).toBeCloseTo(0, 10);
    expect(realization!.point.z).toBe(1);
    
    // Direction should be normalized (1, 0, 0)
    expect(realization!.direction.x).toBeCloseTo(1, 10);
    expect(realization!.direction.y).toBeCloseTo(0, 10);
    expect(realization!.direction.z).toBe(0);
  });

  it('should realize line with diagonal direction', () => {
    const world = new World();
    const p1 = world.addFreePoint2D('proj_plane_H', new Vector3(0, 0, 1), 'point1');
    const p2 = world.addFreePoint2D('proj_plane_H', new Vector3(3, 4, 1), 'point2');
    
    const line = new Line2DByTwoPoints(
      'line1',
      'point1',
      'point2',
      'proj_plane_H'
    );
    
    const realization = line.realize2D(world);
    
    expect(realization).not.toBeNull();
    
    // Direction should be normalized (0.6, 0.8, 0)
    expect(realization!.direction.x).toBeCloseTo(0.6, 10);
    expect(realization!.direction.y).toBeCloseTo(0.8, 10);
    expect(realization!.direction.z).toBe(0);
  });

  it('should return null if first point is missing', () => {
    const world = new World();
    const p2 = world.addFreePoint2D('proj_plane_H', new Vector3(10, 0, 1), 'point2');
    // point1 doesn't exist in world
    
    const line = new Line2DByTwoPoints(
      'line1',
      'point1',
      'point2',
      'proj_plane_H'
    );
    
    const realization = line.realize2D(world);
    
    expect(realization).toBeNull();
  });

  it('should return null if second point is missing', () => {
    const world = new World();
    const p1 = world.addFreePoint2D('proj_plane_H', new Vector3(0, 0, 1), 'point1');
    // point2 doesn't exist in world
    
    const line = new Line2DByTwoPoints(
      'line1',
      'point1',
      'point2',
      'proj_plane_H'
    );
    
    const realization = line.realize2D(world);
    
    expect(realization).toBeNull();
  });

  it('should return null if both points are too close (degenerate line)', () => {
    const world = new World();
    const p1 = world.addFreePoint2D('proj_plane_H', new Vector3(0, 0, 1), 'point1');
    const p2 = world.addFreePoint2D('proj_plane_H', new Vector3(0.0000001, 0.0000001, 1), 'point2');
    
    const line = new Line2DByTwoPoints(
      'line1',
      'point1',
      'point2',
      'proj_plane_H'
    );
    
    const realization = line.realize2D(world);
    
    // Should return infeasible realization, not null (per Phase 23 infeasibility handling)
    expect(realization).not.toBeNull();
    expect(realization!.feasible).toBe(false);
  });

  it('should realize line with negative coordinates', () => {
    const world = new World();
    const p1 = world.addFreePoint2D('proj_plane_V', new Vector3(-10, -5, 1), 'point1');
    const p2 = world.addFreePoint2D('proj_plane_V', new Vector3(5, 10, 1), 'point2');
    
    const line = new Line2DByTwoPoints(
      'line1',
      'point1',
      'point2',
      'proj_plane_V'
    );
    
    const realization = line.realize2D(world);
    
    expect(realization).not.toBeNull();
    expect(realization!.point.x).toBeCloseTo(-10, 10);
    expect(realization!.point.y).toBeCloseTo(-5, 10);
    
    // Direction: (15, 15) normalized to (sqrt(2)/2, sqrt(2)/2)
    const expectedDir = Math.sqrt(2) / 2;
    expect(realization!.direction.x).toBeCloseTo(expectedDir, 10);
    expect(realization!.direction.y).toBeCloseTo(expectedDir, 10);
  });

  it('should work with vertical line', () => {
    const world = new World();
    const p1 = world.addFreePoint2D('proj_plane_H', new Vector3(5, 0, 1), 'point1');
    const p2 = world.addFreePoint2D('proj_plane_H', new Vector3(5, 10, 1), 'point2');
    
    const line = new Line2DByTwoPoints(
      'line1',
      'point1',
      'point2',
      'proj_plane_H'
    );
    
    const realization = line.realize2D(world);
    
    expect(realization).not.toBeNull();
    
    // Direction should be (0, 1, 0) - vertical
    expect(realization!.direction.x).toBeCloseTo(0, 10);
    expect(realization!.direction.y).toBeCloseTo(1, 10);
    expect(realization!.direction.z).toBe(0);
  });

  it('should work with horizontal line', () => {
    const world = new World();
    const p1 = world.addFreePoint2D('proj_plane_V', new Vector3(0, 7, 1), 'point1');
    const p2 = world.addFreePoint2D('proj_plane_V', new Vector3(20, 7, 1), 'point2');
    
    const line = new Line2DByTwoPoints(
      'line1',
      'point1',
      'point2',
      'proj_plane_V'
    );
    
    const realization = line.realize2D(world);
    
    expect(realization).not.toBeNull();
    
    // Direction should be (1, 0, 0) - horizontal
    expect(realization!.direction.x).toBeCloseTo(1, 10);
    expect(realization!.direction.y).toBeCloseTo(0, 10);
    expect(realization!.direction.z).toBe(0);
  });
});
