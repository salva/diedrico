/**
 * SelectionMask.ts - Class-based selection filtering architecture (Phase 63)
 * 
 * Provides type-safe, composable selection masks for tool-specific filtering.
 * Replaces string-based system with polymorphic class hierarchy.
 * 
 * Reference: data-model.md §Class-Based Selection Mask Architecture (Phase 63)
 */

import type { Element2D } from '@/domain/world/Element2D';
import { Point2D } from '@/domain/world/Point';
import { Line2D } from '@/domain/world/Line';
import { Circle2D } from '@/domain/world/Circle';
import { Guide2D } from '@/domain/world/Guide';
import { SiblingGuide2D } from '@/domain/world/Guide';
import { Segment2DByPoints } from '@/domain/world/Segment';
import { HalfHingeLine2D } from '@/domain/world/HingeLine';

/**
 * Element types that can be matched by selection masks.
 * Maps to domain class hierarchy (Point2D, Line2D, Circle2D).
 */
export type SelectableElementType = 
  | 'point'           // Any Point2D (free, intersection, on-element)
  | 'line'            // Regular lines only (excludes segments/guides/half-hinge-lines)
  | 'segment'         // Specifically Segment2DByPoints only
  | 'guide'           // Specifically Guide2D/SiblingGuide2D only
  | 'half-hinge-line' // Specifically HalfHingeLine2D only
  | 'circle';         // Any Circle2D

/**
 * Map domain element to its SelectableElementType using class hierarchy
 * 
 * Phase 63: Uses instanceof checks to leverage TypeScript class hierarchy.
 * Order matters - checks most specific classes first, then falls back to base classes.
 * This automatically handles all subclasses (e.g., Line2DPerpendicular extends Line2D).
 * 
 * @param element - Domain element (Point2D, Line2D, etc.)
 * @returns SelectableElementType for selection mask matching
 */
export function getSelectableType(element: Element2D): SelectableElementType {
  // Check most specific line types first (order matters!)
  if (element instanceof Guide2D || element instanceof SiblingGuide2D) {
    return 'guide';
  }
  if (element instanceof HalfHingeLine2D) {
    return 'half-hinge-line';
  }
  if (element instanceof Segment2DByPoints) {
    return 'segment';
  }
  
  // Base types (catch all remaining subclasses)
  if (element instanceof Point2D) {
    return 'point';
  }
  if (element instanceof Line2D) {
    return 'line';  // Catches Line2DByTwoPoints, Line2DPerpendicular, Line2DParallel, etc.
  }
  if (element instanceof Circle2D) {
    return 'circle';
  }
  
  // Fallback (should never reach here with valid Element2D)
  console.warn('[getSelectableType] Unknown element type:', element.constructor.name);
  return 'point';
}

/**
 * Abstract base class for all selection masks
 * 
 * Selection masks determine which element types can be selected/hit-tested by tools.
 * Concrete implementations provide different matching strategies via polymorphic matches() method.
 * 
 * Usage:
 * ```typescript
 * const mask = SelectionMask.union(
 *   SelectionMask.point(),
 *   SelectionMask.anyLine()
 * );
 * 
 * if (mask.matches(elementType)) {
 *   // Element is selectable
 * }
 * ```
 */
export abstract class SelectionMask {
  /**
   * Check if given element type matches this mask's criteria
   * @param elementType - Type returned by Paper.getElementType()
   * @returns true if element type matches, false otherwise
   */
  abstract matches(elementType: SelectableElementType): boolean;

  /**
   * Get human-readable description of mask (for debugging)
   */
  abstract toString(): string;

  // === Factory Methods for Common Patterns ===
  
  /**
   * Create mask matching only points
   */
  static point(): TypeMask {
    return new TypeMask('point');
  }
  
  /**
   * Create mask matching only regular lines (excludes segments/guides/half-hinge-lines)
   */
  static line(): TypeMask {
    return new TypeMask('line');
  }
  
  /**
   * Create mask matching only segments
   */
  static segment(): TypeMask {
    return new TypeMask('segment');
  }
  
  /**
   * Create mask matching only guides
   */
  static guide(): TypeMask {
    return new TypeMask('guide');
  }
  
  /**
   * Create mask matching only circles
   */
  static circle(): TypeMask {
    return new TypeMask('circle');
  }
  
  /**
   * Create mask matching only half-hinge-lines
   */
  static halfHingeLine(): TypeMask {
    return new TypeMask('half-hinge-line');
  }
  
  /**
   * Create mask that matches nothing (for tools that don't select existing elements)
   * Use this for tools like PointTool that only create new elements.
   */
  static none(): NoneMask {
    return new NoneMask();
  }
  
  /**
   * Create mask matching any Line2D subtype
   * Phase 63: All Line2D subclasses (perpendicular, parallel, by-two-points) map to 'line',
   * plus specialized line types (segment, guide, half-hinge-line)
   */
  static anyLine(): HierarchyMask {
    return new HierarchyMask('line', ['segment', 'guide', 'half-hinge-line']);
  }
  
  /**
   * Create mask matching any of the provided masks (logical OR)
   * @param masks - Array of masks to combine
   * @returns UnionMask that matches if any child mask matches
   * @throws Error if no masks provided (ambiguous: use SelectionMask.none() explicitly for "match nothing")
   */
  static union(...masks: SelectionMask[]): SelectionMask {
    if (masks.length === 0) {
      throw new Error('union() requires at least one mask');
    }
    if (masks.length === 1) {
      return masks[0]; // Optimize single-element case
    }
    return new UnionMask(masks);
  }
  
