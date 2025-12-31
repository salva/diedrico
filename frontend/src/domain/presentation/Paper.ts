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

import { Vector3 } from 'three';

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

  constructor() {
    this.primitives = new Map();
    this.dirtyPrimitiveIds = new Set();
    this.viewportTransform = { zoom: 1.0, panX: 0, panY: 0 };
  }

  /**
   * Update viewport transform for coordinate conversions
   * Must be called when viewport changes (pan/zoom)
   */
  setViewportTransform(viewport: ViewportTransform): void {
    this.viewportTransform = viewport;
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
   * Inverse viewport transform: (canvas - pan) / zoom → paper
   * Uses homogeneous coordinates: Vector3(x, y, 1)
   */
  private canvasToPaper(canvasPos: Vector3): Vector3 {
    return new Vector3(
      canvasPos.x / this.viewportTransform.zoom - this.viewportTransform.panX,
      canvasPos.y / this.viewportTransform.zoom - this.viewportTransform.panY,
      1  // Homogeneous coordinate
    );
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
   */
  private distanceToPoint(pos: Vector3, primitive: PointPrimitive): number {
    const dx = primitive.x - pos.x;
    const dy = primitive.y - pos.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Distance from point to infinite line (parametric form)
   * Line: P(t) = point + t * direction
   */
  private distanceToLine(pos: Vector3, primitive: LinePrimitive): number {
    const linePoint = new Vector3(primitive.point.x, primitive.point.y, 1);
    const lineDir = new Vector3(primitive.direction.x, primitive.direction.y, 0);
    
    // Vector from line point to query point
    const toPos = new Vector3(
      pos.x - linePoint.x,
      pos.y - linePoint.y,
      0  // Direction vector, no translation
    );
    
    // Project toPos onto lineDir (lineDir is normalized)
    const t = toPos.dot(lineDir);
    
    // Closest point on line: point + t * direction
    const closest = new Vector3(
      linePoint.x + t * lineDir.x,
      linePoint.y + t * lineDir.y,
      1
    );
    
    // Distance from pos to closest point
    const dx = pos.x - closest.x;
    const dy = pos.y - closest.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Distance from point to circle perimeter
   */
  private distanceToCircle(pos: Vector3, primitive: CirclePrimitive): number {
    const dx = pos.x - primitive.cx;
    const dy = pos.y - primitive.cy;
    const distToCenter = Math.sqrt(dx * dx + dy * dy);
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
        return new Vector3(
          (primitive as PointPrimitive).x,
          (primitive as PointPrimitive).y,
          1
        );
      
      case 'line': {
        // Snap to closest point on line
        const line = primitive as LinePrimitive;
        const linePoint = new Vector3(line.point.x, line.point.y, 1);
        const lineDir = new Vector3(line.direction.x, line.direction.y, 0);
        
        const toPos = new Vector3(
          queryPos.x - linePoint.x,
          queryPos.y - linePoint.y,
          0
        );
        
        const t = toPos.dot(lineDir);
        
        return new Vector3(
          linePoint.x + t * lineDir.x,
          linePoint.y + t * lineDir.y,
          1
        );
      }
      
      case 'circle': {
        // Snap to closest point on circle perimeter
        const circle = primitive as CirclePrimitive;
        const dx = queryPos.x - circle.cx;
        const dy = queryPos.y - circle.cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist === 0) {
          // Query point is at center, return arbitrary point on circle
          return new Vector3(circle.cx + circle.radius, circle.cy, 1);
        }
        
        // Normalize and scale to radius
        return new Vector3(
          circle.cx + (dx / dist) * circle.radius,
          circle.cy + (dy / dist) * circle.radius,
          1
        );
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
