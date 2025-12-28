/**
 * Symbolic path types for element addressing
 */
export type ElementPath = string;  // Format: "/world/elements2D/{id}" or "/world/elements3D/{id}"
export type ActionPath = string;   // Format: "/process/subprocess/{id}/actionGroup/{id}/action/{id}"
export type PlanePath = string;    // Format: "/world/planes/{id}"

/**
 * Base interface for all 2D elements (without discriminator)
 */
export interface Element2DBase {
  id: string;
  name: string;
  planeId: string;
  createdBy: string;             // ActionId that created this element
  infeasible: boolean;
  visualStyle: VisualStyle;
}

/**
 * === POINT 2D CONSTRUCTIONS ===
 */

/**
 * Free point - placed at arbitrary location
 */
export interface Point2DFree extends Element2DBase {
  kind: 'Point2DFree';
  x: number;
  y: number;
}

/**
 * Point at intersection of two elements
 */
export interface Point2DFromIntersection extends Element2DBase {
  kind: 'Point2DFromIntersection';
  element1Id: string;
  element2Id: string;
  intersectionIndex: number;     // Which intersection (0 or 1 for line-circle, etc.)
}

/**
 * Derived point (e.g., transported from another plane)
 */
export interface Point2DDerived extends Element2DBase {
  kind: 'Point2DDerived';
  sourceActionId: string;        // Action that derived this point
  x: number;
  y: number;
}

/**
 * Union type for all 2D points
 */
export type Point2D = 
  | Point2DFree 
  | Point2DFromIntersection 
  | Point2DDerived;

/**
 * === SEGMENT 2D CONSTRUCTIONS ===
 */

/**
 * Segment defined by two endpoints
 */
export interface Segment2DByPoints extends Element2DBase {
  kind: 'Segment2DByPoints';
  point1Id: string;
  point2Id: string;
}

export type Segment2D = Segment2DByPoints;

/**
 * === LINE 2D CONSTRUCTIONS ===
 */

/**
 * Line through two points
 */
export interface Line2DByTwoPoints extends Element2DBase {
  kind: 'Line2DByTwoPoints';
  point1Id: string;
  point2Id: string;
}

/**
 * Line parallel to another line through a point
 */
export interface Line2DParallelThroughPoint extends Element2DBase {
  kind: 'Line2DParallelThroughPoint';
  referenceLineId: string;
  throughPointId: string;
}

/**
 * Line perpendicular to another line through a point
 */
export interface Line2DPerpendicularThroughPoint extends Element2DBase {
  kind: 'Line2DPerpendicularThroughPoint';
  referenceLineId: string;
  throughPointId: string;
}

export type Line2D = 
  | Line2DByTwoPoints 
  | Line2DParallelThroughPoint 
  | Line2DPerpendicularThroughPoint;

/**
 * === CIRCLE 2D CONSTRUCTIONS ===
 */

/**
 * Circle by center point and radius value
 */
export interface Circle2DByCenterAndRadius extends Element2DBase {
  kind: 'Circle2DByCenterAndRadius';
  centerPointId: string;
  radius: number;
}

/**
 * Circle by center point and point on circumference
 */
export interface Circle2DByCenterAndPoint extends Element2DBase {
  kind: 'Circle2DByCenterAndPoint';
  centerPointId: string;
  circumferencePointId: string;
}

/**
 * Circle through three points
 */
export interface Circle2DByThreePoints extends Element2DBase {
  kind: 'Circle2DByThreePoints';
  point1Id: string;
  point2Id: string;
  point3Id: string;
}

export type Circle2D = 
  | Circle2DByCenterAndRadius 
  | Circle2DByCenterAndPoint 
  | Circle2DByThreePoints;

/**
 * === ARC 2D CONSTRUCTIONS ===
 */

/**
 * Arc by center, start point, end point
 */
export interface Arc2DByCenterAndPoints extends Element2DBase {
  kind: 'Arc2DByCenterAndPoints';
  centerPointId: string;
  startPointId: string;
  endPointId: string;
}

export type Arc2D = Arc2DByCenterAndPoints;

/**
 * === GUIDE 2D ===
 */

/**
 * Guide perpendicular to hinge line or BHL projection
 */
export interface Guide2DPerpendicularToLine extends Element2DBase {
  kind: 'Guide2DPerpendicularToLine';
  referenceLineId: string;       // HL or BHL projection
  throughPointId: string;
}

export type Guide2D = Guide2DPerpendicularToLine;

/**
 * === BHL PROJECTION ===
 */

/**
 * Broken hinge line projection (computed from 3D plane)
 */
export interface BHLProjection2D extends Element2DBase {
  kind: 'BHLProjection2D';
  sourcePlane3DId: string;       // Parent 3D plane
}

export type BHLProjection = BHLProjection2D;

/**
 * Union of all 2D element types
 */
export type Element2D = 
  | Point2D 
  | Segment2D 
  | Line2D 
  | Circle2D 
  | Arc2D 
  | Guide2D
  | BHLProjection;

/**
 * === 3D ELEMENT TYPES ===
 */

