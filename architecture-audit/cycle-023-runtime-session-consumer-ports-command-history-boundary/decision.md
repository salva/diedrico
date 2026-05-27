# Cycle 023 Decision — Runtime-session consumer ports and command-history boundary

## Decision status

**Decision: proceed to implementation with `proposal-direct.md`.**

Cycle 023 is cleared to advance to `cycle-023-implement-runtime-session-consumer-ports-command-history-boundary` because the reviewed proposal set has converged after in-stage corrections. Review round 01 initially reported blocking issues in `reviews/round-01-review.md`: toolbar undo/redo command-history scope was incomplete, and persistence-handle cast removal needed stricter bounds. The corrected proposals now explicitly include toolbar history in the same `CommandHistoryPort` migration and constrain persistence-handle cleanup to adapter-local typed handles only. On that corrected basis, the round-01 follow-up condition is **NO BLOCKING ISSUES**.

This decision is planning-only. It does not implement source, test, package, tooling, backend, docs/spec, persistence-schema, rendering, replay, command-kernel, or e2e changes.

## Inputs inspected

- Current source-control state was checked before writing this decision. The full MCP status output overflowed because the workspace is noisy; scoped inspection was therefore limited to this cycle's artifacts and an MCP diff of the reviewed proposal/review files, which showed no additional unstaged edits in those reviewed files at decision time.
- `architecture-audit/cycle-023-runtime-session-consumer-ports-command-history-boundary/scope-check.md`
- `architecture-audit/cycle-023-runtime-session-consumer-ports-command-history-boundary/proposals/proposal-direct.md`
- `architecture-audit/cycle-023-runtime-session-consumer-ports-command-history-boundary/proposals/proposal-restructure.md`
- `architecture-audit/cycle-023-runtime-session-consumer-ports-command-history-boundary/reviews/round-01-review.md`
- `architecture-audit/cycle-023-wave-plan-extension/plan-extension-note.md`
- `architecture-audit/wave-plan.md`

## Review convergence and correction history

`round-01-review.md` preferred the direct proposal but raised two blockers:

1. **Toolbar command-history scope.** A keyboard-only command-history port would leave toolbar undo/redo on a parallel raw `CommandStack` path. The corrected direct proposal now requires `ToolbarHistoryUseCases`, touched `ToolbarHistoryController` wiring/fakes, and `Toolbar.vue` raw command-stack handoff to migrate to the same `CommandHistoryPort` when current wiring requires it. Validation must cover keyboard and toolbar undo/redo.
2. **Persistence-handle boundedness.** Cast removal was too open-ended. The corrected direct proposal now permits only adapter-local typed persistence handles that do not expose `World` / `CommandStack` through general consumer-facing interfaces. If clean cast removal requires `ProjectService`, command serialization, schema, replay, descriptors, registry, or migration changes, that slice must stop and be deferred.

These corrections satisfy the reviewer-required decisions without broadening into unrelated toolbar composition or persistence redesign. No second opinion is required.

## Selected path and rationale

### Selected: `proposal-direct.md`

The direct path is selected because it deletes the known raw app-shell runtime seams with the least new abstraction:

- `RuntimeSession` already owns the concrete `World` and `CommandStack`.
- `ActivePlaneUseCases`, `SelectionUseCases`, `KeyboardShortcutRouter`, toolbar history, and selection-delete flow each need narrow behavior capabilities rather than full runtime objects.
- The corrected direct proposal includes the command-history consumers needed to avoid a parallel toolbar path.
- The corrected direct proposal bounds persistence-handle cleanup to local type safety rather than schema or replay redesign.

### Rejected for this cycle: `proposal-restructure.md`

The restructure proposal remains a valid fallback if future waves prove that a grouped capability aggregate is needed, but it is rejected for Cycle 023 because it adds a new architectural surface before current evidence proves it is necessary. Creating a `RuntimeCapabilities` aggregate now risks centralizing unrelated concerns into a new god-boundary. Cycle 023 should first remove the concrete raw-object seams in place.

## Bound implementation scope

Implementation must stay within the corrected direct proposal and may change only the files needed for these concerns:

### Runtime-session ports and app-shell wiring

