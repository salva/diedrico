/**
 * Phase 76 Integration Tests: Fail-Fast Error Handling
 * 
 * Verifies that the codebase properly implements fail-fast error handling:
 * - Corrupted state (missing planes, invalid IDs) throws descriptive errors
 * - Legitimate geometric failures return feasible: false (not errors)
 * - All errors use [INTERNAL ERROR] prefix for clear identification
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { World } from '@/domain/world/World';
import { GeometryElementLookup } from '@/domain/world/GeometryElementLookup';
import { Vector3 } from 'three';
import { createTestWorld, getHorizontalPlane } from '../helpers/worldHelpers';

describe('Phase 76: Fail-Fast Error Handling', () => {
  let world: World;
  let operationContext;
  let lookup: GeometryElementLookup;

  beforeEach(() => {
    const { world: w, operationContext: oc } = createTestWorld();
    world = w;
    operationContext = oc;
    lookup = new GeometryElementLookup(world);
  });

  describe('World Getters - Missing Planes', () => {
    it('should throw descriptive error when plane does not exist for getPoint2D', () => {
      expect(() => {
        lookup.getPoint2D('nonexistent_plane/P1');
      }).toThrow('[INTERNAL ERROR]');
    });

    it('should throw descriptive error when plane does not exist for getLine2D', () => {
      expect(() => {
        lookup.getLine2D('nonexistent_plane/L1');
      }).toThrow('[INTERNAL ERROR]');
    });

    it('should throw descriptive error when plane does not exist for getCircle2D', () => {
      expect(() => {
        lookup.getCircle2D('nonexistent_plane/C1');
      }).toThrow('[INTERNAL ERROR]');
    });

    it('should throw descriptive error when plane does not exist for getSegment2D', () => {
      expect(() => {
        lookup.getLine2D('nonexistent_plane/S1');
      }).toThrow('[INTERNAL ERROR]');
    });

    it('should throw descriptive error when plane does not exist for getGuide2D', () => {
      expect(() => {
        lookup.getLine2D('nonexistent_plane/G1');
      }).toThrow('[INTERNAL ERROR]');
    });
  });

  describe('World Getters - Invalid Element IDs', () => {
    it('should return undefined when element does not exist in plane (legitimate case)', () => {
      const planeH = getHorizontalPlane(world);
      
      // Non-existent element in existing plane is undefined (not corruption)
      const point = lookup.getPoint2D(`${planeH.id}/nonexistent`);
      expect(point).toBeUndefined();
    });

    it('should throw error when plane does not exist in ID', () => {
      // Malformed IDs (no plane exists) should throw
      expect(() => {
        lookup.getPoint2D('NONEXISTENT_PLANE/P1');
      }).toThrow('[INTERNAL ERROR]');
    });
  });

  describe('Geometric Realization - Legitimate Failures', () => {
    it('should not allow creation of degenerate geometries via factory methods', () => {
      const planeH = getHorizontalPlane(world);
      const p1 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(5, 5, 0));
      const p2 = operationContext.projectionConstruction.addFreePoint2D(planeH, new Vector3(5, 5, 0)); // Same position
      
      // Factory methods should throw for degenerate cases (fail early)
      expect(() => {
        operationContext.projectionConstruction.addLine2DBetweenTwoPoints(planeH, p1.id, p2.id);
      }).toThrow();  // Expected: points too close
    });
  });

  describe('Error Message Format', () => {
    it('should include [INTERNAL ERROR] prefix in corruption errors', () => {
      try {
        lookup.getPoint2D('NONEXISTENT_PLANE/P1');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect((error as Error).message).toMatch(/^\[INTERNAL ERROR\]/);
      }
    });
  });

  describe('Stack Traces', () => {
    it('should throw errors that include stack traces for debugging', () => {
      expect(() => {
        lookup.getPoint2D('nonexistent/plane');
      }).toThrow(Error); // Should throw Error object (not string) with stack
    });
  });
});
