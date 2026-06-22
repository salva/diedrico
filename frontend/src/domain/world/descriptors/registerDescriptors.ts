/**
 * Phase 98: Dynamic Action Descriptions - Descriptor Registration
 * 
 * Populates an element descriptor registry for a runtime/test session.
 * Like loading a CSS stylesheet - maps element types to their presentation rules.
 */

import { DescriptorRegistry } from './DescriptorRegistry';

// Import all descriptor classes
import {
  FreePoint2DDescriptor,
  Point2DLineLineIntersectionDescriptor,
  Point2DLineCircleIntersectionDescriptor,
  Point2DCircleCircleIntersectionDescriptor,
  SiblingIntersectionPoint2DDescriptor
} from './Point2DDescriptors';

import {
  Line2DByTwoPointsDescriptor,
  Line2DParallelDescriptor,
  Line2DPerpendicularToLineDescriptor,
  Line2DTangentToCircleThroughPointDescriptor,
  Line2DTangentToCircleParallelToLineDescriptor,
  HalfHingeLine2DDescriptor,
  BrokenHalfHingeLine2DDescriptor
} from './Line2DDescriptors';

import {
  Circle2DByCenterAndPointDescriptor,
  Circle2DByThreePointsDescriptor,
  Segment2DDescriptor,
  Guide2DDescriptor,
  SiblingGuide2DDescriptor
} from './CircleSegmentGuideDescriptors';

import {
  Point3DByCoordinatesDescriptor,
  Point3DFromProjectionsDescriptor,
  Line3DFromProjectionsDescriptor,
  Segment3DFromProjectionsDescriptor,
  FixedProjectionPlaneDescriptor,
  AuxiliaryProjectionPlaneDescriptor,
  Plane3DFixedDescriptor,
  Plane3DFromTracesDescriptor,
  HingeLineDescriptor,
  BrokenHingeLineDescriptor
} from './Element3DDescriptors';

// Import element classes
import { FreePoint2D, Point2DLineLineIntersection, Point2DLineCircleIntersection, Point2DCircleCircleIntersection, SiblingIntersectionPoint2D } from '../Point';
import { Line2DByTwoPoints, Line2DParallel, Line2DPerpendicularToLine, Line2DTangentToCircleThroughPoint, Line2DTangentToCircleParallelToLine } from '../Line';
import { Circle2DByCenterAndPoint, Circle2DByThreePoints } from '../Circle';
import { Segment2D } from '../Segment';
import { Guide2D, SiblingGuide2D } from '../Guide';
import { Point3DByCoordinates, Point3DFromProjections } from '../Point3D';
import { Line3DFromProjections } from '../Line3D';
import { Segment3DFromProjections } from '../Segment3D';
import { FixedProjectionPlane } from '../projectionPlane/FixedProjectionPlane';
import { AuxiliaryProjectionPlane } from '../projectionPlane/AuxiliaryProjectionPlane';
import { Plane3DFixed, Plane3DFromTraces } from '../Plane';
import { HingeLine, HalfHingeLine2D } from '../HingeLine';
import { BrokenHingeLine } from '../BrokenHingeLine';
import { BrokenHalfHingeLine2D } from '../elements/BrokenHalfHingeLine2D';

/**
 * Register all descriptors with the supplied registry, or create and return a
 * new populated registry when none is supplied.
 * 
 * Like loading a CSS stylesheet - establishes the mapping between
 * element types (HTML tags) and their presentation rules (CSS).
 */
export function registerAllDescriptors(registry = new DescriptorRegistry()): DescriptorRegistry {
  // 2D Points
  registry.register(FreePoint2D, new FreePoint2DDescriptor());
  registry.register(Point2DLineLineIntersection, new Point2DLineLineIntersectionDescriptor());
  registry.register(Point2DLineCircleIntersection, new Point2DLineCircleIntersectionDescriptor());
  registry.register(Point2DCircleCircleIntersection, new Point2DCircleCircleIntersectionDescriptor());
  registry.register(SiblingIntersectionPoint2D, new SiblingIntersectionPoint2DDescriptor());
  
  // 2D Lines
  registry.register(Line2DByTwoPoints, new Line2DByTwoPointsDescriptor());
  registry.register(Line2DParallel, new Line2DParallelDescriptor());
  registry.register(Line2DPerpendicularToLine, new Line2DPerpendicularToLineDescriptor());
  registry.register(Line2DTangentToCircleThroughPoint, new Line2DTangentToCircleThroughPointDescriptor());
  registry.register(Line2DTangentToCircleParallelToLine, new Line2DTangentToCircleParallelToLineDescriptor());
  registry.register(HalfHingeLine2D, new HalfHingeLine2DDescriptor());
  registry.register(BrokenHalfHingeLine2D, new BrokenHalfHingeLine2DDescriptor());
  
  // 2D Circles
  registry.register(Circle2DByCenterAndPoint, new Circle2DByCenterAndPointDescriptor());
  registry.register(Circle2DByThreePoints, new Circle2DByThreePointsDescriptor());
  
  // 2D Segments
  registry.register(Segment2D, new Segment2DDescriptor());
  
  // 2D Guides
  registry.register(Guide2D, new Guide2DDescriptor());
  registry.register(SiblingGuide2D, new SiblingGuide2DDescriptor());
  
  // 3D Points
  registry.register(Point3DByCoordinates, new Point3DByCoordinatesDescriptor());
  registry.register(Point3DFromProjections, new Point3DFromProjectionsDescriptor());
  
  // 3D Lines
  registry.register(Line3DFromProjections, new Line3DFromProjectionsDescriptor());
  registry.register(HingeLine, new HingeLineDescriptor());
  registry.register(BrokenHingeLine, new BrokenHingeLineDescriptor());
  
  // 3D Segments
  registry.register(Segment3DFromProjections, new Segment3DFromProjectionsDescriptor());
  
  // 3D Planes
  registry.register(Plane3DFixed, new Plane3DFixedDescriptor());
  registry.register(Plane3DFromTraces, new Plane3DFromTracesDescriptor());
  
  // Projection Planes
  registry.register(FixedProjectionPlane, new FixedProjectionPlaneDescriptor());
  registry.register(AuxiliaryProjectionPlane, new AuxiliaryProjectionPlaneDescriptor());

  return registry;
}
