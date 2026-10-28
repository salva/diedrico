/**
 * Phase 98: Dynamic Action Descriptions - 2D Line Descriptors
 * 
 * Descriptors for 2D line element types.
 * Separated from domain classes to keep geometry pure.
 */

import type { ElementDescriptor } from './ElementDescriptor';
import type { DescriptionPart } from './DescriptionPart';
import type { World } from '@/domain/world/World';
import type { Line2DByTwoPoints } from '@/domain/world/Line';
import type { Line2DByPointAndRelativeAngle } from '@/domain/world/Line';
import type { Line2DParallel } from '@/domain/world/Line';
import type { Line2DPerpendicularToLine } from '@/domain/world/Line';
import type { Line2DTangentToCircleThroughPoint } from '@/domain/world/Line';
import type { Line2DTangentToCircleParallelToLine } from '@/domain/world/Line';
import { HalfHingeLine2D } from '@/domain/world/HingeLine';
import { BrokenHalfHingeLine2D } from '@/domain/world/elements/BrokenHalfHingeLine2D';
import type { BrokenHingeLine } from '@/domain/world/BrokenHingeLine';
import { GeometryElementLookup } from '@/domain/world/GeometryElementLookup';

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
 * Descriptor for Line2DByTwoPoints - line through two points
 */
export class Line2DByTwoPointsDescriptor implements ElementDescriptor<Line2DByTwoPoints> {
  getTypeName(_element: Line2DByTwoPoints): string {
    return 'Line';
  }
  
