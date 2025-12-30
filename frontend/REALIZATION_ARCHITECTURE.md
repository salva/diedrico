# Realization Architecture

## Overview

The **Realization System** is a lazy-evaluation caching mechanism for geometric calculations. It separates the *definition* of geometric objects (what they are) from their *realization* (computed coordinates).

## Key Concepts

### Definition vs. Realization

- **Definition**: The logical representation of a geometric object
  - `FreePoint2D`: Defined by direct coordinates `position: Vector3`
  - `IntersectionPoint2D`: Defined by `element1Id`, `element2Id`, `index`
  
- **Realization**: The computed position of an object
  - `Point2DRealization`: Computed 2D position in plane coordinates
  - `Point3DRealization`: Computed 3D position in space (reconstructed from projections)

### Lazy Evaluation with Caching

1. **On-demand calculation**: Realizations are only computed when requested
2. **Cached results**: Once computed, realizations are stored for fast repeated access
3. **Recursive dependencies**: Computing one realization may require computing others
4. **Cache invalidation**: When an object changes, its realization and dependents are invalidated

## Architecture Components

### 1. Realization Classes

```typescript
/**
 * Stores computed 2D position for a Point2D
 */
export class Point2DRealization {
  pointId: string;
  position: Vector3;  // Position in plane coordinates (u, v, 1)
  planeId: string;
  
  constructor(pointId: string, position: Vector3, planeId: string) {
    this.pointId = pointId;
    this.position = position;
    this.planeId = planeId;
  }
  
  getPosition(): Vector3 {
    return this.position;
  }
}

/**
 * Stores computed 3D position for a point
 */
export class Point3DRealization {
  pointId: string;
  position: Vector4;  // Position in 3D space (x, y, z, 1)
  
  constructor(pointId: string, position: Vector4) {
    this.pointId = pointId;
    this.position = position;
  }
  
  getPosition(): Vector4 {
    return this.position;
  }
}
```

### 2. RealizationContext Interface

This interface allows geometric objects to access other realizations during their computation:

```typescript
/**
 * Interface for accessing other realizations during calculation
 * Passed to realize() methods to allow recursive realization lookup
 */
export interface RealizationContext {
  getPoint2DRealization(pointId: string): Point2DRealization | undefined;
  getPoint3DRealization(pointId: string): Point3DRealization | undefined;
}
```

### 3. Point2D.realize() Method

Each point type implements `realize()` to compute its realization:

```typescript
abstract class Point2D {
  // ...
  abstract realize(context: RealizationContext): Point2DRealization;
}

class FreePoint2D extends Point2D {
  position: Vector3;  // Direct coordinates
  
  realize(context: RealizationContext): Point2DRealization {
    if (!this.id) {
      throw new Error('Cannot realize point without id');
    }
    // Free point: position is directly available
    return new Point2DRealization(
      this.id,
      this.position,
      this.planeId
    );
  }
}

class IntersectionPoint2D extends Point2D {
  element1Id: string;
  element2Id: string;
  index: number;
  
  realize(context: RealizationContext): Point2DRealization {
    if (!this.id) {
      throw new Error('Cannot realize point without id');
    }
    
    // TODO: Actual implementation will:
    // 1. Get realizations of element1 and element2 via context
    // 2. Compute their intersection points
    // 3. Return the point at this.index
    
    // For example (pseudocode):
    // const elem1Realization = context.getLineRealization(this.element1Id);
    // const elem2Realization = context.getLineRealization(this.element2Id);
    // const intersections = computeIntersection(elem1Realization, elem2Realization);
    // return new Point2DRealization(this.id, intersections[this.index], this.planeId);
    
    return new Point2DRealization(
      this.id,
      new Vector3(0, 0, 1),  // Placeholder
      this.planeId
    );
  }
}
```

### 4. World as RealizationContext

`World` implements the `RealizationContext` interface and manages both caches:

