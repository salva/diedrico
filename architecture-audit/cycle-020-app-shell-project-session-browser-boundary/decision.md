# Cycle 020 Decision — App-shell project session and browser integration boundary

## Decision status

Decision: **approved for implementation**  
Selected implementation path: **`proposals/proposal-direct.md`**  
Rejected alternative: **`proposals/proposal-restructure.md`**  
Recommended next stage: **`cycle-020-implement-app-shell-project-session-browser-boundary`**

This is a planning-only decision artifact. No source, test, package, backend, docs/spec, runtime, or secret/config implementation was performed in this decision stage.

## Reviewed evidence

This decision is based on the current Cycle 020 reviewed artifacts and scoped source-control evidence:

- `architecture-audit/cycle-020-app-shell-project-session-browser-boundary/scope-check.md`
- `architecture-audit/cycle-020-app-shell-project-session-browser-boundary/proposals/proposal-direct.md`
- `architecture-audit/cycle-020-app-shell-project-session-browser-boundary/proposals/proposal-restructure.md`
- `architecture-audit/cycle-020-app-shell-project-session-browser-boundary/reviews/corrections-round-01-manager-review.md`
- `architecture-audit/cycle-020-app-shell-project-session-browser-boundary/reviews/round-02-review.md`
- `architecture-audit/cycle-020-app-shell-project-session-browser-boundary/source-control-reconciliation.md`
- `architecture-audit/wave-plan.md` Wave 020 entry, captured for this stage at `.saivage/stages/cycle-020-decision/wave-020-entry.stdout`
- scoped status captured for this stage at `.saivage/stages/cycle-020-decision/scoped-status.stdout`
- scoped diff-name evidence already present at `.saivage/stages/cycle-020-decision/scoped-diff-name-status.stdout`

The actual correction-review artifact name is **`architecture-audit/cycle-020-app-shell-project-session-browser-boundary/reviews/corrections-round-01-manager-review.md`**. The `round-02-review.md` note reports that a differently named synthesized correction-review artifact was mentioned in stage context but was not present; that mismatch is non-blocking because the actual manager-review artifact above and the corrected proposal were present and reviewed.

## Review convergence

Review convergence is complete for Cycle 020 proposals.

`reviews/round-02-review.md` declares **NO BLOCKING ISSUES**, names **`proposal-direct.md`** as the preferred direction, and recommends proceeding to the decision stage. It verifies that the three round-01 blockers were resolved:

1. `SelectionUseCases` handling is explicit: direct delete-command construction remains intentional application-use-case behavior and residual debt for this wave.
2. Production browser/service composition ownership is explicit: one production composition module owns concrete browser/service/default adapter construction while `App.vue` remains passive and `AppShellRuntime.ts` receives dependencies explicitly.
3. Focused validation requirements are explicit: tests/static scans must prove runtime core no longer owns hidden production defaults and that last-project storage keys have one repository owner.

No additional corrections or review rounds are required before implementation. If implementation discovers evidence that the selected scope cannot be implemented without broadening into forbidden areas, it must stop and request a reviewed delta/plan edit rather than silently expanding the wave.

## Selected path and rationale

Cycle 020 selects **`proposal-direct.md`**.

Rationale:

- It directly advances Wave 020's target outcome: separating app-shell runtime core from production browser/default adapter construction while preserving current project/session behavior.
- It improves architecture and code quality by deleting hidden defaults from runtime core, centralizing production composition, narrowing the app-shell-facing persistence/session ports, centralizing last-project key ownership, and removing `error: any` in touched autosave/session handling.
- It respects the no-backcompat priority: the old hidden-global/default construction path is internal debt and must be deleted, not wrapped with compatibility overloads or dual runtime creation modes.
- It avoids overreach by keeping `ProjectService` serialization internals, `GoogleDriveService` internals, command/undo descriptors, selection command construction, rendering, backend, docs/specs, and package/tooling outside the implementation scope.
- It includes sufficient validation: static scans, focused app-shell boundary/unit tests, root and frontend lint/test/build/e2e, live preview refresh, HTTP reachability probe, and credential-free Playwright/live smoke.

## Rejected alternative and fallback handling

`proposal-restructure.md` is rejected for this cycle as **overbroad**. Its `AppSession` façade could be useful if later evidence proves the existing `ProjectSessionUseCases` / `AutoSaveUseCases` split cannot remain coherent, but that evidence is not present after review convergence. Implementing a broader façade now would increase churn and risk creating a new god object, while the direct proposal resolves the reviewed Wave 020 seam.

The restructure option remains a fallback only under a stop condition: if implementation cannot cleanly extract explicit production composition and narrow session ports without absorbing project/session/autosave into a higher-level façade, implementation must stop and request a reviewed delta or plan edit. It must not broaden the current implementation stage ad hoc.

## Bound implementation scope

