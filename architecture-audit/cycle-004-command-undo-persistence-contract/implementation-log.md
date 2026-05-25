# Implementation Log — Wave 004 Command/Undo Persistence Contract

Decision implemented: `architecture-audit/cycle-004-command-undo-persistence-contract/decision.md`, selected Proposal Direct.

## Source changes

This retry completed the remaining source cleanup on top of the existing typed command-stream implementation in the working tree:

- `frontend/src/commands/operations/IOperation.ts`
  - Tightened the main JSON descriptor object boundary from `[key: string]: any` to `[key: string]: JsonValue | undefined`.
- `frontend/src/commands/operations/world/AddGuideOp.ts`
  - Removed mutable `parameters` bags from `AddGuide2DPerpendicularToLineOp` and `AddSiblingGuide2DOp`.
  - Persisted generated guide IDs only through typed output state (`outputs.guideId` / `outputs.siblingGuideId`) and restored constructor IDs.
  - Kept redo behavior by reusing output state when no restored ID is present.
- `frontend/src/components/workspace/SvgCanvas.vue`
  - Replaced the remaining command private-cast inspection `(cmd as any).operations` with `cmd.getOperations()`.
- `frontend/tests/unit/services/ProjectService.roundTrip.spec.ts`
  - Rewrote stale guide round-trip assertions to inspect typed descriptors rather than removed guide `parameters` bags.

The implementation also verified the already-present Proposal Direct surfaces in the current source:

- `frontend/src/commands/Command.ts` has `Command.restore(...)`, `CommandSnapshot`, `RestoredCommandInput`, `toSnapshot()`, and readonly `getOperations()` inspection.
- `frontend/src/commands/CommandStack.ts` has committed-command inspection and `restoreCommittedCommands(...)`, restoring only committed undo history and clearing redo history.
- `frontend/src/domain/world/World.ts` has `peekNextId()` and validated `restoreNextId(...)`.
- `frontend/src/commands/operations/OperationRegistry.ts` plus family registrars provide typed descriptor serialization/deserialization.
- `frontend/src/services/ProjectService.ts` uses command snapshots, the operation registry, `World.restoreNextId(...)`, and `CommandStack.restoreCommittedCommands(...)`; it no longer contains migration helpers or `reconstructOperation()`.
- `frontend/src/App.vue` save paths use `world.peekNextId()` rather than incrementing `world.getNextId()`.

## Deleted / removed legacy surfaces

- Removed the remaining active-source command private-cast inspection in `SvgCanvas.vue`.
- Removed AddGuide mutable persistence parameter bags and the old generated-ID fallback pattern (`outputs.guideId || parameters.guideId`).
- Verified stale files from the decision delete list are absent:
  - `frontend/tests/unit/architecture/serializationCoverage.spec.ts`
  - `frontend/tests/unit/services/ProjectService.serialization.test.ts`
  - `frontend/tests/e2e/persistence.spec.ts`

## Validation commands and logs

Logs are under `architecture-audit/cycle-004-command-undo-persistence-contract/validation/`.

- Focused Vitest final command:
  - Command: `npm run test --workspace=frontend -- tests/unit/commands/command.spec.ts tests/unit/commands/commandStack.spec.ts tests/unit/commands/operations/operationRegistry.spec.ts tests/unit/services/ProjectService.roundTrip.spec.ts tests/unit/services/ProjectService.selfContainment.spec.ts tests/unit/services/ProjectService.subprocess.spec.ts tests/integration/projectService.determinism.spec.ts tests/integration/projectService.cascadeDeletion.spec.ts`
  - Logs: `focused-vitest-after-svgcanvas.stdout`, `focused-vitest-after-svgcanvas.stderr`
  - Result: passed, 8 test files, 105 tests.
- Static deletion/reference check:
  - Command: `rg -n "\(cmd as any\)\.operations|\(world as any\)\.nextId|\(op as any\)\.parameters|\(commandStack as any\)\.undoStack|reconstructOperation|migrateProjectData|migrateIdToCamelCase|migrateOperationParams|Skipping corrupted|parameters\.guideId|outputs\.guideId \|\|" frontend/src frontend/tests/unit/services frontend/tests/unit/commands/operations`
  - Logs: `static-deletion-after-svgcanvas.stdout`, `static-deletion-after-svgcanvas.stderr`
  - Result: no active-source forbidden persistence/private-cast/migration hits. The only match is `ProjectService.roundTrip.spec.ts` asserting `RemoveGuide2D`'s `parameters.guideId`, which is unrelated to the removed AddGuide generated-ID persistence pattern.
