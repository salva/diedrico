# Cycle 020 Decision post-019 — App-shell project session / browser integration boundary

## Status

**IMPLEMENTATION AUTHORIZED.** Canonical review round 01 found **NO BLOCKING ISSUES** and recommends selecting `proposals/proposal-direct.md` for implementation. This decision is the authoritative Wave 020 post-019 implementation gate and supersedes any stale Cycle 020 decision artifact for this wave.

Implementation must proceed only in the next unique implementation stage:

`cycle-020-implement-app-shell-project-session-browser-integration-post-019`

No production source, test, package/tooling, validation, preview, or implementation work is performed by this decision stage.

## Evidence inspected for this decision

Reviewed Wave 020 artifacts:

- `architecture-audit/cycle-020-app-shell-project-session-browser-integration/scope-check.md`
- `architecture-audit/cycle-020-app-shell-project-session-browser-integration/proposals/proposal-direct.md`
- `architecture-audit/cycle-020-app-shell-project-session-browser-integration/proposals/proposal-restructure.md`
- `architecture-audit/cycle-020-app-shell-project-session-browser-integration/critique/round-01-critique.md`
- `architecture-audit/cycle-020-app-shell-project-session-browser-integration/reviews/round-01-review-post-019.md`
- `architecture-audit/cycle-020-app-shell-project-session-browser-integration/reviews/stage-quality-review.md`
- Wave 020 entry in `architecture-audit/wave-plan.md`
- Wave 019 closure evidence in `architecture-audit/cycle-019-three-scene-host-lifecycle-renderer-platform/implementation-log-post-018.md`
- 3D overlay regression/hotfix evidence in `architecture-audit/cycle-026-hotfix-3d-view-interaction-regression/implementation-log.md`

Decision-stage source-control evidence was captured before writing this file:

- `.saivage/stages/cycle-020-decision-post-019/design-notes/pre-decision-scoped-status.stdout`
- `.saivage/stages/cycle-020-decision-post-019/design-notes/pre-decision-scoped-diff-names.stdout`
- `.saivage/stages/cycle-020-decision-post-019/design-notes/wave-020-plan-entry.stdout`

The scoped status/diff confirms that no Wave 020 app-shell source path was dirty before this decision draft. The only scoped dirty production files observed were unrelated and protected from this wave:

- `frontend/src/domain/calculations/Intersections.ts`
- `frontend/src/domain/processTree/ActionGroup.ts`
- `frontend/src/stores/viewStore.ts`

The scoped status also showed untracked Wave 020 `critique/` and `reviews/` artifacts from prior stages. Those artifacts are decision inputs, not implementation changes.

## Review convergence and critic protocol

Review convergence is complete for this decision gate.

- `reviews/round-01-review-post-019.md` explicitly states: **“No blocking issues found. Recommend proceeding to `cycle-020-decision-post-019` and selecting `proposal-direct.md` as the preferred implementation path.”**
- The review scored `proposal-direct.md` as Pass on all six required criteria: advancing the wave target, improving architecture/code quality, respecting aggressive deletion/no-backcompat priorities, avoiding overfeaturism, managing regression risks, and providing sufficient validation.
- The review scored `proposal-restructure.md` as only a conditional/fallback path with higher churn and higher facade risk.

Critic protocol was satisfied through the documented failure-tolerance route:

- `critique/round-01-critique.md` is marked `synthesized_by: manager` with `reason: critic_dispatch_unavailable` after two failed critic attempts.
- The synthesized critique approved the scope-check and proposals with no blocking issues and specifically recommended the direct hardening/deletion path unless canonical review found a real blocker.
- `reviews/stage-quality-review.md` records the prior fresh-scout stage-quality review as synthesized under reviewer failure tolerance and found no blocking stage-quality issues.

This is sufficient evidence to authorize implementation under the project’s bounded review/critic convergence rules.

## Selected proposal

**Selected:** `proposals/proposal-direct.md` — Harden the existing app-shell production/browser composition boundary.

Rationale:

