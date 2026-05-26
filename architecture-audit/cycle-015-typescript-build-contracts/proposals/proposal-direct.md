# Proposal Direct — Bounded TypeScript Build-Backlog Closure

**Stage:** `cycle-015-fresh-scout-proposals`  
**Wave:** 015 — Converge frontend TypeScript contracts around owned boundaries  
**Implementation authorized by this proposal now:** none; this proposal requires review/decision before source edits.

## Scope

Implement a direct, build-log-bounded repair of the current `vue-tsc` backlog captured in:

- `architecture-audit/cycle-015-typescript-build-contracts/validation/frontend-build.scope-check.stdout`
- `architecture-audit/cycle-014-validation-contract-ownership/validation/frontend-build.after5.stdout`

The implementation may touch only files that are directly named by the fresh build or are direct owner dependencies required to eliminate those exact errors honestly. The six owner boundaries from `scope-check.md` define the implementation lanes:

1. app shell/service ports and Vite env typing;
2. command descriptor/operation result contracts;
3. process-tree action/API contracts;
4. projection-plane/world context ports;
5. UI rendering/store DTO contracts;
6. service/domain strictness failures required by build.

No source, test, package, or tooling change is proposed in this scout stage.

## Files likely to change in implementation

Directly cited current build files include:

- `frontend/src/App.vue`
- app-shell/auth runtime port files under `frontend/src/application/appShell/` and `frontend/src/stores/authStore.ts` if direct owner inspection proves the port mismatch belongs there
- a new or existing Vite ambient declaration file under `frontend/src/` if needed for `import.meta.env`
- `frontend/src/commands/factories/DeletionSequenceFactory.ts`
- `frontend/src/commands/factories/GuideSequenceFactory.ts`
- `frontend/src/commands/factories/IntersectionSequenceFactory.ts`
- `frontend/src/commands/factories/PointSequenceFactory.ts`
- `frontend/src/services/factories/PlaneSequenceFactory.ts`
- `frontend/src/commands/operations/processTree/*.ts` named by the build
- `frontend/src/commands/operations/viewState/ViewStateOperations.ts`
- `frontend/src/commands/operations/world/*.ts` named by the build
- `frontend/src/commands/operations/world/registerWorldOperationDescriptors.ts`
- `frontend/src/domain/processTree/Action.ts`, `ActionGroup.ts`, `ProcessTree.ts`, process action creators, and direct process-store/panel consumers named by the build
- `frontend/src/domain/world/World.ts`
- `frontend/src/domain/world/projectionPlane/*.ts`
- `frontend/src/domain/world/{Circle,HingeLine,Line,Segment}.ts`
- `frontend/src/domain/calculations/CoordinateTransform.ts`
- `frontend/src/components/dialogs/NewProjectDialog.vue`
- `frontend/src/components/dialogs/PropertiesDialog.vue` only for the direct `Point2D.type` error and without reverting its Wave 014 emit typing
- cited panel/toolbar/workspace components: `ActionGroupItem.vue`, `ActionItem.vue`, `ActionsPanel.vue`, `ElementTypeGroup.vue`, `ElementsPanel.vue`, `ProcessTreeNode.vue`, `MainToolbar.vue`, `PlaneSelector.vue`, `SvgCanvas.vue`
- cited stores/composables/services: `processStore.ts`, `viewStore.ts`, `useHoverHighlight.ts`, `GeometryService.ts`, `GoogleDriveService.ts`, `ProjectService.ts`
- focused tests for behavior-bearing changes in the listed owner boundaries.

A file not named above is in scope only if implementation documents it as a direct owner dependency of a current build error.

## Direct implementation approach

1. **Capture and freeze the current backlog.** Before edits, rerun `npm run build --workspace=frontend` and save stdout/stderr under the cycle validation directory. Use the fresh scope-check logs as the initial comparison point.
2. **Repair owner contracts category by category.** For repeated errors, change the owner contract once rather than casting call sites:
   - app shell: align `StatusBar` props, auth-store/runtime port signature, and Vite env ambient typing;
   - command/factory: narrow `OperationResult.outputs` access using typed operation outputs or local descriptor guards at the operation boundary;
   - process tree: align UI/store/factory consumers with `Action.elementId`, `description`, `isOutput`, `ActionNode`, and discriminated `ProcessNode` types;
   - projection/world: make mutation/realization context ports explicit and accessible, or adjust element realization signatures to consume the current narrow port;
   - UI/store: align component reads to current store methods and primitive DTO variants, deleting stale reads;
   - services/domain: fix exact import casing, strict nullability, and result type mismatches.
3. **Delete stale surfaces where the build proves they are obsolete.** Do not re-add removed fields to satisfy stale consumers.
4. **Run focused tests after behavior-bearing changes.** Pure unused import/dead read deletions can rely on build plus existing tests; any command/operation, process-tree, projection-plane, service, or UI behavior change needs focused Vitest.
5. **Run the mandatory validation cadence.** Capture stable logs under `architecture-audit/cycle-015-typescript-build-contracts/validation/`.

## Explicit DELETE list

Delete only stale surfaces proven by the current build backlog or direct owner inspection:

