# Cycle 023 Decision / Closure Reconciliation — Runtime-session consumer ports and command-history boundary

## Authoritative outcome

**Cycle 023 is CLOSED as already satisfied by current source. No new Cycle 023 source implementation is authorized by this decision.**

This reconciliation supersedes the stale implementation-forward language that previously appeared in this file. The current source already contains the runtime-session consumer-port and shared command-history boundary that Cycle 023 was meant to implement: `RuntimeSession` privately owns `World` / `CommandStack`, exposes named behavior ports, and app-shell/toolbar consumers depend on those ports instead of broad raw runtime objects.

This stage is audit-artifact reconciliation only. It made no production source, test, package/tooling, backend, docs/spec, persistence schema/replay, Drive/auth, rendering, canvas/Three, UI feature, validation-platform, or preview-server changes.

## Why reconciliation was required

Current Cycle 023 artifacts conflicted:

- The fresh scout artifacts (`scope-check.md`, `proposals/proposal-direct.md`, `proposals/proposal-restructure.md`) correctly found that Wave 023's implementation premise is stale because the target boundary is already present in source.
- The pre-existing `decision.md` and `implementation-log.md` still contained implementation-forward/implementation-complete language from an earlier Cycle 023 path.

This file is now the authoritative Cycle 023 decision/closure artifact. Any older instruction in this directory to proceed with `cycle-023-implement-runtime-session-consumer-ports-command-history-boundary` is superseded and must not be used to dispatch production work.

## Source-control and dirty-context guardrails

Before authoring this reconciliation, scoped status/diff evidence was captured under:

- `.saivage/stages/cycle-023-decision-closure-reconciliation-runtime-session-consumer-ports-command-history-boundary/design-notes/pre-status.stdout`
- `.saivage/stages/cycle-023-decision-closure-reconciliation-runtime-session-consumer-ports-command-history-boundary/design-notes/pre-diffstat.stdout`

Observed scoped state at the start of this task:

- Untracked current-stage notes/report directory under `.saivage/stages/cycle-023-decision-closure-reconciliation-runtime-session-consumer-ports-command-history-boundary/`.
- Untracked Cycle 023 `critique/` and `reviews/` directories.
- No scoped production-source diff for the cited app-shell/toolbar files.

This reconciliation did not inspect protected secret/config/env/provider files, did not read `.saivage/saivage.json` or auth material, did not normalize unrelated dirty work, and did not revert or incorporate unrelated changes.

## Current-source evidence for satisfied Wave 023 boundary

Line-numbered excerpts are captured in:

- `.saivage/stages/cycle-023-decision-closure-reconciliation-runtime-session-consumer-ports-command-history-boundary/design-notes/current-source-excerpts.stdout`
- `.saivage/stages/cycle-023-decision-closure-reconciliation-runtime-session-consumer-ports-command-history-boundary/design-notes/static-boundary-scans.stdout`

Evidence:

1. **Private runtime ownership.** `RuntimeSession` owns concrete runtime state privately: `private readonly world = new World()` and `private readonly commandStack = new CommandStack()` (`frontend/src/application/appShell/RuntimeSession.ts:24-26`).
2. **Named consumer ports exist.** `AppShellPorts.ts` defines `ActivePlanePort`, `SelectionReadPort`, and `CommandHistoryPort` (`frontend/src/application/appShell/AppShellPorts.ts:36-56`).
3. **RuntimeSession supplies the ports.** `RuntimeSession.activePlanePort()`, `selectionReadPort()`, `commandHistoryPort()`, and `selectionDeletionCommandPort()` expose behavior-sized capabilities over the private runtime objects (`frontend/src/application/appShell/RuntimeSession.ts:124-165`).
4. **Active-plane use cases are port-based.** `ActivePlaneUseCases` imports `ActivePlanePort` and stores only that dependency in its constructor (`frontend/src/application/appShell/ActivePlaneUseCases.ts:1-12`); its active-plane reads/writes go through the port (`ActivePlaneUseCases.ts:27-55`).
5. **Selection use cases are port-based.** `SelectionUseCases` imports `SelectionReadPort` plus `SelectionDeletionCommandPort`, not `World`, and uses the read port for selectable IDs and cascade preview (`frontend/src/application/appShell/SelectionUseCases.ts:1-13`, `:41-55`).
6. **Keyboard history is port-based.** `KeyboardShortcutRouter` imports `CommandHistoryPort`, accepts `commandHistory` in its dependency object, and uses it for undo/redo predicates/actions (`frontend/src/application/appShell/KeyboardShortcutRouter.ts:1-17`, `:96-100`).
7. **Toolbar history shares the command-history port.** `ToolbarHistoryUseCases` imports `CommandHistoryPort`, stores it as the only history dependency, and uses it for state, subscription, undo, and redo (`frontend/src/application/toolbar/ToolbarHistoryUseCases.ts:1-16`, `:18-64`).
8. **AppShellRuntime wires named ports.** `createAppShellRuntime` creates one `commandHistory = session.commandHistoryPort()`, wires `session.activePlanePort()`, `session.selectionReadPort()`, `session.selectionDeletionCommandPort()`, and `commandHistory` into app-shell consumers, and returns the command-history port for production composition (`frontend/src/application/appShell/AppShellRuntime.ts:14-23`, `:44-47`, `:76-85`, `:107-115`).
9. **Deleted raw accessors remain absent.** Static scans found no production/source hits for old Wave 023 accessor names `worldForUseCases`, `commandStackForCommandServices`, `commandStackForShortcuts`, or reviewer-rejected `commandStackForView`; remaining hits are boundary-test assertions that they stay absent (`frontend/tests/unit/application/appShell/AppShellBoundary.test.ts:109-112`, captured in `design-notes/static-boundary-scans.stdout`).

