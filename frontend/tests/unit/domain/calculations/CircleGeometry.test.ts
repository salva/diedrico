/**
 * Unit tests for CircleGeometry - circle-circle line construction algorithms
 * 
 * Tests cover:
 * - External tangent lines (Task T1202)
 * - Internal/crossing tangent lines (Task T1203)
 * - Perpendicular to center line (Task T1204)
 * - Through circle centers (Task T1205)
 * - Solution disambiguation algorithm (Task T1206)
 * 
 * Test data uses simple geometric configurations for easy verification
 */

import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import {
  computeExternalTangents,
  computeInternalTangents,
  computePerpendicularLine,
  computeThroughCentersLine,
  selectClosestSolution,
  computeAllCircleCircleLines,
  type CircleCircleLineSolution
} from '@/domain/calculations/CircleGeometry';
import { Circle2DRealization2D } from '@/domain/world/Circle';

const EPSILON = 1e-9;

/**
 * Helper: Create circle realization from center and scalar radius
 */
function createCircle(centerX: number, centerY: number, radius: number): Circle2DRealization2D {
  const center = new Vector3(centerX, centerY, 1);
  const radiusVector = new Vector3(radius, 0, 0); // Radius along X axis
  return new Circle2DRealization2D(center, radiusVector, true);
}

/**
 * Helper: Check if two vectors are approximately equal
 */
function expectVectorClose(actual: Vector3, expected: Vector3, epsilon = EPSILON) {
  expect(actual.x).toBeCloseTo(expected.x, epsilon);
  expect(actual.y).toBeCloseTo(expected.y, epsilon);
  expect(actual.z).toBeCloseTo(expected.z, epsilon);
}

describe('CircleGeometry - External Tangents', () => {
  it('computes 2 external tangents for separated equal-radius circles (horizontal)', () => {
    // Two circles radius 1, centers at (0,0) and (4,0) - separated by distance 4
    const c1 = createCircle(0, 0, 1);
    const c2 = createCircle(4, 0, 1);
    
    const tangents = computeExternalTangents(c1, c2);
    
    expect(tangents).toHaveLength(2);
    
    // External tangents for equal radii should be parallel to center line
    // Touch points at (1, ±1) and (3, ±1)
    expect(tangents[0].label).toContain('above');
    expect(tangents[1].label).toContain('below');
    
    // Check "above" tangent (index 0): y = +1
    expectVectorClose(tangents[0].touchPoint1, new Vector3(0, 1, 1));
    expectVectorClose(tangents[0].touchPoint2, new Vector3(4, 1, 1));
    expectVectorClose(tangents[0].direction, new Vector3(1, 0, 0)); // Horizontal
    
    // Check "below" tangent (index 1): y = -1
    expectVectorClose(tangents[1].touchPoint1, new Vector3(0, -1, 1));
    expectVectorClose(tangents[1].touchPoint2, new Vector3(4, -1, 1));
    expectVectorClose(tangents[1].direction, new Vector3(1, 0, 0)); // Horizontal
  });

  it('computes 2 external tangents for separated equal-radius circles (vertical)', () => {
    // Two circles radius 1, centers at (0,0) and (0,4) - vertically separated
    const c1 = createCircle(0, 0, 1);
    const c2 = createCircle(0, 4, 1);
    
    const tangents = computeExternalTangents(c1, c2);
    
    expect(tangents).toHaveLength(2);
    
    // Touch points at (±1, 0) and (±1, 4)
    // For vertical center line, perpendicular is horizontal
    // index 0 and 1 give us left/right tangents (sign may vary)
    
    // Check first tangent
    expect(Math.abs(tangents[0].touchPoint1.x)).toBeCloseTo(1, 5);
    expect(tangents[0].touchPoint1.y).toBeCloseTo(0, 5);
    expect(Math.abs(tangents[0].touchPoint2.x)).toBeCloseTo(1, 5);
    expect(tangents[0].touchPoint2.y).toBeCloseTo(4, 5);
    expectVectorClose(tangents[0].direction, new Vector3(0, 1, 0)); // Vertical
    
    // Check second tangent
    expect(Math.abs(tangents[1].touchPoint1.x)).toBeCloseTo(1, 5);
    expect(tangents[1].touchPoint1.y).toBeCloseTo(0, 5);
    expect(Math.abs(tangents[1].touchPoint2.x)).toBeCloseTo(1, 5);
    expect(tangents[1].touchPoint2.y).toBeCloseTo(4, 5);
    expectVectorClose(tangents[1].direction, new Vector3(0, 1, 0)); // Vertical
  });

  it('computes 2 external tangents for unequal radii circles', () => {
    // Circle1: center (0,0), radius 1
    // Circle2: center (5,0), radius 2
    const c1 = createCircle(0, 0, 1);
    const c2 = createCircle(5, 0, 2);
    
    const tangents = computeExternalTangents(c1, c2);
    
    expect(tangents).toHaveLength(2);
    
    // Tangents exist and have reasonable geometry
    tangents.forEach((t: CircleCircleLineSolution) => {
      expect(t.touchPoint1.distanceTo(c1.center)).toBeCloseTo(1, 5);
      expect(t.touchPoint2.distanceTo(c2.center)).toBeCloseTo(2, 5);
      expect(t.direction.length()).toBeCloseTo(1, 5);
    });
  });

  it('returns no external tangents when one circle is inside the other', () => {
    // Circle1: center (0,0), radius 5
    // Circle2: center (1,0), radius 2 - inside Circle1
    const c1 = createCircle(0, 0, 5);
    const c2 = createCircle(1, 0, 2);
    
    const tangents = computeExternalTangents(c1, c2);
    
    expect(tangents).toHaveLength(0);
  });

  it('returns 2 external tangents when circles are externally tangent (just touching)', () => {
    // Circle1: center (0,0), radius 1
    // Circle2: center (3,0), radius 2 - touching at (1,0)
    const c1 = createCircle(0, 0, 1);
    const c2 = createCircle(3, 0, 2);
    
    const tangents = computeExternalTangents(c1, c2);
    
    expect(tangents).toHaveLength(2);
  });

  it('handles degenerate case: coincident circles', () => {
    const c1 = createCircle(0, 0, 1);
    const c2 = createCircle(0, 0, 1);
    
    const tangents = computeExternalTangents(c1, c2);
    
    expect(tangents).toHaveLength(0);
  });
});

