/**
 * Phase 97: Tests for World.generateDefaultLabel()
 * 
 * Validates that default labels are correctly generated from element IDs
 * following the Phase 97 architecture:
 * - Labels extract numbers from technical IDs (e.g., point2d5 → A_5)
 * - Multi-digit subscripts use braces (e.g., point2d12 → A_{12})
 * - 2D and 3D elements share label sequences (Point2D and Point3D both → A_n)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '@/domain/world/World';

describe('World.generateDefaultLabel()', () => {
  let world: World;

  beforeEach(() => {
    world = new World();
  });

  describe('Point labels (A_n)', () => {
    it('should generate A_1 for point2d1', () => {
      expect(world.generateDefaultLabel('point2d1', 'Point2D')).toBe('A_1');
    });

    it('should generate A_5 for point2d5', () => {
      expect(world.generateDefaultLabel('point2d5', 'Point2D')).toBe('A_5');
    });

    it('should generate A_9 for point2d9 (last single digit)', () => {
      expect(world.generateDefaultLabel('point2d9', 'Point2D')).toBe('A_9');
    });

    it('should generate A_{10} for point2d10 (first multi-digit with braces)', () => {
      expect(world.generateDefaultLabel('point2d10', 'Point2D')).toBe('A_{10}');
    });

    it('should generate A_{12} for point2d12', () => {
      expect(world.generateDefaultLabel('point2d12', 'Point2D')).toBe('A_{12}');
    });

    it('should generate A_{100} for point2d100', () => {
      expect(world.generateDefaultLabel('point2d100', 'Point2D')).toBe('A_{100}');
    });

    it('should generate A_2 for point3d2 (3D points share sequence)', () => {
      expect(world.generateDefaultLabel('point3d2', 'Point3D')).toBe('A_2');
    });

    it('should generate A_{15} for point3d15', () => {
      expect(world.generateDefaultLabel('point3d15', 'Point3D')).toBe('A_{15}');
    });
  });

  describe('Line labels (L_n)', () => {
    it('should generate L_1 for line2d1', () => {
      expect(world.generateDefaultLabel('line2d1', 'Line2D')).toBe('L_1');
    });

    it('should generate L_8 for line2d8', () => {
      expect(world.generateDefaultLabel('line2d8', 'Line2D')).toBe('L_8');
    });

    it('should generate L_{10} for line2d10', () => {
      expect(world.generateDefaultLabel('line2d10', 'Line2D')).toBe('L_{10}');
    });

    it('should generate L_{45} for line2d45', () => {
      expect(world.generateDefaultLabel('line2d45', 'Line2D')).toBe('L_{45}');
    });

    it('should generate L_3 for line3d3 (3D lines share sequence)', () => {
      expect(world.generateDefaultLabel('line3d3', 'Line3D')).toBe('L_3');
    });

    it('should generate L_{20} for line3d20', () => {
      expect(world.generateDefaultLabel('line3d20', 'Line3D')).toBe('L_{20}');
    });
  });

  describe('Segment labels (S_n)', () => {
    it('should generate S_1 for segment2d1', () => {
      expect(world.generateDefaultLabel('segment2d1', 'Segment2D')).toBe('S_1');
    });

    it('should generate S_7 for segment2d7', () => {
      expect(world.generateDefaultLabel('segment2d7', 'Segment2D')).toBe('S_7');
    });

    it('should generate S_{10} for segment2d10', () => {
      expect(world.generateDefaultLabel('segment2d10', 'Segment2D')).toBe('S_{10}');
    });

    it('should generate S_{33} for segment2d33', () => {
      expect(world.generateDefaultLabel('segment2d33', 'Segment2D')).toBe('S_{33}');
    });

    it('should generate S_4 for segment3d4 (3D segments share sequence)', () => {
      expect(world.generateDefaultLabel('segment3d4', 'Segment3D')).toBe('S_4');
    });
  });

  describe('Circle labels (C_n)', () => {
    it('should generate C_1 for circle2d1', () => {
      expect(world.generateDefaultLabel('circle2d1', 'Circle2D')).toBe('C_1');
    });

    it('should generate C_6 for circle2d6', () => {
      expect(world.generateDefaultLabel('circle2d6', 'Circle2D')).toBe('C_6');
    });

    it('should generate C_{10} for circle2d10', () => {
      expect(world.generateDefaultLabel('circle2d10', 'Circle2D')).toBe('C_{10}');
    });

    it('should generate C_{25} for circle2d25', () => {
      expect(world.generateDefaultLabel('circle2d25', 'Circle2D')).toBe('C_{25}');
    });
  });

  describe('Guide labels (G_n)', () => {
    it('should generate G_1 for guide2d1', () => {
      expect(world.generateDefaultLabel('guide2d1', 'Guide2D')).toBe('G_1');
    });

    it('should generate G_9 for guide2d9', () => {
      expect(world.generateDefaultLabel('guide2d9', 'Guide2D')).toBe('G_9');
    });

    it('should generate G_{10} for guide2d10', () => {
      expect(world.generateDefaultLabel('guide2d10', 'Guide2D')).toBe('G_{10}');
    });

    it('should generate G_{42} for guide2d42', () => {
      expect(world.generateDefaultLabel('guide2d42', 'Guide2D')).toBe('G_{42}');
    });
  });

  describe('Plane labels (P_n)', () => {
    it('should generate P_1 for plane3d1', () => {
      expect(world.generateDefaultLabel('plane3d1', 'Plane3D')).toBe('P_1');
    });

    it('should generate P_5 for plane3d5', () => {
      expect(world.generateDefaultLabel('plane3d5', 'Plane3D')).toBe('P_5');
    });

    it('should generate P_{10} for plane3d10', () => {
      expect(world.generateDefaultLabel('plane3d10', 'Plane3D')).toBe('P_{10}');
    });

    it('should generate P_2 for projPlane2 (ProjectionPlane shares sequence)', () => {
      expect(world.generateDefaultLabel('projPlane2', 'ProjectionPlane')).toBe('P_2');
    });

    it('should generate P_{15} for projPlane15', () => {
      expect(world.generateDefaultLabel('projPlane15', 'ProjectionPlane')).toBe('P_{15}');
    });
  });

  describe('HingeLine labels (HL_n)', () => {
    it('should generate HL_1 for hingeLine1', () => {
      expect(world.generateDefaultLabel('hingeLine1', 'HingeLine')).toBe('HL_1');
    });

    it('should generate HL_4 for hingeLine4', () => {
      expect(world.generateDefaultLabel('hingeLine4', 'HingeLine')).toBe('HL_4');
    });

    it('should generate HL_{10} for hingeLine10', () => {
      expect(world.generateDefaultLabel('hingeLine10', 'HingeLine')).toBe('HL_{10}');
    });

    it('should generate HL_{27} for hingeLine27', () => {
      expect(world.generateDefaultLabel('hingeLine27', 'HingeLine')).toBe('HL_{27}');
    });
  });

  describe('HalfHingeLine labels (HHL_n)', () => {
    it('should generate HHL_1 for halfHingeLine1', () => {
      expect(world.generateDefaultLabel('halfHingeLine1', 'HalfHingeLine')).toBe('HHL_1');
    });

    it('should generate HHL_6 for halfHingeLine6', () => {
      expect(world.generateDefaultLabel('halfHingeLine6', 'HalfHingeLine')).toBe('HHL_6');
    });

    it('should generate HHL_{10} for halfHingeLine10', () => {
      expect(world.generateDefaultLabel('halfHingeLine10', 'HalfHingeLine')).toBe('HHL_{10}');
    });

    it('should generate HHL_{18} for halfHingeLine18', () => {
      expect(world.generateDefaultLabel('halfHingeLine18', 'HalfHingeLine')).toBe('HHL_{18}');
    });
  });

  describe('Error handling', () => {
    it('should return empty string for ID without number (graceful degradation)', () => {
      // Pre-existing deserialization bug can create IDs like "guide2dNaN"
      expect(world.generateDefaultLabel('invalidId', 'Point2D')).toBe('');
    });

    it('should throw error for unknown element type', () => {
      expect(() => {
        world.generateDefaultLabel('point2d5', 'UnknownType');
      }).toThrow('Unknown element type: UnknownType');
    });

    it('should return empty string for empty ID (graceful degradation)', () => {
      expect(world.generateDefaultLabel('', 'Point2D')).toBe('');
    });
  });

  describe('Number extraction from various ID formats', () => {
    it('should extract single digit from ID', () => {
      expect(world.generateDefaultLabel('point2d1', 'Point2D')).toBe('A_1');
    });

    it('should extract two digits from ID', () => {
      expect(world.generateDefaultLabel('point2d42', 'Point2D')).toBe('A_{42}');
    });

    it('should extract three digits from ID', () => {
      expect(world.generateDefaultLabel('line2d123', 'Line2D')).toBe('L_{123}');
    });

    it('should extract number from end of ID only', () => {
      // The regex /\d+$/ should only match trailing digits
      expect(world.generateDefaultLabel('point2d789', 'Point2D')).toBe('A_{789}');
    });

    it('should handle scoped IDs (container/local format)', () => {
      // Scoped format: "projPlane3/point2d5"
      expect(world.generateDefaultLabel('projPlane3/point2d5', 'Point2D')).toBe('A_5');
    });

    it('should handle scoped IDs with multi-digit numbers', () => {
      // Scoped format with large number
      expect(world.generateDefaultLabel('projPlane1/line2d42', 'Line2D')).toBe('L_{42}');
    });

    it('should handle deeply nested scoped IDs', () => {
      // Even with complex scoping, extract from last part
      expect(world.generateDefaultLabel('world/projPlane2/segment2d8', 'Segment2D')).toBe('S_8');
    });
  });
});
