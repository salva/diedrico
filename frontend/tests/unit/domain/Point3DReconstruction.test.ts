/**
 * Point3DReconstruction.test.ts
 * 
 * Tests for 3D point reconstruction from 2D projections.
 * Verifies that Point3DFromProjections correctly reconstructs 3D coordinates
 * from horizontal and vertical plane projections.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '@/domain/world/World';
import { Point3DFromProjections } from '@/domain/world/Point3D';
import { FreePoint2D } from '@/domain/world/Point';
import { Vector3 } from 'three';

describe('Point3DFromProjections - Coordinate Reconstruction', () => {
  let world: World;

  beforeEach(() => {
    world = new World();
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
    const planeH = world.getProjectionPlaneById('P_H');
    const planeV = world.getProjectionPlaneById('P_V');
    
    expect(planeH).toBeDefined();
    expect(planeV).toBeDefined();
    
    if (!planeH || !planeV) throw new Error('Base planes not found');

    // Create point on P_V at (u=1, v=1) → corresponds to 3D (x=1, y=0, z=1)
    const pointV = new FreePoint2D(
      'point-v',
      'V',
      new Vector3(1, 1, 1),  // (u, v, w) homogeneous
      { color: '#FF6B35' }
    );
    planeV.addPoint(pointV);

    // Create point on P_H at (u=1, v=3) → corresponds to 3D (x=1, y=3, z=0)
    const pointH = new FreePoint2D(
      'point-h',
      'H',
      new Vector3(1, 3, 1),  // (u, v, w) homogeneous
      { color: '#FF6B35' }
    );
    planeH.addPoint(pointH);

    // Create 3D point from projections
    const point3D = new Point3DFromProjections(
      'point-3d',
      'P',
      'point-v',
      'point-h',
      'P_V',
      'P_H',
      { color: '#FF6B35' }
    );

    // Realize the 3D point
    const realization = point3D.realize3D(world);

    // Check feasibility
    expect(realization.isFeasible).toBe(true);

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
    const planeH = world.getProjectionPlaneById('P_H');
    const planeV = world.getProjectionPlaneById('P_V');
    
    if (!planeH || !planeV) throw new Error('Base planes not found');

    // P_V: (u=2, v=3) → 3D projection (x=2, y=0, z=3)
    const pointV = new FreePoint2D(
      'pv1',
      'V1',
      new Vector3(2, 3, 1),
      { color: '#FF6B35' }
    );
    planeV.addPoint(pointV);

    // P_H: (u=2, v=5) → 3D projection (x=2, y=5, z=0)
    const pointH = new FreePoint2D(
      'ph1',
      'H1',
      new Vector3(2, 5, 1),
      { color: '#FF6B35' }
    );
    planeH.addPoint(pointH);

    const point3D = new Point3DFromProjections(
      'p3d1',
      'P1',
      'pv1',
      'ph1',
      'P_V',
      'P_H',
      { color: '#FF6B35' }
    );

    const realization = point3D.realize3D(world);
    expect(realization.isFeasible).toBe(true);

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
    const planeH = world.getProjectionPlaneById('P_H');
    const planeV = world.getProjectionPlaneById('P_V');
    
    if (!planeH || !planeV) throw new Error('Base planes not found');

    const pointV = new FreePoint2D('pv0', 'V0', new Vector3(0, 0, 1), { color: '#FF6B35' });
    planeV.addPoint(pointV);

    const pointH = new FreePoint2D('ph0', 'H0', new Vector3(0, 0, 1), { color: '#FF6B35' });
    planeH.addPoint(pointH);

    const point3D = new Point3DFromProjections(
      'p3d0',
      'P0',
      'pv0',
      'ph0',
      'P_V',
      'P_H',
      { color: '#FF6B35' }
    );

    const realization = point3D.realize3D(world);
    expect(realization.isFeasible).toBe(true);

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
    const planeH = world.getProjectionPlaneById('P_H');
    const planeV = world.getProjectionPlaneById('P_V');
    
    if (!planeH || !planeV) throw new Error('Base planes not found');

    const pointV = new FreePoint2D('pv-neg', 'Vneg', new Vector3(-2, -3, 1), { color: '#FF6B35' });
    planeV.addPoint(pointV);

    const pointH = new FreePoint2D('ph-neg', 'Hneg', new Vector3(-2, -5, 1), { color: '#FF6B35' });
    planeH.addPoint(pointH);

    const point3D = new Point3DFromProjections(
      'p3d-neg',
      'Pneg',
      'pv-neg',
      'ph-neg',
      'P_V',
      'P_H',
      { color: '#FF6B35' }
    );

    const realization = point3D.realize3D(world);
    expect(realization.isFeasible).toBe(true);

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
    const planeH = world.getProjectionPlaneById('P_H');
    const planeV = world.getProjectionPlaneById('P_V');
    
    if (!planeH || !planeV) throw new Error('Base planes not found');

    // Different x-coordinates: P_V has x=1, P_H has x=3
    // For P_H and P_V, equation 4 will fail: v₂ should equal z from equation system
    const pointV = new FreePoint2D('pv-mis', 'Vmis', new Vector3(1, 2, 1), { color: '#FF6B35' });
    planeV.addPoint(pointV);

    const pointH = new FreePoint2D('ph-mis', 'Hmis', new Vector3(3, 4, 1), { color: '#FF6B35' });
    planeH.addPoint(pointH);

    const point3D = new Point3DFromProjections(
      'p3d-mis',
      'Pmis',
      'pv-mis',
      'ph-mis',
      'P_V',
      'P_H',
      { color: '#FF6B35' }
    );

    const realization = point3D.realize3D(world);
    
    // Should be marked as infeasible due to inconsistent projections
    expect(realization.isFeasible).toBe(false);
  });

  /**
   * Test projection order independence
   * Creating 3D point with H first then V, or V first then H
   * should give same result
   */
  it('should be independent of projection order', () => {
    const planeH = world.getProjectionPlaneById('P_H');
    const planeV = world.getProjectionPlaneById('P_V');
    
    if (!planeH || !planeV) throw new Error('Base planes not found');

    const pointV = new FreePoint2D('pv-ord', 'Vord', new Vector3(5, 7, 1), { color: '#FF6B35' });
    planeV.addPoint(pointV);

    const pointH = new FreePoint2D('ph-ord', 'Hord', new Vector3(5, 9, 1), { color: '#FF6B35' });
    planeH.addPoint(pointH);

    // Order 1: V first, H second
    const point3D_VH = new Point3DFromProjections(
      'p3d-vh',
      'Pvh',
      'pv-ord',
      'ph-ord',
      'P_V',
      'P_H',
      { color: '#FF6B35' }
    );

    // Order 2: H first, V second
    const point3D_HV = new Point3DFromProjections(
      'p3d-hv',
      'Phv',
      'ph-ord',
      'pv-ord',
      'P_H',
      'P_V',
      { color: '#FF6B35' }
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
