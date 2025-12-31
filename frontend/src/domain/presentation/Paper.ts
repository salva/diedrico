/**
 * Paper - Intermediate drawing representation and spatial query engine
 * 
 * Paper provides a virtual drawing surface with primitives in a unified "paper coordinate system".
 * Each projection plane has a transformation matrix that converts from its intrinsic <u,v> space
 * to the shared paper coordinates. Paper primitives only need viewport transformation (pan/zoom)
 * to generate final SVG.
 * 
 * Architecture:
 * Domain (rules) → Realization (<u,v> geometry) → Plane transform → Paper (paper coords) → Viewport transform → SVG
 * 
 * IMPORTANT: All coordinates are stored as Vector3 (homogeneous) throughout the pipeline.
 * Only SVGRenderer extracts .x and .y components when generating final SVG attributes.
 * 
 * Coordinate Systems (all homogeneous):
 * - Plane intrinsic: Vector3(u, v, 1) in each plane's local basis
 * - Paper: Vector3(x, y, 1) in unified 2D coordinate system where all planes are laid out
 * - Canvas: Vector3(x, y, 1) in paper coordinates after viewport transformation (pan/zoom)
 * - Screen: Final pixel coordinates for SVG rendering
 * 
 * Spatial Query Services:
 * - Hit testing: Find elements near click position with proper coordinate transforms
 * - Hover detection: Track which element is under cursor for visual feedback
 * 
 * Benefits:
 * - Multiple planes can coexist on same paper
 * - Geometry computation separate from layout and viewport
 * - Primitives cached and reused across renders
 * - Easy culling and optimization
 * - Centralized spatial queries with correct coordinate space handling
 * 
 * @see specs/001-dihedral-learning-mvp/data-model.md#presentation-layer
 * @see specs/001-dihedral-learning-mvp/data-model.md#paper-layer-spatial-query-engine
 */

import { Vector3, Matrix3 } from 'three';

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
  position: Vector3;                // Position in paper space (homogeneous coordinates)
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
  point: Vector3;                     // Point on the line (paper coords, homogeneous)
  direction: Vector3;                 // Direction vector (paper coords, homogeneous)
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
 * Viewport transformation parameters for canvas rendering
 */
export interface ViewportTransform {
  zoom: number;                     // Zoom level (1.0 = 100%)
  panX: number;                     // Pan offset X in paper space
  panY: number;                     // Pan offset Y in paper space
}

/**
 * Result of a hit test query
 * Contains element identification and distance information
 */
export interface HitResult {
  elementId: string;                // Source domain element ID ("point_1", "line_2")
  elementType: string;              // "point" | "line" | "circle" | "segment"
  primitiveId: string;              // Primitive ID ("point-point_1")
  distance: number;                 // Distance in canvas pixels (for UI feedback)
  snapPoint: Vector3;               // Exact snap position (paper coordinates, homogeneous)
}

/**
 * Paper - Collection of drawing primitives in unified paper coordinate system
 * 
 * Paper contains primitives from all projection planes in a shared coordinate system.
 * Each plane has a transformation matrix (stored elsewhere) that converts from
 * its intrinsic <u,v> coordinates to paper coordinates when generating primitives.
 * 
 * Paper also serves as the spatial query engine for hit testing and hover detection,
 * applying correct coordinate transforms to handle snap radius and element proximity.
 */
export class Paper {
  private primitives: Map<string, Primitive>;
  private dirtyPrimitiveIds: Set<string>;
  private hoveredElementId?: string;
  private viewportTransform: ViewportTransform;
  private canvasToPaperMatrix: Matrix3;  // Cached inverse viewport transform matrix

  constructor() {
    this.primitives = new Map();
    this.dirtyPrimitiveIds = new Set();
    this.viewportTransform = { zoom: 1.0, panX: 0, panY: 0 };
    this.canvasToPaperMatrix = new Matrix3(); // Identity
    this.updateTransformMatrix();
  }

  /**
   * Update viewport transform for coordinate conversions
   * Must be called when viewport changes (pan/zoom)
   */
  setViewportTransform(viewport: ViewportTransform): void {
    this.viewportTransform = viewport;
    this.updateTransformMatrix();
  }