1. Current source already contains many of the target seams originally requested by Wave 020: `App.vue` delegates runtime construction to `createProductionAppShellRuntime`; production browser bindings are concentrated in `AppShellProductionRuntime.ts`; last-project keys are behind `BrowserLastProjectRepository`; `ProjectService` static calls are localized to `ProjectSessionPersistenceAdapter`; and `createAppShellRuntime` consumes injected ports rather than constructing browser globals.
2. The best architectural move is therefore bounded hardening/deletion, not artificial broad restructuring.
3. The direct proposal targets the remaining likely cleanup points: obsolete hidden-construction tests, broad dependency bags, test `as any` fixtures, dead exports, `createAppShellRuntime().internals` leakage if actually removable, and single-owner boundary assertions.
4. The direct proposal preserves Wave 019 renderer/platform boundaries and the Cycle 026 3D pointer-boundary fix.

**Rejected for now:** `proposals/proposal-restructure.md`.

Rejection rationale:

- It is a useful stop/fallback path, but current review evidence does not prove that an additional application-session composition layer is necessary.
- Selecting it now would risk creating a new broad facade or renaming the existing concentration without deleting meaningful complexity.
- It may be reconsidered only through a reviewed delta or plan-edit if the direct implementation hits one of the stop conditions below.

## Binding implementation scope

The implementation stage may modify only files needed to execute the selected direct proposal.

### Primary source scope

Allowed production/source paths:

- `frontend/src/application/appShell/AppShellRuntime.ts`
- `frontend/src/application/appShell/AppShellPorts.ts`
- `frontend/src/application/appShell/AppShellProductionRuntime.ts`
- `frontend/src/application/appShell/BrowserLastProjectRepository.ts`
- `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts`
- `frontend/src/application/appShell/ProjectSessionUseCases.ts`
- `frontend/src/application/appShell/AutoSaveUseCases.ts`
- `frontend/src/application/appShell/KeyboardShortcutRouter.ts`
- `frontend/src/application/appShell/SelectionUseCases.ts` only to preserve the existing selection/delete port seam, not to redesign delete command ownership
- `frontend/src/App.vue` only if necessary to keep it as a passive shell or to preserve production runtime wiring

Allowed focused test paths:

- `frontend/tests/unit/application/appShell/`
- Existing focused selection deletion tests only if an app-shell selection port seam is touched
- `frontend/tests/e2e/current-ui-contract.spec.ts` only if assertions need minimal alignment while preserving the 3D overlay pointer contract
- Existing keyboard shortcut e2e tests only if keyboard routing signatures change

### Touch only if unavoidable and narrowly justified

- `frontend/src/services/GoogleDriveService.ts` only at the app-shell DrivePort adapter/type boundary; do not change Drive/GIS/OAuth behavior.
- `frontend/src/services/ProjectService.ts` only if a type import/export adjustment is strictly required by the app-shell adapter; do not change serialization, validation, command replay, schema, or descriptors.
- `frontend/src/stores/authStore.ts`, `frontend/src/stores/selectionStore.ts`, `frontend/src/stores/toolStore.ts`, `frontend/src/stores/viewStore.ts` only as narrow port consumers/adapters. Current dirty `viewStore.ts` must remain untouched unless the selected implementation explicitly cannot compile without a reviewed, minimal app-shell port compatibility edit.

### Out of scope and protected

Do not modify or normalize:

- `frontend/src/domain/calculations/Intersections.ts`
- `frontend/src/domain/processTree/ActionGroup.ts`
- unrelated dirty `frontend/src/stores/viewStore.ts`
- domain realization/read-context contracts
- canvas presentation selectors, SVG rendering, canvas interaction, tool controllers, process-history/panel/toolbar command architecture
- 3D presentation, Three scene-host/runtime/registry/adapters, `ThreeView.vue`, OrbitControls, overlay CSS/pointer behavior
- command descriptors, command replay, operation registry, persistence schema/version, broad `ProjectService` internals
- backend, docs, specs, package metadata, lockfiles, dependency/tooling configuration, validation-platform scripts
- Google Drive/OAuth/auth internals or secret/config/env files
- broad Pinia store redesign or UI feature work
- stale discarded audit history or any prior stale cycle artifacts not listed as Wave 020 inputs

## Binding ownership rules

### `App.vue` shell boundary

