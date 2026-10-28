/**
 * Phase 98: Dynamic Action Descriptions - 3D Element Descriptors
 * 
 * Descriptors for 3D points, lines, segments, and projection planes.
 * Separated from domain classes to keep geometry pure.
 */

import type { ElementDescriptor } from './ElementDescriptor';
import type { DescriptionPart } from './DescriptionPart';
import type { World } from '../World';
import type { Point3DByCoordinates, Point3DByPlaneNormalOffset, Point3DFromProjectionOnPlane, Point3DFromProjections } from '../Point3D';
import type { Line3DFromProjections } from '../Line3D';
import type { Segment3DByPoints, Segment3DFromProjections } from '../Segment3D';
import type { FixedProjectionPlane } from '../projectionPlane/FixedProjectionPlane';
import type { AuxiliaryProjectionPlane } from '../projectionPlane/AuxiliaryProjectionPlane';
import type { Plane3DFixed, Plane3DFromTraces } from '../Plane';
import type { HingeLine } from '../HingeLine';
import type { BrokenHingeLine } from '../BrokenHingeLine';
import { GeometryElementLookup } from '../GeometryElementLookup';

function requireProjectionPlaneName(world: World, planeId: string): string {
  const plane = world.getProjectionPlaneById(planeId);
  if (!plane) throw new Error(`Descriptor invariant failed: projection plane not found: ${planeId}`);
  return plane.label || plane.name;
}

function requireProjectionPlane(world: World, planeId: string) {
  const plane = world.getProjectionPlaneById(planeId);
  if (!plane) throw new Error(`Descriptor invariant failed: projection plane not found: ${planeId}`);
  return plane;
}

function requireElementLabel(world: World, elementId: string): string {
  const element = new GeometryElementLookup(world).getElement2D(elementId);
  if (!element) throw new Error(`Descriptor invariant failed: 2D element not found: ${elementId}`);
  return element.label || elementId;
}

/**
 * Descriptor for Point3DByCoordinates - free 3D point defined by coordinates
 */
export class Point3DByCoordinatesDescriptor implements ElementDescriptor<Point3DByCoordinates> {
  getTypeName(_element: Point3DByCoordinates): string {
    return 'Point';
  }
  
  getConstructionDescription(_element: Point3DByCoordinates, _world: World): DescriptionPart[] {
    return [{ type: 'text', content: 'free 3D point' }];
  }
}

/**
 * Descriptor for Point3DFromProjections - 3D point from projections on two planes
 */
export class Point3DFromProjectionsDescriptor implements ElementDescriptor<Point3DFromProjections> {
  getTypeName(_element: Point3DFromProjections): string {
    return 'Point';
  }
  
  getConstructionDescription(element: Point3DFromProjections, world: World): DescriptionPart[] {
    const proj1Label = requireElementLabel(world, element.projection1);
    const proj2Label = requireElementLabel(world, element.projection2);
    const plane1Name = requireProjectionPlaneName(world, element.plane1Id);
    const plane2Name = requireProjectionPlaneName(world, element.plane2Id);
    
    return [
      { type: 'text', content: 'from projections ' },
      { type: 'label', content: proj1Label, elementId: element.projection1 },
      { type: 'text', content: ' on ' },
      { type: 'label', content: plane1Name, elementId: element.plane1Id },
      { type: 'text', content: ' and ' },
      { type: 'label', content: proj2Label, elementId: element.projection2 },
      { type: 'text', content: ' on ' },
      { type: 'label', content: plane2Name, elementId: element.plane2Id }
    ];
  }
}

export class Point3DFromProjectionOnPlaneDescriptor implements ElementDescriptor<Point3DFromProjectionOnPlane> {
  getTypeName(_element: Point3DFromProjectionOnPlane): string {
    return 'Point';
  }

  getConstructionDescription(element: Point3DFromProjectionOnPlane, world: World): DescriptionPart[] {
    const projectionLabel = requireElementLabel(world, element.projectionPointId);
    const planeName = requireProjectionPlaneName(world, element.planeId);

    return [
      { type: 'text', content: 'lifted from ' },
      { type: 'label', content: projectionLabel, elementId: element.projectionPointId },
      { type: 'text', content: ' on true plane ' },
      { type: 'label', content: planeName, elementId: element.planeId },
    ];
  }
}

export class Point3DByPlaneNormalOffsetDescriptor implements ElementDescriptor<Point3DByPlaneNormalOffset> {
  getTypeName(_element: Point3DByPlaneNormalOffset): string {
    return 'Point';
  }