  /**
   * Build the inverse viewport transformation matrix
   * 
   * Forward transform (paper → canvas):
   *   canvas = zoom * (paper + pan)
   *   Matrices: S(zoom) * T(pan) where T applies first
   * 
   * Inverse transform (canvas → paper):
   *   paper = (canvas / zoom) - pan
   *   Matrices: T(-pan) * S(1/zoom) = (S * T)^-1
   * 
   * Result in homogeneous 2D:
   * | 1/zoom    0      -panX |
   * |   0     1/zoom  -panY |
   * |   0       0        1   |
   * 
   * CRITICAL: Three.js Matrix3.set() argument order
   * ================================================
   * Three.js stores matrices in COLUMN-MAJOR order internally (OpenGL style),
   * but set() takes arguments in ROW-MAJOR order for convenience:
   * 
   *   set(n11, n12, n13,   ← row 1
   *       n21, n22, n23,   ← row 2  
   *       n31, n32, n33)   ← row 3
   * 
   * When applyMatrix3() is called, it computes: result = M × v (column vector)
   * 
   * Verification with our matrix:
   *   | 1/z   0   -pX |   | cx |   | cx/z - pX |
   *   |  0   1/z  -pY | × | cy | = | cy/z - pY | ✓
   *   |  0    0    1  |   | 1  |   |     1     |
   */
  private updateTransformMatrix(): void {
    const s = 1 / this.viewportTransform.zoom;
    const tx = -this.viewportTransform.panX;
    const ty = -this.viewportTransform.panY;
    
    // Arguments to set() are in ROW-MAJOR order: (r1c1, r1c2, r1c3, r2c1, r2c2, r2c3, r3c1, r3c2, r3c3)
    this.canvasToPaperMatrix.set(
      s,  0,  tx,   // Row 1: [1/zoom,    0,    -panX]
      0,  s,  ty,   // Row 2: [  0,    1/zoom, -panY]
      0,  0,  1     // Row 3: [  0,      0,      1  ]
    );
  }

  /**
   * Get current viewport transform
   */
  getViewportTransform(): ViewportTransform {
    return this.viewportTransform;
  }

  /**
   * Set which element should be visually highlighted (hover feedback)
   * This triggers re-generation of primitives with hover styling
   */
  setHoveredElement(elementId: string | undefined): void {
    if (this.hoveredElementId !== elementId) {
      this.hoveredElementId = elementId;
      // Note: Caller should trigger re-render after setting hover state
    }
  }

  /**
   * Get currently hovered element ID
   */
  getHoveredElement(): string | undefined {
    return this.hoveredElementId;
  }

  /**
   * Hit test - find nearest element within snap radius
   * 
   * Uses homogeneous Vector3 coordinates for all 2D points (x, y, 1).
   * Transforms canvas position to paper space using inverse viewport,
   * then searches primitives for closest match within radius.
   * 
   * @param canvasPos - Click position in canvas coordinates (homogeneous Vector3)
   * @param snapRadiusPixels - Snap threshold in canvas pixels
   * @returns HitResult if element found within radius, null otherwise
   */
  hitTest(canvasPos: Vector3, snapRadiusPixels: number): HitResult | null {
    // Transform canvas → paper using inverse viewport
    const paperPos = this.canvasToPaper(canvasPos);
    
    // Transform snap radius from canvas pixels to paper space
    const paperRadius = snapRadiusPixels / this.viewportTransform.zoom;
    
    // Search primitives for closest within radius
    let closestHit: HitResult | null = null;
    let minDistance = paperRadius;
    
    for (const primitive of this.primitives.values()) {
      if (!primitive.visible) continue;
      
      const distance = this.distanceToPrimitive(paperPos, primitive);
      
      if (distance < minDistance) {
        const snapPoint = this.getSnapPoint(primitive, paperPos);
        closestHit = {
          elementId: primitive.sourceEntityId || primitive.id,
          elementType: primitive.type,
          primitiveId: primitive.id,
          distance: distance * this.viewportTransform.zoom, // Convert to canvas pixels
          snapPoint
        };
        minDistance = distance;
      }
    }
    
    return closestHit;
  }

