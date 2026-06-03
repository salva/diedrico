# Remediation Fix Plan — Gap Review

Date: 2026-06-04

Scope: Cross-reference `remediation-fix-plan.md` and `remediation-review.md` against the current codebase to find issues, risks, and gaps the plan did not cover.

## Summary

The fix plan covers 19 original findings (F01–F19) across 7 phases. This review identifies **14 additional issues** and **5 plan risks** that the current plan does not address.

## Missing Issues

### M01. `useToolFeedback.ts` Is Dead Code — Not in Any Phase

Severity: Medium

`frontend/src/composables/useToolFeedback.ts` is a 92-line composable exposing `showFeedback()`, `setPreview()`, `updateCursor()`, `clearAll()`, and `cursorText`. Zero source files import it. It is not referenced in the plan, and it is not in Phase 4's composable audit (which only lists `useViewport`, `useHoverHighlight`).

Recommendation: Add to Phase 4. Delete `useToolFeedback.ts`.

---

### M02. `NewProjectDialog.vue` Is a Dead Component — Not in Any Phase

Severity: Medium

`frontend/src/components/dialogs/NewProjectDialog.vue` is a 196-line component that emits `created` and `close` events. No source file imports or mounts it. `StartupDialog.vue` handles new project creation directly. This is orphan code not addressed by the plan's Phase 4 UI bridge cleanup (which only lists highlight events, viewport, and active-plane wiring).

Recommendation: Add to Phase 4. Delete `NewProjectDialog.vue` and its test if one exists.

---

### M03. `settingsStore.view3D` Is Dead State Overlapping `viewStore`

Severity: High

`frontend/src/stores/settingsStore.ts` lines 55–60 define `view3D.showPlanes`, `view3D.showProjectionLines`, `view3D.show2DElements`, `view3D.initialCameraDistance`. Computed getters exist at lines 193–196. Zero components consume these values. The actual 3D view display options come from `viewStore.threeViewOptions` which has different property names (`show2DElementsOnPlanes`, `showLinkingVisuals`, `showGrid`, `showReferenceAxes`).

This is confusing dead state that partially overlaps a live store property (`showPlanes`). The plan does not address store cleanup at all.

Recommendation: Add to a new Phase 4.6 or append to Phase 4. Remove `view3D` from settings state and computed getters. Verify that no localStorage migration path depends on the `view3D.*` keys.

---

### M04. `settingsStore.defaultStyles` Is Dead State

Severity: Medium

`frontend/src/stores/settingsStore.ts` lines 43–51 define 9 default style properties (`defaultPointColor`, `defaultPointSize`, etc.). Computed getters exist at lines 182–190. No external consumer references these computed properties.

Recommendation: Add to Phase 4. Remove `defaultStyles` from settings state unless a planned feature needs them. If defaults are needed, they should be constants, not reactive store state.

---

### M05. `settingsStore.gridVisible`/`snapToGrid` Overlaps `viewStore.gridVisible`

Severity: Medium

Both `settingsStore` (lines 27, 31, 63, 67, 138–143, 228–234) and `viewStore` (lines 30, 109–111, 116–118, 196) expose `gridVisible`. `SvgCanvas.vue` uses `viewStore.gridVisible`. The `settingsStore` version is persisted to localStorage but appears unused by any component.

Recommendation: Add to Phase 4. Consolidate grid visibility into `viewStore` and remove the `settingsStore` duplicates.

---

### M06. `settingsStore` Auto-Reads/Writes localStorage — Bypasses App.vue Pattern

Severity: High

`settingsStore.ts` line 94 calls `loadSettings()` immediately on store creation (module-level `localStorage.getItem`). Lines 133–135 use a deep `watch` to auto-save to localStorage on every change. This bypasses the explicit `initFromStorage()`/`saveToStorage()` pattern that `viewStore` and `toolStore` adopted during remediation.

Similarly, `toolStore.selectSubTool()` at line 126 calls `saveToStorage()` directly inside the store action instead of using an App.vue watcher.

Recommendation: Add to Phase 4 or a dedicated store-consistency phase. Refactor `settingsStore` to use `initFromStorage()`/`saveToStorage()` like the other stores. Remove the auto-persist watch and module-level `loadSettings()` call. Wire initialization and persistence through `App.vue`.