`App.vue` must remain a passive Vue composition shell:

- It may read production Google config from `import.meta.env` as shell configuration, but implementation must not read secret/config files.
- It may pass stores and UI callbacks, including an alert callback, into the production composition boundary.
- It may provide the runtime state/action ports to descendants and call runtime start/dispose.
- It must not regain inline Drive construction, project persistence serialization/deserialization, autosave logic, keyboard listener installation, last-project storage-key logic, `World`/`CommandStack` construction, project lifecycle orchestration, or command/session mutation logic.

### `AppShellProductionRuntime.ts` browser composition ownership

`AppShellProductionRuntime.ts` is the single production app-shell browser composition boundary for this wave.

It owns production creation/injection of:

- optional `GoogleDriveService` / DrivePort adapter construction;
- `ProjectSessionPersistenceAdapter` construction;
- `BrowserLastProjectRepository(window.localStorage)` construction;
- browser scheduler/timers;
- `window` as the keyboard target;
- shell-provided UI callbacks.

The implementation must not introduce a second parallel production runtime factory or a broad `AppShellService` facade. Tiny local helpers are allowed only if they reduce coupling and delete old paths; no re-export shims or dual construction modes may remain.

### `createAppShellRuntime` environment-free runtime rules

`createAppShellRuntime` must remain environment-free runtime assembly:

- no direct `window`, `localStorage`, `sessionStorage`, `GoogleDriveService`, or `ProjectService` imports;
- no hidden default browser/static-service construction;
- start/dispose behavior must use injected ports, especially `ports.keyboardTarget`;
- returned state/actions must remain typed and stable enough for `App.vue`;
- `internals` exposure is a cleanup candidate. Delete or narrow it if tests can move to public state/actions or typed test builders. If it remains, it must be typed, documented as test/introspection-only, and not used by production UI.

### Last-project storage-key ownership

`BrowserLastProjectRepository.ts` is the only owner of `diedrico_last_file_id` and `diedrico_last_file_name` storage keys.

Implementation must:

- delete any duplicated last-project key literal found outside the repository;
- keep use cases dependent on `lastProjectRepository`, not direct browser storage;
- avoid folding unrelated view/tool/auth preference keys into this repository.

### Persistence adapter and `ProjectService` isolation

`ProjectSessionPersistenceAdapter.ts` remains the only app-shell bridge to `ProjectService`.

Implementation must:

- keep `ProjectService` static calls localized to the adapter;
- keep any `ProjectData` / persisted-session casts adapter-local;
- avoid exposing `ProjectData`, command descriptor details, schema versions, replay semantics, or raw serialization internals to app-shell use cases;
- not change persistence file format, command descriptors, operation registry, or replay behavior.

### `ProjectSessionUseCases` and `AutoSaveUseCases` dependency-shape rules

These use cases must remain app-session use cases over typed ports:

- no storage-key literals;
- no raw browser timer APIs;
- no direct `GoogleDriveService`, Google API, browser Drive/GIS, or `ProjectService` imports;
- no direct `window`, `localStorage`, or `sessionStorage` access;
- typed fake builders should replace touched broad `as any` dependency fixtures where feasible;
- constructor/dependency shapes may be narrowed if doing so deletes real broad bags or weak test fixtures without creating a new facade.

Behavior must remain equivalent for startup, sign-in/sign-out, create/open/new/rename/request-files, autosave debounce/status, missing remote file fallback, auth-expiry startup UI, and quota alert policy.

### Keyboard target installation rules

Keyboard listener ownership must remain explicit and testable:

- `KeyboardShortcutRouter` owns shortcut routing and install/dispose against an injected target;
- `createAppShellRuntime.start()` installs via the injected keyboard target;
- production composition injects `window` as that target;
- `App.vue` must not install global key listeners directly.

Implementation must preserve current shortcut behavior: Escape, Delete/Backspace, F2, Tab, tool shortcuts, Ctrl/Cmd+N/O/A/0/Z/Y, text-input exclusions, and command-history routing.

### `RuntimeSession`, `World`, and `CommandStack` ownership

For Wave 020, `RuntimeSession` remains the intentional application runtime/session owner of the current in-memory `World` and `CommandStack`.

