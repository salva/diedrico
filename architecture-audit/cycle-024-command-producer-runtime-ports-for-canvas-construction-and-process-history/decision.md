# Cycle 024 Decision — Command-producer runtime ports for canvas, construction, and process history

## Decision status

**Review convergence reached with no blocking issues. Cycle 024 is approved to proceed to implementation using `proposals/proposal-direct.md`.**

Reviewed artifacts:

- `architecture-audit/cycle-024-command-producer-runtime-ports-for-canvas-construction-and-process-history/scope-check.md`
- `architecture-audit/cycle-024-command-producer-runtime-ports-for-canvas-construction-and-process-history/proposals/proposal-direct.md`
- `architecture-audit/cycle-024-command-producer-runtime-ports-for-canvas-construction-and-process-history/proposals/proposal-restructure.md`
- `architecture-audit/cycle-024-command-producer-runtime-ports-for-canvas-construction-and-process-history/critique/critic-review.md`
- `architecture-audit/cycle-024-command-producer-runtime-ports-for-canvas-construction-and-process-history/critique/critic-review-addendum.md`
- `architecture-audit/cycle-024-command-producer-runtime-ports-for-canvas-construction-and-process-history/reviews/round-01-review.md`
- `architecture-audit/wave-plan.md`
- `architecture-audit/cycle-023-runtime-session-consumer-ports-command-history-boundary/decision.md`

Review evidence:

- `reviews/round-01-review.md` records **Blocking issues: None** and recommends `proposal-direct.md` as the preferred path.
- `critique/critic-review.md` is accepted as synthesized Critic evidence: `synthesized_by: manager`, `reason: critic_dispatch_unavailable`, with two failed Critic dispatches handled through the required failure-tolerance protocol.
- `critique/critic-review-addendum.md` is accepted as synthesized correction-review evidence and approves the in-place corrections for preview-boundary coverage and stale-plan reconciliation.

This decision is design/audit-only. It does not authorize or perform source implementation inside this stage.

## Source-control context at decision time

Path-scoped status and diffstat were captured before authoring this decision under:

- `.saivage/stages/cycle-024-decision-command-producer-runtime-ports-for-canvas-construction-and-process-history/design-notes/pre-status.stdout`
- `.saivage/stages/cycle-024-decision-command-producer-runtime-ports-for-canvas-construction-and-process-history/design-notes/pre-diffstat.stdout`

Observed dirty context includes unrelated production edits in:

- `frontend/src/commands/Command.ts`
- `frontend/src/components/panels/ActionGroupItem.vue`
- `frontend/src/components/panels/ActionItem.vue`
- `frontend/src/components/panels/ElementTypeGroup.vue`
- `frontend/src/components/toolbars/MainToolbar.vue`

The scoped diff shows `frontend/src/commands/Command.ts` already has an unrelated generic typing change to `Command.addAndExecute(...)`. That change is **not** part of the reviewed Cycle 024 implementation authority and must not be depended on, normalized, reverted, or incorporated unless a separate reviewed delta explicitly authorizes it.

The future implementation stage must inspect path-scoped status/diff first, touch only the reviewed Cycle 024 files, and must not revert, rewrite, commit, or rely on the unrelated dirty panel/toolbar/command files unless they become part of an explicitly reviewed delta.

## Current-source basis and stale wave-plan reconciliation

Cycle 024 remains architecturally valid and central after Cycle 023 closure. Cycle 023 is closed as already satisfied by current source: `RuntimeSession` privately owns `World` / `CommandStack`, app-shell consumers use named ports, and the remaining residual seam is command-producing canvas/tool/process-history wiring.

However, the Wave 024 entry in `architecture-audit/wave-plan.md` contains stale implementation details. Current source and boundary tests show that these surfaces are already absent:

- `RuntimeSession.commandStackForDeferredCommandProducers()`
- raw `commandStack` provide/inject for `SvgCanvas.vue`
- `runtime.commandStack` handoff from `AppShellRuntime`

