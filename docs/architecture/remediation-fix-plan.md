# Architecture Remediation Fix Plan

Date: 2026-06-03

Source review: [`remediation-review.md`](./remediation-review.md)

Gap review: [`remediation-fix-plan-review.md`](./remediation-fix-plan-review.md)

Primary objective: remove compatibility shims, stale bridges, and overfitted helper code while preserving the cleaner boundaries established by the remediation work.

Non-goals:

- Do not add compatibility wrappers for old APIs.
- Do not preserve deprecated props/events/types unless a current product behavior depends on them.
- Do not add new architecture indirection solely to satisfy tests.
- Do not introduce `World.beginBatch()` or `DiagnosticsLogger`.

## Guiding Rules

1. Prefer deletion over redirection.
2. Prefer current product behavior over old test convenience.
3. Keep architecture tests focused on boundaries, not helper names.
4. Keep domain free of UI/runtime/browser concerns and console side effects.
5. Validate each batch before starting the next one.
6. When a finding reveals correctness risk, add focused tests before the fix.
7. Commit regularly at phase-sized boundaries after validation passes.

## Validation Commands

Run from repository root unless noted otherwise.

Fast gates:

```bash
npm run build --workspace=frontend
npm run test:architecture --workspace=frontend
```

Routine gate:

```bash
npm test --workspace=frontend
npm run lint --workspace=frontend
```

Docs gate:

```bash
npm run docs:build
```

## Commit Cadence

Commit regularly so each remediation batch is reviewable and revertable without undoing unrelated work.

Rules:

1. Before every commit, inspect `git status --short`, `git diff`, and `git log --oneline -10`.
2. Stage only files related to the completed phase or subphase.
3. Do not stage unrelated dirty files from earlier work unless they are required for the completed phase.
4. Run the validation commands listed for the phase before committing.
5. Use concise commit messages that describe the architectural cleanup, not the mechanics.
6. Do not amend previous commits unless explicitly requested.

Recommended commit points:

1. Commit Phase 0 only if the inventory materially changes this plan.
2. Commit Phase 1 as one commit if all compatibility removals are small; split into `coordinate transforms`, `selection masks`, and `deprecated prop/type cleanup` commits if tests or diffs are large.
3. Commit Phase 2 as one dependency-boundary cleanup commit.
4. Commit Phase 3 as its own `World.clear()` correctness commit.
5. Commit Phase 4 as multiple focused commits: viewport bridge deletion, event/highlight cleanup, orphan UI deletion, and store ownership cleanup. Keep store cleanup separate from canvas interaction changes.
6. Commit Phase 5 as one adapter-collapse commit unless `ThreePresentationAdapter` changes are substantial.
7. Commit Phase 6 as one architecture-test recalibration commit, or split helper removal from test-policy changes if both are large. Delete placeholder tests in the same commit as the related architecture-test cleanup.
8. Commit Phase 7 as documentation/test-organization updates; split test moves from docs if the diff is large.

Suggested message style:

```text
Remove coordinate transform compatibility paths
Tighten dependency service boundaries
Fix world clear reset semantics
Remove stale canvas viewport bridge
Relax architecture guards to boundary rules
```

Full gate after the full plan:

```bash
npm run build --workspace=frontend
npm run test:architecture --workspace=frontend
npm test --workspace=frontend
npm run lint --workspace=frontend
npm run docs:build
```

## Phase 0: Baseline And Inventory

Purpose: avoid deleting code based on assumptions, and establish exact current usage before edits.

Steps:

1. Record baseline status with `git status --short`.
2. Search active source and tests for these strings:
   - `backward compatibility`
   - `deprecated`
   - `FOR TESTS ONLY`
   - `SelectionMask.guide`
   - `HierarchyMask`
   - `POINT_2D_TYPE.INTERSECTION`
   - `getDependencyService`
   - `dumpDependencyGraph`
   - `traceInvalidation`
   - `update-active-plane`
   - `highlight-elements`
   - `clear-highlight`
   - `useViewport`
   - `selectedId`
   - `WorldEntityFactory`
   - `ProcessTreeIdAllocator`
   - `useToolFeedback`
   - `NewProjectDialog`
   - `settingsStore`
   - `view3D`
   - `defaultStyles`
   - `gridVisible`
   - `snapToGrid`
   - `getProjectionPlaneByLabel`
   - `as any`
   - `console.warn`
   - `autosave.spec`
   - `it.skip`