Implementation must:

- not split or replace the command kernel broadly;
- not redesign command descriptors, replay, undo/redo, or initialization semantics;
- keep any `World`/`CommandStack` ownership centralized and documented as residual application-session ownership;
- treat deeper command-kernel/session-port cleanup as future-wave work unless a reviewed delta explicitly changes scope.

If implementation discovers that `World`/`CommandStack` ownership cannot remain inside `RuntimeSession` without redesigning command execution or persistence, it must stop and request a reviewed delta/plan edit.

## Binding delete list

The Wave 020 implementation is incomplete if any selected obsolete path remains active. Delete rather than wrap:

- test expectations that `createAppShellRuntime` directly constructs `GoogleDriveService`, `ProjectSessionPersistenceAdapter`, browser localStorage, or the `window` keyboard target;
- hidden/global runtime factory paths if explicit port injection is the current path;
- duplicate production runtime factories if `AppShellProductionRuntime.ts` remains the composition boundary;
- duplicate last-project storage-key literals outside `BrowserLastProjectRepository.ts`;
- touched app-shell test fixtures that require `as any` only because dependency shapes are overly broad, where typed fake builders can replace them;
- dead exports from app-shell port/runtime/adapter modules after tightening shapes;
- compatibility overloads, re-export shims, dual hidden-global/port-based creation paths, or broad facades that merely rename existing concentration.

Do not delete Drive/auth internals, `ProjectService` serialization internals, command descriptors, renderer/Three files, backend/docs/spec files, package/tooling files, or unrelated dirty source files in this wave.

## Expected behavior change

No user-visible feature change is intended.

Required equivalent behavior:

- startup without Google credentials initializes a default local world and hides the startup dialog;
- startup with configured credentials initializes Drive/auth flows as currently implemented and restores/opens the last valid project where applicable;
- sign-in/sign-out/create/open/new/rename/request-files preserve current loading, error, dialog, and save-status behavior;
- autosave debounce, saved-to-idle transition, missing remote file recreation, auth-expiry handling, and quota alert policy remain equivalent;
- keyboard shortcuts and text-input exclusions remain equivalent;
- 3D overlay owns pointer input and does not pass drag gestures through to the SVG canvas.

## Validation requirements for implementation

All validation stdout/stderr must be captured under:

`architecture-audit/cycle-020-app-shell-project-session-browser-integration/validation/`

Required gates:

1. Pre-edit and post-edit scoped git status/diff for authorized Wave 020 paths and protected dirty paths.
2. Static scans proving:
   - `AppShellRuntime.ts`, `ProjectSessionUseCases.ts`, and `AutoSaveUseCases.ts` do not directly import/use `window`, `localStorage`, `sessionStorage`, `GoogleDriveService`, or `ProjectService`;
   - `AppShellProductionRuntime.ts` is the only app-shell production browser construction module;
   - last-project key literals occur only in `BrowserLastProjectRepository.ts` plus legitimate tests if explicitly justified;
   - `ProjectService` is imported only by `ProjectSessionPersistenceAdapter.ts` in the app-shell area;
   - keyboard target install/dispose remains explicit;
   - `RuntimeSession` remains the single app-shell owner of `new World()` and `new CommandStack()`;
   - `.three-view-overlay { pointer-events: auto; }` and the current UI contract e2e overlay assertion remain present.
3. Focused Vitest for changed app-shell modules, including where still current:
   - `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts`
   - `frontend/tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts`
   - `frontend/tests/unit/application/appShell/KeyboardShortcutRouter.test.ts`
   - focused selection deletion tests if the selection seam is touched.
4. `npm run lint` at the repository root.
5. `npm run lint --workspace=frontend` where defined.
6. Focused/root/full Vitest at the root.
7. Full Vitest in the frontend workspace.
8. `npm run build` at the repository root.
9. `npm run build --workspace=frontend` where defined.
10. `npm run test:e2e` at the repository root.
11. `npm run test:e2e --workspace=frontend` where defined.
12. Live preview refresh bound to `0.0.0.0:5173`, HTTP 200 reachability probe, and credential-free Playwright/live browser smoke covering startup/no-credential behavior, new-project/open-dialog affordances where practical, representative keyboard shortcuts, visible save/status behavior where practical without credentials, and 3D overlay no click-through.

