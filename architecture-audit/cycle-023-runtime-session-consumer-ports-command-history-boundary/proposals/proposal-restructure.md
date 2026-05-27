# Proposal Restructure — Extract an app-shell runtime capability boundary first

## Summary

This alternative asks whether Wave 023 should move one conceptual layer higher than replacing individual consumers in place. Instead of adding several port methods directly to `RuntimeSession`, introduce a small app-shell runtime capability boundary that groups runtime ownership concerns into explicit capability factories: view read handoff, active-plane session, selection session, command history, command execution, and persistence adapter handles. `RuntimeSession` remains the concrete implementation, but consumers depend on capability interfaces grouped in a new boundary module rather than on `RuntimeSession` methods or concrete `World` / `CommandStack`.

No production code is changed by this proposal stage.

## Target outcome

After implementation:

- `RuntimeSession` is treated as the concrete kernel, not the surface that every app-shell consumer knows about.
- A new app-shell boundary module defines capability interfaces and a `RuntimeCapabilities` aggregate.
- `AppShellRuntime` obtains capability objects from `RuntimeSession` and wires consumers to those interfaces.
- `ActivePlaneUseCases`, `SelectionUseCases`, and `KeyboardShortcutRouter` depend only on capability interfaces.
- `SelectionDeletionCommandService` is either hidden behind a capability or refactored to consume a small command-execution context.
- Persistence adapter typed handles are represented as part of the persistence capability if they can be kept adapter-local and schema-neutral.
- View-facing raw `World` exposure remains isolated as a named `viewWorld` / `viewReadRuntime` capability with an explicit future rendering-boundary citation.

This provides a cleaner architectural seam for later waves that migrate toolbar history, canvas tools, process history, or rendering without expanding the `RuntimeSession` public class surface each time.

## Files to change

### Production source

- `frontend/src/application/appShell/RuntimeCapabilities.ts` (new)
  - Define behavior-scoped interfaces such as:
    - `ActivePlaneSessionPort`;
    - `SelectionReadSessionPort`;
    - `CommandHistoryPort`;
    - `SelectionDeletionPort`;
    - `RuntimePersistenceSnapshotHandle` / `RuntimePersistenceRestoreHandle` or adapter-only equivalents;
    - `RuntimeViewHandoff` for explicitly deferred view/rendering `World` exposure.
  - Avoid importing broad `World` / `CommandStack` in consumer-facing interfaces except the explicitly named view handoff or adapter-private handles if review accepts them.

- `frontend/src/application/appShell/RuntimeSession.ts`
  - Implement the capability aggregate/factory.
  - Keep concrete `World` / `CommandStack` ownership private.
  - Replace raw use-case/history accessors with capability production methods.
  - Keep initialization, reset, clear, snapshot, validate, and restore responsibilities from Wave 022.

- `frontend/src/application/appShell/AppShellRuntime.ts`
  - Request a `RuntimeCapabilities` aggregate from `RuntimeSession` and pass capability slices to consumers.
  - Return the view handoff only where currently required by app-level provide/inject/rendering.

- `frontend/src/application/appShell/ActivePlaneUseCases.ts`
  - Depend on `ActivePlaneSessionPort` from the capability module.

- `frontend/src/application/appShell/SelectionUseCases.ts`
  - Depend on `SelectionReadSessionPort` and `SelectionDeletionPort`.

- `frontend/src/application/appShell/KeyboardShortcutRouter.ts`
  - Depend on `CommandHistoryPort`.

- `frontend/src/application/selectionDeletion/SelectionDeletionCommandService.ts`
  - Move construction behind a runtime capability or narrow its constructor to a command-execution context.

- `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts`
  - Consume typed persistence handles if the capability module can express them without schema/replay redesign.

- Optionally `frontend/src/application/toolbar/ToolbarHistoryUseCases.ts` and `ToolbarHistoryController.ts`
  - Only if current wiring proves they share the same app-shell command-history dependency and can be migrated without broad toolbar/UI redesign. Otherwise leave as adjacent future candidate documented in the implementation log.

### Tests / validation source