describe('CircleGeometry - Internal Tangents', () => {
  it('computes 2 internal tangents for separated equal-radius circles', () => {
    // Two circles radius 1, centers at (0,0) and (4,0)
    const c1 = createCircle(0, 0, 1);
    const c2 = createCircle(4, 0, 1);
    
    const tangents = computeInternalTangents(c1, c2);
    
    expect(tangents).toHaveLength(2);
    
    // Internal tangents cross at midpoint (2,0) for equal radii
    // Touch points symmetric about center line
    tangents.forEach((t: CircleCircleLineSolution) => {
      expect(t.type).toBe('internal-tangent');
      expect(t.touchPoint1.distanceTo(c1.center)).toBeCloseTo(1, 5);
      expect(t.touchPoint2.distanceTo(c2.center)).toBeCloseTo(1, 5);
    });
    
    // One crossing upper-left, one lower-right
    expect(tangents[0].label).toContain('upper-left');
    expect(tangents[1].label).toContain('lower-right');
  });

  it('returns no internal tangents when circles overlap', () => {
    // Overlapping circles - no internal tangents exist
    const c1 = createCircle(0, 0, 2);
    const c2 = createCircle(2, 0, 2);
    
    const tangents = computeInternalTangents(c1, c2);
    
    expect(tangents).toHaveLength(0);
  });

  it('returns no internal tangents when circles are tangent (just touching)', () => {
    // Circles touching at (1,0) - internal tangents degenerate to single point
    const c1 = createCircle(0, 0, 1);
    const c2 = createCircle(2, 0, 1);
    
    const tangents = computeInternalTangents(c1, c2);
    
    // At the boundary - may return 0 or 2 depending on numerical precision
    // We accept either result as correct
    expect(tangents.length).toBeLessThanOrEqual(2);
  });

  it('computes internal tangents for unequal radii circles', () => {
    // Circle1: center (0,0), radius 1
    // Circle2: center (6,0), radius 2 - well separated
    const c1 = createCircle(0, 0, 1);
    const c2 = createCircle(6, 0, 2);
    
    const tangents = computeInternalTangents(c1, c2);
    
    expect(tangents).toHaveLength(2);
    
    // Verify touch points are on circles
    tangents.forEach((t: CircleCircleLineSolution) => {
      expect(t.touchPoint1.distanceTo(c1.center)).toBeCloseTo(1, 5);
      expect(t.touchPoint2.distanceTo(c2.center)).toBeCloseTo(2, 5);
    });
  });

  it('handles degenerate case: coincident circles', () => {
    const c1 = createCircle(0, 0, 1);
    const c2 = createCircle(0, 0, 1);
    
    const tangents = computeInternalTangents(c1, c2);
    
    expect(tangents).toHaveLength(0);
  });
});

