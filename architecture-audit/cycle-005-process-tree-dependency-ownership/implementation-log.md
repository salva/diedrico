# Wave 005 Implementation Log — Process-tree/dependency ownership

## Scope implemented

Implemented `architecture-audit/cycle-005-process-tree-dependency-ownership/decision.md` Proposal Direct only.

## Source files changed

- `frontend/src/domain/processTree/ProcessTree.ts`
  - Deleted `ProcessTree.addAction()` implicit action-group compatibility API.
  - Deleted `ProcessTree.getActionsDependingOnElement()` dependency-query compatibility API.
  - Kept explicit `addActionGroup()` / `addActionToGroup()` semantics unchanged.
- `frontend/src/domain/world/World.ts`
  - Deleted `World.addAction()` proxy to the removed process-tree compatibility API.
- `frontend/src/domain/world/DependencyService.ts`
  - Deleted `DependencyService.rebuildDependencyMaps()` no-op shim.
  - Deleted `DependencyService.getActionDependencies()` action-era placeholder.
  - Removed stale comments tying the service to process-tree action scanning.
  - Correction `t3-correct-deletion-sequence-coverage`: fixed `getElementsInDeletionOrder()` to return leaf dependents before selected roots, matching its dependents-first contract and the deletion factory's referential-integrity requirement.
- `frontend/src/commands/operations/world/RemoveElementOps.ts`
  - Correction `t3-correct-deletion-sequence-coverage`: fixed `RemoveSegment2DOp` runtime subtype detection to use the concrete `Segment2DByPoints` constructor instead of the erased `Segment2D` type alias.
- `frontend/src/App.vue`
  - Removed the post-delete call to the deleted no-op `rebuildDependencyMaps()`.
- `frontend/src/commands/factories/README.md`
  - Replaced stale rebuild snippet with incremental dependency-graph note.

## Tests changed/deleted

- `frontend/tests/unit/processTree.spec.ts`
  - Rewrote all `tree.addAction(...)` fixture setup to explicit `ActionGroup` creation plus `addActionGroup()` / `addActionToGroup()`.
  - Deleted skipped `getActionsDependingOnElement()` compatibility tests.
- `frontend/tests/unit/commands/removeElementOps.spec.ts`
  - Rewrote helper setup to explicit action-group insertion.
  - Replaced stale dependency rebuild shortcut with real `DependencyService.registerNode(line.id, [p1.id, p2.id])` setup.
- `frontend/tests/unit/commands/factories/DeletionSequenceFactory.spec.ts`
  - Initial implementation over-deleted the stale skipped cascade suite and left only two minimal active tests; reviewer correction restored meaningful active factory coverage.
  - Current coverage uses explicit `ActionGroup` + `addActionToGroup()` setup and real `DependencyService.registerNode(...)`; it does not call implicit process-tree insertion or deleted rebuild/action-dependency shims.
  - Active scenarios now cover empty selection, single point deletion with process-action tombstoning, element-without-action deletion, dependency-driven point→line and point→circle cascades, multiple independent point deletion, undo/redo for cascade deletion, and segment deletion dispatch.
  - The restored tests exposed and drove the narrow fixes to deletion ordering and segment subtype detection listed above.

## Explicit DELETE list completion

Completed:

- `ProcessTree.addAction()` deleted.
- `World.addAction()` deleted.
- `ProcessTree.getActionsDependingOnElement()` deleted.
- `DependencyService.rebuildDependencyMaps()` deleted.
- `DependencyService.getActionDependencies()` deleted.
- Active implicit action-group test setup deleted/replaced.
- Skipped process-tree dependency-query tests deleted.
- Stale source/test calls to rebuild/action-dependency shims deleted.
- No compatibility aliases, wrappers, stubs, barrels, TODO shims, or fallback implicit group creation were added.
- No `ActionsPanel.vue` use-case extraction or Wave 006 UI/controller work was implemented.

## Validation commands and logs

All stdout/stderr logs are under `architecture-audit/cycle-005-process-tree-dependency-ownership/validation/`.

### Static deletion checks