  /**
   * Create mask matching all of the provided masks (logical AND)
   * @param masks - Array of masks that must all match
   * @returns IntersectionMask that matches only if all child masks match
   */
  static intersection(...masks: SelectionMask[]): SelectionMask {
    if (masks.length === 0) {
      throw new Error('intersection() requires at least one mask');
    }
    if (masks.length === 1) {
      return masks[0]; // Optimize single-element case
    }
    return new IntersectionMask(masks);
  }
}

/**
 * Matches nothing - for tools that don't select existing elements
 * 
 * Use this for tools that only create new elements (e.g., PointTool creates free points,
 * doesn't select existing points).
 * 
 * When NoneMask is used:
 * - Paper.hitTest() returns null (no element selected)
 * - ToolContext.planeCoords still contains the click position
 * - Tool uses the position to create new elements at clicked location
 * 
 * Example:
 * - \"No selection allowed\": none()
 */
export class NoneMask extends SelectionMask {
  matches(_elementType: SelectableElementType): boolean {
    return false; // Never matches anything - ensures hitTest returns null
  }

  toString(): string {
    return 'None';
  }
}

/**
 * Matches single exact element type
 * Replaces simple string literals: 'point', 'line', 'circle'
 * 
 * Example: TypeMask('point') matches only 'point', not derived types
 */
export class TypeMask extends SelectionMask {
  constructor(private readonly type: SelectableElementType) {
    super();
  }

  matches(elementType: SelectableElementType): boolean {
    return elementType === this.type;
  }

  toString(): string {
    return `Type(${this.type})`;
  }

  /**
   * Get the exact type this mask matches
   */
  getType(): SelectableElementType {
    return this.type;
  }
}

/**
 * Matches type and all its subtypes in domain hierarchy
 * Replaces 'any-line' string from Phase 62
 * 
 * Example: HierarchyMask('line', ['segment', 'guide', 'half-hinge-line'])
 * matches 'line', 'segment', 'guide', 'half-hinge-line'
 */
export class HierarchyMask extends SelectionMask {
  private readonly allTypes: Set<SelectableElementType>;

  constructor(
    private readonly baseType: SelectableElementType,
    private readonly subtypes: SelectableElementType[]
  ) {
    super();
    this.allTypes = new Set([baseType, ...subtypes]);
  }

  matches(elementType: SelectableElementType): boolean {
    return this.allTypes.has(elementType);
  }

  toString(): string {
    return `Hierarchy(${this.baseType} + [${this.subtypes.join(', ')}])`;
  }

  /**
   * Get the base type of this hierarchy
   */
  getBaseType(): SelectableElementType {
    return this.baseType;
  }

  /**
   * Get the subtypes included in this hierarchy
   */
  getSubtypes(): readonly SelectableElementType[] {
    return this.subtypes;
  }
}

/**
 * Matches if ANY child mask matches (logical OR)
 * Replaces string arrays: ['point', 'line'] → UnionMask([TypeMask('point'), TypeMask('line')])
 * 
 * Enables complex queries:
 * - "point or any line": union(point(), anyLine())
 * - "segment or guide": union(segment(), guide())
 */
export class UnionMask extends SelectionMask {
  constructor(private readonly masks: SelectionMask[]) {
    super();
    if (masks.length === 0) {
      throw new Error('UnionMask requires at least one child mask');
    }
  }

  matches(elementType: SelectableElementType): boolean {
    // Short-circuit: return true on first match
    return this.masks.some(mask => mask.matches(elementType));
  }

  toString(): string {
    return `Union(${this.masks.map(m => m.toString()).join(' | ')})`;
  }

  /**
   * Get the child masks combined by this union
   */
  getMasks(): readonly SelectionMask[] {
    return this.masks;
  }
}

/**
 * Matches if ALL child masks match (logical AND)
 * New capability - enables complex filtering
 * 
 * Future use cases:
 * - "constructible elements only" (intersection with ConstructibleMask)
 * - "visible elements only" (intersection with VisibilityMask)
 * 
 * Note: Most practical use cases are future extensions.
 * Included for architectural completeness and symmetry with UnionMask.
 */
export class IntersectionMask extends SelectionMask {
  constructor(private readonly masks: SelectionMask[]) {
    super();
    if (masks.length === 0) {
      throw new Error('IntersectionMask requires at least one child mask');
    }
  }

  matches(elementType: SelectableElementType): boolean {
    // Short-circuit: return false on first non-match
    return this.masks.every(mask => mask.matches(elementType));
  }

  toString(): string {
    return `Intersection(${this.masks.map(m => m.toString()).join(' & ')})`;
  }

  /**
   * Get the child masks combined by this intersection
   */
  getMasks(): readonly SelectionMask[] {
    return this.masks;
  }
}

// === Type Guards ===

/**
 * Check if mask is a TypeMask
 */
export function isTypeMask(mask: SelectionMask): mask is TypeMask {
  return mask instanceof TypeMask;
}

/**
 * Check if mask is a HierarchyMask
 */
export function isHierarchyMask(mask: SelectionMask): mask is HierarchyMask {
  return mask instanceof HierarchyMask;
}

/**
 * Check if mask is a UnionMask
 */
export function isUnionMask(mask: SelectionMask): mask is UnionMask {
  return mask instanceof UnionMask;
}

/**
 * Check if mask is an IntersectionMask
 */
export function isIntersectionMask(mask: SelectionMask): mask is IntersectionMask {
  return mask instanceof IntersectionMask;
}

