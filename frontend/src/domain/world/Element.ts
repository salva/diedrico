/**
 * Element - Abstract base class for ALL geometric elements (2D and 3D)
 * 
 * This is the root of the element hierarchy:
 *   Element
 *   ├── Element3D (Plane3D, HingeLine, future Point3D/Line3D/Circle3D)
 *   └── Element2D (Point2D, Line2D, Circle2D)
 * 
 * **Phase 52**: Introduced to eliminate code duplication and enable uniform handling
 * of geometric elements across dimensions.
 * 
 * **Design Principle: DRY (Don't Repeat Yourself)**
 * - id and label are common to ALL geometric elements
 * - Extracted to base class to avoid duplication
 * - Enables uniform handling across dimensions
 * 
 * **Benefits**:
 * - **DRY Principle**: id and label defined once, not repeated in Element2D and every 3D element class
 * - **Uniform Interface**: Can write functions accepting Element to work with any geometric object
 * - **Type Safety**: isElement() type guard works for all elements
 * - **Consistent Property Names**: Enforce `label` instead of `name` across all elements
 * - **Future-Proof**: Easy to add new common properties (createdBy, visualStyle, metadata) in one place
 * 
 * @see specs/001-dihedral-learning-mvp/data-model.md#element-base-class-hierarchy
 */
export abstract class Element {
  /** Unique identifier for this element */
  readonly id: string;
  
  /** Optional user-assigned label for UI display */
  label?: string;
  
  /**
   * Construct a geometric element
   * 
   * @param id Element ID (format varies by dimension)
   *           - For 2D elements: hierarchical format '{planeId}/{localId}' (enforced by validateElementId in Element2D constructor)
   *           - For 3D elements: simple ID (e.g., 'plane_1', 'hinge_h_v')
   * @param label Optional user-friendly label for UI display
   */
  constructor(id: string, label?: string) {
    this.id = id;
    this.label = label;
  }
  
  /**
   * Clone this element
   * Must be implemented by concrete subclasses
   */
  abstract clone(): Element;
}

/**
 * Type guard to check if an object is an Element
 * 
 * @param obj Object to check
 * @returns true if obj is an Element (2D or 3D), false otherwise
 */
export function isElement(obj: any): obj is Element {
  return obj instanceof Element;
}