3. For each match, classify it as current product behavior, test-only compatibility, dead code, or architecture guard.
4. Inventory `frontend/src/composables/` and `frontend/src/components/dialogs/` for orphan files with no importers.
5. Inventory `frontend/src/stores/` for module-level storage reads/writes, direct action persistence, and state duplicated across stores.
6. Inventory `frontend/src/commands/**` for `as any` casts that access domain/private fields.
7. Inventory `frontend/tests/unit/services/`, skipped tests, and placeholder tests for stale organization or old architecture references.
8. Update this plan only if inventory finds a current product dependency not captured below.

Acceptance criteria:

- All listed symbols/comments have known callers or are confirmed dead.
- Store persistence/state ownership issues are classified before implementation.
- Orphan components/composables/tests are confirmed dead before deletion.
- No implementation changes have been made yet except optional plan clarification.

Validation:

- None required beyond inventory.

## Phase 1: Remove Explicit Compatibility Shims

Purpose: eliminate APIs/comments that explicitly preserve old behavior only for tests or compatibility.

Findings covered:

- F01 Coordinate transform string-plane compatibility.
- F02 Deprecated/redundant selection masks.
- F03 Generic legacy intersection point type.
- F18 Deprecated component prop.
- M08 Console side effect in `SelectionMask.ts`.
- M11 Entire `POINT_2D_TYPE` / `Point2DType` export may be dead, not only `INTERSECTION`.
- M12 String plane-label lookup scope in tests.
- M13 `HierarchyMask` is active and needs replacement semantics before deletion.

### 1.1 Remove Coordinate Transform String Overloads

Files:

- `frontend/src/domain/calculations/CoordinateTransform.ts`
- `frontend/tests/unit/coordinateTransform.spec.ts`
- `frontend/tests/unit/utils/coordinateTransform.spec.ts`
- `frontend/tests/helpers/worldHelpers.ts`
- Any other tests using string plane names.

Implementation steps:

1. Change `planeToCanvas` so the transform argument only accepts a matrix-like value.
2. Change `canvasToPlane` so the transform argument only accepts a matrix-like value.
3. Delete branches that special-case `typeof transform === 'string'`.
4. Delete comments mentioning backward compatibility or tests-only string handling.
5. Update tests to pass explicit matrices.
6. If tests were only validating old string shortcuts, delete those cases instead of re-encoding the old behavior.
7. Audit `tests/helpers/worldHelpers.ts` and direct `getProjectionPlaneByLabel('P_H'/'P_V')` usage to confirm this phase only removes transform string overloads, not the plane-label lookup API itself.
8. Do not remove `World.getProjectionPlaneByLabel()` in this phase unless a separate product decision is made; the current issue is string shorthand in `CoordinateTransform`, not necessarily plane labels in tests.

Acceptance criteria:

- `CoordinateTransform.ts` contains no `typeof transform === 'string'` branch.
- `CoordinateTransform.ts` contains no `FOR TESTS ONLY` or backward-compatibility comment.
- Transform tests validate matrix behavior only.

Focused validation:

```bash
npm test --workspace=frontend -- coordinateTransform
```

### 1.2 Remove Deprecated Selection Mask Concepts

Files:

- `frontend/src/types/SelectionMask.ts`
- `frontend/src/application/canvasPresentation/CanvasInteractionQuery.ts`
- Selection-related tests.

Implementation steps:

1. Delete `SelectionMask.guide()`.
2. Delete `HierarchyMask`.
3. Delete `isHierarchyMask`.
4. Define the replacement semantics for `SelectionMask.anyLine()` before deleting `HierarchyMask`; current production tools depend on this behavior.
5. Replace `SelectionMask.anyLine()` with one of:
   - `TypeMask('line')` if current selectable-type matching already covers line subtypes.
   - A new explicit multi-type/composite mask if subtype filtering remains product behavior.
6. Remove or replace the hierarchy-mask branch from `CanvasInteractionQuery` in the same commit.
7. Update tests to use current type/exact/composite masks.
8. Avoid adding aliases that preserve old names.
9. Remove or move `console.warn` from `getSelectableType()`; this types-layer utility should not own logging side effects.

Acceptance criteria:

- No active source imports or references `HierarchyMask` or `isHierarchyMask`.
- No active source calls `SelectionMask.guide()`.
- `CanvasInteractionQuery` has no hierarchy compatibility branch.
- `SelectionMask.anyLine()` still preserves current line/subtype selection behavior.
- `SelectionMask.ts` has no `console.*` side effects.

Focused validation:

```bash
npm test --workspace=frontend -- CanvasInteractionQuery SelectionMask
```

