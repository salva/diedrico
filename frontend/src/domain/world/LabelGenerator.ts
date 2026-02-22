/**
 * LabelGenerator — Sequential mathematical naming for geometric elements
 * 
 * Produces human-friendly labels following mathematical conventions:
 * - Points: A, B, C, …, Z, A₁, B₁, …, Z₁, A₂, …
 * - Lines: r, s, t, …, z, r₁, s₁, …, z₁, r₂, …
 * - Segments: same as lines (shared sequence)
 * - Circles: α, β, γ, …, ω, α₁, β₁, …
 * - Guides: g₁, g₂, g₃, …
 * - Planes: π₁, π₂, π₃, …
 * - HingeLine/BrokenHingeLine/HalfHingeLine: LT₁, LT₂, …
 * 
 * Labels use KaTeX subscript notation (e.g., A_{12}).
 * Counters are forward-only — undo does not reclaim labels.
 */

const POINT_BASES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const LINE_BASES = 'rstuvwxyz'.split('');
const CIRCLE_BASES = 'αβγδεζηθικλμνξοπρστυφχψω'.split('');

type ElementCategory = 'point' | 'line' | 'circle' | 'guide' | 'plane' | 'hinge';

function categoryForType(elementType: string): ElementCategory {
  switch (elementType) {
    case 'Point2D':
    case 'Point3D':
      return 'point';
    case 'Line2D':
    case 'Line3D':
    case 'Segment2D':
    case 'Segment3D':
      return 'line';
    case 'Circle2D':
      return 'circle';
    case 'Guide2D':
      return 'guide';
    case 'Plane3D':
    case 'ProjectionPlane':
      return 'plane';
    case 'HingeLine':
    case 'BrokenHingeLine':
    case 'HalfHingeLine':
      return 'hinge';
    default:
      throw new Error(`Unknown element type for labeling: ${elementType}`);
  }
}

function basesForCategory(category: ElementCategory): string[] | null {
  switch (category) {
    case 'point': return POINT_BASES;
    case 'line': return LINE_BASES;
    case 'circle': return CIRCLE_BASES;
    default: return null; // guide, plane, hinge use numeric subscripts only
  }
}

function prefixForCategory(category: ElementCategory): string {
  switch (category) {
    case 'point': return ''; // will use A, B, C directly
    case 'line': return '';  // will use r, s, t directly
    case 'circle': return ''; // will use α, β, γ directly
    case 'guide': return 'g';
    case 'plane': return 'π';
    case 'hinge': return 'LT';
  }
}

/**
 * Format a KaTeX subscript label.
 * - No subscript when cycle is 0 and bases exist: just "A"
 * - With subscript: "A_1" or "A_{12}" for multi-digit
 */
function formatLabel(base: string, subscript: number | null): string {
  if (subscript === null) return base;
  if (subscript <= 9) return `${base}_${subscript}`;
  return `${base}_{${subscript}}`;
}

export class LabelGenerator {
  /** Per-category counters (forward-only, never decremented) */
  private counters = new Map<ElementCategory, number>();

  constructor() {
    this.reset();
  }

  /** Reset all counters to 0 */
  reset(): void {
    this.counters.set('point', 0);
    this.counters.set('line', 0);
    this.counters.set('circle', 0);
    this.counters.set('guide', 0);
    this.counters.set('plane', 0);
    this.counters.set('hinge', 0);
  }

  /**
   * Generate the next label for the given element type.
   * Counter advances and never goes back (undo-safe).
   */
  next(elementType: string): string {
    const category = categoryForType(elementType);
    const count = this.counters.get(category)!;
    this.counters.set(category, count + 1);

    const bases = basesForCategory(category);
    if (bases) {
      // Cycle through base characters, then add subscripts
      const index = count % bases.length;
      const cycle = Math.floor(count / bases.length);
      const base = bases[index];
      return formatLabel(base, cycle === 0 ? null : cycle);
    } else {
      // Numeric-only: g_1, g_2, π_1, LT_1, ...
      const prefix = prefixForCategory(category);
      return formatLabel(prefix, count + 1);
    }
  }

  /**
   * Get current counter value for a category (for serialization/testing).
   */
  getCount(elementType: string): number {
    const category = categoryForType(elementType);
    return this.counters.get(category) ?? 0;
  }

  /**
   * Restore counter to a specific value (for deserialization).
   * Only allows setting to values >= current (forward-only).
   */
  setCount(elementType: string, value: number): void {
    const category = categoryForType(elementType);
    const current = this.counters.get(category) ?? 0;
    if (value >= current) {
      this.counters.set(category, value);
    }
  }
}