Undefined commands may be skipped only with exact package-script evidence recorded in the implementation log. Any validation failure attributable to the Wave 020 change rejects the implementation until corrected.

## 3D overlay interaction preservation

Wave 020 must preserve the Wave 019 Three runtime/platform boundary and the Cycle 026 overlay hotfix.

Binding requirements:

- Do not change `ThreeView.vue`, Three scene host/runtime/registry/adapters, OrbitControls behavior, canvas drag behavior, or `.three-view-overlay` CSS/pointer behavior.
- Keep `.three-view-overlay { pointer-events: auto; }` intact.
- Keep e2e coverage that proves the 3D overlay receives pointer hit-testing and does not drag the underlying SVG canvas.
- If any implementation appears to require touching these surfaces, stop and request a reviewed plan edit before proceeding.

## Source-control hygiene

The worktree is broad/noisy enough that full `git status` may overflow. The implementation stage must:

- use path-scoped status/diff before and after edits;
- stage only files selected by the Wave 020 implementation;
- not revert, normalize, format, or incorporate unrelated dirty files;
- not depend on unrelated dirty changes for tests to pass;
- explicitly record any pre-existing dirty context in `implementation-log.md`.

Specifically forbidden unless a reviewed delta makes them directly necessary:

- reverting/incorporating/formatting `frontend/src/domain/calculations/Intersections.ts`;
- reverting/incorporating/formatting `frontend/src/domain/processTree/ActionGroup.ts`;
- reverting/incorporating/formatting `frontend/src/stores/viewStore.ts`;
- normalizing unrelated audit/validation noise.

## Stop conditions

Stop implementation and request a reviewed delta proposal or plan-edit if any of the following becomes necessary:

- changing persistence schema, command descriptors, operation replay, or `ProjectService` serialization semantics;
- redesigning Google Drive, OAuth/GIS, auth-store token/session persistence, or reading any secret/config/env files;
- moving `World`/`CommandStack` out of `RuntimeSession` into a broad command/application kernel;
- touching Three runtime/host/registry/adapters, `ThreeView.vue`, overlay CSS, OrbitControls, or canvas drag behavior;
- broad store redesign or incidental normalization of dirty `viewStore.ts`;
- creating a broad `AppShellService`, browser facade, or session facade that only renames existing concentration without deleting old paths;
- requiring backend/docs/spec/package/tooling changes to make app-shell work compile;
- discovering that the selected direct path cannot delete real leaks without retaining dual old/new construction paths.

At a stop condition, do not continue by broadening scope silently. Write the finding, propose the minimal delta, and send it through the required review/critic loop.

## Residual risks accepted for implementation

- Current source already satisfies many Wave 020 target seams, so the implementation may be small. That is acceptable if the log proves real hardening/deletion or proves no applicable source change is needed beyond tests/boundary evidence.
- `createAppShellRuntime().internals` may remain if deleting it would create more churn than value; if retained, it must be typed and bounded as test/introspection-only.
- `ProjectSessionUseCases` may retain a broad dependency bag if narrowing it would require a larger session-kernel restructuring; if retained, the implementation log must justify why the direct wave still improved or verified the boundary.
- `RuntimeSession` retains `World`/`CommandStack` ownership for this wave. Deeper command-kernel and persistence-session contracts may become future waves.
- `ProjectSessionPersistenceAdapter` may retain adapter-local casts around persisted/session handles if removing them would require persistence schema or `ProjectService` redesign.
- Credential-free validation cannot prove real Google Drive behavior end-to-end; fake-port unit coverage plus no-credential live smoke is the accepted validation strategy for this wave.
- Broad dirty workspace context remains; path-scoped source-control hygiene is mandatory.

## Next stage recommendation

Because review convergence has no blockers and this decision selects the direct proposal, proceed to:

`cycle-020-implement-app-shell-project-session-browser-integration-post-019`

That implementation stage must follow this decision and `proposals/proposal-direct.md` exactly. Any deviation requires a reviewed delta before source changes continue.
