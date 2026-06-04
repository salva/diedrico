/**
 * Plane3DFromTraces.test.ts
 * 
 * Tests for 3D plane reconstruction from trace lines.
 * Verifies that Plane3DFromTraces correctly reconstructs 3D planes
 * when trace lines intersect via hinge line points.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { World } from '../../../src/domain/world/World';
import { Plane3DFromTraces } from '../../../src/domain/world/Plane';
import { FreePoint2D, Point2DLineLineIntersection } from '../../../src/domain/world/Point';
import { Line2DByTwoPoints } from '../../../src/domain/world/Line';
import { HalfHingeLine2D } from '../../../src/domain/world/HingeLine';
import { Vector3 } from 'three';
import { createTestWorld } from '../../helpers/worldHelpers';

describe('Plane3DFromTraces - Intersecting via Hinge Line', () => {
  let world: World;

  beforeEach(() => {
    const { world: w } = createTestWorld();
    world = w;
  });

  /**
   * Test Case: User's actual scenario
   * 
   * 1. Initialize world
   * 2. Create two points A and B in P_H
   * 3. Create line L passing through A and B
   * 4. Create C as intersection of L with HL_HV
   * 5. Create point D in P_V
   * 6. Create line M between D and C' (C' is sibling of C)
   * 7. Define plane P with traces L and M
   * 
   * Expected: The 3D plane should be feasible since both lines share
   * point C on the hinge line (C and C' map to the same 3D point).
   */
  it('should create feasible 3D plane from user scenario', () => {
    const planeH = world.getProjectionPlaneById('projPlane3'); // P_H
    const planeV = world.getProjectionPlaneById('projPlane4'); // P_V
    
    expect(planeH).toBeDefined();
    expect(planeV).toBeDefined();
    
    if (!planeH || !planeV) throw new Error('Base planes not found');

    // Find the hinge line on P_H
    const hingeLineH = planeH.getAllLines().find(line => 
      line instanceof HalfHingeLine2D && line.hingeLineId === 'hingeLine7'
    );
    expect(hingeLineH).toBeDefined();
    if (!hingeLineH) throw new Error('Hinge line not found on P_H');

    // 2. Create two points A and B in P_H
    const pointA = new FreePoint2D(
      'projPlane3/point_A',
      new Vector3(10, 5, 1),
      'projPlane3'
    );
    planeH.addPoint(pointA);

    const pointB = new FreePoint2D(
      'projPlane3/point_B',
      new Vector3(20, -5, 1),
      'projPlane3'
    );
    planeH.addPoint(pointB);

    // 3. Create line L passing through A and B
    const lineL = new Line2DByTwoPoints(
      'projPlane3/line_L',
      'projPlane3/point_A',
      'projPlane3/point_B',
      'projPlane3'
    );
    planeH.addLine(lineL);

    // 4. Create C as intersection of L with HL_HV
    const pointC = new Point2DLineLineIntersection(
      'projPlane3/point_C',
      'projPlane3/line_L',
      hingeLineH.id,
      'projPlane3'
    );
    planeH.addPoint(pointC);

    // 5. Create sibling point C' on P_V (manual creation since we're in test)
    const pointCPrime = world.getConstructionService().addSiblingIntersectionPoint(planeV, pointC.id, 'projPlane4/point_C_prime');
    
    // Verify sibling relationship
    expect(pointC.siblingPointId).toBe(pointCPrime.id);
    expect(pointCPrime.primaryIntersectionId).toBe(pointC.id);

    // Debug: Check coordinates
    const cRealization = pointC.realize2D(world);
    const cPrimeRealization = pointCPrime.realize2D(world);
    console.log('[TEST] Point C coords on P_H:', cRealization.position);
    console.log('[TEST] Point C\' coords on P_V:', cPrimeRealization.position);
    
    // The two lines should intersect at C/C'
    // Let's verify the coordinates make sense
    expect(cRealization.feasible).toBe(true);
    expect(cPrimeRealization.feasible).toBe(true);
    expect(pointCPrime).toBeDefined();

    // 5. Create point D in P_V
    const pointD = new FreePoint2D(
      'projPlane4/point_D',
      new Vector3(15, 10, 1),
      'projPlane4'
    );
    planeV.addPoint(pointD);

    // 6. Create line M between D and C'
    const lineM = new Line2DByTwoPoints(
      'projPlane4/line_M',
      'projPlane4/point_D',
      pointC.siblingPointId!,
      'projPlane4'
    );
    planeV.addLine(lineM);

    // 7. Define plane P with traces L and M
    const planeP = new Plane3DFromTraces(
      'planeP',
      'Plane P',
      'projPlane3/line_L',  // trace on P_H
      'projPlane4/line_M',  // trace on P_V
      'projPlane3',
      'projPlane4'
    );

    // Realize the 3D plane
    const realization = planeP.realize3D(world);

    // Verify C and C' have identical 2D coordinates
    const coordsC = pointC.realize2D(world);
    const coordsCPrime = pointCPrime!.realize2D(world);
    
    console.log('[Test] Point C coords:', coordsC.position);
    console.log('[Test] Point C\' coords:', coordsCPrime.position);
    
    expect(coordsC.position.x).toBeCloseTo(coordsCPrime.position.x, 10);
    expect(coordsC.position.y).toBeCloseTo(coordsCPrime.position.y, 10);

    // The 3D plane MUST be feasible - this is the key assertion
    expect(realization.feasible).toBe(true);
  });

  /**
   * Test Case: Simplified version - directly using points with same 2D coords
   * 
   * This test verifies that when two lines share points with identical 2D 
   * coordinates on their respective planes, they should transform to the 
   * same 3D point and thus define a valid plane.
   */
  it('should handle points with identical 2D coordinates', () => {
    const planeV = world.getProjectionPlaneById('projPlane4'); // P_V
    const planeH = world.getProjectionPlaneById('projPlane3'); // P_H
    
    if (!planeV || !planeH) throw new Error('Base planes not found');

    // Create points ON THE HINGE LINE (v=0 in both planes' local coordinates)
    // The hinge line HL_HV is at v=0 in both P_H and P_V
    // So points with (u, 0) coordinates should map to the same 3D point
    const pointV = new FreePoint2D(
      'projPlane4/point_common',
      new Vector3(5, 0, 1),  // On hinge line: v=0
      'projPlane4'
    );
    planeV.addPoint(pointV);

    const pointH = new FreePoint2D(
      'projPlane3/point_common',
      new Vector3(5, 0, 1),  // On hinge line: v=0
      'projPlane3'
    );
    planeH.addPoint(pointH);

    // Create second point on P_V
    const pointV2 = new FreePoint2D(
      'projPlane4/point2',
      new Vector3(15, 20, 1),
      'projPlane4'
    );
    planeV.addPoint(pointV2);

    // Create second point on P_H
    const pointH2 = new FreePoint2D(
      'projPlane3/point2',
      new Vector3(15, -5, 1),
      'projPlane3'
    );
    planeH.addPoint(pointH2);

    // Create lines
    const lineV = new Line2DByTwoPoints(
      'projPlane4/line',
      'projPlane4/point_common',
      'projPlane4/point2',
      'projPlane4'
    );
    planeV.addLine(lineV);

    const lineH = new Line2DByTwoPoints(
      'projPlane3/line',
      'projPlane3/point_common',
      'projPlane3/point2',
      'projPlane3'
    );
    planeH.addLine(lineH);

    // Create 3D plane from traces
    const plane3D = new Plane3DFromTraces(
      'plane3d_simple',
      'Simple Plane',
      'projPlane4/line',
      'projPlane3/line',
      'projPlane4',
      'projPlane3'
    );

    // Realize the 3D plane
    const realization = plane3D.realize3D(world);

    // Check that the lines transform correctly
    const lineV_2D = lineV.realize2D(world);
    const lineH_2D = lineH.realize2D(world);
    
    expect(lineV_2D?.feasible).toBe(true);
    expect(lineH_2D?.feasible).toBe(true);

    // Verify that both lines have the "common" point with identical 2D coords
    const pointV_real = pointV.realize2D(world);
    const pointH_real = pointH.realize2D(world);
    
    expect(pointV_real.position.x).toBeCloseTo(pointH_real.position.x, 10);
    expect(pointV_real.position.y).toBeCloseTo(pointH_real.position.y, 10);

    // The 3D plane should be feasible - THIS IS THE MAIN TEST
    expect(realization.feasible).toBe(true);
  });
});
