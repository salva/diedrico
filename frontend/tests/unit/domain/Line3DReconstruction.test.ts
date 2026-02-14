/**
 * Line3DReconstruction.test.ts
 * 
 * Tests for 3D line reconstruction from 2D projections.
 * Uses operations to properly build World state, then checks 3D realizations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { World } from '@/domain/world/World';
import { AddFreePoint2DOp } from '@/commands/operations/world/AddFreePointOp';
import { AddLine2DByTwoPointsOp } from '@/commands/operations/world/AddLineOp';
import { Add3DLineOp } from '@/commands/operations/world/Add3DLineOp';
import { Command } from '@/commands/Command';
import { Vector3, Vector4 } from 'three';
import { createTestWorld } from '../../helpers/worldHelpers';

describe('Line3D Reconstruction from Projections', () => {
  let world: World;
  let command: Command;

  beforeEach(() => {
    const { world: w } = createTestWorld();
    world = w;
    command = new Command('test-command', world);
  });

  /**
   * Helper: Create a 2D line on a projection plane using operations
   * Returns the line ID
   */
  function createLine2D(
    planeId: string,
    x1: number, y1: number,
    x2: number, y2: number,
    label: string
  ): string {
    // Add first point
    const addP1 = new AddFreePoint2DOp(planeId, new Vector3(x1, y1, 1));
    const result1 = command.addAndExecute(addP1);
    const p1Id = result1.outputs.pointId!;

    // Add second point
    const addP2 = new AddFreePoint2DOp(planeId, new Vector3(x2, y2, 1));
    const result2 = command.addAndExecute(addP2);
    const p2Id = result2.outputs.pointId!;

    // Add line between points
    const addLine = new AddLine2DByTwoPointsOp(planeId, p1Id, p2Id);
    const result3 = command.addAndExecute(addLine);
    return result3.outputs.lineId!;
  }

  /**
   * Helper: Create a 3D line from two 2D projections using operations
   * Returns the line3D ID
   */
  function create3DLine(
    line1Id: string, plane1Id: string,
    line2Id: string, plane2Id: string,
    label: string
  ): string {
    const addLine3D = new Add3DLineOp(line1Id, line2Id, plane1Id, plane2Id, label);
    const result = command.addAndExecute(addLine3D);
    return result.outputs.lineId!;
  }

  /**
   * Helper: Normalize a direction vector
   */
  function normalize(v: Vector4): Vector4 {
    const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    return new Vector4(v.x / len, v.y / len, v.z / len, 0);
  }

  /**
   * Helper: Check if two direction vectors are parallel (same or opposite)
   */
  function areParallel(v1: Vector4, v2: Vector4, tolerance = 1e-6): boolean {
    const n1 = normalize(v1);
    const n2 = normalize(v2);
    const dot = Math.abs(n1.x * n2.x + n1.y * n2.y + n1.z * n2.z);
    return Math.abs(dot - 1) < tolerance;
  }

  /**
   * Helper: Check if a point lies on a line (within tolerance)
   */
  function pointOnLine(point: Vector4, linePoint: Vector4, lineDir: Vector4, tolerance = 1e-3): boolean {
    // Vector from linePoint to point
    const v = new Vector4(
      point.x - linePoint.x,
      point.y - linePoint.y,
      point.z - linePoint.z,
      0
    );
    
    // Cross product should be zero if point is on line
    const cross = new Vector4(
      v.y * lineDir.z - v.z * lineDir.y,
      v.z * lineDir.x - v.x * lineDir.z,
      v.x * lineDir.y - v.y * lineDir.x,
      0
    );
    
    const crossLen = Math.sqrt(cross.x * cross.x + cross.y * cross.y + cross.z * cross.z);
    return crossLen < tolerance;
  }

  it('should reconstruct a line along the x-axis', () => {
    // Setup: Line from (0,0,0) to (10,0,0)
    // P_H: horizontal line from (0,0) to (10,0)
    // P_V: horizontal line from (0,0) to (10,0)
    const P_H = world.getProjectionPlaneByLabel('P_H')!.id!;
    const P_V = world.getProjectionPlaneByLabel('P_V')!.id!;

    const lineH = createLine2D(P_H, 0, 0, 10, 0, 'lineH');
    const lineV = createLine2D(P_V, 0, 0, 10, 0, 'lineV');
    const line3D = create3DLine(lineH, P_H, lineV, P_V, 'line3D_x');

    // Get realization
    const realization = world.get3DLine(line3D)?.realize3D(world);
    expect(realization).toBeDefined();
    expect(realization!.isFeasible()).toBe(true);

    const { point, direction } = realization!;
    
    // Direction should be along x-axis: [1,0,0,0] or [-1,0,0,0]
    const expectedDir = new Vector4(1, 0, 0, 0);
    expect(areParallel(direction, expectedDir)).toBe(true);

    // Check that known points lie on the line
    const origin = new Vector4(0, 0, 0, 1);
    const endPoint = new Vector4(10, 0, 0, 1);
    
    expect(pointOnLine(origin, point, direction)).toBe(true);
    expect(pointOnLine(endPoint, point, direction)).toBe(true);
  });

  it('should reconstruct a line parallel to y-axis', () => {
    // Setup: Line from (5,0,3) to (5,10,3)
    // P_H: vertical line from (5,0) to (5,10)
    // P_V: appears as nearly a point at (5,3) - use tiny offset
    const P_H = world.getProjectionPlaneByLabel('P_H')!.id!;
    const P_V = world.getProjectionPlaneByLabel('P_V')!.id!;

    const lineH = createLine2D(P_H, 5, 0, 5, 10, 'lineH');
    const lineV = createLine2D(P_V, 5, 3, 5.0001, 3.0001, 'lineV');
    const line3D = create3DLine(lineH, P_H, lineV, P_V, 'line3D_y');

    const realization = world.get3DLine(line3D)?.realize3D(world);
    expect(realization).toBeDefined();
    expect(realization!.isFeasible()).toBe(true);

    const { point, direction } = realization!;
    
    // Direction should be along y-axis
    const expectedDir = new Vector4(0, 1, 0, 0);
    expect(areParallel(direction, expectedDir)).toBe(true);

    // Check points
    const p1 = new Vector4(5, 0, 3, 1);
    const p2 = new Vector4(5, 10, 3, 1);
    
    expect(pointOnLine(p1, point, direction)).toBe(true);
    expect(pointOnLine(p2, point, direction)).toBe(true);
  });

  it('should reconstruct a line parallel to z-axis', () => {
    // Setup: Line from (5,3,0) to (5,3,10)
    // P_H: appears as nearly a point at (5,3) - use tiny offset
    // P_V: vertical line from (5,0) to (5,10)
    const P_H = world.getProjectionPlaneByLabel('P_H')!.id!;
    const P_V = world.getProjectionPlaneByLabel('P_V')!.id!;

    const lineH = createLine2D(P_H, 5, 3, 5.0001, 3.0001, 'lineH');
    const lineV = createLine2D(P_V, 5, 0, 5, 10, 'lineV');
    const line3D = create3DLine(lineH, P_H, lineV, P_V, 'line3D_z');

    const realization = world.get3DLine(line3D)?.realize3D(world);
    expect(realization).toBeDefined();
    expect(realization!.isFeasible()).toBe(true);

    const { point, direction } = realization!;
    
    // Direction should be along z-axis
    const expectedDir = new Vector4(0, 0, 1, 0);
    expect(areParallel(direction, expectedDir)).toBe(true);

    // Check points
    const p1 = new Vector4(5, 3, 0, 1);
    const p2 = new Vector4(5, 3, 10, 1);
    
    expect(pointOnLine(p1, point, direction)).toBe(true);
    expect(pointOnLine(p2, point, direction)).toBe(true);
  });

  it('should reconstruct a diagonal line in XY plane (z=0)', () => {
    // Setup: Line from (0,0,0) to (10,10,0)
    // P_H: diagonal from (0,0) to (10,10)
    // P_V: horizontal from (0,0) to (10,0)
    const P_H = world.getProjectionPlaneByLabel('P_H')!.id!;
    const P_V = world.getProjectionPlaneByLabel('P_V')!.id!;

    const lineH = createLine2D(P_H, 0, 0, 10, 10, 'lineH');
    const lineV = createLine2D(P_V, 0, 0, 10, 0, 'lineV');
    const line3D = create3DLine(lineH, P_H, lineV, P_V, 'line3D_xy');

    const realization = world.get3DLine(line3D)?.realize3D(world);
    expect(realization).toBeDefined();
    expect(realization!.isFeasible()).toBe(true);

    const { point, direction } = realization!;
    
    // Check that line is in z=0 plane
    const p1 = new Vector4(0, 0, 0, 1);
    const p2 = new Vector4(10, 10, 0, 1);
    const midpoint = new Vector4(5, 5, 0, 1);
    
    expect(pointOnLine(p1, point, direction)).toBe(true);
    expect(pointOnLine(p2, point, direction)).toBe(true);
    expect(pointOnLine(midpoint, point, direction)).toBe(true);
  });

  it('should reconstruct a diagonal line in XZ plane (y=0)', () => {
    // Setup: Line from (0,0,0) to (10,0,10)
    // P_H: horizontal from (0,0) to (10,0)
    // P_V: diagonal from (0,0) to (10,10)
    const P_H = world.getProjectionPlaneByLabel('P_H')!.id!;
    const P_V = world.getProjectionPlaneByLabel('P_V')!.id!;

    const lineH = createLine2D(P_H, 0, 0, 10, 0, 'lineH');
    const lineV = createLine2D(P_V, 0, 0, 10, 10, 'lineV');
    const line3D = create3DLine(lineH, P_H, lineV, P_V, 'line3D_xz');

    const realization = world.get3DLine(line3D)?.realize3D(world);
    expect(realization).toBeDefined();
    expect(realization!.isFeasible()).toBe(true);

    const { point, direction } = realization!;
    
    // Check points in y=0 plane
    const p1 = new Vector4(0, 0, 0, 1);
    const p2 = new Vector4(10, 0, 10, 1);
    const midpoint = new Vector4(5, 0, 5, 1);
    
    expect(pointOnLine(p1, point, direction)).toBe(true);
    expect(pointOnLine(p2, point, direction)).toBe(true);
    expect(pointOnLine(midpoint, point, direction)).toBe(true);
  });

  it('should reconstruct a fully 3D diagonal line', () => {
    // Setup: Line from (0,0,0) to (10,10,5)
    // P_H: diagonal from (0,0) to (10,10)
    // P_V: diagonal from (0,0) to (10,5)
    const P_H = world.getProjectionPlaneByLabel('P_H')!.id!;
    const P_V = world.getProjectionPlaneByLabel('P_V')!.id!;

    const lineH = createLine2D(P_H, 0, 0, 10, 10, 'lineH');
    const lineV = createLine2D(P_V, 0, 0, 10, 5, 'lineV');
    const line3D = create3DLine(lineH, P_H, lineV, P_V, 'line3D_full');

    const realization = world.get3DLine(line3D)?.realize3D(world);
    expect(realization).toBeDefined();
    expect(realization!.isFeasible()).toBe(true);

    const { point, direction } = realization!;
    
    // Check various points along the line
    const p1 = new Vector4(0, 0, 0, 1);
    const p2 = new Vector4(10, 10, 5, 1);
    const midpoint = new Vector4(5, 5, 2.5, 1);
    
    expect(pointOnLine(p1, point, direction)).toBe(true);
    expect(pointOnLine(p2, point, direction)).toBe(true);
    expect(pointOnLine(midpoint, point, direction)).toBe(true);
  });

  it('should handle order independence - H then V vs V then H', () => {
    const P_H = world.getProjectionPlaneByLabel('P_H')!.id!;
    const P_V = world.getProjectionPlaneByLabel('P_V')!.id!;

    // Create same line traces
    const lineH = createLine2D(P_H, 0, 0, 10, 5, 'lineH');
    const lineV = createLine2D(P_V, 0, 0, 10, 3, 'lineV');

    // Create 3D lines in different order
    const line3D_HV = create3DLine(lineH, P_H, lineV, P_V, 'line3D_HV');
    
    // Create new command for second line to avoid duplicate operations
    command = new Command('test-command-2', world);
    const line3D_VH = create3DLine(lineV, P_V, lineH, P_H, 'line3D_VH');

    const real_HV = world.get3DLine(line3D_HV)?.realize3D(world);
    const real_VH = world.get3DLine(line3D_VH)?.realize3D(world);

    expect(real_HV).toBeDefined();
    expect(real_VH).toBeDefined();
    expect(real_HV!.isFeasible()).toBe(true);
    expect(real_VH!.isFeasible()).toBe(true);

    // Directions should be parallel
    expect(areParallel(real_HV!.direction, real_VH!.direction)).toBe(true);

    // Both should contain same points
    const testPoint = new Vector4(5, 2.5, 1.5, 1);
    expect(pointOnLine(testPoint, real_HV!.point, real_HV!.direction)).toBe(true);
    expect(pointOnLine(testPoint, real_VH!.point, real_VH!.direction)).toBe(true);
  });

  it('should reconstruct line from actual browser case', () => {
    // From user's browser: approximate coordinates
    const P_H = world.getProjectionPlaneByLabel('P_H')!.id!;
    const P_V = world.getProjectionPlaneByLabel('P_V')!.id!;

    const lineH = createLine2D(P_H, 0.5, 0.5, 2.5, 1.5, 'lineH_browser');
    const lineV = createLine2D(P_V, 0.5, 0.3, 2.5, 0.8, 'lineV_browser');
    const line3D = create3DLine(lineH, P_H, lineV, P_V, 'line3D_browser');

    const realization = world.get3DLine(line3D)?.realize3D(world);
    
    // Should at least produce a feasible result
    expect(realization).toBeDefined();
    expect(realization!.isFeasible()).toBe(true);

    const { direction } = realization!;
    
    // Direction vector should be non-zero and normalized
    const len = Math.sqrt(direction.x * direction.x + direction.y * direction.y + direction.z * direction.z);
    expect(len).toBeGreaterThan(0.99);
    expect(len).toBeLessThan(1.01);
  });

  it('should detect infeasible 3D line from parallel plane projections', () => {
    // Create projections that lift to parallel 3D planes (no unique line intersection)
    // 
    // Geometry:
    // - P_H line vertical (0,1): lifts to 3D direction (0,1,0), plane normal (1,0,0)
    // - P_V line vertical (0,1): lifts to 3D direction (0,0,1), plane normal (1,0,0)
    // Both planes have normal (1,0,0) → parallel → no unique intersection line → infeasible
    const P_H = world.getProjectionPlaneByLabel('P_H')!.id!;
    const P_V = world.getProjectionPlaneByLabel('P_V')!.id!;

    // P_H: vertical line from (5,0) to (5,10) → direction (0,1)
    const lineH = createLine2D(P_H, 5, 0, 5, 10, 'lineH_vertical');
    
    // P_V: vertical line from (0,0) to (0,10) → direction (0,1)
    const lineV = createLine2D(P_V, 0, 0, 0, 10, 'lineV_vertical');
    
    const line3D = create3DLine(lineH, P_H, lineV, P_V, 'line3D_infeasible');

    const realization = world.get3DLine(line3D)?.realize3D(world);
    
    // Should return a realization, but marked as infeasible
    expect(realization).toBeDefined();
    expect(realization!.isFeasible()).toBe(false);
    
    // Verify this matches the bug we found: infeasible elements should not be rendered
    // (ThreeView.vue checks !realization.isFeasible() - fixed in commit 2b97697c)
  });
});
