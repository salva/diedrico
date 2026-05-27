# Proposal Restructure — Introduce an AppSession façade before browser adapters

## Summary

The restructure option asks whether Wave 020 should move one conceptual layer higher: instead of only extracting browser composition and small ports, introduce a cohesive `AppSession` application façade that owns project lifecycle state transitions, autosave policy, last-project repository, persistence adapter, and keyboard/session actions. `App.vue` and runtime composition would interact with one session façade plus rendering/construction runtime objects. Browser adapters would still be explicit, but app-session state and actions would no longer be split across `ProjectSessionUseCases`, `AutoSaveUseCases`, and parts of `AppShellRuntime`.

This option is more invasive than the direct path. It is only justified if review decides current session/autosave/runtime splitting is itself the central design smell, not merely the hidden production defaults.

## Files to change

Production source:

- New `frontend/src/application/appShell/AppSession.ts` or `frontend/src/application/projectSession/AppSessionController.ts`
  - Own current project ID/name, signed-in/startup dialog state transitions, save status, initialization, create/open/new/rename/sign-in/sign-out/request-files, and autosave scheduling policy.
  - Depend on narrow ports: Drive project file port, session persistence port, last-project repository, scheduler, alert/error policy, auth store, and domain runtime (`World`/`CommandStack` or a narrower `ProjectRuntimePort`).
- New `frontend/src/application/appShell/AppShellProductionRuntime.ts`
  - Compose browser adapters and create the session façade.
- `frontend/src/application/appShell/AppShellRuntime.ts`
  - Become a thin composition container that creates `World`, `CommandStack`, active-plane, selection, keyboard, and app-session façade; stop constructing production browser services/globals.
- `frontend/src/application/appShell/ProjectSessionUseCases.ts`
  - Delete or reduce to methods inside the new `AppSession` façade.
- `frontend/src/application/appShell/AutoSaveUseCases.ts`
  - Delete or reduce to a private `AutoSavePolicy` used by `AppSession`, with timer behavior still unit tested.
- `frontend/src/application/appShell/AppShellPorts.ts`
  - Split broad runtime ports into session ports, browser composition ports, store ports, and keyboard/selection ports if needed.
- `frontend/src/application/appShell/SelectionUseCases.ts`
  - Keep separate unless review chooses to expose delete/select-all as session actions; do not redesign command descriptors.
- `frontend/src/application/appShell/KeyboardShortcutRouter.ts`
  - Route project/session shortcuts to façade methods rather than concrete `ProjectSessionUseCases`; install against explicit target.
- `frontend/src/App.vue`
  - Consume production runtime/facade actions, preserving template behavior.
- `frontend/src/services/ProjectService.ts` and `frontend/src/services/GoogleDriveService.ts`
  - No internal redesign; consumed by adapters only.

Tests:

- Replace broad `AppShellRuntimeUseCases.test.ts` sections with focused façade tests for session state transitions and autosave policy.
- Keep `KeyboardShortcutRouter.test.ts` but depend on a smaller project-session action interface.
- Strengthen `AppShellBoundary.test.ts` to enforce no browser globals/default services in runtime core and no Vue component imports in session modules.
- Keep e2e project-flow and keyboard specs as user-visible regression checks.

## Files/tests/docs/fixtures to DELETE

- Delete `ProjectSessionUseCases.ts` as a standalone class if the façade absorbs it completely; otherwise delete duplicated state-transition logic left behind.
- Delete `AutoSaveUseCases.ts` as a public app-shell class if replaced by an internal `AutoSavePolicy`; otherwise delete only duplicated policy code.
- Delete `AppShellRuntime.ts` responsibility for startup dialog/session state if moved into the façade.
- Delete hidden runtime default construction of Drive/persistence/storage/scheduler/window target.
- Delete duplicated local-storage key literals and broad static-shaped persistence ports.
- Delete tests that instantiate old project-session/autosave classes if those classes are removed; replace with façade and policy tests.
- Delete compatibility exports that keep old classes alive solely for tests.
- Do not delete `ProjectService`, `GoogleDriveService`, dialog components, e2e specs, or package scripts.

## Expected behavior change

User-visible behavior remains equivalent, but application architecture changes more substantially: project session and autosave become one explicit state-machine/facade boundary, and keyboard/runtime use a smaller project-session action interface. Tests shift from class-by-class implementation details to session transition behavior.

## Risks

- This may overreach Wave 020 by creating a broad `AppSession` god object if not carefully split into façade + small policy/adapters.
- Moving autosave into a façade can obscure timer ownership and disposal unless tests remain precise.
- Deleting public use-case classes requires touching more tests and imports than the direct option.
- The restructure path may tempt broader store, persistence, command, or Drive redesign; those are out of scope.
- Review may decide the current `ProjectSessionUseCases`/`AutoSaveUseCases` split is acceptable once hidden production defaults and duplicated storage keys are removed.

## Validation plan

Same mandatory cadence as the direct proposal, with additional focused tests for the new façade/policy:

1. Static scans proving no hidden browser/default service construction remains in runtime core and no duplicated last-project keys remain.
2. Focused Vitest for new `AppSession`/`AutoSavePolicy`/adapter tests plus existing keyboard and boundary tests.
3. Root/frontend lint, full Vitest, build, and e2e.
4. Live preview refresh/probe and browser smoke for startup/no-credentials, project chooser, keyboard shortcuts, and visible save/status behavior.

## No-backcompat rationale

If the current public use-case class split is judged the wrong abstraction, delete the stale classes and tests directly. Do not keep wrapper classes forwarding to a new façade purely for compatibility; app-shell internals have no compatibility value compared with a clean ownership boundary.

## Stop conditions for broader redesign

Stop and request reviewed plan edit if implementation needs:

- project persistence schema/command serialization changes;
- Drive authentication/GAPI internals redesign;
- a general application kernel/event bus spanning tools/rendering/domain;
- broad store redesign or Vue component rewrite;
- package/tooling/backend/docs/spec changes.

## Recommendation relative to direct proposal

Prefer the direct proposal unless review finds that `ProjectSessionUseCases` and `AutoSaveUseCases` cannot be cleanly narrowed without retaining duplicated state-machine responsibility. The direct proposal fits one cycle better and directly addresses the reviewed Wave 020 problem; the restructure proposal is a fallback if the right fix is one conceptual layer higher.
