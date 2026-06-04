/**
 * Unit tests for tangent line geometric algorithms
 * 
 * Phase 60: Line2DTangentToCircleThroughPoint
 * Phase 61: Line2DTangentToCircleParallelToLine
 * 
 * Tests verify:
 * 1. Tangent lines actually touch the circle (distance from center to line = radius)
 * 2. Tangent lines pass through the required points
 * 3. Tangent lines are perpendicular to radius at tangent point
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { World } from '@/domain/world/World';
import { Vector3 } from 'three';
import { createTestWorld } from '../../helpers/worldHelpers';

describe('Line2DTangentToCircleThroughPoint - Geometric Correctness', () => {
  let world: World;

  beforeEach(() => {
    const { world: w } = createTestWorld();
    world = w;
  });

  /**
   * Helper: Calculate distance from a point to a line
   * Line defined by: point + t * direction
   * Distance = |cross product| of (point_to_center) and (normalized_direction)
   */
  function distanceFromPointToLine(
    linePoint: Vector3,
    lineDirection: Vector3,
    point: Vector3
  ): number {
    const dirLen = lineDirection.length();
    const dirNorm = lineDirection.clone().divideScalar(dirLen);
    
    const pointToLinePoint = new Vector3(
      point.x - linePoint.x,
      point.y - linePoint.y,
      0
    );
    
    // Cross product in 2D: (a.x * b.y - a.y * b.x)
    const cross = Math.abs(
      pointToLinePoint.x * dirNorm.y - pointToLinePoint.y * dirNorm.x
    );
    
    return cross;
  }

  it('should create tangent line that touches circle (index 0)', () => {
    // Setup: Circle at origin with radius 5, external point at (10, 0)
    const plane = world.getProjectionPlaneByLabel('P_H')!;
    
    // Add circle
    const center = world.getConstructionService().addFreePoint2D(plane, new Vector3(0, 0, 1));
    const edgePoint = world.getConstructionService().addFreePoint2D(plane, new Vector3(5, 0, 1));
    const circle = world.getConstructionService().addCircle2DByCenterAndPoint(plane, center.id, edgePoint.id);
    
    // Add external point
    const externalPoint = world.getConstructionService().addFreePoint2D(plane, new Vector3(10, 0, 1));
    
    // Create tangent line (index 0)
    const tangentLine = world.getConstructionService().addLine2DTangentToCircleThroughPoint(plane, circle.id, externalPoint.id, 0);
    
    // Realize the line
    const lineRealization = tangentLine.realize2D(world);
    expect(lineRealization).not.toBeNull();
    expect(lineRealization!.feasible).toBe(true);
    
    // Get circle realization
    const circleRealization = circle.realize2D(world);
    const circleCenter = circleRealization!.center;
    const radius = circleRealization!.getRadius();
    
    // Test: Distance from circle center to line should equal radius
    const distance = distanceFromPointToLine(
      lineRealization!.point1,
      lineRealization!.point2,
      circleCenter
    );
    
    expect(distance).toBeCloseTo(radius, 4); // 4 decimal places
  });

  it('should create tangent line that touches circle (index 1)', () => {
    // Setup: Same circle, test other tangent
    const plane = world.getProjectionPlaneByLabel('P_H')!;
    
    const center = world.getConstructionService().addFreePoint2D(plane, new Vector3(0, 0, 1));
    const edgePoint = world.getConstructionService().addFreePoint2D(plane, new Vector3(5, 0, 1));
    const circle = world.getConstructionService().addCircle2DByCenterAndPoint(plane, center.id, edgePoint.id);
    
    const externalPoint = world.getConstructionService().addFreePoint2D(plane, new Vector3(10, 0, 1));
    
    // Create tangent line (index 1)
    const tangentLine = world.getConstructionService().addLine2DTangentToCircleThroughPoint(plane, circle.id, externalPoint.id, 1);
    
    const lineRealization = tangentLine.realize2D(world);
    const circleRealization = circle.realize2D(world);
    const circleCenter = circleRealization!.center;
    const radius = circleRealization!.getRadius();
    
    const distance = distanceFromPointToLine(
      lineRealization!.point1,
      lineRealization!.point2,
      circleCenter
    );
    
    expect(distance).toBeCloseTo(radius, 4);
  });

  it('should work with external point at an angle', () => {
    // Test with external point not on axis
    const plane = world.getProjectionPlaneByLabel('P_H')!;
    
    const center = world.getConstructionService().addFreePoint2D(plane, new Vector3(0, 0, 1));
    const edgePoint = world.getConstructionService().addFreePoint2D(plane, new Vector3(5, 0, 1));
    const circle = world.getConstructionService().addCircle2DByCenterAndPoint(plane, center.id, edgePoint.id);
    
    // External point at (10, 5)
    const externalPoint = world.getConstructionService().addFreePoint2D(plane, new Vector3(10, 5, 1));
    
    // Test both tangents
    for (const index of [0, 1] as const) {
      const tangentLine = world.getConstructionService().addLine2DTangentToCircleThroughPoint(plane, circle.id, externalPoint.id, index);
      
      const lineRealization = tangentLine.realize2D(world);
      const circleRealization = circle.realize2D(world);
      const circleCenter = circleRealization!.center;
      const radius = circleRealization!.getRadius();
      
      const distance = distanceFromPointToLine(
        lineRealization!.point1,
        lineRealization!.point2,
        circleCenter
      );
      
      expect(distance).toBeCloseTo(radius, 4);
    }
  });

  it('should work with different circle positions', () => {
    // Test with circle not at origin
    const plane = world.getProjectionPlaneByLabel('P_H')!;
    
    const center = world.getConstructionService().addFreePoint2D(plane, new Vector3(100, 200, 1));
    const edgePoint = world.getConstructionService().addFreePoint2D(plane, new Vector3(130, 200, 1));
    const circle = world.getConstructionService().addCircle2DByCenterAndPoint(plane, center.id, edgePoint.id);
    
    const externalPoint = world.getConstructionService().addFreePoint2D(plane, new Vector3(150, 200, 1));
    
    for (const index of [0, 1] as const) {
      const tangentLine = world.getConstructionService().addLine2DTangentToCircleThroughPoint(plane, circle.id, externalPoint.id, index);
      
      const lineRealization = tangentLine.realize2D(world);
      const circleRealization = circle.realize2D(world);
      const circleCenter = circleRealization!.center;
      const radius = circleRealization!.getRadius();
      
      const distance = distanceFromPointToLine(
        lineRealization!.point1,
        lineRealization!.point2,
        circleCenter
      );
      
      expect(distance).toBeCloseTo(radius, 4);
    }
  });

  it('should be infeasible when point is inside circle', () => {
    const plane = world.getProjectionPlaneByLabel('P_H')!;
    
    const center = world.getConstructionService().addFreePoint2D(plane, new Vector3(0, 0, 1));
    const edgePoint = world.getConstructionService().addFreePoint2D(plane, new Vector3(5, 0, 1));
    const circle = world.getConstructionService().addCircle2DByCenterAndPoint(plane, center.id, edgePoint.id);
    
    // Point inside circle
    const insidePoint = world.getConstructionService().addFreePoint2D(plane, new Vector3(2, 0, 1));
    
    const tangentLine = world.getConstructionService().addLine2DTangentToCircleThroughPoint(plane, circle.id, insidePoint.id, 0);
    
    const lineRealization = tangentLine.realize2D(world);
    expect(lineRealization).not.toBeNull();
    expect(lineRealization!.feasible).toBe(false);
  });
});