  getConstructionDescription(element: Point3DByPlaneNormalOffset, world: World): DescriptionPart[] {
    const foot = world.get3DPoint(element.footPoint3DId);
    const plane = world.get3DPlane(element.plane3DId);
    const distanceLabel = requireElementLabel(world, element.distanceSegmentId);
    const distancePlaneName = requireProjectionPlaneName(world, element.distancePlaneId);

    return [
      { type: 'text', content: 'normal offset from ' },
      { type: 'label', content: foot?.label || element.footPoint3DId, elementId: element.footPoint3DId },
      { type: 'text', content: ' to plane ' },
      { type: 'label', content: plane?.label || element.plane3DId, elementId: element.plane3DId },
      { type: 'text', content: ' by distance ' },
      { type: 'label', content: distanceLabel, elementId: element.distanceSegmentId },
      { type: 'text', content: ' on ' },
      { type: 'label', content: distancePlaneName, elementId: element.distancePlaneId },
    ];
  }
}

/**
 * Descriptor for Line3DFromProjections - 3D line from projections on two planes
 */
export class Line3DFromProjectionsDescriptor implements ElementDescriptor<Line3DFromProjections> {
  getTypeName(_element: Line3DFromProjections): string {
    return 'Line';
  }
  
  getConstructionDescription(element: Line3DFromProjections, world: World): DescriptionPart[] {
    const proj1Label = requireElementLabel(world, element.projection1);
    const proj2Label = requireElementLabel(world, element.projection2);
    const plane1Name = requireProjectionPlaneName(world, element.plane1Id);
    const plane2Name = requireProjectionPlaneName(world, element.plane2Id);
    
    return [
      { type: 'text', content: 'from projections ' },
      { type: 'label', content: proj1Label, elementId: element.projection1 },
      { type: 'text', content: ' on ' },
      { type: 'label', content: plane1Name, elementId: element.plane1Id },
      { type: 'text', content: ' and ' },
      { type: 'label', content: proj2Label, elementId: element.projection2 },
      { type: 'text', content: ' on ' },
      { type: 'label', content: plane2Name, elementId: element.plane2Id }
    ];
  }
}

/**
 * Descriptor for Segment3DFromProjections - 3D segment from projections on two planes
 */
export class Segment3DFromProjectionsDescriptor implements ElementDescriptor<Segment3DFromProjections> {
  getTypeName(_element: Segment3DFromProjections): string {
    return 'Segment';
  }
  
  getConstructionDescription(element: Segment3DFromProjections, world: World): DescriptionPart[] {
    const proj1Label = requireElementLabel(world, element.projection1);
    const proj2Label = requireElementLabel(world, element.projection2);
    const plane1Name = requireProjectionPlaneName(world, element.plane1Id);
    const plane2Name = requireProjectionPlaneName(world, element.plane2Id);
    
    return [
      { type: 'text', content: 'from projections ' },
      { type: 'label', content: proj1Label, elementId: element.projection1 },
      { type: 'text', content: ' on ' },
      { type: 'label', content: plane1Name, elementId: element.plane1Id },
      { type: 'text', content: ' and ' },
      { type: 'label', content: proj2Label, elementId: element.projection2 },
      { type: 'text', content: ' on ' },
      { type: 'label', content: plane2Name, elementId: element.plane2Id }
    ];
  }
}

export class Segment3DByPointsDescriptor implements ElementDescriptor<Segment3DByPoints> {
  getTypeName(_element: Segment3DByPoints): string {
    return 'Segment';
  }

  getConstructionDescription(element: Segment3DByPoints, world: World): DescriptionPart[] {
    const start = world.get3DPoint(element.startPoint3DId);
    const end = world.get3DPoint(element.endPoint3DId);

    return [
      { type: 'text', content: 'between 3D points ' },
      { type: 'label', content: start?.label || element.startPoint3DId, elementId: element.startPoint3DId },
      { type: 'text', content: ' and ' },
      { type: 'label', content: end?.label || element.endPoint3DId, elementId: element.endPoint3DId },
    ];
  }
}

/**
 * Descriptor for FixedProjectionPlane - standard horizontal/vertical projection plane
 */
export class FixedProjectionPlaneDescriptor implements ElementDescriptor<FixedProjectionPlane> {
  getTypeName(_element: FixedProjectionPlane): string {
    return 'Projection Plane';
  }
  
  getConstructionDescription(_element: FixedProjectionPlane, _world: World): DescriptionPart[] {
    return [{ type: 'text', content: 'fixed' }];
  }
}

/**
 * Descriptor for AuxiliaryProjectionPlane - user-defined auxiliary projection plane
 */
export class AuxiliaryProjectionPlaneDescriptor implements ElementDescriptor<AuxiliaryProjectionPlane> {
  getTypeName(_element: AuxiliaryProjectionPlane): string {
    return 'Projection Plane';
  }
  
