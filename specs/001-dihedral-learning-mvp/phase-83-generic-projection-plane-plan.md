# Phase 83: Generic Projection Plane Creation (Remove Hardcoded Orientation)

**Status**: 📋 PLANNING (Jan 20, 2026)

## Problem Statement

Current implementation has special-case logic for creating projection planes:
- `AddProjectionPlaneOp` takes string marker `'horizontal' | 'vertical'`
- `World.addProjectionPlane()` calls hardcoded factory methods `createPH()` / `createPV()`
- `BaseProjectionPlane.createPH()` and `.createPV()` have hardcoded transformation matrices
- **Architectural violation**: Special cases instead of generic geometric computation

## User Requirement

> "AddProjectionPlaneOp (actually, it must be AddProjectionPlaneFixedOp) must take the base plane and a matrix or a set of vectors defining how to map the plane into the paper!!! Probably the projection plane O element in paper coordinates and the conversion from the u,v base to the paper x, y. Maybe, all this could be encoded as a matrix, right?"

> "No special cases, everything must be generic!!!"

## Correct Architecture

**Generic Projection Plane Creation**:
```typescript
// OLD (WRONG):
new AddProjectionPlaneOp(planeHId, 'horizontal')  // String marker!

// NEW (CORRECT):
new AddProjectionPlaneFixedOp(
  planeHId,                    // 3D plane ID
  planeToPaper2D,              // Matrix3: (u,v,1) → (x',y',1)
  planeTo3D,                   // Matrix4x3: (u,v,1) → (x,y,z,w)
  projPlaneId                  // Optional ID for redo
)
```

**Factory Computes Matrices**:
- `InitializationSequenceFactory` computes matrices based on:
  - 3D plane geometry (normal, origin)
  - Desired paper layout (offset, orientation)
- Passes actual transformation matrices to operation
- **NO** string markers, **NO** hardcoded factory methods

## Step 1: Specification (spec.md)

**Location**: This is a purely technical refactoring with no user-facing changes.

**Note**: No changes to spec.md needed - functionality remains identical, only internal architecture changes.

## Step 2: UI Specification (ui-spec.md)

**Not applicable** - No UI changes.

## Step 3: Implementation Details (data-model.md)

**Location**: `specs/001-dihedral-learning-mvp/data-model.md` - Add new section after Phase 82.

**Section**: §Phase 83: Generic Projection Plane Creation

**Content**:

### Phase 83: Generic Projection Plane Creation

**Purpose**: Remove hardcoded orientation-based special cases from projection plane creation. Use explicit transformation matrices computed from 3D plane geometry.

**Architecture Before (INCORRECT)**:
```typescript
// Operation takes string marker
class AddProjectionPlaneOp {
  constructor(plane3DId: string, orientation: 'horizontal' | 'vertical') { }
}

// World calls hardcoded factory
world.addProjectionPlane(planeId, 'horizontal')
  → BaseProjectionPlane.createPH()  // Hardcoded matrices!

// Static factories with hardcoded values
class BaseProjectionPlane {
  static createPH(): BaseProjectionPlane {
    const planeToPaper = new Matrix3().set(1, 0, 800, 0, 1, 500, 0, 0, 1);  // HARDCODED!
    const planeTo3D = new Matrix4x3().set(1,0,0, 0,1,0, 0,0,0, 0,0,1);      // HARDCODED!
    // ...
  }
}
```

**Architecture After (CORRECT)**:
```typescript
// Operation takes explicit matrices
class AddProjectionPlaneFixedOp {
  constructor(
    private plane3DId: string,
    private planeToPaper2D: Matrix3,
    private planeTo3D: Matrix4x3,
    private threeDToPlane: Matrix3x4,
    private projPlaneId?: string
  ) { }
}

// Factory computes matrices from geometry
function buildWorldInitialization(world: World, cmd: Command) {
  // P_H: horizontal plane at z=0
  const planeToPaper_H = new Matrix3().set(
    1, 0, 800,     // x' = u + 800
    0, 1, 500,     // y' = v + 500 (Y towards viewer = downward)
    0, 0, 1
  );
  const planeTo3D_H = new Matrix4x3().set(
    1, 0, 0,  // x = u
    0, 1, 0,  // y = v (domain Y)
    0, 0, 0,  // z = 0 (horizontal plane)
    0, 0, 1   // w = 1
  );
  const threeDToPlane_H = new Matrix3x4().set(
    1, 0, 0, 0,  // u = x
    0, 1, 0, 0,  // v = y
    0, 0, 0, 1   // 1 = w
  );
  
  cmd.addAndExecute(new AddProjectionPlaneFixedOp(
    planeHId, planeToPaper_H, planeTo3D_H, threeDToPlane_H
  ));
  
  // P_V: vertical plane at y=0
  const planeToPaper_V = new Matrix3().set(
    1, 0, 800,      // x' = u + 800
    0, -1, 500,     // y' = -v + 500 (Z upward = canvas upward)
    0, 0, 1
  );
  const planeTo3D_V = new Matrix4x3().set(
    1, 0, 0,  // x = u
    0, 0, 0,  // y = 0 (vertical plane)
    0, 1, 0,  // z = v (domain Z)
    0, 0, 1   // w = 1
  );
  const threeDToPlane_V = new Matrix3x4().set(
    1, 0, 0, 0,  // u = x
    0, 0, 1, 0,  // v = z
    0, 0, 0, 1   // 1 = w
  );
  
  cmd.addAndExecute(new AddProjectionPlaneFixedOp(
    planeVId, planeToPaper_V, planeTo3D_V, threeDToPlane_V
  ));
}

// World just stores the matrices
class World {
  addProjectionPlane(
    plane3DId: string,
    planeToPaper2D: Matrix3,
    planeTo3D: Matrix4x3,
    threeDToPlane: Matrix3x4,
    projPlaneId?: string
  ): ProjectionPlane {
    const id = projPlaneId || this.generateProjPlaneId();
    const paperToPlane2D = planeToPaper2D.clone().invert();
    
    const projPlane = new BaseProjectionPlane(
      `proj_plane_${id}`,
      planeToPaper2D,
      paperToPlane2D,
      planeTo3D,
      threeDToPlane
    );
    projPlane.id = id;
    projPlane.plane3DId = plane3DId;
    this.projectionPlanes.set(id, projPlane);
    return projPlane;
  }
}
```