  /**
   * Transform canvas coordinates to paper coordinates
   * Uses the inverse viewport transformation matrix
   * This is why we use homogeneous coordinates - matrix multiplication!
   */
  private canvasToPaper(canvasPos: Vector3): Vector3 {
    return canvasPos.clone().applyMatrix3(this.canvasToPaperMatrix);
  }

  /**
   * Calculate distance from point to primitive in paper space
   */
  private distanceToPrimitive(paperPos: Vector3, primitive: Primitive): number {
    switch (primitive.type) {
      case 'point':
        return this.distanceToPoint(paperPos, primitive as PointPrimitive);
      case 'line':
        return this.distanceToLine(paperPos, primitive as LinePrimitive);
      case 'circle':
        return this.distanceToCircle(paperPos, primitive as CirclePrimitive);
      default:
        return Infinity;
    }
  }

  /**
   * Distance from point to point primitive
   * Uses Vector3.distanceTo() - no coordinate decomposition
   */
  private distanceToPoint(pos: Vector3, primitive: PointPrimitive): number {
    return pos.distanceTo(primitive.position);
  }

  /**
   * Distance from point to infinite line (parametric form)
   * Line: P(t) = point + t * direction
   * Uses vector algebra: subtraction, dot product, scalar multiplication
   */
  private distanceToLine(pos: Vector3, primitive: LinePrimitive): number {
    const linePoint = primitive.point;
    const lineDir = primitive.direction;
    
    // Vector from line point to query point (vector subtraction)
    const toPos = pos.clone().sub(linePoint);
    
    // Project toPos onto lineDir (dot product)
    const t = toPos.dot(lineDir);
    
    // Closest point on line: point + t * direction (vector addition and scalar multiply)
    const closest = linePoint.clone().addScaledVector(lineDir, t);
    
    // Distance from pos to closest point (vector distance)
    return pos.distanceTo(closest);
  }

  /**
   * Distance from point to circle perimeter
   * Uses Vector3.distanceTo() - no coordinate decomposition
   */
  private distanceToCircle(pos: Vector3, primitive: CirclePrimitive): number {
    const center = new Vector3(primitive.cx, primitive.cy, 1);
    const distToCenter = pos.distanceTo(center);
    return Math.abs(distToCenter - primitive.radius);
  }

  /**
   * Get snap point for a primitive (where to snap to)
   * Returns point in paper coordinates
   */
  private getSnapPoint(primitive: Primitive, queryPos: Vector3): Vector3 {
    switch (primitive.type) {
      case 'point':
        // Snap to exact point position
        return (primitive as PointPrimitive).position.clone();
      
      case 'line': {
        // Snap to closest point on line using vector algebra
        const line = primitive as LinePrimitive;
        const linePoint = line.point;
        const lineDir = line.direction;
        
        // Vector from line point to query point (vector subtraction)
        const toPos = queryPos.clone().sub(linePoint);
        
        // Project onto line direction (dot product)
        const t = toPos.dot(lineDir);
        
        // Closest point: point + t * direction (vector addition)
        return linePoint.clone().addScaledVector(lineDir, t);
      }
      
      case 'circle': {
        // Snap to closest point on circle perimeter using vector algebra
        const circle = primitive as CirclePrimitive;
        const center = new Vector3(circle.cx, circle.cy, 1);
        
        // Vector from center to query point
        const toQuery = queryPos.clone().sub(center);
        const dist = toQuery.length();
        
        if (dist === 0) {
          // Query point is at center, return arbitrary point on circle (right side)
          const offset = new Vector3(circle.radius, 0, 0);
          return center.clone().add(offset);
        }
        
        // Normalize direction and scale to radius (vector operations)
        toQuery.normalize().multiplyScalar(circle.radius);
        return center.clone().add(toQuery);
      }
      
      default:
        // Fallback: return query position
        return queryPos.clone();
    }
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