/**
 * Base interface for all 3D elements (without discriminator)
 */
export interface Element3DBase {
  id: string;
  name: string;
  createdBy: string;
  infeasible: boolean;
  visualStyle: VisualStyle;
}

/**
 * 3D point from explicit coordinates (e.g., origin point O)
 */
export interface Point3DByCoordinates extends Element3DBase {
  kind: 'Point3DByCoordinates';
  x: number;
  y: number;
  z: number;
  projectionHId: string;         // Computed Point2D on horizontal plane
  projectionVId: string;         // Computed Point2D on vertical plane
}

/**
 * 3D point from two 2D projections
 */
export interface Point3DFromProjections extends Element3DBase {
  kind: 'Point3DFromProjections';
  projectionHId: string;         // Point2D on horizontal plane
  projectionVId: string;         // Point2D on vertical plane
}

export type Point3D = Point3DByCoordinates | Point3DFromProjections;

/**
 * 3D line from two 2D line projections
 */
export interface Line3DFromProjections extends Element3DBase {
  kind: 'Line3DFromProjections';
  projectionHId: string;         // Line2D on horizontal plane
  projectionVId: string;         // Line2D on vertical plane
}

/**
 * 3D line from intersection of two planes (e.g., hinge lines)
 */
export interface Line3DFromPlaneIntersection extends Element3DBase {
  kind: 'Line3DFromPlaneIntersection';
  plane1Id: string;              // First Plane3D
  plane2Id: string;              // Second Plane3D
  projectionHId: string;         // Line2D representation on horizontal plane
  projectionVId: string;         // Line2D representation on vertical plane
}

export type Line3D = Line3DFromProjections | Line3DFromPlaneIntersection;

/**
 * 3D segment from two 3D points
 */
export interface Segment3DByPoints extends Element3DBase {
  kind: 'Segment3DByPoints';
  point1Id: string;              // Point3D
  point2Id: string;              // Point3D
}

export type Segment3D = Segment3DByPoints;

/**
 * 3D plane from two trace lines
 */
export interface Plane3DByTraces extends Element3DBase {
  kind: 'Plane3DByTraces';
  traceHId: string;              // Line2D horizontal trace
  traceVId: string;              // Line2D vertical trace
}

/**
 * 3D plane from point and normal vector (e.g., projection planes P_H, P_V)
 */
export interface Plane3DByPointAndNormal extends Element3DBase {
  kind: 'Plane3DByPointAndNormal';
  originPointId: string;         // Point3D on the plane
  normalVector: {                // Normal vector to the plane
    x: number;
    y: number;
    z: number;
  };
}

export type Plane3D = Plane3DByTraces | Plane3DByPointAndNormal;

/**
 * Union of all 3D element types
 */
export type Element3D = 
  | Point3D 
  | Line3D 
  | Segment3D 
  | Plane3D;

/**
 * Visual style properties
 */
export interface VisualStyle {
  color: string;             // Hex color code
  lineWidth: number;         // Pixels
  lineStyle: 'solid' | 'dashed' | 'dotted';
  opacity: number;           // 0.0 to 1.0
  visible: boolean;
  inherited: boolean;        // Whether style is inherited from subprocess
}

/**
 * Type guards for 2D elements
 */
export function isPoint2D(element: Element2D): element is Point2D {
  return element.kind === 'Point2DFree' 
    || element.kind === 'Point2DFromIntersection' 
    || element.kind === 'Point2DDerived';
}

export function isSegment2D(element: Element2D): element is Segment2D {
  return element.kind === 'Segment2DByPoints';
}

export function isLine2D(element: Element2D): element is Line2D {
  return element.kind === 'Line2DByTwoPoints' 
    || element.kind === 'Line2DParallelThroughPoint' 
    || element.kind === 'Line2DPerpendicularThroughPoint';
}

export function isCircle2D(element: Element2D): element is Circle2D {
  return element.kind === 'Circle2DByCenterAndRadius' 
    || element.kind === 'Circle2DByCenterAndPoint' 
    || element.kind === 'Circle2DByThreePoints';
}

export function isArc2D(element: Element2D): element is Arc2D {
  return element.kind === 'Arc2DByCenterAndPoints';
}

export function isGuide2D(element: Element2D): element is Guide2D {
  return element.kind === 'Guide2DPerpendicularToLine';
}

export function isBHLProjection(element: Element2D): element is BHLProjection {
  return element.kind === 'BHLProjection2D';
}

/**
 * Type guards for 3D elements
 */
export function isPoint3D(element: Element3D): element is Point3D {
  return element.kind === 'Point3DByCoordinates'
    || element.kind === 'Point3DFromProjections';
}

export function isLine3D(element: Element3D): element is Line3D {
  return element.kind === 'Line3DFromProjections' 
    || element.kind === 'Line3DFromPlaneIntersection';
}

export function isSegment3D(element: Element3D): element is Segment3D {
  return element.kind === 'Segment3DByPoints';
}

export function isPlane3D(element: Element3D): element is Plane3D {
  return element.kind === 'Plane3DByTraces' 
    || element.kind === 'Plane3DByPointAndNormal';
}
