# Test Fix Plan - World Initialization Issues

**Date**: Jan 2026  
**Status**: Planned, ready for implementation

## Summary

After completing Phase 92 (ConstructiveAction Data Model Rationalization), test suite shows:
- **651 tests passing** ✅ (Phase 92 implementation works correctly)
- **509 tests failing** ❌ (pre-existing test infrastructure issue)
- **47 test files** affected

## Root Cause

Since **Phase 47**, `World()` constructor creates an empty world. Initialization with P_H/P_V projection planes must be done explicitly via `world.initialize(commandStack)`.

Tests still use the old pattern:
```typescript
const world = new World();
const plane = world.getProjectionPlaneByLabel('P_H')!;  // FAILS - plane is undefined
```

This causes: `Error: Projection plane not found with label: P_H`

## Solution

**Approach**: Create `createTestWorld()` helper function

**Rationale**:
1. ✅ Explicit initialization visible in test code
2. ✅ No production code changes (World constructor stays clean)
3. ✅ Flexible (helper can evolve with test fixtures)
4. ✅ Best practice (standard testing pattern)

**Implementation**:
```typescript
// tests/helpers/worldHelper.ts
export function createTestWorld(): { world: World; commandStack: CommandStack } {
  const world = new World();
  const commandStack = new CommandStack(world);
  world.initialize(commandStack);
  return { world, commandStack };
}
```

**Migration Pattern**:
```typescript
// Before:
const world = new World();
const plane = world.getProjectionPlaneByLabel('P_H')!;

// After:
const { world, commandStack } = createTestWorld();
const plane = world.getProjectionPlaneByLabel('P_H')!;
```

## Special Cases

**Tests that should NOT use helper**:
- `worldInitialization.spec.ts` - Tests initialization behavior itself
- `initializationOps.spec.ts` - Tests initialization operations
- `initializeWorldCommand.spec.ts` - Tests initialization command

These tests should keep `new World()` and call `initialize()` explicitly since they're testing initialization logic.

## Documentation

See detailed documentation in:
- **Architecture**: [data-model.md - Test Infrastructure Pattern](specs/001-dihedral-learning-mvp/data-model.md#test-infrastructure-pattern)
- **Tasks**: [tasks.md - T1625 to T1675](specs/001-dihedral-learning-mvp/tasks.md) (51 subtasks)

## Implementation Plan

### Phase 1: Create Helper (1 task)
- **T1625**: Create `createTestWorld()` in `frontend/tests/helpers/worldHelper.ts`

### Phase 2: Fix Integration Tests (5 tasks)
- T1627: AllFactories.spec.ts
- T1628: projectService.cascadeDeletion.spec.ts
- T1629: projectService.determinism.spec.ts
- T1630: semanticReferences.spec.ts
- T1631: worldInitialization.spec.ts (special case - explicit init)

### Phase 3: Fix Command Tests (12 tasks)
- T1632-T1643: All command tests (createCircle, createFreePoint, etc.)

### Phase 4: Fix Component Tests (3 tasks)
- T1644-T1646: actionsPanel, elementsPanel, propertiesDialog

### Phase 5: Fix Domain Tests (15 tasks)
- T1647-T1662: All domain tests (line, circle, point, segment, 3D reconstruction, etc.)

### Phase 6: Fix Service Tests (5 tasks)
- T1663-T1667: ProjectService, dependencyService, googleDriveService, etc.

### Phase 7: Fix Tool Tests (2 tasks)
- T1668-T1669: CircleTool, pointTool

### Phase 8: Fix Remaining Tests (5 tasks)
- T1670-T1673: coordinateTransform, selectionMask, etc.

### Phase 9: Verification (2 tasks)
- T1674: Run full test suite, verify ~1234 tests passing
- T1675: Commit with message: "test: Fix unit tests with proper world initialization helper"

## Affected Test Files (47 total)

### Integration Tests (5)
- tests/integration/factories/AllFactories.spec.ts
- tests/integration/projectService.cascadeDeletion.spec.ts
- tests/integration/projectService.determinism.spec.ts
- tests/integration/semanticReferences.spec.ts
- tests/integration/worldInitialization.spec.ts

### Unit Tests - Commands (12)
- tests/unit/commands/createCircle.spec.ts
- tests/unit/commands/createFreePoint.spec.ts
- tests/unit/commands/createGuide.spec.ts
- tests/unit/commands/createIntersectionPoint.spec.ts
- tests/unit/commands/createLine.spec.ts
- tests/unit/commands/createSegment.spec.ts
- tests/unit/commands/factories/GuideSequenceFactory.spec.ts
- tests/unit/commands/factories/IntersectionSequenceFactory.spec.ts
- tests/unit/commands/initializationOps.spec.ts
- tests/unit/commands/initializeWorldCommand.spec.ts
- tests/unit/commands/removeElementOps.spec.ts
- tests/unit/commands/updateFreePoint2DPositionOp.spec.ts

### Unit Tests - Components (3)
- tests/unit/components/actionsPanel.spec.ts
- tests/unit/components/elementsPanel.spec.ts
- tests/unit/components/propertiesDialog.spec.ts

### Unit Tests - Domain (15)
- tests/unit/domain/Line3DReconstruction.test.ts
- tests/unit/domain/Plane3DFromTraces.test.ts
- tests/unit/domain/Point3DReconstruction.test.ts
- tests/unit/domain/circle.spec.ts
- tests/unit/domain/element2d.spec.ts
- tests/unit/domain/guide.spec.ts
- tests/unit/domain/line.spec.ts
- tests/unit/domain/lineHierarchy.spec.ts
- tests/unit/domain/paperHitTesting.spec.ts
- tests/unit/domain/point.spec.ts
- tests/unit/domain/projectionPlaneRealization.spec.ts
- tests/unit/domain/segment.spec.ts
- tests/unit/domain/tangentLine.spec.ts
- tests/unit/domain/world.spec.ts
- tests/unit/processTree.spec.ts
- tests/unit/projectionPlane.spec.ts

### Unit Tests - Services (5)
- tests/unit/services/ProjectService.selfContainment.spec.ts
- tests/unit/services/dependencyService.spec.ts
- tests/unit/services/googleDriveService.spec.ts
- tests/unit/services/paperService.spec.ts
- tests/unit/services/renderService.spec.ts

### Unit Tests - Tools & Others (7)
- tests/unit/tools/CircleTool.spec.ts
- tests/unit/tools/pointTool.spec.ts
- tests/unit/coordinateTransform.spec.ts
- tests/unit/dependencyService.spec.ts
- tests/unit/selectionMask.spec.ts
- tests/unit/utils/coordinateTransform.spec.ts

## Expected Outcome

After implementation:
- ✅ All 509 test failures resolved
- ✅ Total: ~1234 tests passing
- ✅ Clear test infrastructure pattern established
- ✅ Future tests use createTestWorld() by default

## Notes

- This is **NOT** a Phase 92 issue - Phase 92 implementation is complete and working
- Test infrastructure issue existed before Phase 92, now revealed by comprehensive testing
- Phase 92 should be committed separately before test fixes
- Some tests may still need World() constructor for testing World behavior itself

## Next Steps

1. Review plan with team
2. Start implementation with T1625 (create helper function)
3. Fix tests in batches (integration → commands → components → domain → services → tools)
4. Run test suite after each batch to verify progress
5. Commit when all tests passing
