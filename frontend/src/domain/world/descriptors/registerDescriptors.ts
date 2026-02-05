/**
 * Phase 98: Dynamic Action Descriptions - Descriptor Registration
 * 
 * Registers all element descriptors at application startup.
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
  Line2DTangentToCircleParallelToLineDescriptor
} from './Line2DDescriptors';

import {
  Circle2DByCenterAndPointDescriptor,
  Circle2DByThreePointsDescriptor,
  Segment2DByPointsDescriptor,
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
  HingeLineDescriptor
} from './Element3DDescriptors';

// Import element classes
import { FreePoint2D, Point2DLineLineIntersection, Point2DLineCircleIntersection, Point2DCircleCircleIntersection, SiblingIntersectionPoint2D } from '../Point';
import { Line2DByTwoPoints, Line2DParallel, Line2DPerpendicularToLine, Line2DTangentToCircleThroughPoint, Line2DTangentToCircleParallelToLine } from '../Line';
import { Circle2DByCenterAndPoint, Circle2DByThreePoints } from '../Circle';
import { Segment2DByPoints } from '../Segment';
import { Guide2D, SiblingGuide2D } from '../Guide';
import { Point3DByCoordinates, Point3DFromProjections } from '../Point3D';
import { Line3DFromProjections } from '../Line3D';
import { Segment3DFromProjections } from '../Segment3D';
import { FixedProjectionPlane, AuxiliaryProjectionPlane } from '../ProjectionPlane';
import { Plane3DFixed, Plane3DFromTraces } from '../Plane';
import { HingeLine } from '../HingeLine';

/**
 * Register all descriptors with the registry.
 * Call this once at application startup (in main.ts).
 * 
 * Like loading a CSS stylesheet - establishes the mapping between
 * element types (HTML tags) and their presentation rules (CSS).
 */
export function registerAllDescriptors(): void {
  // 2D Points
  DescriptorRegistry.register(FreePoint2D, new FreePoint2DDescriptor());
  DescriptorRegistry.register(Point2DLineLineIntersection, new Point2DLineLineIntersectionDescriptor());
  DescriptorRegistry.register(Point2DLineCircleIntersection, new Point2DLineCircleIntersectionDescriptor());
  DescriptorRegistry.register(Point2DCircleCircleIntersection, new Point2DCircleCircleIntersectionDescriptor());
  DescriptorRegistry.register(SiblingIntersectionPoint2D, new SiblingIntersectionPoint2DDescriptor());
  
  // 2D Lines
  DescriptorRegistry.register(Line2DByTwoPoints, new Line2DByTwoPointsDescriptor());
  DescriptorRegistry.register(Line2DParallel, new Line2DParallelDescriptor());
  DescriptorRegistry.register(Line2DPerpendicularToLine, new Line2DPerpendicularToLineDescriptor());
  DescriptorRegistry.register(Line2DTangentToCircleThroughPoint, new Line2DTangentToCircleThroughPointDescriptor());
  DescriptorRegistry.register(Line2DTangentToCircleParallelToLine, new Line2DTangentToCircleParallelToLineDescriptor());
  
  // 2D Circles
  DescriptorRegistry.register(Circle2DByCenterAndPoint, new Circle2DByCenterAndPointDescriptor());
  DescriptorRegistry.register(Circle2DByThreePoints, new Circle2DByThreePointsDescriptor());
  
  // 2D Segments
  DescriptorRegistry.register(Segment2DByPoints, new Segment2DByPointsDescriptor());
  
  // 2D Guides
  DescriptorRegistry.register(Guide2D, new Guide2DDescriptor());
  DescriptorRegistry.register(SiblingGuide2D, new SiblingGuide2DDescriptor());
  
  // 3D Points
  DescriptorRegistry.register(Point3DByCoordinates, new Point3DByCoordinatesDescriptor());
  DescriptorRegistry.register(Point3DFromProjections, new Point3DFromProjectionsDescriptor());
  
  // 3D Lines
  DescriptorRegistry.register(Line3DFromProjections, new Line3DFromProjectionsDescriptor());
  DescriptorRegistry.register(HingeLine, new HingeLineDescriptor());
  
  // 3D Segments
  DescriptorRegistry.register(Segment3DFromProjections, new Segment3DFromProjectionsDescriptor());
  
  // 3D Planes
  DescriptorRegistry.register(Plane3DFixed, new Plane3DFixedDescriptor());
  DescriptorRegistry.register(Plane3DFromTraces, new Plane3DFromTracesDescriptor());
  
  // Projection Planes
  DescriptorRegistry.register(FixedProjectionPlane, new FixedProjectionPlaneDescriptor());
  DescriptorRegistry.register(AuxiliaryProjectionPlane, new AuxiliaryProjectionPlaneDescriptor());
}