- `preedit-static-deprecated.*` — pre-edit inventory of deprecated call sites.
- `static-deleted-names-after-comment.*` — `rg -n "\.addAction\(|getActionsDependingOnElement|World\.addAction|ProcessTree\.addAction|rebuildDependencyMaps\(|getActionDependencies" frontend/src frontend/tests`; exit 1/no matches after removing an active-test comment mention.
- `static-process-world-definitions.*` — no removed process/world definitions; exit 1/no matches.
- `static-dependency-shims.*` — no removed dependency-service shim definitions/calls; exit 1/no matches.
- `static-actions-panel-scope.*` — no Wave 006 use-case extraction markers; exit 0 due `|| true`, no matches.
- `t3-static-deleted-names.*` — reran deleted-name check after reviewer correction; exit 1/no matches in active source/tests.

### Focused tests

Passed:

- `focused-process-tree.*`: `npm run test --workspace=frontend -- tests/unit/processTree.spec.ts` — 15 passed.
- `focused-deletion-dependency-rerun.*`: original implementation focused deletion/dependency rerun — 15 passed before reviewer correction, but with insufficient factory coverage.
- `t3-focused-deletion-sequence-factory-rerun.*`: corrected `DeletionSequenceFactory.spec.ts` — 8 passed.
- `t3-focused-deletion-dependency.*`: corrected deletion/dependency set (`DeletionSequenceFactory.spec.ts`, `removeElementOps.spec.ts`, `projectService.cascadeDeletion.spec.ts`) — 21 passed.
- `focused-subprocess-stack.*`: subprocess stack/project-service tests — 21 passed.
- `focused-command-persistence.*`: initialize world, command stack, round trip, determinism tests — 59 passed.
- `focused-dependency-graph.*`: original dependency graph suite — 34 passed.
- `t3-focused-dependency-graph.*`: reran dependency graph suite after deletion-order correction — 34 passed.

A first deletion-focused run (`focused-deletion-dependency.*`) failed because the rewritten empty-selection test committed an empty command; the test was corrected to assert zero operations without committing, then the rerun passed.

During reviewer correction, `t3-focused-deletion-sequence-factory.*` initially failed and identified two attributable defects: `DependencyService.getElementsInDeletionOrder()` returned selected roots before dependents despite its dependents-first contract, and `RemoveSegment2DOp` used an erased `Segment2D` type alias in an `instanceof` check. Both were corrected, then `t3-focused-deletion-sequence-factory-rerun.*`, `t3-focused-deletion-dependency.*`, and `t3-focused-dependency-graph.*` passed.

### Full cadence

- `root-lint.*`: failed because `eslint` is not installed/found (`sh: 1: eslint: not found`). Existing tooling debt, not attributable to Wave 005 deleted APIs.
- `frontend-lint.*`: same `eslint` missing failure.
- `root-test.*`: failed with existing repository-wide failures unrelated to Wave 005, including malformed import in `tests/integration/guide-creation.test.ts`, stale selection/intersection/properties dialog/GuideTool assertions. Touched focused suites passed.
- `root-build.*`: failed in `vue-tsc` before app compilation with `Search string not found: "/supportedTSExtensions = .*(?=;)/"` on Node.js v24.15.0. Existing tooling/runtime incompatibility noted in proposal residual risks.
- `frontend-build.*`: same `vue-tsc`/Node 24 failure.
- `backend-build.*`: passed (`tsc`).
- `frontend-e2e.*`: failed before executing tests because existing Playwright specs are syntactically malformed (`tests/e2e/keyboard-shortcuts.spec.ts`, `tests/e2e/selection-mask.spec.ts`). Not attributable to Wave 005.

## Live preview refresh

- `live-preview-refresh-command-rerun.*` refreshed/probed preview. Existing or new Vite preview answered `http://127.0.0.1:5173/` successfully.
- `live-preview-probe.*` contains the reachability probe response and marker (`existing preview reachable` or new preview marker).
- The server command uses `npm run dev --workspace=frontend -- --host 0.0.0.0` when a new server is required.

## Residual risks / future waves

- `ActionsPanel.vue` still directly imports/construes process-tree operation classes. This is intentionally deferred to Wave 006 per the decision.
- Repository-wide validation debt remains: missing eslint binary, vue-tsc/Node 24 build crash, malformed e2e specs, and unrelated full-suite failures. These should be addressed in separate waves/tooling cleanup, not by restoring deleted compatibility APIs.
- Deletion factory coverage now explicitly exercises representative cascade behavior without compatibility shims. Remaining breadth beyond these representative factory scenarios is covered by the focused remove-element and integration cascade-deletion suites.

