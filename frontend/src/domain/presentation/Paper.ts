/**
 * Paper - Intermediate drawing representation
 * 
 * Paper provides a virtual drawing surface with primitives in a unified "paper coordinate system".
 * Each projection plane has a transformation matrix that converts from its intrinsic <u,v> space
 * to the shared paper coordinates. Paper primitives only need viewport transformation (pan/zoom)
 * to generate final SVG.
 * 
 * Architecture:
 * Domain (rules) → Realization (<u,v> geometry) → Plane transform → Paper (paper coords) → Viewport transform → SVG
 * 
 * Coordinate Systems:
 * - Plane intrinsic: <u,v> coordinates in each plane's local basis
 * - Paper: Unified 2D coordinate system where all planes are laid out
 * - Canvas: Paper coordinates after viewport transformation (pan/zoom)
 * - Screen: Final pixel coordinates for SVG rendering
 * 
 * Benefits:
 * - Multiple planes can coexist on same paper
 * - Geometry computation separate from layout and viewport
 * - Primitives cached and reused across renders
 * - Easy culling and optimization
 * 
 * @see specs/001-dihedral-learning-mvp/data-model.md#presentation-layer
 */

/**
 * Visual style attributes resolved and ready for rendering
 */
export interface ResolvedStyle {
  stroke: string;                   // Hex color for strokes
  strokeWidth: number;              // Line width in pixels
  strokeStyle: 'solid' | 'dashed' | 'dotted';
  fill: string;                     // Hex color for fills ('none' for no fill)
  opacity: number;                  // 0.0 - 1.0
  zIndex: number;                   // Within layer
}

/**
 * Render layer for z-ordering
 */
export enum RenderLayer {
  Grid = 0,           // Background grid
  Guides = 10,        // Construction guides
  Elements = 20,      // Main geometric elements
  Highlights = 30,    // Hover/selection highlights
  Handles = 40,       // Control handles
  Labels = 50,        // Text labels
}

/**
 * Base interface for all drawing primitives
 */
export interface DrawingPrimitive {
  id: string;                       // Unique ID for this primitive
  sourceEntityId?: string;          // ID of domain entity that generated this primitive
  layer: RenderLayer;               // Z-ordering layer
  visible: boolean;                 // Whether to render this primitive
  style: ResolvedStyle;             // Fully resolved visual attributes
}

/**
 * Point primitive - rendered as a circle
 * Coordinates in paper coordinate system
 */
export interface PointPrimitive extends DrawingPrimitive {
  type: 'point';
  x: number;                        // X coordinate in paper space
  y: number;                        // Y coordinate in paper space
  radius: number;                   // Display radius in pixels
}

/**
 * Path primitive - rendered as polyline or polygon
 * All coordinates in paper coordinate system
 */
export interface PathPrimitive extends DrawingPrimitive {
  type: 'path';
  points: Array<[number, number]>; // Array of [x, y] coordinates in paper space
  closed: boolean;                  // Connect last to first point?
}

/**
 * Line primitive - infinite line in parametric form (clipped to viewport bounds)
 * Parametric form: P(t) = point + t * direction
 * All coordinates in paper coordinate system
 */
export interface LinePrimitive extends DrawingPrimitive {
  type: 'line';
  point: { x: number; y: number };    // Point on the line (paper coords)
  direction: { x: number; y: number }; // Direction vector (normalized, paper coords)
}

/**
 * Circle primitive
 * Coordinates in paper coordinate system
 */
export interface CirclePrimitive extends DrawingPrimitive {
  type: 'circle';
  cx: number;                       // Center X coordinate in paper space
  cy: number;                       // Center Y coordinate in paper space
  radius: number;                   // Radius in paper space units
}

/**
 * Arc primitive
 * Coordinates in paper coordinate system
 */
export interface ArcPrimitive extends DrawingPrimitive {
  type: 'arc';
  cx: number;                       // Center X coordinate in paper space
  cy: number;                       // Center Y coordinate in paper space
  radius: number;                   // Radius in paper space units
  startAngle: number;               // Start angle in radians
  endAngle: number;                 // End angle in radians
  largeArc: boolean;                // SVG large-arc-flag
  sweep: boolean;                   // SVG sweep-flag (clockwise)
}

