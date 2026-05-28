# Cycle 023 Scope Check — Runtime-session consumer ports / command-history boundary

## Stage boundary

This is a design/scout artifact for the current `cycle-023-fresh-scout-proposals-runtime-session-consumer-ports-command-history-boundary` dispatch. It does **not** implement source changes, change tests, run validation, refresh preview, touch package/tooling, backend, docs/spec source, Drive/auth internals, rendering/Three/CSS, or protected config/env/provider files.

## Source-control reconciliation

Path-scoped status/diff evidence was captured before writing this revision in `.saivage/stages/cycle-023-fresh-scout-proposals-runtime-session-consumer-ports-command-history-boundary/design-notes/scout-plan-status.txt`.

Observed scoped dirty context:

- Modified Cycle 022 audit artifacts: `architecture-audit/cycle-022-runtime-session-kernel-persistence-port-boundary/decision-post-021-plan-correction.md`, `decision.md`, and `validation/live-preview.stdout`.
- Modified production file outside this design task: `frontend/src/commands/Command.ts`.
- Untracked Cycle 022 audit/review/validation artifacts.
- Pre-existing `architecture-audit/cycle-023-runtime-session-consumer-ports-command-history-boundary/reviews/` artifacts.

This task did not inspect protected secret/config/env/provider file contents, did not revert or normalize unrelated dirty work, and did not use unrelated dirty source as implementation authority. It intentionally touched only Cycle 023 design artifacts, stage design notes, and the task report.

## Inputs inspected

- `architecture-audit/wave-plan.md` Wave 023 and Wave 024 sections, captured in `design-notes/scout-plan-status.txt`.
- Cycle 022 closure/implementation artifacts, especially the residual-risk note that Wave 022 left raw runtime consumers for follow-up.
- Current app-shell source excerpts captured in `design-notes/source-excerpts.txt` and `design-notes/consumer-seams.txt`.
- Current UI contract e2e excerpt captured in `design-notes/current-ui-contract-lines.txt`.
- Existing Cycle 023 artifact directory inventory, which shows prior Cycle 023 proposals, reviews, validation logs, and `implementation-log.md` are already present in the working tree.

## Current-source finding: Wave 023 implementation premise is now stale

The Wave 023 plan entry is valid historically and was central after Wave 022, but the **current source no longer matches the pre-implementation premise**. The core Wave 023 cleanup appears already present in source:

- `RuntimeSession` owns concrete `World` and `CommandStack` privately (`frontend/src/application/appShell/RuntimeSession.ts:24-26`) and no longer exposes the old raw accessors named by the Wave 023 delete list. A current grep found no `worldForView`, `worldForUseCases`, `commandStackForShortcuts`, or `commandStackForCommandServices` call sites in the inspected application/component/tool paths.
- App-shell consumer ports already exist in `AppShellPorts.ts`: `ActivePlanePort` (`frontend/src/application/appShell/AppShellPorts.ts:31-43`), `SelectionReadPort` (`AppShellPorts.ts:45-48`), and `CommandHistoryPort` (`AppShellPorts.ts:50-56`).
- `ActivePlaneUseCases` already depends on `ActivePlanePort`, not `World` (`frontend/src/application/appShell/ActivePlaneUseCases.ts:1-12`), and uses only port methods for subscription, active-plane reads/writes, summaries, and name lookup (`ActivePlaneUseCases.ts:14-56`).
- `SelectionUseCases` already depends on `SelectionReadPort` plus `SelectionDeletionCommandPort`, not `World` (`frontend/src/application/appShell/SelectionUseCases.ts:1-13`), and uses narrow methods for select-all and cascade preview (`SelectionUseCases.ts:41-55`).
- `KeyboardShortcutRouter` already depends on `CommandHistoryPort`, not `CommandStack` (`frontend/src/application/appShell/KeyboardShortcutRouter.ts:1-17`), and uses it only for undo/redo predicates/actions (`KeyboardShortcutRouter.ts:96-100`).
- `AppShellRuntime` wires named session ports into app-shell use cases instead of immediately unwrapping raw runtime objects for those consumers (`frontend/src/application/appShell/AppShellRuntime.ts:15-23`, `:44-47`, `:76-85`).
- `RuntimeSession` already creates `activePlanePort`, `selectionReadPort`, `commandHistoryPort`, and `selectionDeletionCommandPort` (`frontend/src/application/appShell/RuntimeSession.ts:124-165`).

Therefore the expected Cycle 023 direct implementation should **not** be run again. Reimplementing the old proposal would at best duplicate existing structure and at worst churn current source/tests outside a valid implementation cycle.

## Residual seams after current-source scout

The current source still has architecture debt, but most of it belongs to later or corrected waves rather than another Wave 023 implementation.

### 1. Deferred command-producer seam — belongs to Wave 024

`RuntimeSession` now exposes command-producer/controller ports for canvas/tools and process history, and those still pass owned `world`/`commandStack` into command-producing controllers:

- `canvasCommandProducerPort(...)` constructs `CanvasToolController` with `world` and `commandStack` (`frontend/src/application/appShell/RuntimeSession.ts:109-115`).
- `processHistoryCommandPort()` constructs `ProcessHistoryController` with `world` and `commandStack` (`RuntimeSession.ts:117-121`).
- `AppShellRuntime` returns `canvasCommandProducerPort` and `processHistoryCommandPort` to downstream UI/controller composition (`frontend/src/application/appShell/AppShellRuntime.ts:16-18`, `:107-115`).

