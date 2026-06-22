/**
 * Unit tests for Phase 107: 3D Segment Realization
 * 
 * Tests:
 * 1. reconstruct3DPointFromProjections() shared utility
 * 2. Segment3DFromProjections.realize3D() with endpoint pairing
 * 3. Add3DSegmentOp compatibility validation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Vector3, Vector4 } from 'three';
import { reconstruct3DPointFromProjections, Matrix3x4 } from '@/utils/threeUtils';
import { Segment3DFromProjections } from '@/domain/world/Segment3D';
import { createVisualStyle } from '@/domain/world/VisualStyle';
import { createTestWorld, getHorizontalPlane, getVerticalPlane } from '../../helpers/worldHelpers';
import { AddFreePoint2DOp } from '@/commands/operations/world/AddFreePointOp';
import { AddSegment2DByPointsOp } from '@/commands/operations/world/AddSegmentOp';
import { Add3DSegmentOp } from '@/commands/operations/world/Add3DSegmentOp';
import { Command } from '@/commands/Command';
import type { World } from '@/domain/world/World';

describe('reconstruct3DPointFromProjections', () => {
  // Standard PH: threeDToPlane projects (x,y,z,1) → (x,y,1)
  const threeDToPlaneH = new Matrix3x4().set(
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 0, 1
  );

  // Standard PV: threeDToPlane projects (x,y,z,1) → (x,z,1)
  const threeDToPlaneV = new Matrix3x4().set(
    1, 0, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  );

  it('should reconstruct a point at origin', () => {
    const posH = new Vector3(0, 0, 1);  // (0,0) on PH → x=0, y=0
    const posV = new Vector3(0, 0, 1);  // (0,0) on PV → x=0, z=0
    
    const result = reconstruct3DPointFromProjections(posH, posV, threeDToPlaneH, threeDToPlaneV);
    
    expect(result.feasible).toBe(true);
    expect(result.point.x).toBeCloseTo(0);
    expect(result.point.y).toBeCloseTo(0);
    expect(result.point.z).toBeCloseTo(0);
  });

  it('should reconstruct a point at (5, 10, 15)', () => {
    // PH projection: (x,y) = (5,10)
    const posH = new Vector3(5, 10, 1);
    // PV projection: (x,z) = (5,15)
    const posV = new Vector3(5, 15, 1);
    
    const result = reconstruct3DPointFromProjections(posH, posV, threeDToPlaneH, threeDToPlaneV);
    
    expect(result.feasible).toBe(true);
    expect(result.point.x).toBeCloseTo(5);
    expect(result.point.y).toBeCloseTo(10);
    expect(result.point.z).toBeCloseTo(15);
  });

  it('should return infeasible for inconsistent projections', () => {
    // PH says x=5, PV says x=10 — inconsistent!
    const posH = new Vector3(5, 10, 1);
    const posV = new Vector3(10, 15, 1);
    
    const result = reconstruct3DPointFromProjections(posH, posV, threeDToPlaneH, threeDToPlaneV);
    
    expect(result.feasible).toBe(false);
    expect(result.error).toBeGreaterThan(1e-6);
  });

  it('should handle negative coordinates', () => {
    const posH = new Vector3(-3, -7, 1);
    const posV = new Vector3(-3, 4, 1);
    
    const result = reconstruct3DPointFromProjections(posH, posV, threeDToPlaneH, threeDToPlaneV);
    
    expect(result.feasible).toBe(true);
    expect(result.point.x).toBeCloseTo(-3);
    expect(result.point.y).toBeCloseTo(-7);
    expect(result.point.z).toBeCloseTo(4);
  });
});

describe('Segment3DFromProjections.realize3D()', () => {
  let world: World;
  let visibilityModel;
  let operationContext;

  beforeEach(() => {
    const { world: w, visibilityModel: vm, operationContext: oc } = createTestWorld();
    world = w;

    visibilityModel = vm;    operationContext = oc;  });

  /**
   * Helper: Create a 2D segment on a plane and return its ID
   */
  function createSegment2D(planeId: string, x1: number, y1: number, x2: number, y2: number): string {
    const plane = world.getProjectionPlaneById(planeId);
    const p1 = operationContext.projectionConstruction.addFreePoint2D(plane, new Vector3(x1, y1, 1));
    const p2 = operationContext.projectionConstruction.addFreePoint2D(plane, new Vector3(x2, y2, 1));
    const seg = operationContext.projectionConstruction.addSegment2DBetweenPoints(plane, p1.id, p2.id);
    return seg.id;
  }

  it('should reconstruct a 3D segment from compatible projections', () => {
    const planeH = getHorizontalPlane(world);
    const planeV = getVerticalPlane(world);

    // 3D segment from (2, 3, 4) to (6, 7, 8)
    // PH projection: (2,3)→(6,7)  [x,y coords]
    // PV projection: (2,4)→(6,8)  [x,z coords]
    const seg1Id = createSegment2D(planeH.id!, 2, 3, 6, 7);
    const seg2Id = createSegment2D(planeV.id!, 2, 4, 6, 8);

    const segment3D = new Segment3DFromProjections(
      'test_seg3d_1', 'S_test',
      seg1Id, seg2Id,
      planeH.id!, planeV.id!,
      createVisualStyle()
    );

    const realization = segment3D.realize3D(operationContext.realizationContext);

    expect(realization.isFeasible()).toBe(true);

    // One endpoint should be (2,3,4), the other (6,7,8)
    const start = realization.startPoint;
    const end = realization.endPoint;

    // Either ordering is valid, check both
    const isOrderA = 
      Math.abs(start.x - 2) < 0.01 && Math.abs(start.y - 3) < 0.01 && Math.abs(start.z - 4) < 0.01 &&
      Math.abs(end.x - 6) < 0.01 && Math.abs(end.y - 7) < 0.01 && Math.abs(end.z - 8) < 0.01;
    const isOrderB =
      Math.abs(start.x - 6) < 0.01 && Math.abs(start.y - 7) < 0.01 && Math.abs(start.z - 8) < 0.01 &&
      Math.abs(end.x - 2) < 0.01 && Math.abs(end.y - 3) < 0.01 && Math.abs(end.z - 4) < 0.01;

    expect(isOrderA || isOrderB).toBe(true);
  });

  it('should handle swapped endpoint pairing', () => {
    const planeH = getHorizontalPlane(world);
    const planeV = getVerticalPlane(world);

    // 3D segment from (1, 2, 3) to (5, 6, 7)
    // PH projection: endpoint order (1,2)→(5,6)
    // PV projection: REVERSED order (5,7)→(1,3) — requires Pairing B
    const seg1Id = createSegment2D(planeH.id!, 1, 2, 5, 6);
    const seg2Id = createSegment2D(planeV.id!, 5, 7, 1, 3);

    const segment3D = new Segment3DFromProjections(
      'test_seg3d_2', 'S_test2',
      seg1Id, seg2Id,
      planeH.id!, planeV.id!,
      createVisualStyle()
    );

    const realization = segment3D.realize3D(operationContext.realizationContext);

    expect(realization.isFeasible()).toBe(true);

    const start = realization.startPoint;
    const end = realization.endPoint;

    const isOrderA = 
      Math.abs(start.x - 1) < 0.01 && Math.abs(start.y - 2) < 0.01 && Math.abs(start.z - 3) < 0.01 &&
      Math.abs(end.x - 5) < 0.01 && Math.abs(end.y - 6) < 0.01 && Math.abs(end.z - 7) < 0.01;
    const isOrderB =
      Math.abs(start.x - 5) < 0.01 && Math.abs(start.y - 6) < 0.01 && Math.abs(start.z - 7) < 0.01 &&
      Math.abs(end.x - 1) < 0.01 && Math.abs(end.y - 2) < 0.01 && Math.abs(end.z - 3) < 0.01;

    expect(isOrderA || isOrderB).toBe(true);
  });

  it('should return infeasible for incompatible segment projections', () => {
    const planeH = getHorizontalPlane(world);
    const planeV = getVerticalPlane(world);

    // PH: segment (1,2)→(3,4) x-values: 1, 3
    // PV: segment (10,5)→(20,15) x-values: 10, 20 — no x match possible
    const seg1Id = createSegment2D(planeH.id!, 1, 2, 3, 4);
    const seg2Id = createSegment2D(planeV.id!, 10, 5, 20, 15);

    const segment3D = new Segment3DFromProjections(
      'test_seg3d_3', 'S_test3',
      seg1Id, seg2Id,
      planeH.id!, planeV.id!,
      createVisualStyle()
    );

    const realization = segment3D.realize3D(operationContext.realizationContext);

    expect(realization.isFeasible()).toBe(false);
  });

  it('should reconstruct a segment along x-axis', () => {
    const planeH = getHorizontalPlane(world);
    const planeV = getVerticalPlane(world);

    // 3D segment from (0,0,0) to (10,0,0) — along x-axis
    // PH: (0,0)→(10,0)  [y=0 on both]
    // PV: (0,0)→(10,0)  [z=0 on both]
    const seg1Id = createSegment2D(planeH.id!, 0, 0, 10, 0);
    const seg2Id = createSegment2D(planeV.id!, 0, 0, 10, 0);

    const segment3D = new Segment3DFromProjections(
      'test_seg3d_4', 'S_test4',
      seg1Id, seg2Id,
      planeH.id!, planeV.id!,
      createVisualStyle()
    );

    const realization = segment3D.realize3D(operationContext.realizationContext);

    expect(realization.isFeasible()).toBe(true);
    expect(realization.getLength()).toBeCloseTo(10);
  });
});