## Validation-and-preview stage rerun — cycle-005-validation-and-preview-refresh

Validation stage `t1-run-validation-and-refresh-preview` reran the mandatory cadence with stage-prefixed stable logs under `architecture-audit/cycle-005-process-tree-dependency-ownership/validation/`.

### Static deleted-API/reference checks

All required deleted-surface checks returned no active source/test matches; `rg` exit code `1` is recorded in the stdout log as the expected no-match result:

- `stage-static-deleted-names.stdout` / `.stderr`: `rg -n "\.addAction\(|getActionsDependingOnElement|World\.addAction|ProcessTree\.addAction|rebuildDependencyMaps\(|getActionDependencies" frontend/src frontend/tests` — PASS, no matches (`EXIT_CODE=1`).
- `stage-static-process-world-definitions.stdout` / `.stderr`: `rg -n "addAction\(|getActionsDependingOnElement" frontend/src/domain/processTree/ProcessTree.ts frontend/src/domain/world/World.ts` — PASS, no matches (`EXIT_CODE=1`).
- `stage-static-dependency-shims.stdout` / `.stderr`: `rg -n "rebuildDependencyMaps|getActionDependencies" frontend/src/domain/world/DependencyService.ts frontend/src frontend/tests` — PASS, no matches (`EXIT_CODE=1`).
- `stage-static-actions-panel-scope.stdout` / `.stderr`: `rg -n "process-history use-case|processHistoryUseCases|application/processTree" frontend/src/components/panels/ActionsPanel.vue frontend/src/application frontend/tests` — PASS, no Wave 006 process-history extraction markers (`EXIT_CODE=1`).

### Focused Wave 005 validation

Passed:

- `stage-focused-process-tree.stdout` / `.stderr`: `npm run test --workspace=frontend -- tests/unit/processTree.spec.ts` — 15 tests passed.
- `stage-focused-subprocess-stack.stdout` / `.stderr`: `npm run test --workspace=frontend -- tests/integration/processTree-stack.test.ts tests/unit/services/ProjectService.subprocess.spec.ts` — 21 tests passed.
- `stage-focused-deletion-dependency.stdout` / `.stderr`: `npm run test --workspace=frontend -- tests/unit/commands/factories/DeletionSequenceFactory.spec.ts tests/unit/commands/removeElementOps.spec.ts tests/integration/projectService.cascadeDeletion.spec.ts` — 21 tests passed. The stderr warning for an element with no producing action is expected behavior asserted by the test.
- `stage-focused-dependency-graph-rerun.stdout` / `.stderr`: `npm run test --workspace=frontend -- tests/unit/dependencyGraph.spec.ts` — 34 tests passed.
- `stage-focused-command-persistence.stdout` / `.stderr`: `npm run test --workspace=frontend -- tests/unit/commands/initializeWorldCommand.spec.ts tests/unit/commands/commandStack.spec.ts tests/unit/services/ProjectService.roundTrip.spec.ts tests/integration/projectService.determinism.spec.ts` — 59 tests passed.

Non-attributable operator-path error, corrected immediately:

- `stage-focused-dependency-graph.stdout` / `.stderr`: first dependency graph command used nonexistent paths (`tests/unit/services/DependencyService.spec.ts`, `tests/integration/dependency-graph.test.ts`) and failed with `No test files found`; this was a validation command path mistake, not a product failure. The correct existing dependency graph spec was then run and passed in `stage-focused-dependency-graph-rerun.*`.

### Full cadence