### 1.3 Remove Generic Legacy Intersection Type

Files:

- `frontend/src/domain/world/Point.ts`
- `frontend/src/domain/world/index.ts`
- Any tests or presentation mappings using `POINT_2D_TYPE.INTERSECTION`.

Implementation steps:

1. Confirm whether any active source imports `POINT_2D_TYPE` or `Point2DType` at all.
2. If the entire constant/type is dead, remove `POINT_2D_TYPE`, `Point2DType`, and the barrel export from `domain/world/index.ts`.
3. If the constant/type has valid consumers, remove only `POINT_2D_TYPE.INTERSECTION`.
4. Replace any presentation grouping with derived grouping logic if needed.
5. Update tests to use the specific intersection types.

Acceptance criteria:

- `POINT_2D_TYPE.INTERSECTION` is gone.
- Dead `POINT_2D_TYPE` / `Point2DType` exports are removed if no external consumer exists.
- Current specific intersection variants remain intact.
- No product path loses the ability to group intersections visually if that grouping exists.

Focused validation:

```bash
npm test --workspace=frontend -- intersection Point
```

### 1.4 Remove Deprecated `selectedId` Prop

Files:

- `frontend/src/components/panels/ElementTypeGroup.vue`
- Callers of `ElementTypeGroup`.

Implementation steps:

1. Remove `selectedId` from props.
2. Remove caller bindings if any remain.
3. Keep selection state sourced from `selectionStore` or the current runtime port.
4. Remove deprecated comments.

Acceptance criteria:

- No `selectedId` prop exists on `ElementTypeGroup`.
- No caller passes `selectedId`.

Focused validation:

```bash
npm test --workspace=frontend -- panelToolbarBehavior
```

Phase validation:

```bash
npm run build --workspace=frontend
npm run test:architecture --workspace=frontend
npm test --workspace=frontend
```

## Phase 2: Delete Dead Domain And Dependency Code

Purpose: finish dependency-boundary cleanup and remove old debug/legacy graph code.

Findings covered:

- F05 Public concrete dependency service leakage.
- F06 Dead or legacy dependency graph code.
- F07 Duplicate dependency registrar interfaces.

### 2.1 Remove Debug/Dead Dependency Methods

Files:

- `frontend/src/domain/world/DependencyService.ts`
- Tests that reference debug graph methods.

Implementation steps:

1. Delete `dumpDependencyGraph()`.
2. Delete `traceInvalidation()` if inventory shows it is unused.
3. If a test depends on these methods only to inspect internals, rewrite it through `DependencyQueryPort` behavior or delete the over-specific assertion.
4. Ensure no `void` discard blocks remain from prior console cleanup.

Acceptance criteria:

- `DependencyService` exposes no debug/dump methods.
- Domain has no diagnostic methods that compute unused debug strings.

Focused validation:

```bash
npm test --workspace=frontend -- DependencyService
```

### 2.2 Delete Unused `DependencyGraph.ts`

Files:

- `frontend/src/domain/world/DependencyGraph.ts`

Implementation steps:

1. Confirm there are no imports.
2. Delete the file.
3. Remove any exports from barrel files if present.

Acceptance criteria:

- `DependencyGraph.ts` is deleted.
- No import errors remain.

Focused validation:

```bash
npm run build --workspace=frontend
```

### 2.3 Remove Public `World.getDependencyService()`

Files:

- `frontend/src/domain/world/World.ts`
- Tests and callers using the full concrete service.

Implementation steps:

1. Replace production callers with `getDependencyQuery()` or `getDependencyRegistrar()`.
2. Replace test callers with narrow ports where possible.
3. If a test genuinely validates internal graph behavior, instantiate `DependencyService` directly instead of going through `World`.
4. Delete `getDependencyService()` from `World`.

Acceptance criteria:

- `World` exposes only `getDependencyQuery()` and `getDependencyRegistrar()` publicly for dependency access.
- No production caller imports or references concrete `DependencyService` through `World`.

Focused validation:

```bash
npm run test:architecture --workspace=frontend
npm test --workspace=frontend -- DependencyService RuntimeReadModels
```

### 2.4 Merge Duplicate Registrar Interfaces

Files:

- `frontend/src/domain/world/DependencyPorts.ts`
- `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts`
- `frontend/src/domain/world/projectionPlane/ProjectionPlaneElementStore.ts`

Implementation steps:

1. Replace `ProjectionPlaneDependencyRegistrar` with imported `DependencyRegistrarPort`.
2. Keep projection-plane mutation context narrow by depending on the shared port type.
3. Delete duplicate interface definition.