```typescript
export class World implements RealizationContext {
  // Dual cache system
  private point2DRealizations: Map<string, Point2DRealization>;  // 2D positions in plane coordinates
  private point3DRealizations: Map<string, Point3DRealization>;  // 3D positions reconstructed from projections
  
  constructor() {
    this.point2DRealizations = new Map();
    this.point3DRealizations = new Map();
    // ...
  }
  
  /**
   * Get the 2D realization for a point (cached or computed on-demand)
   */
  getPoint2DRealization(pointId: string): Point2DRealization | undefined {
    // 1. Check cache first
    let realization = this.point2DRealizations.get(pointId);
    if (realization) {
      return realization;
    }

    // 2. Not cached - compute it
    const point = this.points.get(pointId);
    if (!point) {
      return undefined;
    }

    // 3. Call realize() on the point, passing this World as context
    //    This allows the point to access other realizations if needed
    realization = point.realize(this);
    
    // 4. Cache the result
    this.point2DRealizations.set(pointId, realization);
    
    return realization;
  }
  
  /**
   * Get the 3D realization for a point (cached or computed on-demand)
   */
  getPoint3DRealization(pointId: string): Point3DRealization | undefined {
    // Check cache first
    let realization = this.point3DRealizations.get(pointId);
    if (realization) {
      return realization;
    }

    // TODO: Implement 3D reconstruction from 2D projections
    return undefined;
  }
  
  /**
   * Invalidate cached realizations for a point and all dependent points
   * Call this when a point's definition changes (e.g., user moves a point)
   */
  invalidateRealization(pointId: string): void {
    this.point2DRealizations.delete(pointId);
    this.point3DRealizations.delete(pointId);
    
    // TODO: Also invalidate dependent points
    // Need to track dependency graph to know which points depend on this one
  }
}
```

## Usage Examples

### Basic Usage

```typescript
const world = new World();

// Create a free point
const point = new FreePoint2D(new Vector3(10, 20, 1), 'plane_H');
world.addPoint(point);

// Get its realization - will compute and cache
const realization = world.getPoint2DRealization(point.id!);
console.log(realization.position); // Vector3(10, 20, 1)

// Get again - will return cached value (fast)
const cached = world.getPoint2DRealization(point.id!);
console.log(cached === realization); // true (same object)
```

### Recursive Dependencies (Future)

When `IntersectionPoint2D` is fully implemented:

```typescript
// Create two lines
const line1 = new Line2D(point1Id, point2Id, 'plane_H');
world.addLine(line1);

const line2 = new Line2D(point3Id, point4Id, 'plane_H');
world.addLine(line2);

// Create intersection point
const intersection = new IntersectionPoint2D(
  line1.id!,
  line2.id!,
  0,  // First intersection
  'plane_H'
);
world.addPoint(intersection);

// When we request the intersection's realization:
// 1. World checks cache - not found
// 2. Calls intersection.realize(this)
// 3. intersection.realize() calls context.getLine2DRealization(line1.id)
// 4. World checks cache for line1 - not found
// 5. Calls line1.realize(this)
// 6. line1.realize() calls context.getPoint2DRealization(point1Id)
// 7. World checks cache for point1 - found! Returns cached
// 8. ... continues recursively until all dependencies resolved
// 9. Final result cached at each level
```

### Cache Invalidation

```typescript
// Move a free point
const point = world.getPointById('point_1') as FreePoint2D;
point.position = new Vector3(30, 40, 1);

// Invalidate its realization
world.invalidateRealization(point.id!);

// Next access will recompute
const newRealization = world.getPoint2DRealization(point.id!);
console.log(newRealization.position); // Vector3(30, 40, 1)

// TODO: Also need to invalidate any dependent points
// e.g., lines that use this point, intersections of those lines, etc.
```

## Design Patterns Used

### 1. Lazy Evaluation
Realizations are only computed when requested, not when objects are created.

### 2. Memoization (Caching)
Once computed, results are cached to avoid redundant calculations.

### 3. Visitor Pattern
The `RealizationContext` interface acts as a visitor, allowing objects to request services from the World.

### 4. Strategy Pattern
Each point type implements its own `realize()` strategy.

## Benefits

1. **Performance**: Expensive calculations only done once and cached
2. **Simplicity**: Clean separation between definition and computation
3. **Flexibility**: Easy to add new element types with their own realization logic
4. **Correctness**: Recursive dependencies handled automatically
5. **Maintainability**: Clear contract via `RealizationContext` interface

## Future Work

