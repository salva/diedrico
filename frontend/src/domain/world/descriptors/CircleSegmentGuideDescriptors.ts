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
import type { Circle2DByCenterAndRadiusVector } from '../Circle';
import type { Circle2DByThreePoints } from '../Circle';
import type { Segment2D } from '../Segment';
import type { Guide2D } from '../Guide';
import type { SiblingGuide2D } from '../Guide';
import { GeometryElementLookup } from '../GeometryElementLookup';

function requireProjectionPlaneName(world: World, planeId: string): string {
  const plane = world.getProjectionPlaneById(planeId);
  if (!plane) throw new Error(`Descriptor invariant failed: projection plane not found: ${planeId}`);
  return plane.label || plane.name;
}

function requireElementLabel(world: World, elementId: string): string {
  const element = new GeometryElementLookup(world).getElement2D(elementId);
  if (!element) throw new Error(`Descriptor invariant failed: 2D element not found: ${elementId}`);
  return element.label || elementId;
}

/**
 * Descriptor for Circle2DByCenterAndPoint - circle with center and radius point
 */
export class Circle2DByCenterAndPointDescriptor implements ElementDescriptor<Circle2DByCenterAndPoint> {
  getTypeName(_element: Circle2DByCenterAndPoint): string {
    return 'Circle';
  }
  
  getConstructionDescription(element: Circle2DByCenterAndPoint, world: World): DescriptionPart[] {
    const planeName = requireProjectionPlaneName(world, element.planeId);
    const centerLabel = requireElementLabel(world, element.centerPointId);
    const radiusPointLabel = requireElementLabel(world, element.circumferencePointId);
    
    return [
      { type: 'text', content: 'in ' },
      { type: 'label', content: planeName, elementId: element.planeId },
      { type: 'text', content: ', center at point ' },
      { type: 'label', content: centerLabel, elementId: element.centerPointId },
      { type: 'text', content: ' passing through point ' },
      { type: 'label', content: radiusPointLabel, elementId: element.circumferencePointId }
    ];
  }
}

export class Circle2DByCenterAndRadiusVectorDescriptor implements ElementDescriptor<Circle2DByCenterAndRadiusVector> {
  getTypeName(_element: Circle2DByCenterAndRadiusVector): string {
    return 'Circle';
  }

  getConstructionDescription(element: Circle2DByCenterAndRadiusVector, world: World): DescriptionPart[] {
    const planeName = requireProjectionPlaneName(world, element.planeId);
    const centerLabel = requireElementLabel(world, element.centerPointId);
    return [
      { type: 'text', content: 'in ' },
      { type: 'label', content: planeName, elementId: element.planeId },
      { type: 'text', content: ', center at point ' },
      { type: 'label', content: centerLabel, elementId: element.centerPointId },
      { type: 'text', content: ` with radius ${element.radiusVector.length().toFixed(2)}` }
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
    const planeName = requireProjectionPlaneName(world, element.planeId);
    const point1Label = requireElementLabel(world, element.point1Id);
    const point2Label = requireElementLabel(world, element.point2Id);
    const point3Label = requireElementLabel(world, element.point3Id);
    
    return [
      { type: 'text', content: 'in ' },
      { type: 'label', content: planeName, elementId: element.planeId },
      { type: 'text', content: ', through points ' },
      { type: 'label', content: point1Label, elementId: element.point1Id },
      { type: 'text', content: ', ' },
      { type: 'label', content: point2Label, elementId: element.point2Id },
      { type: 'text', content: ', and ' },
      { type: 'label', content: point3Label, elementId: element.point3Id }
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
    const planeName = requireProjectionPlaneName(world, element.planeId);
    const point1Label = requireElementLabel(world, element.point1Id);
    const point2Label = requireElementLabel(world, element.point2Id);
    
    return [
      { type: 'text', content: 'in ' },
      { type: 'label', content: planeName, elementId: element.planeId },
      { type: 'text', content: ', between points ' },
      { type: 'label', content: point1Label, elementId: element.point1Id },
      { type: 'text', content: ' and ' },
      { type: 'label', content: point2Label, elementId: element.point2Id }
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
    const planeName = requireProjectionPlaneName(world, element.planeId);
    const referenceLineLabel = requireElementLabel(world, element.referenceLineId);
    const throughPointLabel = requireElementLabel(world, element.throughPointId);
    
    return [
      { type: 'text', content: 'in ' },
      { type: 'label', content: planeName, elementId: element.planeId },
      { type: 'text', content: ', guide through ' },
      { type: 'label', content: throughPointLabel, elementId: element.throughPointId },
      { type: 'text', content: ' perpendicular to ' },
      { type: 'label', content: referenceLineLabel, elementId: element.referenceLineId }
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
    const planeName = requireProjectionPlaneName(world, element.planeId);
    const primaryGuideLabel = requireElementLabel(world, element.primaryGuideId);
    
    return [
      { type: 'text', content: 'in ' },
      { type: 'label', content: planeName, elementId: element.planeId },
      { type: 'text', content: ', sibling guide from ' },
      { type: 'label', content: primaryGuideLabel, elementId: element.primaryGuideId }
    ];
  }
}