The implementation stage must follow `proposal-direct.md` exactly and may only touch the following production surfaces as needed for that proposal:

- `frontend/src/application/appShell/AppShellRuntime.ts`
- `frontend/src/application/appShell/AppShellPorts.ts`
- new app-shell production composition module, expected name such as `frontend/src/application/appShell/AppShellProductionRuntime.ts`
- new app-shell adapter modules as needed, expected examples:
  - `ProjectSessionPersistenceAdapter.ts`
  - `BrowserLastProjectRepository.ts`
  - optional `AppShellErrorClassifier.ts`
- `frontend/src/application/appShell/ProjectSessionUseCases.ts`
- `frontend/src/application/appShell/AutoSaveUseCases.ts`
- `frontend/src/application/appShell/KeyboardShortcutRouter.ts`
- `frontend/src/App.vue` only to call the production composition factory and pass simple UI callbacks/refs/env-derived config
- `frontend/src/services/ProjectService.ts` only if mechanically required at the adapter boundary; its serialization/deserialization internals are not implementation scope
- `frontend/src/services/GoogleDriveService.ts` only if mechanically required at the production composition/adapter boundary; its Google API/auth/storage internals are not implementation scope
- focused app-shell tests under `frontend/tests/unit/application/appShell/`
- existing e2e specs only if a narrow adjustment is required to preserve current user-flow coverage after the boundary change

### Production composition ownership rules

There must be one production-browser composition owner: the new production composition module/factory. It alone may construct or choose:

- `new GoogleDriveService(googleConfig)`
- the `ProjectService`-backed persistence adapter binding
- browser storage / last-project repository backed by `window.localStorage`
- browser scheduler/timer adapter defaults
- keyboard event target (`window`)
- concrete browser alert/error callbacks where such callbacks are production browser behavior

`App.vue` remains a passive Vue shell. It may read Vite environment values into a plain `googleConfig` object and pass UI refs/callbacks into the production factory. It must not instantiate concrete services, adapters, repositories, schedulers, storage, or keyboard targets, and must not regain project lifecycle/autosave/keyboard orchestration.

`AppShellRuntime.ts` remains runtime core. It may keep owning `World` and `CommandStack` creation unless implementation evidence requires a reviewed delta, but it must receive production dependencies explicitly and must not recreate hidden defaults for Drive, persistence, browser storage, scheduler, or keyboard target.

### SelectionUseCases residual handling

`frontend/src/application/appShell/SelectionUseCases.ts` direct construction of delete commands through `Command` / `DeletionSequenceFactory` is intentionally retained for Cycle 020 as application-use-case behavior and known residual debt. The implementation must not introduce a delete-selection port, command-controller abstraction, command descriptor redesign, undo/redo redesign, or broad command/persistence refactor under this wave.

Selection behavior must remain user-visible equivalent. Existing keyboard/delete/select-all coverage remains the regression guard unless mechanically touched tests require focused updates.

## Required deletes and replacements

The implementation must delete, not wrap, these surfaces where the direct proposal replaces them:

- hidden default construction in `AppShellRuntime.ts` of `GoogleDriveService`, static `ProjectService` persistence binding, `window.localStorage`, browser scheduler defaults, and `keyboard.install(window)`;
- duplicated `diedrico_last_file_id` and `diedrico_last_file_name` literals from `ProjectSessionUseCases.ts` and `AutoSaveUseCases.ts`, replaced by a named last-project repository/port;
- the app-shell `ProjectPersistencePort` shape that exposes concrete static `ProjectService` methods, replaced by a narrower project-session persistence adapter/port;
- `error: any` in touched autosave/session save-error handling, replaced by `unknown` normalization/classification;
- unit tests that assert runtime core itself reaches for global `window` or concrete service/default construction;
- any old runtime-creation overload, compatibility helper, or parallel hidden-global path that preserves both old and new composition modes.

Do not delete or rewrite `ProjectService` command-stream internals, `GoogleDriveService` internals, dialog components, backend/docs/spec files, package scripts, rendering/domain realization layers, or e2e specs except for narrow test maintenance allowed above.

## Forbidden repairs and out-of-scope surfaces

The implementation stage must stop and request reviewed scope change if it appears necessary to do any of the following:

- change project persistence schema, command descriptors, operation replay behavior, or serialization internals;
- redesign `GoogleDriveService` authentication, GAPI loading, token/session storage, or network behavior;
- move `World`/`CommandStack` creation into a broader application kernel;
- redesign command/undo, selection/delete command ownership, process tree, domain realization, rendering selectors, Three scene-host lifecycle, or broad store architecture;
- modify backend, docs/specs, debug/placeholder cleanup, package scripts, dependency/tooling, or validation infrastructure;
- read or include forbidden secret/config content, including `.saivage/auth-profiles.json`, `.saivage/saivage.json`, env files, OAuth tokens, Google Drive credentials, or provider configs;
- incorporate unrelated dirty workspace changes into the Cycle 020 implementation unless directly authorized and reconciled with scoped diff evidence.

