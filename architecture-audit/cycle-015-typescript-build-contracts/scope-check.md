# Scope Check — Cycle 015 TypeScript Build Contracts

**Stage:** `cycle-015-fresh-scout-proposals`  
**Wave:** 015 — Converge frontend TypeScript contracts around owned boundaries  
**Source/test/package/tooling edits in this stage:** none.  
**Fresh build command:** `npm run build --workspace=frontend` from `/work/diedrico`.  
**Fresh build logs:**

- `architecture-audit/cycle-015-typescript-build-contracts/validation/frontend-build.scope-check.stdout`
- `architecture-audit/cycle-015-typescript-build-contracts/validation/frontend-build.scope-check.stderr`

## Premise check

Wave 015 premises still hold. The active frontend build remains red under the existing single build script, `vue-tsc && vite build`, declared in `frontend/package.json:8`; root `npm run build` delegates to `npm run build --workspace=frontend` in `package.json:13`. The fresh scope-check build exits with code 2 before Vite because `vue-tsc` reports TypeScript errors across the same contract-owner categories recorded in Wave 014's `frontend-build.after5.stdout`.

The fresh failure is not the old Node 24 / `vue-tsc` string-patch tooling abort. It is the real type-check backlog exposed after Wave 014 upgraded the build gate to `vue-tsc ^2.2.12` (`frontend/package.json:27`). That matches the Wave 014 implementation-log stop-rule statement and the Wave 014 build-contract decision.

## Comparison to Wave 014 `frontend-build.after5.stdout`

The fresh build output is materially unchanged from `architecture-audit/cycle-014-validation-contract-ownership/validation/frontend-build.after5.stdout`:

- The command banner is identical: `diedrico-frontend@0.1.0 build` followed by `vue-tsc && vite build`.
- The same first app-shell failures remain: `src/App.vue(85,10)`, `src/App.vue(110-112)`, and `src/App.vue(130,5)`.
- The same command/factory descriptor failures remain in `DeletionSequenceFactory.ts`, `GuideSequenceFactory.ts`, `IntersectionSequenceFactory.ts`, and `PointSequenceFactory.ts`.
- The same process-tree action/API mismatch remains around removed `Action` fields and exports.
- The same projection-plane/world context mismatch remains: `World` is not assignable to `ProjectionPlaneMutationContext` because `getPlaneForElement` is private on `World`.
- The same UI rendering/store DTO failures remain in panels, toolbars, `SvgCanvas.vue`, hover/tool/view stores, and primitive rendering DTOs.
- The same service/domain strictness failures remain in `GeometryService.ts`, `GoogleDriveService.ts`, `ProjectService.ts`, domain realization files, and `projectionPlane` modules.

Classification: **unchanged active build backlog**. The current source tree still requires Wave 015; no premise invalidation or wave-plan edit is needed before proposals.

## Current build-error ownership map

### 1. App shell and service-port boundary

Representative fresh errors:

- `src/App.vue(85,10): error TS2322: Type 'ComputedRef<string>' is not assignable to type 'string'.`
- `src/App.vue(110-112): error TS2339: Property 'env' does not exist on type 'ImportMeta'.`
- `src/App.vue(130,5): error TS2322 ... authStore ... is not assignable to type 'AuthStorePort'.`

Evidence and owner:

- `App.vue` passes `toolStore.currentToolStepMessage` directly to `StatusBar` at `frontend/src/App.vue:85`; the source excerpt shows the value is still a store computed value, not an unwrapped string.
- `App.vue` reads `import.meta.env.VITE_GOOGLE_*` at `frontend/src/App.vue:109-113`, but no frontend ambient `.d.ts` file exists under `frontend/src`, so Vite env typing is absent.
- `App.vue` passes Pinia stores into `createAppShellRuntime()` at `frontend/src/App.vue:126-134`. The build error shows `useAuthStore()`'s `setAuthenticated(profile, token, expiry?: Date)` does not match the application runtime's `AuthStorePort` expectation of `refreshToken?: string`.

Ownership classification: app-shell service ports and ambient Vite typing. Implementation should converge the app-shell runtime port to the actual authenticated-session contract or correct the auth store API if that is the owner; it must not paper over the mismatch with `any` or a wrapper that preserves both meanings.

### 2. Command descriptor and operation boundary

Representative fresh errors:

- `GuideSequenceFactory.ts(81,16)`, `(90,9)`, `(97,42)`, `(111,44)`, `(127,14)`: `JsonValue | undefined` is not assignable to `string`.
- `GuideSequenceFactory.ts(114,72)`: `SiblingGuide2D` is not assignable to `Guide2D`.
- `IntersectionSequenceFactory.ts(94,74)`, `(105,13)`, `(144,76)`, `(155,13)`, `(193,78)`: constructor/factory argument arity mismatches.
- `AddLineOp.ts(130,22)`, `(132,19)`, `(197,22)`, `(199,19)`: stale `circleId` / `tangentIndex` reads on parallel/perpendicular line operations.
- `UpdateElementStyleOp.ts(138,3)` and `registerWorldOperationDescriptors.ts(66,48)`: serialized `newStyle: StyleProperties` is not a `JsonObject` descriptor value.
- `ViewStateOperations.ts(5-6)`: wrong relative imports for `Command` / `CommandTypes`.

