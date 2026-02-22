/**
 * Phase 116: Tests for World.generateDefaultLabel() with LabelGenerator
 * 
 * Validates that default labels use sequential mathematical naming:
 * - Points: A, B, C, …, Z, A_1, B_1, …
 * - Lines/Segments: r, s, t, …, z, r_1, s_1, …
 * - Circles: α, β, γ, …, ω, α_1, β_1, …
 * - Guides: g_1, g_2, …
 * - Planes: π_1, π_2, …
 * - HingeLines: LT_1, LT_2, …
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '@/domain/world/World';

describe('World.generateDefaultLabel()', () => {
  let world: World;

  beforeEach(() => {
    world = new World();
  });

  describe('Point labels (A, B, C, …)', () => {
    it('should produce A for the first point', () => {
      expect(world.generateDefaultLabel('point2d1', 'Point2D')).toBe('A');
    });

    it('should produce B, C for subsequent points', () => {
      world.generateDefaultLabel('point2d1', 'Point2D'); // A
      expect(world.generateDefaultLabel('point2d2', 'Point2D')).toBe('B');
      expect(world.generateDefaultLabel('point2d3', 'Point2D')).toBe('C');
    });

    it('should share sequence between Point2D and Point3D', () => {
      expect(world.generateDefaultLabel('point2d1', 'Point2D')).toBe('A');
      expect(world.generateDefaultLabel('point3d1', 'Point3D')).toBe('B');
      expect(world.generateDefaultLabel('point2d2', 'Point2D')).toBe('C');
    });

    it('should wrap with subscripts after Z', () => {
      // Exhaust A-Z (26 labels)
      for (let i = 0; i < 26; i++) {
        world.generateDefaultLabel(`point2d${i}`, 'Point2D');
      }
      // 27th should be A_1
      expect(world.generateDefaultLabel('point2d26', 'Point2D')).toBe('A_1');
      expect(world.generateDefaultLabel('point2d27', 'Point2D')).toBe('B_1');
    });

    it('should use braces for multi-digit subscripts', () => {
      // Exhaust first 26*10 = 260 labels (cycles 0-9)
      for (let i = 0; i < 260; i++) {
        world.generateDefaultLabel(`point2d${i}`, 'Point2D');
      }
      // Next should be A_{10}
      expect(world.generateDefaultLabel('point2d260', 'Point2D')).toBe('A_{10}');
    });
  });

  describe('Line labels (r, s, t, …)', () => {
    it('should produce r for the first line', () => {
      expect(world.generateDefaultLabel('line2d1', 'Line2D')).toBe('r');
    });

    it('should produce s, t for subsequent lines', () => {
      world.generateDefaultLabel('line2d1', 'Line2D');
      expect(world.generateDefaultLabel('line2d2', 'Line2D')).toBe('s');
      expect(world.generateDefaultLabel('line2d3', 'Line2D')).toBe('t');
    });

    it('should share sequence between Line2D and Line3D', () => {
      expect(world.generateDefaultLabel('line2d1', 'Line2D')).toBe('r');
      expect(world.generateDefaultLabel('line3d1', 'Line3D')).toBe('s');
    });

    it('should share sequence between lines and segments', () => {
      expect(world.generateDefaultLabel('line2d1', 'Line2D')).toBe('r');
      expect(world.generateDefaultLabel('segment2d1', 'Segment2D')).toBe('s');
      expect(world.generateDefaultLabel('segment3d1', 'Segment3D')).toBe('t');
    });

    it('should wrap with subscripts after z', () => {
      // Exhaust r-z (9 labels)
      for (let i = 0; i < 9; i++) {
        world.generateDefaultLabel(`line2d${i}`, 'Line2D');
      }
      // 10th should be r_1
      expect(world.generateDefaultLabel('line2d9', 'Line2D')).toBe('r_1');
    });
  });

  describe('Circle labels (α, β, γ, …)', () => {
    it('should produce α for the first circle', () => {
      expect(world.generateDefaultLabel('circle2d1', 'Circle2D')).toBe('α');
    });

    it('should produce β, γ for subsequent circles', () => {
      world.generateDefaultLabel('circle2d1', 'Circle2D');
      expect(world.generateDefaultLabel('circle2d2', 'Circle2D')).toBe('β');
      expect(world.generateDefaultLabel('circle2d3', 'Circle2D')).toBe('γ');
    });

    it('should wrap with subscripts after ω', () => {
      // Exhaust all Greek letters (24 in CIRCLE_BASES)
      for (let i = 0; i < 24; i++) {
        world.generateDefaultLabel(`circle2d${i}`, 'Circle2D');
      }
      expect(world.generateDefaultLabel('circle2d23', 'Circle2D')).toBe('α_1');
    });
  });

  describe('Guide labels (g_1, g_2, …)', () => {
    it('should produce g_1 for the first guide', () => {
      expect(world.generateDefaultLabel('guide2d1', 'Guide2D')).toBe('g_1');
    });

    it('should produce g_2, g_3 for subsequent guides', () => {
      world.generateDefaultLabel('guide2d1', 'Guide2D');
      expect(world.generateDefaultLabel('guide2d2', 'Guide2D')).toBe('g_2');
      expect(world.generateDefaultLabel('guide2d3', 'Guide2D')).toBe('g_3');
    });

    it('should use braces for multi-digit guide subscripts', () => {
      for (let i = 0; i < 9; i++) {
        world.generateDefaultLabel(`guide2d${i}`, 'Guide2D');
      }
      expect(world.generateDefaultLabel('guide2d9', 'Guide2D')).toBe('g_{10}');
    });
  });

  describe('Plane labels (π_1, π_2, …)', () => {
    it('should produce π_1 for Plane3D', () => {
      expect(world.generateDefaultLabel('plane3d1', 'Plane3D')).toBe('π_1');
    });

    it('should share sequence between Plane3D and ProjectionPlane', () => {
      expect(world.generateDefaultLabel('plane3d1', 'Plane3D')).toBe('π_1');
      expect(world.generateDefaultLabel('projPlane1', 'ProjectionPlane')).toBe('π_2');
    });
  });

  describe('HingeLine labels (LT_1, LT_2, …)', () => {
    it('should produce LT_1 for HingeLine', () => {
      expect(world.generateDefaultLabel('hingeLine1', 'HingeLine')).toBe('LT_1');
    });

    it('should share sequence across hinge types', () => {
      expect(world.generateDefaultLabel('hingeLine1', 'HingeLine')).toBe('LT_1');
      expect(world.generateDefaultLabel('brokenHingeLine1', 'BrokenHingeLine')).toBe('LT_2');
      expect(world.generateDefaultLabel('halfHingeLine1', 'HalfHingeLine')).toBe('LT_3');
    });
  });

  describe('Error handling', () => {
    it('should throw error for unknown element type', () => {
      expect(() => {
        world.generateDefaultLabel('point2d5', 'UnknownType');
      }).toThrow('Unknown element type for labeling: UnknownType');
    });
  });

  describe('Counter is forward-only (undo-safe)', () => {
    it('should not reuse labels for the same type', () => {
      const labels = new Set<string>();
      for (let i = 0; i < 50; i++) {
        const label = world.generateDefaultLabel(`point2d${i}`, 'Point2D');
        expect(labels.has(label)).toBe(false);
        labels.add(label);
      }
    });

    it('should produce unique labels across element types that share counters', () => {
      const l1 = world.generateDefaultLabel('line2d1', 'Line2D');
      const l2 = world.generateDefaultLabel('segment2d1', 'Segment2D');
      expect(l1).not.toBe(l2);
    });
  });

  describe('Element ID is ignored (only counter matters)', () => {
    it('should produce same sequence regardless of element IDs', () => {
      expect(world.generateDefaultLabel('point2d999', 'Point2D')).toBe('A');
      expect(world.generateDefaultLabel('point2d1', 'Point2D')).toBe('B');
      expect(world.generateDefaultLabel('randomId', 'Point2D')).toBe('C');
    });
  });
});