- Frontend build check:
  - Command: `npm run build --workspace=frontend`
  - Logs: `frontend-build-implementation.stdout`, `frontend-build-implementation.stderr`, `frontend-build-implementation-rerun.stdout`, `frontend-build-implementation-rerun.stderr`
  - Result: failed before project typechecking due to environment/toolchain incompatibility: `vue-tsc` cannot patch TypeScript under Node.js `v24.15.0` (`Search string not found: "/supportedTSExtensions = .*(?=;)/"`). This appears unrelated to the Wave 004 source changes.

## Residual risks / caveats

- Full mandatory cadence (root lint/full test/build/e2e/preview refresh) remains for the next validation stage. This implementation stage ran focused validation and a build probe only.
- `npm run build --workspace=frontend` currently fails in `vue-tsc` before compiling source under Node 24. This should be handled in validation by using the project-supported Node version or updating the build toolchain in a reviewed tooling wave.
- Many operation classes still expose legacy `parameters` fields for ordinary operation internals/tests. This retry removed the Wave 004 blocker for AddGuide generated-ID persistence and tightened the main `IOperation` descriptor boundary, but broad operation-internal cleanup may be a future wave if desired.
- Live Drive was not exercised in this implementation task; no secrets were read.

## Candidate future waves

- Remove remaining operation-internal mutable `parameters` fields where they are no longer needed after registry descriptors.
- Replace remaining domain/UI `as any` casts in rendering, properties dialogs, process tree, and geometry helpers with typed accessors.
- Resolve the Node/vue-tsc toolchain incompatibility so build validation is deterministic in the container.


## Follow-up fix — AddIntersectionPoint2D descriptor restoration

Reviewer-blocking mismatch fixed by task `t3-fix-addintersection-serialization`:

- `frontend/src/commands/operations/world/AddIntersectionPointOp.ts`
  - `serialize()` now emits the current constructor/operation fields `line1Id` and `line2Id` instead of nonexistent `parameters.element1Id` / `parameters.element2Id` values.
- `frontend/src/commands/operations/world/registerWorldOperationDescriptors.ts`
  - `AddIntersectionPoint2D` registry restoration now reads `line1Id` / `line2Id` and restores persisted `pointId` output state with `restoreOutput(...)`.
- `frontend/tests/unit/commands/operations/operationRegistry.spec.ts`
  - Added focused round-trip coverage proving both newly created and registry-restored `AddIntersectionPoint2D` operations serialize to the same descriptor, including restored output `pointId`.

Additional focused validation logs:

- Focused Vitest:
  - Command: `npm run test --workspace=frontend -- tests/unit/commands/operations/operationRegistry.spec.ts tests/unit/commands/createIntersectionPoint.spec.ts`
  - Logs: `t3-focused-vitest.stdout`, `t3-focused-vitest.stderr`
  - Result: passed, 2 files, 10 tests.
- Static descriptor-field check:
  - Command: `rg -n "AddIntersectionPoint2D|element1Id|element2Id|line1Id|line2Id" frontend/src/commands/operations/world/AddIntersectionPointOp.ts frontend/src/commands/operations/world/registerWorldOperationDescriptors.ts frontend/tests/unit/commands/operations/operationRegistry.spec.ts`
  - Logs: `t3-addintersection-static-check.stdout`, `t3-addintersection-static-check.stderr`
  - Result: active AddIntersection serializer/registry/test paths use `line1Id` / `line2Id`; no stale `element1Id` / `element2Id` fields remain in those scoped files.

## Validation stage — cycle-004-validation-and-preview-refresh

Validation logs are under `architecture-audit/cycle-004-command-undo-persistence-contract/validation/`.