Evidence and owner:

- `GuideSequenceFactory` obtains `guideId` and `siblingGuideId` from `result.outputs` at `frontend/src/commands/factories/GuideSequenceFactory.ts:61-64` and `:87-94`; `outputs` is typed as JSON, so the factory currently assumes descriptor fields are strings without an owning guard or typed operation result.
- The same file casts and mutates guide internals at `GuideSequenceFactory.ts:97-119`, including `(primaryGuide as any).siblingGuideId`, which is exactly the sort of stale descriptor/plumbing surface Wave 015 must either type honestly or delete if dead.
- `IntersectionSequenceFactory` constructs process-tree actions at `frontend/src/commands/factories/IntersectionSequenceFactory.ts:90-109`, `:140-158`, and `:189-195`; the fresh errors show the factory's action-creator call contract does not match the current process/action constructors.

Ownership classification: command descriptor/operation result contracts. Implementation should type operation outputs at the operation/descriptor boundary or introduce narrow validation guards at the factory boundary, and delete stale serialization fields rather than re-adding obsolete operation properties.

### 3. Process-tree action boundary

Representative fresh errors:

- `DeletionSequenceFactory.ts(84-87)`, `ProcessTree.ts(355,18)`, `styleService.ts(69,51)`, and `ActionsPanel.vue(223,26)`: `Property 'id' does not exist on type 'Action'.`
- `ActionGroupItem.vue(48,15)`, `ActionGroup.ts(6,15)`, and `processStore.ts(5,15)`: no exported member `ConstructiveAction`.
- `ActionItem.vue(5-11)`: removed `infeasible`, `infeasibilityReason`, `actionType`, and `timestamp` reads.
- `ProcessTreeNode.vue(181-185)`: `inputs` / `outputs` do not exist on `ActionNode`.
- `ProcessTreeNode.vue(417,49)` and `(426,31)`: `name` does not exist on generic `ProcessNode` because `ActionGroup` lacks it.
- `AddProcessTreeActionGroupOp.ts(30,43)`: two `ActionGroup` types disagree on optional versus required `isAuxiliary`.
- `RenameSubprocessOp.ts(23,7)`: failure result lacks required `outputs`.

Evidence and owner:

- `Action` is intentionally minimal in `frontend/src/domain/processTree/Action.ts:29-33`, with only `elementId`, `description`, and `isOutput`.
- The same file documents removed fields at `Action.ts:14-19`: `id`, `type`, `actionType`, and `timestamp` were removed and should not be reintroduced for stale consumers.
- `ProcessTree` defines `ActionNode` as `ProcessNodeBase & Action` at `frontend/src/domain/processTree/ProcessTree.ts:39-44`, while `Subprocess` alone owns `name` at `ProcessTree.ts:24-30` and `ActionGroup` owns children/flags but not `name` at `ProcessTree.ts:32-37`.

Ownership classification: process-tree action DTO/API boundary. Implementation should align UI/panel/store/factory consumers to the current authoritative `Action`/`ActionNode` shape or delete dead consumers. It must not add compatibility fields back to `Action` just to satisfy stale panel code.

### 4. Projection-plane/world context boundary

Representative fresh errors:

- Many `commands/operations/world/**` files report `World` is not assignable to `ProjectionPlaneMutationContext` because `getPlaneForElement` is private on `World`.
- `ProjectionPlane.ts(260,41)`, `(284,40)`, `(308,42)`, and many later lines report `ProjectionPlaneMutationContext` is not assignable to `World` when element realization methods still require `World`.
- `AuxiliaryProjectionPlane.ts(74,9)` and `(125,9)` report `ProjectionPlaneRealizationContext` is not assignable to `World`.
- `Circle.ts`, `Line.ts`, `Segment.ts`, and `ProjectionPlane.ts` contain possibly-undefined plane/element reads under strict checks.

Evidence and owner:

- `World` is provided to app descendants in `frontend/src/App.vue:142`, and world operations still pass whole `World` instances into projection-plane mutation APIs according to the fresh build errors.
- The current error text identifies the key contract smell: `World` has a private `getPlaneForElement`, while `ProjectionPlaneMutationContext` requires an accessible method of that name. That means `World` accidentally resembles the port but cannot implement it structurally.
- The reciprocal errors inside `ProjectionPlane.ts` show the split is incomplete: mutation/realization context ports have been introduced, but internal element methods still require `World` in places.

Ownership classification: projection-plane/world mutation and realization context ports. Implementation should make context ownership explicit once at the domain boundary: either expose a narrow public method on a context object owned by `World`, or adjust element realization signatures to consume the narrowed ports. Do not cast `World as unknown as ProjectionPlaneMutationContext`.

### 5. UI rendering/store DTO boundary