  getConstructionDescription(element: AuxiliaryProjectionPlane, world: World): DescriptionPart[] {
    const lookup = new GeometryElementLookup(world);
    const t1 = lookup.getElement2D(element.t1HingeTraceId);
    const t2 = lookup.getElement2D(element.t2OtherTraceId);
    const t2Prime = lookup.getElement2D(element.t2PrimeLineId);
    if (!t1) throw new Error(`Descriptor invariant failed: hinge trace not found: ${element.t1HingeTraceId}`);
    if (!t2) throw new Error(`Descriptor invariant failed: other trace not found: ${element.t2OtherTraceId}`);
    if (!t2Prime) throw new Error(`Descriptor invariant failed: position trace not found: ${element.t2PrimeLineId}`);
    
    const basePlane = requireProjectionPlane(world, t1.planeId);
    const basePlaneName = basePlane.label || basePlane.name;

    return [
      { type: 'text', content: 'auxiliary, base plane ' },
      { type: 'label', content: basePlaneName, elementId: basePlane.id },
      { type: 'text', content: ', hinge trace ' },
      { type: 'label', content: t1.label || element.t1HingeTraceId, elementId: element.t1HingeTraceId },
      { type: 'text', content: ', other trace ' },
      { type: 'label', content: t2.label || element.t2OtherTraceId, elementId: element.t2OtherTraceId },
      { type: 'text', content: ', position trace ' },
      { type: 'label', content: t2Prime.label || element.t2PrimeLineId, elementId: element.t2PrimeLineId }
    ];
  }
}

/**
 * Descriptor for Plane3DFixed - fixed 3D plane defined by point and normal
 */
export class Plane3DFixedDescriptor implements ElementDescriptor<Plane3DFixed> {
  getTypeName(_element: Plane3DFixed): string {
    return 'Plane';
  }
  
  getConstructionDescription(_element: Plane3DFixed, _world: World): DescriptionPart[] {
    return [{ type: 'text', content: 'fixed 3D' }];
  }
}

/**
 * Descriptor for Plane3DFromTraces - 3D plane from two trace lines
 */
export class Plane3DFromTracesDescriptor implements ElementDescriptor<Plane3DFromTraces> {
  getTypeName(_element: Plane3DFromTraces): string {
    return 'Plane';
  }
  
  getConstructionDescription(element: Plane3DFromTraces, world: World): DescriptionPart[] {
    const trace1Label = requireElementLabel(world, element.trace1);
    const trace2Label = requireElementLabel(world, element.trace2);
    const plane1Name = requireProjectionPlaneName(world, element.plane1Id);
    const plane2Name = requireProjectionPlaneName(world, element.plane2Id);
    
    return [
      { type: 'text', content: 'from traces ' },
      { type: 'label', content: trace1Label, elementId: element.trace1 },
      { type: 'text', content: ' on ' },
      { type: 'label', content: plane1Name, elementId: element.plane1Id },
      { type: 'text', content: ' and ' },
      { type: 'label', content: trace2Label, elementId: element.trace2 },
      { type: 'text', content: ' on ' },
      { type: 'label', content: plane2Name, elementId: element.plane2Id }
    ];
  }
}

/**
 * Descriptor for HingeLine - line of intersection between two projection planes
 */
export class HingeLineDescriptor implements ElementDescriptor<HingeLine> {
  getTypeName(_element: HingeLine): string {
    return 'Hinge Line';
  }
  
  getConstructionDescription(element: HingeLine, world: World): DescriptionPart[] {
    const plane1Name = requireProjectionPlaneName(world, element.plane1Id);
    const plane2Name = requireProjectionPlaneName(world, element.plane2Id);
    
    return [
      { type: 'text', content: 'intersection of ' },
      { type: 'label', content: plane1Name, elementId: element.plane1Id },
      { type: 'text', content: ' and ' },
      { type: 'label', content: plane2Name, elementId: element.plane2Id }
    ];
  }
}

/**
 * Descriptor for BrokenHingeLine - distance transport between auxiliary plane traces
 * Phase 101: Shows connection between auxiliary and other planes via main hinge
 */
export class BrokenHingeLineDescriptor implements ElementDescriptor<BrokenHingeLine> {
  getTypeName(_element: BrokenHingeLine): string {
    return 'Broken Hinge Line';
  }
  
  getConstructionDescription(element: BrokenHingeLine, world: World): DescriptionPart[] {
    const plane1Name = requireProjectionPlaneName(world, element.plane1Id);
    const plane2Name = requireProjectionPlaneName(world, element.plane2Id);
    
    return [
      { type: 'text', content: 'distance transport between ' },
      { type: 'label', content: plane1Name, elementId: element.plane1Id },
      { type: 'text', content: ' and ' },
      { type: 'label', content: plane2Name, elementId: element.plane2Id }
    ];
  }
}