- `frontend/src/application/appShell/RuntimeSession.ts`
  - Add behavior-sized port-returning methods for active-plane, selection read/cascade preview, command-history, selection-delete command execution, and adapter-local persistence handles if bounded cleanup is possible.
  - Keep `RuntimeSession` as sole owner of concrete `World` and `CommandStack`.
  - Keep `worldForView()` only as the explicitly deferred rendering/view handoff.
  - Delete replaced raw use-case/history accessors; do not retain compatibility shims.

- `frontend/src/application/appShell/AppShellPorts.ts`
  - Define narrow app-shell port interfaces if needed.
  - Adapter-only persistence handles may be typed here only if clearly named and not reused as general consumer-facing runtime facades.

- `frontend/src/application/appShell/AppShellRuntime.ts`
  - Wire app-shell consumers through named session ports.
  - Stop unwrapping raw `CommandStack` for keyboard or toolbar history.
  - Retain only the view-facing `World` handoff required by the current rendering seam.

### Consumer migrations

- `frontend/src/application/appShell/ActivePlaneUseCases.ts`
  - Replace direct `World` dependency with an active-plane port.

- `frontend/src/application/appShell/SelectionUseCases.ts`
  - Replace direct `World` dependency with a selection read/cascade-preview port.

- `frontend/src/application/appShell/KeyboardShortcutRouter.ts`
  - Replace direct `CommandStack` dependency with `CommandHistoryPort`.

- `frontend/src/application/selectionDeletion/SelectionDeletionCommandService.ts`
  - Hide raw world/command-stack use behind a narrow selection-delete command port or constructor context.
  - Do not change command descriptors, replay, operation registry, or command-kernel behavior.

- `frontend/src/application/toolbar/ToolbarHistoryUseCases.ts`
  - Replace direct `CommandStack` dependency with the same `CommandHistoryPort`.

- `frontend/src/application/toolbar/ToolbarHistoryController.ts`
  - Update only the wiring/fakes needed to pass `CommandHistoryPort`.

- `frontend/src/components/toolbars/Toolbar.vue`
  - Remove raw command-stack handoff for toolbar history only if current wiring requires the component to pass it.
  - Do not redesign toolbar component composition or unrelated UI state.

### Persistence adapter bounded cleanup

- `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts`
  - Remove private casts only through adapter-local typed handles supplied by `RuntimeSession` / app-shell port types.
  - These handles may carry the concrete internals required by `ProjectService.serializeCommands` / `deserializeCommands`, but they must not be used by active-plane, selection, keyboard, toolbar, rendering, or command-service consumers.
  - If cast removal requires changing `ProjectService`, command serialization, persistence schema, replay, descriptors, registry, or migrations, stop and defer this slice rather than broadening Cycle 023.

### Tests and boundary assertions

- `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts`
  - Assert migrated app-shell consumers no longer import concrete `World` / `CommandStack` for the selected seams.
  - Assert deleted `RuntimeSession` raw accessors are gone.
  - Assert keyboard and toolbar undo/redo share the command-history port and no dual raw path remains.

- `frontend/tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts`
  - Update fakes to port-based dependencies.
  - Preserve behavior coverage for active-plane subscription/update/cycling, selection, cascade preview, deletion, keyboard history, toolbar history, and project-session behavior touched by the migration.

Additional focused unit tests may be added only where existing tests cannot cleanly cover the new port contracts.

## Required DELETE list

Implementation must delete, not wrap, these surfaces when their consumers are migrated:

- `RuntimeSession.worldForUseCases()`
- `RuntimeSession.commandStackForCommandServices()`
- `RuntimeSession.commandStackForShortcuts()` after both keyboard shortcuts and toolbar history use `CommandHistoryPort`
- Direct `World` imports from `ActivePlaneUseCases.ts` and `SelectionUseCases.ts`
- Direct `CommandStack` import from `KeyboardShortcutRouter.ts`
- Direct `CommandStack` imports/constructor expectations from `ToolbarHistoryUseCases.ts` and touched toolbar history fakes/wiring
- Adapter-private casts in `ProjectSessionPersistenceAdapter` if bounded typed handles are sufficient
- Tests/fakes asserting raw `World` / `CommandStack` injection into these consumers
- Any transitional overloads, compatibility wrappers, broad runtime facades, dual raw-object/port paths, or dead exports introduced during implementation

