# Refactoring: ProjectionPlane Ownership of 2D Elements

**Date**: 2026-01-06  
**Status**: Planning  
**Impact**: Major architectural change

---

## Overview

This refactoring restructures the World data model to make ProjectionPlane the direct container of 2D elements, and unifies line-like elements (lines, segments, guides, half-hinge lines) under a single storage structure.

## Motivation

**Current Problems:**
1. **Scattered Ownership**: 2D elements stored directly in World, not attached to their planes
2. **Type Proliferation**: Separate maps for lines, segments, guides create redundant lookup logic
3. **Redundant Realizations**: Segments have separate realization type when they're just bounded lines
4. **Inconsistent Access**: Need to check multiple maps to find line-like elements

**Benefits of Refactoring:**
1. **Clear Ownership**: Each 2D element belongs to exactly one ProjectionPlane
2. **Type Hierarchy**: Line2D base class with Segment, Guide, HalfHingeLine as subtypes
3. **Unified Storage**: Single `lines` Map per plane for all line-like elements
4. **Simplified Realizations**: Lines and segments share Line2DRealization2D structure
5. **Better Encapsulation**: Plane knows its own elements, can validate constraints

---

## Architectural Changes

### 1. ProjectionPlane Becomes Container

**Before:**
```typescript
class World {
  private points: Map<string, Point2D>;
  private lines: Map<string, Line2D>;
  private segments: Map<string, Segment2D>;
  private circles: Map<string, Circle2D>;
  private guides: Map<string, Guide2D>;
  projectionPlanes: Map<string, ProjectionPlane>;
}
```

**After:**
```typescript
class ProjectionPlane {
  id: string;
  points: Map<string, Point2D>;          // All points on this plane
  lines: Map<string, Line2D>;            // All lines, segments, guides, half-hinge lines
  circles: Map<string, Circle2D>;        // All circles on this plane
  arcs: Map<string, Arc2D>;              // All arcs on this plane
  
  // Realization caches (per-plane)
  pointRealizations: Map<string, Point2DRealization2D>;
  lineRealizations: Map<string, Line2DRealization2D>;
  circleRealizations: Map<string, Circle2DRealization2D>;
  arcRealizations: Map<string, Arc2DRealization2D>;
}

class World {
  projectionPlanes: Map<string, ProjectionPlane>;
  hingeLines: Map<string, HingeLine>;    // Cross-plane elements stay in World
  planes: Map<string, Plane3D>;          // 3D geometric definitions stay in World
  processTree: ProcessTree;              // Global construction history
}
```

### 2. Line Type Hierarchy

**Before:**
```typescript
class Line2D { ... }
class Segment2D { ... }      // Separate class
class Guide2D { ... }        // Separate class
class HalfHingeLine2D { ... }  // Separate class

// Stored in separate maps
lines: Map<string, Line2D>
segments: Map<string, Segment2D>
guides: Map<string, Guide2D>
```

**After:**
```typescript
abstract class Line2D {
  id: string;
  planeId: string;
  label?: string;
  abstract realize2D(context): Line2DRealization2D;
}

class InfiniteLine2D extends Line2D {
  // Infinite line defined by two points
}

class Segment2D extends Line2D {
  // Bounded line segment (endpoints)
  point1Id: string;
  point2Id: string;
}

class Guide2D extends Line2D {
  // Construction guide (dashed, infinite)
}

class HalfHingeLine2D extends Line2D {
  // Hinge line projection on one plane
  hingeLineId: string;
}

// All stored in single map
lines: Map<string, Line2D>
```

### 3. Unified Line Realization

**Before:**
```typescript
class Line2DRealization2D {
  point: Vector3;      // Point on line
  direction: Vector3;  // Direction vector
}

class Segment2DRealization2D {
  point1: Vector3;     // Start point
  point2: Vector3;     // End point
}
```

**After:**
```typescript
class Line2DRealization2D {
  point: Vector3;      // Point on line (u, v, 1)
  direction: Vector3;  // Direction vector (u, v, 0)
  
  // Optional: For bounded lines (segments)
  point1?: Vector3;    // Start point (u, v, 1) - w=1 indicates point
  point2?: Vector3;    // End point (u, v, 1) - w=1 indicates point
}
```

**Key Insight**: Homogeneous coordinates distinguish points from vectors:
- **Point**: `(u, v, 1)` - third coordinate w=1
- **Vector**: `(u, v, 0)` - third coordinate w=0

For segments:
- `point` and `direction` define the infinite line
- `point1` and `point2` define the bounded segment (both have w=1)

