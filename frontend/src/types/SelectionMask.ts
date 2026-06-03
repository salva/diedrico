/**
 * SelectionMask.ts - Class-based selection filtering architecture (Phase 63)
 * 
 * Provides type-safe, composable selection masks for tool-specific filtering.
 * Replaces string-based system with polymorphic class hierarchy.
 * 
 */

import type { Element2D } from '@/domain/world/Element2D';
import { Point2D } from '@/domain/world/Point';
import { Line2D } from '@/domain/world/Line';
import { Circle2D } from '@/domain/world/Circle';
import { Guide2D } from '@/domain/world/Guide';
import { SiblingGuide2D } from '@/domain/world/Guide';
import { Segment2DByPoints } from '@/domain/world/Segment';
import { HalfHingeLine2D } from '@/domain/world/HingeLine';
import { BrokenHalfHingeLine2D } from '@/domain/world/elements/BrokenHalfHingeLine2D';

/**
 * Element types that can be matched by selection masks.
 * Maps to domain class hierarchy (Point2D, Line2D, Circle2D).
 */
export type SelectableElementType = 
  | 'point'           // Any Point2D (free, intersection, on-element)
  | 'line'            // Line2D and all subclasses
  | 'segment'         // Specifically Segment2DByPoints only
  | 'guide'           // Specifically Guide2D/SiblingGuide2D only
  | 'half-hinge-line' // Specifically HalfHingeLine2D only
  | 'circle';         // Any Circle2D

/**
 * Map domain element to its SelectableElementType using class hierarchy
 * 
 * Phase 63: Uses instanceof checks to leverage TypeScript class hierarchy.
 * All Line2D subclasses (including Guide2D, HalfHingeLine2D) return 'line'
 * since derived classes should be selectable in any context requiring their base type.
 * 
 * @param element - Domain element (Point2D, Line2D, etc.)
 * @returns SelectableElementType for selection mask matching
 */
export function getSelectableType(element: Element2D): SelectableElementType {
  // Check specific non-line types first
  if (element instanceof Segment2DByPoints) {
    return 'segment';
  }
  
  // Base types (all subclasses match their base type)
  if (element instanceof Point2D) {
    return 'point';
  }
  if (element instanceof Line2D) {
    return 'line';  // Matches ALL Line2D subclasses: regular, perpendicular, parallel, Guide2D, HalfHingeLine2D
  }
  if (element instanceof Circle2D) {
    return 'circle';
  }
  
  return 'point';
}

/**
 * Abstract base class for all selection masks
 * 
 * Selection masks determine which element types can be selected/hit-tested by tools.
 * Uses instanceof checks directly against element classes for proper type hierarchy support.
 * 
 * Usage:
 * ```typescript
 * const mask = SelectionMask.union(
 *   SelectionMask.point(),
 *   SelectionMask.line()
 * );
 * 
 * if (mask.matches(element)) {
 *   // Element is selectable
 * }
 * ```
 */
export abstract class SelectionMask {
  /**
   * Check if given element matches this mask's criteria using instanceof
   * @param element - Domain element (Point2D, Line2D, etc.)
   * @returns true if element matches, false otherwise
   */
  abstract matches(element: Element2D): boolean;

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
   * Create mask matching all lines (including guides and half-hinge lines)
   * Since getSelectableType() returns 'line' for all Line2D subclasses,
   * this automatically includes Guide2D and HalfHingeLine2D
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
   * Create mask matching only circles
   */
  static circle(): TypeMask {
    return new TypeMask('circle');
  }
  
  /**
   * Create mask matching half-hinge-lines (including broken half-hinge-lines)
   * Uses instanceof HalfHingeLine2D which matches both HalfHingeLine2D and BrokenHalfHingeLine2D
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
  static anyLine(): TypeMask {
    return new TypeMask('line');
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
 * - CanvasInteractionQuery returns no selected element
 * - ToolContext.planeCoords still contains the click position
 * - Tool uses the position to create new elements at clicked location
 * 
 * Example:
 * - \"No selection allowed\": none()
 */
export class NoneMask extends SelectionMask {
  matches(_element: Element2D): boolean {
    return false; // Never matches anything - ensures interaction queries return no selected element
  }

  toString(): string {
    return 'None';
  }
}

/**
 * Matches element type using instanceof check
 * 
 * Example: TypeMask('line') matches Line2D and all subclasses (Guide2D, HalfHingeLine2D, etc.)
 */
export class TypeMask extends SelectionMask {
  constructor(private readonly type: SelectableElementType) {
    super();
  }

  matches(element: Element2D): boolean {
    switch (this.type) {
      case 'point':
        return element instanceof Point2D;
      case 'line':
        return element instanceof Line2D;
      case 'segment':
        return element instanceof Segment2DByPoints;
      case 'guide':
        return element instanceof Guide2D || element instanceof SiblingGuide2D;
      case 'half-hinge-line':
        // Matches both HalfHingeLine2D and BrokenHalfHingeLine2D (since BrokenHalfHingeLine2D extends HalfHingeLine2D)
        return element instanceof HalfHingeLine2D || element instanceof BrokenHalfHingeLine2D;
      case 'circle':
        return element instanceof Circle2D;
      default:
        return false;
    }
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
 * Matches if ANY child mask matches (logical OR)
 * Replaces string arrays: ['point', 'line'] → UnionMask([TypeMask('point'), TypeMask('line')])
 * 
 * Enables complex queries:
 * - "point or any line": union(point(), anyLine())
 * - "segment or circle": union(segment(), circle())
 */
export class UnionMask extends SelectionMask {
  constructor(private readonly masks: SelectionMask[]) {
    super();
    if (masks.length === 0) {
      throw new Error('UnionMask requires at least one child mask');
    }
  }

  matches(element: Element2D): boolean {
    // Short-circuit: return true on first match
    return this.masks.some(mask => mask.matches(element));
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

  matches(element: Element2D): boolean {
    // Short-circuit: return false on first non-match
    return this.masks.every(mask => mask.matches(element));
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
