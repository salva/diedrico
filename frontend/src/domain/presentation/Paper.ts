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
import type { World } from '../world/World';
import type { Line2DRealization2D } from '../world/Line';
import type { Segment2DRealization2D } from '../world/Segment';
import type { Circle2DRealization2D } from '../world/Circle';
import type { SelectionMask, SelectableElementType } from '@/types/SelectionMask';

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
  HingeLines = 5,     // Fixed hinge lines between projection planes
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
  planeId?: string;                 // Plane this element belongs to (for hit testing filter)
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
 * Segment primitive - finite line segment between two points
 * Endpoints are stored as Vector3 for compatibility with Three.js
 * Coordinates in paper coordinate system
 */
export interface SegmentPrimitive extends DrawingPrimitive {
  type: 'segment';
  point1: Vector3;                    // First endpoint in paper space (homogeneous coordinates)
  point2: Vector3;                    // Second endpoint in paper space (homogeneous coordinates)
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
  | SegmentPrimitive
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
   * ARCHITECTURAL UPDATE: This method now performs hit testing in PLANE COORDINATE SPACE
   * rather than paper space. This is geometrically correct because:
   * 1. Objects are defined in plane coordinates (u,v)
   * 2. Snap radius transforms as a vector (can become elliptical with non-uniform scaling)
   * 3. Distance calculations are accurate in the object's definition space
   * 
   * Transform chain: Canvas → Paper → Plane (for both position and radius vector)
   * 
   * Uses homogeneous Vector3 coordinates for all 2D points (x, y, 1).
   * Transforms canvas position through full chain to active plane space,
   * then searches entity realizations for closest match within radius.
   * 
   * @param canvasPos - Click position in canvas coordinates (homogeneous Vector3)
   * @param snapRadiusPixels - Snap threshold in canvas pixels
   * @param activePlaneId - ID of active plane (only elements on this plane are tested)
   * @param paperToPlaneTransform - Transform from paper to plane coordinates
   * @param world - World instance for accessing entity realizations
   * @param selectionMask - Optional mask to filter by element type. If undefined, all types are selectable.
   * @returns HitResult if element found within radius and matches mask, null otherwise
   */
  hitTest(
    canvasPos: Vector3,
    snapRadiusPixels: number,
    activePlaneId: string | undefined,
    paperToPlaneTransform: Matrix3 | undefined,
    world: World,
    selectionMask?: SelectionMask
  ): HitResult | null {
    if (!activePlaneId || !paperToPlaneTransform) {
      // No active plane or transform - cannot perform hit testing
      return null;
    }

    // Transform canvas → paper using inverse viewport
    const paperPos = this.canvasToPaper(canvasPos);
    
    // Transform paper → plane using plane's inverse transform
    const planePos = paperPos.clone().applyMatrix3(paperToPlaneTransform);
    
    // Transform snap radius as a VECTOR (not scalar) to handle non-uniform scaling
    // The radius vector (snapRadiusPixels, 0, 0) in canvas space transforms through
    // the same coordinate chain, properly accounting for scaling and rotation
    const canvasRadiusVector = new Vector3(snapRadiusPixels, 0, 0);
    const paperRadiusVector = canvasRadiusVector.clone().applyMatrix3(this.canvasToPaperMatrix);
    const planeRadiusVector = paperRadiusVector.clone().applyMatrix3(paperToPlaneTransform);
    const planeRadius = planeRadiusVector.length();
    
    // Search entity realizations for closest within radius
    let closestHit: HitResult | null = null;
    let minDistance = planeRadius;
    
    // Test points (only from active plane)
    const points = activePlaneId ? world.getPoints2DByPlane(activePlaneId) : [];
    for (const point of points) {
      // Filter by selection mask if provided
      if (selectionMask && !selectionMask.includes('point')) {
        continue;
      }
      
      const realization = world.getPoint2DRealization(point.id);
      if (!realization) continue;
      
      const distance = planePos.distanceTo(realization.position);
      
      if (distance < minDistance) {
        closestHit = {
          elementId: point.id,
          elementType: 'point',
          primitiveId: point.id,
          distance: distance * this.viewportTransform.zoom, // Convert to canvas pixels for consistency
          snapPoint: realization.position.clone()  // Snap point in plane coordinates
        };
        minDistance = distance;
      }
    }
    
    // Test lines (includes HalfHingeLine2D on active plane)
    const lines = activePlaneId ? world.getLines2DByPlane(activePlaneId) : [];
    for (const line of lines) {
      // Filter by selection mask if provided
      if (selectionMask) {
        const elementType = this.getElementType(line, world);
        if (!selectionMask.includes(elementType)) {
          continue;
        }
      }
      
      const realization = world.getLine2DRealization(line.id);
      if (!realization) continue;
      
      const distance = this.distanceToLineInPlaneSpace(planePos, realization);
      
      if (distance < minDistance) {
        closestHit = {
          elementId: line.id,
          elementType: 'line',
          primitiveId: line.id,
          distance: distance * this.viewportTransform.zoom,
          snapPoint: this.snapToLineInPlaneSpace(planePos, realization)
        };
        minDistance = distance;
      }
    }
    
    // Test circles (only from active plane)
    const circles = activePlaneId ? world.getCircles2DByPlane(activePlaneId) : [];
    for (const circle of circles) {
      // Filter by selection mask if provided
      if (selectionMask && !selectionMask.includes('circle')) {
        continue;
      }
      
      const realization = world.getCircle2DRealization(circle.id);
      if (!realization) continue;
      
      const distance = this.distanceToCircleInPlaneSpace(planePos, realization);
      
      if (distance < minDistance) {
        closestHit = {
          elementId: circle.id,
          elementType: 'circle',
          primitiveId: circle.id,
          distance: distance * this.viewportTransform.zoom,
          snapPoint: this.snapToCircleInPlaneSpace(planePos, realization)
        };
        minDistance = distance;
      }
    }
    
    // Test segments (only from active plane)
    const segments = activePlaneId ? world.getSegments2DByPlane(activePlaneId) : [];
    for (const segment of segments) {
      // Filter by selection mask if provided
      if (selectionMask && !selectionMask.includes('segment')) {
        continue;
      }
      
      const realization = world.getSegment2DRealization(segment.id);
      if (!realization) continue;
      
      const distance = this.distanceToSegmentInPlaneSpace(planePos, realization);
      
      if (distance < minDistance) {
        closestHit = {
          elementId: segment.id,
          elementType: 'segment',
          primitiveId: segment.id,
          distance: distance * this.viewportTransform.zoom,
          snapPoint: this.snapToSegmentInPlaneSpace(planePos, realization)
        };
        minDistance = distance;
      }
    }
    
    // Test guides (always pickable - belong to both planes)
    for (const guide of world.getAllGuides2D()) {
      // Filter by selection mask if provided
      if (selectionMask && !selectionMask.includes('guide')) {
        continue;
      }
      
      // Guides don't filter by plane - they're universal construction aids
      
      const realization = world.getGuide2DRealization(guide.id);
      if (!realization) continue;
      
      const distance = this.distanceToLineInPlaneSpace(planePos, realization);
      
      if (distance < minDistance) {
        closestHit = {
          elementId: guide.id,
          elementType: 'guide',
          primitiveId: guide.id,
          distance: distance * this.viewportTransform.zoom,
          snapPoint: this.snapToLineInPlaneSpace(planePos, realization)
        };
        minDistance = distance;
      }
    }
    
    // Test hinge lines (HalfHingeLine2D - Line2D entities with type 'half-hinge')
    // Already included in line iteration above, no separate loop needed
    
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
   * Map a domain entity to its selectable element type.
   * Used for selection mask filtering in hit testing.
   * 
   * @param entity - Domain entity (Point2D, Line2D, etc.)
   * @param world - World instance for accessing entity details
   * @returns SelectableElementType for this entity
   */
  private getElementType(entity: any, world: World): SelectableElementType {
    // Check if it's a line type (includes HalfHingeLine2D)
    if (entity.type) {
      if (entity.type === 'half-hinge') {
        return 'half-hinge-line';
      }
      // Other line types return 'line'
      if (entity.type === 'by-two-points' || entity.type === 'parallel' || entity.type === 'perpendicular') {
        return 'line';
      }
    }
    
    // Fallback: check entity structure/class
    // Note: In TypeScript with proper type guards, we'd use instanceof or discriminated unions
    // For now, check common properties to identify entity type
    if ('position' in entity || 'element1Id' in entity) {
      return 'point';
    }
    if ('point1Id' in entity && 'point2Id' in entity && !('radius' in entity)) {
      // Has two point IDs but no radius = segment or line
      // This is a simplified check - real code would check entity.kind or type property
      return 'segment';
    }
    if ('radius' in entity || 'centerPointId' in entity) {
      return 'circle';
    }
    if ('halfHingeLineId' in entity || 'hingeLineId' in entity) {
      return 'guide';
    }
    
    // Default fallback
    return 'point';
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

  /**
   * Calculate distance from a point to a line in plane space
   * Uses plane-space realizations for accurate geometric calculations
   * 
   * @param planePos - Point position in plane coordinates
   * @param lineRealization - Line geometry in plane coordinates
   * @returns Distance in plane units
   */
  private distanceToLineInPlaneSpace(planePos: Vector3, lineRealization: Line2DRealization2D): number {
    // Line in parametric form: P(t) = point + t * direction
    // Distance from point to line is: ||pointToLine - projection|| where
    // projection = (pointToLine · direction) * direction
    const pointToLine = planePos.clone().sub(lineRealization.point);
    const projection = pointToLine.dot(lineRealization.direction);
    const closestPoint = lineRealization.point.clone().addScaledVector(lineRealization.direction, projection);
    return planePos.distanceTo(closestPoint);
  }

  /**
   * Get snap point on a line in plane space
   * 
   * @param planePos - Point position in plane coordinates
   * @param lineRealization - Line geometry in plane coordinates
   * @returns Closest point on line in plane coordinates
   */
  private snapToLineInPlaneSpace(planePos: Vector3, lineRealization: Line2DRealization2D): Vector3 {
    const pointToLine = planePos.clone().sub(lineRealization.point);
    const projection = pointToLine.dot(lineRealization.direction);
    return lineRealization.point.clone().addScaledVector(lineRealization.direction, projection);
  }

  /**
   * Calculate distance from a point to a circle in plane space
   * 
   * @param planePos - Point position in plane coordinates
   * @param circleRealization - Circle geometry in plane coordinates
   * @returns Distance to nearest point on circle in plane units
   */
  private distanceToCircleInPlaneSpace(planePos: Vector3, circleRealization: Circle2DRealization2D): number {
    const centerDistance = planePos.distanceTo(circleRealization.center);
    return Math.abs(centerDistance - circleRealization.radius);
  }

  /**
   * Get snap point on a circle in plane space
   * 
   * @param planePos - Point position in plane coordinates
   * @param circleRealization - Circle geometry in plane coordinates
   * @returns Closest point on circle in plane coordinates
   */
  private snapToCircleInPlaneSpace(planePos: Vector3, circleRealization: Circle2DRealization2D): Vector3 {
    const direction = planePos.clone().sub(circleRealization.center).normalize();
    return circleRealization.center.clone().addScaledVector(direction, circleRealization.radius);
  }

  /**
   * Calculate distance from a point to a segment in plane space
   * 
   * @param planePos - Point position in plane coordinates
   * @param segmentRealization - Segment geometry in plane coordinates
   * @returns Distance to nearest point on segment in plane units
   */
  private distanceToSegmentInPlaneSpace(planePos: Vector3, segmentRealization: Segment2DRealization2D): number {
    // Segment is finite - need to clamp to endpoints
    const p1 = segmentRealization.point1;
    const p2 = segmentRealization.point2;
    const segmentVec = p2.clone().sub(p1);
    const pointVec = planePos.clone().sub(p1);
    
    const segmentLength = segmentVec.length();
    if (segmentLength === 0) {
      // Degenerate segment - distance to point
      return planePos.distanceTo(p1);
    }
    
    // Project onto segment and clamp to [0, 1]
    const t = Math.max(0, Math.min(1, pointVec.dot(segmentVec) / (segmentLength * segmentLength)));
    const closestPoint = p1.clone().addScaledVector(segmentVec, t);
    return planePos.distanceTo(closestPoint);
  }

  /**
   * Get snap point on a segment in plane space
   * 
   * @param planePos - Point position in plane coordinates
   * @param segmentRealization - Segment geometry in plane coordinates
   * @returns Closest point on segment in plane coordinates
   */
  private snapToSegmentInPlaneSpace(planePos: Vector3, segmentRealization: Segment2DRealization2D): Vector3 {
    const p1 = segmentRealization.point1;
    const p2 = segmentRealization.point2;
    const segmentVec = p2.clone().sub(p1);
    const pointVec = planePos.clone().sub(p1);
    
    const segmentLength = segmentVec.length();
    if (segmentLength === 0) {
      return p1.clone();
    }
    
    // Project onto segment and clamp to [0, 1]
    const t = Math.max(0, Math.min(1, pointVec.dot(segmentVec) / (segmentLength * segmentLength)));
    return p1.clone().addScaledVector(segmentVec, t);
  }
}
