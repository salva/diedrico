/**
 * Unit tests for SelectionMask class hierarchy (Phase 63)
 * 
 * Tests the class-based selection mask architecture that replaces
 * the string-based system from Phase 62.
 */

import { describe, it, expect } from 'vitest';
import { SelectionMask } from '@/types/SelectionMask';
import { 
  isTypeMask, 
  isHierarchyMask, 
  isUnionMask, 
  isIntersectionMask 
} from '@/types/SelectionMask';

describe('SelectionMask - Phase 63 Class-Based Architecture', () => {
  
  describe('TypeMask - Exact Type Matching', () => {
    it('T1069.1: point() should match only point type', () => {
      const mask = SelectionMask.point();
      
      expect(mask.matches('point')).toBe(true);
      expect(mask.matches('line')).toBe(false);
      expect(mask.matches('segment')).toBe(false);
      expect(mask.matches('guide')).toBe(false);
      expect(mask.matches('circle')).toBe(false);
      expect(mask.matches('half-hinge-line')).toBe(false);
    });

    it('T1069.2: line() should match only line type', () => {
      const mask = SelectionMask.line();
      
      expect(mask.matches('line')).toBe(true);
      expect(mask.matches('segment')).toBe(false);
      expect(mask.matches('point')).toBe(false);
    });

    it('T1069.3: circle() should match only circle type', () => {
      const mask = SelectionMask.circle();
      
      expect(mask.matches('circle')).toBe(true);
      expect(mask.matches('point')).toBe(false);
      expect(mask.matches('line')).toBe(false);
    });

    it('T1069.4: Type guards should identify TypeMask', () => {
      const mask = SelectionMask.point();
      
      expect(isTypeMask(mask)).toBe(true);
      expect(isHierarchyMask(mask)).toBe(false);
      expect(isUnionMask(mask)).toBe(false);
      expect(isIntersectionMask(mask)).toBe(false);
    });

    it('T1069.5: toString() should return descriptive string', () => {
      expect(SelectionMask.point().toString()).toContain('point');
      expect(SelectionMask.line().toString()).toContain('line');
      expect(SelectionMask.circle().toString()).toContain('circle');
    });
  });

  describe('HierarchyMask - Type + Subtypes Matching', () => {
    it('T1070.1: anyLine() should match all Line2D subtypes', () => {
      const mask = SelectionMask.anyLine();
      
      // Should match all line types
      expect(mask.matches('line')).toBe(true);
      expect(mask.matches('segment')).toBe(true);
      expect(mask.matches('guide')).toBe(true);
      expect(mask.matches('half-hinge-line')).toBe(true);
      
      // Should NOT match non-line types
      expect(mask.matches('point')).toBe(false);
      expect(mask.matches('circle')).toBe(false);
    });

    it('T1070.2: Type guards should identify HierarchyMask', () => {
      const mask = SelectionMask.anyLine();
      
      expect(isHierarchyMask(mask)).toBe(true);
      expect(isTypeMask(mask)).toBe(false);
      expect(isUnionMask(mask)).toBe(false);
    });

    it('T1070.3: toString() should indicate hierarchical matching', () => {
      const str = SelectionMask.anyLine().toString();
      expect(str).toContain('line');
      expect(str).toContain('segment');
      expect(str).toContain('guide');
      expect(str).toContain('half-hinge-line');
    });
  });

  describe('UnionMask - OR Logic Composition', () => {
    it('T1070.4: union() should match any of its constituent masks', () => {
      const mask = SelectionMask.union(
        SelectionMask.point(),
        SelectionMask.circle()
      );
      
      expect(mask.matches('point')).toBe(true);
      expect(mask.matches('circle')).toBe(true);
      expect(mask.matches('line')).toBe(false);
      expect(mask.matches('segment')).toBe(false);
    });

    it('T1070.5: union() with anyLine should match points and all line types', () => {
      const mask = SelectionMask.union(
        SelectionMask.point(),
        SelectionMask.anyLine()
      );
      
      // Points
      expect(mask.matches('point')).toBe(true);
      
      // All line types
      expect(mask.matches('line')).toBe(true);
      expect(mask.matches('segment')).toBe(true);
      expect(mask.matches('guide')).toBe(true);
      expect(mask.matches('half-hinge-line')).toBe(true);
      
      // Not circles
      expect(mask.matches('circle')).toBe(false);
    });

    it('T1070.6: empty union() should throw error (requires at least one mask)', () => {
      expect(() => SelectionMask.union()).toThrow('union() requires at least one mask');
    });

    it('T1070.7: single-element union() should unwrap to inner mask', () => {
      const mask = SelectionMask.union(SelectionMask.point());
      
      // Should be optimized to TypeMask
      expect(isTypeMask(mask)).toBe(true);
      expect(mask.matches('point')).toBe(true);
    });

    it('T1070.8: Type guards should identify UnionMask', () => {
      const mask = SelectionMask.union(
        SelectionMask.point(),
        SelectionMask.line()
      );
      
      expect(isUnionMask(mask)).toBe(true);
      expect(isTypeMask(mask)).toBe(false);
    });

    it('T1070.9: toString() should show union of constituent masks', () => {
      const mask = SelectionMask.union(
        SelectionMask.point(),
        SelectionMask.circle()
      );
      const str = mask.toString();
      
      expect(str).toContain('point');
      expect(str).toContain('circle');
      expect(str).toContain('|'); // Union operator
    });
  });

  describe('IntersectionMask - AND Logic Composition', () => {
    it('T1070.10: intersection() should match only elements matching all masks', () => {
      // Note: This is a contrived example since element types are mutually exclusive
      // But it demonstrates the AND logic
      const mask = SelectionMask.intersection(
        SelectionMask.anyLine(),
        SelectionMask.segment()
      );
      
      // Segment matches both anyLine AND segment
      expect(mask.matches('segment')).toBe(true);
      
      // Line matches anyLine but NOT segment specifically
      expect(mask.matches('line')).toBe(false);
      
      // Point matches neither
      expect(mask.matches('point')).toBe(false);
    });

    it('T1070.11: empty intersection() should throw error (requires at least one mask)', () => {
      expect(() => SelectionMask.intersection()).toThrow('intersection() requires at least one mask');
    });

    it('T1070.12: single-element intersection() should unwrap to inner mask', () => {
      const mask = SelectionMask.intersection(SelectionMask.point());
      
      // Should be optimized to TypeMask
      expect(isTypeMask(mask)).toBe(true);
      expect(mask.matches('point')).toBe(true);
    });

    it('T1070.13: Type guards should identify IntersectionMask', () => {
      const mask = SelectionMask.intersection(
        SelectionMask.anyLine(),
        SelectionMask.segment()
      );
      
      expect(isIntersectionMask(mask)).toBe(true);
      expect(isTypeMask(mask)).toBe(false);
    });
  });

  describe('Phase 62 Compatibility - anyLine Hierarchical Matching', () => {
    it('T1071.1: anyLine() replaces Phase 62 "any-line" string', () => {
      // Phase 62: selectionMask = ['point', 'any-line']
      // Phase 63: SelectionMask.union(SelectionMask.point(), SelectionMask.anyLine())
      
      const mask = SelectionMask.union(
        SelectionMask.point(),
        SelectionMask.anyLine()
      );
      
      // Same behavior as Phase 62 'any-line'
      expect(mask.matches('point')).toBe(true);
      expect(mask.matches('line')).toBe(true);
      expect(mask.matches('segment')).toBe(true);
      expect(mask.matches('guide')).toBe(true);
      expect(mask.matches('half-hinge-line')).toBe(true);
      expect(mask.matches('circle')).toBe(false);
    });
  });

  describe('Factory Methods', () => {
    it('T1070.14: All factory methods should create proper masks', () => {
      expect(SelectionMask.point()).toBeDefined();
      expect(SelectionMask.line()).toBeDefined();
      expect(SelectionMask.segment()).toBeDefined();
      expect(SelectionMask.guide()).toBeDefined();
      expect(SelectionMask.circle()).toBeDefined();
      expect(SelectionMask.halfHingeLine()).toBeDefined();
      expect(SelectionMask.anyLine()).toBeDefined();
    });

    it('T1070.15: Factory methods should return correct types', () => {
      expect(isTypeMask(SelectionMask.point())).toBe(true);
      expect(isTypeMask(SelectionMask.line())).toBe(true);
      expect(isHierarchyMask(SelectionMask.anyLine())).toBe(true);
    });
  });
});
