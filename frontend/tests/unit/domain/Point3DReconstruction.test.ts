/**
 * Point3DReconstruction.test.ts
 * 
 * Tests for 3D point reconstruction from 2D projections.
 * Verifies that Point3DFromProjections correctly reconstructs 3D coordinates
 * from horizontal and vertical plane projections.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { World } from '../../../src/domain/world/World';
import { Point3DFromProjections } from '@/domain/world/Point3D';
import { FreePoint2D } from '@/domain/world/Point';
import { Vector3 } from 'three';
import { createVisualStyle } from '../../../src/domain/world/VisualStyle';
import { createTestWorld } from '../../helpers/worldHelpers';

describe('Point3DFromProjections - Coordinate Reconstruction', () => {
  let world: World;

  beforeEach(() => {
    const { world: w } = createTestWorld();
    world = w;
  });

  /**
   * Test Case from User Request:
   * - P_V projection: (x=1, z=1) → in plane coords (u=1, v=1)
   * - P_H projection: (x=1, y=3) → in plane coords (u=1, v=3)
   * - Expected 3D point: (x=1, y=3, z=1)
   * 
   * Note: User mentioned y=2, but based on the coordinate system:
   * - P_H: (u,v) → (x,y,z) = (u, v, 0)
   * - P_V: (u,v) → (x,y,z) = (u, 0, v)
   * The y-coordinate should come from P_H's v-coordinate (y=3)
   */
  it('should reconstruct 3D point from H and V projections - user test case', () => {
    // Get projection planes
    const planeH = world.getProjectionPlaneByLabel('P_H');
    const planeV = world.getProjectionPlaneByLabel('P_V');
    
    expect(planeH).toBeDefined();
    expect(planeV).toBeDefined();
    
    if (!planeH || !planeV) throw new Error('Base planes not found');

    // Create point on P_V at (u=1, v=1) → corresponds to 3D (x=1, y=0, z=1)
    const pointV = world.getConstructionService().addFreePoint2D(
      planeV,
      new Vector3(1, 1, 1),  // (u, v, w) homogeneous
      undefined,
      'V'
    );

    // Create point on P_H at (u=1, v=3) → corresponds to 3D (x=1, y=3, z=0)
    const pointH = world.getConstructionService().addFreePoint2D(
      planeH,
      new Vector3(1, 3, 1),  // (u, v, w) homogeneous
      undefined,
      'H'
    );

    // Create 3D point from projections
    const point3D = new Point3DFromProjections(
      'world/point3d_1',
      'P',
      pointV.id,
      pointH.id,
      planeV.id!,
      planeH.id!,
      createVisualStyle()
    );

    // Realize the 3D point
    const realization = point3D.realize3D(world);

    // Check feasibility
    expect(realization.isFeasible()).toBe(true);

    // Get Cartesian coordinates
    const [x, y, z] = realization.getCartesian();

    // Expected: (1, 3, 1)
    // - x = 1 (consistent in both projections)
    // - y = 3 (from P_H v-coordinate)
    // - z = 1 (from P_V v-coordinate)
    expect(x).toBeCloseTo(1, 5);
    expect(y).toBeCloseTo(3, 5);
    expect(z).toBeCloseTo(1, 5);
  });

  /**
   * Test basic coordinate reconstruction:
   * P_V at (u=2, v=3) and P_H at (u=2, v=5)
   * Expected 3D: (x=2, y=5, z=3)
   */
  it('should reconstruct 3D point with x-coordinate matching', () => {
    const planeH = world.getProjectionPlaneByLabel('P_H');
    const planeV = world.getProjectionPlaneByLabel('P_V');
    
    if (!planeH || !planeV) throw new Error('Base planes not found');

    // P_V: (u=2, v=3) → 3D projection (x=2, y=0, z=3)
    const pointV = world.getConstructionService().addFreePoint2D(planeV, new Vector3(2, 3, 1), undefined, 'V1');

    // P_H: (u=2, v=5) → 3D projection (x=2, y=5, z=0)
    const pointH = world.getConstructionService().addFreePoint2D(planeH, new Vector3(2, 5, 1), undefined, 'H1');

    const point3D = new Point3DFromProjections(
      'world/point3d_2',
      'P1',
      pointV.id,
      pointH.id,
      planeV.id!,
      planeH.id!,
      createVisualStyle()
    );

    const realization = point3D.realize3D(world);
    expect(realization.isFeasible()).toBe(true);

    const [x, y, z] = realization.getCartesian();
    
    // Expected: (2, 5, 3)
    expect(x).toBeCloseTo(2, 5);
    expect(y).toBeCloseTo(5, 5);
    expect(z).toBeCloseTo(3, 5);
  });

  /**
   * Test point at origin
   * P_V at (0, 0) and P_H at (0, 0)
   * Expected 3D: (0, 0, 0)
   */
  it('should reconstruct point at origin', () => {
    const planeH = world.getProjectionPlaneByLabel('P_H');
    const planeV = world.getProjectionPlaneByLabel('P_V');
    
    if (!planeH || !planeV) throw new Error('Base planes not found');

    const pointV = world.getConstructionService().addFreePoint2D(planeV, new Vector3(0, 0, 1), undefined, 'V0');
    const pointH = world.getConstructionService().addFreePoint2D(planeH, new Vector3(0, 0, 1), undefined, 'H0');

    const point3D = new Point3DFromProjections(
      'world/point3d_3',
      'P0',
      pointV.id,
      pointH.id,
      planeV.id!,
      planeH.id!,
      createVisualStyle()
    );

    const realization = point3D.realize3D(world);
    expect(realization.isFeasible()).toBe(true);

    const [x, y, z] = realization.getCartesian();
    expect(x).toBeCloseTo(0, 5);
    expect(y).toBeCloseTo(0, 5);
    expect(z).toBeCloseTo(0, 5);
  });

  /**
   * Test negative coordinates
   * P_V at (-2, -3) and P_H at (-2, -5)
   * Expected 3D: (-2, -5, -3)
   */
  it('should handle negative coordinates', () => {
    const planeH = world.getProjectionPlaneByLabel('P_H');
    const planeV = world.getProjectionPlaneByLabel('P_V');
    
    if (!planeH || !planeV) throw new Error('Base planes not found');

    const pointV = world.getConstructionService().addFreePoint2D(planeV, new Vector3(-2, -3, 1), undefined, 'Vneg');
    const pointH = world.getConstructionService().addFreePoint2D(planeH, new Vector3(-2, -5, 1), undefined, 'Hneg');

    const point3D = new Point3DFromProjections(
      'world/point3d_4',
      'Pneg',
      pointV.id,
      pointH.id,
      planeV.id!,
      planeH.id!,
      createVisualStyle()
    );

    const realization = point3D.realize3D(world);
    expect(realization.isFeasible()).toBe(true);

    const [x, y, z] = realization.getCartesian();
    expect(x).toBeCloseTo(-2, 5);
    expect(y).toBeCloseTo(-5, 5);
    expect(z).toBeCloseTo(-3, 5);
  });

  /**
   * Test x-coordinate mismatch detection
   * P_V at (u=1, v=2) and P_H at (u=3, v=4)
   * This is geometrically inconsistent - x should match!
   * The new implementation should detect this and mark as infeasible.
   */
  it('should detect inconsistent projections (x-coordinate mismatch)', () => {
    const planeH = world.getProjectionPlaneByLabel('P_H');
    const planeV = world.getProjectionPlaneByLabel('P_V');
    
    if (!planeH || !planeV) throw new Error('Base planes not found');

    // Different x-coordinates: P_V has x=1, P_H has x=3
    // For P_H and P_V, equation 4 will fail: v₂ should equal z from equation system
    const pointV = world.getConstructionService().addFreePoint2D(planeV, new Vector3(1, 2, 1), undefined, 'Vmis');
    const pointH = world.getConstructionService().addFreePoint2D(planeH, new Vector3(3, 4, 1), undefined, 'Hmis');

    const point3D = new Point3DFromProjections(
      'world/point3d_5',
      'Pmis',
      pointV.id,
      pointH.id,
      planeV.id!,
      planeH.id!,
      createVisualStyle()
    );

    const realization = point3D.realize3D(world);
    
    // Should be marked as infeasible due to inconsistent projections
    expect(realization.isFeasible()).toBe(false);
  });

  /**
   * Test projection order independence
   * Creating 3D point with H first then V, or V first then H
   * should give same result
   */
  it('should be independent of projection order', () => {
    const planeH = world.getProjectionPlaneByLabel('P_H');
    const planeV = world.getProjectionPlaneByLabel('P_V');
    
    if (!planeH || !planeV) throw new Error('Base planes not found');

    const pointV = world.getConstructionService().addFreePoint2D(planeV, new Vector3(5, 7, 1), undefined, 'Vord');
    const pointH = world.getConstructionService().addFreePoint2D(planeH, new Vector3(5, 9, 1), undefined, 'Hord');

    // Order 1: V first, H second
    const point3D_VH = new Point3DFromProjections(
      'world/point3d_6',
      'Pvh',
      pointV.id,
      pointH.id,
      planeV.id!,
      planeH.id!,
      createVisualStyle()
    );

    // Order 2: H first, V second
    const point3D_HV = new Point3DFromProjections(
      'world/point3d_7',
      'Phv',
      pointH.id,
      pointV.id,
      planeH.id!,
      planeV.id!,
      createVisualStyle()
    );

    const real_VH = point3D_VH.realize3D(world);
    const real_HV = point3D_HV.realize3D(world);

    const [x1, y1, z1] = real_VH.getCartesian();
    const [x2, y2, z2] = real_HV.getCartesian();

    // Both should give same result
    expect(x1).toBeCloseTo(x2, 5);
    expect(y1).toBeCloseTo(y2, 5);
    expect(z1).toBeCloseTo(z2, 5);
    
    // Expected: (5, 9, 7)
    expect(x1).toBeCloseTo(5, 5);
    expect(y1).toBeCloseTo(9, 5);
    expect(z1).toBeCloseTo(7, 5);
  });
});
