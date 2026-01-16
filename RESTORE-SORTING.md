# URGENT: Restore Proper Intersection Indexing

## Problem
We removed `sortPointsByAngleFromRadiusVector()` thinking it was unused, but **Phases 71 and 72 depend on proper intersection indexing**!

## Current (BROKEN) State
- `intersectLineCircle()` returns points in arbitrary calculation order
- `intersectCircleCircle()` returns points in arbitrary calculation order  
- Point2DLineCircleIntersection uses `Math.min(this.index, result.points.length - 1)` - arbitrary!
- Point2DCircleCircleIntersection uses `Math.min(this.index, result.points.length - 1)` - arbitrary!

## Required Implementation (from Phases 71 & 72)

### Phase 71: Line-Circle Intersection Indexing (PARAMETER-BASED)
**Rule**: Index by parameter s along line direction L = P + s×V
- Index 0 = intersection with **lesser s** (earlier along line direction)
- Index 1 = intersection with **greater s** (later along line direction)

**Algorithm**:
```typescript
function sortLineCircleIntersectionsByParameter(
  points: Vector3[],
  line: Line2DRealization2D
): Vector3[] {
  if (points.length < 2) return points;
  
  // Line: L = P + s*V where P = line.point1, V = line.direction
  const P = line.point1;
  const V = line.direction;
  const vLengthSq = V.x * V.x + V.y * V.y;
  
  // For each point I, compute s = (I - P) · V / |V|²
  const parametersAndPoints = points.map(point => {
    const dx = point.x - P.x;
    const dy = point.y - P.y;
    const s = (dx * V.x + dy * V.y) / vLengthSq;
    return { s, point };
  });
  
  // Sort by s ascending (lesser s first = index 0)
  parametersAndPoints.sort((a, b) => a.s - b.s);
  
  return parametersAndPoints.map(item => item.point);
}
```

### Phase 72: Circle-Circle Intersection Indexing (SIGNED ANGLE FROM CENTER-LINE)
**Rule**: Index by signed angle from center-line direction c1 → c2
- Index 0 = intersection with **positive signed angle** (counterclockwise from center-line)
- Index 1 = intersection with **negative signed angle** (clockwise from center-line)

**Algorithm**:
```typescript
function sortCircleCircleIntersectionsBySignedAngle(
  points: Vector3[],
  circle1: Circle2DRealization2D,
  circle2: Circle2DRealization2D
): Vector3[] {
  if (points.length < 2) return points;
  
  // Center-line direction: c1 → c2
  const c1 = circle1.center;
  const c2 = circle2.center;
  const centerLineDir = { x: c2.x - c1.x, y: c2.y - c1.y };
  
  // For each point, compute signed angle from center-line
  const anglesAndPoints = points.map(point => {
    const toPoint = { x: point.x - c1.x, y: point.y - c1.y };
    // Signed angle = atan2(cross product, dot product)
    const cross = centerLineDir.x * toPoint.y - centerLineDir.y * toPoint.x;
    const dot = centerLineDir.x * toPoint.x + centerLineDir.y * toPoint.y;
    const signedAngle = Math.atan2(cross, dot);
    return { signedAngle, point };
  });
  
  // Sort by signed angle descending (positive first = index 0)
  anglesAndPoints.sort((a, b) => b.signedAngle - a.signedAngle);
  
  return anglesAndPoints.map(item => item.point);
}
```

## Fix Required
1. Restore both sorting functions in Intersections.ts
2. Update `intersectLineCircle()` to use parameter-based sorting
3. Update `intersectCircleCircle()` to use signed-angle sorting
4. Verify tests still pass (they should - they were written for this behavior)
