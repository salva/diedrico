/**
 * Unit tests for Phase 106: 3D Element Projection Display
 * Tests that PaperService generates projected primitives for 3D elements
 * onto projection planes when showProjectedElements is enabled.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Vector3, Matrix3 } from 'three';
import { PaperService, type PrimitiveContext } from '../../../src/services/PaperService';
import type { World } from '../../../src/domain/world/World';
import { createTestWorld } from '../../helpers/worldHelpers';
import { Point3DFromProjections } from '../../../src/domain/world/Point3D';
import { createVisualStyle } from '../../../src/domain/world/VisualStyle';
import { AddFreePoint2DOp } from '../../../src/commands/operations/world/AddFreePointOp';
import { AddLine2DByTwoPointsOp } from '../../../src/commands/operations/world/AddLineOp';
import { Add3DLineOp } from '../../../src/commands/operations/world/Add3DLineOp';
import { Command } from '../../../src/commands/Command';
import type { PointPrimitive, LinePrimitive, SegmentPrimitive } from '../../../src/domain/presentation/Paper';

describe('PaperService - 3D Element Projection Display (Phase 106)', () => {
  let paperService: PaperService;
  let world: World;
  let planeTransforms: Map<string, Matrix3>;
  let planeHId: string;
  let planeVId: string;

  beforeEach(() => {
    paperService = new PaperService();
    const { world: w } = createTestWorld();
    world = w;
    planeTransforms = new Map();

    const projPlaneH = world.getProjectionPlaneByLabel('P_H');
    const projPlaneV = world.getProjectionPlaneByLabel('P_V');
    planeHId = projPlaneH.id!;
    planeVId = projPlaneV.id!;

    const phRealization = projPlaneH.realize2D();
    planeTransforms.set(planeHId, phRealization.planeToPaper2D);

    const pvRealization = projPlaneV.realize2D();
    planeTransforms.set(planeVId, pvRealization.planeToPaper2D);
  });

  /**
   * Helper: Create a 3D point from two 2D projections
   */
  function create3DPoint(hU: number, hV: number, vU: number, vV: number): string {
    const projPlaneH = world.getProjectionPlaneByLabel('P_H');
    const projPlaneV = world.getProjectionPlaneByLabel('P_V');

    const pointH = projPlaneH.addFreePoint2D(new Vector3(hU, hV, 1), world);
    const pointV = projPlaneV.addFreePoint2D(new Vector3(vU, vV, 1), world);

    const point3D = new Point3DFromProjections(
      `world/point3d_test_${Date.now()}`,
      'P_test',
      pointV.id!,
      pointH.id!,
      projPlaneV.id!,
      projPlaneH.id!,
      createVisualStyle()
    );

    world.add3DPoint(point3D);
    return point3D.id!;
  }

  /**
   * Helper: Create a 2D line on a plane via operations
   */
  function createLine2D(planeId: string, x1: number, y1: number, x2: number, y2: number, cmd: Command): string {
    const addP1 = new AddFreePoint2DOp(planeId, new Vector3(x1, y1, 1));
    const result1 = cmd.addAndExecute(addP1);
    const p1Id = result1.outputs.pointId as string;

    const addP2 = new AddFreePoint2DOp(planeId, new Vector3(x2, y2, 1));
    const result2 = cmd.addAndExecute(addP2);
    const p2Id = result2.outputs.pointId as string;

    const addLine = new AddLine2DByTwoPointsOp(planeId, p1Id, p2Id);
    const result3 = cmd.addAndExecute(addLine);
    return result3.outputs.lineId as string;
  }

  describe('showProjectedElements toggle', () => {
    it('should return empty array when showProjectedElements is false', () => {
      create3DPoint(5, 10, 5, 15);

      const context: PrimitiveContext = {
        world,
        planeTransforms,
        showProjectedElements: false,
      };

      const primitives = paperService.generatePrimitives(context);
      const projectedPrimitives = primitives.filter(p => p.id.startsWith('proj3d-'));
      expect(projectedPrimitives).toHaveLength(0);
    });

    it('should return empty array when showProjectedElements is undefined', () => {
      create3DPoint(5, 10, 5, 15);

      const context: PrimitiveContext = {
        world,
        planeTransforms,
      };

      const primitives = paperService.generatePrimitives(context);
      const projectedPrimitives = primitives.filter(p => p.id.startsWith('proj3d-'));
      expect(projectedPrimitives).toHaveLength(0);
    });
  });

  describe('3D Point projection', () => {
    it('should produce point primitives for a 3D point projected onto both planes', () => {
      // Create 3D point: P_H(5,10) means (5,10,0) and P_V(5,15) means (5,0,15)
      // Intersection: x=5, y=10, z=15  (u_H match = u_V = 5)
      const point3DId = create3DPoint(5, 10, 5, 15);

      const context: PrimitiveContext = {
        world,
        planeTransforms,
        showProjectedElements: true,
      };

      const primitives = paperService.generatePrimitives(context);
      const projectedPoints = primitives.filter(
        p => p.type === 'point' && p.id.startsWith('proj3d-')
      ) as PointPrimitive[];

      // Should project onto both P_H and P_V (2 projections)
      expect(projectedPoints.length).toBe(2);

      // Find projections on each plane
      const onH = projectedPoints.find(p => p.planeId === planeHId);
      const onV = projectedPoints.find(p => p.planeId === planeVId);
      expect(onH).toBeDefined();
      expect(onV).toBeDefined();

      // Verify IDs use proj3d- prefix
      expect(onH!.id).toContain('proj3d-point-');
      expect(onV!.id).toContain('proj3d-point-');

      // Verify sourceEntityId points to the 3D element
      expect(onH!.sourceEntityId).toBe(point3DId);
      expect(onV!.sourceEntityId).toBe(point3DId);
    });

    it('should use projected visual style (purple, transparent)', () => {
      create3DPoint(5, 10, 5, 15);

      const context: PrimitiveContext = {
        world,
        planeTransforms,
        showProjectedElements: true,
      };

      const primitives = paperService.generatePrimitives(context);
      const projectedPoints = primitives.filter(
        p => p.type === 'point' && p.id.startsWith('proj3d-')
      ) as PointPrimitive[];

      for (const pp of projectedPoints) {
        expect(pp.style.fill).toBe('#9B59B6');
        expect(pp.style.opacity).toBe(0.35);
        expect(pp.radius).toBe(6);
      }
    });
  });

  describe('3D Line projection', () => {
    it('should produce line primitives for a 3D line projected onto both planes', () => {
      const cmd = new Command('test-3d-line', world);

      // Create horizontal line on P_H: direction (1,0) → 3D direction has non-zero x,y=0
      const lineHId = createLine2D(planeHId, 0, 0, 50, 50, cmd);
      // Create matching line on P_V: direction (1,0) → 3D direction has non-zero x,z=0
      const lineVId = createLine2D(planeVId, 0, 0, 50, 50, cmd);

      const addLine3D = new Add3DLineOp(lineHId, lineVId, planeHId, planeVId);
      const result = cmd.addAndExecute(addLine3D);
      cmd.commit();

      const line3DId = result.outputs.lineId as string;
      expect(line3DId).toBeDefined();

      const context: PrimitiveContext = {
        world,
        planeTransforms,
        showProjectedElements: true,
      };

      const primitives = paperService.generatePrimitives(context);
      const projectedLines = primitives.filter(
        p => p.type === 'line' && p.id.startsWith('proj3d-')
      ) as LinePrimitive[];

      // Should project onto both planes
      expect(projectedLines.length).toBe(2);

      const onH = projectedLines.find(p => p.planeId === planeHId);
      const onV = projectedLines.find(p => p.planeId === planeVId);
      expect(onH).toBeDefined();
      expect(onV).toBeDefined();

      // Verify visual style
      expect(onH!.style.stroke).toBe('#9B59B6');
      expect(onH!.style.strokeWidth).toBe(3);
      expect(onH!.style.opacity).toBe(0.35);
    });
  });

  describe('Infeasible element exclusion', () => {
    it('should exclude infeasible 3D points from projection', () => {
      // Create infeasible 3D point: different u-coordinates on P_H and P_V
      // P_H(10, 5) and P_V(20, 5) → x doesn't agree (10 vs 20) → infeasible
      const projPlaneH = world.getProjectionPlaneByLabel('P_H');
      const projPlaneV = world.getProjectionPlaneByLabel('P_V');

      const pointH = projPlaneH.addFreePoint2D(new Vector3(10, 5, 1), world);
      const pointV = projPlaneV.addFreePoint2D(new Vector3(20, 5, 1), world);

      const point3D = new Point3DFromProjections(
        'world/point3d_infeasible',
        'P_inf',
        pointV.id!,
        pointH.id!,
        projPlaneV.id!,
        projPlaneH.id!,
        createVisualStyle()
      );

      world.add3DPoint(point3D);

      // Verify it's infeasible
      const realization = point3D.realize3D(world);
      expect(realization.isFeasible()).toBe(false);

      const context: PrimitiveContext = {
        world,
        planeTransforms,
        showProjectedElements: true,
      };

      const primitives = paperService.generatePrimitives(context);
      const projectedPrimitives = primitives.filter(p => p.id.startsWith('proj3d-'));
      expect(projectedPrimitives).toHaveLength(0);
    });
  });
});
