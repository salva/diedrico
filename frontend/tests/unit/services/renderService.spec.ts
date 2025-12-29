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

import { describe, it, expect } from 'vitest';
import { 
  renderPoint, 
  renderPlane, 
  renderLine,
  applyHoverState,
  applySelectionState
} from '@/services/RenderService';
import { Point } from '@/domain/world/Point';
import { Plane } from '@/domain/world/Plane';

describe('RenderService', () => {
  describe('renderPoint', () => {
    it('should render free point as SVG circle attributes', () => {
      const point = new Point([100, 50, 1], 'free');
      point.id = 'point_1';
      point.planeId = 'plane_H';
      
      const attrs = renderPoint(point, 400, 400);
      
      expect(attrs.cx).toBe(500);  // 400 + 100
      expect(attrs.cy).toBe(450);  // 400 + 50
      expect(attrs.r).toBe(5);
      expect(attrs.fill).toBe('#4A90E2');  // Free point color
      expect(attrs['data-element-id']).toBe('point_1');
      expect(attrs['data-element-type']).toBe('point');
    });

    it('should render derived point with different styling', () => {
      const point = new Point([100, 50, 1], 'intersection');
      point.id = 'point_2';
      
      const attrs = renderPoint(point);
      
      expect(attrs.r).toBe(4);  // Smaller radius
      expect(attrs.fill).toBe('#E94E77');  // Derived point color
    });

    it('should handle negative coordinates', () => {
      const point = new Point([-50, -30, 1], 'free');
      point.planeId = 'plane_H';
      
      const attrs = renderPoint(point, 400, 400);
      
      expect(attrs.cx).toBe(350);  // 400 - 50
      expect(attrs.cy).toBe(370);  // 400 - 30
    });

    it('should handle custom canvas origin', () => {
      const point = new Point([10, 20, 1], 'free');
      
      const attrs = renderPoint(point, 200, 300);
      
      expect(attrs.cx).toBe(210);
      expect(attrs.cy).toBe(320);
    });

    it('should handle point without ID', () => {
      const point = new Point([0, 0, 1], 'free');
      
      const attrs = renderPoint(point);
      
      expect(attrs['data-element-id']).toBe('unknown');
    });
  });

  describe('renderPlane', () => {
    it('should render P_H plane as SVG rectangle attributes', () => {
      const planeH = Plane.createPH();
      planeH.id = 'plane_H';
      
      const attrs = renderPlane(planeH, 400, 400);
      
      // Boundaries: -400 to 400 → Canvas: 0 to 800
      expect(attrs.x).toBe(0);
      expect(attrs.y).toBe(0);
      expect(attrs.width).toBe(800);
      expect(attrs.height).toBe(800);
      expect(attrs.fill).toBe('#F0F4F8');  // P_H color
      expect(attrs.opacity).toBe(0.3);
      expect(attrs['data-element-id']).toBe('plane_H');
      expect(attrs['data-element-type']).toBe('plane');
    });

    it('should render P_V plane with different color', () => {
      const planeV = Plane.createPV();
      planeV.id = 'plane_V';
      
      const attrs = renderPlane(planeV, 400, 400);
      
      expect(attrs.fill).toBe('#FFF8E1');  // P_V color (different from P_H)
    });

    it('should handle custom plane boundaries', () => {
      const plane = Plane.createPH();
      plane.setBoundaries(-100, 200, -150, 250);
      
      const attrs = renderPlane(plane, 400, 400);
      
      // For P_H: u → x, v → y (no flip)
      // minU=-100 → x=300, maxU=200 → x=600, width=300
      // minV=-150 → y=250, maxV=250 → y=650, height=400
      expect(attrs.x).toBe(300);
      expect(attrs.y).toBe(250);
      expect(attrs.width).toBe(300);
      expect(attrs.height).toBe(400);
    });

    it('should work for any plane without special-case logic', () => {
      // Test with arbitrary auxiliary plane
      const plane = new Plane(
        [0, 0, 5, 1],
        [0, 0, 1, 1],
        'auxiliary'
      );
      plane.id = 'custom_plane';
      plane.setBoundaries(-50, 50, -50, 50);
      
      const attrs = renderPlane(plane, 400, 400);
      
      // Should render successfully (no special-case checks)
      expect(attrs['data-element-id']).toBe('custom_plane');
      expect(attrs.width).toBe(100);
      expect(attrs.height).toBe(100);
    });
  });

  describe('renderLine', () => {
    it('should render line as SVG line attributes', () => {
      const start = { u: 0, v: 0, planeId: 'plane_H' };
      const end = { u: 100, v: 50, planeId: 'plane_H' };
      
      const attrs = renderLine(start, end, 'line_1', undefined, 400, 400);
      
      expect(attrs.x1).toBe(400);  // 400 + 0
      expect(attrs.y1).toBe(400);  // 400 + 0
      expect(attrs.x2).toBe(500);  // 400 + 100
      expect(attrs.y2).toBe(450);  // 400 + 50
      expect(attrs.stroke).toBe('#333333');  // Default color
      expect(attrs['stroke-width']).toBe(2);
      expect(attrs['data-element-id']).toBe('line_1');
      expect(attrs['data-element-type']).toBe('line');
    });

    it('should apply custom line styling', () => {
      const start = { u: 0, v: 0, planeId: 'plane_H' };
      const end = { u: 100, v: 100, planeId: 'plane_H' };
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
      const start = { u: -50, v: -30, planeId: 'plane_H' };
      const end = { u: 50, v: 30, planeId: 'plane_H' };
      
      const attrs = renderLine(start, end, 'line_3', undefined, 400, 400);
      
      expect(attrs.x1).toBe(350);  // 400 - 50
      expect(attrs.y1).toBe(370);  // 400 - 30
      expect(attrs.x2).toBe(450);  // 400 + 50
      expect(attrs.y2).toBe(430);  // 400 + 30
    });

    it('should render hinge line with dashed style', () => {
      const start = { u: -300, v: 0, planeId: 'plane_H' };
      const end = { u: 300, v: 0, planeId: 'plane_H' };
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
      const point = new Point([0, 0, 1], 'free');
      point.id = 'point_1';
      const baseAttrs = renderPoint(point);
      
      const hoverAttrs = applyHoverState(baseAttrs);
      
      expect(hoverAttrs.stroke).toBe('#FFD700');  // Gold hover color
      expect(hoverAttrs['stroke-width']).toBe(2.5);  // Original 1.5 + 1
    });

    it('should apply hover styling to plane attributes', () => {
      const plane = Plane.createPH();
      const baseAttrs = renderPlane(plane);
      
      const hoverAttrs = applyHoverState(baseAttrs);
      
      expect(hoverAttrs.stroke).toBe('#FFD700');
      expect(hoverAttrs['stroke-width']).toBe(2);  // Original 1 + 1
    });

    it('should preserve other attributes', () => {
      const point = new Point([50, 50, 1], 'free');
      point.id = 'point_1';
      const baseAttrs = renderPoint(point);
      
      const hoverAttrs = applyHoverState(baseAttrs);
      
      expect(hoverAttrs.cx).toBe(baseAttrs.cx);
      expect(hoverAttrs.cy).toBe(baseAttrs.cy);
      expect(hoverAttrs.r).toBe(baseAttrs.r);
      expect(hoverAttrs['data-element-id']).toBe('point_1');
    });
  });

  describe('applySelectionState', () => {
    it('should apply selection styling to point attributes', () => {
      const point = new Point([0, 0, 1], 'free');
      point.id = 'point_1';
      const baseAttrs = renderPoint(point);
      
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
      const point = new Point([0, 0, 1], 'free');
      const baseAttrs = renderPoint(point);
      
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
      const originPoint = new Point([0, 0, 1], 'free');
      originPoint.id = 'O';
      originPoint.label = 'Origin';
      
      const originAttrs = renderPoint(originPoint);
      
      // Should have same structure as any other point
      expect(originAttrs).toHaveProperty('cx');
      expect(originAttrs).toHaveProperty('cy');
      expect(originAttrs).toHaveProperty('r');
      expect(originAttrs['data-element-type']).toBe('point');
    });

    it('should render P_H using same logic as auxiliary planes', () => {
      const planeH = Plane.createPH();
      const auxiliaryPlane = new Plane(
        [0, 0, 10, 1],
        [0, 0, 1, 1]
      );
      auxiliaryPlane.setBoundaries(-400, 400, -400, 400);
      
      const phAttrs = renderPlane(planeH);
      const auxAttrs = renderPlane(auxiliaryPlane);
      
      // Should have identical structure (only styling differs)
      expect(phAttrs).toHaveProperty('x');
      expect(phAttrs).toHaveProperty('y');
      expect(phAttrs).toHaveProperty('width');
      expect(phAttrs).toHaveProperty('height');
      
      expect(auxAttrs).toHaveProperty('x');
      expect(auxAttrs).toHaveProperty('y');
      expect(auxAttrs).toHaveProperty('width');
      expect(auxAttrs).toHaveProperty('height');
      
      // Same properties, confirming no special-case rendering
      expect(Object.keys(phAttrs).sort()).toEqual(Object.keys(auxAttrs).sort());
    });

    it('should render hinge line using same logic as user lines', () => {
      const hlStart = { u: -300, v: 0, planeId: 'plane_H' };
      const hlEnd = { u: 300, v: 0, planeId: 'plane_H' };
      const hlStyle = { color: '#666666', width: 2, dashArray: '8,4' };
      
      const userStart = { u: 10, v: 20, planeId: 'plane_H' };
      const userEnd = { u: 50, v: 60, planeId: 'plane_H' };
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
