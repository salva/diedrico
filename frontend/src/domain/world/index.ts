/**
 * Domain world exports
 * Central export point for all domain model types in the world layer.
 */

// Element2D base class
export { Element2D, type Element2DRealization } from './Element2D';

// Element2D utility functions
export {
  isElement2D,
  getElementsOnPlane,
  hideElement,
  showElement,
  getElementLabel,
  getVisibleElements,
  getElementsByType,
  countElementsByPlane
} from './Element2DUtils';

// 2D Element Realization Types
export { Element2DRealization2D } from './Element2DRealization2D';
export { Point2DRealization2D, type Point2DType } from './Point';
export { Line2DRealization2D, type Line2DType } from './Line';
export { Circle2DRealization2D, type Circle2DType } from './Circle';
