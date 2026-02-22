/**
 * Domain world exports
 * Central export point for all domain model types in the world layer.
 */

// Element2D base class
export { Element2D, type Element2DRealization } from './Element2D';

// 2D Element Realization Types
export { Element2DRealization2D } from './Element2DRealization2D';
export { Point2DRealization2D, type Point2DType } from './Point';
export { Line2DRealization2D, type Line2DType } from './Line';
export { Circle2DRealization2D, type Circle2DType } from './Circle';

// 3D Element Realization Types (Phase 78)
export { 
  Element3DRealization3D,
  Point3DRealization3D,
  Line3DRealization3D,
  Segment3DRealization3D,
  Plane3DRealization3D
} from './Element3DRealization3D';

// 3D Element Domain Types (Phase 78)
export { 
  Point3DByCoordinates,
  Point3DFromProjections,
  type Point3D
} from './Point3D';
export {
  Line3D,
  Line3DFromProjections
} from './Line3D';
export {
  Segment3DFromProjections,
  type Segment3D
} from './Segment3D';
export {
  Plane3DFromTraces
} from './Plane';

// Phase 101: Broken Hinge Lines
export { BrokenHingeLine } from './BrokenHingeLine';
export { BrokenHalfHingeLine2D } from './elements/BrokenHalfHingeLine2D';
export { HalfHingeLineRealization2D } from './HalfHingeLineRealization2D';

// Phase 116: Sequential label generation
export { LabelGenerator } from './LabelGenerator';
