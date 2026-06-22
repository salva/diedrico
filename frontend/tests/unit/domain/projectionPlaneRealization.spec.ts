/**
 * Tests for centralized realization computation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Vector3 } from 'three';
import type { World } from '../../../src/domain/world/World';
import type { OperationContext } from '../../../src/commands/operations/OperationContext';
import { Segment2D } from '../../../src/domain/world/Segment';
import { Line2DByTwoPoints } from '../../../src/domain/world/Line';
import { Circle2DByCenterAndPoint } from '../../../src/domain/world/Circle';
import { createTestWorld, getHorizontalPlane, getVerticalPlane } from '../../helpers/worldHelpers';
import type { CachedProjectionElementRealizationContext } from '@/domain/world/projectionPlane/ProjectionPlaneContext';

describe('Realization service context', () => {
  let world: World;
  let operationContext: OperationContext;
  let realizationContext: CachedProjectionElementRealizationContext;
  let planeH: any;
  let p1Id: string;
  let p2Id: string;

  beforeEach(() => {
    const { world: w, operationContext: context } = createTestWorld();
    world = w;
    operationContext = context;
    realizationContext = operationContext.realizationContext;
    planeH = getHorizontalPlane(world);
    
    // Create test points (let IDs auto-generate)
    const p1 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(0, 0, 1));
    const p2 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(10, 10, 1));
    
    p1Id = p1.id;
    p2Id = p2.id;
  });

  describe('Point realization computation', () => {
    it('RealizationService.realizePoint2D() should compute point realization', () => {
      const point = planeH.getPoint(p1Id)!;
      const realization = operationContext.realizations.realizePoint2D(point, realizationContext);
      
      // Verify realization computed
      expect(realization).toBeDefined();
      expect(realization!.position.x).toBe(0);
      expect(realization!.position.y).toBe(0);
    });

    it('Point.realize2D() should compute realization (without automatic caching)', () => {
      // Get the point element
      const point = planeH.getPoint(p1Id);
      expect(point).toBeDefined();
      
      // Call realize2D on the element - this computes fresh, no caching
      const realization = point!.realize2D(realizationContext);
      
      // Verify realization computed
      expect(realization).toBeDefined();
      expect(realization!.position.x).toBe(0);
      expect(realization!.position.y).toBe(0);
      
      // Note: realize2D() doesn't automatically cache. Use RealizationService for caching.
    });

    it('subsequent calls should return cached realization', () => {
      const point = planeH.getPoint(p1Id)!;
      
      // First call - computes
      const first = operationContext.realizations.realizePoint2D(point, realizationContext);
      
      // Second call - returns cached
      const second = operationContext.realizations.realizePoint2D(point, realizationContext);
      
      expect(first).toBe(second);  // Same instance from cache
    });
  });

  describe('Line realization computation', () => {
    it('RealizationService.realizeLine2D() should compute and cache line realization', () => {
      const line = operationContext.projectionConstruction.addLine2DBetweenTwoPoints(planeH, p1Id, p2Id);
      const realization = operationContext.realizations.realizeLine2D(line, realizationContext);
      
      // Verify realization computed
      expect(realization).toBeDefined();
      expect(realization!.feasible).toBe(true);
      expect(operationContext.realizations.realizeLine2D(line, realizationContext)).toBe(realization);
    });

    it('should work for segments (Line2D subtypes)', () => {
      const segment = new Segment2D(planeH.id + '/seg1', p1Id, p2Id, planeH.id);
      planeH.addLine(segment);
      
      const realization = operationContext.realizations.realizeLine2D(segment, realizationContext);
      
      // Verify segment realization has endpoints
      expect(realization).toBeDefined();
      expect(realization!.isBounded()).toBe(true);
      expect(realization!.point1).toBeDefined();
      expect(realization!.point2).toBeDefined();
      
      expect(operationContext.realizations.realizeLine2D(segment, realizationContext)).toBe(realization);
    });
  });

  describe('Circle realization computation', () => {
    it('RealizationService.realizeCircle2D() should compute and cache circle realization', () => {
      // Create circumference point
      const p2 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(5, 0, 1));
      const circle = operationContext.projectionConstruction.addCircle2DByCenterAndPoint(planeH, p1Id, p2.id);
      
      const realization = operationContext.realizations.realizeCircle2D(circle, realizationContext);
      
      // Verify realization computed
      expect(realization).toBeDefined();
      expect(realization!.center.x).toBe(0);
      expect(realization!.center.y).toBe(0);
      expect(realization!.getRadius()).toBe(5);
      expect(operationContext.realizations.realizeCircle2D(circle, realizationContext)).toBe(realization);
    });

  });

  describe('Cache isolation between elements', () => {
    it('invalidating one point does not clear an unrelated point', () => {
      const planeV = getVerticalPlane(world);
      
      // Add points to both planes (no hardcoded IDs)
      const p1H = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(5, 5, 1));
      const p1V = operationContext.projectionConstruction.addFreePoint2D(planeV, new Vector3(5, 5, 1));
      
      const firstH = operationContext.realizations.realizePoint2D(p1H, realizationContext);
      const firstV = operationContext.realizations.realizePoint2D(p1V, realizationContext);

      operationContext.realizations.invalidateElement(p1H.id, operationContext.dependencies, world.getAllProjectionPlanes());

      expect(operationContext.realizations.realizePoint2D(p1H, realizationContext)).not.toBe(firstH);
      expect(operationContext.realizations.realizePoint2D(p1V, realizationContext)).toBe(firstV);
    });
  });
});
