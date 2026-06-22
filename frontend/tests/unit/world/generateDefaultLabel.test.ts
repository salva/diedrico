/**
 * Phase 116: Tests for LabelGenerator
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
import { LabelGenerator } from '@/domain/world/LabelGenerator';

describe('LabelGenerator', () => {
  let labelGenerator: LabelGenerator;

  beforeEach(() => {
    labelGenerator = new LabelGenerator();
  });

  describe('Point labels (A, B, C, …)', () => {
    it('should produce A for the first point', () => {
      expect(labelGenerator.next('Point2D')).toBe('A');
    });

    it('should produce B, C for subsequent points', () => {
      labelGenerator.next('Point2D'); // A
      expect(labelGenerator.next('Point2D')).toBe('B');
      expect(labelGenerator.next('Point2D')).toBe('C');
    });

    it('should share sequence between Point2D and Point3D', () => {
      expect(labelGenerator.next('Point2D')).toBe('A');
      expect(labelGenerator.next('Point3D')).toBe('B');
      expect(labelGenerator.next('Point2D')).toBe('C');
    });

    it('should wrap with subscripts after Z', () => {
      // Exhaust A-Z (26 labels)
      for (let i = 0; i < 26; i++) {
        labelGenerator.next('Point2D');
      }
      // 27th should be A_1
      expect(labelGenerator.next('Point2D')).toBe('A_1');
      expect(labelGenerator.next('Point2D')).toBe('B_1');
    });

    it('should use braces for multi-digit subscripts', () => {
      // Exhaust first 26*10 = 260 labels (cycles 0-9)
      for (let i = 0; i < 260; i++) {
        labelGenerator.next('Point2D');
      }
      // Next should be A_{10}
      expect(labelGenerator.next('Point2D')).toBe('A_{10}');
    });
  });

  describe('Line labels (r, s, t, …)', () => {
    it('should produce r for the first line', () => {
      expect(labelGenerator.next('Line2D')).toBe('r');
    });

    it('should produce s, t for subsequent lines', () => {
      labelGenerator.next('Line2D');
      expect(labelGenerator.next('Line2D')).toBe('s');
      expect(labelGenerator.next('Line2D')).toBe('t');
    });

    it('should share sequence between Line2D and Line3D', () => {
      expect(labelGenerator.next('Line2D')).toBe('r');
      expect(labelGenerator.next('Line3D')).toBe('s');
    });

    it('should share sequence between lines and segments', () => {
      expect(labelGenerator.next('Line2D')).toBe('r');
      expect(labelGenerator.next('Segment2D')).toBe('s');
      expect(labelGenerator.next('Segment3D')).toBe('t');
    });

    it('should wrap with subscripts after z', () => {
      // Exhaust r-z (9 labels)
      for (let i = 0; i < 9; i++) {
        labelGenerator.next('Line2D');
      }
      // 10th should be r_1
      expect(labelGenerator.next('Line2D')).toBe('r_1');
    });
  });

  describe('Circle labels (α, β, γ, …)', () => {
    it('should produce α for the first circle', () => {
      expect(labelGenerator.next('Circle2D')).toBe('α');
    });

    it('should produce β, γ for subsequent circles', () => {
      labelGenerator.next('Circle2D');
      expect(labelGenerator.next('Circle2D')).toBe('β');
      expect(labelGenerator.next('Circle2D')).toBe('γ');
    });

    it('should wrap with subscripts after ω', () => {
      // Exhaust all Greek letters (24 in CIRCLE_BASES)
      for (let i = 0; i < 24; i++) {
        labelGenerator.next('Circle2D');
      }
      expect(labelGenerator.next('Circle2D')).toBe('α_1');
    });
  });

  describe('Guide labels (g_1, g_2, …)', () => {
    it('should produce g_1 for the first guide', () => {
      expect(labelGenerator.next('Guide2D')).toBe('g_1');
    });

    it('should produce g_2, g_3 for subsequent guides', () => {
      labelGenerator.next('Guide2D');
      expect(labelGenerator.next('Guide2D')).toBe('g_2');
      expect(labelGenerator.next('Guide2D')).toBe('g_3');
    });

    it('should use braces for multi-digit guide subscripts', () => {
      for (let i = 0; i < 9; i++) {
        labelGenerator.next('Guide2D');
      }
      expect(labelGenerator.next('Guide2D')).toBe('g_{10}');
    });
  });

  describe('Plane labels (π_1, π_2, …)', () => {
    it('should produce π_1 for Plane3D', () => {
      expect(labelGenerator.next('Plane3D')).toBe('π_1');
    });

    it('should share sequence between Plane3D and ProjectionPlane', () => {
      expect(labelGenerator.next('Plane3D')).toBe('π_1');
      expect(labelGenerator.next('ProjectionPlane')).toBe('π_2');
    });
  });

  describe('HingeLine labels (LT_1, LT_2, …)', () => {
    it('should produce LT_1 for HingeLine', () => {
      expect(labelGenerator.next('HingeLine')).toBe('LT_1');
    });

    it('should share sequence across hinge types', () => {
      expect(labelGenerator.next('HingeLine')).toBe('LT_1');
      expect(labelGenerator.next('BrokenHingeLine')).toBe('LT_2');
      expect(labelGenerator.next('HalfHingeLine')).toBe('LT_3');
    });
  });

  describe('Error handling', () => {
    it('should throw error for unknown element type', () => {
      expect(() => {
        labelGenerator.next('UnknownType');
      }).toThrow('Unknown element type for labeling: UnknownType');
    });
  });

  describe('Counter is forward-only (undo-safe)', () => {
    it('should not reuse labels for the same type', () => {
      const labels = new Set<string>();
      for (let i = 0; i < 50; i++) {
        const label = labelGenerator.next('Point2D');
        expect(labels.has(label)).toBe(false);
        labels.add(label);
      }
    });

    it('should produce unique labels across element types that share counters', () => {
      const l1 = labelGenerator.next('Line2D');
      const l2 = labelGenerator.next('Segment2D');
      expect(l1).not.toBe(l2);
    });
  });

  describe('Element ID is ignored (only counter matters)', () => {
    it('should produce same sequence regardless of element IDs', () => {
      expect(labelGenerator.next('Point2D')).toBe('A');
      expect(labelGenerator.next('Point2D')).toBe('B');
      expect(labelGenerator.next('Point2D')).toBe('C');
    });
  });
});