| Check | Command | Logs | Result | Classification |
| --- | --- | --- | --- | --- |
| Root lint | `npm run lint` | `root-lint.stdout`, `root-lint.stderr` | Failed: `eslint: not found` | Pre-existing/tooling dependency issue. The failure occurs before linting source and is identical through the root script's frontend workspace delegation. Not attributable to Wave 004 command/undo persistence changes. |
| Frontend lint | `npm run lint --workspace=frontend` | `frontend-lint.stdout`, `frontend-lint.stderr` | Failed: `eslint: not found` | Pre-existing/tooling dependency issue; `eslint` is invoked by package script but is not installed in the current dependency tree. Not attributable to Wave 004. |
| Focused Wave 004 Vitest | `npm run test --workspace=frontend -- tests/unit/commands/command.spec.ts tests/unit/commands/commandStack.spec.ts tests/unit/commands/operations/operationRegistry.spec.ts tests/unit/services/ProjectService.roundTrip.spec.ts tests/unit/services/ProjectService.selfContainment.spec.ts tests/unit/services/ProjectService.subprocess.spec.ts tests/integration/projectService.determinism.spec.ts tests/integration/projectService.cascadeDeletion.spec.ts tests/unit/commands/createIntersectionPoint.spec.ts` | `focused-vitest.stdout`, `focused-vitest.stderr` | Passed: 9 files, 110 tests | Wave 004 accepted for focused operation serialization, save/open/local persistence, undo/redo-after-load, deterministic replay/restoration, and touched command/ProjectService coverage. |
| Full frontend Vitest via root | `npm run test` | `root-full-vitest.stdout`, `root-full-vitest.stderr` | Failed: 1 failed suite and 18 failed tests | Unrelated/pre-existing stale test debt. Failures include stale import paths in `frontend/tests/integration/guide-creation.test.ts:5-6`, an architecture test bug in `frontend/tests/unit/architecture/noCommandSubclasses.spec.ts:26,32` (`path` default import has no `resolve`), selection/tool expectation drift in `frontend/tests/unit/selectionMask.spec.ts:116`, unrelated geometry calculation expectations, PropertiesDialog close/save expectations, and stale GuideTool API expectations (`tool.onMouseDown is not a function`). Focused Wave 004 persistence/command tests pass. |
| Backend Vitest | `npm run test --workspace=backend` | `backend-vitest.stdout`, `backend-vitest.stderr` | Passed: 1 file, 15 tests | No Wave 004 backend regression. |
| Root build | `npm run build` | `root-build.stdout`, `root-build.stderr` | Failed: `vue-tsc` throws `Search string not found: "/supportedTSExtensions = .*(?=;)/"` under Node.js `v24.15.0` | Pre-existing/toolchain incompatibility also observed during implementation. Failure occurs before project source typechecking; not attributable to Wave 004. |
| Frontend build | `npm run build --workspace=frontend` | `frontend-build.stdout`, `frontend-build.stderr` | Failed: same `vue-tsc`/Node 24 error | Pre-existing/toolchain incompatibility; not attributable to Wave 004. |
| Backend build | `npm run build --workspace=backend` | `backend-build.stdout`, `backend-build.stderr` | Passed | No Wave 004 backend regression. |
| Frontend e2e / Playwright | `npm run test:e2e --workspace=frontend` | `frontend-e2e.stdout`, `frontend-e2e.stderr` | Failed at test parsing | Unrelated/pre-existing e2e fixture corruption. `frontend/tests/e2e/keyboard-shortcuts.spec.ts:267` contains concatenated cascade-deletion test text inside the file, and `frontend/tests/e2e/selection-mask.spec.ts:188` reports a syntax error. The runner fails before exercising the app or Wave 004 persistence behavior. |
| Static deletion/reference check | `rg -n "\(cmd as any\)\.operations|\(world as any\)\.nextId|\(op as any\)\.parameters|\(commandStack as any\)\.undoStack|reconstructOperation|migrateProjectData|migrateIdToCamelCase|migrateOperationParams|Skipping corrupted|parameters\.guideId|outputs\.guideId \|\|" frontend/src frontend/tests/unit/services frontend/tests/unit/commands/operations || true` | `static-deletion-check.stdout`, `static-deletion-check.stderr` | Passed for active Wave 004 delete-list intent | Only hit is `frontend/tests/unit/services/ProjectService.roundTrip.spec.ts:202`, which asserts `RemoveGuide2D`'s input `parameters.guideId`; it is not the removed AddGuide generated-ID fallback pattern. |

Validation acceptance: **accepted with non-attributable repository/tooling failures**. All mandatory commands applicable to the repo were run and logged. No failure was attributable to Wave 004 because the Wave 004 focused persistence/command/serialization tests pass, backend tests/build pass, and observed full-suite/build/e2e failures are either dependency/toolchain failures before source validation or stale unrelated tests outside the touched command/ProjectService persistence contract.

Residual risks / follow-up candidates from validation:

- Install or restore the frontend lint toolchain (`eslint`) or remove the stale lint script in a dedicated tooling cleanup wave.
- Resolve the Node 24 / `vue-tsc` incompatibility so frontend builds can typecheck in this container.
- Repair or delete stale full-suite/e2e tests with obsolete imports, malformed files, and old tool APIs as part of a test-suite architecture wave.

## Live preview refresh

Preview refresh was completed after validation classification:

- Command: `nohup npm run dev --workspace=frontend -- --host 0.0.0.0 > architecture-audit/cycle-004-command-undo-persistence-contract/validation/live-preview-refresh.stdout 2> architecture-audit/cycle-004-command-undo-persistence-contract/validation/live-preview-refresh.stderr &`
- PID file: `architecture-audit/cycle-004-command-undo-persistence-contract/validation/live-preview.pid`
- Probe command: `curl -I --max-time 10 http://127.0.0.1:5173/`
- Probe logs: `live-preview-probe-retry.stdout`, `live-preview-probe-retry.stderr`
- Result: HTTP `200 OK`; Vite reported `vite --host 0.0.0.0`, local URL `http://localhost:5173/`, and network URL `http://10.0.3.113:5173/`.