---

## Migration Strategy

### Phase 1: Add ProjectionPlane Storage (Non-Breaking)

**Goal**: Add new storage structure without breaking existing code

**Changes:**
1. Add element maps to ProjectionPlane class:
   ```typescript
   points: Map<string, Point2D> = new Map();
   lines: Map<string, Line2D> = new Map();
   circles: Map<string, Circle2D> = new Map();
   arcs: Map<string, Arc2D> = new Map();
   ```

2. Add realization caches to ProjectionPlane:
   ```typescript
   pointRealizations: Map<string, Point2DRealization2D> = new Map();
   lineRealizations: Map<string, Line2DRealization2D> = new Map();
   circleRealizations: Map<string, Circle2DRealization2D> = new Map();
   arcRealizations: Map<string, Arc2DRealization2D> = new Map();
   ```

3. Keep World maps operational (dual storage temporarily)

4. Add helper methods to ProjectionPlane:
   ```typescript
   addPoint(point: Point2D): void
   getPoint(id: string): Point2D | undefined
   addLine(line: Line2D): void
   getLine(id: string): Line2D | undefined
   getPointRealization(id: string): Point2DRealization2D | undefined
   getLineRealization(id: string): Line2DRealization2D | undefined
   ```

**Testing**: Verify ProjectionPlane storage works alongside World storage

### Phase 2: Refactor Line Hierarchy

**Goal**: Unify line-like elements under Line2D base class

**Changes:**
1. Create Line2D abstract base class:
   ```typescript
   abstract class Line2D {
     id: string;
     planeId: string;
     label?: string;
     abstract realize2D(context): Line2DRealization2D;
   }
   ```

2. Refactor existing classes to extend Line2D:
   - `InfiniteLine2D extends Line2D` (rename from Line2DByTwoPoints)
   - `Segment2D extends Line2D` (keep name)
   - `Guide2D extends Line2D` (keep name)
   - `HalfHingeLine2D extends Line2D` (keep name)

3. Update Line2DRealization2D to support both infinite and bounded:
   ```typescript
   class Line2DRealization2D {
     point: Vector3;
     direction: Vector3;
     point1?: Vector3;  // For segments
     point2?: Vector3;  // For segments
   }
   ```

4. Migrate all line-like elements to unified storage

**Testing**: Verify all line types work with unified realization

### Phase 3: Migrate Write Operations

**Goal**: Update all creation/modification code to use ProjectionPlane storage

**Changes:**
1. Update World.addPoint2D() to delegate to ProjectionPlane:
   ```typescript
   addPoint2D(point: Point2D): Point2D {
     const plane = this.projectionPlanes.get(point.planeId);
     if (!plane) throw new Error(`Plane ${point.planeId} not found`);
     plane.addPoint(point);
     this.notifyChange();
     return point;
   }
   ```

2. Update World.addLine2D() similarly
3. Update all tools to call World methods (which delegate to planes)
4. Update commands to use new API

**Testing**: Verify element creation works through new API

### Phase 4: Migrate Read Operations

**Goal**: Update all lookup code to use ProjectionPlane storage

**Changes:**
1. Update World.getPoint2DRealization() to delegate:
   ```typescript
   getPoint2DRealization(pointId: string): Point2DRealization2D | undefined {
     // Find which plane has this point
     for (const plane of this.projectionPlanes.values()) {
       const realization = plane.getPointRealization(pointId);
       if (realization) return realization;
     }
     return undefined;
   }
   ```

2. Add index for fast lookup (optional optimization):
   ```typescript
   private elementToPlane: Map<string, string>; // elementId → planeId
   ```

3. Update PaperService to get elements from planes
4. Update all rendering code to use new lookup paths

**Testing**: Verify all rendering and hit testing works

### Phase 5: Remove Old Storage

**Goal**: Clean up deprecated World-level storage

**Changes:**
1. Remove World maps:
   ```typescript
   // DELETE these
   private points: Map<string, Point2D>;
   private lines: Map<string, Line2D>;
   private segments: Map<string, Segment2D>;
   private circles: Map<string, Circle2D>;
   private guides: Map<string, Guide2D>;
   private pointRealizations2D: Map<string, Point2DRealization2D>;
   private lineRealizations2D: Map<string, Line2DRealization2D>;
   private segmentRealizations2D: Map<string, Segment2DRealization2D>;
   private circleRealizations2D: Map<string, Circle2DRealization2D>;
   private guideRealizations2D: Map<string, Guide2DRealization2D>;
   ```