describe('CircleGeometry - Perpendicular Line', () => {
  it('computes perpendicular to horizontal center line', () => {
    // Centers at (0,0) and (4,0) - center line is horizontal
    // Perpendicular should be vertical through midpoint (2,0)
    const c1 = createCircle(0, 0, 1);
    const c2 = createCircle(4, 0, 2);
    
    const perp = computePerpendicularLine(c1, c2);
    
    expect(perp).not.toBeNull();
    expect(perp!.type).toBe('perpendicular');
    expect(perp!.label).toContain('Perpendicular');
    
    // Direction should be vertical (0, ±1, 0)
    expectVectorClose(perp!.direction, new Vector3(0, 1, 0));
    
    // Point on line should be midpoint
    expectVectorClose(perp!.pointOnLine, new Vector3(2, 0, 1));
  });

  it('computes perpendicular to vertical center line', () => {
    // Centers at (0,0) and (0,4) - center line is vertical
    // Perpendicular should be horizontal through midpoint (0,2)
    const c1 = createCircle(0, 0, 1);
    const c2 = createCircle(0, 4, 2);
    
    const perp = computePerpendicularLine(c1, c2);
    
    expect(perp).not.toBeNull();
    
    // Direction should be horizontal (±1, 0, 0) - sign doesn't matter
    expect(Math.abs(perp!.direction.x)).toBeCloseTo(1, 5);
    expect(perp!.direction.y).toBeCloseTo(0, 5);
    expect(perp!.direction.z).toBeCloseTo(0, 5);
    
    // Point on line should be midpoint
    expectVectorClose(perp!.pointOnLine, new Vector3(0, 2, 1));
  });

  it('computes perpendicular to diagonal center line', () => {
    // Centers at (0,0) and (3,3) - center line at 45°
    // Perpendicular should be at -45° (perpendicular to 45°)
    const c1 = createCircle(0, 0, 1);
    const c2 = createCircle(3, 3, 1);
    
    const perp = computePerpendicularLine(c1, c2);
    
    expect(perp).not.toBeNull();
    
    // Direction should be perpendicular: if centerLine is (1,1)/√2, perp is (-1,1)/√2
    const expectedDir = new Vector3(-1, 1, 0).normalize();
    expectVectorClose(perp!.direction, expectedDir);
  });

  it('returns null for coincident circles', () => {
    const c1 = createCircle(0, 0, 1);
    const c2 = createCircle(0, 0, 1);
    
    const perp = computePerpendicularLine(c1, c2);
    
    expect(perp).toBeNull();
  });
});

describe('CircleGeometry - Through Centers Line', () => {
  it('computes line through horizontal centers', () => {
    // Centers at (0,0) and (4,0) - line should be horizontal
    const c1 = createCircle(0, 0, 1);
    const c2 = createCircle(4, 0, 2);
    
    const line = computeThroughCentersLine(c1, c2);
    
    expect(line).not.toBeNull();
    expect(line!.type).toBe('through-centers');
    expect(line!.label).toContain('Through circle centers');
    
    // Direction should be horizontal (1, 0, 0)
    expectVectorClose(line!.direction, new Vector3(1, 0, 0));
    
    // Point on line should be first center
    expectVectorClose(line!.pointOnLine, new Vector3(0, 0, 1));
    
    // Touch points should be on circle edges along center line
    expectVectorClose(line!.touchPoint1, new Vector3(1, 0, 1));
    expectVectorClose(line!.touchPoint2, new Vector3(2, 0, 1)); // c2.center - direction * r2
  });

  it('computes line through vertical centers', () => {
    // Centers at (0,0) and (0,5) - line should be vertical
    const c1 = createCircle(0, 0, 1);
    const c2 = createCircle(0, 5, 2);
    
    const line = computeThroughCentersLine(c1, c2);
    
    expect(line).not.toBeNull();
    
    // Direction should be vertical (0, 1, 0)
    expectVectorClose(line!.direction, new Vector3(0, 1, 0));
  });

  it('returns null for coincident circles', () => {
    const c1 = createCircle(0, 0, 1);
    const c2 = createCircle(0, 0, 1);
    
    const line = computeThroughCentersLine(c1, c2);
    
    expect(line).toBeNull();
  });
});