- `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts`
  - Add assertions that consumer-facing capability interfaces do not import concrete runtime objects except named view/persistence internals.
  - Assert `RuntimeSession` is the only app-shell owner/importer of concrete `World` / `CommandStack` for runtime ownership.

- `frontend/tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts`
  - Update to use capability fakes and preserve behavior coverage.

- New focused tests for `RuntimeCapabilities` only if the boundary cannot be covered via existing app-shell tests.

## Files/tests/docs/fixtures to DELETE

- Delete `RuntimeSession.worldForUseCases()`.
- Delete `RuntimeSession.commandStackForCommandServices()`.
- Delete `RuntimeSession.commandStackForShortcuts()` if all app-shell/shortcut/history consumers use `CommandHistoryPort`.
- Delete direct `World` imports from `ActivePlaneUseCases.ts` and `SelectionUseCases.ts`.
- Delete direct `CommandStack` import from `KeyboardShortcutRouter.ts`.
- Delete raw `World` / `CommandStack` injection tests and fakes for these app-shell consumers.
- Delete adapter-private casts if typed capability handles can replace them cleanly.
- Delete transitional compatibility wrappers and any broad `RuntimeFacade` that simply mirrors `World` / `CommandStack`.

Do not delete canvas/tool/construction/process-history producers, rendering read ports, persistence schema/replay fixtures, backend files, docs/spec source, package/tooling, or e2e specs without a reviewed scope edit.

## Expected behavior change

No user-visible behavior change is intended. The architectural behavior changes more than the direct proposal: later consumers would see a stable `RuntimeCapabilities` boundary rather than reaching into `RuntimeSession`. Active-plane, keyboard, selection, deletion, autosave, restore, and rendering behavior should remain equivalent.

## No-backcompat rationale

The restructure path deliberately refuses to preserve raw-object compatibility surfaces. A named capability boundary should replace the raw accessors, not sit beside them indefinitely. Any remaining raw view handoff must be explicit and isolated rather than being a generic escape hatch.

## Risks

- This may be too much abstraction if the capability aggregate becomes an anemic directory of interfaces with little additional value over direct `RuntimeSession` methods.
- A poorly designed aggregate could centralize too many unrelated concerns and become a new god-boundary.
- Introducing a new module increases test/update churn compared with the direct proposal.
- Including toolbar history opportunistically could broaden the wave into UI composition if wiring is not simple.
- Typed persistence handles could still pull schema/replay concerns into the wave; defer if they require `ProjectService` redesign.
- The view handoff can become a sanctioned broad facade unless explicitly named as deferred rendering work.

## Validation plan

Same mandatory cadence as the direct proposal, with added static checks for the new capability boundary:

1. Pre-edit status/diff and scans for raw accessors/imports/casts plus any capability module imports.
2. Focused Vitest for app-shell runtime capability wiring, active-plane, selection, keyboard, selection deletion, and persistence adapter if changed.
3. Static architecture tests verifying consumer-facing capability interfaces stay behavior-scoped and selected consumers no longer import `World` / `CommandStack`.
4. Root and frontend lint.
5. Root and frontend full Vitest.
6. Root and frontend build.
7. Root/frontend Playwright e2e where defined.
8. Live preview refresh/probe plus browser smoke for active-plane cycling, select-all/delete/undo/redo, startup/new project, and credential-free behavior.

## Stop conditions / explicit non-goals

Stop and return to review if the restructure begins to require:

- an application-kernel rewrite beyond app-shell runtime capability interfaces;
- renderer/canvas/tool migration beyond naming the current view handoff;
- replacing `World` / `CommandStack` object identity;
- persistence schema/replay/descriptor/registry/migration changes;
- backend, Drive/auth, package/tooling, docs/spec, validation-platform, or debug cleanup;
- broad UI/toolbar composition changes not necessary for the command-history boundary;
- compatibility shims that keep raw accessors alive beside capability ports.

## Recommendation

Choose this proposal if review believes Wave 023 should create a durable capability layer for subsequent waves, especially toolbar history and canvas/tool command cleanup. Otherwise choose the direct proposal: it deletes the known raw app-shell seams with less abstraction and less risk of creating a new central god-boundary.