This matches the Wave 024 plan entry's premise: command-producer runtime ports for canvas, construction, and process history should be the next central implementation target after Wave 023, not hidden inside this scout.

### 2. View/read/presentation seam — not Wave 023 implementation scope

`RuntimeSession` now owns several view/read ports around the same `World`: `canvasViewPort`, `processTreeReadPort`, `elementsPanelPort`, `threePresentationPort`, and `activePlaneSelectorPort` (`frontend/src/application/appShell/RuntimeSession.ts:29-107`). These are narrower than raw `worldForView()`, but they still concentrate multiple read-model/presentation responsibilities in `RuntimeSession` and call world-backed helpers (`RuntimeSession.ts:29-107`, `:226-236`). This is a later rendering/read-model boundary concern, not a reason to reopen Wave 023's consumer-port implementation.

### 3. Persistence adapter concrete handle / DTO cast seam — candidate future cleanup, not current Wave 023 blocker

The public app-shell persistence contract remains opaque in `AppShellPorts.ts` (`frontend/src/application/appShell/AppShellPorts.ts:7-14`, `:58-68`), while adapter-facing concrete handles live in `ProjectSessionPersistenceTargets.ts` (`frontend/src/application/appShell/ProjectSessionPersistenceTargets.ts:1-12`). `ProjectSessionPersistenceAdapter` still casts unknown validated data to `ProjectData` and persisted payload back to `ProjectData` when bridging to `ProjectService` (`frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts:1-20`).

This is bounded adapter debt. Removing the remaining DTO casts cleanly likely intersects the persistence contract / `ProjectService` DTO boundary, which Wave 023 explicitly protected. It should be recorded as a future persistence-port candidate or folded into a later plan correction only after Wave 024 command-producer ownership is settled.

### 4. Selection deletion command service still uses raw runtime internally by design

`SelectionDeletionCommandService` remains the concrete command-building service and imports `World`/`CommandStack` (`frontend/src/application/selectionDeletion/SelectionDeletionCommandService.ts` per `design-notes/consumer-seams.txt`). Current app-shell use cases consume it through `SelectionDeletionCommandPort` (`frontend/src/application/appShell/SelectionUseCases.ts:1-13`) and `RuntimeSession.selectionDeletionCommandPort()` constructs it internally (`frontend/src/application/appShell/RuntimeSession.ts:163-165`). That satisfies the Wave 023 consumer boundary; deeper command-production cleanup belongs with Wave 024-style command-producer work.

## Protected surfaces and preservation requirements

Do not change in this scout or any immediate Cycle 023 correction/closure stage:

- Production source/tests as part of this design task.
- Persistence schema/replay, command descriptors, `OperationRegistry`, migration/backcompat behavior, or `ProjectService` internals.
- Canvas/tool/construction/process-history command-producer implementation until the reviewed Wave 024 cycle.
- Rendering/Three/canvas/CSS/domain realization internals.
- Drive/auth/browser credentials, backend, docs/spec source, package/tooling, validation platform, or debug cleanup.
- Protected secret/config/env/provider files.

3D overlay pointer behavior remains a protected user-visible contract: `frontend/tests/e2e/current-ui-contract.spec.ts:89-117` asserts the 3D overlay has `pointer-events: auto`, owns hit testing, and does not pass drag gestures through to the SVG canvas.

## Premise decision

**Wave 023 runtime-session consumer ports / command-history boundary is valid in centrality, but stale as a next implementation wave against the current source.** The current tree already contains the core Wave 023 outcome. The correct next action is not another Cycle 023 implementation; it is a short Cycle 023 closure/decision reconciliation or plan-correction note that recognizes the boundary is already applied, then proceeds to the next central wave (currently Wave 024) after required review/decision hygiene.

## DELETE list candidates for any future correction

No production DELETE list is authorized from this scout. If a reviewer/critic requires a tiny Cycle 023 correction rather than closure, limit it to artifact-level clarification or static boundary assertions. Do **not** delete source surfaces in this scout. Source DELETE candidates for future cycles are:

- Wave 024: delete command-producer raw stack handoffs from canvas/tool/process-history command producers after reviewed proposals.
- Later persistence-port cleanup: delete remaining adapter DTO casts only if the reviewed persistence contract can do so without schema/replay redesign.
- Later rendering/read-model cleanup: split `RuntimeSession` read/presentation helper concentration into named read-model owners.

## Validation requirements for the next implementation wave

If the project proceeds to Wave 024 implementation, validation must follow the mandatory cadence under that cycle's `validation/` directory: path-scoped pre/post status/diff, static boundary scans, focused Vitest for touched runtime/command-producer modules, root/frontend lint, root/frontend full Vitest, root/frontend build, root/frontend e2e, live preview refresh on `0.0.0.0:5173`, HTTP probe, and Playwright/live smoke for representative command-producer and undo/redo flows.

If the manager instead schedules a Cycle 023 closure/reconciliation stage, it should run only focused static scans and artifact review sufficient to prove Wave 023 source criteria are already met; it should not implement or validate broad source behavior again.

## Recommendation

Do **not** implement the original Wave 023 direct or restructure proposal against this current source. Route these revised artifacts to the Critic/reviewer. If approved, the Manager should write a precise Cycle 023 decision/closure artifact stating that Wave 023's target outcome is already present in current source and that the next canonical stage should be `cycle-024-fresh-scout-proposals-command-producer-runtime-ports-for-canvas-construction-and-process-history` (or a reviewed wave-plan correction if the manager finds Wave 024's current text is inconsistent with source).