- stale action model assumptions: `ConstructiveAction`, `ActionType`, `Action.id`, `Action.infeasible`, `Action.infeasibilityReason`, `Action.actionType`, `Action.timestamp`, and stale process-node `inputs`/`outputs`/unguarded `name` reads;
- stale command operation serialization/result fields not owned by the class, including `circleId`/`tangentIndex` reads on parallel/perpendicular line operations if they are obsolete;
- stale `JsonValue | undefined` descriptor plumbing where a typed descriptor/result or validation guard is the correct boundary;
- stale singleton import `projectService` if only `ProjectService` is exported;
- wrong-cased/removed imports such as `../domain/calculations/intersections`, `Plane3DCoordinateSystem`, `Element2D` from the wrong module, and view-state command imports;
- stale renderer/store API reads such as `ProjectionPlane.getArc`, `Primitive.geometry`, missing hover `temporary`, removed tool-store methods, and missing `showReferenceAxes` defaults;
- frontend CommonJS `require` usage;
- unused imports/locals reported by `vue-tsc` where removing them is the minimal honest fix;
- dead helper code or tests whose only purpose is to preserve stale type surfaces revealed by the current build errors.

## Anti-overreach constraints

Forbidden:

- TypeScript suppressions (`@ts-ignore`, `@ts-expect-error`) or blanket casts;
- broad `as any` / `as unknown as` compatibility casts to pass `vue-tsc`;
- tsconfig strictness downgrades, build allowlists, alternate build scripts, or parallel toolchains;
- adding removed compatibility fields back to domain models solely for stale UI/store code;
- unrelated API normalization, stylistic cleanup, phase-comment cleanup, or rendering/persistence redesign not required by current build errors;
- reopening Wave 014 repaired files except under the protected-surface rule below.

Expansion stop rule: if any category requires conceptual redesign beyond honest closure of the current `vue-tsc` errors and direct owner dependencies, stop implementation and write a reviewed delta/mini-cycle proposal before continuing.

## Wave 014 repair protection

Preserve these committed Wave 014 repairs unless a specific current build error is causally traced to the file and documented:

- `frontend/tests/unit/calculations/intersections.spec.ts`
- `frontend/src/components/dialogs/PropertiesDialog.vue`
- `frontend/tests/unit/components/propertiesDialog.spec.ts`
- `frontend/tests/integration/guide-creation.test.ts`
- `frontend/tests/e2e/keyboard-shortcuts.spec.ts`
- `frontend/tests/e2e/selection-mask.spec.ts`
- the `frontend/package.json` `vue-tsc` build-gate upgrade

Current scope-check result: only `PropertiesDialog.vue` is directly cited by `vue-tsc`; any edit there must be limited to the `Point2D.type` UI/domain DTO mismatch and must preserve the Wave 014 close/save emit contract.

## Target outcome

`npm run build --workspace=frontend` succeeds using the existing `vue-tsc && vite build` script. Root `npm run build` also succeeds because it delegates to the frontend workspace. All six categories in the scope-check map have implementation-log ownership notes describing the authoritative type/interface after repair, fixed/deleted status for current errors, tests run, and residual future-wave questions.

## Success criteria and validation plan

Implementation is successful only if:

- no active TypeScript build errors remain;
- no suppression, compatibility shim, type-safety downgrade, or parallel build path is introduced;
- focused tests cover behavior-bearing changes in command/operation descriptors, process-tree action rendering, projection-plane/world context behavior, app/service ports, and rendering/store DTOs;
- root/frontend lint, full Vitest, root/frontend build, frontend/root e2e where defined, and live preview refresh/probe pass with logs captured under the Wave 015 validation directory;
- implementation log records the six-category ownership map and return-to-Wave-014 closure plan.

Minimum validation commands:

1. `npm run build --workspace=frontend` before edits, captured as fresh failing baseline;
2. focused Vitest for touched behavior-bearing files;
3. `npm run lint` and `npm run lint --workspace=frontend` where defined;
4. `npm run test` and `npm run test --workspace=frontend`;
5. `npm run build` and `npm run build --workspace=frontend`;
6. `npm run test:e2e` and `npm run test:e2e --workspace=frontend` where defined;
7. refresh preview on `0.0.0.0:5173`, capture HTTP 200, and run Playwright MCP/live smoke for project creation/rendering/selection startup.

## Risks

- Direct closure could devolve into call-site casting. Review must reject this.
- The projection-plane/world context category may expose a deeper domain-port design question; enforce the stop rule rather than broadening silently.
- The process-tree UI may include stale/dead consumers; implementation should static-search before preserving them and delete dead paths rather than restoring old `Action` fields.
- Command descriptor fixes may touch persistence/undo semantics; behavior-bearing changes need focused command/serialization/undo tests.
- `PropertiesDialog.vue` is protected from Wave 014; only the direct current build error permits a narrow edit.

## Dependencies

Depends on Wave 014 implementation commits and the `vue-tsc` build-gate repair that exposed the backlog. Must complete before returning to `cycle-014-validation-and-preview-refresh`.

## Return-to-Wave-014 closure plan

After Wave 015 implementation and validation pass, do not proceed to an unrelated refactor wave. Re-enter `cycle-014-validation-and-preview-refresh` and run the full Wave 014 validation cadence against the combined Wave 014 + Wave 015 source tree, including repaired keyboard-shortcut and selection-mask e2e/live checks.
