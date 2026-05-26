# Scope Check — Cycle 014 Build Contract Plan Edit

**Stage:** `cycle-014-build-contract-plan-edit-scout`  
**Purpose:** inspect the Wave 014 build/type-contract stop-rule blocker and prepare reviewed planning artifacts before any implementation or `wave-plan.md` edit.  
**Source-code changes in this stage:** none.

## Inputs inspected

- `.saivage/stages/cycle-014-implement-validation-contract-ownership/summary.json`
- `architecture-audit/cycle-014-validation-contract-ownership/implementation-log.md`
- `architecture-audit/cycle-014-validation-contract-ownership/decision.md`
- `architecture-audit/cycle-014-validation-contract-ownership/validation/frontend-build.after5.stdout`
- `architecture-audit/cycle-014-validation-contract-ownership/validation/frontend-build.after5.stderr`
- `architecture-audit/wave-plan.md`
- Representative affected source modules were read for classification only; no source/test/package file was edited.

## What Wave 014 already completed inside reviewed scope

Wave 014's approved implementation scope was validation contract ownership for known red/invalid gates. The implementation summary records two scoped commits, `1b1f37cbbb8fb8da96645c40160fce0384a5b316` and `806e1ac754899d0ad6d0322afd6b4a35a77d0f12`, and classifies the stage as escalated only because final build closure exceeded reviewed scope. Focused validation passed for the repaired owned surfaces: `focused-vitest.final.stdout` passed 64 tests across intersections, PropertiesDialog, and guide integration, and `focused-playwright-list.after5.stdout` listed four repaired e2e tests without parse errors.

The implementation log confirms the approved Wave 014 repairs were bounded to validation-ownership surfaces: intersection test contract, PropertiesDialog event typing/test expectations, guide integration repair/deletion of placeholder content, corrupted Playwright spec replacement, and a single frontend build-tool dependency update from `vue-tsc ^1.8.0` to `^2.2.12` so the active build gate could execute under Node 24. That dependency update did not hide the build failure; it revealed real TypeScript checking failures.

## Exact current build failure

`npm run build --workspace=frontend` now executes the active frontend build script:

```text
> diedrico-frontend@0.1.0 build
> vue-tsc && vite build
```

The old `vue-tsc` string-patch abort is gone. `vue-tsc` now fails on repository-wide type errors, and npm exits with code 2 (`frontend-build.after5.stderr:1-6`). The failure is broad: the stdout log contains over 150 TypeScript errors across app shell, command factories, command operations, process tree, projection-plane/world contracts, UI panels/toolbars/workspace rendering, services, stores, and domain calculation/world modules.

## Build failure categories with evidence

### 1. App-shell and environment/auth-store contract drift

Evidence:

- `frontend-build.after5.stdout:5` — `src/App.vue(85,10): error TS2322: Type 'ComputedRef<string>' is not assignable to type 'string'.`
- `frontend-build.after5.stdout:6-8` — `src/App.vue(110-112)` reports `Property 'env' does not exist on type 'ImportMeta'.`
- `frontend-build.after5.stdout:9-14` — `src/App.vue(130,5)` reports the app's auth store object is not assignable to `AuthStorePort` because `setAuthenticated` expects incompatible third parameters (`Date | undefined` versus `string | undefined`).

Classification: app-shell/browser-env/service-port type ownership. This is outside Wave 014's approved files and belongs to a build/type-contract ownership plan, not to the validation artifact cleanup already performed.

### 2. Command sequence factories deserialize untyped operation descriptors into typed constructors/actions

Evidence:

- `frontend-build.after5.stdout:18-31` — `GuideSequenceFactory.ts` passes `JsonValue | undefined` where strings or `string | undefined` are required and mixes `SiblingGuide2D` with `Guide2D`.
- `frontend-build.after5.stdout:32-44` — `IntersectionSequenceFactory.ts` calls process-tree action creators with too many arguments and passes `JsonValue | undefined` into string parameters.
- `frontend-build.after5.stdout:45-48` — `PointSequenceFactory.ts` passes `JsonValue | undefined` into string-only creation paths.
- `frontend-build.after5.stdout:314-324` — `PlaneSequenceFactory.ts` has the same `JsonValue | undefined` descriptor-to-string drift plus `UpdateElementStyleOp` serialization contract incompatibility.

Classification: command/persistence descriptor contract ownership. These errors point to the same broad command/undo/persistence contracts addressed architecturally by earlier waves; fixing them piecemeal inside Wave 014 would be an unreviewed source refactor.

### 3. Process-tree action model drift across commands, stores, and panels

Evidence:

- `frontend-build.after5.stdout:15-17` — `DeletionSequenceFactory.ts` reads `Action.id`, but `Action` no longer exposes that property.
- `frontend-build.after5.stdout:49-52` — `AddProcessTreeActionGroupOp.ts` passes `domain/processTree/ActionGroup.ActionGroup` where `ProcessTree.ActionGroup` is expected; `isAuxiliary` differs as optional versus required.
- `frontend-build.after5.stdout:161-172` — `ActionGroupItem.vue`, `ActionItem.vue`, and `ActionsPanel.vue` import removed `ConstructiveAction`/`ActionType` or read removed `Action` fields (`infeasible`, `infeasibilityReason`, `actionType`, `timestamp`, `id`).
- `frontend-build.after5.stdout:180-192` — `ProcessTreeNode.vue` expects `inputs`, `outputs`, or `name` on process-tree node variants that no longer expose those fields uniformly.
- `frontend-build.after5.stdout:241-242`, `304`, `325` — `ActionGroup.ts`, `ProcessTree.ts`, `styleService.ts`, and `processStore.ts` repeat the same stale `ConstructiveAction`/`Action.id` assumptions.

