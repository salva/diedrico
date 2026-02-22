/**
 * Phase 116: Tests for LabelGenerator
 * 
 * Validates sequential mathematical naming for all element categories.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LabelGenerator } from '@/domain/world/LabelGenerator';

describe('LabelGenerator', () => {
  let gen: LabelGenerator;

  beforeEach(() => {
    gen = new LabelGenerator();
  });

  describe('Point labels (A-Z, then A_1, B_1, ...)', () => {
    it('should produce A, B, C for the first three points', () => {
      expect(gen.next('Point2D')).toBe('A');
      expect(gen.next('Point2D')).toBe('B');
      expect(gen.next('Point2D')).toBe('C');
    });

    it('should produce Z as the 26th label', () => {
      for (let i = 0; i < 25; i++) gen.next('Point2D');
      expect(gen.next('Point2D')).toBe('Z');
    });

    it('should wrap to A_1 after Z', () => {
      for (let i = 0; i < 26; i++) gen.next('Point2D');
      expect(gen.next('Point2D')).toBe('A_1');
      expect(gen.next('Point2D')).toBe('B_1');
    });

    it('should share counter between Point2D and Point3D', () => {
      expect(gen.next('Point2D')).toBe('A');
      expect(gen.next('Point3D')).toBe('B');
      expect(gen.next('Point2D')).toBe('C');
    });

    it('should use braces for subscripts >= 10', () => {
      // 26 * 10 = 260 labels to exhaust cycles 0-9
      for (let i = 0; i < 260; i++) gen.next('Point2D');
      expect(gen.next('Point2D')).toBe('A_{10}');
    });
  });

  describe('Line labels (r-z, then r_1, s_1, ...)', () => {
    it('should produce r, s, t for the first three lines', () => {
      expect(gen.next('Line2D')).toBe('r');
      expect(gen.next('Line2D')).toBe('s');
      expect(gen.next('Line2D')).toBe('t');
    });

    it('should produce z as the 9th label', () => {
      for (let i = 0; i < 8; i++) gen.next('Line2D');
      expect(gen.next('Line2D')).toBe('z');
    });

    it('should wrap to r_1 after z', () => {
      for (let i = 0; i < 9; i++) gen.next('Line2D');
      expect(gen.next('Line2D')).toBe('r_1');
    });

    it('should share counter between Line2D, Line3D, Segment2D, Segment3D', () => {
      expect(gen.next('Line2D')).toBe('r');
      expect(gen.next('Line3D')).toBe('s');
      expect(gen.next('Segment2D')).toBe('t');
      expect(gen.next('Segment3D')).toBe('u');
    });
  });

  describe('Circle labels (α-ω, then α_1, β_1, ...)', () => {
    it('should produce α, β, γ for the first three circles', () => {
      expect(gen.next('Circle2D')).toBe('α');
      expect(gen.next('Circle2D')).toBe('β');
      expect(gen.next('Circle2D')).toBe('γ');
    });

    it('should wrap with subscripts after exhausting Greek letters', () => {
      const greekCount = 24; // α through ω
      for (let i = 0; i < greekCount; i++) gen.next('Circle2D');
      expect(gen.next('Circle2D')).toBe('α_1');
    });
  });

  describe('Guide labels (g_1, g_2, ...)', () => {
    it('should produce g_1, g_2, g_3', () => {
      expect(gen.next('Guide2D')).toBe('g_1');
      expect(gen.next('Guide2D')).toBe('g_2');
      expect(gen.next('Guide2D')).toBe('g_3');
    });

    it('should use braces for subscripts >= 10', () => {
      for (let i = 0; i < 9; i++) gen.next('Guide2D');
      expect(gen.next('Guide2D')).toBe('g_{10}');
    });
  });

  describe('Plane labels (π_1, π_2, ...)', () => {
    it('should produce π_1, π_2', () => {
      expect(gen.next('Plane3D')).toBe('π_1');
      expect(gen.next('ProjectionPlane')).toBe('π_2');
    });
  });

  describe('HingeLine labels (LT_1, LT_2, ...)', () => {
    it('should produce LT_1, LT_2, LT_3 across hinge types', () => {
      expect(gen.next('HingeLine')).toBe('LT_1');
      expect(gen.next('BrokenHingeLine')).toBe('LT_2');
      expect(gen.next('HalfHingeLine')).toBe('LT_3');
    });
  });

  describe('Error handling', () => {
    it('should throw for unknown element type', () => {
      expect(() => gen.next('UnknownType')).toThrow('Unknown element type for labeling');
    });
  });

  describe('Counter management', () => {
    it('should track counters per category', () => {
      gen.next('Point2D');
      gen.next('Point2D');
      expect(gen.getCount('Point2D')).toBe(2);
      expect(gen.getCount('Line2D')).toBe(0);
    });

    it('setCount should only allow forward movement', () => {
      gen.next('Point2D'); // count = 1
      gen.next('Point2D'); // count = 2
      gen.setCount('Point2D', 1); // try to go back
      expect(gen.getCount('Point2D')).toBe(2); // unchanged
      gen.setCount('Point2D', 5); // forward
      expect(gen.getCount('Point2D')).toBe(5);
    });

    it('reset should clear all counters', () => {
      gen.next('Point2D');
      gen.next('Line2D');
      gen.reset();
      expect(gen.next('Point2D')).toBe('A');
      expect(gen.next('Line2D')).toBe('r');
    });

    it('should produce unique labels for 100 consecutive points', () => {
      const labels = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const label = gen.next('Point2D');
        expect(labels.has(label)).toBe(false);
        labels.add(label);
      }
      expect(labels.size).toBe(100);
    });
  });
});
