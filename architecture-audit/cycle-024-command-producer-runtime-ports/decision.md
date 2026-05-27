# Cycle 024 Decision — Command-producer runtime ports

**Stage:** `cycle-024-decision`  
**Wave:** 024 — Command-producer runtime ports for canvas, construction, and process history  
**Decision status:** APPROVED FOR IMPLEMENTATION  
**Selected proposal:** `proposals/proposal-direct.md`  
**Planning-only:** Yes. This decision records scope and constraints only; it performs no source, test, package, backend, persistence, rendering, or tooling implementation.

## Evidence inspected

This decision was written after inspecting the current scoped worktree evidence and reviewed Cycle 024 artifacts:

- `architecture-audit/wave-plan.md` — Wave 024 entry and ordering context.
- `architecture-audit/cycle-024-command-producer-runtime-ports/scope-check.md` — confirms the residual raw `RuntimeSession.commandStackForDeferredCommandProducers()` / Vue `commandStack` producer seam still exists and no plan edit is needed.
- `architecture-audit/cycle-024-command-producer-runtime-ports/proposals/proposal-direct.md` — corrected direct implementation proposal.
- `architecture-audit/cycle-024-command-producer-runtime-ports/proposals/proposal-restructure.md` — broader fallback/restructure alternative.
- `architecture-audit/cycle-024-command-producer-runtime-ports/reviews/round-01-review.md` — final review status is **NO BLOCKING ISSUES**.
- `.saivage/stages/cycle-024-review-round-01/summary.json` — records the initial blocker findings, in-place correction, follow-up review, and recommendation to proceed to decision.
- `.saivage/stages/cycle-024-decision/scoped-status.stdout.log` and `.saivage/stages/cycle-024-decision/scoped-diffstat.stdout.log` — scoped source-control evidence for this decision stage.

The decision-stage scoped status showed only adjacent untracked review/summary artifacts from the preceding review stage:

```text
?? .saivage/stages/cycle-024-review-round-01/summary.json
?? architecture-audit/cycle-024-command-producer-runtime-ports/reviews/
```

The scoped diffstat log was empty. This decision does not revert, incorporate, or depend on unrelated dirty production files.

## Review convergence and correction history

Review convergence is complete for Cycle 024 proposal selection.

`reviews/round-01-review.md` records that the initial round-01 review found three blocking issues in `proposal-direct.md`:

1. runtime-port ownership and injection replacement were too ambiguous;
2. controller deletion/merging plus deferred tool/world/read seams needed stricter stop conditions;
3. validation needed explicit guards for `commandHistoryPort` undo/redo routing, autosave dirty signaling, and persistence round-trip behavior when raw `runtime.commandStack` is removed.

The correction stage edited `proposal-direct.md` in place. The corrected proposal now includes:

- a **Required runtime-port ownership contract** requiring `RuntimeSession` to remain the only concrete `CommandStack` owner for scoped producers;
- explicit prohibition on broad mutable runtime facades, generic `commands/services/runtimeContext` bags, stack-like wrappers, generic `execute(commandBuilder)` services exposed to Vue, and string-keyed catch-all replacement injection;
- stricter risk/stop-condition language protecting `worldForView()`, tool hit-testing, active-plane/argument collection reads, process-tree rendering, rendering/read-port redesign, persistence schema/replay, and command-kernel internals;
- validation requirements proving keyboard/toolbar undo-redo still use `commandHistoryPort`, and that dirty/autosave/save/project round-trip behavior remains equivalent without schema/replay edits.

The follow-up review in `round-01-review.md` states **NO BLOCKING ISSUES**, marks all three blocker categories **RESOLVED**, scores `proposal-direct.md` positively against all six required review criteria, and recommends proceeding to `cycle-024-decision` with the direct proposal preferred.

## Decision

Cycle 024 selects **`proposals/proposal-direct.md`** for implementation.

Rationale:

- It directly advances Wave 024’s target outcome: deleting the residual raw command-stack handoff for canvas/construction/process-history producers.
- It keeps ownership sharp: `RuntimeSession` owns the concrete stack; application/Vue consumers receive only named behavior ports/controllers.
- It respects the no-backcompat priority by deleting the raw accessor, raw Vue provide/inject seam, unknown-to-`CommandStack` casts, and any transitional dual paths.
- It avoids overreach by deferring rendering/read-port redesign, persistence schema/replay, command-kernel redesign, backend/docs/debug/package-tooling changes, and Drive/auth internals.
- Its corrected validation plan now covers adjacent history, dirty/autosave, persistence round-trip, and live user-observable flows.

`proposals/proposal-restructure.md` is rejected for Cycle 024 implementation. It remains architecturally plausible as a future fallback if direct implementation proves the duplicated command lifecycle itself must be addressed, but it is broader than required for the current wave and carries higher regression risk. Selecting it now would unnecessarily expand the cycle into a command-production boundary/lifecycle consolidation wave.