describe('Add3DSegmentOp compatibility validation', () => {
  let world: World;
  let visibilityModel;
  let command: Command;
  let operationContext;

  beforeEach(() => {
    const { world: w, visibilityModel: vm, operationContext: oc } = createTestWorld();
    world = w;

    visibilityModel = vm;    operationContext = oc;    command = new Command('test-cmd', operationContext);
  });

  function createSegment2DWithOps(planeId: string, x1: number, y1: number, x2: number, y2: number): string {
    const addP1 = new AddFreePoint2DOp(planeId, new Vector3(x1, y1, 1));
    const r1 = command.addAndExecute(addP1);
    const p1Id = r1.outputs.pointId as string;

    const addP2 = new AddFreePoint2DOp(planeId, new Vector3(x2, y2, 1));
    const r2 = command.addAndExecute(addP2);
    const p2Id = r2.outputs.pointId as string;

    const addSeg = new AddSegment2DByPointsOp(planeId, p1Id, p2Id);
    const r3 = command.addAndExecute(addSeg);
    return r3.outputs.segmentId as string;
  }

  it('should succeed for compatible segment projections', () => {
    const planeH = getHorizontalPlane(world);
    const planeV = getVerticalPlane(world);

    // Compatible: same x-values on both planes
    const seg1Id = createSegment2DWithOps(planeH.id!, 3, 5, 7, 9);
    const seg2Id = createSegment2DWithOps(planeV.id!, 3, 2, 7, 4);

    const op = new Add3DSegmentOp(seg1Id, seg2Id, planeH.id!, planeV.id!);
    const result = op.apply(operationContext);

    expect(result.success).toBe(true);
    expect(result.outputs.segmentId).toBeDefined();
  });

  it('should fail for incompatible segment projections', () => {
    const planeH = getHorizontalPlane(world);
    const planeV = getVerticalPlane(world);

    // Incompatible: x-values don't match at all
    const seg1Id = createSegment2DWithOps(planeH.id!, 1, 2, 3, 4);
    const seg2Id = createSegment2DWithOps(planeV.id!, 10, 5, 20, 15);

    const op = new Add3DSegmentOp(seg1Id, seg2Id, planeH.id!, planeV.id!);
    const result = op.apply(operationContext);

    expect(result.success).toBe(false);
    expect(result.error).toContain('incompatible');
  });

  it('should fail when projections are on the same plane', () => {
    const planeH = getHorizontalPlane(world);

    const seg1Id = createSegment2DWithOps(planeH.id!, 0, 0, 5, 5);
    const seg2Id = createSegment2DWithOps(planeH.id!, 1, 1, 6, 6);

    const op = new Add3DSegmentOp(seg1Id, seg2Id, planeH.id!, planeH.id!);
    const result = op.apply(operationContext);

    expect(result.success).toBe(false);
    expect(result.error).toContain('different planes');
  });
});