For Cycle 024 implementation, the reviewed current-source proposal set supersedes that stale accessor/provide-inject wording. Implementation authority comes from the active seam identified in the reviewed artifacts:

- `RuntimeSession.canvasCommandProducerPort(...)` still constructs `CanvasToolController` with private `world` and `commandStack` (`frontend/src/application/appShell/RuntimeSession.ts:109-114`).
- `RuntimeSession.processHistoryCommandPort()` still constructs `ProcessHistoryController` with private `world` and `commandStack` (`frontend/src/application/appShell/RuntimeSession.ts:117-121`).
- `CanvasToolController` still accepts raw `World` / `CommandStack` and passes them into canvas movement, style, construction, and quick-tool use cases (`frontend/src/application/tools/CanvasToolController.ts:13-44`).
- `ProcessHistoryController` still accepts raw `World` / `CommandStack` and passes them into `ProcessHistoryUseCases` (`frontend/src/application/processHistory/ProcessHistoryController.ts:15-25`).

A wave-plan correction stage is **not** required before implementation because `reviews/round-01-review.md` explicitly accepts the corrected proposal set as sufficient to supersede stale Wave 024 accessor/provide-inject wording for this cycle. A plan correction becomes mandatory only if implementation discovers premise drift beyond the reviewed seams or attempts to rely on stale `commandStackForDeferredCommandProducers()` / raw provide-inject claims.

## Selected path

Selected: **`proposal-direct.md` — Runtime-owned command producer services for current canvas/construction/process-history seams.**

Rationale:

- It targets the active current-source seam without reviving already-deleted raw accessors.
- It centralizes command lifecycle ownership behind behavior-sized runtime-owned producer services.
- It deletes raw `CommandStack` constructor parameters/imports and direct `commandStack.push(...)` calls from the scoped producers instead of preserving compatibility shims.
- It avoids broad redesign of persistence, command serialization, rendering, app-shell composition, Drive/auth, backend, package tooling, or UI features.

Rejected as primary implementation: **`proposal-restructure.md`.**

`proposal-restructure.md` remains an explicit contingency/stop path only. Do not implement a broad command kernel or split the wave unless direct implementation proves structurally insufficient. The implementation stage must stop for a reviewed delta/plan edit if direct migration would require a generic facade indistinguishable from `CommandStack`, duplicate transactional lifecycle code across several services, or change command serialization/replay/descriptor ownership.

## Binding implementation scope

The next implementation stage may change only files required to implement the reviewed direct proposal. Expected scope:

- `frontend/src/application/appShell/RuntimeSession.ts`
  - Compose runtime-owned command-production services from private `world` / `commandStack`.
  - Stop passing raw `commandStack` into `CanvasToolController` and `ProcessHistoryController`.
  - Preserve runtime-private ownership of `world` and `commandStack`.
- `frontend/src/application/tools/CanvasToolController.ts`
  - Replace raw `World` / `CommandStack` dependency with named command producers/use cases.
  - Continue implementing `ToolCommandSink`.
- `frontend/src/application/canvas/CanvasPointMovementUseCase.ts`
  - Remove direct `CommandStack` dependency and stack push ownership.
  - Preserve preview rollback, repeated preview, commit-with-preview, commit-without-preview no-op, cancel rollback, and undo behavior.
- `frontend/src/application/canvas/CanvasStyleUseCase.ts`
  - Remove direct `CommandStack` dependency and stack push ownership.
  - Delete the local `as any` cast only if it can be removed without depending on unrelated dirty `Command.ts` work or changing descriptor/registry semantics.
- `frontend/src/application/construction/ConstructionUseCases.ts`
  - Remove raw `CommandStack` from the execution contract and route command lifecycle through the selected producer/executor.
  - Keep construction operation/factory responsibilities otherwise within current scope; do not decompose construction as a separate architectural wave here.
- `frontend/src/application/construction/QuickToolUseCases.ts`
  - Delete stale `world` / `commandStack` parameters if static usage confirms the quick-tool path remains the existing removed/debug response.