## Exact implementation scope

The next implementation stage must stay within these surfaces unless a reviewed mini-cycle broadens scope.

Production source in scope:

- `frontend/src/application/appShell/RuntimeSession.ts`
- `frontend/src/application/appShell/AppShellRuntime.ts`
- `frontend/src/App.vue`
- `frontend/src/components/workspace/SvgCanvas.vue`
- `frontend/src/components/panels/ActionsPanel.vue`
- `frontend/src/application/tools/CanvasToolController.ts`
- `frontend/src/application/canvas/CanvasPointMovementUseCase.ts`
- `frontend/src/application/canvas/CanvasStyleUseCase.ts`
- `frontend/src/application/construction/ConstructionUseCases.ts`
- `frontend/src/application/construction/QuickToolUseCases.ts` only if still wired through the same raw command-stack controller seam
- `frontend/src/application/processHistory/ProcessHistoryController.ts`
- `frontend/src/application/processHistory/ProcessHistoryUseCases.ts`
- `frontend/src/application/tools/ToolCommandIntents.ts` only for small named-port type additions
- `frontend/src/application/processHistory/ProcessHistoryIntents.ts` only for small named-port type additions
- a small private helper under `frontend/src/application/commandProduction/` or equivalent only if needed to avoid duplication while preserving the direct proposal’s non-generic ownership contract

Tests in scope:

- `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts`
- app-shell runtime tests such as `frontend/tests/unit/application/AppShellRuntimeUseCases.test.ts` if present/current
- `frontend/tests/unit/application/canvasToolControllers.spec.ts`
- `frontend/tests/unit/tools/pointTool.spec.ts`
- `frontend/tests/unit/tools/CircleTool.spec.ts`
- `frontend/tests/unit/tools/toolValidation.spec.ts`
- `frontend/tests/unit/application/panelToolbarIntentControllers.spec.ts`
- focused process-history, movement/style, construction, keyboard/toolbar undo-redo, persistence/autosave guard tests where current test ownership exists

Documentation/spec/package/backend/debug fixtures are not in scope for implementation unless a reviewed delta explicitly adds them.

## Mandatory delete list

The implementation must delete, not preserve beside replacements:

- `RuntimeSession.commandStackForDeferredCommandProducers()`.
- The raw `commandStack` field returned by `AppShellRuntime` if no production consumer remains after rewiring.
- `provide('commandStack', runtime.commandStack)` in `frontend/src/App.vue`.
- `inject('commandStack')` in `frontend/src/components/workspace/SvgCanvas.vue` for command-producer wiring.
- `inject<unknown>('commandStack')` in `frontend/src/components/panels/ActionsPanel.vue` for command-producer wiring.
- `CanvasToolControllerProviderDependencies.commandStack: unknown` and its `as CommandStack` cast.
- `ProcessHistoryControllerProviderDependencies.commandStack: unknown` and its `as CommandStack` cast.
- Boundary-test expectations that require the deferred raw accessor to remain present.
- Any transitional overload, compatibility shim, dual raw-stack/port execution path, or generic mutable facade introduced during implementation.

No docs/spec fixtures, backend files, package/tooling files, command factories, concrete operations, ProjectService tests, rendering tests, or Drive/auth internals are approved for deletion by this decision.

## Runtime-port ownership and wiring rules

The implementation is bindingly constrained by these rules:

1. `RuntimeSession` is the sole owner of the concrete `CommandStack` for scoped command producers. It may create behavior-specific ports/controllers from its private `World` and `CommandStack`; it must not expose the raw stack, a stack-like wrapper, or arbitrary command execution to Vue components.
2. `AppShellRuntime` may return only named behavior fields for this wave, such as `canvasCommandProducerPort` and `processHistoryCommandPort` or equivalently specific names. It must not return a broad `commands`, `services`, `runtimeContext`, `appServices`, `commandRuntime`, or mutable dependency bag.
3. Vue wiring must be type-addressable. Use typed `InjectionKey<...>` constants with named interfaces, or direct/factory/prop wiring. Do not replace `provide('commandStack')` with a new string-keyed catch-all provider such as `provide('commands', ...)`, `provide('runtime', ...)`, or `inject('runtime')`.
4. Port interfaces must name current user/application behaviors: construction intent execution, quick intent execution, free-point movement sessions, style updates, process-history state reads, and process-history mutations.
5. Ports must not expose raw `World`, raw `CommandStack`, `Command.push`, `new Command`, persistence saves, rendering state, operation replay, or generic `execute(commandBuilder)` hooks to Vue/tool consumers.
6. Existing `ToolCommandSink` intent boundaries should be preserved where practical. Do not absorb tool hit-testing, argument collection, active-plane reads, `world` interaction reads, rendering reads, or the tool state machine into command-producer ports.
7. Keyboard/toolbar undo-redo routing must continue through the existing `commandHistoryPort`, not through a new command-producer port.