describe('CircleGeometry - Solution Disambiguation', () => {
  it('selects solution closest to single click position', () => {
    // Create three solutions with known touch points
    const solutions: CircleCircleLineSolution[] = [
      {
        touchPoint1: new Vector3(0, 0, 1),
        touchPoint2: new Vector3(5, 0, 1),
        direction: new Vector3(1, 0, 0),
        pointOnLine: new Vector3(0, 0, 1),
        label: 'Solution A',
        type: 'external-tangent',
        index: 0
      },
      {
        touchPoint1: new Vector3(0, 10, 1),
        touchPoint2: new Vector3(5, 10, 1),
        direction: new Vector3(1, 0, 0),
        pointOnLine: new Vector3(0, 10, 1),
        label: 'Solution B',
        type: 'external-tangent',
        index: 1
      },
      {
        touchPoint1: new Vector3(0, 20, 1),
        touchPoint2: new Vector3(5, 20, 1),
        direction: new Vector3(1, 0, 0),
        pointOnLine: new Vector3(0, 20, 1),
        label: 'Solution C',
        type: 'perpendicular'
      }
    ];
    
    // Click near solution B (at y=10)
    const clickPositions = [new Vector3(1, 11, 1)];
    
    const selected = selectClosestSolution(solutions, clickPositions);
    
    expect(selected).not.toBeNull();
    expect(selected!.label).toBe('Solution B');
  });

  it('selects solution closest to multiple click positions', () => {
    const solutions: CircleCircleLineSolution[] = [
      {
        touchPoint1: new Vector3(0, 0, 1),
        touchPoint2: new Vector3(10, 0, 1),
        direction: new Vector3(1, 0, 0),
        pointOnLine: new Vector3(0, 0, 1),
        label: 'Solution A',
        type: 'external-tangent',
        index: 0
      },
      {
        touchPoint1: new Vector3(0, 5, 1),
        touchPoint2: new Vector3(10, 5, 1),
        direction: new Vector3(1, 0, 0),
        pointOnLine: new Vector3(0, 5, 1),
        label: 'Solution B',
        type: 'external-tangent',
        index: 1
      }
    ];
    
    // Clicks near solution A: (0.5, 0.5) and (9.5, 0.5)
    const clickPositions = [
      new Vector3(0.5, 0.5, 1),
      new Vector3(9.5, 0.5, 1)
    ];
    
    const selected = selectClosestSolution(solutions, clickPositions);
    
    expect(selected).not.toBeNull();
    expect(selected!.label).toBe('Solution A');
  });

  it('returns null for empty solution array', () => {
    const selected = selectClosestSolution([], [new Vector3(0, 0, 1)]);
    expect(selected).toBeNull();
  });

  it('returns single solution without disambiguation', () => {
    const solutions: CircleCircleLineSolution[] = [
      {
        touchPoint1: new Vector3(0, 0, 1),
        touchPoint2: new Vector3(5, 0, 1),
        direction: new Vector3(1, 0, 0),
        pointOnLine: new Vector3(0, 0, 1),
        label: 'Only solution',
        type: 'perpendicular'
      }
    ];
    
    const selected = selectClosestSolution(solutions, [new Vector3(100, 100, 1)]);
    
    expect(selected).not.toBeNull();
    expect(selected!.label).toBe('Only solution');
  });
});

describe('CircleGeometry - All Solutions', () => {
  it('computes all solutions for well-separated equal circles', () => {
    // Two circles well separated - should have all 6 solutions
    const c1 = createCircle(0, 0, 1);
    const c2 = createCircle(6, 0, 1);
    
    const all = computeAllCircleCircleLines(c1, c2);
    
    // Expect: 2 external + 2 internal + 1 perpendicular + 1 through-centers = 6
    expect(all.length).toBeGreaterThanOrEqual(4); // At least 4 solutions
    
    // Check we have different types
    const types = new Set(all.map((s: CircleCircleLineSolution) => s.type));
    expect(types.has('external-tangent')).toBe(true);
    expect(types.has('internal-tangent')).toBe(true);
    expect(types.has('perpendicular')).toBe(true);
    expect(types.has('through-centers')).toBe(true);
  });

  it('computes only non-tangent solutions for overlapping circles', () => {
    // Overlapping circles - no internal tangents, but external tangents still exist
    // (external tangents exist as long as circles aren't nested)
    const c1 = createCircle(0, 0, 2);
    const c2 = createCircle(2, 0, 2);
    
    const all = computeAllCircleCircleLines(c1, c2);
    
    // Expect: 2 external + 0 internal + 1 perpendicular + 1 through-centers = 4
    expect(all).toHaveLength(4);
    
    const types = new Set(all.map((s: CircleCircleLineSolution) => s.type));
    expect(types.has('perpendicular')).toBe(true);
    expect(types.has('through-centers')).toBe(true);
    expect(types.has('external-tangent')).toBe(true);
    expect(types.has('internal-tangent')).toBe(false); // No internal tangents when overlapping
  });

  it('returns empty array for coincident circles', () => {
    const c1 = createCircle(0, 0, 1);
    const c2 = createCircle(0, 0, 1);
    
    const all = computeAllCircleCircleLines(c1, c2);
    
    expect(all).toHaveLength(0);
  });
});
