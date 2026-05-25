/**
 * Phase 98: Dynamic Action Descriptions - 3D Element Descriptors
 * 
 * Descriptors for 3D points, lines, segments, and projection planes.
 * Separated from domain classes to keep geometry pure.
 */

import type { ElementDescriptor } from './ElementDescriptor';
import type { DescriptionPart } from './DescriptionPart';
import type { World } from '../World';
import type { Point3DByCoordinates, Point3DFromProjections } from '../Point3D';
import type { Line3DFromProjections } from '../Line3D';
import type { Segment3DFromProjections } from '../Segment3D';
import type { FixedProjectionPlane } from '../projectionPlane/FixedProjectionPlane';
import type { AuxiliaryProjectionPlane } from '../projectionPlane/AuxiliaryProjectionPlane';
import type { Plane3DFixed, Plane3DFromTraces } from '../Plane';
import type { HingeLine } from '../HingeLine';
import type { BrokenHingeLine } from '../BrokenHingeLine';

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
    const proj1 = world.getElement2D(element.projection1);
    const proj2 = world.getElement2D(element.projection2);
    
    // Get projection planes
    const plane1 = world.getProjectionPlaneById(element.plane1Id);
    const plane2 = world.getProjectionPlaneById(element.plane2Id);
    
    return [
      { type: 'text', content: 'from projections ' },
      { type: 'label', content: proj1?.label || element.projection1, elementId: element.projection1 },
      { type: 'text', content: ' on ' },
      { type: 'label', content: plane1?.label || plane1?.name || element.plane1Id, elementId: element.plane1Id },
      { type: 'text', content: ' and ' },
      { type: 'label', content: proj2?.label || element.projection2, elementId: element.projection2 },
      { type: 'text', content: ' on ' },
      { type: 'label', content: plane2?.label || plane2?.name || element.plane2Id, elementId: element.plane2Id }
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
    const proj1 = world.getElement2D(element.projection1);
    const proj2 = world.getElement2D(element.projection2);
    
    // Get projection planes
    const plane1 = world.getProjectionPlaneById(element.plane1Id);
    const plane2 = world.getProjectionPlaneById(element.plane2Id);
    
    return [
      { type: 'text', content: 'from projections ' },
      { type: 'label', content: proj1?.label || element.projection1, elementId: element.projection1 },
      { type: 'text', content: ' on ' },
      { type: 'label', content: plane1?.label || plane1?.name || element.plane1Id, elementId: element.plane1Id },
      { type: 'text', content: ' and ' },
      { type: 'label', content: proj2?.label || element.projection2, elementId: element.projection2 },
      { type: 'text', content: ' on ' },
      { type: 'label', content: plane2?.label || plane2?.name || element.plane2Id, elementId: element.plane2Id }
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
    const proj1 = world.getElement2D(element.projection1);
    const proj2 = world.getElement2D(element.projection2);
    
    // Get projection planes
    const plane1 = world.getProjectionPlaneById(element.plane1Id);
    const plane2 = world.getProjectionPlaneById(element.plane2Id);
    
    return [
      { type: 'text', content: 'from projections ' },
      { type: 'label', content: proj1?.label || element.projection1, elementId: element.projection1 },
      { type: 'text', content: ' on ' },
      { type: 'label', content: plane1?.label || plane1?.name || element.plane1Id, elementId: element.plane1Id },
      { type: 'text', content: ' and ' },
      { type: 'label', content: proj2?.label || element.projection2, elementId: element.projection2 },
      { type: 'text', content: ' on ' },
      { type: 'label', content: plane2?.label || plane2?.name || element.plane2Id, elementId: element.plane2Id }
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
    const t1 = world.getElement2D(element.t1HingeTraceId);
    const t2 = world.getElement2D(element.t2OtherTraceId);
    const t2Prime = world.getElement2D(element.t2PrimeLineId);
    
    // Get the base plane (where T1 is located)
    const basePlane = t1 ? world.getProjectionPlaneById(t1.planeId) : undefined;
    const basePlaneName = basePlane?.label || basePlane?.name || (t1 ? t1.planeId : 'unknown');
    
    // Get hinge line (T1 is associated with a hinge line)
    // We need to find the hinge line that T1 is part of
    const hingeLine = world.getAllHingeLines().find(hl => {
      const halfHingeLines = basePlane ? world.getHalfHingeLines2D(basePlane.id!) : [];
      return halfHingeLines.some(hhl => 
        (hhl as any).hingeLineId === hl.id && hhl.id === element.t1HingeTraceId
      );
    });
    
    return [
      { type: 'text', content: 'auxiliary, base plane ' },
      { type: 'label', content: basePlaneName, elementId: basePlane?.id || '' },
      { type: 'text', content: ', hinge line ' },
      { type: 'label', content: hingeLine?.label || 'HL', elementId: hingeLine?.id || '' },
      { type: 'text', content: ', traces ' },
      { type: 'label', content: t1?.label || element.t1HingeTraceId, elementId: element.t1HingeTraceId },
      { type: 'text', content: ', ' },
      { type: 'label', content: t2?.label || element.t2OtherTraceId, elementId: element.t2OtherTraceId },
      { type: 'text', content: ', ' },
      { type: 'label', content: t2Prime?.label || element.t2PrimeLineId, elementId: element.t2PrimeLineId }
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
    const trace1 = world.getElement2D(element.trace1);
    const trace2 = world.getElement2D(element.trace2);
    
    const plane1 = world.getProjectionPlaneById(element.plane1Id);
    const plane2 = world.getProjectionPlaneById(element.plane2Id);
    
    return [
      { type: 'text', content: 'from traces ' },
      { type: 'label', content: trace1?.label || element.trace1, elementId: element.trace1 },
      { type: 'text', content: ' on ' },
      { type: 'label', content: plane1?.label || plane1?.name || element.plane1Id, elementId: element.plane1Id },
      { type: 'text', content: ' and ' },
      { type: 'label', content: trace2?.label || element.trace2, elementId: element.trace2 },
      { type: 'text', content: ' on ' },
      { type: 'label', content: plane2?.label || plane2?.name || element.plane2Id, elementId: element.plane2Id }
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
    const plane1 = world.getProjectionPlaneById(element.plane1Id);
    const plane2 = world.getProjectionPlaneById(element.plane2Id);
    
    return [
      { type: 'text', content: 'intersection of ' },
      { type: 'label', content: plane1?.label || plane1?.name || element.plane1Id, elementId: element.plane1Id },
      { type: 'text', content: ' and ' },
      { type: 'label', content: plane2?.label || plane2?.name || element.plane2Id, elementId: element.plane2Id }
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
    const plane1 = world.getProjectionPlaneById(element.plane1Id);
    const plane2 = world.getProjectionPlaneById(element.plane2Id);
    
    return [
      { type: 'text', content: 'distance transport between ' },
      { type: 'label', content: plane1?.label || plane1?.name || element.plane1Id, elementId: element.plane1Id },
      { type: 'text', content: ' and ' },
      { type: 'label', content: plane2?.label || plane2?.name || element.plane2Id, elementId: element.plane2Id }
    ];
  }
}