Acceptance criteria:

- There is exactly one dependency registrar port type.
- Projection-plane code uses `DependencyRegistrarPort`.

Phase validation:

```bash
npm run build --workspace=frontend
npm run test:architecture --workspace=frontend
npm test --workspace=frontend
```

## Phase 3: Fix `World.clear()` Correctness

Purpose: address the highest-risk behavioral issue found during review.

Finding covered:

- F04 `World.clear()` does not clear all world-owned state.
- M07 command operations use `as any` casts to access private World/element internals.

Files:

- `frontend/src/domain/world/World.ts`
- `frontend/src/domain/world/RealizationStore.ts`
- `frontend/src/commands/operations/world/InitializationOps.ts`
- `frontend/src/commands/factories/ProjectionSetupFactory.ts`
- `frontend/src/domain/world/elements/BrokenHalfHingeLine2D.ts`
- New or existing world tests.

Implementation steps:

1. Add focused tests that populate all world-owned storage:
   - 2D projection planes.
   - hinge lines.
   - 3D points.
   - 3D lines.
   - 3D segments.
   - 3D planes.
   - realization entries.
   - dependency registrations.
2. Assert `World.clear()` empties all maps and collections.
3. Add tests that verify counters/labels reset or intentionally do not reset.
4. If current product behavior has no reason to preserve counters, reset all counters and `labelGenerator`.
5. Add or use a full `RealizationStore.clear()` method if `clearProjectionPlanes()` is partial.
6. Ensure `ProcessTree.clear()`, `WorldIdAllocator.reset()`, and `DependencyService.clear()` still run.
7. Audit `as any` casts in command operations that mutate private World fields during undo/reset flows.
8. Add narrow public World APIs for legitimate undo/delete needs, such as removing 3D planes, projection planes, hinge lines, and clearing the main hinge-line id.
9. Add a public accessor on `HalfHingeLine2D` if command factories legitimately need `hingeLineId`.
10. Remove the `as any` casts in `InitializationOps.ts` and `ProjectionSetupFactory.ts` after the public API exists.

Acceptance criteria:

- After `World.clear()`, no stale 2D or 3D world entities remain.
- New objects created after clear receive fresh IDs/labels according to the same rules as a new `World`.
- Realization cache state is fully cleared.
- Dependency graph state is fully cleared.
- Command undo/delete paths no longer access private World or element state through `as any`.
- Any new public World deletion APIs are narrow and command-use-case-specific, not broad map accessors.

Focused validation:

```bash
npm test --workspace=frontend -- World clear
```

Phase validation:

```bash
npm run build --workspace=frontend
npm run test:architecture --workspace=frontend
npm test --workspace=frontend
```

## Phase 4: Remove UI Bridge Leftovers

Purpose: finish the canvas/component cleanup by deleting stale event and composable paths.

Findings covered:

- F11 `useViewport` leftover bridge.
- F12 Dead `update-active-plane` event bridge.
- F13 No-op highlight event chain.
- F14 Redundant `ActionsPanel` manual refresh state.
- F15 repeated subscription-to-ref bridges, only if simplification is genuinely useful.
- M01 Dead `useToolFeedback.ts` composable.
- M02 Dead `NewProjectDialog.vue` component.
- M03 Dead `settingsStore.view3D` state overlapping `viewStore`.
- M04 Dead `settingsStore.defaultStyles` state.
- M05 `settingsStore.gridVisible` / `snapToGrid` overlap with `viewStore`.
- M06 `settingsStore` and `toolStore` persistence inconsistencies.

### 4.1 Remove `useViewport` From `SvgCanvas`

Files:

- `frontend/src/components/workspace/SvgCanvas.vue`
- `frontend/src/composables/useViewport.ts`
- Canvas interaction controller/tests.

Implementation steps:

1. Confirm `useViewport` is only used by `SvgCanvas`.
2. Move any remaining meaningful behavior into `CanvasInteractionController` or remove it if duplicated.
3. Replace `viewport.isPanning` usage with controller state or a controller result from pan-end.
4. Delete `useViewport.ts` if there are no callers.
5. Update tests to assert controller-owned pan/zoom behavior.

Acceptance criteria:

- `SvgCanvas.vue` does not import `useViewport`.
- `useViewport.ts` is deleted if unused.
- Pan/zoom still works through `CanvasInteractionController`.
- `SvgCanvas` does not register duplicate viewport listeners.

Focused validation:

