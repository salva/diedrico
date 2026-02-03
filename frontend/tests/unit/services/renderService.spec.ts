import { Vector3, Vector4 } from 'three';
/**
 * renderService.spec.ts
 * Unit tests for RenderService
 * 
 * Tests cover:
 * - Generic point rendering
 * - Generic plane rendering  
 * - Generic line rendering
 * - Hover and selection state application
 * - Constitution Principle IV: No special-case rendering
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  renderPoint, 
  renderPlane, 
  renderLine,
  applyHoverState,
  applySelectionState
} from '@/services/RenderService';
import { Point2D, FreePoint2D, IntersectionPoint2D, Point2DRealization2D } from '@/domain/world/Point';
import { Plane3D, Plane3DFixed } from "@/domain/world/Plane";
import type { World } from '@/domain/world/World';
import { createTestWorld } from '../../helpers/worldHelpers';

describe('RenderService', () => {
  let world: World;
  let projPlaneH: any;

  beforeEach(() => {
    const { world: w } = createTestWorld();
    world = w;
    projPlaneH = world.getProjectionPlaneByLabel('P_H');
  });

  describe('renderPoint', () => {
    it('should render free point as SVG circle attributes', () => {
      const point = projPlaneH.addFreePoint2D(new Vector3(100, 50, 1), world);
      const realization = new Point2DRealization2D(new Vector3(100, 50, 1));
      
      const attrs = renderPoint(point, realization, world, 400, 400);
      
      // Matrix has origin at (800, 500) baked in
      expect(attrs.cx).toBe(900);  // 800 + 100
      expect(attrs.cy).toBe(550);  // 500 + 50
      expect(attrs.r).toBe(5);
      expect(attrs.fill).toBe('#4A90E2');  // Free point color
      expect(attrs['data-element-id']).toBe(point.id);  // Phase 63: Use actual hierarchical ID
      expect(attrs['data-element-type']).toBe('point');
    });

    it('should render derived point with different styling', () => {
      // Create lines to intersect
      const line1Point1 = projPlaneH.addFreePoint2D(new Vector3(0, 0, 1), world);
      const line1Point2 = projPlaneH.addFreePoint2D(new Vector3(100, 0, 1), world);
      const line1 = projPlaneH.addLine2DBetweenTwoPoints(line1Point1.id!, line1Point2.id!, world);
      
      const line2Point1 = projPlaneH.addFreePoint2D(new Vector3(0, 100, 1), world);
      const line2Point2 = projPlaneH.addFreePoint2D(new Vector3(100, 100, 1), world);
      const line2 = projPlaneH.addLine2DBetweenTwoPoints(line2Point1.id!, line2Point2.id!, world);
      
      const point = projPlaneH.addLineLineIntersection(line1.id!, line2.id!, world);
      const realization = new Point2DRealization2D(new Vector3(0, 0, 1));
      
      const attrs = renderPoint(point, realization, world);
      
      expect(attrs.r).toBe(4);  // Smaller radius
      expect(attrs.fill).toBe('#E94E77');  // Derived point color
    });

    it('should handle negative coordinates', () => {
      const point = projPlaneH.addFreePoint2D(new Vector3(-50, -30, 1), world);
      const realization = new Point2DRealization2D(new Vector3(-50, -30, 1));
      
      const attrs = renderPoint(point, realization, world, 400, 400);
      
      // Matrix has origin at (800, 500) baked in
      expect(attrs.cx).toBe(750);  // 800 - 50
      expect(attrs.cy).toBe(470);  // 500 - 30
    });

    it('should handle custom canvas origin', () => {
      const point = projPlaneH.addFreePoint2D(new Vector3(10, 20, 1), world);
      const realization = new Point2DRealization2D(new Vector3(10, 20, 1));
      
      const attrs = renderPoint(point, realization, world, 200, 300);
      
      // Matrix has origin at (800, 500) baked in - custom origin parameters are ignored
      expect(attrs.cx).toBe(810);  // 800 + 10
      expect(attrs.cy).toBe(520);  // 500 + 20
    });

    it('should handle point without ID', () => {
      const point = projPlaneH.addFreePoint2D(new Vector3(0, 0, 1), world);
      const realization = new Point2DRealization2D(new Vector3(0, 0, 1));
      
      const attrs = renderPoint(point, realization, world);
      
      // Phase 63: Point should have hierarchical ID
      expect(attrs['data-element-id']).toBe(point.id);
      expect(point.id).toBeTruthy();
      expect(point.id).toContain('proj_plane');
    });
  });

  describe('renderPlane', () => {
    it.skip('should render P_H plane as SVG rectangle attributes', () => {
      // SKIPPED: Plane rendering boundaries moved to config layer
      // Planes no longer have boundary properties in domain model
      // TODO: Update to test new config-based rendering approach
    });

    it.skip('should render P_V plane with different color', () => {
      // SKIPPED: Plane rendering moved to view layer with config
      // TODO: Update to test new rendering approach
    });

    it.skip('should handle custom plane boundaries', () => {
      // SKIPPED: setBoundaries() no longer exists
      // Boundaries are now configuration in rendering layer, not domain model
    });

    it.skip('should work for any plane without special-case logic', () => {
      // SKIPPED: setBoundaries() no longer exists
      // Planes are now rendered using config/rendering3D.ts constants
    });
  });

  describe('renderLine', () => {
    it('should render line as SVG line attributes', () => {
      const start = { u: 0, v: 0, planeId: 'proj_plane_H' };
      const end = { u: 100, v: 50, planeId: 'proj_plane_H' };
      
      const attrs = renderLine(start, end, 'line_1', undefined, 400, 400);
      
      expect(attrs.x1).toBe(400);  // 400 + 0
      expect(attrs.y1).toBe(400);  // 400 + 0
      expect(attrs.x2).toBe(500);  // 400 + 100
      expect(attrs.y2).toBe(450);  // P_H: y_canvas = 400 + v = 400 + 50 = 450
      expect(attrs.stroke).toBe('#333333');  // Default color
      expect(attrs['stroke-width']).toBe(2);
      expect(attrs['data-element-id']).toBe('line_1');
      expect(attrs['data-element-type']).toBe('line');
    });

    it('should apply custom line styling', () => {
      const start = { u: 0, v: 0, planeId: 'proj_plane_H' };
      const end = { u: 100, v: 100, planeId: 'proj_plane_H' };
      const style = {
        color: '#FF0000',
        width: 3,
        dashArray: '5,5'
      };
      
      const attrs = renderLine(start, end, 'line_2', style);
      
      expect(attrs.stroke).toBe('#FF0000');
      expect(attrs['stroke-width']).toBe(3);
      expect(attrs['stroke-dasharray']).toBe('5,5');
    });

    it('should handle negative coordinates', () => {
      const start = { u: -50, v: -30, planeId: 'proj_plane_H' };
      const end = { u: 50, v: 30, planeId: 'proj_plane_H' };
      
      const attrs = renderLine(start, end, 'line_3', undefined, 400, 400);
      
      expect(attrs.x1).toBe(350);  // 400 - 50
      expect(attrs.y1).toBe(370);  // P_H: y_canvas = 400 + (-30) = 370
      expect(attrs.x2).toBe(450);  // 400 + 50
      expect(attrs.y2).toBe(430);  // P_H: y_canvas = 400 + 30 = 430
    });

    it('should render hinge line with dashed style', () => {
      const start = { u: -300, v: 0, planeId: 'proj_plane_H' };
      const end = { u: 300, v: 0, planeId: 'proj_plane_H' };
      const style = { 
        color: '#666666', 
        width: 2, 
        dashArray: '8,4' 
      };
      
      const attrs = renderLine(start, end, 'HL_HV', style);
      
      // Hinge line rendered using SAME generic algorithm
      expect(attrs['stroke-dasharray']).toBe('8,4');
      expect(attrs['data-element-id']).toBe('HL_HV');
    });

    it('should work for any line without special cases', () => {
      // Test that ANY line can be rendered with the same algorithm
      const start = { u: 123, v: 456, planeId: 'custom_plane' };
      const end = { u: 789, v: 101, planeId: 'custom_plane' };
      
      const attrs = renderLine(start, end, 'arbitrary_line');
      
      // Should work without any special-case checks
      expect(attrs['data-element-id']).toBe('arbitrary_line');
      expect(attrs.x1).toBeTypeOf('number');
      expect(attrs.y1).toBeTypeOf('number');
    });
  });

  describe('applyHoverState', () => {
    it('should apply hover styling to point attributes', () => {
      const point = projPlaneH.addFreePoint2D(new Vector3(0, 0, 1), world);
      const realization = new Point2DRealization2D(new Vector3(0, 0, 1));
      const baseAttrs = renderPoint(point, realization, world);
      
      const hoverAttrs = applyHoverState(baseAttrs);
      
      expect(hoverAttrs.stroke).toBe('#FFD700');  // Gold hover color
      expect(hoverAttrs['stroke-width']).toBe(2.5);  // Original 1.5 + 1
    });

    it('should apply hover styling to plane attributes', () => {
      const plane = new Plane3DFixed(
        'test_plane',
        new Vector4(0, 0, 0, 1),
        new Vector4(0, 0, 1, 0)
      );
      const baseAttrs = renderPlane(plane, 'P_H');  // Use string for test
      
      const hoverAttrs = applyHoverState(baseAttrs);
      
      expect(hoverAttrs.stroke).toBe('#FFD700');
      expect(hoverAttrs['stroke-width']).toBe(2);  // Original 1 + 1
    });

    it('should preserve other attributes', () => {
      const point = projPlaneH.addFreePoint2D(new Vector3(50, 50, 1), world);
      const realization = new Point2DRealization2D(new Vector3(50, 50, 1));
      const baseAttrs = renderPoint(point, realization, world);
      
      const hoverAttrs = applyHoverState(baseAttrs);
      
      expect(hoverAttrs.cx).toBe(baseAttrs.cx);
      expect(hoverAttrs.cy).toBe(baseAttrs.cy);
      expect(hoverAttrs.r).toBe(baseAttrs.r);
      expect(hoverAttrs['data-element-id']).toBe(point.id);  // Phase 63: Use actual hierarchical ID
    });
  });

  describe('applySelectionState', () => {
    it('should apply selection styling to point attributes', () => {
      const point = projPlaneH.addFreePoint2D(new Vector3(0, 0, 1), world);
      const realization = new Point2DRealization2D(new Vector3(0, 0, 1));
      const baseAttrs = renderPoint(point, realization, world);
      
      const selectionAttrs = applySelectionState(baseAttrs);
      
      expect(selectionAttrs.stroke).toBe('#FF6B35');  // Orange selection color
      expect(selectionAttrs['stroke-width']).toBe(3);  // Original 1.5 + 1.5
    });

    it('should apply selection styling to line attributes', () => {
      const start = { u: 0, v: 0 };
      const end = { u: 100, v: 100 };
      const baseAttrs = renderLine(start, end, 'line_1');
      
      const selectionAttrs = applySelectionState(baseAttrs);
      
      expect(selectionAttrs.stroke).toBe('#FF6B35');
      expect(selectionAttrs['stroke-width']).toBe(3.5);  // Original 2 + 1.5
    });

    it('should distinguish from hover state', () => {
      const point = projPlaneH.addFreePoint2D(new Vector3(0, 0, 1), world);
      const realization = new Point2DRealization2D(new Vector3(0, 0, 1));
      const baseAttrs = renderPoint(point, realization, world);
      
      const hoverAttrs = applyHoverState(baseAttrs);
      const selectionAttrs = applySelectionState(baseAttrs);
      
      // Different colors
      expect(hoverAttrs.stroke).not.toBe(selectionAttrs.stroke);
      
      // Different stroke widths
      expect(hoverAttrs['stroke-width']).toBeLessThan(selectionAttrs['stroke-width']);
    });
  });

  describe('Constitution Principle IV compliance', () => {
    it('should render fixed elements using same logic as user elements', () => {
      // Origin point O - should use generic point rendering
      const originPoint = projPlaneH.addFreePoint2D(new Vector3(0, 0, 1), world);
      const realization = new Point2DRealization2D(new Vector3(0, 0, 1));
      originPoint.label = 'Origin';
      
      const originAttrs = renderPoint(originPoint, realization, world);
      
      // Should have same structure as any other point
      expect(originAttrs).toHaveProperty('cx');
      expect(originAttrs).toHaveProperty('cy');
      expect(originAttrs).toHaveProperty('r');
      expect(originAttrs['data-element-type']).toBe('point');
    });

    it.skip('should render P_H using same logic as auxiliary planes', () => {
      // SKIPPED: setBoundaries() no longer exists
      // All planes now rendered uniformly using config-based approach
      // Plane rendering happens in view layer (ThreeView.vue) not domain model
    });

    it('should render hinge line using same logic as user lines', () => {
      const hlStart = { u: -300, v: 0, planeId: 'proj_plane_H' };
      const hlEnd = { u: 300, v: 0, planeId: 'proj_plane_H' };
      const hlStyle = { color: '#666666', width: 2, dashArray: '8,4' };
      
      const userStart = { u: 10, v: 20, planeId: 'proj_plane_H' };
      const userEnd = { u: 50, v: 60, planeId: 'proj_plane_H' };
      const userStyle = { color: '#FF0000', width: 2, dashArray: 'none' };
      
      const hlAttrs = renderLine(hlStart, hlEnd, 'HL_HV', hlStyle);
      const userAttrs = renderLine(userStart, userEnd, 'line_user', userStyle);
      
      // Should have identical structure (only coordinates/styling differ)
      expect(hlAttrs).toHaveProperty('x1');
      expect(hlAttrs).toHaveProperty('y1');
      expect(hlAttrs).toHaveProperty('x2');
      expect(hlAttrs).toHaveProperty('y2');
      
      expect(userAttrs).toHaveProperty('x1');
      expect(userAttrs).toHaveProperty('y1');
      expect(userAttrs).toHaveProperty('x2');
      expect(userAttrs).toHaveProperty('y2');
      
      // Same algorithm used for both
      expect(Object.keys(hlAttrs).sort()).toEqual(Object.keys(userAttrs).sort());
    });
  });
});
