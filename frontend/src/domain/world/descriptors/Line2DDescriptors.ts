/**
 * Phase 98: Dynamic Action Descriptions - 2D Line Descriptors
 * 
 * Descriptors for 2D line element types.
 * Separated from domain classes to keep geometry pure.
 */

import type { ElementDescriptor } from './ElementDescriptor';
import type { DescriptionPart } from './DescriptionPart';
import type { World } from '../World';
import type { Line2DByTwoPoints } from '../Line';
import type { Line2DParallel } from '../Line';
import type { Line2DPerpendicularToLine } from '../Line';
import type { Line2DTangentToCircleThroughPoint } from '../Line';
import type { Line2DTangentToCircleParallelToLine } from '../Line';

/**
 * Descriptor for Line2DByTwoPoints - line through two points
 */
export class Line2DByTwoPointsDescriptor implements ElementDescriptor<Line2DByTwoPoints> {
  getTypeName(_element: Line2DByTwoPoints): string {
    return 'Line';
  }
  
  getConstructionDescription(element: Line2DByTwoPoints, world: World): DescriptionPart[] {
    const plane = world.getProjectionPlaneById(element.planeId);
    const planeName = plane?.label || plane?.name || element.planeId;
    const point1 = world.getElement2D(element.point1Id);
    const point2 = world.getElement2D(element.point2Id);
    
    return [
      { type: 'text', content: 'in ' },
      { type: 'label', content: planeName, elementId: element.planeId },
      { type: 'text', content: ', through points ' },
      { type: 'label', content: point1?.label || element.point1Id, elementId: element.point1Id },
      { type: 'text', content: ' and ' },
      { type: 'label', content: point2?.label || element.point2Id, elementId: element.point2Id }
    ];
  }
}

/**
 * Descriptor for Line2DParallel - line parallel to another line through a point
 */
export class Line2DParallelDescriptor implements ElementDescriptor<Line2DParallel> {
  getTypeName(_element: Line2DParallel): string {
    return 'Line';
  }
  
  getConstructionDescription(element: Line2DParallel, world: World): DescriptionPart[] {
    const plane = world.getProjectionPlaneById(element.planeId);
    const planeName = plane?.label || plane?.name || element.planeId;
    const sourceLine = world.getElement2D(element.referenceLineId);
    const throughPoint = world.getElement2D(element.throughPointId);
    
    return [
      { type: 'text', content: 'in ' },
      { type: 'label', content: planeName, elementId: element.planeId },
      { type: 'text', content: ', parallel to line ' },
      { type: 'label', content: sourceLine?.label || element.referenceLineId, elementId: element.referenceLineId },
      { type: 'text', content: ' through point ' },
      { type: 'label', content: throughPoint?.label || element.throughPointId, elementId: element.throughPointId }
    ];
  }
}

/**
 * Descriptor for Line2DPerpendicularToLine - line perpendicular to another line through a point
 */
export class Line2DPerpendicularToLineDescriptor implements ElementDescriptor<Line2DPerpendicularToLine> {
  getTypeName(_element: Line2DPerpendicularToLine): string {
    return 'Line';
  }
  
  getConstructionDescription(element: Line2DPerpendicularToLine, world: World): DescriptionPart[] {
    const plane = world.getProjectionPlaneById(element.planeId);
    const planeName = plane?.label || plane?.name || element.planeId;
    const sourceLine = world.getElement2D(element.referenceLineId);
    const throughPoint = world.getElement2D(element.throughPointId);
    
    return [
      { type: 'text', content: 'in ' },
      { type: 'label', content: planeName, elementId: element.planeId },
      { type: 'text', content: ', perpendicular to line ' },
      { type: 'label', content: sourceLine?.label || element.referenceLineId, elementId: element.referenceLineId },
      { type: 'text', content: ' through point ' },
      { type: 'label', content: throughPoint?.label || element.throughPointId, elementId: element.throughPointId }
    ];
  }
}

/**
 * Descriptor for Line2DTangentToCircleThroughPoint - line tangent to circle through point
 */
export class Line2DTangentToCircleThroughPointDescriptor implements ElementDescriptor<Line2DTangentToCircleThroughPoint> {
  getTypeName(_element: Line2DTangentToCircleThroughPoint): string {
    return 'Line';
  }
  
  getConstructionDescription(element: Line2DTangentToCircleThroughPoint, world: World): DescriptionPart[] {
    const plane = world.getProjectionPlaneById(element.planeId);
    const planeName = plane?.label || plane?.name || element.planeId;
    const circle = world.getElement2D(element.circleId);
    const point = world.getElement2D(element.throughPointId);
    const indexText = element.tangentIndex === 0 ? ' (first tangent)' : ' (second tangent)';
    
    return [
      { type: 'text', content: 'in ' },
      { type: 'label', content: planeName, elementId: element.planeId },
      { type: 'text', content: ', tangent to circle ' },
      { type: 'label', content: circle?.label || element.circleId, elementId: element.circleId },
      { type: 'text', content: ' through point ' },
      { type: 'label', content: point?.label || element.throughPointId, elementId: element.throughPointId },
      { type: 'text', content: indexText }
    ];
  }
}

/**
 * Descriptor for Line2DTangentToCircleParallelToLine - line tangent to circle parallel to line
 */
export class Line2DTangentToCircleParallelToLineDescriptor implements ElementDescriptor<Line2DTangentToCircleParallelToLine> {
  getTypeName(_element: Line2DTangentToCircleParallelToLine): string {
    return 'Line';
  }
  
  getConstructionDescription(element: Line2DTangentToCircleParallelToLine, world: World): DescriptionPart[] {
    const plane = world.getProjectionPlaneById(element.planeId);
    const planeName = plane?.label || plane?.name || element.planeId;
    const circle = world.getElement2D(element.circleId);
    const line = world.getElement2D(element.referenceLineId);
    const indexText = element.tangentIndex === 0 ? ' (first tangent)' : ' (second tangent)';
    
    return [
      { type: 'text', content: 'in ' },
      { type: 'label', content: planeName, elementId: element.planeId },
      { type: 'text', content: ', tangent to circle ' },
      { type: 'label', content: circle?.label || element.circleId, elementId: element.circleId },
      { type: 'text', content: ' parallel to line ' },
      { type: 'label', content: line?.label || element.referenceLineId, elementId: element.referenceLineId },
      { type: 'text', content: indexText }
    ];
  }
}