  getConstructionDescription(element: Line2DByTwoPoints, world: World): DescriptionPart[] {
    const planeName = requireProjectionPlaneName(world, element.planeId);
    const point1Label = requireElementLabel(world, element.point1Id);
    const point2Label = requireElementLabel(world, element.point2Id);
    
    return [
      { type: 'text', content: 'in ' },
      { type: 'label', content: planeName, elementId: element.planeId },
      { type: 'text', content: ', through points ' },
      { type: 'label', content: point1Label, elementId: element.point1Id },
      { type: 'text', content: ' and ' },
      { type: 'label', content: point2Label, elementId: element.point2Id }
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
    const planeName = requireProjectionPlaneName(world, element.planeId);
    const sourceLineLabel = requireElementLabel(world, element.referenceLineId);
    const throughPointLabel = requireElementLabel(world, element.throughPointId);
    
    return [
      { type: 'text', content: 'in ' },
      { type: 'label', content: planeName, elementId: element.planeId },
      { type: 'text', content: ', parallel to line ' },
      { type: 'label', content: sourceLineLabel, elementId: element.referenceLineId },
      { type: 'text', content: ' through point ' },
      { type: 'label', content: throughPointLabel, elementId: element.throughPointId }
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
    const planeName = requireProjectionPlaneName(world, element.planeId);
    const sourceLineLabel = requireElementLabel(world, element.referenceLineId);
    const throughPointLabel = requireElementLabel(world, element.throughPointId);
    
    return [
      { type: 'text', content: 'in ' },
      { type: 'label', content: planeName, elementId: element.planeId },
      { type: 'text', content: ', perpendicular to line ' },
      { type: 'label', content: sourceLineLabel, elementId: element.referenceLineId },
      { type: 'text', content: ' through point ' },
      { type: 'label', content: throughPointLabel, elementId: element.throughPointId }
    ];
  }
}

export class Line2DByPointAndRelativeAngleDescriptor implements ElementDescriptor<Line2DByPointAndRelativeAngle> {
  getTypeName(_element: Line2DByPointAndRelativeAngle): string {
    return 'Line';
  }

  getConstructionDescription(element: Line2DByPointAndRelativeAngle, world: World): DescriptionPart[] {
    const planeName = requireProjectionPlaneName(world, element.planeId);
    const sourceLineLabel = requireElementLabel(world, element.referenceLineId);
    const throughPointLabel = requireElementLabel(world, element.throughPointId);
    const degrees = element.angleRadians * 180 / Math.PI;
    return [
      { type: 'text', content: 'in ' },
      { type: 'label', content: planeName, elementId: element.planeId },
      { type: 'text', content: ', through point ' },
      { type: 'label', content: throughPointLabel, elementId: element.throughPointId },
      { type: 'text', content: ` at ${degrees.toFixed(1)} deg to line ` },
      { type: 'label', content: sourceLineLabel, elementId: element.referenceLineId }
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
    const planeName = requireProjectionPlaneName(world, element.planeId);
    const circleLabel = requireElementLabel(world, element.circleId);
    const pointLabel = requireElementLabel(world, element.throughPointId);
    const indexText = element.tangentIndex === 0 ? ' (first tangent)' : ' (second tangent)';
    
    return [
      { type: 'text', content: 'in ' },
      { type: 'label', content: planeName, elementId: element.planeId },
      { type: 'text', content: ', tangent to circle ' },
      { type: 'label', content: circleLabel, elementId: element.circleId },
      { type: 'text', content: ' through point ' },
      { type: 'label', content: pointLabel, elementId: element.throughPointId },
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
    const planeName = requireProjectionPlaneName(world, element.planeId);
    const circleLabel = requireElementLabel(world, element.circleId);
    const lineLabel = requireElementLabel(world, element.referenceLineId);
    const indexText = element.tangentIndex === 0 ? ' (first tangent)' : ' (second tangent)';
    
    return [
      { type: 'text', content: 'in ' },
      { type: 'label', content: planeName, elementId: element.planeId },
      { type: 'text', content: ', tangent to circle ' },
      { type: 'label', content: circleLabel, elementId: element.circleId },
      { type: 'text', content: ' parallel to line ' },
      { type: 'label', content: lineLabel, elementId: element.referenceLineId },
      { type: 'text', content: indexText }
    ];
  }
}

/**
 * Descriptor for HalfHingeLine2D - 2D projection of hinge line on specific plane
 * Phase 101: Shows which hinge line this trace belongs to and the connected planes
 */
export class HalfHingeLine2DDescriptor implements ElementDescriptor<HalfHingeLine2D> {
  getTypeName(_element: HalfHingeLine2D): string {
    return 'Hinge Line Trace';
  }
  
  getConstructionDescription(element: HalfHingeLine2D, world: World): DescriptionPart[] {
    const hingeLine = world.getHingeLineById(element.hingeLineId);
    if (!hingeLine) throw new Error(`Descriptor invariant failed: hinge line not found: ${element.hingeLineId}`);
    
    // Get the other plane in the hinge
    const otherPlaneId = hingeLine.plane1Id === element.planeId ? hingeLine.plane2Id : hingeLine.plane1Id;
    
    return [
      { type: 'text', content: 'on ' },
      { type: 'label', content: requireProjectionPlaneName(world, element.planeId), elementId: element.planeId },
      { type: 'text', content: ' (connects to ' },
      { type: 'label', content: requireProjectionPlaneName(world, otherPlaneId), elementId: otherPlaneId },
      { type: 'text', content: ')' }
    ];
  }
}

/**
 * Descriptor for BrokenHalfHingeLine2D - 2D projection of broken hinge line
 * Phase 101: Shows broken hinge line trace and its distance transport relationship
 */
export class BrokenHalfHingeLine2DDescriptor implements ElementDescriptor<BrokenHalfHingeLine2D> {
  getTypeName(_element: BrokenHalfHingeLine2D): string {
    return 'Broken Hinge Line Trace';
  }
  
  getConstructionDescription(element: BrokenHalfHingeLine2D, world: World): DescriptionPart[] {
    const brokenHinge = world.getHingeLineById(element.hingeLineId) as BrokenHingeLine | undefined;
    if (!brokenHinge) throw new Error(`Descriptor invariant failed: broken hinge line not found: ${element.hingeLineId}`);
    
    // Get the sibling plane
    const siblingPlaneId = brokenHinge.plane1Id === element.planeId ? brokenHinge.plane2Id : brokenHinge.plane1Id;
    return [
      { type: 'text', content: 'on ' },
      { type: 'label', content: requireProjectionPlaneName(world, element.planeId), elementId: element.planeId },
      { type: 'text', content: ' (transports distances to ' },
      { type: 'label', content: requireProjectionPlaneName(world, siblingPlaneId), elementId: siblingPlaneId },
      { type: 'text', content: ')' }
    ];
  }
}