Together, this satisfies the Cycle 023 target outcome: app-shell consumer use cases express required behavior through narrow ports, while the concrete `World` and `CommandStack` remain owned inside the runtime session.

## Superseded stale artifacts / claims

The following stale claims are explicitly superseded:

- Any statement in the prior version of `decision.md` selecting `proposal-direct.md` for a future Cycle 023 implementation stage.
- Any statement in the prior version of `decision.md` recommending `cycle-023-implement-runtime-session-consumer-ports-command-history-boundary`.
- Any instruction to delete or re-delete already absent raw accessors as part of new Cycle 023 production work.
- Any implication that Cycle 023 reconciliation authorizes production source/test changes.

`implementation-log.md` is retained only as historical/background evidence from earlier artifact history and has been marked with a supersession notice. Its implementation-forward portions are not authoritative for this closure stage. The current source evidence above is the authority for closing Wave 023.

## Residual seams deferred to future waves

Cycle 023 closure does **not** claim the app-shell/runtime boundary is complete overall. The following seams remain outside this closure and require normal wave planning/review before implementation:

1. **Command-producer runtime ports for canvas/tools/process history.** `RuntimeSession.canvasCommandProducerPort(...)` and `RuntimeSession.processHistoryCommandPort()` still construct controllers with the private `world` and `commandStack` (`frontend/src/application/appShell/RuntimeSession.ts:109-121`). This is the central command-production seam to scout next if Wave 024 has not already been completed in the active plan timeline.
2. **View/read/presentation boundary.** `RuntimeSession` still concentrates multiple view/read ports over the private `World`: canvas view, process tree read model, elements panel read model, Three presentation, active-plane selector, and properties dialog helpers (`frontend/src/application/appShell/RuntimeSession.ts:29-107`, `:226-236`). This is a later rendering/read-model/runtime view boundary, not a reason to reopen Cycle 023.
3. **Persistence adapter DTO casts.** The app-shell persistence contract is opaque, but `ProjectSessionPersistenceAdapter` still bridges to `ProjectService`/`ProjectData` with DTO casts according to the fresh scout. That adapter debt should be handled only by a reviewed persistence-contract wave; it is not part of this no-source-change reconciliation.
4. **Selection deletion command service internals.** `SelectionUseCases` consumes deletion through `SelectionDeletionCommandPort`, while the concrete service remains the runtime-owned command-building adapter. That satisfies the consumer boundary and leaves deeper command-production cleanup to a command-producer wave.

## Wave-plan / next-stage recommendation

No `architecture-audit/wave-plan.md` edit is required in this reconciliation. A scoped grep captured in `design-notes/wave-plan-023-024-grep.stdout` shows the plan already contains a Wave 024 entry for command-producer runtime ports and explicitly grounds it in Wave 023 completion/reconciliation. Because this task is limited to Cycle 023 closure, it does not rewrite later wave entries or adjudicate later completed-cycle history.

Recommended next canonical action:

- If the active Planner state has not yet run an accepted Wave 024 cycle against current source, proceed to `cycle-024-fresh-scout-proposals-command-producer-runtime-ports-for-canvas-construction-and-process-history`.
- If the active Planner state treats existing later wave-plan entries as authoritative/completed, schedule the next Planner/Manager reconciliation stage against the current wave-plan head rather than reopening Cycle 023.

In all cases, do not dispatch a Cycle 023 coder. Cycle 023 is closed by current-source evidence and this reviewed closure decision.

## Validation for this reconciliation

Because this stage changes audit/stage artifacts only, broad runtime validation, Playwright, build, e2e, and live-preview refresh are intentionally out of scope. Appropriate validation for reviewer/critic is limited to:

- path-scoped status/diff confirming no production source/test changes;
- static scans proving old Cycle 023 raw accessors remain absent and port interfaces/consumers remain present;
- review of this artifact's supersession language, residual-seam list, protected-surface guardrails, and next-stage recommendation.

## Final closure statement

Cycle 023's authoritative outcome is: **already satisfied / closed by current source; no new implementation authorized; stale implementation-forward artifacts superseded; proceed only to the next properly planned/reviewed wave.**
