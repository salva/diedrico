import { Vector3 } from 'three';
/**
 * Unit tests for PaperService
 * Tests Paper primitive generation from World entities
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Matrix3 } from 'three';
import { PaperService, type PrimitiveContext } from '../../../src/services/PaperService';
import { World } from '../../../src/domain/world/World';
import { type Point2D, FreePoint2D, IntersectionPoint2D } from '../../../src/domain/world/Point';
import { BaseProjectionPlane } from '../../../src/domain/world/ProjectionPlane';
import { RenderLayer, Paper, type PointPrimitive } from '../../../src/domain/presentation/Paper';

describe('PaperService', () => {
  let paperService: PaperService;
  let world: World;
  let planeTransforms: Map<string, Matrix3>;

  beforeEach(() => {
    paperService = new PaperService();
    world = new World();
    planeTransforms = new Map();

    // World initializes base projection planes P_H and P_V automatically
    // Get the projection planes from World
    const projPlaneH = world.projectionPlanes.get('proj_plane_H') as BaseProjectionPlane;
    const projPlaneV = world.projectionPlanes.get('proj_plane_V') as BaseProjectionPlane;

    // Get plane-to-paper transformation matrices directly
    const phRealization = projPlaneH.realize2D();
    planeTransforms.set('proj_plane_H', phRealization.planeToPaper);

    const pvRealization = projPlaneV.realize2D();
    planeTransforms.set('proj_plane_V', pvRealization.planeToPaper);
  });

  describe('Point Primitive Generation', () => {
    it('should generate PointPrimitive for free point on P_H', () => {
      // Create a free point at (100, 50) on P_H
      const projPlaneH = world.projectionPlanes.get('proj_plane_H');
      const point = new FreePoint2D('test-point-1', new Vector3(100, 50, 1), projPlaneH.id!, 'a_H');
      world.addPoint(point);

      // Generate primitives
      const context: PrimitiveContext = {
        world,
        planeTransforms,
      };

      const primitives = paperService.generatePrimitives(context);

      // Verify primitive generation
      expect(primitives).toHaveLength(1);
      expect(primitives[0].type).toBe('point');
      
      const pointPrimitive = primitives[0] as any;
      expect(pointPrimitive.id).toBe(`point-${point.id}`);
      expect(pointPrimitive.sourceEntityId).toBe(point.id);
      expect(pointPrimitive.visible).toBe(true);
      expect(pointPrimitive.layer).toBe(RenderLayer.Elements);

      // Verify transformation applied (P_H adds 200 to y)
      expect(pointPrimitive.x).toBe(100);
      expect(pointPrimitive.y).toBe(250); // 50 + 200

      // Verify style for free point
      expect(pointPrimitive.style.fill).toBe('#4A90E2'); // Free point blue
      expect(pointPrimitive.style.stroke).toBe('#333333');
      expect(pointPrimitive.radius).toBe(5); // Free points have radius 5
    });

    it('should generate PointPrimitive for intersection point on P_V', () => {
      // Create an intersection point at (80, 120) on P_V
      const projPlaneV = world.projectionPlanes.get('proj_plane_V');
      const point = new IntersectionPoint2D('test-point-2', 'line-1', 'line-2', 0, projPlaneV.id!, 'b_V');
      world.addPoint(point);

      // Generate primitives
      const context: PrimitiveContext = {
        world,
        planeTransforms,
      };

      const primitives = paperService.generatePrimitives(context);

      // Verify primitive generation
      expect(primitives).toHaveLength(1);
      const pointPrimitive = primitives[0] as any;

      // Note: Intersection points start at origin by default (0, 0)
      // Verify transformation applied (P_V: y offset -200)
      expect(pointPrimitive.x).toBe(0);
      expect(pointPrimitive.y).toBe(-200); // 0 - 200

      // Verify style for intersection point
      expect(pointPrimitive.style.fill).toBe('#E94E77'); // Derived point pink
      expect(pointPrimitive.radius).toBe(4); // Derived points have radius 4
    });

    it('should apply highlight style when point is highlighted', () => {
      const projPlaneH = world.projectionPlanes.get('proj_plane_H');
      const point = new FreePoint2D('test-point-3', new Vector3(50, 50, 1), projPlaneH.id!, 'c_H');
      world.addPoint(point);

      // Create context with highlighted entity
      const context: PrimitiveContext = {
        world,
        planeTransforms,
        highlightedEntityIds: new Set([point.id!]),
      };

      const primitives = paperService.generatePrimitives(context);
      const pointPrimitive = primitives[0] as any;

      // Verify highlight style
      expect(pointPrimitive.style.fill).toBe('#6BB6FF'); // Highlight blue for free
      expect(pointPrimitive.style.stroke).toBe('#000000');
      expect(pointPrimitive.style.strokeWidth).toBe(2);
    });

    it('should apply snap target style when point is active snap target', () => {
      const projPlaneH = world.projectionPlanes.get('proj_plane_H');
      const point = new FreePoint2D('test-point-4', new Vector3(75, 100, 1), projPlaneH.id!, 'd_H');
      world.addPoint(point);

      // Create context with snap target
      const context: PrimitiveContext = {
        world,
        planeTransforms,
        activeSnapTargetId: point.id!,
      };

      const primitives = paperService.generatePrimitives(context);
      const pointPrimitive = primitives[0] as any;

      // Verify snap target style
      expect(pointPrimitive.style.fill).toBe('#FFA500'); // Orange
      expect(pointPrimitive.style.stroke).toBe('#FF8C00');
      expect(pointPrimitive.layer).toBe(RenderLayer.Highlights);
    });

    it('should handle multiple points on different planes', () => {
      // Point on P_H
      const projPlaneH = world.projectionPlanes.get('proj_plane_H');
      const pointH = new FreePoint2D('test-point-5', new Vector3(10, 20, 1), projPlaneH.id!, 'e_H');
      world.addPoint(pointH);

      // Point on P_V
      const projPlaneV = world.projectionPlanes.get('proj_plane_V');
      const pointV = new FreePoint2D('test-point-6', new Vector3(30, 40, 1), projPlaneV.id!, 'e_V');
      world.addPoint(pointV);

      const context: PrimitiveContext = {
        world,
        planeTransforms,
      };

      const primitives = paperService.generatePrimitives(context);

      // Verify both primitives generated
      expect(primitives).toHaveLength(2);

      const primitive1 = primitives.find(p => p.sourceEntityId === pointH.id) as any;
      const primitive2 = primitives.find(p => p.sourceEntityId === pointV.id) as any;

      expect(primitive1).toBeDefined();
      expect(primitive2).toBeDefined();

      // Verify transformations
      expect(primitive1.x).toBe(10);
      expect(primitive1.y).toBe(220); // P_H: +200

      expect(primitive2.x).toBe(30);
      expect(primitive2.y).toBe(-160); // P_V: -200
    });

    it('should skip points with missing plane transforms', () => {
      // Create a point on a plane that doesn't have a transform
      const point = new FreePoint2D('test-point-no-transform', new Vector3(50, 50, 1), "plane_H", 'g');
      point.planeId = 'unknown-plane';
      world.points.set(point.id!, point);

      const context: PrimitiveContext = {
        world,
        planeTransforms, // Doesn't have 'unknown-plane'
      };

      const primitives = paperService.generatePrimitives(context);

      // No primitive should be generated
      expect(primitives).toHaveLength(0);
    });
  });

  describe('Coordinate Transformation', () => {
    it('should correctly apply plane-to-paper transformation matrix', () => {
      // Test with identity matrix (u,v) → (x,y) with offset
      const projPlaneH = world.projectionPlanes.get('proj_plane_H');
      const point = new FreePoint2D('test-point-7', new Vector3(0, 0, 1), projPlaneH.id!, 'h_H');
      world.addPoint(point);

      const context: PrimitiveContext = {
        world,
        planeTransforms,
      };

      const primitives = paperService.generatePrimitives(context);
      const primitive = primitives[0] as any;

      // Origin on P_H should map to (0, 200)
      expect(primitive.x).toBe(0);
      expect(primitive.y).toBe(200);
    });

    it('should handle negative plane coordinates', () => {
      const projPlaneH = world.projectionPlanes.get('proj_plane_H');
      const point = new FreePoint2D('test-point-8', new Vector3(-50, -100, 1), projPlaneH.id!, 'i_H');
      world.addPoint(point);

      const context: PrimitiveContext = {
        world,
        planeTransforms,
      };

      const primitives = paperService.generatePrimitives(context);
      const primitive = primitives[0] as any;

      // Should handle negatives correctly
      expect(primitive.x).toBe(-50);
      expect(primitive.y).toBe(100); // -100 + 200
    });
  });

  describe('Style Resolution', () => {
    it('should use different styles for free vs intersection points', () => {
      const projPlaneH = world.projectionPlanes.get('proj_plane_H');
      
      // Free point
      const freePoint = new FreePoint2D('test-point-9', new Vector3(10, 10, 1), projPlaneH.id!, 'j_H');
      world.addPoint(freePoint);

      // Intersection point
      const intersectionPoint = new IntersectionPoint2D('test-point-10', 'line-1', 'line-2', 0, projPlaneH.id!, 'k_H');
      world.addPoint(intersectionPoint);

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
      const projPlaneH = world.projectionPlanes.get('proj_plane_H');
      
      const freePoint = new FreePoint2D('test-point-11', new Vector3(10, 10, 1), projPlaneH.id!, 'l_H');
      world.addPoint(freePoint);

      const intersectionPoint = new IntersectionPoint2D('test-point-12', 'line-1', 'line-2', 0, projPlaneH.id!, 'm_H');
      world.addPoint(intersectionPoint);

      const context: PrimitiveContext = {
        world,
        planeTransforms,
        highlightedEntityIds: new Set([freePoint.id!, intersectionPoint.id!]),
      };

      const primitives = paperService.generatePrimitives(context);
      const freePrimitive = primitives.find(p => p.sourceEntityId === freePoint.id) as any;
      const intersectionPrimitive = primitives.find(p => p.sourceEntityId === intersectionPoint.id) as any;

      // Different highlight colors
      expect(freePrimitive.style.fill).toBe('#6BB6FF'); // Light blue
      expect(intersectionPrimitive.style.fill).toBe('#FF6B9D'); // Light pink
    });
  });

  describe('Paper Integration', () => {
    it('should update paper with generated primitives', () => {
      const paper = new Paper();

      const projPlaneH = world.projectionPlanes.get('proj_plane_H');
      const point = new FreePoint2D('test-point-13', new Vector3(50, 75, 1), projPlaneH.id!, 'n_H');
      world.addPoint(point);

      const context: PrimitiveContext = {
        world,
        planeTransforms,
      };

      paperService.updatePaper(paper, context);

      const primitives = paper.getPrimitives();
      expect(primitives).toHaveLength(1);
      expect(primitives[0].type).toBe('point');
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

      const projPlaneH = world.projectionPlanes.get('proj_plane_H');
      const point = new FreePoint2D('test-point-14', new Vector3(10, 20, 1), projPlaneH.id!, 'o_H');
      world.addPoint(point);

      const context: PrimitiveContext = {
        world,
        planeTransforms,
      };

      paperService.updatePaper(paper, context);

      const primitives = paper.getPrimitives();
      // Should only have new primitive
      expect(primitives).toHaveLength(1);
      expect(primitives[0].sourceEntityId).toBe(point.id);
    });

    it('should handle incremental entity update', () => {
      const paper = new Paper();

      const projPlaneH = world.projectionPlanes.get('proj_plane_H');
      
      // Add initial points
      const point1 = new FreePoint2D('test-point-15', new Vector3(10, 10, 1), projPlaneH.id!, 'p_H');
      world.addPoint(point1);

      const point2 = new FreePoint2D('test-point-16', new Vector3(20, 20, 1), projPlaneH.id!, 'q_H');
      world.addPoint(point2);

      const context: PrimitiveContext = {
        world,
        planeTransforms,
      };

      // Full update
      paperService.updatePaper(paper, context);
      expect(paper.getPrimitives()).toHaveLength(2);

      // Manually update point1's realization (simulating a move)
      const realization1 = world.getPoint2DRealization(point1.id!);
      if (realization1) {
        realization1.position = new Vector3(30, 30, 1);
      }

      // Incremental update
      paperService.updateEntity(point1.id!, paper, context);

      const primitives = paper.getPrimitives();
      expect(primitives).toHaveLength(2);

      // Verify point-1 was updated
      const updated = primitives.find(p => p.sourceEntityId === point1.id) as any;
      expect(updated.x).toBe(30);
      expect(updated.y).toBe(230); // 30 + 200
    });
  });
});