```bash
npm test --workspace=frontend -- canvasInteractionController SvgCanvas
```

### 4.2 Remove Dead Active-Plane Event Bridge

Files:

- `frontend/src/components/workspace/SvgCanvas.vue`
- `frontend/src/App.vue`
- Runtime/session files if the action exists only for this event.

Implementation steps:

1. Confirm `SvgCanvas` no longer emits `update-active-plane`.
2. Remove the event declaration.
3. Remove `App.vue` listener/wiring.
4. Remove dead runtime method if it is only used by that listener.
5. Keep active-plane changes through the current explicit plane selector/control path.

Acceptance criteria:

- No `update-active-plane` event is declared, emitted, or handled.
- Active plane can still be changed through the product UI.

Focused validation:

```bash
npm test --workspace=frontend -- PlaneSelector SvgCanvas
```

### 4.3 Remove No-Op Highlight Event Chain

Files:

- `frontend/src/components/panels/ProcessTreeNode.vue`
- `frontend/src/components/panels/ActionsPanel.vue`
- `frontend/src/components/panels/ElementTypeGroup.vue`
- `frontend/src/App.vue`

Implementation steps:

1. Confirm emitted highlight events have no real consumer.
2. Remove no-op handlers in `App.vue`.
3. Remove emitted `highlight-elements` / `clear-highlight` events from child components if no remaining consumer exists.
4. Remove TODO-only mouse handlers from `ElementTypeGroup`.
5. If highlight is intended product behavior, implement it through the existing selection/hover runtime port instead of parent no-op events. Do not keep both.

Acceptance criteria:

- No no-op highlight handlers remain.
- No child emits highlight events that no component handles.
- Existing selection and hover behavior still works.

Focused validation:

```bash
npm test --workspace=frontend -- ActionsPanel panelToolbarBehavior
```

### 4.4 Simplify `ActionsPanel` Refresh State

Files:

- `frontend/src/components/panels/ActionsPanel.vue`
- Runtime notification tests if needed.

Implementation steps:

1. Remove `lastNodeCount` if it is assigned but unread.
2. Remove `treeVersion` if it only aliases `stackVersion`.
3. Check whether `refreshAfterIntent()` is needed after command/runtime notification fixes.
4. If runtime notifications are sufficient, remove manual increments after local intents.
5. If manual refresh is still required, document the gap and centralize it in a small composable only if duplicated elsewhere.

Acceptance criteria:

- `ActionsPanel` has no unread refresh state.
- It uses runtime subscription consistently.
- No local force-refresh path hides missing runtime notifications.

Focused validation:

```bash
npm test --workspace=frontend -- ActionsPanel RuntimeChangePublisher
```

### 4.5 Optional: Centralize Repeated Runtime Subscription Bridges

Only do this if Phase 4.4 confirms duplicated refresh counters remain in multiple components.

Candidate files:

- `frontend/src/components/panels/ActionsPanel.vue`
- `frontend/src/components/panels/ElementsPanel.vue`
- `frontend/src/components/panels/PlaneSelector.vue`
- `frontend/src/components/workspace/SvgCanvas.vue`
- `frontend/src/components/panels/ThreeView.vue`

Implementation steps:

1. Identify exact duplicated pattern.
2. Add a tiny composable only if it removes more complexity than it introduces.
3. Avoid creating a generic app-wide abstraction unless it has at least three clear current users.

Acceptance criteria:

- Either duplicated state is reduced, or the phase is skipped with no new helper.

### 4.6 Delete Orphan UI Files

Files:

- `frontend/src/composables/useToolFeedback.ts`
- `frontend/src/components/dialogs/NewProjectDialog.vue`

Implementation steps:

1. Confirm both files have zero importers in active source and tests.
2. Delete `useToolFeedback.ts`.
3. Delete `NewProjectDialog.vue`.
4. Delete or update any tests that were only covering these orphan files.

Acceptance criteria:

- `useToolFeedback.ts` no longer exists.
- `NewProjectDialog.vue` no longer exists.
- No active source or tests import either file.

Focused validation:

```bash
npm run build --workspace=frontend
npm test --workspace=frontend -- NewProjectDialog useToolFeedback
```

### 4.7 Clean Store Ownership And Persistence

Files:

- `frontend/src/stores/settingsStore.ts`
- `frontend/src/stores/toolStore.ts`
- `frontend/src/stores/viewStore.ts`
- `frontend/src/App.vue`
- Store tests.

Implementation steps:

