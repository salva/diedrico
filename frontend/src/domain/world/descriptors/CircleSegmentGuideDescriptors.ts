/**
 * Phase 98: Dynamic Action Descriptions - 2D Circle, Segment, Guide Descriptors
 * 
 * Descriptors for circles, segments, and guides.
 * Separated from domain classes to keep geometry pure.
 */

import type { ElementDescriptor } from './ElementDescriptor';
import type { DescriptionPart } from './DescriptionPart';
import type { World } from '../World';
import type { Circle2DByCenterAndPoint } from '../Circle';
import type { Circle2DByThreePoints } from '../Circle';
import type { Segment2D } from '../Segment';
import type { Guide2D } from '../Guide';
import type { SiblingGuide2D } from '../Guide';

/**
 * Descriptor for Circle2DByCenterAndPoint - circle with center and radius point
 */
export class Circle2DByCenterAndPointDescriptor implements ElementDescriptor<Circle2DByCenterAndPoint> {
  getTypeName(_element: Circle2DByCenterAndPoint): string {
    return 'Circle';
  }
  
  getConstructionDescription(element: Circle2DByCenterAndPoint, world: World): DescriptionPart[] {
    const plane = world.getProjectionPlaneById(element.planeId);
    const planeName = plane?.label || plane?.name || element.planeId;
    const center = world.getElement2D(element.centerPointId);
    const radiusPoint = world.getElement2D(element.circumferencePointId);
    
    return [
      { type: 'text', content: 'in ' },
      { type: 'label', content: planeName, elementId: element.planeId },
      { type: 'text', content: ', center at point ' },
      { type: 'label', content: center?.label || element.centerPointId, elementId: element.centerPointId },
      { type: 'text', content: ' passing through point ' },
      { type: 'label', content: radiusPoint?.label || element.circumferencePointId, elementId: element.circumferencePointId }
    ];
  }
}

/**
 * Descriptor for Circle2DByThreePoints - circle through three points
 */
export class Circle2DByThreePointsDescriptor implements ElementDescriptor<Circle2DByThreePoints> {
  getTypeName(_element: Circle2DByThreePoints): string {
    return 'Circle';
  }
  
  getConstructionDescription(element: Circle2DByThreePoints, world: World): DescriptionPart[] {
    const plane = world.getProjectionPlaneById(element.planeId);
    const planeName = plane?.label || plane?.name || element.planeId;
    const point1 = world.getElement2D(element.point1Id);
    const point2 = world.getElement2D(element.point2Id);
    const point3 = world.getElement2D(element.point3Id);
    
    return [
      { type: 'text', content: 'in ' },
      { type: 'label', content: planeName, elementId: element.planeId },
      { type: 'text', content: ', through points ' },
      { type: 'label', content: point1?.label || element.point1Id, elementId: element.point1Id },
      { type: 'text', content: ', ' },
      { type: 'label', content: point2?.label || element.point2Id, elementId: element.point2Id },
      { type: 'text', content: ', and ' },
      { type: 'label', content: point3?.label || element.point3Id, elementId: element.point3Id }
    ];
  }
}

/**
 * Descriptor for Segment2D - segment between two points
 */
export class Segment2DDescriptor implements ElementDescriptor<Segment2D> {
  getTypeName(_element: Segment2D): string {
    return 'Segment';
  }
  
  getConstructionDescription(element: Segment2D, world: World): DescriptionPart[] {
    const plane = world.getProjectionPlaneById(element.planeId);
    const planeName = plane?.label || plane?.name || element.planeId;
    const point1 = world.getElement2D(element.point1Id);
    const point2 = world.getElement2D(element.point2Id);
    
    return [
      { type: 'text', content: 'in ' },
      { type: 'label', content: planeName, elementId: element.planeId },
      { type: 'text', content: ', between points ' },
      { type: 'label', content: point1?.label || element.point1Id, elementId: element.point1Id },
      { type: 'text', content: ' and ' },
      { type: 'label', content: point2?.label || element.point2Id, elementId: element.point2Id }
    ];
  }
}

/**
 * Descriptor for Guide2D - construction guide perpendicular to hinge line
 */
export class Guide2DDescriptor implements ElementDescriptor<Guide2D> {
  getTypeName(_element: Guide2D): string {
    return 'Guide';
  }
  
  getConstructionDescription(element: Guide2D, world: World): DescriptionPart[] {
    const plane = world.getProjectionPlaneById(element.planeId);
    const planeName = plane?.label || plane?.name || element.planeId;
    const referenceLine = world.getElement2D(element.referenceLineId);
    const throughPoint = world.getElement2D(element.throughPointId);
    
    return [
      { type: 'text', content: 'in ' },
      { type: 'label', content: planeName, elementId: element.planeId },
      { type: 'text', content: ', guide through ' },
      { type: 'label', content: throughPoint?.label || element.throughPointId, elementId: element.throughPointId },
      { type: 'text', content: ' perpendicular to ' },
      { type: 'label', content: referenceLine?.label || element.referenceLineId, elementId: element.referenceLineId }
    ];
  }
}

/**
 * Descriptor for SiblingGuide2D - paired guide on conjugate plane
 */
export class SiblingGuide2DDescriptor implements ElementDescriptor<SiblingGuide2D> {
  getTypeName(_element: SiblingGuide2D): string {
    return 'Guide';
  }
  
  getConstructionDescription(element: SiblingGuide2D, world: World): DescriptionPart[] {
    const plane = world.getProjectionPlaneById(element.planeId);
    const planeName = plane?.label || plane?.name || element.planeId;
    const primaryGuide = world.getElement2D(element.primaryGuideId);
    
    return [
      { type: 'text', content: 'in ' },
      { type: 'label', content: planeName, elementId: element.planeId },
      { type: 'text', content: ', sibling guide from ' },
      { type: 'label', content: primaryGuide?.label || element.primaryGuideId, elementId: element.primaryGuideId }
    ];
  }
}
