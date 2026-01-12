/**
 * Element3D - Abstract base class for 3D geometric elements
 * 
 * Extends Element with no additional properties.
 * Serves as type marker and organizational structure for 3D elements.
 * 
 * **Phase 52**: Introduced as part of unified Element hierarchy to distinguish
 * 3D elements from 2D elements in the type system.
 * 
 * **Current 3D element types**:
 * - Plane3D (and subclasses: Plane3DFixed, Plane3DByTraces, Plane3DByPointAndNormal)
 * - HingeLine
 * 
 * **Future 3D element types** (when needed):
 * - Point3D (3D point in space)
 * - Line3D (3D line in space)
 * - Circle3D (3D circle in space)
 * 
 * **Design Note**: Element3D "probably adds nothing" (per planning notes) because
 * 3D elements don't need:
 * - `planeId` (they're not confined to a single projection plane)
 * - `visible` (3D elements don't have direct UI visibility toggles; their 2D projections do)
 * - `type` discriminator (handled by concrete subclass instanceof checks)
 * 
 * However, Element3D provides:
 * - **Type Organization**: Clear distinction between 2D and 3D elements in type system
 * - **Dependency Interface**: All 3D elements must implement getDependencies()
 * - **Future Extensibility**: Common place to add 3D-specific functionality later
 * 
 * @see specs/001-dihedral-learning-mvp/data-model.md#element3d-class
 */
import { Element } from './Element';

export abstract class Element3D extends Element {
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
