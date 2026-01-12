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
import { getHorizontalPlane, getHorizontalPlaneId } from '../../helpers/worldHelpers';

describe('Element2D base class', () => {
  let world: World;
  let planeId: string;

  beforeEach(() => {
    world = new World();
    planeId = getHorizontalPlaneId(world);
  });

  describe('Common properties inherited by all element types', () => {
    it('FreePoint2D has Element2D properties', () => {
      const plane = getHorizontalPlane(world);
      const pointId = plane.generatePoint2DId(world);
      const point = new FreePoint2D(pointId, new Vector3(1, 2, 1), planeId, 'Point A');

      // Element2D properties
      expect(point.id).toBe(pointId);
      expect(point.planeId).toBe(planeId);
      expect(point.label).toBe('Point A');
      expect(point.visible).toBe(true);
      expect(point.type).toBe('free');
    });

    it('Line2DByTwoPoints has Element2D properties', () => {
      const plane = getHorizontalPlane(world);
      const p1Id = plane.generatePoint2DId(world);
      const p2Id = plane.generatePoint2DId(world);
      const lineId = plane.generateLine2DId(world);
      const line = new Line2DByTwoPoints(lineId, p1Id, p2Id, planeId, 'Line AB');

      // Element2D properties
      expect(line.id).toBe(lineId);
      expect(line.planeId).toBe(planeId);
      expect(line.label).toBe('Line AB');
      expect(line.visible).toBe(true);
      expect(line.type).toBe('by-two-points');
    });

    it('Circle2DByCenterAndPoint has Element2D properties', () => {
      const plane = getHorizontalPlane(world);
      const centerId = plane.generatePoint2DId(world);
      const edgeId = plane.generatePoint2DId(world);
      const circleId = plane.generateCircle2DId(world);
      const circle = new Circle2DByCenterAndPoint(circleId, centerId, edgeId, planeId, 'Circle C');

      // Element2D properties
      expect(circle.id).toBe(circleId);
      expect(circle.planeId).toBe(planeId);
      expect(circle.label).toBe('Circle C');
      expect(circle.visible).toBe(true);
      expect(circle.type).toBe('by-center-and-point');
    });
  });

  describe('instanceof Element2D works for all element types', () => {
    it('FreePoint2D instanceof Element2D', () => {
      const plane = getHorizontalPlane(world);
      const pointId = plane.generatePoint2DId(world);
      const point = new FreePoint2D(pointId, new Vector3(1, 2, 1), planeId);
      expect(point).toBeInstanceOf(Element2D);
    });

    it('Line2DByTwoPoints instanceof Element2D', () => {
      const plane = getHorizontalPlane(world);
      const p1Id = plane.generatePoint2DId(world);
      const p2Id = plane.generatePoint2DId(world);
      const lineId = plane.generateLine2DId(world);
      const line = new Line2DByTwoPoints(lineId, p1Id, p2Id, planeId);
      expect(line).toBeInstanceOf(Element2D);
    });

    it('Circle2DByCenterAndPoint instanceof Element2D', () => {
      const plane = getHorizontalPlane(world);
      const centerId = plane.generatePoint2DId(world);
      const edgeId = plane.generatePoint2DId(world);
      const circleId = plane.generateCircle2DId(world);
      const circle = new Circle2DByCenterAndPoint(circleId, centerId, edgeId, planeId);
      expect(circle).toBeInstanceOf(Element2D);
    });
  });

  describe('visible property can be modified', () => {
    it('should allow hiding a point', () => {
      const plane = getHorizontalPlane(world);
      const pointId = plane.generatePoint2DId(world);
      const point = new FreePoint2D(pointId, new Vector3(1, 2, 1), planeId);
      expect(point.visible).toBe(true);
      
      point.visible = false;
      expect(point.visible).toBe(false);
    });

    it('should allow hiding a line', () => {
      const plane = getHorizontalPlane(world);
      const p1Id = plane.generatePoint2DId(world);
      const p2Id = plane.generatePoint2DId(world);
      const lineId = plane.generateLine2DId(world);
      const line = new Line2DByTwoPoints(lineId, p1Id, p2Id, planeId);
      expect(line.visible).toBe(true);
      
      line.visible = false;
      expect(line.visible).toBe(false);
    });

    it('should allow hiding a circle', () => {
      const plane = getHorizontalPlane(world);
      const centerId = plane.generatePoint2DId(world);
      const edgeId = plane.generatePoint2DId(world);
      const circleId = plane.generateCircle2DId(world);
      const circle = new Circle2DByCenterAndPoint(circleId, centerId, edgeId, planeId);
      expect(circle.visible).toBe(true);
      
      circle.visible = false;
      expect(circle.visible).toBe(false);
    });
  });

  describe('clone() preserves Element2D properties', () => {
    it('cloned point has same Element2D properties', () => {
      const plane = getHorizontalPlane(world);
      const pointId = plane.generatePoint2DId(world);
      const original = new FreePoint2D(pointId, new Vector3(1, 2, 1), planeId, 'Point A');

      const cloned = original.clone();

      expect(cloned.id).toBe(original.id);
      expect(cloned.planeId).toBe(original.planeId);
      expect(cloned.label).toBe(original.label);
      expect(cloned.visible).toBe(true);  // Note: visible is not copied by clone(), defaults to true
      expect(cloned.type).toBe(original.type);
    });

    it('cloned line has same Element2D properties', () => {
      const plane = getHorizontalPlane(world);
      const p1Id = plane.generatePoint2DId(world);
      const p2Id = plane.generatePoint2DId(world);
      const lineId = plane.generateLine2DId(world);
      const original = new Line2DByTwoPoints(lineId, p1Id, p2Id, planeId, 'Line AB');

      const cloned = original.clone();

      expect(cloned.id).toBe(original.id);
      expect(cloned.planeId).toBe(original.planeId);
      expect(cloned.label).toBe(original.label);
      expect(cloned.visible).toBe(true);  // Note: visible is not copied by clone(), defaults to true
      expect(cloned.type).toBe(original.type);
    });

    it('cloned circle has same Element2D properties', () => {
      const plane = getHorizontalPlane(world);
      const centerId = plane.generatePoint2DId(world);
      const edgeId = plane.generatePoint2DId(world);
      const circleId = plane.generateCircle2DId(world);
      const original = new Circle2DByCenterAndPoint(circleId, centerId, edgeId, planeId, 'Circle C');

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
      const plane = getHorizontalPlane(world);
      const pointId = plane.generatePoint2DId(world);
      const point = new FreePoint2D(pointId, new Vector3(1, 2, 1), planeId);
      const realization = point.realize2D(world);
      
      expect(realization).toBeDefined();
      expect(realization.position).toBeDefined();
      expect(realization.position.x).toBe(1);
      expect(realization.position.y).toBe(2);
    });

    it('line realize2D() returns Line2DRealization2D when points exist', () => {
      const plane = getHorizontalPlane(world);
      const p1 = plane.addFreePoint2D(new Vector3(0, 0, 1), world);
      const p2 = plane.addFreePoint2D(new Vector3(10, 0, 1), world);
      const line = plane.addLine2DBetweenTwoPoints(p1.id, p2.id, world);
      
      const realization = line.realize2D(world);
      
      expect(realization).toBeDefined();
      expect(realization?.point1).toBeDefined();
      expect(realization?.point2).toBeDefined();
    });

    it('circle realize2D() returns Circle2DRealization2D when points exist', () => {
      const plane = getHorizontalPlane(world);
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
      const plane = getHorizontalPlane(world);
      const pointId = plane.generatePoint2DId(world);
      const p1Id = plane.generatePoint2DId(world);
      const p2Id = plane.generatePoint2DId(world);
      const lineId = plane.generateLine2DId(world);
      const centerId = plane.generatePoint2DId(world);
      const edgeId = plane.generatePoint2DId(world);
      const circleId = plane.generateCircle2DId(world);
      
      const elements: Element2D[] = [
        new FreePoint2D(pointId, new Vector3(1, 2, 1), planeId),
        new Line2DByTwoPoints(lineId, p1Id, p2Id, planeId),
        new Circle2DByCenterAndPoint(circleId, centerId, edgeId, planeId),
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
      const planeH = getHorizontalPlane(world);
      const planeHId = getHorizontalPlaneId(world);
      const planeV = world.getVerticalPlane();
      const planeVId = planeV.id!;
      
      const p1Id = planeH.generatePoint2DId(world);
      const p2Id = planeV.generatePoint2DId(world);
      const p3Id = planeH.generatePoint2DId(world);
      const p4Id = planeH.generatePoint2DId(world);
      const p5Id = planeV.generatePoint2DId(world);
      const p6Id = planeV.generatePoint2DId(world);
      const l1Id = planeH.generateLine2DId(world);
      const c1Id = planeV.generateCircle2DId(world);
      
      const elements: Element2D[] = [
        new FreePoint2D(p1Id, new Vector3(1, 2, 1), planeHId),
        new FreePoint2D(p2Id, new Vector3(3, 4, 1), planeVId),
        new Line2DByTwoPoints(l1Id, p3Id, p4Id, planeHId),
        new Circle2DByCenterAndPoint(c1Id, p5Id, p6Id, planeVId),
      ];

      const elementsOnPlaneH = elements.filter(el => el.planeId === planeHId);
      const elementsOnPlaneV = elements.filter(el => el.planeId === planeVId);

      expect(elementsOnPlaneH).toHaveLength(2);
      expect(elementsOnPlaneV).toHaveLength(2);
    });

    it('should hide all elements generically', () => {
      const plane = getHorizontalPlane(world);
      const p1Id = plane.generatePoint2DId(world);
      const p2Id = plane.generatePoint2DId(world);
      const p3Id = plane.generatePoint2DId(world);
      const lineId = plane.generateLine2DId(world);
      const centerId = plane.generatePoint2DId(world);
      const edgeId = plane.generatePoint2DId(world);
      const circleId = plane.generateCircle2DId(world);
      
      const elements: Element2D[] = [
        new FreePoint2D(p1Id, new Vector3(1, 2, 1), planeId),
        new Line2DByTwoPoints(lineId, p2Id, p3Id, planeId),
        new Circle2DByCenterAndPoint(circleId, centerId, edgeId, planeId),
      ];

      // All visible initially
      elements.forEach(el => expect(el.visible).toBe(true));

      // Hide all
      elements.forEach(el => el.visible = false);

      // All hidden now
      elements.forEach(el => expect(el.visible).toBe(false));
    });

    it('should filter visible elements', () => {
      const plane = getHorizontalPlane(world);
      const p1Id = plane.generatePoint2DId(world);
      const p2Id = plane.generatePoint2DId(world);
      const p3Id = plane.generatePoint2DId(world);
      const lineId = plane.generateLine2DId(world);
      const centerId = plane.generatePoint2DId(world);
      const edgeId = plane.generatePoint2DId(world);
      const circleId = plane.generateCircle2DId(world);
      
      const elements: Element2D[] = [
        new FreePoint2D(p1Id, new Vector3(1, 2, 1), planeId),
        new Line2DByTwoPoints(lineId, p2Id, p3Id, planeId),
        new Circle2DByCenterAndPoint(circleId, centerId, edgeId, planeId),
      ];

      elements[1].visible = false;  // Hide the line

      const visible = elements.filter(el => el.visible);
      expect(visible).toHaveLength(2);
      expect(visible[0].type).toBe('free');
      expect(visible[1].type).toBe('by-center-and-point');
    });
  });
});