Representative fresh errors:

- `PropertiesDialog.vue(288,15)`: `Point2D` has no `type` property.
- `NewProjectDialog.vue(43,10)`: no exported `projectService`; only `ProjectService` is exported.
- `MainToolbar.vue(45,33)`, `(49,30)`, `(50,15)`, `(52,15)`: string/tool-store method mismatches.
- `PlaneSelector.vue(139,3)`: `world` is possibly undefined.
- `SvgCanvas.vue(140,107)`: missing `temporary` on returned hover-store API.
- `SvgCanvas.vue(380,27)` and `(401,27)`: `ProjectionPlane.getArc` no longer exists.
- `SvgCanvas.vue(1187-1204)`: `Primitive` variants do not expose a common `geometry` property.
- `viewStore.ts(58,3)`: `ThreeViewDisplayOptions` requires `showReferenceAxes`.

Evidence and owner:

- `PropertiesDialog.vue` is a protected Wave 014 repair surface, so its `Point2D.type` error may be touched only because the current build directly cites `frontend/src/components/dialogs/PropertiesDialog.vue(288,15)`.
- `SvgCanvas.vue` remains a large rendering/controller surface; the fresh log cites hover state, plane arc access, optional IDs, tool callbacks, and primitive shape mismatches all in this component.
- The panel errors cited under process-tree also represent UI DTO consumers that assume old process fields.

Ownership classification: UI rendering/store DTO boundary. Implementation should align components to current store and rendering primitive DTOs, deleting stale dead reads and obsolete UI paths where they are only preserving removed fields. It should not normalize unrelated UI APIs or re-open Wave 014 tests unless required by a direct build error.

### 6. Service/domain strictness cleanup required by build

Representative fresh errors:

- `GeometryService.ts(5,8)`: wrong-cased/removed import `../domain/calculations/intersections`.
- `GeometryService.ts(34,9)`: `Ok<unknown>` is not assignable to the service result type.
- `CoordinateTransform.ts(18,15)`: `Plane3DCoordinateSystem` is not exported from `Plane`.
- `GoogleDriveService.ts(154,34)` and `(190,34)`: `string | null` is not assignable to `string`.
- `ProjectService.ts(93,52)`: `record.nextElementId` is possibly undefined.
- `Circle.ts`, `Line.ts`, and `Segment.ts`: strict undefined plane checks.
- `useHoverHighlight.ts(15,30)`: unused `Ref` import.

Evidence and owner:

- `frontend/src/services/ProjectService.ts` is still involved in project record restoration; the fresh error at `ProjectService.ts(93,52)` must be resolved at the persistence/domain contract edge without reopening Wave 014 validation repairs.
- `GeometryService.ts` is a service/domain adapter and the lowercase `intersections` path contradicts the existing Wave 014 domain file `frontend/src/domain/calculations/Intersections.ts`.
- The domain realization errors are strictness issues in active world element modules and projection-plane context use, not validation-test failures.

Ownership classification: service/domain strictness. Implementation should fix the exact strict import/nullability/result-contract failures that block `vue-tsc`, with tests for behavior-bearing service/domain contract changes.

## Protected Wave 014 repair surfaces

Wave 014 protected surfaces remain protected unless a direct fresh build error cites them:

- `frontend/tests/unit/calculations/intersections.spec.ts` — no current `vue-tsc` build error cites this test file; protected.
- `frontend/src/components/dialogs/PropertiesDialog.vue` — directly cited at `PropertiesDialog.vue(288,15)`; this file may be touched only to resolve that specific `Point2D.type` contract error and direct owner dependencies. Its Wave 014 close/save emit repair must not be reverted.
- `frontend/tests/unit/components/propertiesDialog.spec.ts` — no current `vue-tsc` build error cites this test file; protected unless behavior-bearing changes to `PropertiesDialog.vue` require focused test alignment.
- `frontend/tests/integration/guide-creation.test.ts` — no current `vue-tsc` build error cites this test file; protected.
- `frontend/tests/e2e/keyboard-shortcuts.spec.ts` — no current `vue-tsc` build error cites this test file; protected.
- `frontend/tests/e2e/selection-mask.spec.ts` — no current `vue-tsc` build error cites this test file; protected.
- `frontend/package.json` `vue-tsc` build-gate upgrade — no current evidence supports reverting or replacing it; protected.

No current build error is causally traced to the Wave 014 test repairs or Playwright parse repairs. The only protected source surface with a direct error is `PropertiesDialog.vue`, and only the cited domain/UI DTO mismatch is in scope.

## Out-of-scope findings and stop rule

This scope check deliberately does not authorize implementation. It also does not authorize broader cleanup of debug logs, old phase comments, rendering architecture, command-controller leaks, persistence redesign, or root validation policy beyond the exact build backlog.

If implementation discovers that any category requires conceptual redesign beyond honest elimination of the current `vue-tsc` errors and their direct owner dependencies, Wave 015 must stop for a reviewed delta/mini-cycle before broadening the work.