---

### M07. `as any` Casts in Command Operations Expose Missing World API

Severity: High

`frontend/src/commands/operations/world/InitializationOps.ts` uses 4 `as any` casts to access private World internals:
- Line 74: `(world as any).planes3D.delete(this.outputs.planeId)`
- Line 142: `(world as any).projectionPlanes.delete(this.outputs.projPlaneId)`
- Line 290: `(world as any).hingeLines.delete(this.outputs.hingeLineId)`
- Line 291: `(world as any).mainHingeLineId = undefined`

`frontend/src/commands/factories/ProjectionSetupFactory.ts` lines 60–61 and 105–106 use `(line as any).hingeLineId` to access a private field on `HalfHingeLine2D`.

These casts indicate that `World` lacks public undo/delete API surfaces for operations that need them. The plan's Phase 3 fixes `World.clear()` but does not address this broader API gap.

Recommendation: Add to Phase 3 or a follow-up. Add proper public methods on `World` for delete-undo operations (e.g., `removePlane3DById`, `removeProjectionPlaneById`, `removeHingeLineById`, `clearMainHingeLineId`). Add a public `hingeLineId` getter on `HalfHingeLine2D`. Remove `as any` casts.

---

### M08. Console Call in `SelectionMask.ts` Types Layer

Severity: Low

`frontend/src/types/SelectionMask.ts` line 59 contains `console.warn('[getSelectableType] Unknown element type:', element.constructor.name)`. This is outside `domain/` but inside the types layer, which should be side-effect-free. The architecture test for domain console hygiene does not cover this.

The plan addresses domain console cleanup (already done) but does not cover console calls in types or presentation code that violate the same principle.

Recommendation: Add to Phase 1 cleanup alongside SelectionMask work. Replace the `console.warn` with a return type that communicates the error to callers, or move the logging to a presentation-layer handler.

---

### M09. Five Test Files Sit in Stale `tests/unit/services/` Directory

Severity: Low

`frontend/tests/unit/services/` contains 5 test files for modules that now live in `application/appShell/`, `infrastructure/googleDrive/`, and `rendering/svg/`:
- `ProjectService.roundTrip.spec.ts`
- `ProjectService.subprocess.spec.ts`  
- `ProjectService.selfContainment.spec.ts`
- `googleDriveService.spec.ts`
- `svgCanvasRenderer.spec.ts`

Imports resolve correctly (they use `@/application/appShell/ProjectService` etc.), but the directory name is misleading.

Recommendation: Add to Phase 7 docs/cleanup. Move test files to match current source structure:
- `tests/unit/application/appShell/` for ProjectService tests
- `tests/unit/infrastructure/` for GoogleDrive tests
- `tests/unit/rendering/` for SVGRenderer tests

---

### M10. `autosave.spec.ts` Is an Orphan Placeholder Test

Severity: Low

`frontend/tests/unit/autosave.spec.ts` is 117 lines with no imports. It simulates autosave logic with inline `setTimeout` and comments referencing `ProjectService.ts` and `markDirty()` from old architecture. The actual autosave class (`AutoSaveUseCases`) is tested in `AppShellRuntimeUseCases.test.ts`.

Recommendation: Add to Phase 6 or Phase 7. Delete `autosave.spec.ts`.

---

### M11. `POINT_2D_TYPE` and `Point2DType` Are Dead Exports

Severity: Medium

`POINT_2D_TYPE` (including the `INTERSECTION` entry) and the `Point2DType` type alias in `frontend/src/domain/world/Point.ts` are barrel-exported from `domain/world/index.ts` but **never imported by any external file**. The entire constant and type are dead code, not just the `INTERSECTION` variant.

The plan's Phase 1.3 only mentions removing `POINT_2D_TYPE.INTERSECTION`, but the whole `POINT_2D_TYPE` constant and `Point2DType` type should be audited for removal.

Recommendation: Expand Phase 1.3. If no code uses `POINT_2D_TYPE` or `Point2DType` externally, remove the entire constant, type, and barrel export.

---