2. Remove compatibility shims
3. Update documentation

**Testing**: Full regression test suite

---

## Implementation Plan

### New Files to Create

1. **frontend/src/domain/world/InfiniteLine.ts** (rename from Line2DByTwoPoints)
2. **frontend/src/domain/world/Line.ts** (refactor to base class)

### Files to Modify

1. **frontend/src/domain/world/ProjectionPlane.ts**
   - Add element storage maps
   - Add realization cache maps
   - Add element management methods
   - Add realization computation methods

2. **frontend/src/domain/world/World.ts**
   - Update to delegate to ProjectionPlanes
   - Remove old storage (Phase 5)
   - Keep hingeLines, planes, processTree at World level

3. **frontend/src/domain/world/Segment.ts**
   - Change to extend Line2D
   - Update realize2D() to return Line2DRealization2D with point1/point2

4. **frontend/src/domain/world/Guide.ts**
   - Change to extend Line2D
   - Update realize2D() to return Line2DRealization2D

5. **frontend/src/domain/world/HingeLine.ts**
   - Update HalfHingeLine2D to extend Line2D

6. **frontend/src/services/PaperService.ts**
   - Update to handle unified Line2D type
   - Check point1/point2 presence to distinguish segments from infinite lines

7. **All Command classes**
   - Update to use new World API (which delegates to planes)

8. **All Tool classes**
   - Update element lookups to use new API

---

## API Changes

### Before

```typescript
// World-level storage
world.points.get(pointId)
world.lines.get(lineId)
world.segments.get(segmentId)
world.guides.get(guideId)

// World-level realizations
world.getPoint2DRealization(pointId)
world.getLine2DRealization(lineId)
world.getSegment2DRealization(segmentId)
world.getGuide2DRealization(guideId)
```

### After

```typescript
// Plane-level storage (direct access)
const plane = world.projectionPlanes.get(planeId);
plane.points.get(pointId)
plane.lines.get(lineId)  // Includes segments, guides, half-hinge lines

// World-level convenience (searches all planes)
world.getPoint2D(pointId)  // Finds point in any plane
world.getLine2D(lineId)    // Finds line in any plane

// Plane-level realizations
plane.getPointRealization(pointId)
plane.getLineRealization(lineId)  // Works for all Line2D subtypes

// World-level realizations (delegates to planes)
world.getPoint2DRealization(pointId)
world.getLine2DRealization(lineId)
```

---

## Testing Strategy

### Unit Tests

1. **ProjectionPlane Storage Tests**
   - Add/get points
   - Add/get lines (all subtypes)
   - Realization caching

2. **Line Hierarchy Tests**
   - InfiniteLine2D realization
   - Segment2D realization (with point1/point2)
   - Guide2D realization
   - HalfHingeLine2D realization

3. **World Delegation Tests**
   - World.addPoint2D() delegates to plane
   - World.getPoint2DRealization() searches planes
   - Cross-plane element lookups

### Integration Tests

1. **Element Creation Flow**
   - Tool → Command → World → ProjectionPlane → Storage

2. **Rendering Flow**
   - World → ProjectionPlane → Realization → PaperService → SVG

3. **Hit Testing Flow**
   - Canvas click → Plane lookup → Element lookup → Selection

### E2E Tests

1. **Full Construction Workflow**
   - Create points, lines, segments on multiple planes
   - Verify all elements render correctly
   - Verify selection works across planes

---

## Rollback Plan

**If refactoring fails:**

1. Revert to last stable commit before Phase 1
2. Each phase has its own commit for targeted rollback
3. Dual storage in Phase 1 allows gradual rollback

---

## Success Criteria

✅ All existing E2E tests pass  
✅ All existing unit tests pass  
✅ No performance regression (realization caching still works)  
✅ Code is more maintainable (fewer type checks, cleaner lookups)  
✅ Documentation updated (data-model.md, plan.md)  

---

## Timeline Estimate

- **Phase 1**: 2-3 hours (add storage, keep dual)
- **Phase 2**: 3-4 hours (refactor line hierarchy)
- **Phase 3**: 2-3 hours (migrate writes)
- **Phase 4**: 3-4 hours (migrate reads)
- **Phase 5**: 1-2 hours (cleanup)

**Total**: 11-16 hours

---

## Next Steps

1. Review this refactoring plan with team/stakeholders
2. Update data-model.md with new architecture
3. Update plan.md with refactoring tasks
4. Create detailed task breakdown in tasks.md
5. Begin Phase 1 implementation