**Benefits**:
- **Generic**: Future auxiliary planes use same code path
- **Explicit**: Transformation matrices visible in initialization code
- **No special cases**: Consistent architecture
- **Testable**: Matrix computation logic in one place (factory)

**Coordinate System Conventions** (unchanged):
- Domain: X=right, Y=towards viewer, Z=up
- Canvas: X=right, Y=downward
- P_H: plane v → domain Y (identity in planeTo3D)
- P_V: plane v → domain Z (identity in planeTo3D), needs Y-flip in planeToPaper

## Step 4: Task Breakdown (tasks.md)

**Phase 83**: Generic Projection Plane Creation (T1240-T1248: 9 tasks)

### Phase 83.1: Update Operation Interface (T1240-T1241: 2 tasks)

- [ ] T1240 [P] Rename `AddProjectionPlaneOp` → `AddProjectionPlaneFixedOp` in `InitializationOps.ts`
- [ ] T1241 [P] Update constructor parameters: remove `orientation: string`, add `planeToPaper2D: Matrix3`, `planeTo3D: Matrix4x3`, `threeDToPlane: Matrix3x4`, keep `projPlaneId?: string`

### Phase 83.2: Update World Factory (T1242-T1243: 2 tasks)

- [ ] T1242 [P] Update `World.addProjectionPlane()` signature: remove `orientation`, add matrix parameters `(plane3DId, planeToPaper2D, planeTo3D, threeDToPlane, projPlaneId?)`
- [ ] T1243 [P] Update `World.addProjectionPlane()` implementation: create `BaseProjectionPlane` directly with matrices, compute `paperToPlane2D` inverse, remove calls to `createPH()`/`createPV()`

### Phase 83.3: Remove Static Factory Methods (T1244: 1 task)

- [ ] T1244 [P] Delete `BaseProjectionPlane.createPH()` and `.createPV()` static methods from `ProjectionPlane.ts` (lines ~1381-1530)

### Phase 83.4: Update Initialization Factory (T1245-T1246: 2 tasks)

- [ ] T1245 [P] Compute P_H matrices in `InitializationSequenceFactory`: `planeToPaper_H` (y'=v+500), `planeTo3D_H` (y=v), `threeDToPlane_H` (v=y)
- [ ] T1246 [P] Compute P_V matrices in `InitializationSequenceFactory`: `planeToPaper_V` (y'=-v+500), `planeTo3D_V` (z=v), `threeDToPlane_V` (v=z)

### Phase 83.5: Update Operation Calls (T1247: 1 task)

- [ ] T1247 [P] Replace `new AddProjectionPlaneOp(planeId, 'horizontal')` with `new AddProjectionPlaneFixedOp(planeId, planeToPaper_H, planeTo3D_H, threeDToPlane_H)` (same for P_V)

### Phase 83.6: Commit (T1248: 1 task)

- [ ] T1248 [P] Git commit: "Remove hardcoded projection plane orientation, use explicit transformation matrices (Phase 83)"

**Checkpoint**: Projection planes created with explicit matrices, no special-case logic

## Step 5: Testing Tasks

**Existing Tests**: All existing projection plane tests should pass unchanged (functionality identical)

**No New Tests Needed**: This is a refactoring with no behavioral changes

## Step 6: Mark as Planned

- [x] Move to "ALREADY PLANNED" section in for-planing.md
- [x] Update status to 📋 PLANNED

## Step 7: Implementation

*To be done after planning approval*

## Step 8: Git Commit

**Commit Message**:
```
Remove hardcoded projection plane orientation, use explicit transformation matrices (Phase 83)

BREAKING CHANGE: AddProjectionPlaneOp renamed to AddProjectionPlaneFixedOp
- Operation now takes explicit Matrix3/Matrix4x3 instead of 'horizontal'/'vertical' string
- Removed BaseProjectionPlane.createPH() and .createPV() static factory methods  
- InitializationSequenceFactory computes matrices from 3D plane geometry
- World.addProjectionPlane() takes matrices directly, no special cases

Benefits:
- Generic architecture supports future auxiliary planes without code changes
- Transformation matrices explicit and visible in initialization code
- No hardcoded special cases for P_H/P_V
- Single code path for all projection planes

Coordinate conventions (unchanged):
- P_H: planeToPaper y'=v+500 (Y towards viewer), planeTo3D y=v (identity)
- P_V: planeToPaper y'=-v+500 (Z upward flip), planeTo3D z=v (identity)
```

## Dependencies

**Blocks**: None
**Blocked By**: None  
**Conflicts With**: None

## Risks

**Low Risk**: 
- Changes are localized to initialization code
- Functionality identical, only internal structure changes
- No impact on user features

## Acceptance Criteria

- ✅ `AddProjectionPlaneFixedOp` renamed and takes matrix parameters
- ✅ `createPH()` and `createPV()` methods deleted
- ✅ `World.addProjectionPlane()` takes matrices, no orientation string
- ✅ `InitializationSequenceFactory` computes matrices explicitly
- ✅ All tests pass
- ✅ P_H and P_V created with correct coordinate mappings
- ✅ No string-based special cases remain