### M12. String Plane Label Lookups Widespread in Tests — Plan Phase 1.1 May Be Larger Than Expected

Severity: Medium (estimation risk)

`World.getProjectionPlaneByLabel(label: string)` is only called from production code in JSDoc examples (lines 59–60). However, ~30+ test files use `'P_H'` and `'P_V'` string labels extensively through `worldHelpers.ts` and direct calls.

If Phase 1.1 removes string-based coordinate transform overloads (which accept plane labels as shorthand for transforms), the test helper `worldHelpers.ts` that centralizes `getProjectionPlaneByLabel` calls may also need updating. The plan does not mention this helper.

Recommendation: Expand Phase 1.1 or add Phase 0 inventory item. Audit `tests/helpers/worldHelpers.ts`. Decide whether `getProjectionPlaneByLabel` itself should be deprecated/removed, or whether only `CoordinateTransform` string branches should go. If the method stays, the string transforms can still be removed without touching tests.

---

### M13. `HierarchyMask` Is Actively Used, Not Just Backward Compatibility

Severity: Medium (plan risk)

The review (F02) and plan (Phase 1.2) treat `HierarchyMask` as deprecated/backward-compatibility code to be deleted. However, `SelectionMask.anyLine()` actively returns `new HierarchyMask('line', [...])`, and 4 production tools call `anyLine()`: `TangentLineToCircleParallelToLineTool`, `PerpendicularLineTool`, `ParallelLineTool`, `IntersectionTool`. `CanvasInteractionQuery` at line 37 explicitly dispatches on `isHierarchyMask`.

Deleting `HierarchyMask` without replacing `anyLine()` semantics means these 4 tools lose their line-type-subtype selection behavior.

Recommendation: Phase 1.2 must define what replaces `anyLine()` before deleting `HierarchyMask`. Options:
1. Replace `HierarchyMask` with a `CompositeMask` or `MultiTypeMask` that is not misleadingly documented as backward compatibility.
2. Replace `anyLine()` with `TypeMask('line')` if `instanceof`-based type matching already covers subtypes.
3. Replace `anyLine()` with an explicit union mask if subtype matching is still needed.

Do not delete `HierarchyMask` until `anyLine()` has a replacement that preserves the current selection behavior.

---

### M14. Skipped Tests in `googleDriveService.spec.ts`

Severity: Low

Lines 281 and 339 contain `it.skip` tests for authentication expired error handling and filename extension addition. These represent untested functionality that the plan does not track.

Recommendation: Add to Phase 7. Either fix and enable the skipped tests, or delete them if the functionality is no longer relevant.

---

## Plan Risks

### R01. Phase 3 World.clear() May Be Larger Than Estimated

The plan lists specific fields that `World.clear()` misses (3D points, lines, segments, counters, labels). The `as any` casts in `InitializationOps.ts` (M07) show that World also lacks public delete APIs. Fixing `clear()` correctly may require adding these public methods, which would expand Phase 3 beyond "reset all maps and counters."

Additionally, `RealizationStore.clearProjectionPlanes()` may clear only projection-plane realizations, leaving 3D point/line/segment realizations stale. The plan should check whether `RealizationStore` has a full `clear()` method or only partial clear.

---

### R02. Phase 4 Store Cleanup Not Planned

The plan's Phase 4 focuses on UI bridges (viewport, events, refresh state) but does not address store consistency issues (M03–M06). The `settingsStore` auto-persist behavior and dead `view3D`/`defaultStyles`/`gridVisible` state represent meaningful technical debt that will complicate any future store refactor. At minimum, the plan should acknowledge this gap.

---

### R03. Phase 6 Architecture Test Changes May Conflict with Current Guards

The plan's Phase 6.3 proposes adding architecture tests that fail on `deprecated`, `FOR TESTS ONLY`, and `backward compatibility` comments. However, the current `importBoundaries.spec.ts` already has specific forbidden-import checks for deleted modules (e.g., `@/services/GeometryService`, `CanvasTool.ts`). If Phase 5 collapses `InputService` into a pure function, the import boundary test may need updating to remove `InputService` from forbidden lists or add it to allowed paths.