/**
 * Text primitive for labels
 * Coordinates in paper coordinate system
 */
export interface TextPrimitive extends DrawingPrimitive {
  type: 'text';
  x: number;                        // X coordinate in paper space
  y: number;                        // Y coordinate in paper space
  text: string;                     // Text content
  fontSize: number;                 // Font size in pixels
  anchor: 'start' | 'middle' | 'end'; // Text alignment
}

/**
 * Union type of all drawing primitives
 */
export type Primitive = 
  | PointPrimitive 
  | PathPrimitive
  | LinePrimitive
  | CirclePrimitive 
  | ArcPrimitive 
  | TextPrimitive;

/**
 * Paper - Collection of drawing primitives in unified paper coordinate system
 * 
 * Paper contains primitives from all projection planes in a shared coordinate system.
 * Each plane has a transformation matrix (stored elsewhere) that converts from
 * its intrinsic <u,v> coordinates to paper coordinates when generating primitives.
 */
export class Paper {
  private primitives: Map<string, Primitive>;
  private dirtyPrimitiveIds: Set<string>;

  constructor() {
    this.primitives = new Map();
    this.dirtyPrimitiveIds = new Set();
  }

  /**
   * Add or update a primitive
   */
  setPrimitive(primitive: Primitive): void {
    this.primitives.set(primitive.id, primitive);
    this.dirtyPrimitiveIds.add(primitive.id);
  }

  /**
   * Add or update multiple primitives
   */
  setPrimitives(primitives: Primitive[]): void {
    for (const primitive of primitives) {
      this.setPrimitive(primitive);
    }
  }

  /**
   * Remove a primitive by ID
   */
  removePrimitive(id: string): void {
    this.primitives.delete(id);
    this.dirtyPrimitiveIds.delete(id);
  }

  /**
   * Remove all primitives generated by a specific entity
   */
  removePrimitivesByEntity(entityId: string): void {
    const toRemove: string[] = [];
    for (const [id, primitive] of this.primitives) {
      if (primitive.sourceEntityId === entityId) {
        toRemove.push(id);
      }
    }
    for (const id of toRemove) {
      this.removePrimitive(id);
    }
  }

  /**
   * Get a primitive by ID
   */
  getPrimitive(id: string): Primitive | undefined {
    return this.primitives.get(id);
  }

  /**
   * Get all primitives, optionally filtered by visibility and layer
   */
  getPrimitives(options?: {
    visibleOnly?: boolean;
    layers?: RenderLayer[];
  }): Primitive[] {
    let result = Array.from(this.primitives.values());

    if (options?.visibleOnly) {
      result = result.filter(p => p.visible);
    }

    if (options?.layers && options.layers.length > 0) {
      const layerSet = new Set(options.layers);
      result = result.filter(p => layerSet.has(p.layer));
    }

    // Sort by layer, then z-index
    result.sort((a, b) => {
      if (a.layer !== b.layer) {
        return a.layer - b.layer;
      }
      return a.style.zIndex - b.style.zIndex;
    });

    return result;
  }

  /**
   * Get primitives that need re-rendering
   */
  getDirtyPrimitives(): Primitive[] {
    const result: Primitive[] = [];
    for (const id of this.dirtyPrimitiveIds) {
      const primitive = this.primitives.get(id);
      if (primitive) {
        result.push(primitive);
      }
    }
    return result;
  }

  /**
   * Clear dirty flags
   */
  clearDirtyFlags(): void {
    this.dirtyPrimitiveIds.clear();
  }

  /**
   * Clear all primitives
   */
  clear(): void {
    this.primitives.clear();
    this.dirtyPrimitiveIds.clear();
  }

  /**
   * Get count of primitives
   */
  get size(): number {
    return this.primitives.size;
  }

  /**
   * Check if paper has any dirty primitives
   */
  get isDirty(): boolean {
    return this.dirtyPrimitiveIds.size > 0;
  }
}
