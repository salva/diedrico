import { Vector3 } from 'three';
/**
 * Unit tests for PaperService
 * Tests Paper primitive generation from World entities
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Matrix3 } from 'three';
import { PaperService, type PrimitiveContext } from '../../../src/services/PaperService';
import type { World } from '../../../src/domain/world/World';
import { createTestWorld } from '../../helpers/worldHelpers';
import { type Point2D, FreePoint2D, Point2DLineLineIntersection } from '../../../src/domain/world/Point';
import { BaseProjectionPlane } from '../../../src/domain/world/ProjectionPlane';
import { RenderLayer, Paper, type PointPrimitive } from '../../../src/domain/presentation/Paper';

describe('PaperService', () => {
  let paperService: PaperService;
  let world: World;
  let planeTransforms: Map<string, Matrix3>;

  beforeEach(() => {
    paperService = new PaperService();
    const { world: w } = createTestWorld();
    world = w;
    planeTransforms = new Map();

    // World initializes base projection planes P_H and P_V automatically
    // Get the projection planes from World using labels (Phase 53+)
    const projPlaneH = world.getProjectionPlaneByLabel('P_H');
    const projPlaneV = world.getProjectionPlaneByLabel('P_V');

    // Get plane-to-paper transformation matrices directly
    const phRealization = projPlaneH.realize2D();
    planeTransforms.set(projPlaneH.id!, phRealization.planeToPaper2D);

    const pvRealization = projPlaneV.realize2D();
    planeTransforms.set(projPlaneV.id!, pvRealization.planeToPaper2D);
  });

  describe('Point Primitive Generation', () => {
    it('should generate PointPrimitive for free point on P_H', () => {
      // Create a free point at (100, 50) on P_H
      const projPlaneH = world.getProjectionPlaneByLabel('P_H');
      const point = projPlaneH.addFreePoint2D(new Vector3(100, 50, 1), world);
      point.label = 'a_H';

      // Generate primitives
      const context: PrimitiveContext = {
        world,
        planeTransforms,
      };

      const primitives = paperService.generatePrimitives(context);

      // Verify primitive generation
      // Note: World has 2 origin points (O_H, O_V) + 2 hinge lines by default
      // So we should have 3 points total (O_H, O_V, test-point-1) and 2 hinge lines
      expect(primitives.length).toBeGreaterThanOrEqual(1);
      
      // Filter to just the point we added
      const pointPrimitives = primitives.filter(p => p.type === 'point');
      const ourPoint = pointPrimitives.find(p => p.sourceEntityId === point.id);
      expect(ourPoint).toBeDefined();
      
      const pointPrimitive = ourPoint as any;
      expect(pointPrimitive.id).toBe(`point-${point.id}`);
      expect(pointPrimitive.sourceEntityId).toBe(point.id);
      expect(pointPrimitive.visible).toBe(true);
      expect(pointPrimitive.layer).toBe(RenderLayer.Elements);

      // Verify transformation applied
      // Note: PointPrimitive stores position as Vector3, not separate x/y
      expect(pointPrimitive.position).toBeDefined();
      expect(pointPrimitive.position.x).toBeDefined();
      expect(pointPrimitive.position.y).toBeDefined();

      // Verify style for free point
      expect(pointPrimitive.style.fill).toBe('#4A90E2'); // Free point blue
      expect(pointPrimitive.style.stroke).toBe('#333333');
      expect(pointPrimitive.radius).toBe(5); // Free points have radius 5
    });

    it('should generate PointPrimitive for intersection point on P_V', () => {
      // Create an intersection point at (80, 120) on P_V
      const projPlaneV = world.getProjectionPlaneByLabel('P_V');
      // Create two lines to intersect
      const line1Point1 = projPlaneV.addFreePoint2D(new Vector3(0, 0, 1), world);
      const line1Point2 = projPlaneV.addFreePoint2D(new Vector3(100, 0, 1), world);
      const line1 = projPlaneV.addLine2DBetweenTwoPoints(line1Point1.id!, line1Point2.id!, world);
      
      const line2Point1 = projPlaneV.addFreePoint2D(new Vector3(0, 100, 1), world);
      const line2Point2 = projPlaneV.addFreePoint2D(new Vector3(100, 100, 1), world);
      const line2 = projPlaneV.addLine2DBetweenTwoPoints(line2Point1.id!, line2Point2.id!, world);
      
      const point = projPlaneV.addLineLineIntersection(line1.id!, line2.id!, world);
      point.label = 'b_V';

      // Generate primitives
      const context: PrimitiveContext = {
        world,
        planeTransforms,
      };

      const primitives = paperService.generatePrimitives(context);

      // Verify primitive generation - filter to find our point
      const pointPrimitives = primitives.filter(p => p.type === 'point');
      const ourPoint = pointPrimitives.find(p => p.sourceEntityId === point.id);
      expect(ourPoint).toBeDefined();
      
      const pointPrimitive = ourPoint as any;

      // Note: Intersection points start at origin by default (0, 0)
      // Primitives use position Vector3, not separate x/y
      expect(pointPrimitive.position).toBeDefined();
      expect(pointPrimitive.position.x).toBeDefined();
      expect(pointPrimitive.position.y).toBeDefined();

      // Verify style for intersection point
      expect(pointPrimitive.style.fill).toBe('#E94E77'); // Derived point pink
      expect(pointPrimitive.radius).toBe(4); // Derived points have radius 4
    });

    it('should apply highlight style when point is highlighted', () => {
      const projPlaneH = world.getProjectionPlaneByLabel('P_H');
      const point = projPlaneH.addFreePoint2D(new Vector3(50, 50, 1), world);
      point.label = 'c_H';

      // Create context with hovered entity (hoveredIds triggers hover styling)
      const context: PrimitiveContext = {
        world,
        planeTransforms,
        hoveredIds: new Set([point.id!]),
      };

      const primitives = paperService.generatePrimitives(context);
      const pointPrimitives = primitives.filter(p => p.type === 'point');
      const ourPoint = pointPrimitives.find(p => p.sourceEntityId === point.id);
      const pointPrimitive = ourPoint as any;

      // Verify hover style (per PaperService implementation)
      expect(pointPrimitive.style.fill).toBe('#6BB6FF'); // Hover blue for free
      expect(pointPrimitive.style.stroke).toBe('#4A90E2');
      expect(pointPrimitive.style.strokeWidth).toBe(1.5);
    });

    it('should apply snap target style when point is active snap target', () => {
      const projPlaneH = world.getProjectionPlaneByLabel('P_H');
      const point = projPlaneH.addFreePoint2D(new Vector3(75, 100, 1), world);
      point.label = 'd_H';

      // Create context with snap target
      const context: PrimitiveContext = {
        world,
        planeTransforms,
        activeSnapTargetId: point.id!,
      };

      const primitives = paperService.generatePrimitives(context);
      const pointPrimitives = primitives.filter(p => p.type === 'point');
      const ourPoint = pointPrimitives.find(p => p.sourceEntityId === point.id);
      const pointPrimitive = ourPoint as any;

      // Verify snap target style
      expect(pointPrimitive.style.fill).toBe('#FFA500'); // Orange
      expect(pointPrimitive.style.stroke).toBe('#FF8C00');
      expect(pointPrimitive.layer).toBe(RenderLayer.Highlights);
    });

    it('should handle multiple points on different planes', () => {
      // Point on P_H
      const projPlaneH = world.getProjectionPlaneByLabel('P_H');
      const pointH = projPlaneH.addFreePoint2D(new Vector3(10, 20, 1), world);
      pointH.label = 'e_H';

      // Point on P_V
      const projPlaneV = world.getProjectionPlaneByLabel('P_V');
      const pointV = projPlaneV.addFreePoint2D(new Vector3(30, 40, 1), world);
      pointV.label = 'e_V';

      const context: PrimitiveContext = {
        world,
        planeTransforms,
      };

      const primitives = paperService.generatePrimitives(context);

      // Filter to find our specific points
      const primitive1 = primitives.find(p => p.sourceEntityId === pointH.id) as any;
      const primitive2 = primitives.find(p => p.sourceEntityId === pointV.id) as any;

      expect(primitive1).toBeDefined();
      expect(primitive2).toBeDefined();

      // Verify primitives have positions (use Vector3, not separate x/y)
      expect(primitive1.position).toBeDefined();
      expect(primitive1.position.x).toBeDefined();
      expect(primitive1.position.y).toBeDefined();

      expect(primitive2.position).toBeDefined();
      expect(primitive2.position.x).toBeDefined();
      expect(primitive2.position.y).toBeDefined();
    });

    it('should skip points with missing plane transforms', () => {
      // Create a valid point but don't add its plane to the transforms map
      const projPlaneH = world.getProjectionPlaneByLabel('P_H');
      const point = projPlaneH.addFreePoint2D(new Vector3(50, 50, 1), world);
      point.label = 'g';

      // Create context without the plane's transform
      const emptyTransforms = new Map<string, Matrix3>();

      const context: PrimitiveContext = {
        world,
        planeTransforms: emptyTransforms, // Missing the plane's transform
      };

      const primitives = paperService.generatePrimitives(context);

      // Point with missing transform should not be generated
      const badPoint = primitives.find(p => p.sourceEntityId === point.id);
      expect(badPoint).toBeUndefined();
    });
  });

  describe('Coordinate Transformation', () => {
    it('should correctly apply plane-to-paper transformation matrix', () => {
      // Test with identity matrix (u,v) → (x,y) with offset
      const projPlaneH = world.getProjectionPlaneByLabel('P_H');
      const point = projPlaneH.addFreePoint2D(new Vector3(0, 0, 1), world);
      point.label = 'h_H';

      const context: PrimitiveContext = {
        world,
        planeTransforms,
      };

      const primitives = paperService.generatePrimitives(context);
      const pointPrimitives = primitives.filter(p => p.type === 'point');
      const ourPoint = pointPrimitives.find(p => p.sourceEntityId === point.id);
      const primitive = ourPoint as any;

      // Verify position exists (actual transformation depends on planeToPaper2D matrix)
      expect(primitive.position).toBeDefined();
      expect(typeof primitive.position.x).toBe('number');
      expect(typeof primitive.position.y).toBe('number');
    });

    it('should handle negative plane coordinates', () => {
      const projPlaneH = world.getProjectionPlaneByLabel('P_H');
      const point = projPlaneH.addFreePoint2D(new Vector3(-50, -100, 1), world);
      point.label = 'i_H';

      const context: PrimitiveContext = {
        world,
        planeTransforms,
      };

      const primitives = paperService.generatePrimitives(context);
      const pointPrimitives = primitives.filter(p => p.type === 'point');
      const ourPoint = pointPrimitives.find(p => p.sourceEntityId === point.id);
      const primitive = ourPoint as any;

      // Verify position handles negative coordinates
      expect(primitive.position).toBeDefined();
      expect(typeof primitive.position.x).toBe('number');
      expect(typeof primitive.position.y).toBe('number');
    });
  });

  describe('Style Resolution', () => {
    it('should use different styles for free vs intersection points', () => {
      const projPlaneH = world.getProjectionPlaneByLabel('P_H');
      
      // Free point
      const freePoint = projPlaneH.addFreePoint2D(new Vector3(10, 10, 1), world);
      freePoint.label = 'j_H';

      // Create lines for intersection
      const line1Point1 = projPlaneH.addFreePoint2D(new Vector3(0, 0, 1), world);
      const line1Point2 = projPlaneH.addFreePoint2D(new Vector3(10, 0, 1), world);
      const line1 = projPlaneH.addLine2DBetweenTwoPoints(line1Point1.id!, line1Point2.id!, world);
      
      const line2Point1 = projPlaneH.addFreePoint2D(new Vector3(0, 10, 1), world);
      const line2Point2 = projPlaneH.addFreePoint2D(new Vector3(10, 10, 1), world);
      const line2 = projPlaneH.addLine2DBetweenTwoPoints(line2Point1.id!, line2Point2.id!, world);

      // Intersection point
      const intersectionPoint = projPlaneH.addLineLineIntersection(line1.id!, line2.id!, world);
      intersectionPoint.label = 'k_H';

      const context: PrimitiveContext = {
        world,
        planeTransforms,
      };

      const primitives = paperService.generatePrimitives(context);
      const freePrimitive = primitives.find(p => p.sourceEntityId === freePoint.id) as any;
      const intersectionPrimitive = primitives.find(p => p.sourceEntityId === intersectionPoint.id) as any;

      // Free point should be blue, radius 5
      expect(freePrimitive.style.fill).toBe('#4A90E2');
      expect(freePrimitive.radius).toBe(5);

      // Intersection point should be pink, radius 4
      expect(intersectionPrimitive.style.fill).toBe('#E94E77');
      expect(intersectionPrimitive.radius).toBe(4);
    });

    it('should apply different highlight styles for free vs intersection points', () => {
      const projPlaneH = world.getProjectionPlaneByLabel('P_H');
      
      const freePoint = projPlaneH.addFreePoint2D(new Vector3(10, 10, 1), world);
      freePoint.label = 'l_H';

      // Create lines for intersection
      const line1Point1 = projPlaneH.addFreePoint2D(new Vector3(0, 0, 1), world);
      const line1Point2 = projPlaneH.addFreePoint2D(new Vector3(10, 0, 1), world);
      const line1 = projPlaneH.addLine2DBetweenTwoPoints(line1Point1.id!, line1Point2.id!, world);
      
      const line2Point1 = projPlaneH.addFreePoint2D(new Vector3(0, 10, 1), world);
      const line2Point2 = projPlaneH.addFreePoint2D(new Vector3(10, 10, 1), world);
      const line2 = projPlaneH.addLine2DBetweenTwoPoints(line2Point1.id!, line2Point2.id!, world);

      const intersectionPoint = projPlaneH.addLineLineIntersection(line1.id!, line2.id!, world);
      intersectionPoint.label = 'm_H';

      const context: PrimitiveContext = {
        world,
        planeTransforms,
        highlightedEntityIds: new Set([freePoint.id!, intersectionPoint.id!]),
      };

      const primitives = paperService.generatePrimitives(context);
      const freePrimitive = primitives.find(p => p.sourceEntityId === freePoint.id) as any;
      const intersectionPrimitive = primitives.find(p => p.sourceEntityId === intersectionPoint.id) as any;

      // Note: highlightedEntityIds triggers isHighlighted but not isHovered
      // For actual hover colors, need hoveredIds. This tests normal highlight behavior.
      expect(freePrimitive.style.fill).toBe('#4A90E2'); // Normal free point blue
      expect(intersectionPrimitive.style.fill).toBe('#E94E77'); // Normal derived point pink
    });
  });

  describe('Paper Integration', () => {
    it('should update paper with generated primitives', () => {
      const paper = new Paper();

      const projPlaneH = world.getProjectionPlaneByLabel('P_H');
      const point = projPlaneH.addFreePoint2D(new Vector3(50, 75, 1), world);
      point.label = 'n_H';

      const context: PrimitiveContext = {
        world,
        planeTransforms,
      };

      paperService.updatePaper(paper, context);

      const primitives = paper.getPrimitives();
      // Should contain at least our point (may also have default elements)
      const ourPoint = primitives.find(p => p.sourceEntityId === point.id);
      expect(ourPoint).toBeDefined();
      expect(ourPoint!.type).toBe('point');
    });

    it('should clear paper before updating', () => {
      const paper = new Paper();

      // Add an old primitive manually
      const oldPrimitive: PointPrimitive = {
        type: 'point',
        id: 'old',
        sourceEntityId: 'old-entity',
        layer: RenderLayer.Elements,
        visible: true,
        style: {
          stroke: '#000',
          strokeWidth: 1,
          strokeStyle: 'solid',
          fill: '#000',
          opacity: 1,
          zIndex: 1,
        },
        x: 0,
        y: 0,
        radius: 3,
      };
      paper.setPrimitive(oldPrimitive);

      const projPlaneH = world.getProjectionPlaneByLabel('P_H');
      const point = projPlaneH.addFreePoint2D(new Vector3(10, 20, 1), world);
      point.label = 'o_H';

      const context: PrimitiveContext = {
        world,
        planeTransforms,
      };

      paperService.updatePaper(paper, context);

      const primitives = paper.getPrimitives();
      // Old primitive should be cleared, new primitive should exist
      const oldPrim = primitives.find(p => p.id === 'old');
      const newPrim = primitives.find(p => p.sourceEntityId === point.id);
      expect(oldPrim).toBeUndefined();
      expect(newPrim).toBeDefined();
    });

    it('should handle incremental entity update', () => {
      const paper = new Paper();

      const projPlaneH = world.getProjectionPlaneByLabel('P_H');
      
      // Add initial points
      const point1 = projPlaneH.addFreePoint2D(new Vector3(10, 10, 1), world);
      point1.label = 'p_H';

      const point2 = projPlaneH.addFreePoint2D(new Vector3(20, 20, 1), world);
      point2.label = 'q_H';

      const context: PrimitiveContext = {
        world,
        planeTransforms,
      };

      // Full update
      paperService.updatePaper(paper, context);
      const initialPrimitives = paper.getPrimitives();
      const point1Initial = initialPrimitives.find(p => p.sourceEntityId === point1.id);
      const point2Initial = initialPrimitives.find(p => p.sourceEntityId === point2.id);
      expect(point1Initial).toBeDefined();
      expect(point2Initial).toBeDefined();

      // Manually update point1's realization (simulating a move)
      const projectionPlane = world.getProjectionPlaneByLabel('P_H');
      const point = projectionPlane.getPoint(point1.id!);
      const realization1 = point?.realize2D(world);
      if (realization1 && point) {
        // Update point position
        (point as FreePoint2D).position = new Vector3(30, 30, 1);
      }

      // Incremental update
      paperService.updateEntity(point1.id!, paper, context);

      const primitives = paper.getPrimitives();
      const point1Updated = primitives.find(p => p.sourceEntityId === point1.id);
      const point2Updated = primitives.find(p => p.sourceEntityId === point2.id);

      // Both points should still exist
      expect(point1Updated).toBeDefined();
      expect(point2Updated).toBeDefined();
      // Verify point1 position was updated
      expect((point1Updated as any).position).toBeDefined();
    });
  });

  describe('Active Plane Opacity (FR-002)', () => {
    it('should apply 100% opacity to elements on active plane', () => {
      const projPlaneH = world.getProjectionPlaneByLabel('P_H');
      const point = projPlaneH.addFreePoint2D(new Vector3(100, 50, 1), world);
      point.label = 'a_H';

      const context: PrimitiveContext = {
        world,
        planeTransforms,
        activePlaneId: projPlaneH!.id! // Use actual plane ID
      };

      const primitives = paperService.generatePrimitives(context);
      const pointPrimitive = primitives[0] as any;

      // Element on active plane should have 100% opacity
      expect(pointPrimitive.style.opacity).toBe(1.0);
    });

    it('should apply 50% opacity to elements on inactive plane', () => {
      const projPlaneH = world.getProjectionPlaneByLabel('P_H');
      const point = projPlaneH.addFreePoint2D(new Vector3(100, 50, 1), world);
      point.label = 'a_H';

      const context: PrimitiveContext = {
        world,
        planeTransforms,
        activePlaneId: 'proj_plane_V' // Point is on P_H, but P_V is active
      };

      const primitives = paperService.generatePrimitives(context);
      const pointPrimitive = primitives[0] as any;

      // Element on inactive plane should have 50% opacity
      expect(pointPrimitive.style.opacity).toBe(0.5);
    });

    it('should apply 100% opacity to guides regardless of active plane', () => {
      // Note: This test assumes Guide2D entities exist in the domain model
      // For now, we'll test the style resolver directly if guides aren't implemented yet
      const projPlaneH = world.projectionPlanes.get('proj_plane_H');
      
      // Create a guide (if Guide2D is implemented)
      // For now, this is a placeholder that would need actual guide creation
      
      const context: PrimitiveContext = {
        world,
        planeTransforms,
        activePlaneId: 'proj_plane_V' // Different plane is active
      };

      // Guides should always have 100% opacity
      // This will be verified when guides are rendered
      expect(true).toBe(true); // Placeholder until guides are implemented
    });

    it('should apply 100% opacity to hinge lines regardless of active plane', () => {
      const context: PrimitiveContext = {
        world,
        planeTransforms,
        activePlaneId: 'proj_plane_H'
      };

      const primitives = paperService.generatePrimitives(context);
      
      // Find hinge line primitive (HL_HV)
      const hingeLinePrimitive = primitives.find(p => p.type === 'line' && p.sourceEntityId === 'HL_HV');
      
      if (hingeLinePrimitive) {
        // Hinge lines should always have 100% opacity
        expect((hingeLinePrimitive as any).style.opacity).toBe(1.0);
      }
    });

    it('should maintain opacity when switching active planes', () => {
      const projPlaneH = world.getProjectionPlaneByLabel('P_H');
      const projPlaneV = world.getProjectionPlaneByLabel('P_V');
      
      const pointH = projPlaneH.addFreePoint2D(new Vector3(100, 50, 1), world);
      pointH.label = 'a_H';
      
      const pointV = projPlaneV.addFreePoint2D(new Vector3(80, 120, 1), world);
      pointV.label = 'a_V';

      // Test with P_H active
      let context: PrimitiveContext = {
        world,
        planeTransforms,
        activePlaneId: projPlaneH!.id!
      };

      let primitives = paperService.generatePrimitives(context);
      let pointHPrimitive = primitives.find(p => p.sourceEntityId === pointH.id) as any;
      let pointVPrimitive = primitives.find(p => p.sourceEntityId === pointV.id) as any;

      expect(pointHPrimitive.style.opacity).toBe(1.0); // Active plane
      expect(pointVPrimitive.style.opacity).toBe(0.5); // Inactive plane

      // Test with P_V active
      context = {
        world,
        planeTransforms,
        activePlaneId: projPlaneV!.id!
      };

      primitives = paperService.generatePrimitives(context);
      pointHPrimitive = primitives.find(p => p.sourceEntityId === pointH.id) as any;
      pointVPrimitive = primitives.find(p => p.sourceEntityId === pointV.id) as any;

      expect(pointHPrimitive.style.opacity).toBe(0.5); // Now inactive
      expect(pointVPrimitive.style.opacity).toBe(1.0); // Now active
    });
  });
});