1. Remove dead `settingsStore.view3D` state and computed getters unless inventory finds a real consumer.
2. Remove dead `settingsStore.defaultStyles` state and computed getters unless inventory finds a real consumer.
3. Resolve `settingsStore.gridVisible` / `snapToGrid` overlap with `viewStore`; prefer the existing live `viewStore` ownership for canvas display state.
4. Refactor `settingsStore` to follow the explicit `initFromStorage()` / `saveToStorage()` pattern used by `viewStore` and `toolStore`.
5. Remove module/store-creation-time `localStorage` reads from `settingsStore`.
6. Remove the deep auto-save watch from `settingsStore`; wire persistence explicitly from `App.vue`.
7. Remove direct `saveToStorage()` from `toolStore.selectSubTool()` if App-level persistence covers it.
8. Keep `authStore` / Google Drive session-storage behavior out of scope unless inventory shows it is causing the same app-state ownership problem; document the decision if skipped.

Acceptance criteria:

- Store persistence patterns are consistent for app settings/view/tool state.
- Dead settings groups are removed or explicitly justified.
- No store reads `localStorage` during module/store creation.
- `toolStore` actions do not perform direct persistence when App-level watchers cover persistence.

Focused validation:

```bash
npm test --workspace=frontend -- settingsStore toolStore viewStore
```

Phase validation:

```bash
npm run build --workspace=frontend
npm run test:architecture --workspace=frontend
npm test --workspace=frontend
```

## Phase 5: Collapse Thin Service/Adapter Leftovers

Purpose: remove adapters that only forward calls and do not protect boundaries.

Findings covered:

- F16 `InputService` thin adapter.
- F17 broad `ThreePresentationAdapter` facade.

### 5.1 Collapse `InputService`

Files:

- `frontend/src/application/canvas/InputService.ts`
- `frontend/src/application/canvas/CanvasCoordinateConverter.ts`
- `frontend/tests/unit/coordinateTransform.spec.ts`
- Tests referencing `InputService`.

Implementation steps:

1. Move `canvasToPlaneCoordinates` into a pure function in `CanvasCoordinateConverter.ts` or a small colocated helper.
2. Delete the singleton `InputService` object.
3. Delete `InputService.ts`.
4. Update `frontend/tests/unit/coordinateTransform.spec.ts` and any other tests that instantiate `new InputService()` to cover the converter/helper directly.

Acceptance criteria:

- No `InputService` file remains.
- Canvas coordinate conversion remains covered by tests.
- No new service-like wrapper is introduced.

Focused validation:

```bash
npm test --workspace=frontend -- CanvasCoordinateConverter InputService
```

### 5.2 Review And Narrow `ThreePresentationAdapter`

Files:

- `frontend/src/application/threePresentation/ThreePresentationAdapter.ts`
- Three presentation selectors/read models.
- `frontend/src/components/panels/ThreeView.vue`

Implementation steps:

1. List each method on `ThreePresentationAdapter` and its callers.
2. For each method, classify it as:
   - needed by three presentation,
   - duplicated pass-through,
   - better represented by a selector/read model,
   - unnecessary.
3. Remove unused methods.
4. If the adapter only forwards `World` getters, replace it with narrower function parameters or direct selector inputs.
5. Keep a facade only if it materially prevents three-presentation code from depending on broader domain state.

Acceptance criteria:

- Three presentation code has the smallest practical read surface.
- `ThreePresentationAdapter` either has meaningful policy or is removed.
- Three UI behavior remains unchanged.

Focused validation:

```bash
npm test --workspace=frontend -- ThreeView threePresentation
```

Phase validation:

```bash
npm run build --workspace=frontend
npm run test:architecture --workspace=frontend
npm test --workspace=frontend
```

## Phase 6: Reconsider Thin Recent Helpers And Overfitted Tests

Purpose: make sure remediation did not replace old architecture problems with test-enforced wrappers.

Findings covered:

- F08 `WorldEntityFactory` thin bridge.
- F09 overfitted architecture tests.
- F10 `ProcessTreeIdAllocator` thin nondeterminism wrapper.

### 6.1 Decide Fate Of `WorldEntityFactory`

Files:

- `frontend/src/domain/world/WorldEntityFactory.ts`
- `frontend/src/domain/world/World.ts`
- `frontend/tests/unit/architecture/worldBoundary.spec.ts`

Decision options:

1. Delete it if it only forwards constructors.
2. Keep it only if it gains real construction policy that belongs outside `World`.
3. Replace with entity named constructors if object creation needs semantic naming but no separate collaborator.

Recommended path:

1. Delete `WorldEntityFactory` unless new policy is identified during implementation.
2. Inline construction back into `World` or use entity constructors/named constructors.
3. Remove architecture tests that require factory function names.
4. Keep tests that prevent outer-layer imports and notification/debug concerns.

Acceptance criteria:

- No architecture test forces `WorldEntityFactory` by name.
- If the file remains, it has a documented responsibility beyond constructor forwarding.

### 6.2 Make Process Tree IDs Deterministic Or Remove The Wrapper

Files:

- `frontend/src/domain/processTree/ProcessTreeIdAllocator.ts`
- `frontend/src/domain/processTree/ProcessTree.ts`
- Persistence/round-trip tests if process-tree IDs are serialized.
- `frontend/tests/unit/architecture/worldBoundary.spec.ts`

Decision questions:

1. Are process-tree node IDs persisted and expected to be stable across save/load?
2. Are IDs used for deterministic snapshots/tests?
3. Is local uniqueness enough?

Recommended path if determinism matters:

1. Replace date/random ID generation with a counter allocator.
2. Persist or restore allocator state if process-tree state is persisted.
3. Ensure loaded trees do not collide with future IDs.

Recommended path if determinism does not matter:

1. Let caller supply IDs or keep generation local without a separate wrapper.
2. Remove `ProcessTreeIdAllocator` if it remains a 5-line nondeterminism wrapper.

Acceptance criteria:

- Architecture tests no longer enforce `ProcessTreeIdAllocator` by exact name.
- Process-tree ID behavior is explicit: deterministic/restorable or intentionally local-only.
- Tests cover whichever behavior is chosen.

### 6.3 Relax Architecture Tests To True Boundaries

Files:

- `frontend/tests/unit/architecture/worldBoundary.spec.ts`
- `frontend/tests/unit/architecture/importBoundaries.spec.ts`
- `frontend/tests/unit/autosave.spec.ts`

Implementation steps:

1. Keep tests for forbidden imports, notification plumbing, console side effects, and broad dependency access.
2. Remove tests that require exact helper class/function names.
3. Add tests for active-source compatibility comments:
   - fail on `backward compatibility` in active source,
   - fail on `FOR TESTS ONLY` in active source,
   - optionally fail on `deprecated` in active source except allowlisted docs or intentional migration files.
4. Add tests for `World.clear()` completeness if not already covered by unit tests.
5. Audit `importBoundaries.spec.ts` forbidden-import lists for paths that were deleted, moved, or intentionally rehomed during this plan.
6. Delete or rewrite `frontend/tests/unit/autosave.spec.ts`; it is a placeholder test with no imports and old architecture comments, while actual autosave behavior is covered elsewhere.

Acceptance criteria:

- Architecture tests protect boundaries and cleanup rules.
- Architecture tests do not force thin adapters to continue existing.
- Architecture tests do not preserve stale path references except as clear negative guards.
- Placeholder tests with no production subject under test are removed or rewritten.

Phase validation:

```bash
npm run build --workspace=frontend
npm run test:architecture --workspace=frontend
npm test --workspace=frontend
```

## Phase 7: Documentation Update

Purpose: make docs reflect the cleaned architecture rather than the remediation journey.

Finding covered:

- F19 stale architecture docs.
- M09 stale `tests/unit/services/` organization.
- M14 skipped Google Drive tests.

Files:

- `docs/architecture/overview.md`
- `docs/architecture/rendering.md`
- `docs/architecture/remediation-plan.md`
- `docs/architecture/remediation-review.md`
- This file.
- `frontend/tests/unit/services/ProjectService.roundTrip.spec.ts`
- `frontend/tests/unit/services/ProjectService.selfContainment.spec.ts`
- `frontend/tests/unit/services/ProjectService.subprocess.spec.ts`
- `frontend/tests/unit/services/googleDriveService.spec.ts`
- `frontend/tests/unit/services/svgCanvasRenderer.spec.ts`

Implementation steps:

1. Update `overview.md` to describe final current boundaries.
2. Update `rendering.md` to remove older adapter/service names.
3. Update `remediation-plan.md` status table to mark finished cleanup batches.
4. Keep `remediation-review.md` as findings/provenance; do not edit it into a moving target unless a finding is disproven.
5. Update this plan with completed status and any intentional skipped items.
6. Move tests out of stale `frontend/tests/unit/services/` into directories that match current source ownership:
   - ProjectService tests to `frontend/tests/unit/application/appShell/`.
   - Google Drive tests to `frontend/tests/unit/infrastructure/`.
   - SVG renderer tests to `frontend/tests/unit/rendering/`.