- `stage-root-lint.stdout` / `.stderr`: `npm run lint` — FAIL, classified pre-existing/tooling. Evidence: `sh: 1: eslint: not found`; the frontend script invokes an eslint binary that is not installed in the current dependency tree. This is unrelated to Wave 005 process-tree/dependency API deletion.
- `stage-frontend-lint.stdout` / `.stderr`: `npm run lint --workspace=frontend` — FAIL, same pre-existing/tooling missing `eslint` binary.
- `stage-root-test.stdout` / `.stderr`: `npm run test` — FAIL, classified pre-existing/unrelated. Evidence includes malformed/stale import `tests/integration/guide-creation.test.ts` importing missing `../../src/commands/operations/AddFreePoint2DOp`, stale `selectionMask`, `intersections`, `propertiesDialog`, and `GuideTool` assertions. The Wave 005 focused suites covering touched process-tree, dependency, deletion, undo/redo, and persistence behavior passed.
- `stage-backend-test.stdout` / `.stderr`: `npm run test --workspace=backend` — PASS, 15 tests passed.
- `stage-root-build.stdout` / `.stderr`: `npm run build` — FAIL, classified pre-existing/tooling. Evidence: `vue-tsc` throws `Search string not found: "/supportedTSExtensions = .*(?=;)/"` on `Node.js v24.15.0` before compiling app code.
- `stage-frontend-build.stdout` / `.stderr`: `npm run build --workspace=frontend` — FAIL, same pre-existing `vue-tsc`/Node 24 tooling incompatibility.
- `stage-backend-build.stdout` / `.stderr`: `npm run build --workspace=backend` — PASS (`tsc`).
- `stage-frontend-e2e.stdout` / `.stderr`: `npm run test:e2e --workspace=frontend` — FAIL before executing tests, classified pre-existing e2e-spec syntax debt. Evidence: syntax errors in `frontend/tests/e2e/keyboard-shortcuts.spec.ts` at `267:10160` and `frontend/tests/e2e/selection-mask.spec.ts` at `188:2`.

No failing validation command is attributable to the Wave 005 API deletions or the corrected deletion-order/segment-dispatch fixes. The required focused Wave 005 coverage passed after the implementation-stage corrections.

### Live preview refresh and reachability

- `stage-live-preview-refresh-and-probe.stdout` / `.stderr`: stopped the previously tracked Wave 005 preview process if present, found an existing single preview already reachable on `http://127.0.0.1:5173/`, avoided starting a duplicate, and recorded an HTTP `200 OK` probe response from Vite. The tracked preview command remains `npm run dev --workspace=frontend -- --host 0.0.0.0` when a new server is needed; this probe confirms the live app endpoint answered after refresh/probe handling.

### Validation-stage residual risks

- Full lint remains blocked by missing eslint installation/configuration.
- Frontend build remains blocked by `vue-tsc` compatibility with the current Node/TypeScript runtime before code compilation.
- Full frontend Vitest and Playwright remain blocked by repository-wide stale tests/spec syntax that predate Wave 005 and are outside this wave's corrective scope.
- These validation debts should become future tooling/test-cleanup work; they do not justify restoring any deleted Wave 005 compatibility API.

## Preview binding correction — t3-correct-preview-binding-evidence

Reviewer `t2-review-stage-validation` blocked on insufficient proof that the live preview was bound on `0.0.0.0`; the previous evidence only showed a `127.0.0.1` reachability probe. The correction reran the preview refresh with stable logs and explicit socket/process evidence.

Logs:

- `validation/t3-preview-binding-evidence.stdout` / `.stderr`: canonical evidence log written by the correction script.
- `validation/t3-preview-binding-command.stdout.log` / `.stderr.log`: command wrapper output captured by Saivage.
- `validation/live-preview.stdout` / `.stderr`: Vite dev-server output after restart.
- `validation/live-preview.pid`: refreshed preview parent PID.

Result: PASS. Evidence recorded in `t3-preview-binding-evidence.stdout`:

- The pre-correction listener on port 5173 was stopped: `Stopping existing preview listener PIDs: 329763`.
- The preview was restarted with the required command: `npm run dev --workspace=frontend -- --host 0.0.0.0`.
- The refreshed process tree shows `npm run dev --host 0.0.0.0` with child `sh -c vite --host 0.0.0.0`.
- `ss -ltnp 'sport = :5173'` after correction shows `LISTEN ... 0.0.0.0:5173 ... users:(("MainThread",pid=333301,fd=22))`, proving the active listener is bound to all interfaces rather than only localhost.
- Vite startup output includes `Network: http://10.0.3.113:5173/`.
- HTTP probes returned `localhost_status=200` and `container_ip_status=200` for `http://10.0.3.113:5173/`.

This resolves the preview-binding evidence blocker without code changes or deviations from Wave 005 scope.

