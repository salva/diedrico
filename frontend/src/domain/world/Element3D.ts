import { Element } from './Element';
import type { Realization } from './Realization';
import type { Element3DRealizationContext } from './projectionPlane/ProjectionPlaneContext';

/**
 * Intentional seam between 2D definitions and 3D reconstruction.
 *
 * Element3D adds no stored properties to Element by design. It marks elements
 * whose geometry is reconstructed through Element3DRealizationContext from
 * defining data such as 2D projections, traces, and planes.
 *
 * Current concrete 3D element types are Point3DByCoordinates,
 * Point3DFromProjections, Line3DFromProjections, Segment3DFromProjections,
 * Plane3DFixed, Plane3DFromTraces, and HingeLine.
 *
 * Runtime dispatch policy: concrete element classes are discriminated with
 * instanceof. Existing 3D kind fields are serialization/DTO discriminators
 * only; domain behavior should not switch on them.
 */
export abstract class Element3D extends Element {
  /**
   * Compute 3D geometric realization from defining data
   * 
   * @param context - Narrow realization context for resolving dependencies (2D projections, planes)
   * @returns Realization with numeric coordinates, or infeasible if computation fails
   */
  abstract realize3D(context: Element3DRealizationContext): Realization;

  /**
   * Get dependencies - IDs of elements this 3D element depends on
   * 
   * Examples:
   * - Plane3DFixed: [] (no dependencies)
   * - Plane3DByTraces: [traceH, traceV] (depends on 2D trace lines)
   * - HingeLine: [plane1, plane2] (depends on two planes)
   * 
   * @returns Array of element IDs that this element depends on
   */
  abstract getDependencies(): string[];
  
  /**
   * Clone this 3D element
   * Must be implemented by concrete subclasses
   */
  abstract clone(): Element3D;
}

/**
 * Type guard to check if an object is an Element3D
 * 
 * @param obj Object to check
 * @returns true if obj is an Element3D, false otherwise
 */
export function isElement3D(obj: any): obj is Element3D {
  return obj instanceof Element3D;
}
