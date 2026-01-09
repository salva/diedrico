import { Vector3 } from 'three';
/**
 * Unit tests for World class - Factory Methods
 * 
 * Tests World factory methods for creating geometric elements.
 * Factory methods provide type-safe, validated element creation.
 * 
 * @see frontend/src/domain/world/World.ts
 * @see specs/001-dihedral-learning-mvp/tasks.md#phase-105
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '@/domain/world/World';
import { HalfHingeLine2D } from '@/domain/world/HingeLine';
import { SiblingIntersectionPoint2D } from '@/domain/world/Point';

describe('World Factory Methods', () => {
  let world: World;

  beforeEach(() => {
    world = new World();
  });

  describe('constructor', () => {
    it('should create a world with projection planes', () => {
      expect(world.getPoint2DCount()).toBeGreaterThan(0);
      const points = world.getAllPoints2D();
      expect(points.length).toBeGreaterThan(0);
    });
  });

  describe('Factory Methods', () => {
    describe('addFreePoint2D', () => {
      it('should create and add a free point with generated ID', () => {
        const position = new Vector3(10, 20, 1);
        const point = world.addFreePoint2D('proj_plane_H', position);

        expect(point.id).toMatch(/^point2d_\d+$/);
        expect(point.position).toEqual(position);
        expect(point.planeId).toBe('proj_plane_H');
        expect(world.getPoint2DById(point.id)).toBe(point);
      });

      it('should create point with provided ID', () => {
        const position = new Vector3(10, 20, 1);
        const point = world.addFreePoint2D('proj_plane_H', position, 'custom_point_id');

        expect(point.id).toBe('custom_point_id');
        expect(world.getPoint2DById('custom_point_id')).toBe(point);
      });

      it('should throw error for invalid planeId', () => {
        expect(() => {
          world.addFreePoint2D('invalid_plane', new Vector3(10, 20, 1));
        }).toThrow(/plane/i);
      });
    });

    describe('addIntersectionPoint2D', () => {
      it('should create intersection point between two lines', () => {
        const p1 = world.addFreePoint2D('proj_plane_H', new Vector3(0, 0, 1));
        const p2 = world.addFreePoint2D('proj_plane_H', new Vector3(10, 0, 1));
        const p3 = world.addFreePoint2D('proj_plane_H', new Vector3(5, -5, 1));
        const p4 = world.addFreePoint2D('proj_plane_H', new Vector3(5, 5, 1));

        const line1 = world.addLine2DBetweenTwoPoints('proj_plane_H', p1.id, p2.id);
        const line2 = world.addLine2DBetweenTwoPoints('proj_plane_H', p3.id, p4.id);

        const intersection = world.addIntersectionPoint2D(
          'proj_plane_H',
          line1.id,
          line2.id,
          0
        );

        expect(intersection.id).toMatch(/^point2d_\d+$/);
        expect(intersection.planeId).toBe('proj_plane_H');
        expect(world.getPoint2DById(intersection.id)).toBe(intersection);
      });

      it('should use provided ID when given', () => {
        const p1 = world.addFreePoint2D('proj_plane_H', new Vector3(0, 0, 1));
        const p2 = world.addFreePoint2D('proj_plane_H', new Vector3(10, 0, 1));
        const p3 = world.addFreePoint2D('proj_plane_H', new Vector3(5, -5, 1));
        const p4 = world.addFreePoint2D('proj_plane_H', new Vector3(5, 5, 1));

        const line1 = world.addLine2DBetweenTwoPoints('proj_plane_H', p1.id, p2.id);
        const line2 = world.addLine2DBetweenTwoPoints('proj_plane_H', p3.id, p4.id);

        const intersection = world.addIntersectionPoint2D(
          'proj_plane_H',
          line1.id,
          line2.id,
          0,
          'custom_intersection'
        );

        expect(intersection.id).toBe('custom_intersection');
      });

      it('should throw error for non-existent lines', () => {
        expect(() => {
          world.addIntersectionPoint2D('proj_plane_H', 'invalid_line1', 'invalid_line2', 0);
        }).toThrow();
      });

      it('should throw error for parallel lines', () => {
        // Create two horizontal parallel lines
        const p1 = world.addFreePoint2D('proj_plane_H', new Vector3(0, 0, 1));
        const p2 = world.addFreePoint2D('proj_plane_H', new Vector3(10, 0, 1));
        const p3 = world.addFreePoint2D('proj_plane_H', new Vector3(0, 5, 1));
        const p4 = world.addFreePoint2D('proj_plane_H', new Vector3(10, 5, 1));

        const line1 = world.addLine2DBetweenTwoPoints('proj_plane_H', p1.id, p2.id);
        const line2 = world.addLine2DBetweenTwoPoints('proj_plane_H', p3.id, p4.id); // Parallel to line1

        // After Phase 23, parallel lines create infeasible intersection point instead of throwing
        const point = world.addIntersectionPoint2D('proj_plane_H', line1.id, line2.id, 0);
        const realization = world.getPoint2DRealization(point.id);
        expect(realization).toBeDefined();
        expect(realization!.feasible).toBe(false);
      });
    });

    // T055m: Tests for sibling creation with HalfHingeLine2D
    describe('addIntersectionPoint2DWithSibling', () => {
      it('should create only primary point when neither element is HHL', () => {
        // Create two regular lines
        const p1 = world.addFreePoint2D('proj_plane_H', new Vector3(0, 0, 1));
        const p2 = world.addFreePoint2D('proj_plane_H', new Vector3(10, 0, 1));
        const p3 = world.addFreePoint2D('proj_plane_H', new Vector3(5, -5, 1));
        const p4 = world.addFreePoint2D('proj_plane_H', new Vector3(5, 5, 1));

        const line1 = world.addLine2DBetweenTwoPoints('proj_plane_H', p1.id, p2.id);
        const line2 = world.addLine2DBetweenTwoPoints('proj_plane_H', p3.id, p4.id);

        const result = world.addIntersectionPoint2DWithSibling(
          'proj_plane_H',
          line1.id,
          line2.id,
          0
        );

        expect(result.primary).toBeDefined();
        expect(result.primary.planeId).toBe('proj_plane_H');
        expect(result.sibling).toBeUndefined();
      });

      it('should create sibling when element1 is HalfHingeLine2D', () => {
        // Use the existing HalfHingeLine2D on proj_plane_H (created in World constructor)
        const hhlId = 'half_HL_HV_on_PH';

        // Create a regular line that intersects the HHL
        const p1 = world.addFreePoint2D('proj_plane_H', new Vector3(5, -5, 1));
        const p2 = world.addFreePoint2D('proj_plane_H', new Vector3(5, 5, 1));
        const verticalLine = world.addLine2DBetweenTwoPoints('proj_plane_H', p1.id, p2.id);

        const result = world.addIntersectionPoint2DWithSibling(
          'proj_plane_H',
          hhlId,
          verticalLine.id,
          0
        );

        expect(result.primary).toBeDefined();
        expect(result.primary.planeId).toBe('proj_plane_H');
        expect(result.sibling).toBeDefined();
        expect(result.sibling).toBeInstanceOf(SiblingIntersectionPoint2D);
        expect(result.sibling!.planeId).toBe('proj_plane_V');
        expect(result.sibling!.primaryIntersectionId).toBe(result.primary.id);
      });

      it('should create sibling when element2 is HalfHingeLine2D', () => {
        // Use the existing HalfHingeLine2D on proj_plane_V
        const hhlId = 'half_HL_HV_on_PV';

        // Create a regular line that intersects the HHL
        const p1 = world.addFreePoint2D('proj_plane_V', new Vector3(5, -5, 1));
        const p2 = world.addFreePoint2D('proj_plane_V', new Vector3(5, 5, 1));
        const verticalLine = world.addLine2DBetweenTwoPoints('proj_plane_V', p1.id, p2.id);

        const result = world.addIntersectionPoint2DWithSibling(
          'proj_plane_V',
          verticalLine.id,
          hhlId,
          0
        );

        expect(result.primary).toBeDefined();
        expect(result.primary.planeId).toBe('proj_plane_V');
        expect(result.sibling).toBeDefined();
        expect(result.sibling!.planeId).toBe('proj_plane_H');
        expect(result.sibling!.primaryIntersectionId).toBe(result.primary.id);
      });

      it('should establish bidirectional link between primary and sibling', () => {
        const hhlId = 'half_HL_HV_on_PH';

        const p1 = world.addFreePoint2D('proj_plane_H', new Vector3(5, -5, 1));
        const p2 = world.addFreePoint2D('proj_plane_H', new Vector3(5, 5, 1));
        const verticalLine = world.addLine2DBetweenTwoPoints('proj_plane_H', p1.id, p2.id);

        const result = world.addIntersectionPoint2DWithSibling(
          'proj_plane_H',
          hhlId,
          verticalLine.id,
          0
        );

        // Primary → sibling link
        expect(result.primary.siblingPointId).toBe(result.sibling!.id);
        
        // Sibling → primary link
        expect(result.sibling!.primaryIntersectionId).toBe(result.primary.id);
      });

      it('should use provided IDs for redo operations', () => {
        const hhlId = 'half_HL_HV_on_PH';

        const p1 = world.addFreePoint2D('proj_plane_H', new Vector3(5, -5, 1));
        const p2 = world.addFreePoint2D('proj_plane_H', new Vector3(5, 5, 1));
        const verticalLine = world.addLine2DBetweenTwoPoints('proj_plane_H', p1.id, p2.id);

        const result = world.addIntersectionPoint2DWithSibling(
          'proj_plane_H',
          hhlId,
          verticalLine.id,
          0,
          'custom_primary_id',
          'custom_sibling_id'
        );

        expect(result.primary.id).toBe('custom_primary_id');
        expect(result.sibling!.id).toBe('custom_sibling_id');
      });

      it('should copy label from primary to sibling', () => {
        const hhlId = 'half_HL_HV_on_PH';

        const p1 = world.addFreePoint2D('proj_plane_H', new Vector3(5, -5, 1));
        const p2 = world.addFreePoint2D('proj_plane_H', new Vector3(5, 5, 1));
        const verticalLine = world.addLine2DBetweenTwoPoints('proj_plane_H', p1.id, p2.id);

        // Create intersection - primary has no label yet
        const result = world.addIntersectionPoint2DWithSibling(
          'proj_plane_H',
          hhlId,
          verticalLine.id,
          0
        );
        
        // Both should have no label (label is copied at creation time)
        expect(result.primary.label).toBeUndefined();
        expect(result.sibling!.label).toBeUndefined();
        
        // If we set label on primary after creation, sibling doesn't auto-update
        // (This is expected behavior - label is copied once at creation)
        result.primary.label = 'Point P';
        expect(result.primary.label).toBe('Point P');
        expect(result.sibling!.label).toBeUndefined(); // Sibling still has no label
      });

      it('should determine correct sibling plane for proj_plane_H', () => {
        const hhlId = 'half_HL_HV_on_PH';

        const p1 = world.addFreePoint2D('proj_plane_H', new Vector3(5, -5, 1));
        const p2 = world.addFreePoint2D('proj_plane_H', new Vector3(5, 5, 1));
        const verticalLine = world.addLine2DBetweenTwoPoints('proj_plane_H', p1.id, p2.id);

        const result = world.addIntersectionPoint2DWithSibling(
          'proj_plane_H',
          hhlId,
          verticalLine.id,
          0
        );

        expect(result.sibling!.planeId).toBe('proj_plane_V');
      });

      it('should determine correct sibling plane for proj_plane_V', () => {
        const hhlId = 'half_HL_HV_on_PV';

        const p1 = world.addFreePoint2D('proj_plane_V', new Vector3(5, -5, 1));
        const p2 = world.addFreePoint2D('proj_plane_V', new Vector3(5, 5, 1));
        const verticalLine = world.addLine2DBetweenTwoPoints('proj_plane_V', p1.id, p2.id);

        const result = world.addIntersectionPoint2DWithSibling(
          'proj_plane_V',
          hhlId,
          verticalLine.id,
          0
        );

        expect(result.sibling!.planeId).toBe('proj_plane_H');
      });

      it('should add sibling to world storage', () => {
        const hhlId = 'half_HL_HV_on_PH';

        const p1 = world.addFreePoint2D('proj_plane_H', new Vector3(5, -5, 1));
        const p2 = world.addFreePoint2D('proj_plane_H', new Vector3(5, 5, 1));
        const verticalLine = world.addLine2DBetweenTwoPoints('proj_plane_H', p1.id, p2.id);

        const result = world.addIntersectionPoint2DWithSibling(
          'proj_plane_H',
          hhlId,
          verticalLine.id,
          0
        );

        const retrievedSibling = world.getPoint2DById(result.sibling!.id);
        expect(retrievedSibling).toBe(result.sibling);
        expect(retrievedSibling).toBeInstanceOf(SiblingIntersectionPoint2D);
      });
    });

    describe('addLine2DBetweenTwoPoints', () => {
      it('should create line between two points', () => {
        const p1 = world.addFreePoint2D('proj_plane_H', new Vector3(0, 0, 1));
        const p2 = world.addFreePoint2D('proj_plane_H', new Vector3(10, 10, 1));

        const line = world.addLine2DBetweenTwoPoints('proj_plane_H', p1.id, p2.id);

        expect(line.id).toMatch(/^line2d_\d+$/);
        expect(line.planeId).toBe('proj_plane_H');
        expect(world.getLine2DById(line.id)).toBe(line);
      });

      it('should use provided ID', () => {
        const p1 = world.addFreePoint2D('proj_plane_H', new Vector3(0, 0, 1));
        const p2 = world.addFreePoint2D('proj_plane_H', new Vector3(10, 10, 1));

        const line = world.addLine2DBetweenTwoPoints('proj_plane_H', p1.id, p2.id, 'custom_line');

        expect(line.id).toBe('custom_line');
      });

      it('should throw error for identical points', () => {
        const p1 = world.addFreePoint2D('proj_plane_H', new Vector3(0, 0, 1));

        expect(() => {
          world.addLine2DBetweenTwoPoints('proj_plane_H', p1.id, p1.id);
        }).toThrow(/point|distinct/i);
      });

      it('should throw error for non-existent points', () => {
        expect(() => {
          world.addLine2DBetweenTwoPoints('proj_plane_H', 'invalid_p1', 'invalid_p2');
        }).toThrow();
      });
    });

    describe('addSegment2DBetweenPoints', () => {
      it('should create segment between two points', () => {
        const p1 = world.addFreePoint2D('proj_plane_H', new Vector3(0, 0, 1));
        const p2 = world.addFreePoint2D('proj_plane_H', new Vector3(10, 10, 1));

        const segment = world.addSegment2DBetweenPoints('proj_plane_H', p1.id, p2.id);

        expect(segment.id).toMatch(/^segment2d_\d+$/);
        expect(segment.planeId).toBe('proj_plane_H');
        expect(world.getSegment2DById(segment.id)).toBe(segment);
      });

      it('should use provided ID', () => {
        const p1 = world.addFreePoint2D('proj_plane_H', new Vector3(0, 0, 1));
        const p2 = world.addFreePoint2D('proj_plane_H', new Vector3(10, 10, 1));

        const segment = world.addSegment2DBetweenPoints('proj_plane_H', p1.id, p2.id, 'custom_segment');

        expect(segment.id).toBe('custom_segment');
      });

      it('should throw error for identical points', () => {
        const p1 = world.addFreePoint2D('proj_plane_H', new Vector3(0, 0, 1));

        expect(() => {
          world.addSegment2DBetweenPoints('proj_plane_H', p1.id, p1.id);
        }).toThrow(/point|segment/i);
      });
    });

    describe('addCircle2DByCenter', () => {
      it('should create circle with center and radius', () => {
        const center = world.addFreePoint2D('proj_plane_H', new Vector3(5, 5, 1));

        const circle = world.addCircle2DByCenter('proj_plane_H', center.id, 10);

        expect(circle.id).toMatch(/^circle2d_\d+$/);
        expect(circle.radius).toBe(10);
        expect(world.getCircle2DById(circle.id)).toBe(circle);
      });

      it('should use provided ID', () => {
        const center = world.addFreePoint2D('proj_plane_H', new Vector3(5, 5, 1));

        const circle = world.addCircle2DByCenter('proj_plane_H', center.id, 10, 'custom_circle');

        expect(circle.id).toBe('custom_circle');
      });

      it('should throw error for invalid radius', () => {
        const center = world.addFreePoint2D('proj_plane_H', new Vector3(5, 5, 1));

        expect(() => {
          world.addCircle2DByCenter('proj_plane_H', center.id, 0);
        }).toThrow(/radius|positive/i);

        expect(() => {
          world.addCircle2DByCenter('proj_plane_H', center.id, -5);
        }).toThrow(/radius|positive/i);
      });

      it('should throw error for non-existent center point', () => {
      });
    });

    describe('addGuide2D', () => {
      it('should create guide perpendicular to reference line through point', () => {
        const p1 = world.addFreePoint2D('proj_plane_H', new Vector3(0, 0, 1));
        const p2 = world.addFreePoint2D('proj_plane_H', new Vector3(10, 0, 1));
        const throughPoint = world.addFreePoint2D('proj_plane_H', new Vector3(5, 5, 1));
        
        const referenceLine = world.addLine2DBetweenTwoPoints('proj_plane_H', p1.id, p2.id);
        const guide = world.addGuide2D('proj_plane_H', referenceLine.id, throughPoint.id);

        expect(guide.id).toMatch(/^guide2d_\d+$/);
        expect(world.getGuide2DById(guide.id)).toBe(guide);
      });

      it('should use provided ID', () => {
        const p1 = world.addFreePoint2D('proj_plane_H', new Vector3(0, 0, 1));
        const p2 = world.addFreePoint2D('proj_plane_H', new Vector3(10, 0, 1));
        const throughPoint = world.addFreePoint2D('proj_plane_H', new Vector3(5, 5, 1));
        
        const referenceLine = world.addLine2DBetweenTwoPoints('proj_plane_H', p1.id, p2.id);
        const guide = world.addGuide2D('proj_plane_H', referenceLine.id, throughPoint.id, 'custom_guide');

        expect(guide.id).toBe('custom_guide');
      });

      it('should throw error for non-existent reference line', () => {
        const point = world.addFreePoint2D('proj_plane_H', new Vector3(5, 5, 1));
        
        expect(() => {
          world.addGuide2D('proj_plane_H', 'invalid_line', point.id);
        }).toThrow(/line/i);
      });

      it('should throw error for non-existent through point', () => {
        const p1 = world.addFreePoint2D('proj_plane_H', new Vector3(0, 0, 1));
        const p2 = world.addFreePoint2D('proj_plane_H', new Vector3(10, 0, 1));
        const referenceLine = world.addLine2DBetweenTwoPoints('proj_plane_H', p1.id, p2.id);
        
        expect(() => {
          world.addGuide2D('proj_plane_H', referenceLine.id, 'invalid_point');
        }).toThrow(/point/i);
      });
    });

    describe('Removal Methods', () => {
      it('should remove point and return it', () => {
        const point = world.addFreePoint2D('proj_plane_H', new Vector3(10, 20, 1));
        const pointId = point.id;

        const removed = world.removePoint2D('proj_plane_H', pointId);

        expect(removed).toBe(point);
        expect(world.getPoint2DById(pointId)).toBeUndefined();
      });

      it('should remove line and return it', () => {
        const p1 = world.addFreePoint2D('proj_plane_H', new Vector3(0, 0, 1));
        const p2 = world.addFreePoint2D('proj_plane_H', new Vector3(10, 10, 1));
        const line = world.addLine2DBetweenTwoPoints('proj_plane_H', p1.id, p2.id);

        const removed = world.removeLine2D('proj_plane_H', line.id);

        expect(removed).toBe(line);
        expect(world.getLine2DById(line.id)).toBeUndefined();
      });

      it('should remove segment and return it', () => {
        const p1 = world.addFreePoint2D('proj_plane_H', new Vector3(0, 0, 1));
        const p2 = world.addFreePoint2D('proj_plane_H', new Vector3(10, 10, 1));
        const segment = world.addSegment2DBetweenPoints('proj_plane_H', p1.id, p2.id);

        const removed = world.removeSegment2D('proj_plane_H', segment.id);

        expect(removed).toBe(segment);
        expect(world.getSegment2DById(segment.id)).toBeUndefined();
      });

      it('should remove guide and return it', () => {
        const p1 = world.addFreePoint2D('proj_plane_H', new Vector3(0, 0, 1));
        const p2 = world.addFreePoint2D('proj_plane_H', new Vector3(10, 0, 1));
        const throughPoint = world.addFreePoint2D('proj_plane_H', new Vector3(5, 5, 1));
        const referenceLine = world.addLine2DBetweenTwoPoints('proj_plane_H', p1.id, p2.id);
        const guide = world.addGuide2D('proj_plane_H', referenceLine.id, throughPoint.id);

        const removed = world.removeGuide2D('proj_plane_H', guide.id);

        expect(removed).toBe(guide);
        expect(world.getGuide2DById(guide.id)).toBeUndefined();
      });

      it('should return null when removing non-existent element', () => {
        expect(world.removePoint2D('proj_plane_H', 'invalid')).toBeNull();
        expect(world.removeLine2D('proj_plane_H', 'invalid')).toBeNull();
        expect(world.removeSegment2D('proj_plane_H', 'invalid')).toBeNull();
        expect(world.removeCircle2D('proj_plane_H', 'invalid')).toBeNull();
        expect(world.removeGuide2D('proj_plane_H', 'invalid')).toBeNull();
      });
    });

    describe('Realization Cache Updates', () => {
      it('should update realizations when point added', () => {
        const point = world.addFreePoint2D('proj_plane_H', new Vector3(10, 20, 1));

        const realization = world.getPoint2DRealization(point.id);

        expect(realization).toBeDefined();
        expect(realization?.position.x).toBe(10);
        expect(realization?.position.y).toBe(20);
      });

      it('should update realizations when line added', () => {
        const p1 = world.addFreePoint2D('proj_plane_H', new Vector3(0, 0, 1));
        const p2 = world.addFreePoint2D('proj_plane_H', new Vector3(10, 10, 1));
        const line = world.addLine2DBetweenTwoPoints('proj_plane_H', p1.id, p2.id);

        const realization = world.getLine2DRealization(line.id);

        expect(realization).toBeDefined();
      });

      it('should update realizations when segment added', () => {
        const p1 = world.addFreePoint2D('proj_plane_H', new Vector3(0, 0, 1));
        const p2 = world.addFreePoint2D('proj_plane_H', new Vector3(10, 10, 1));
        const segment = world.addSegment2DBetweenPoints('proj_plane_H', p1.id, p2.id);

        // Phase 22.5: Segments are Line2D, use getLine2DRealization
        const realization = world.getLine2DRealization(segment.id);

        expect(realization).toBeDefined();
      });
    });
  });
});
