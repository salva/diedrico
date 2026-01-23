# Phase 84: Geometry-Free Hinge Line Architecture

**Purpose**: Refactor HingeLine/HalfHingeLine2D to eliminate stored geometry duplication and use on-demand transformation from canonical coordinates  
**Reference**: [data-model.md §Domain Entity: HingeLine](./data-model.md#domain-entity-hingeline) - Architecture update for canonical coordinates

**Status**: 📋 PLANNED (January 23, 2026)

## Problem Statement

Current HingeLine architecture has three fundamental problems:

1. **Geometry Duplication**: HalfHingeLine2D stores point + direction geometry TWICE (once per plane), requiring validateParametricConsistency() to ensure Q=Q' and D=D'
2. **Not Extensible**: Hardcoded for HL_HV (P_H ↔ P_V), doesn't scale to auxiliary projection planes
3. **Inline 3D Rendering**: ThreeView computes hinge line geometry via normal extraction and cross products instead of using HingeLine.realize3D()

## Solution: Canonical Coordinates Architecture

**Key Insight**: Hinge line is ALWAYS at v=0 along u-axis in plane intrinsic coordinates

Use canonical coordinates **(0,0,1)** (origin) and **(1,0,0)** (u-axis direction):
- **HingeLine**: NO geometry storage, just plane references
- **HingeLine.realize3D()**: Transform canonical coords from plane1 to 3D using `applyMatrix4x3()`
- **HalfHingeLine2D on plane1**: Return canonical coords directly
- **HalfHingeLine2D on plane2**: Project 3D line back to plane2 using `applyMatrix3x4()`

## Benefits

- ✅ Zero geometry duplication (no stored point/direction)
- ✅ No parametric consistency validation needed
- ✅ Works for ANY plane pair (base-base, base-auxiliary, auxiliary-auxiliary)
- ✅ Centralized 3D computation via realize3D()
- ✅ Uses production-tested threeUtils transformations (20+ existing uses)

## Implementation Architecture

```typescript
// HingeLine: NO geometry storage
class HingeLine extends Element3D {
  readonly plane1Id: string;  // Reference plane
  readonly plane2Id: string;  // Second plane
  
  realize3D(world: World): Line3DRealization3D {
    const origin = new Vector3(0, 0, 1);      // Canonical origin
    const direction = new Vector3(1, 0, 0);   // Canonical u-axis
    const plane1Real = world.getProjectionPlane3DRealization(this.plane1Id);
    
    // Transform from plane1 2D → 3D using applyMatrix4x3()
    const origin3D = applyMatrix4x3(origin, plane1Real.planeTo3D);
    const direction3D = applyMatrix4x3(direction, plane1Real.planeTo3D);
    
    return new Line3DRealization3D(origin3D, direction3D);
  }
}

// HalfHingeLine2D: NO geometry storage
class HalfHingeLine2D extends Line2D {
  readonly hingeLineId: string;  // Reference to parent only
  
  realize2D(world: World): Line2DRealization2D {
    const hingeLine = world.getHingeLineById(this.hingeLineId);
    
    // Plane1: Return canonical coords directly
    if (this.planeId === hingeLine.plane1Id) {
      return new Line2DRealization2D(
        new Vector3(0, 0, 1),    // Canonical origin
        new Vector3(1, 0, 0)     // Canonical direction
      );
    }
    
    // Plane2: Project 3D line back to plane2
    const line3D = hingeLine.realize3D(world);
    const plane2Real = world.getProjectionPlane3DRealization(this.planeId);
    
    // Transform from 3D → plane2 2D using applyMatrix3x4()
    const origin2D = applyMatrix3x4(line3D.point, plane2Real.threeDToPlane);
    const direction2D = applyMatrix3x4(line3D.direction, plane2Real.threeDToPlane);
    
    return new Line2DRealization2D(origin2D, direction2D);
  }
}
```

## Transformation Utilities

Uses existing `threeUtils` library:
- **`applyMatrix4x3(vector: Vector3, matrix: Matrix4x3): Vector4`** - 2D→3D transformation (20+ existing uses)
- **`applyMatrix3x4(vector: Vector4, matrix: Matrix3x4): Vector3`** - 3D→2D transformation (14+ existing uses)

Both functions are production-tested across World.ts, Element2DRenderer3D.ts, projectionPlaneUtils.ts, and have comprehensive unit test coverage.

## Implementation Requirements

### Documentation Tasks

1. **spec.md**: Update §Hinge Lines with canonical coordinates architecture
2. **ui-spec.md**: Document 3D rendering via realize3D() (no user-visible changes)
3. **data-model.md**: Update §Domain Entity: HingeLine - remove stored geometry, document canonical approach
4. **tasks.md**: Create Phase 84 with all implementation and testing tasks
5. **for-planing.md**: Move Phase 84 from FOR PLANING to ALREADY PLANNED section

### Code Changes

6. **HingeLine.realize3D()**: Implement using canonical (0,0,1), (1,0,0) + applyMatrix4x3()
7. **HalfHingeLine2D**: Remove point/direction properties from class
8. **HalfHingeLine2D.realize2D()**: Implement plane1 canonical return / plane2 projection logic
9. **Remove validateParametricConsistency()**: No longer needed with geometry-free approach
10. **World.initializeStandardPlanes()**: Update to create HalfHingeLine2D without geometry args
11. **ThreeView.renderHingeLines()**: Replace inline computation with realize3D() call
12. **Fix compilation errors**: Remove line3D parameter references

### Testing Tasks

13. **Unit tests**: HingeLine.realize3D() with applyMatrix4x3()
14. **Unit tests**: HalfHingeLine2D.realize2D() - plane1 canonical, plane2 projection
15. **Integration tests**: 3D rendering via realize3D()
16. **Regression tests**: Guide creation still works with new HalfHingeLine2D
17. **Fix test failures**: Address any issues discovered during testing

## ⚠️ CRITICAL NOTES

- **Backward Compatibility**: Existing HL_HV guides and intersections must continue working
- **Sibling Navigation**: HalfHingeLine2D.getSiblingInfo() static method preserved (guide creation needs it)
- **Parametric Consistency**: No longer enforced via validation - implicit in canonical coordinates
- **3D Rendering**: Must use domainToThreeJS() to convert realize3D() output for Three.js

## Phase 84 Dependencies

- Depends on Phase 8.6 (HalfHingeLine2D Refactoring) - Current architecture
- Required for Phase 82 (Create Projection Plane Tool) - Auxiliary plane hinges

## Phase 84 Benefits

- Eliminates 50+ lines of geometry duplication code
- Removes error-prone parametric consistency validation
- Enables auxiliary projection planes with arbitrary hinge orientations
- Centralizes 3D geometry computation for consistency
- Uses proven transformation utilities (high confidence)

---

## Implementation Tasks

### Planning & Documentation (1-6)

- [ ] T1256 [P] Update spec.md §Hinge Lines with canonical coordinates architecture
- [ ] T1257 [P] Update ui-spec.md with 3D rendering via realize3D() (architecture note)
- [ ] T1258 [P] Update data-model.md §Domain Entity: HingeLine - remove stored geometry, document canonical approach, update parametric consistency section
- [ ] T1259 [P] Create Phase 84 in tasks.md (this file) with comprehensive task breakdown
- [ ] T1260 [P] Move Phase 84 from FOR PLANING to ALREADY PLANNED in for-planing.md
- [ ] T1261 Git commit: Planning documentation complete

### Core Implementation (7-13)

- [ ] T1262 Implement HingeLine.realize3D() in HingeLine.ts using canonical coords + applyMatrix4x3()
- [ ] T1263 Remove point/direction properties from HalfHingeLine2D class constructor
- [ ] T1264 Implement HalfHingeLine2D.realize2D() - canonical for plane1, projection for plane2
- [ ] T1265 Remove HingeLine.validateParametricConsistency() static method and all calls
- [ ] T1266 Update World.initializeStandardPlanes() to create HalfHingeLine2D without geometry args
- [ ] T1267 Refactor ThreeView.renderHingeLines() to use hingeLine.realize3D(world)
- [ ] T1268 Fix HingeLine compilation errors (remove line3D parameter references)
- [ ] T1269 [P] Import threeUtils (applyMatrix4x3, applyMatrix3x4) in HingeLine.ts
- [ ] T1270 Git commit: Core implementation complete

### Unit Tests (14-15)

- [ ] T1271 [P] Unit test: HingeLine.realize3D() transforms canonical coords via applyMatrix4x3()
- [ ] T1272 [P] Unit test: HingeLine.realize3D() with different plane transformations (rotation, translation)
- [ ] T1273 [P] Unit test: HalfHingeLine2D.realize2D() on plane1 returns canonical coordinates
- [ ] T1274 [P] Unit test: HalfHingeLine2D.realize2D() on plane2 projects 3D line correctly
- [ ] T1275 [P] Unit test: Round-trip transformation (plane1 → 3D → plane2 → 3D)
- [ ] T1276 [P] Unit test: Verify no geometry stored in HalfHingeLine2D class
- [ ] T1277 Git commit: Unit tests pass

### Integration & Regression Tests (16-18)

- [ ] T1278 Integration test: ThreeView renders hinge lines via realize3D(), verify geometry matches expected
- [ ] T1279 Integration test: Multiple projection planes render correct hinge line positions
- [ ] T1280 Regression test: Run E2E guide-creation.spec.ts, verify HalfHingeLine2D changes don't break workflow
- [ ] T1281 Regression test: Verify existing HL_HV guides still work correctly
- [ ] T1282 Regression test: Verify HalfHingeLine2D intersection points still work
- [ ] T1283 Fix any test failures discovered during regression testing
- [ ] T1284 Git commit: All tests passing

### Final Review & Commit (19)

- [ ] T1285 Code review: Verify no stored geometry in HalfHingeLine2D
- [ ] T1286 Code review: Verify validateParametricConsistency() removed everywhere
- [ ] T1287 Code review: Verify ThreeView uses realize3D() not inline computation
- [ ] T1288 Run full test suite (unit + integration + e2e)
- [ ] T1289 Final commit
  ```bash
  git add -A
  git commit -m "Phase 84: Implement geometry-free hinge line architecture using canonical coordinates
  
  Refactor HingeLine/HalfHingeLine2D to eliminate geometry duplication by computing
  from canonical coordinates (0,0,1) and (1,0,0) on demand.
  
  - Implement HingeLine.realize3D() using applyMatrix4x3() from plane1
  - Remove point/direction storage from HalfHingeLine2D
  - Implement HalfHingeLine2D.realize2D() with plane1 canonical/plane2 projection
  - Remove validateParametricConsistency() (no longer needed)
  - Refactor ThreeView.renderHingeLines() to call realize3D()
  - Update World initialization to create geometry-free HalfHingeLine2D
  - Uses production-tested threeUtils transformations (applyMatrix4x3, applyMatrix3x4)
  
  Benefits:
  - Zero geometry duplication (was: stored in both HalfHingeLine2D objects)
  - No parametric consistency validation needed
  - Extensible to auxiliary projection planes
  - Centralized 3D geometry computation
  
  All existing tests pass. Guide creation workflow unchanged.
  
  Refs: Phase 82 prerequisite (auxiliary plane hinges)
  "
  git push
  ```

**Checkpoint**: ✅ HingeLine/HalfHingeLine2D use canonical coordinates with zero geometry duplication, ready for auxiliary planes