## Protected out-of-scope surfaces

Cycle 023 implementation must not touch or incorporate the following without a new reviewed mini-cycle:

- Backend code or APIs
- Docs/spec source cleanup unrelated to this decision
- Package/tooling, dependency, lint/build configuration, or validation-platform changes
- Debug placeholder cleanup
- Drive/auth/credential flows or protected config contents
- Persistence schema, serialized project shape, migrations, replay, operation registry, command descriptors, or `ProjectService` internals
- Broad command-kernel redesign
- Broad canvas/tool/construction/process-history command-producer migration
- Rendering/presentation read-port redesign, Three scene-host work, domain realization contexts, or `SvgCanvas` internals beyond existing view handoff compatibility
- App-wide `World` identity replacement or provide/inject redesign
- Toolbar/UI composition redesign beyond command-history dependency replacement
- Stale audit-history mining or recovery from discarded cycles

## Source-control hygiene constraints

The implementation stage must begin with scoped status/diff evidence and must remain path-scoped. The workspace contains adjacent dirty/untracked state from other work, including unrelated frontend command files and audit/stage artifacts. Implementation must not revert, normalize, absorb, or depend on unrelated dirty files. Protected secret/config paths must not be read or copied; findings may cite path names and behavior only.

## Validation requirements

Capture full stdout/stderr under:

`architecture-audit/cycle-023-runtime-session-consumer-ports-command-history-boundary/validation/`

Required validation for the implementation stage:

1. Pre-edit scoped git status/diff and static scans for raw accessors/imports/casts plus deferred raw command producers.
2. Focused Vitest for runtime session ports, app-shell boundary tests, active-plane, selection, keyboard history, toolbar history, selection deletion, and persistence adapter handle behavior if changed.
3. Static architecture scan proving selected raw accessors/imports/casts are gone and no dual keyboard/toolbar command-history path remains.
4. `npm run lint` at root and frontend workspace where defined.
5. Full Vitest at root and frontend workspace where defined.
6. `npm run build` at root and frontend workspace where defined.
7. Root/frontend Playwright e2e where defined because active-plane, selection, deletion, undo/redo, restore/autosave, and toolbar behavior are user-observable.
8. Live preview refresh bound to `0.0.0.0:5173`, HTTP 200 reachability probe, and browser smoke for active-plane cycling, select-all/delete, keyboard undo/redo, toolbar undo/redo, startup/new-project behavior, and credential-free behavior.

Any skipped command must have an explicit implementation-log justification. The wave is rejected if validation fails for reasons attributable to Cycle 023.

## Stop conditions

Stop implementation and request a reviewed plan-edit or delta proposal if any of the following becomes necessary:

- Changing persistence schema, serialized project shape, migrations, replay, descriptors, operation registry, command serialization semantics, or `ProjectService` internals
- Replacing `World` / `CommandStack` identity or app-wide provide/inject behavior
- Migrating broad canvas/tool/construction/process-history/rendering command producers
- Redesigning `SvgCanvas`, Three rendering, presentation read ports, or domain realization contexts
- Redesigning toolbar UI composition rather than only replacing toolbar command-history dependency
- Introducing a broad runtime facade that mirrors `World` / `CommandStack`
- Keeping raw-object and port paths in parallel as compatibility shims
- Touching backend, Drive/auth, docs/spec, package/tooling, validation-platform, debug, or protected config surfaces
- Needing unrelated dirty files to pass validation

## Residual risks accepted for implementation

- `worldForView()` remains a known rendering-facing raw `World` seam and should be addressed by a future rendering/view-boundary wave, not by Cycle 023.
- Leaf command producers in canvas movement/style/construction/process-history remain future candidates and must not be migrated opportunistically here.
- Adapter-local typed persistence handles may still need to carry concrete runtime internals; this is acceptable only while strictly confined to the persistence adapter boundary.
- The noisy workspace can obscure accidental scope creep, so implementation must preserve scoped evidence and diff discipline.

## Next stage recommendation

Proceed to:

`cycle-023-implement-runtime-session-consumer-ports-command-history-boundary`

Do not proceed if implementation cannot satisfy the selected direct path, required DELETE list, validation cadence, or stop conditions above.