Classification: process-tree boundary ownership. This cannot be safely fixed by suppressing types because it decides what the construction-history domain model exposes to command factories, panels, stores, and style/dependency selectors.

### 4. Projection-plane mutation/realization context is not structurally aligned with `World`

Evidence:

- `frontend-build.after5.stdout:57-125` — many world operation classes pass `World` where `ProjectionPlaneMutationContext` is expected; TypeScript rejects this because `World.getPlaneForElement` is private while `ProjectionPlaneMutationContext.getPlaneForElement` is public.
- `frontend-build.after5.stdout:258-261` — `AuxiliaryProjectionPlane.ts` passes `ProjectionPlaneRealizationContext` where `World` is required.
- `frontend-build.after5.stdout:263-303` — `ProjectionPlane.ts` methods pass `ProjectionPlaneMutationContext` to element `realize2D` APIs that still require `World`, and also expose possibly undefined element lookups.

Representative source evidence confirms this is not a single typo: `ProjectionPlane.ts` declares factory/realization methods against `ProjectionPlaneMutationContext`, while many element `realize2D` calls still expect the larger `World` type. `World.ts` keeps `getPlaneForElement()` private, so it cannot satisfy the public mutation context structurally. This is a central domain-context contract issue.

Classification: domain world/projection-plane contract ownership. This is broader than Wave 014's selected line-line intersection result contract and must be reviewed as a type-contract wave or plan edit.

### 5. World operation implementation defects surfaced by strict type checking

Evidence:

- `frontend-build.after5.stdout:82-87` — `AddLineOp.ts` serializes `circleId` and `tangentIndex` from classes (`AddLine2DParallelToLineOp`, `AddLine2DPerpendicularToLineOp`) that do not own those fields.
- `frontend-build.after5.stdout:127-158` — `UpdateElementStyleOp.ts` treats line/circle lookups as points and returns a serialized descriptor whose `StyleProperties` is not valid `JsonObject` under the operation descriptor contract.
- `frontend-build.after5.stdout:116` — `RemoveElementOps.ts(408,36)` uses CommonJS `require` without Node typings in the frontend type environment.

Classification: command operation contract correctness. These are real source contract errors, but they are not caused by Wave 014's test/spec repairs.

### 6. UI components depend on stale stores, tool APIs, domain exports, and renderer DTO shapes

Evidence:

- `frontend-build.after5.stdout:159-160` — dialogs import removed `projectService` and read `Point2D.type` that is not on the current point model.
- `frontend-build.after5.stdout:173-179` — `ElementTypeGroup.vue`/`ElementsPanel.vue` contain unused variables and stale `Element2D` import from `@/domain/world/Element`.
- `frontend-build.after5.stdout:193-200` — `MainToolbar.vue` calls stale tool-store APIs (`clearTool`, `setActiveTool`) and passes plain strings where `ToolType` is required; `PlaneSelector.vue` uses a possibly undefined `world`.
- `frontend-build.after5.stdout:201-238` — `SvgCanvas.vue` reads stale hover-store shape (`temporary`), stale `ProjectionPlane.getArc()`, optional IDs as mandatory strings, and a stale `Primitive.geometry` rendering DTO shape.

Classification: UI/rendering/store contract drift. This is exactly the kind of cross-layer mismatch that requires reviewed ownership boundaries, not a Wave 014 validation-gate patch.

### 7. Service/store/domain strictness and stale import issues

Evidence:

- `frontend-build.after5.stdout:239-240` — `useHoverHighlight.ts` has unused imports and `CoordinateTransform.ts` imports removed `Plane3DCoordinateSystem`.
- `frontend-build.after5.stdout:243-257` — `Circle.ts`, `Line.ts`, and `Segment.ts` use possibly undefined planes under strict checking.
- `frontend-build.after5.stdout:305-308` — `GeometryService.ts` imports `../domain/calculations/intersections` with wrong casing/path and returns `Ok<unknown>` for a typed result.
- `frontend-build.after5.stdout:309-313` — `GoogleDriveService.ts` and `ProjectService.ts` pass nullable/optional values into non-null contracts.
- `frontend-build.after5.stdout:326` — `viewStore.ts` omits required `showReferenceAxes` in `ThreeViewDisplayOptions`.

Classification: service/store/domain type contract cleanup. Some are small, but they are numerous and distributed across ownership areas.

## Why the stop rule applies

The Wave 014 decision explicitly allows build-tooling repair only for the single active build contract and requires an actual build to pass before closure. It also states implementation must stop for a reviewed delta/plan-edit if build repair requires broad source changes or suppressing `vue-tsc` rather than making the single active build gate executable. The current failure is no longer an unsupported tooling abort; it is a repository-wide TypeScript contract backlog revealed by the supported `vue-tsc` version.

Repairing the current errors would touch many modules outside the Wave 014 approved implementation list: `App.vue`, command factories, process-tree operations, view-state operations, most world operations, projection-plane/domain world modules, panels, toolbars, workspace rendering, composables, services, and stores. Proceeding directly would violate the reviewed scope and risk arbitrary source cleanup under the label of validation ownership.

## Plan-edit conclusion

Wave 014's scoped validation-ownership repairs should be preserved. There is no evidence in the inspected build log that those repairs should be reverted; the key causal change was that the supported `vue-tsc` now exposes existing type-contract debt instead of aborting before type checking.

The correct next action is a reviewed plan edit. The smallest safe route is to add a new Wave 015 immediately after Wave 014 implementation but before Wave 014 final validation/preview closure, dedicated to repository-wide TypeScript/build contract ownership. After Wave 015 makes root/frontend build executable without suppressions or parallel build paths, the project must return to Wave 014 final validation and preview refresh to close the original validation-contract wave with the mandatory cadence.
