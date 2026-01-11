/**
 * Tests for Element2D base class
 * 
 * Element2D is an abstract base class providing common properties (id, planeId, label, visible)
 * and interface (clone(), realize2D()) for all 2D geometric elements.
 * 
 * Since Element2D is abstract, tests verify the base class functionality through concrete
 * subclasses: FreePoint2D, Line2DByTwoPoints, Circle2DByCenterAndPoint.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Vector3 } from 'three';
import { World } from '@/domain/world/World';
import { Element2D } from '@/domain/world/Element2D';
import { FreePoint2D } from '@/domain/world/Point';
import { Line2DByTwoPoints } from '@/domain/world/Line';
import { Circle2DByCenterAndPoint } from '@/domain/world/Circle';

describe('Element2D base class', () => {
  let world: World;
  let planeId: string;

  beforeEach(() => {
    world = new World();
    planeId = 'proj_plane_H';
  });

  describe('Common properties inherited by all element types', () => {
    it('FreePoint2D has Element2D properties', () => {
      const point = new FreePoint2D('p1', new Vector3(1, 2, 1), planeId, 'Point A');

      // Element2D properties
      expect(point.id).toBe('p1');
      expect(point.planeId).toBe(planeId);
      expect(point.label).toBe('Point A');
      expect(point.visible).toBe(true);
      expect(point.type).toBe('free');
    });

    it('Line2DByTwoPoints has Element2D properties', () => {
      const line = new Line2DByTwoPoints('l1', 'p1', 'p2', planeId, 'Line AB');

      // Element2D properties
      expect(line.id).toBe('l1');
      expect(line.planeId).toBe(planeId);
      expect(line.label).toBe('Line AB');
      expect(line.visible).toBe(true);
      expect(line.type).toBe('by-two-points');
    });

    it('Circle2DByCenterAndPoint has Element2D properties', () => {
      const circle = new Circle2DByCenterAndPoint('c1', 'center', 'edge', planeId, 'Circle C');

      // Element2D properties
      expect(circle.id).toBe('c1');
      expect(circle.planeId).toBe(planeId);
      expect(circle.label).toBe('Circle C');
      expect(circle.visible).toBe(true);
      expect(circle.type).toBe('by-center-and-point');
    });
  });

  describe('instanceof Element2D works for all element types', () => {
    it('FreePoint2D instanceof Element2D', () => {
      const point = new FreePoint2D('p1', new Vector3(1, 2, 1), planeId);
      expect(point).toBeInstanceOf(Element2D);
    });

    it('Line2DByTwoPoints instanceof Element2D', () => {
      const line = new Line2DByTwoPoints('l1', 'p1', 'p2', planeId);
      expect(line).toBeInstanceOf(Element2D);
    });

    it('Circle2DByCenterAndPoint instanceof Element2D', () => {
      const circle = new Circle2DByCenterAndPoint('c1', 'center', 'edge', planeId);
      expect(circle).toBeInstanceOf(Element2D);
    });
  });

  describe('visible property can be modified', () => {
    it('should allow hiding a point', () => {
      const point = new FreePoint2D('p1', new Vector3(1, 2, 1), planeId);
      expect(point.visible).toBe(true);
      
      point.visible = false;
      expect(point.visible).toBe(false);
    });

    it('should allow hiding a line', () => {
      const line = new Line2DByTwoPoints('l1', 'p1', 'p2', planeId);
      expect(line.visible).toBe(true);
      
      line.visible = false;
      expect(line.visible).toBe(false);
    });

    it('should allow hiding a circle', () => {
      const circle = new Circle2DByCenterAndPoint('c1', 'center', 'edge', planeId);
      expect(circle.visible).toBe(true);
      
      circle.visible = false;
      expect(circle.visible).toBe(false);
    });
  });

  describe('clone() preserves Element2D properties', () => {
    it('cloned point has same Element2D properties', () => {
      const original = new FreePoint2D('p1', new Vector3(1, 2, 1), planeId, 'Point A');

      const cloned = original.clone();

      expect(cloned.id).toBe(original.id);
      expect(cloned.planeId).toBe(original.planeId);
      expect(cloned.label).toBe(original.label);
      expect(cloned.visible).toBe(true);  // Note: visible is not copied by clone(), defaults to true
      expect(cloned.type).toBe(original.type);
    });

    it('cloned line has same Element2D properties', () => {
      const original = new Line2DByTwoPoints('l1', 'p1', 'p2', planeId, 'Line AB');

      const cloned = original.clone();

      expect(cloned.id).toBe(original.id);
      expect(cloned.planeId).toBe(original.planeId);
      expect(cloned.label).toBe(original.label);
      expect(cloned.visible).toBe(true);  // Note: visible is not copied by clone(), defaults to true
      expect(cloned.type).toBe(original.type);
    });

    it('cloned circle has same Element2D properties', () => {
      const original = new Circle2DByCenterAndPoint('c1', 'center', 'edge', planeId, 'Circle C');

      const cloned = original.clone();

      expect(cloned.id).toBe(original.id);
      expect(cloned.planeId).toBe(original.planeId);
      expect(cloned.label).toBe(original.label);
      expect(cloned.visible).toBe(true);  // Note: visible is not copied by clone(), defaults to true
      expect(cloned.type).toBe(original.type);
    });
  });

  describe('realize2D() returns correct realization type', () => {
    it('point realize2D() returns Point2DRealization2D', () => {
      const point = new FreePoint2D('p1', new Vector3(1, 2, 1), planeId);
      const realization = point.realize2D(world);
      
      expect(realization).toBeDefined();
      expect(realization.position).toBeDefined();
      expect(realization.position.x).toBe(1);
      expect(realization.position.y).toBe(2);
    });

    it('line realize2D() returns Line2DRealization2D when points exist', () => {
      const plane = world.getProjectionPlaneById(planeId)!;
      const p1 = plane.addFreePoint2D(new Vector3(0, 0, 1), world);
      const p2 = plane.addFreePoint2D(new Vector3(10, 0, 1), world);
      const line = plane.addLine2DBetweenTwoPoints(p1.id, p2.id, world);
      
      const realization = line.realize2D(world);
      
      expect(realization).toBeDefined();
      expect(realization?.point1).toBeDefined();
      expect(realization?.point2).toBeDefined();
    });

    it('circle realize2D() returns Circle2DRealization2D when points exist', () => {
      const plane = world.getProjectionPlaneById(planeId)!;
      const center = plane.addFreePoint2D(new Vector3(5, 5, 1), world);
      const edge = plane.addFreePoint2D(new Vector3(8, 5, 1), world);
      const circle = plane.addCircle2DByCenterAndPoint(center.id, edge.id, world);
      
      const realization = circle.realize2D(world);
      
      expect(realization).toBeDefined();
      expect(realization?.center).toBeDefined();
      expect(realization?.radiusVector).toBeDefined();
    });
  });

  describe('Type narrowing with Element2D', () => {
    it('should allow type-specific operations after narrowing', () => {
      const elements: Element2D[] = [
        new FreePoint2D('p1', new Vector3(1, 2, 1), planeId),
        new Line2DByTwoPoints('l1', 'p1', 'p2', planeId),
        new Circle2DByCenterAndPoint('c1', 'center', 'edge', planeId),
      ];

      // All are Element2D
      elements.forEach(el => {
        expect(el).toBeInstanceOf(Element2D);
        expect(el.id).toBeDefined();
        expect(el.planeId).toBe(planeId);
      });

      // Can narrow to specific types
      const point = elements[0] as FreePoint2D;
      expect(point.position).toBeDefined();

      const line = elements[1] as Line2DByTwoPoints;
      expect(line.point1Id).toBeDefined();
      expect(line.point2Id).toBeDefined();

      const circle = elements[2] as Circle2DByCenterAndPoint;
      expect(circle.centerPointId).toBeDefined();
      expect(circle.circumferencePointId).toBeDefined();
    });
  });

  describe('Generic functions operating on Element2D', () => {
    it('should filter elements by plane', () => {
      const elements: Element2D[] = [
        new FreePoint2D('p1', new Vector3(1, 2, 1), 'proj_plane_H'),
        new FreePoint2D('p2', new Vector3(3, 4, 1), 'proj_plane_V'),
        new Line2DByTwoPoints('l1', 'p1', 'p2', 'proj_plane_H'),
        new Circle2DByCenterAndPoint('c1', 'p1', 'p2', 'proj_plane_V'),
      ];

      const planeH = elements.filter(el => el.planeId === 'proj_plane_H');
      const planeV = elements.filter(el => el.planeId === 'proj_plane_V');

      expect(planeH).toHaveLength(2);
      expect(planeV).toHaveLength(2);
    });

    it('should hide all elements generically', () => {
      const elements: Element2D[] = [
        new FreePoint2D('p1', new Vector3(1, 2, 1), planeId),
        new Line2DByTwoPoints('l1', 'p1', 'p2', planeId),
        new Circle2DByCenterAndPoint('c1', 'center', 'edge', planeId),
      ];

      // All visible initially
      elements.forEach(el => expect(el.visible).toBe(true));

      // Hide all
      elements.forEach(el => el.visible = false);

      // All hidden now
      elements.forEach(el => expect(el.visible).toBe(false));
    });

    it('should filter visible elements', () => {
      const elements: Element2D[] = [
        new FreePoint2D('p1', new Vector3(1, 2, 1), planeId),
        new Line2DByTwoPoints('l1', 'p1', 'p2', planeId),
        new Circle2DByCenterAndPoint('c1', 'center', 'edge', planeId),
      ];

      elements[1].visible = false;  // Hide the line

      const visible = elements.filter(el => el.visible);
      expect(visible).toHaveLength(2);
      expect(visible[0].type).toBe('free');
      expect(visible[1].type).toBe('by-center-and-point');
    });
  });
});
