# Proposal Restructure — Owned Type-Contract Convergence Before Build Closure

**Stage:** `cycle-015-fresh-scout-proposals`  
**Wave:** 015 — Converge frontend TypeScript contracts around owned boundaries  
**Implementation authorized by this proposal now:** none; this proposal requires review/decision before source edits.

## Recommendation

Select this proposal over a purely line-by-line direct fix. The fresh backlog is stable and build-log bounded, but the repeated errors are not independent syntax mistakes; they are incomplete or stale contracts at owned boundaries. Implementation should converge each boundary once, then delete stale consumers, while remaining strictly limited to the current `vue-tsc` backlog and direct owner dependencies.

## Scope

This proposal keeps the exact same hard boundary as the Wave 015 plan entry and `scope-check.md`:

- current `npm run build --workspace=frontend` / `vue-tsc` errors only;
- direct owner dependencies required to eliminate those errors honestly;
- no nearby cleanup, broad architectural normalization, or unrelated source/test/package/tooling changes;
- six owner boundaries only: app shell/service ports, command descriptor/operation, process-tree action, projection-plane/world context, UI rendering/store DTO, and service/domain strictness.

## Boundary-first implementation model

### 1. App shell and service ports

Treat `App.vue`, app-shell runtime ports, auth store, and Vite ambient env typing as one port boundary. The owner decision is whether the app runtime expects token expiry or refresh-token semantics; make the port and store agree using a single authoritative interface. Add the minimal Vite ambient typing needed for `import.meta.env` rather than changing build tooling.

Likely files:

- `frontend/src/App.vue`
- `frontend/src/application/appShell/**`
- `frontend/src/stores/authStore.ts`
- minimal frontend ambient declaration file if absent
- focused app-shell/auth tests if behavior changes.

### 2. Command descriptor and operation results

Treat operation outputs/descriptors as authoritative typed boundaries instead of JSON bags at every call site. Repeated `JsonValue | undefined` errors in factories should be resolved by typed operation result descriptors or narrow owner guards adjacent to operation execution, not by per-line casts. Serialization errors, stale operation fields, and wrong imports should be fixed or deleted at the owning operation/descriptor module.

Likely files:

- `frontend/src/commands/operations/**` named by the build
- `frontend/src/commands/factories/**` named by the build
- `frontend/src/services/factories/PlaneSequenceFactory.ts`
- operation descriptor/result type modules
- focused command/factory/serialization tests for behavior-bearing changes.

### 3. Process-tree action model

Treat `Action.ts` / `ProcessTree.ts` as authoritative and align consumers to their current model. `Action` has `elementId`, `description`, and `isOutput`; `ProcessNode` is discriminated and only `Subprocess` has `name`. The implementation should delete stale reads of `id`, `actionType`, `timestamp`, `inputs`, `outputs`, and `ConstructiveAction` instead of resurrecting them.

Likely files:

- `frontend/src/domain/processTree/**`
- process action creators
- process-tree command operations
- process store
- `ActionItem.vue`, `ActionGroupItem.vue`, `ActionsPanel.vue`, `ProcessTreeNode.vue`
- focused process-tree/panel tests where behavior changes.

### 4. Projection-plane/world context ports

Treat mutation and realization context as a domain contract. The current error pattern proves the split is half-complete: operations pass `World` into `ProjectionPlaneMutationContext`, while projection-plane internals still pass narrowed contexts into element methods that require `World`. Converge one explicit port shape and use it consistently.

Acceptable implementation directions:

- expose a narrow, public context object from `World` that implements `ProjectionPlaneMutationContext` and realization context; or
- change element/plane realization methods to depend on narrow ports and ensure `World` implements or supplies those ports structurally.

Unacceptable: `World as any`, `World as unknown as ProjectionPlaneMutationContext`, or making private methods public only to satisfy structural typing without naming the intended port.

Likely files:

- `frontend/src/domain/world/World.ts`
- `frontend/src/domain/world/projectionPlane/**`
- `frontend/src/domain/world/{Circle,Line,Segment,HingeLine}.ts`
- world operation files named by the build
- focused projection-plane/world context tests where behavior changes.

