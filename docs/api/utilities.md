# Utilities API

Reference for math and geometry utilities.

## Vector & Matrix Types

Defined in `frontend/src/domain/math/`:

```typescript
type Vector3 = [number, number, number]     // 2D homogeneous
type Vector4 = [number, number, number, number]  // 3D homogeneous
type Matrix3 = [Vector3, Vector3, Vector3]   // 3×3
type Matrix4x3 = [Vector4, Vector4, Vector4] // 4×3 (plane→3D)
type Matrix3x4 = [Vector3, Vector3, Vector3, Vector3] // 3×4 (3D→plane)
```

## Homogeneous Coordinate Conventions

| Entity | w/z component | Example |
|--------|--------------|---------|
| 2D Point | z = 1 | `[3.5, 2.0, 1]` |
| 2D Direction | z = 0 | `[1.0, 0.0, 0]` |
| 3D Point | w = 1 | `[1.0, 2.0, 3.0, 1]` |
| 3D Direction | w = 0 | `[0.0, 1.0, 0.0, 0]` |

## Math Operations

### Vector3 operations (`vector3.ts`)

```typescript
function addVector3(a: Vector3, b: Vector3): Vector3
function subtractVector3(a: Vector3, b: Vector3): Vector3
function scaleVector3(v: Vector3, s: number): Vector3
function dotVector3(a: Vector3, b: Vector3): number
function crossVector3(a: Vector3, b: Vector3): Vector3
function normalizeVector3(v: Vector3): Vector3
function lengthVector3(v: Vector3): number
```

### Vector4 operations

```typescript
function addVector4(a: Vector4, b: Vector4): Vector4
function subtractVector4(a: Vector4, b: Vector4): Vector4
function scaleVector4(v: Vector4, s: number): Vector4
function dotVector4(a: Vector4, b: Vector4): number
function normalizeVector4(v: Vector4): Vector4
```

### Matrix operations

```typescript
function multiplyMatrix3(a: Matrix3, b: Matrix3): Matrix3
function invertMatrix3(m: Matrix3): Matrix3
function applyMatrix3(m: Matrix3, v: Vector3): Vector3
function applyMatrix4x3(m: Matrix4x3, v: Vector3): Vector4
function applyMatrix3x4(m: Matrix3x4, v: Vector4): Vector3
```

## Geometry Utilities

### threeUtils.ts

Three.js coordinate conversion:

```typescript
function domainToThreeJS(v: Vector4): THREE.Vector3
function domainDirectionToThreeJS(v: Vector4): THREE.Vector3
```

3D intersection utilities:

```typescript
function intersectLinePlane3D(
  linePoint: Vector4, lineDir: Vector4,
  planeNormal: Vector4, planePoint: Vector4
): Vector4 | null

function intersectSegmentPlane3D(
  start: Vector4, end: Vector4,
  planeNormal: Vector4, planePoint: Vector4
): Vector4 | null

function isPointOnPlane3D(
  point: Vector4,
  planeNormal: Vector4, planePoint: Vector4,
  epsilon?: number
): boolean
```

### Geometry computations

```typescript
function reconstruct3DPointFromProjections(
  point1_2D: Vector3, plane1To3D: Matrix4x3,
  point2_2D: Vector3, plane2To3D: Matrix4x3
): Vector4

function convertPlaneRectangleTo2D(corners3D: Vector4[], threeDToPlane: Matrix3x4): Vector3[]
function generateClippedGrid(corners2D: Vector3[], spacing: number): Vector3[][]
```

## ID Utilities

```typescript
function getContainerIdFromElementId(elementId: string): string
// "projPlane1/point2d5" → "projPlane1"

function getLocalIdFromElementId(elementId: string): string
// "projPlane1/point2d5" → "point2d5"

function buildElementId(planeId: string, localId: string): string
// ("projPlane1", "point2d5") → "projPlane1/point2d5"
```