7. Review skipped tests in `googleDriveService.spec.ts`; enable them if still valid or delete them if the behavior is obsolete.

Acceptance criteria:

- Current architecture docs do not describe deleted compatibility shims or stale bridges.
- Historical/remediation docs are clearly labelled as provenance or status.
- Test directories reflect current source ownership rather than the removed `services/` layer.
- Skipped Google Drive tests are either enabled or removed with obsolete behavior documented.

Validation:

```bash
npm run docs:build
```

## Final Acceptance Criteria

All phases are complete when:

1. Active source contains no explicit test-only/backward-compatibility branches from the review findings.
2. Deprecated selection/component/domain compatibility artifacts are removed.
3. Dependency access is through narrow query/registrar ports, not public concrete service leakage.
4. `World.clear()` fully clears world-owned state and is covered by focused tests.
5. `SvgCanvas` no longer uses stale viewport/event/highlight bridges.
6. Thin adapters are removed or justified by real policy.
7. Dead composables/components/settings groups and placeholder tests are removed or justified.
8. Command operations no longer use `as any` to mutate private World or element internals.
9. Store persistence follows explicit app-level init/save ownership for app settings/view/tool state.
10. Architecture tests guard boundaries and cleanup rules rather than helper names.
11. Documentation and test organization reflect current architecture.
12. Full gate passes:

```bash
npm run build --workspace=frontend
npm run test:architecture --workspace=frontend
npm test --workspace=frontend
npm run lint --workspace=frontend
npm run docs:build
```

## Risk Register

Risk: coordinate transform tests may rely heavily on string shortcuts.

Mitigation: update tests to build explicit matrices; delete cases that only tested compatibility shortcuts.

Risk: removing `HierarchyMask` changes selection behavior for line subclasses.

Mitigation: define current desired line selection behavior before deletion, then encode it with current `TypeMask` or explicit exact masks.

Risk: `World.clear()` reset behavior could affect project load flows.

Mitigation: add round-trip/load tests around clear and reinitialize behavior.

Risk: removing `useViewport` could regress pan/zoom edge cases.

Mitigation: keep controller-owned pan/zoom tests focused on drag, wheel, keyboard, ignore-next-click, and global mouse-up behavior.

Risk: architecture-test relaxation could allow regression.

Mitigation: replace helper-name tests with stronger boundary tests and compatibility-comment bans.

Risk: process-tree ID determinism may require persistence changes.

Mitigation: inspect serialization/loading before changing allocator semantics; add save/load collision tests if IDs are persisted.

Risk: deleting `HierarchyMask` could break `SelectionMask.anyLine()` behavior used by multiple tools.

Mitigation: define and test replacement `anyLine()` semantics before deleting `HierarchyMask`; update `CanvasInteractionQuery` in the same commit.

Risk: store cleanup can silently drop persisted settings keys from localStorage.

Mitigation: verify dead keys have no consumers; decide explicitly whether to ignore old persisted keys or add a one-time migration. Do not add compatibility handling unless a current product requirement needs it.

Risk: adding public World delete APIs could leak broad mutable map access.

Mitigation: add narrow methods for the exact command undo/delete use cases and keep maps private.

Risk: moving tests out of `tests/unit/services/` can hide behavioral changes in a large file-move diff.

Mitigation: move tests without content changes first, or keep moves in a dedicated commit after behavior cleanup passes.

Risk: skipped Google Drive tests may fail because they encode obsolete behavior.

Mitigation: verify current product behavior before enabling; delete obsolete skipped tests instead of preserving stale expectations.

## Suggested Execution Cadence

Recommended implementation order:

1. Phase 0 inventory.
2. Phase 1 compatibility deletion.
3. Phase 2 dependency/domain dead-code deletion.
4. Phase 3 `World.clear()` correctness.
5. Phase 4 UI bridge deletion.
6. Phase 5 adapter collapse.
7. Phase 6 helper/test recalibration.
8. Phase 7 docs.

Do not combine Phase 3 with other phases because it is a correctness change and should be isolated.

Do combine small Phase 1 deletions only if focused tests remain straightforward.

Do not begin Phase 6 until Phases 1 through 5 are complete; otherwise helper/test decisions may be based on obsolete callers.

Keep Phase 4.7 store cleanup separate from Phase 4.1 canvas interaction cleanup; they affect different runtime surfaces and should be reviewed independently.

Keep Phase 7 test moves separate from behavior edits when possible, so diffs remain reviewable.