### 5. UI rendering/store DTOs

Treat component/store/rendering primitive shapes as DTO contracts. Components must consume current store APIs and discriminated primitive variants. Delete stale reads such as `ProjectionPlane.getArc`, common `Primitive.geometry`, removed tool-store methods, and old action fields; do not retrofit DTOs solely to keep stale component code compiling.

Likely files:

- cited dialogs, panels, toolbars, `SvgCanvas.vue`
- hover/tool/view stores and rendering primitive DTO definitions where they own the mismatch
- focused component/rendering tests where behavior changes.

`PropertiesDialog.vue` is a special protected case: direct build error at line 288 permits a narrow DTO fix only. Preserve the Wave 014 emit contract and corresponding test intent.

### 6. Service/domain strictness

Treat import casing, result/null contracts, and strict undefined checks as service/domain boundary cleanup required by build. Fix exact failures only: lowercase `intersections` import, `Ok<unknown>` result typing, `string | null` Drive IDs, optional project record fields, missing display defaults, and strict plane/element guards.

Likely files:

- `frontend/src/services/GeometryService.ts`
- `frontend/src/services/GoogleDriveService.ts`
- `frontend/src/services/ProjectService.ts`
- `frontend/src/domain/calculations/CoordinateTransform.ts`
- `frontend/src/domain/world/{Circle,Line,Segment}.ts`
- `frontend/src/stores/viewStore.ts`
- `frontend/src/composables/useHoverHighlight.ts`
- focused service/domain tests where behavior changes.

## Explicit DELETE list

Delete stale surfaces proven by current build errors and direct owner inspection:

- `ConstructiveAction`, `ActionType`, `Action.id`, `Action.infeasible`, `Action.infeasibilityReason`, `Action.actionType`, `Action.timestamp`, `ActionNode.inputs`, `ActionNode.outputs`, and unguarded `ProcessNode.name` assumptions;
- duplicate/optional `ActionGroup` models if implementation confirms one is a stale parallel contract;
- stale operation result/serialization fields including `circleId` and `tangentIndex` reads where not owned by the current operation;
- raw `JsonValue | undefined` factory plumbing where typed operation outputs or guards replace it;
- stale service singleton import `projectService`;
- wrong-cased/removed imports (`intersections`, `Plane3DCoordinateSystem`, `Element2D`, view-state command/type paths);
- removed renderer/store API reads (`ProjectionPlane.getArc`, common `Primitive.geometry`, missing hover `temporary`, removed tool-store methods);
- frontend CommonJS `require` usage;
- unused imports/locals that `vue-tsc` flags and that have no runtime purpose;
- tests/helpers whose only role is preserving removed type surfaces, replacing them with current-owner behavior tests when behavior is affected.

## Anti-overreach constraints

This proposal explicitly forbids:

- TypeScript suppressions, `@ts-ignore`, `@ts-expect-error`, or weakening `tsconfig`;
- broad arbitrary `any` casts, compatibility shims, restored legacy fields, or adapter wrappers that keep both old and new contracts alive;
- package/tooling changes except adding minimal ambient env typing if needed; no parallel build scripts or build allowlists;
- unrelated command-controller, rendering, persistence, docs, debug-log, style, or naming cleanup;
- changing Wave 014 protected repairs except under the direct causal build-error rule;
- expanding a category into conceptual redesign without a reviewed delta/mini-cycle.

Expansion stop rule: if an owner boundary cannot be converged without broader conceptual redesign than required to honestly close the current build errors, stop and propose a reviewed mini-cycle. Do not smuggle a later wave into Wave 015.



## Prior-wave repaired surface constraint: ActionsPanel

The current build log directly cites `frontend/src/components/panels/ActionsPanel.vue(218,46)`, `(219,15)`, and `(223,26)`. That file belongs to a previously repaired process-tree/dependency-ownership surface, so implementation may reopen it only for those current type-contract failures and direct owner dependencies.