### 1. Dependency Tracking

Track which objects depend on which:

```typescript
class World {
  private dependencies: Map<string, Set<string>>;  // id -> Set of dependent ids
  
  invalidateRealization(pointId: string): void {
    this.point2DRealizations.delete(pointId);
    this.point3DRealizations.delete(pointId);
    
    // Recursively invalidate dependents
    const dependents = this.dependencies.get(pointId);
    if (dependents) {
      for (const dependentId of dependents) {
        this.invalidateRealization(dependentId);
      }
    }
  }
}
```

### 2. Line and Circle Realizations

Extend the pattern to other geometric elements:

```typescript
export class Line2DRealization {
  lineId: string;
  start: Vector3;  // Realized start point
  end: Vector3;    // Realized end point
  planeId: string;
}

export class Circle2DRealization {
  circleId: string;
  center: Vector3;   // Realized center point
  radius: number;    // Computed radius
  planeId: string;
}

interface RealizationContext {
  getPoint2DRealization(pointId: string): Point2DRealization | undefined;
  getPoint3DRealization(pointId: string): Point3DRealization | undefined;
  getLine2DRealization(lineId: string): Line2DRealization | undefined;
  getCircle2DRealization(circleId: string): Circle2DRealization | undefined;
}
```

### 3. 3D Reconstruction

Implement full 3D reconstruction from 2D projections:

```typescript
getPoint3DRealization(pointId: string): Point3DRealization | undefined {
  // Check cache
  let realization = this.point3DRealizations.get(pointId);
  if (realization) {
    return realization;
  }

  // Get 2D realizations on both projection planes
  const point2D_H = this.getPoint2DRealization(pointId + '_H');
  const point2D_V = this.getPoint2DRealization(pointId + '_V');
  
  if (!point2D_H || !point2D_V) {
    return undefined;
  }
  
  // Reconstruct 3D position using dihedral projection rules
  const position3D = reconstruct3DFromProjections(
    point2D_H.position,
    point2D_V.position
  );
  
  realization = new Point3DRealization(pointId, position3D);
  this.point3DRealizations.set(pointId, realization);
  
  return realization;
}
```

### 4. Smart Invalidation

Only invalidate when definition actually changes:

```typescript
class FreePoint2D extends Point2D {
  private _position: Vector3;
  
  get position(): Vector3 {
    return this._position;
  }
  
  set position(newPosition: Vector3) {
    if (!newPosition.equals(this._position)) {
      this._position = newPosition;
      // Notify World to invalidate
      this.world?.invalidateRealization(this.id!);
    }
  }
}
```

## Migration Notes

### Before (Imperative System)

```typescript
// Old approach - manual realization
const point = new FreePoint2D(position, planeId);
world.addPoint(point);  // Immediately realizes
const realization = world.getPointRealization(point.id!);  // Direct cache lookup
```

### After (Declarative System)

```typescript
// New approach - lazy realization
const point = new FreePoint2D(position, planeId);
world.addPoint(point);  // Does NOT realize immediately
const realization = world.getPoint2DRealization(point.id!);  // Computes on first access, caches result
```

### Key Changes

1. `World.pointRealizations` → `World.point2DRealizations` and `World.point3DRealizations`
2. `World.realizePoint(point)` → removed (automatic via `getPoint2DRealization`)
3. `World.getPointRealization(id)` → `World.getPoint2DRealization(id)`
4. `Point2D` now has `abstract realize(context)` method
5. `World` implements `RealizationContext` interface

## Testing

All existing tests pass with the new system. The lazy evaluation is transparent to consumers - they still call `getPoint2DRealization()` and get a result, they just don't need to manually realize first.

```typescript
// Test example
it('should lazily compute and cache point realization', () => {
  const world = new World();
  const point = new FreePoint2D(new Vector3(10, 20, 1), 'plane_H');
  world.addPoint(point);
  
  // First access - computes
  const realization1 = world.getPoint2DRealization(point.id!);
  expect(realization1).toBeDefined();
  expect(realization1!.position.x).toBe(10);
  
  // Second access - cached
  const realization2 = world.getPoint2DRealization(point.id!);
  expect(realization2).toBe(realization1);  // Same object reference
});
```