- `frontend/src/application/processHistory/ProcessHistoryUseCases.ts`
  - Remove direct `CommandStack` dependency and push ownership.
  - Preserve `getState()`, disabled root-pop behavior, push/pop/rename/toggle semantics, and undo/redo after produced commands.
- `frontend/src/application/processHistory/ProcessHistoryController.ts`
  - Replace raw dependency contract with process-history use cases or behavior-sized producer dependencies.
- `frontend/src/application/commandProduction/` or equivalent new application-level module
  - Add runtime-owned command-production contracts/implementation only if needed for the direct path.
  - Expose behavior/callback execution and/or specialized movement/process producers, not mutable stack operations.
- `frontend/src/application/tools/ToolCommandIntents.ts`
  - Touch only if needed for clearer command-producer result/session typing; do not add stack concepts.
- Focused tests under `frontend/tests/` for runtime wiring, command-production services, canvas movement/style, construction, process-history, undo/redo, and architecture boundary assertions.

## RuntimeSession ownership rules

- `RuntimeSession` remains the owner of concrete `World` and `CommandStack`.
- `CommandStack` may be passed only into a runtime-owned command-production implementation and existing protected runtime-owned services that are explicitly out of this wave's scope, such as `SelectionDeletionCommandService`.
- `CanvasToolController`, canvas movement/style use cases, construction use cases, process-history controller/use cases, and Vue/tool shells must not receive or expose raw `CommandStack` after implementation.
- The new command-production abstraction must not expose `push`, stack arrays, undo/redo, command serialization, raw `CommandStack`, or a generic mutable command bus.
- Undo/redo remains owned by the existing `CommandHistoryPort` surface.
- Command construction, commit/rollback, failure rollback, and push semantics for scoped producers move behind the selected runtime-owned command-production services.

## Required DELETE list

Implementation must delete, not shim:

- raw `CommandStack` constructor/parameter dependencies from scoped canvas, construction, process-history, and controller modules where replaced;
- `commandStack.push(...)` calls from `CanvasPointMovementUseCase`, `CanvasStyleUseCase`, `ConstructionUseCases`, and `ProcessHistoryUseCases` once lifecycle is centralized;
- direct `Command` construction from scoped use cases if the selected command-production service owns command creation;
- stale `ExecuteQuickToolParams.world` and `ExecuteQuickToolParams.commandStack` fields if quick-tool behavior remains removed/debug-only;
- `CanvasStyleUseCase`'s `as any` cast if safely removable inside reviewed scope;
- tests that assert raw stack handoff/injection or inspect stack internals from controller shells;
- transitional raw-and-port overloads, compatibility wrappers, duplicate command-production paths, dead exports, and local shims created during migration.

Do not delete or rewrite `worldForView()`, rendering/read-model ports, persistence DTO casts, `initializeWorld(world, commandStack)`, `SelectionDeletionCommandService`, command descriptors/registry, or protected config/env/provider files as part of this cycle.

## Protected out-of-scope surfaces

Cycle 024 implementation is forbidden from broadening into:

- `SelectionDeletionCommandService` internals, beyond preserving its existing runtime-owned port boundary;
- persistence schema/replay, migrations, `ProjectService`, `ProjectSessionPersistenceAdapter`, persistence DTOs, or command serialization/descriptors;
- `OperationRegistry` redesign or operation descriptor format changes;
- rendering selectors, `SVGRenderer`, Three runtime/scene/CSS, canvas presentation model, `worldForView()`, or overlay event ownership;
- Drive/auth/browser credential internals, backend APIs, docs/specs, package/tooling, validation-platform work, app-shell production composition redesign, or UI feature work;
- secret/config/env/provider files, including `.saivage/auth-profiles.json`, `.saivage/saivage.json`, provider configs, frontend `.env*`, OAuth tokens, Google Drive credentials, shell history, or OS keychain material.

## Preservation requirements

Implementation must preserve Waves 020-023 boundaries:

