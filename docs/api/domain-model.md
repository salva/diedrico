# Domain Model API

Reference for the core domain classes.

## Element

Base class for all geometric objects.

```typescript
abstract class Element {
  id: string
  label: string
  visualStyle: VisualStyle
  abstract getDependencies(): string[]
}
```

## Element2D

2D elements tied to a projection plane.

```typescript
abstract class Element2D extends Element {
  planeId: string
  abstract realize2D(world: World): Element2DRealization2D
}
```

### Point2D Subclasses

```typescript
class FreePoint2D extends Point2D {
  u: number  // plane-intrinsic u coordinate
  v: number  // plane-intrinsic v coordinate
}

class Point2DLineLineIntersection extends IntersectionPoint2D {
  line1Id: string
  line2Id: string
}

class Point2DLineCircleIntersection extends IntersectionPoint2D {
  lineId: string
  circleId: string
  index: 0 | 1  // which of two intersection points
}

class Point2DCircleCircleIntersection extends IntersectionPoint2D {
  circle1Id: string
  circle2Id: string
  index: 0 | 1
}

class SiblingIntersectionPoint2D extends IntersectionPoint2D {
  originalIntersectionPointId: string
}
```

### Line2D Subclasses

```typescript
class Line2DByTwoPoints extends Line2D {
  point1Id: string
  point2Id: string
}

class Line2DParallel extends Line2D {
  referenceLineId: string
  throughPointId: string
}

class Line2DPerpendicularToLine extends Line2D {
  referenceLineId: string
  throughPointId: string
}

class Segment2DByPoints extends Line2D {
  point1Id: string
  point2Id: string
}
```

### Circle2D Subclasses

```typescript
class Circle2DByCenterAndPoint extends Circle2D {
  centerId: string
  radiusPointId: string
}
```

## Element3D

3D elements reconstructed from projections.

```typescript
abstract class Element3D extends Element {
  abstract realize3D(world: World): Element3DRealization3D
}
```

### Point3D

```typescript
class Point3DByCoordinates extends Point3D {
  x: number; y: number; z: number
}

class Point3DFromProjections extends Point3D {
  projection1PointId: string  // 2D point on plane 1
  projection2PointId: string  // 2D point on plane 2
  plane1Id: string
  plane2Id: string
}
```

### Line3D, Segment3D, Plane3D

```typescript
class Line3D extends Element3D {
  line1Id: string  // 2D line on plane 1
  line2Id: string  // 2D line on plane 2
}

class Segment3D extends Element3D {
  segment1Id: string
  segment2Id: string
}

class Plane3DFixed extends Plane3D {
  point: Vector4    // point on the plane
  normal: Vector4   // plane normal
}
```

## Realizations

### 2D Realizations

```typescript
class Point2DRealization2D extends Realization {
  position: Vector3  // (u, v, 1)
}

class Line2DRealization2D extends Realization {
  point1: Vector3  // origin or endpoint
  point2: Vector3  // direction (z=0) or endpoint (z=1)
}

class Circle2DRealization2D extends Realization {
  center: Vector3
  radiusVector: Vector3
}
```

### 3D Realizations

```typescript
class Point3DRealization3D extends Element3DRealization3D {
  position: Vector4  // (x, y, z, 1)
  getCartesian(): { x: number, y: number, z: number }
}

class Line3DRealization3D extends Element3DRealization3D {
  point: Vector4      // point on line
  direction: Vector4  // direction vector (w=0)
  getPointAt(t: number): Vector4
}

class Segment3DRealization3D extends Element3DRealization3D {
  startPoint: Vector4
  endPoint: Vector4
  getLength(): number
  getPointAt(t: number): Vector4
}

class Plane3DRealization3D extends Element3DRealization3D {
  equation: Vector4  // (a, b, c, d) → ax + by + cz + d = 0
  quaternion: THREE.Quaternion
  originPoint: Vector4
}
```

## World

```typescript
class World {
  // Collections
  projectionPlanes: Map<string, ProjectionPlane>
  hingeLines: Map<string, HingeLine>
  planes3D: Map<string, Plane3D>
  points3D: Map<string, Point3D>
  lines3D: Map<string, Line3D>
  segments3D: Map<string, Segment3D>

  // Realization access (cached)
  getPoint2DRealization(id: string): Point2DRealization2D
  getLine2DRealization(id: string): Line2DRealization2D
  getCircle2DRealization(id: string): Circle2DRealization2D
  getProjectionPlane2DRealization(id: string): ProjectionPlaneRealization2D
  getProjectionPlane3DRealization(id: string): ProjectionPlaneRealization3D

  // Element access
  getElement2D(id: string): Element2D | undefined
  getPoint2D(id: string): Point2D | undefined
  getLine2D(id: string): Line2D | undefined
  getCircle2D(id: string): Circle2D | undefined

  // Lifecycle
  initialize(commandStack: CommandStack): void
  markDirty(): void
  subscribeToChanges(listener: () => void): () => void
  getNextId(): number
}
```
