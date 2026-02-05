/**
 * Phase 98: Dynamic Action Descriptions - 2D Point Descriptors
 * 
 * Descriptors for 2D point element types (free points and intersection points).
 * Separated from domain classes to keep geometry pure.
 */

import type { ElementDescriptor } from './ElementDescriptor';
import type { DescriptionPart } from './DescriptionPart';
import type { World } from '../World';
import type { FreePoint2D } from '../Point';
import type { Point2DLineLineIntersection } from '../Point';
import type { Point2DLineCircleIntersection } from '../Point';
import type { Point2DCircleCircleIntersection } from '../Point';
import type { SiblingIntersectionPoint2D } from '../Point';

/**
 * Descriptor for FreePoint2D - points defined by position
 */
export class FreePoint2DDescriptor implements ElementDescriptor<FreePoint2D> {
  getTypeName(_element: FreePoint2D): string {
    return 'Point';
  }
  
  getConstructionDescription(element: FreePoint2D, world: World): DescriptionPart[] {
    const plane = world.getProjectionPlaneById(element.planeId);
    const planeName = plane?.label || plane?.name || element.planeId;
    const x = Math.round(element.position.x * 10) / 10;
    const y = Math.round(element.position.y * 10) / 10;
    
    return [
      { type: 'text', content: 'in ' },
      { type: 'label', content: planeName, elementId: element.planeId },
      { type: 'text', content: `, free point at [${x}, ${y}]` }
    ];
  }
}

/**
 * Descriptor for Point2DLineLineIntersection - intersection of two lines
 */
export class Point2DLineLineIntersectionDescriptor implements ElementDescriptor<Point2DLineLineIntersection> {
  getTypeName(_element: Point2DLineLineIntersection): string {
    return 'Point';
  }
  
  getConstructionDescription(element: Point2DLineLineIntersection, world: World): DescriptionPart[] {
    const plane = world.getProjectionPlaneById(element.planeId);
    const planeName = plane?.label || plane?.name || element.planeId;
    const line1 = world.getElement2D(element.line1Id);
    const line2 = world.getElement2D(element.line2Id);
    
    return [
      { type: 'text', content: 'in ' },
      { type: 'label', content: planeName, elementId: element.planeId },
      { type: 'text', content: ', intersection of line ' },
      { type: 'label', content: line1?.label || element.line1Id, elementId: element.line1Id },
      { type: 'text', content: ' and line ' },
      { type: 'label', content: line2?.label || element.line2Id, elementId: element.line2Id }
    ];
  }
}

/**
 * Descriptor for Point2DLineCircleIntersection - intersection of line and circle
 */
export class Point2DLineCircleIntersectionDescriptor implements ElementDescriptor<Point2DLineCircleIntersection> {
  getTypeName(_element: Point2DLineCircleIntersection): string {
    return 'Point';
  }
  
  getConstructionDescription(element: Point2DLineCircleIntersection, world: World): DescriptionPart[] {
    const plane = world.getProjectionPlaneById(element.planeId);
    const planeName = plane?.label || plane?.name || element.planeId;
    const line = world.getElement2D(element.lineId);
    const circle = world.getElement2D(element.circleId);
    const indexText = element.index === 0 ? ' (first intersection)' : ' (second intersection)';
    
    return [
      { type: 'text', content: 'in ' },
      { type: 'label', content: planeName, elementId: element.planeId },
      { type: 'text', content: ', intersection of line ' },
      { type: 'label', content: line?.label || element.lineId, elementId: element.lineId },
      { type: 'text', content: ' and circle ' },
      { type: 'label', content: circle?.label || element.circleId, elementId: element.circleId },
      { type: 'text', content: indexText }
    ];
  }
}

/**
 * Descriptor for Point2DCircleCircleIntersection - intersection of two circles
 */
export class Point2DCircleCircleIntersectionDescriptor implements ElementDescriptor<Point2DCircleCircleIntersection> {
  getTypeName(_element: Point2DCircleCircleIntersection): string {
    return 'Point';
  }
  
  getConstructionDescription(element: Point2DCircleCircleIntersection, world: World): DescriptionPart[] {
    const plane = world.getProjectionPlaneById(element.planeId);
    const planeName = plane?.label || plane?.name || element.planeId;
    const circle1 = world.getElement2D(element.circle1Id);
    const circle2 = world.getElement2D(element.circle2Id);
    const indexText = element.index === 0 ? ' (first intersection)' : ' (second intersection)';
    
    return [
      { type: 'text', content: 'in ' },
      { type: 'label', content: planeName, elementId: element.planeId },
      { type: 'text', content: ', intersection of circle ' },
      { type: 'label', content: circle1?.label || element.circle1Id, elementId: element.circle1Id },
      { type: 'text', content: ' and circle ' },
      { type: 'label', content: circle2?.label || element.circle2Id, elementId: element.circle2Id },
      { type: 'text', content: indexText }
    ];
  }
}

/**
 * Descriptor for SiblingIntersectionPoint2D - paired point on conjugate plane
 */
export class SiblingIntersectionPoint2DDescriptor implements ElementDescriptor<SiblingIntersectionPoint2D> {
  getTypeName(_element: SiblingIntersectionPoint2D): string {
    return 'Point';
  }
  
  getConstructionDescription(element: SiblingIntersectionPoint2D, world: World): DescriptionPart[] {
    const plane = world.getProjectionPlaneById(element.planeId);
    const planeName = plane?.label || plane?.name || element.planeId;
    const primaryPoint = world.getElement2D(element.primaryIntersectionId);
    
    return [
      { type: 'text', content: 'in ' },
      { type: 'label', content: planeName, elementId: element.planeId },
      { type: 'text', content: ', sibling of ' },
      { type: 'label', content: primaryPoint?.label || element.primaryIntersectionId, elementId: element.primaryIntersectionId }
    ];
  }
}