- app-shell consumers continue to use named ports;
- `CommandHistoryPort` remains the only undo/redo/history consumer surface;
- no `commandStackForDeferredCommandProducers()` accessor is introduced;
- no raw `commandStack` provide/inject is introduced;
- selection deletion remains behind its existing port and does not become part of this wave.

User-observable behavior must remain equivalent:

- point creation and representative line/segment/circle/guide/intersection/3D construction flows;
- point drag preview, commit, cancel, and undo/redo;
- style/property update and undo/redo;
- process-history push/pop/root-pop disabled state/rename/toggle output/encapsulation;
- toolbar/keyboard undo/redo via existing command-history port;
- 3D overlay pointer ownership. The implementation must preserve the existing e2e contract that the overlay is visible, has `pointer-events: auto`, receives the tested pointer target, and drag gestures over it do not mutate the SVG canvas viewBox.

## Stop conditions

The implementation stage must stop and request a reviewed delta/plan correction if any of these occur:

- the direct path requires changing command descriptors, serialization/replay, `OperationRegistry`, persistence schema, or `CommandStack` public API;
- the new abstraction starts exposing raw stack mutation, undo/redo/history, or a generic command bus surface;
- construction migration cannot remove raw stack ownership without decomposing construction factories/process-action ownership beyond this wave;
- implementation needs the pre-existing dirty `frontend/src/commands/Command.ts` generic typing change as a premise;
- unrelated dirty files must be edited or reverted to make validation pass;
- user-observable canvas/process-history/3D overlay behavior changes beyond equivalent command-production refactor;
- protected secret/config/env/provider files would need to be read or edited.

## Validation requirements for implementation

The implementation and validation stages must capture stdout/stderr to stable files under:

`architecture-audit/cycle-024-command-producer-runtime-ports-for-canvas-construction-and-process-history/validation/`

Minimum required evidence:

1. Pre/post path-scoped `git status`, `git diff --stat`, and static scans for `commandStackForDeferredCommandProducers`, raw `commandStack` provide/inject, `CommandStack` imports in scoped modules, raw stack params, `commandStack.push`, `new Command`, quick-tool stale params, and protected surfaces.
2. Focused Vitest for new command-production service(s), `RuntimeSession`/app-shell wiring, `CanvasToolController`, point movement preview/commit/cancel, style update, construction execution including process action groups, process-history actions, and undo/redo after produced commands.
3. Boundary/static tests proving no raw stack producer handoff, no dual raw/port path, and no reintroduced `commandStackForDeferredCommandProducers()` in scoped modules.
4. Root and frontend lint where package scripts define them.
5. Full root and frontend Vitest suites.
6. Root and frontend builds.
7. Root/frontend Playwright e2e because canvas, process-history, and tool behavior are user-observable.
8. Live preview refresh on `0.0.0.0:5173`, HTTP 200 reachability probe, and Playwright/live smoke for point creation, representative construction, point drag commit/cancel, style update, process-history action, undo/redo, and 3D overlay pointer behavior.

Undefined commands may be skipped only with exact package-script evidence and an explicit implementation-log rationale. Failures attributable to the change reject the wave.

## Residual accepted risks

- `ConstructionUseCases.ts` remains broad even after command lifecycle ownership moves behind a producer. This is accepted for Cycle 024 because construction decomposition is a future wave unless required to remove raw stack handoff.
- A command-production service can become a renamed `CommandStack` if implemented too generically. This risk is mitigated by the ownership rules and stop conditions above.
- Point movement preview rollback and process-history state transitions are behavior-sensitive. This risk is mitigated by focused unit tests plus e2e/live validation.
- The wave-plan contains later stale claims that Wave 024 is complete. For this cycle, this decision and the reviewed proposal set are authoritative; future plan correction is required only if subsequent work depends on those stale completed-cycle claims.

## Next canonical stage

Proceed to the unique implementation stage:

`cycle-024-implement-command-producer-runtime-ports-for-canvas-construction-and-process-history`

That stage must implement the selected direct proposal exactly within the scope and guardrails above. If any stop condition is hit, do not continue implementation; write a delta proposal and run the bounded review/critic path before source changes continue.