## Protected out-of-scope surfaces and stop conditions

Stop implementation and request a reviewed plan edit/mini-cycle if the direct path requires any of the following:

- changing `CommandStack` history behavior, `Command` snapshot format, operation descriptors, operation replay, command serialization, or persistence schema/migrations;
- redesigning `ProjectService`, save/open round-trip semantics, Drive/auth internals, backend contracts, or package/tooling;
- replacing `worldForView()`, redesigning rendering/read ports, moving rendering selectors, or changing Paper/SVG/Three rendering architecture;
- moving `SvgCanvas.vue` world reads, tool hit-testing, active-plane/argument collection reads, or process-tree rendering into command-producer ports;
- rewriting the tool state machine, domain realization model, process-tree/domain semantics, or command-kernel architecture;
- deleting or merging `CanvasToolController` or `ProcessHistoryController` in a way that broadens responsibilities beyond the current command-producer seam;
- changing keyboard/toolbar history routing away from `commandHistoryPort`;
- changing autosave dirty signaling or persistence round-trip behavior beyond preserving existing behavior through the new producer wiring;
- creating a generic app kernel/god service that absorbs selection, persistence, rendering, construction, process history, and command production into one facade;
- touching backend, docs, specs, debug cleanup, package scripts/lockfiles/tooling, Drive/auth internals, or unrelated dirty files.

## Source-control hygiene instructions

The implementation stage must:

- run and capture a pre-edit scoped status/diff before touching files;
- inspect adjacent dirty files and avoid reverting or incorporating them unless directly required by the selected scope;
- touch only files listed in the exact implementation scope, plus focused tests/logs/implementation report artifacts required by validation;
- never mine stale discarded audit history;
- never read or log protected config/secrets, including `.saivage/auth-profiles.json`, `.saivage/saivage.json`, env files, OAuth/Drive credentials, provider configs, or shell history;
- use MCP git tools for commits and avoid branch switching, rebasing, pushing, or remote-tracking changes.

## Validation requirements for implementation

Capture full stdout/stderr under:

`architecture-audit/cycle-024-command-producer-runtime-ports/validation/`

Minimum required validation evidence:

1. Pre-edit scoped status/diff and static scans for raw accessor/provide/inject/stack imports.
2. Focused unit/static tests for app-shell boundary, app-shell runtime use cases, canvas tool controllers, point movement/style, representative construction tools, process-history controller/use cases, keyboard/toolbar undo-redo, and persistence/autosave guards.
3. Post-edit static scans proving:
   - no production source reference to `commandStackForDeferredCommandProducers` remains;
   - no production `provide('commandStack')` or command-producer `inject('commandStack')` remains;
   - no unknown-to-`CommandStack` provider cast remains in canvas/process-history controllers;
   - no replacement string-keyed catch-all provider/injection or generic mutable command service was introduced;
   - keyboard/toolbar undo-redo call sites still use `commandHistoryPort`;
   - `worldForView()` remains only as the explicitly deferred view/read seam.
4. Root and frontend lint where defined.
5. Focused Vitest for touched modules.
6. Root and frontend full Vitest where defined.
7. Root and frontend build where defined.
8. Root/frontend Playwright/e2e because this wave touches user-observable frontend flows.
9. Existing or focused persistence/autosave evidence showing command-producer changes still mark projects dirty, save/autosave through the same paths, and preserve project round-trip behavior without editing schema/replay code.
10. Live preview refresh bound to `0.0.0.0:5173`, HTTP 200 reachability probe, and credential-free Playwright/live smoke for representative construction, point move/style, process-history edit, and undo/redo behavior.

The implementation wave is rejected if any required validation fails for reasons attributable to the change, or if Playwright/e2e/live preview verification is skipped without explicit justification in `implementation-log.md`.

## Residual risks accepted for implementation

The following risks are accepted and must be watched during implementation/validation:

- Movement preview/commit/cancel behavior is rollback-sensitive and can regress if the new port hides lifecycle incorrectly.
- Construction use cases cover many operation families; representative focused tests must include more than one happy path.
- Process-history state reads still need current process-tree state; keep that need inside a narrow process-history port/use case rather than expanding to process-tree redesign.
- The port shape may drift into a broad mutable facade if names are too generic or if arbitrary command execution leaks through.
- Adjacent dirty command-operation files may exist in the worktree. Implementation must not rely on or revert unrelated edits.
- Controller simplification is allowed only if responsibilities remain as narrow as the current command-producer seam.

## Next-stage recommendation

Proceed to `cycle-024-implement-command-producer-runtime-ports`.

The implementation stage should implement `proposal-direct.md` exactly as constrained by this decision. If implementation requires any deviation from the selected direct path, stop and create a reviewed delta proposal before changing source beyond the approved scope.