Implementation must preserve earlier process-tree/dependency behavior and must not use Wave 015 to redesign `ActionsPanel.vue`, reopen dependency-service architecture, normalize panel workflows, or perform command-controller cleanup. If the cited errors cannot be fixed without such broader Wave 005-area redesign, stop for a reviewed delta/mini-cycle.

## Protected Wave 014 surfaces

Preserve:

- `frontend/tests/unit/calculations/intersections.spec.ts`
- `frontend/src/components/dialogs/PropertiesDialog.vue`
- `frontend/tests/unit/components/propertiesDialog.spec.ts`
- `frontend/tests/integration/guide-creation.test.ts`
- `frontend/tests/e2e/keyboard-shortcuts.spec.ts`
- `frontend/tests/e2e/selection-mask.spec.ts`
- `frontend/package.json` `vue-tsc` upgrade

Current direct exception: `PropertiesDialog.vue` has a fresh `vue-tsc` error at line 288. A narrow fix may adjust the element-type DTO/read there, but must not revert the Wave 014 close/save emit typing or stale tests.

## Target outcome

The frontend build passes because each currently failing boundary has one authoritative contract:

- app runtime/store ports agree;
- command operations expose typed outputs/descriptors or guarded JSON boundaries;
- process-tree consumers use current `Action`/`ProcessNode` types;
- projection-plane/world mutation and realization contexts are explicit;
- UI components consume current store/render DTOs;
- services/domain modules satisfy strict import/null/result contracts.

The implementation log must include a six-boundary ownership note with fixed/deleted status and future-wave notes for non-build discoveries. Future-wave notes must not contain active `vue-tsc` errors.

## Success criteria and validation plan

Success requires:

- `npm run build --workspace=frontend` passes via existing `vue-tsc && vite build`;
- root `npm run build` passes because it delegates to frontend;
- no suppressions, compatibility shims, type-safety downgrades, alternate scripts, or restored stale fields;
- focused tests for every behavior-bearing change;
- mandatory validation logs captured under `architecture-audit/cycle-015-typescript-build-contracts/validation/`;
- preview refresh and reachability probe after validation;
- implementation log includes return-to-Wave-014 closure plan.

Validation commands:

1. pre-edit `npm run build --workspace=frontend` baseline;
2. focused Vitest for touched behavior-bearing contracts;
3. `npm run lint` and `npm run lint --workspace=frontend` where defined;
4. `npm run test` and `npm run test --workspace=frontend`;
5. `npm run build` and `npm run build --workspace=frontend`;
6. `npm run test:e2e` and `npm run test:e2e --workspace=frontend` where defined;
7. refresh live preview on `0.0.0.0:5173`, capture HTTP 200, and run Playwright MCP/live smoke through project creation/rendering/selection startup.

## Risks

- Boundary-first work can overreach into later waves. The exact-build-log/direct-owner guard and mini-cycle stop rule must be enforced.
- Half-complete projection-plane/world ports may reveal an architectural decision larger than Wave 015; do not hide it under casts.
- Process-tree UI may be stale. Deleting dead consumers may be correct, but active user-visible panels need focused tests.
- Command descriptor changes can affect undo/persistence; run focused command/serialization tests when descriptor behavior changes.
- Service/domain strictness fixes can mask behavior changes if done by defaulting values; document every default/guard as an owner contract.

## Dependencies

Depends on Wave 014 scoped validation repairs and `vue-tsc` build-gate upgrade. Must complete before returning to `cycle-014-validation-and-preview-refresh` because Wave 014 closure requires a trustworthy green build.

## Return-to-Wave-014 closure plan

After Wave 015 implementation validates green, immediately re-enter `cycle-014-validation-and-preview-refresh`. Run the full Wave 014 validation cadence against the combined source tree: root/frontend lint, focused and full Vitest, root/frontend build, root/frontend e2e/Playwright, live preview refresh on `0.0.0.0:5173`, HTTP reachability probe, and Playwright MCP/live checks for the repaired keyboard-shortcut and selection-mask flows. Only then close Wave 014 validation.