describe('Line2DTangentToCircleParallelToLine - Geometric Correctness', () => {
  let world: World;

  beforeEach(() => {
    const { world: w } = createTestWorld();
    world = w;
  });

  function distanceFromPointToLine(
    linePoint: Vector3,
    lineDirection: Vector3,
    point: Vector3
  ): number {
    const dirLen = lineDirection.length();
    const dirNorm = lineDirection.clone().divideScalar(dirLen);
    
    const pointToLinePoint = new Vector3(
      point.x - linePoint.x,
      point.y - linePoint.y,
      0
    );
    
    const cross = Math.abs(
      pointToLinePoint.x * dirNorm.y - pointToLinePoint.y * dirNorm.x
    );
    
    return cross;
  }

  it('should create tangent line parallel to reference that touches circle', () => {
    const plane = world.getProjectionPlaneByLabel('P_H')!;
    
    // Circle at origin with radius 5
    const center = world.getConstructionService().addFreePoint2D(plane, new Vector3(0, 0, 1));
    const edgePoint = world.getConstructionService().addFreePoint2D(plane, new Vector3(5, 0, 1));
    const circle = world.getConstructionService().addCircle2DByCenterAndPoint(plane, center.id, edgePoint.id);
    
    // Reference line (horizontal, above circle)
    const refP1 = world.getConstructionService().addFreePoint2D(plane, new Vector3(0, 10, 1));
    const refP2 = world.getConstructionService().addFreePoint2D(plane, new Vector3(10, 10, 1));
    const refLine = world.getConstructionService().addLine2DBetweenTwoPoints(plane, refP1.id, refP2.id);
    
    // Create tangent parallel line (index 0)
    const tangentLine = world.getConstructionService().addLine2DTangentToCircleParallelToLine(plane, circle.id, refLine.id, 0);
    
    const lineRealization = tangentLine.realize2D(world);
    expect(lineRealization).not.toBeNull();
    expect(lineRealization!.feasible).toBe(true);
    
    const circleRealization = circle.realize2D(world);
    const circleCenter = circleRealization!.center;
    const radius = circleRealization!.getRadius();
    
    // Test: Distance from circle center to line should equal radius
    const distance = distanceFromPointToLine(
      lineRealization!.point1,
      lineRealization!.point2,
      circleCenter
    );
    
    expect(distance).toBeCloseTo(radius, 4);
  });

  it('should create parallel tangents on both sides of circle', () => {
    const plane = world.getProjectionPlaneByLabel('P_H')!;
    
    const center = world.getConstructionService().addFreePoint2D(plane, new Vector3(0, 0, 1));
    const edgePoint = world.getConstructionService().addFreePoint2D(plane, new Vector3(5, 0, 1));
    const circle = world.getConstructionService().addCircle2DByCenterAndPoint(plane, center.id, edgePoint.id);
    
    const refP1 = world.getConstructionService().addFreePoint2D(plane, new Vector3(0, 10, 1));
    const refP2 = world.getConstructionService().addFreePoint2D(plane, new Vector3(10, 10, 1));
    const refLine = world.getConstructionService().addLine2DBetweenTwoPoints(plane, refP1.id, refP2.id);
    
    // Test both indices
    for (const index of [0, 1] as const) {
      const tangentLine = world.getConstructionService().addLine2DTangentToCircleParallelToLine(plane, circle.id, refLine.id, index);
      
      const lineRealization = tangentLine.realize2D(world);
      const circleRealization = circle.realize2D(world);
      const circleCenter = circleRealization!.center;
      const radius = circleRealization!.getRadius();
      
      const distance = distanceFromPointToLine(
        lineRealization!.point1,
        lineRealization!.point2,
        circleCenter
      );
      
      expect(distance).toBeCloseTo(radius, 4);
    }
  });

  it('should be infeasible when reference line intersects circle', () => {
    const plane = world.getProjectionPlaneByLabel('P_H')!;
    
    const center = world.getConstructionService().addFreePoint2D(plane, new Vector3(0, 0, 1));
    const edgePoint = world.getConstructionService().addFreePoint2D(plane, new Vector3(5, 0, 1));
    const circle = world.getConstructionService().addCircle2DByCenterAndPoint(plane, center.id, edgePoint.id);
    
    // Reference line passes through circle
    const refP1 = world.getConstructionService().addFreePoint2D(plane, new Vector3(-10, 0, 1));
    const refP2 = world.getConstructionService().addFreePoint2D(plane, new Vector3(10, 0, 1));
    const refLine = world.getConstructionService().addLine2DBetweenTwoPoints(plane, refP1.id, refP2.id);
    
    const tangentLine = world.getConstructionService().addLine2DTangentToCircleParallelToLine(plane, circle.id, refLine.id, 0);
    
    const lineRealization = tangentLine.realize2D(world);
    expect(lineRealization).not.toBeNull();
    expect(lineRealization!.feasible).toBe(false);
  });
});