## Source-control hygiene constraints

Current scoped status for this decision stage shows pre-existing adjacent dirty source/test files, including `frontend/src/application/appShell/AppShellPorts.ts`, several command/domain/store/component files, deleted `frontend/tests/e2e/active-plane-shortcuts.spec.ts` and `frontend/tests/e2e/selection-mask.spec.ts`, and untracked `frontend/src/vite-env.d.ts`. Earlier reconciliation specifically identified `frontend/src/application/appShell/AppShellPorts.ts` and the two deleted e2e specs as already dirty before Cycle 020 scout/proposal work.

The implementation stage must:

- capture pre-edit scoped status and scoped diff before modifying files;
- distinguish pre-existing dirty work from Cycle 020 implementation changes;
- avoid reverting, formatting, or incorporating unrelated dirty files;
- touch only files required by the selected direct proposal;
- inspect diffs before committing;
- cite any unavoidable overlap with pre-existing dirty files in `implementation-log.md`.

## Mandatory validation and log locations

Implementation validation logs must be captured under:

`architecture-audit/cycle-020-app-shell-project-session-browser-boundary/validation/`

Minimum required evidence:

1. Pre/post scoped git status and scoped diff logs.
2. Static scans for hidden app-shell concrete construction/browser globals, project-session storage-key duplication, app-shell persistence/Drive port shapes, keyboard target installation, and `error: any` in touched paths. Include at least the direct proposal's scan pattern for `new GoogleDriveService`, `ProjectService`, `window.localStorage`, `keyboard.install(window)`, `diedrico_last_file`, and `error: any` across app-shell source and `App.vue`.
3. Focused Vitest for touched app-shell runtime/use cases/ports/adapters and app-shell boundary tests, including:
   - runtime core constructed with explicit fake dependencies;
   - production composition as the only owner of browser/service defaults;
   - last-project repository as the single owner of `diedrico_last_file_id` / `diedrico_last_file_name` persistence;
   - project-session/autosave use cases interacting through repository methods;
   - keyboard explicit target install/dispose behavior.
4. `npm run lint` at repository root.
5. `npm run lint --workspace=frontend`.
6. Focused Vitest command for app-shell touched tests.
7. `npm run test` at repository root.
8. `npm run test --workspace=frontend`.
9. `npm run build` at repository root.
10. `npm run build --workspace=frontend`.
11. `npm run test:e2e` at repository root.
12. `npm run test:e2e --workspace=frontend`.
13. Live preview refresh bound to `0.0.0.0:5173`, with HTTP 200 reachability probe captured for `127.0.0.1:5173` and, where meaningful in-container, `0.0.0.0:5173`.
14. Playwright MCP/live browser smoke for startup/no-credentials project chooser or new-project flow, representative keyboard shortcuts, and visible save/status behavior where possible without real Drive credentials.

Undefined commands may only be skipped with exact package-script evidence in `implementation-log.md`. Because Cycle 020 touches frontend project/session/keyboard behavior, e2e and live browser smoke are mandatory unless a harness failure is explicitly evidenced and routed according to the project process.

## Implementation-log requirements

The implementation stage must write `architecture-audit/cycle-020-app-shell-project-session-browser-boundary/implementation-log.md` with:

- source files changed;
- tests changed;
- legacy surfaces deleted, with paths and short explanations;
- commands run, stable stdout/stderr log paths, and pass/fail result;
- source-control reconciliation for any pre-existing dirty overlap;
- confirmation that `SelectionUseCases` direct delete-command construction remains an accepted residual and was not redesigned;
- residual risks and candidate future waves observed during implementation;
- live preview refresh command/procedure and reachability probe result.

## Residual risks accepted for implementation

- Startup without Google credentials can regress if production composition mishandles the current `drive: null` behavior.
- Autosave debounce/status timing can regress if scheduler injection or save-status timer cleanup changes.
- Keyboard routing can regress if every call site/test is not updated to provide an explicit target.
- Real Google Drive behavior cannot be validated with secrets/credentials in this environment; implementation must rely on fake-port tests and credential-free browser smoke.
- `SelectionUseCases` command construction remains residual architecture debt by decision and may need a future reviewed wave after this boundary is clean.
- Pre-existing adjacent dirty source/test changes increase attribution risk; implementation must use scoped status/diff evidence and avoid unowned changes.

## Final decision

Cycle 020 is unblocked for implementation using **`proposal-direct.md`** only. The next Manager stage should be **`cycle-020-implement-app-shell-project-session-browser-boundary`**. If implementation cannot stay within this decision's scope, it must stop and route back to a reviewed correction/delta proposal rather than proceeding with partial or broadened implementation.