Recommendation: Phase 6.3 should also audit and update `importBoundaries.spec.ts` forbidden-import lists to match the current module structure after all phases.

---

### R04. Phase 1.2 SelectionMask Cleanup Has a Dependency on CanvasInteractionQuery

The plan removes `HierarchyMask` and its `CanvasInteractionQuery` branch. But `CanvasInteractionQuery` line 37 explicitly handles `HierarchyMask` with a `getBaseType()`/`getSubtypes()` dispatch. If `HierarchyMask` is removed, `CanvasInteractionQuery` must be updated in the same commit. The plan mentions this but does not list `CanvasInteractionQuery` in Phase 1.2's file list.

Recommendation: Add `frontend/src/application/canvasPresentation/CanvasInteractionQuery.ts` to Phase 1.2 file list.

---

### R05. Phase 5 InputService Collapse Has a Test Dependency

`frontend/tests/unit/coordinateTransform.spec.ts` line 11 directly imports `InputService` and line 14 instantiates `new InputService()`. If Phase 5.1 deletes `InputService.ts`, this test must be updated in the same change.

The plan mentions "tests referencing InputService" but does not list the specific coordinate transform test, which is the primary consumer.

Recommendation: Add `frontend/tests/unit/coordinateTransform.spec.ts` to Phase 5.1 file list.

---

## Coverage Audit

| Review Finding | Plan Coverage | Notes |
|---|---|---|
| F01 Coordinate transform compat | Phase 1.1 | Covered |
| F02 Selection masks | Phase 1.2 | **R04: add CanvasInteractionQuery to file list** |
| F03 Intersection type | Phase 1.3 | **M11: expand to whole POINT_2D_TYPE if dead** |
| F04 World.clear() | Phase 3 | **R01: may need RealizationStore full clear + public delete APIs** |
| F05 Dependency service leakage | Phase 2.3 | Covered |
| F06 Dead dependency code | Phase 2.1 / 2.2 | Covered |
| F07 Duplicate registrar | Phase 2.4 | Covered |
| F08 WorldEntityFactory | Phase 6.1 | Covered |
| F09 Overfitted arch tests | Phase 6.3 | **R03: also update import boundaries** |
| F10 ProcessTreeIdAllocator | Phase 6.2 | Covered |
| F11 useViewport | Phase 4.1 | Covered |
| F12 Active-plane event | Phase 4.2 | Covered |
| F13 Highlight no-op | Phase 4.3 | Covered |
| F14 ActionsPanel refresh | Phase 4.4 | Covered |
| F15 Subscription-to-ref bridges | Phase 4.5 | Covered |
| F16 InputService | Phase 5.1 | **R05: add coordinateTransform spec to file list** |
| F17 ThreePresentationAdapter | Phase 5.2 | Covered |
| F18 Deprecated prop | Phase 1.4 | Covered |
| F19 Stale docs | Phase 7 | Covered |
| **M01 useToolFeedback dead** | **Not covered** | Add to Phase 4 |
| **M02 NewProjectDialog dead** | **Not covered** | Add to Phase 4 |
| **M03 settingsStore.view3D dead** | **Not covered** | Add to new Phase 4.6 |
| **M04 settingsStore.defaultStyles dead** | **Not covered** | Add to new Phase 4.6 |
| **M05 gridVisible overlap** | **Not covered** | Add to new Phase 4.6 |
| **M06 settingsStore auto-persist** | **Not covered** | Add to new Phase 4.6 |
| **M07 as any casts in ops** | **Not covered** | Add to Phase 3 or follow-up |
| **M08 console.warn in types** | **Not covered** | Add to Phase 1 |
| **M09 Stale test directory** | **Not covered** | Add to Phase 7 |
| **M10 autosave spec orphan** | **Not covered** | Add to Phase 6 or 7 |
| **M11 POINT_2D_TYPE dead export** | **Not covered** | Expand Phase 1.3 |
| **M12 String label test scope** | **Not covered** | Expand Phase 1.1 planning |
| **M13 HierarchyMask is active** | **Plan risk** | Redefine anyLine() before deletion |
| **M14 Skipped Google Drive tests** | **Not covered** | Add to Phase 7 |