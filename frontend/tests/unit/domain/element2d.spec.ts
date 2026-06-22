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
import type { World } from '@/domain/world/World';
import { createTestWorld, getHorizontalPlane, getVerticalPlane } from '../../helpers/worldHelpers';
import { Element2D } from '@/domain/world/Element2D';
import { FreePoint2D } from '@/domain/world/Point';
import { Line2DByTwoPoints } from '@/domain/world/Line';
import { Circle2DByCenterAndPoint } from '@/domain/world/Circle';
import { getHorizontalPlane, getHorizontalPlaneId } from '../../helpers/worldHelpers';

describe('Element2D base class', () => {
  let world: World;
  let operationContext;
  let planeId: string;

  beforeEach(() => {
    const { world: w, operationContext: oc } = createTestWorld();
    world = w;
    operationContext = oc;
    planeId = getHorizontalPlaneId(world);
  });

  describe('Common properties inherited by all element types', () => {
    it('FreePoint2D has Element2D properties', () => {
      const plane = getHorizontalPlane(world);
      const pointId = operationContext.projectionConstruction.generatePoint2DId(plane);
      const point = new FreePoint2D(pointId, new Vector3(1, 2, 1), planeId, 'Point A');

      // Element2D properties
      expect(point.id).toBe(pointId);
      expect(point.planeId).toBe(planeId);
      expect(point.label).toBe('Point A');
      expect(point).toBeInstanceOf(FreePoint2D);
    });

    it('Line2DByTwoPoints has Element2D properties', () => {
      const plane = getHorizontalPlane(world);
      const p1Id = operationContext.projectionConstruction.generatePoint2DId(plane);
      const p2Id = operationContext.projectionConstruction.generatePoint2DId(plane);
      const lineId = operationContext.projectionConstruction.generateLine2DId(plane);
      const line = new Line2DByTwoPoints(lineId, p1Id, p2Id, planeId, 'Line AB');

      // Element2D properties
      expect(line.id).toBe(lineId);
      expect(line.planeId).toBe(planeId);
      expect(line.label).toBe('Line AB');
      expect(line).toBeInstanceOf(Line2DByTwoPoints);
    });

    it('Circle2DByCenterAndPoint has Element2D properties', () => {
      const plane = getHorizontalPlane(world);
      const centerId = operationContext.projectionConstruction.generatePoint2DId(plane);
      const edgeId = operationContext.projectionConstruction.generatePoint2DId(plane);
      const circleId = operationContext.projectionConstruction.generateCircle2DId(plane);
      const circle = new Circle2DByCenterAndPoint(circleId, centerId, edgeId, planeId, 'Circle C');

      // Element2D properties
      expect(circle.id).toBe(circleId);
      expect(circle.planeId).toBe(planeId);
      expect(circle.label).toBe('Circle C');
      expect(circle).toBeInstanceOf(Circle2DByCenterAndPoint);
    });
  });

  describe('instanceof Element2D works for all element types', () => {
    it('FreePoint2D instanceof Element2D', () => {
      const plane = getHorizontalPlane(world);
      const pointId = operationContext.projectionConstruction.generatePoint2DId(plane);
      const point = new FreePoint2D(pointId, new Vector3(1, 2, 1), planeId);
      expect(point).toBeInstanceOf(Element2D);
    });

    it('Line2DByTwoPoints instanceof Element2D', () => {
      const plane = getHorizontalPlane(world);
      const p1Id = operationContext.projectionConstruction.generatePoint2DId(plane);
      const p2Id = operationContext.projectionConstruction.generatePoint2DId(plane);
      const lineId = operationContext.projectionConstruction.generateLine2DId(plane);
      const line = new Line2DByTwoPoints(lineId, p1Id, p2Id, planeId);
      expect(line).toBeInstanceOf(Element2D);
    });

    it('Circle2DByCenterAndPoint instanceof Element2D', () => {
      const plane = getHorizontalPlane(world);
      const centerId = operationContext.projectionConstruction.generatePoint2DId(plane);
      const edgeId = operationContext.projectionConstruction.generatePoint2DId(plane);
      const circleId = operationContext.projectionConstruction.generateCircle2DId(plane);
      const circle = new Circle2DByCenterAndPoint(circleId, centerId, edgeId, planeId);
      expect(circle).toBeInstanceOf(Element2D);
    });
  });

  describe('visible property can be modified', () => {
    it('should allow hiding a point', () => {
      const plane = getHorizontalPlane(world);
      const pointId = operationContext.projectionConstruction.generatePoint2DId(plane);
      const point = new FreePoint2D(pointId, new Vector3(1, 2, 1), planeId);
      expect(point.visualStyle?.visible !== false).toBe(true);
      
      point.visualStyle = { ...point.visualStyle, visible: false } as any;
      expect(point.visualStyle?.visible).toBe(false);
    });

    it('should allow hiding a line', () => {
      const plane = getHorizontalPlane(world);
      const p1Id = operationContext.projectionConstruction.generatePoint2DId(plane);
      const p2Id = operationContext.projectionConstruction.generatePoint2DId(plane);
      const lineId = operationContext.projectionConstruction.generateLine2DId(plane);
      const line = new Line2DByTwoPoints(lineId, p1Id, p2Id, planeId);
      expect(line.visualStyle?.visible !== false).toBe(true);
      
      line.visualStyle = { ...line.visualStyle, visible: false } as any;
      expect(line.visualStyle?.visible).toBe(false);
    });

    it('should allow hiding a circle', () => {
      const plane = getHorizontalPlane(world);
      const centerId = operationContext.projectionConstruction.generatePoint2DId(plane);
      const edgeId = operationContext.projectionConstruction.generatePoint2DId(plane);
      const circleId = operationContext.projectionConstruction.generateCircle2DId(plane);
      const circle = new Circle2DByCenterAndPoint(circleId, centerId, edgeId, planeId);
      expect(circle.visualStyle?.visible !== false).toBe(true);
      
      circle.visualStyle = { ...circle.visualStyle, visible: false } as any;
      expect(circle.visualStyle?.visible).toBe(false);
    });
  });

  describe('clone() preserves Element2D properties', () => {
    it('cloned point has same Element2D properties', () => {
      const plane = getHorizontalPlane(world);
      const pointId = operationContext.projectionConstruction.generatePoint2DId(plane);
      const original = new FreePoint2D(pointId, new Vector3(1, 2, 1), planeId, 'Point A');

      const cloned = original.clone();

      expect(cloned.id).toBe(original.id);
      expect(cloned.planeId).toBe(original.planeId);
      expect(cloned.label).toBe(original.label);
      expect(cloned).toBeInstanceOf(FreePoint2D);
    });

    it('cloned line has same Element2D properties', () => {
      const plane = getHorizontalPlane(world);
      const p1Id = operationContext.projectionConstruction.generatePoint2DId(plane);
      const p2Id = operationContext.projectionConstruction.generatePoint2DId(plane);
      const lineId = operationContext.projectionConstruction.generateLine2DId(plane);
      const original = new Line2DByTwoPoints(lineId, p1Id, p2Id, planeId, 'Line AB');

      const cloned = original.clone();

      expect(cloned.id).toBe(original.id);
      expect(cloned.planeId).toBe(original.planeId);
      expect(cloned.label).toBe(original.label);
      expect(cloned).toBeInstanceOf(Line2DByTwoPoints);
    });

    it('cloned circle has same Element2D properties', () => {
      const plane = getHorizontalPlane(world);
      const centerId = operationContext.projectionConstruction.generatePoint2DId(plane);
      const edgeId = operationContext.projectionConstruction.generatePoint2DId(plane);
      const circleId = operationContext.projectionConstruction.generateCircle2DId(plane);
      const original = new Circle2DByCenterAndPoint(circleId, centerId, edgeId, planeId, 'Circle C');

      const cloned = original.clone();

      expect(cloned.id).toBe(original.id);
      expect(cloned.planeId).toBe(original.planeId);
      expect(cloned.label).toBe(original.label);
      expect(cloned).toBeInstanceOf(Circle2DByCenterAndPoint);
    });
  });

  describe('realize2D() returns correct realization type', () => {
    it('point realize2D() returns Point2DRealization2D', () => {
      const plane = getHorizontalPlane(world);
      const pointId = operationContext.projectionConstruction.generatePoint2DId(plane);
      const point = new FreePoint2D(pointId, new Vector3(1, 2, 1), planeId);
      const realization = point.realize2D(operationContext.realizationContext);
      
      expect(realization).toBeDefined();
      expect(realization.position).toBeDefined();
      expect(realization.position.x).toBe(1);
      expect(realization.position.y).toBe(2);
    });

    it('line realize2D() returns Line2DRealization2D when points exist', () => {
      const plane = getHorizontalPlane(world);
      const p1 = operationContext.projectionConstruction.addFreePoint2D(plane, new Vector3(0, 0, 1));
      const p2 = operationContext.projectionConstruction.addFreePoint2D(plane, new Vector3(10, 0, 1));
      const line = operationContext.projectionConstruction.addLine2DBetweenTwoPoints(plane, p1.id, p2.id);
      
      const realization = line.realize2D(operationContext.realizationContext);
      
      expect(realization).toBeDefined();
      expect(realization?.point1).toBeDefined();
      expect(realization?.point2).toBeDefined();
    });

    it('circle realize2D() returns Circle2DRealization2D when points exist', () => {
      const plane = getHorizontalPlane(world);
      const center = operationContext.projectionConstruction.addFreePoint2D(plane, new Vector3(5, 5, 1));
      const edge = operationContext.projectionConstruction.addFreePoint2D(plane, new Vector3(8, 5, 1));
      const circle = operationContext.projectionConstruction.addCircle2DByCenterAndPoint(plane, center.id, edge.id);
      
      const realization = circle.realize2D(operationContext.realizationContext);
      
      expect(realization).toBeDefined();
      expect(realization?.center).toBeDefined();
      expect(realization?.radiusVector).toBeDefined();
    });
  });

  describe('Type narrowing with Element2D', () => {
    it('should allow type-specific operations after narrowing', () => {
      const plane = getHorizontalPlane(world);
      const pointId = operationContext.projectionConstruction.generatePoint2DId(plane);
      const p1Id = operationContext.projectionConstruction.generatePoint2DId(plane);
      const p2Id = operationContext.projectionConstruction.generatePoint2DId(plane);
      const lineId = operationContext.projectionConstruction.generateLine2DId(plane);
      const centerId = operationContext.projectionConstruction.generatePoint2DId(plane);
      const edgeId = operationContext.projectionConstruction.generatePoint2DId(plane);
      const circleId = operationContext.projectionConstruction.generateCircle2DId(plane);
      
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
      const planeV = getVerticalPlane(world);
      const planeVId = planeV.id!;
      
      const p1Id = operationContext.projectionConstruction.generatePoint2DId(planeH);
      const p2Id = operationContext.projectionConstruction.generatePoint2DId(planeV);
      const p3Id = operationContext.projectionConstruction.generatePoint2DId(planeH);
      const p4Id = operationContext.projectionConstruction.generatePoint2DId(planeH);
      const p5Id = operationContext.projectionConstruction.generatePoint2DId(planeV);
      const p6Id = operationContext.projectionConstruction.generatePoint2DId(planeV);
      const l1Id = operationContext.projectionConstruction.generateLine2DId(planeH);
      const c1Id = operationContext.projectionConstruction.generateCircle2DId(planeV);
      
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
      const p1Id = operationContext.projectionConstruction.generatePoint2DId(plane);
      const p2Id = operationContext.projectionConstruction.generatePoint2DId(plane);
      const p3Id = operationContext.projectionConstruction.generatePoint2DId(plane);
      const lineId = operationContext.projectionConstruction.generateLine2DId(plane);
      const centerId = operationContext.projectionConstruction.generatePoint2DId(plane);
      const edgeId = operationContext.projectionConstruction.generatePoint2DId(plane);
      const circleId = operationContext.projectionConstruction.generateCircle2DId(plane);
      
      const elements: Element2D[] = [
        new FreePoint2D(p1Id, new Vector3(1, 2, 1), planeId),
        new Line2DByTwoPoints(lineId, p2Id, p3Id, planeId),
        new Circle2DByCenterAndPoint(circleId, centerId, edgeId, planeId),
      ];

      // All visible initially
      elements.forEach(el => expect(el.visualStyle?.visible !== false).toBe(true));

      // Hide all
      elements.forEach(el => el.visualStyle = { ...el.visualStyle, visible: false } as any);

      // All hidden now
      elements.forEach(el => expect(el.visualStyle?.visible).toBe(false));
    });

    it('should filter visible elements', () => {
      const plane = getHorizontalPlane(world);
      const p1Id = operationContext.projectionConstruction.generatePoint2DId(plane);
      const p2Id = operationContext.projectionConstruction.generatePoint2DId(plane);
      const p3Id = operationContext.projectionConstruction.generatePoint2DId(plane);
      const lineId = operationContext.projectionConstruction.generateLine2DId(plane);
      const centerId = operationContext.projectionConstruction.generatePoint2DId(plane);
      const edgeId = operationContext.projectionConstruction.generatePoint2DId(plane);
      const circleId = operationContext.projectionConstruction.generateCircle2DId(plane);
      
      const elements: Element2D[] = [
        new FreePoint2D(p1Id, new Vector3(1, 2, 1), planeId),
        new Line2DByTwoPoints(lineId, p2Id, p3Id, planeId),
        new Circle2DByCenterAndPoint(circleId, centerId, edgeId, planeId),
      ];

      elements[1].visualStyle = { ...elements[1].visualStyle, visible: false } as any;  // Hide the line

      const visible = elements.filter(el => el.visualStyle?.visible !== false);
      expect(visible).toHaveLength(2);
      expect(visible[0]).toBeInstanceOf(FreePoint2D);
      expect(visible[1]).toBeInstanceOf(Circle2DByCenterAndPoint);
    });
  });
});
