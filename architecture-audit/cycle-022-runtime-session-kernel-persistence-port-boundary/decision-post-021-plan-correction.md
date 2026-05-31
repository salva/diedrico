# Cycle 022 Decision — Runtime session kernel / persistence port boundary (post-021 plan correction)

## Decision status

**Decision:** proceed to implementation after this decision-only stage, subject to stage review.

**Selected implementation path:** `proposals/proposal-direct.md`.

**Rejected alternative:** `proposals/proposal-restructure.md` is rejected as the implementation path for Wave 022. It remains only a fallback/stop-path analysis if direct implementation discovers that the reviewed boundary cannot be completed without a broader reviewed plan edit.

**Review convergence evidence:** `reviews/round-01-review-post-021-plan-correction.md` records **No blocking issues found in the round-01 proposal set** and recommends proceeding to the decision stage with `proposal-direct.md` as the implementation candidate. The critic evidence for the preceding design loop is protocol-compliant synthesized evidence at `critique/round-01-critique-post-021-plan-correction.md`, marked `synthesized_by: manager` and `reason: critic_dispatch_unavailable`; it also records **Approved — no blocking issues**. This satisfies the project failure-tolerance rule for critic unavailability and does not block implementation.

No source implementation, test implementation, package/tooling churn, validation/preview execution, backend/docs/spec changes, stale audit-history mining, or protected secret/config reads were performed by this decision task.

## Evidence inspected for this decision

Primary reviewed artifacts:

- `architecture-audit/cycle-022-runtime-session-kernel-persistence-port-boundary/scope-check.md`
- `architecture-audit/cycle-022-runtime-session-kernel-persistence-port-boundary/proposals/proposal-direct.md`
- `architecture-audit/cycle-022-runtime-session-kernel-persistence-port-boundary/proposals/proposal-restructure.md`
- `architecture-audit/cycle-022-runtime-session-kernel-persistence-port-boundary/critique/round-01-critique-post-021-plan-correction.md`
- `architecture-audit/cycle-022-runtime-session-kernel-persistence-port-boundary/reviews/round-01-review-post-021-plan-correction.md`
- `architecture-audit/wave-plan.md` Wave 022 entry

Decision-stage hygiene evidence captured before writing this artifact:

- `.saivage/stages/cycle-022-decision-post-021-plan-correction/logs/path-scoped-status-and-diff.stdout`
- `.saivage/stages/cycle-022-decision-post-021-plan-correction/logs/path-scoped-status-and-diff.stderr`
- `.saivage/stages/cycle-022-decision-post-021-plan-correction/logs/wave022-section.stdout`
- `.saivage/stages/cycle-022-decision-post-021-plan-correction/logs/wave022-section.stderr`

The full workspace `git_status` is too large for the MCP status buffer in this repository. The decision therefore relies on path-scoped status/diff for the Wave 022 audit directory and the named app-shell/runtime/session/persistence files. That scoped evidence shows broad dirty/untracked audit and validation-log context already present around Cycle 022, including modified `decision.md`, validation preview stdout files, and untracked review/status artifacts. This decision does not normalize, revert, incorporate, or treat those adjacent artifacts as implementation scope.

## Rationale for selecting `proposal-direct.md`

The direct proposal is selected because it is the smallest reviewed change that advances the corrected Wave 022 target outcome:

1. It names a bounded project-session/runtime kernel instead of letting project-session use cases depend on the concrete `RuntimeSession` class.
2. It moves adapter-facing persistence target/source typing out of `RuntimeSession.ts`, allowing `ProjectSessionPersistenceAdapter.ts` to stop importing concrete runtime internals.
3. It keeps `ProjectService` as the adapter-private command-stream serializer/deserializer and avoids schema, replay, operation-registry, Drive/auth, or migration redesign.
4. It preserves `RuntimeSession` as the single owner of in-memory `World`, `CommandStack`, initialization, restore isolation, selection-delete wiring, view/read ports, and command-history port creation.
5. It deletes the old cross-import and concrete use-case dependency in the same implementation rather than preserving dual paths.
6. It does not pull leaf command producers, canvas/tool/construction/process-history seams, rendering/Three/canvas behavior, backend/docs/specs, package/tooling, or validation-platform work into this cycle.

`proposal-restructure.md` is rejected for current implementation because its higher-level options would overreach. A full persistence contract rewrite, generic command-kernel facade, or broad `RuntimeSession` decomposition would reopen concerns that the reviewed scope explicitly protects. If direct implementation hits one of the stop conditions below, the correct response is a reviewed delta/plan edit, not silent broadening.

## Bound Wave 022 implementation scope

The next implementation stage is authorized to change only the files and surfaces needed to implement the direct proposal.

### Production source in scope

- Add a small project-session kernel contract under `frontend/src/application/appShell/`, likely `ProjectSessionKernel.ts`.
- Add a small adapter-facing persistence target/source module under `frontend/src/application/appShell/`, likely `ProjectSessionPersistenceTargets.ts`.
- Modify `frontend/src/application/appShell/RuntimeSession.ts` to implement/import the new contracts and delete exported persistence-specific handle interfaces from this file.
- Modify `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts` so it imports adapter target/source types from the new module, not from `./RuntimeSession`.
- Modify `frontend/src/application/appShell/ProjectSessionUseCases.ts` so it depends on the project-session kernel interface rather than the concrete `RuntimeSession` class.
- Modify `frontend/src/application/appShell/AutoSaveUseCases.ts` only if reusing a snapshot-capable kernel subset is a net simplification and does not broaden autosave responsibilities.
- Modify `frontend/src/application/appShell/AppShellRuntime.ts` only for type alignment/wiring required by the selected kernel and target modules; no production browser composition redesign is authorized.
- Read `frontend/src/application/world/initializeWorld.ts` as needed to preserve command-backed initialization semantics. Change it only for import/type fallout directly required by the selected boundary; no semantic rewrite is authorized.
- Preserve `frontend/src/application/selectionDeletion/SelectionDeletionCommandService.ts` behavior and public API. Touch it only if a tiny type/wiring adjustment is unavoidable and reviewed boundary assertions still prove command construction remains in this service.

### Tests in scope

- `frontend/tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts`
- `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts`
- `frontend/tests/unit/application/selectionDeletion/SelectionDeletionCommandService.test.ts` only if runtime wiring or static selection-delete assertions are touched
- Focused `ProjectService` tests only if adapter typing changes require confirmation that serialization/restore behavior remains equivalent
- A new focused runtime-session/kernel unit test may be added if it replaces old fake-full-runtime fixtures and directly validates the new contract.

No e2e files may be deleted or broadly rewritten as part of this refactor. E2E/Playwright is validation for behavior preservation, not a target for structural cleanup in this wave.

## Required DELETE list

The implementation must delete the old surfaces; it must not keep compatibility wrappers, transitional overloads, or parallel old/new paths.

Delete or replace:

- `RuntimeSessionPersistenceSnapshotHandle` export from `RuntimeSession.ts`.
- `RuntimeSessionPersistenceRestoreHandle` export from `RuntimeSession.ts`.
- `ProjectSessionPersistenceAdapter.ts` import from `./RuntimeSession`.
- `ProjectSessionUseCases.ts` import/dependency on the concrete `RuntimeSession` class.
- Any duplicate autosave-only snapshot session shape if a shared snapshot-capable kernel subset covers it without adding restore/Drive/browser/history responsibilities to autosave.
- Test fakes/fixtures that require a full fake `RuntimeSession` when the use case only needs project-session kernel methods.
- Static assertions or fixtures that encode the old adapter-to-runtime import or raw persistence target exposure.

Do **not** delete in this wave:

- `ProjectData`, `ProjectService.serializeCommands`, `ProjectService.deserializeCommands`, `ProjectService.validateProjectData`, command snapshots, schema version checks, `OperationRegistry`, or command replay behavior.
- `createAppShellRuntime().internals` solely for cleanup.
- `SelectionDeletionCommandPort` or `SelectionDeletionCommandService`.
- Canvas/tool/construction/process-history command producer paths.
- Any backend/docs/specs/package/tooling file.
- Any e2e spec as a cleanup measure.
- Rendering/Three/canvas/overlay CSS files.

## RuntimeSession / session-kernel ownership rules

The project-session kernel must be narrow. It may expose only lifecycle, persistence, and version behavior needed by project-session and autosave flows, such as:

- initialize default world if needed;
- reset to an empty initialized world;
- clear session state;
- read version/dirty implications needed by autosave;
- snapshot current session through the app-shell persistence port;
- validate project data through the persistence port;
- restore a validated/opened project through the persistence port.

`RuntimeSession` remains the concrete owner of:

- the authoritative in-memory `World` and `CommandStack`;
- command-backed default initialization through existing `initializeWorld` behavior;
- reset/clear/restore lifecycle;
- isolated candidate restore before mutating active runtime state;
- command-history and read/presentation port creation already owned by runtime;
- selection-delete service wiring through the existing selection-delete port/service boundary.

The kernel must not become:

- a generic application kernel;
- a service locator;
- a broad `World`/`CommandStack` facade;
- a Drive/auth facade;
- a rendering selector host;
- a browser/runtime composition layer;
- a generic command-execution platform;
- an owner of leaf canvas/style/construction/process-history command producers.

## App-shell persistence/session port rules

`AppShellPorts.ts` must remain free of concrete `World`, `CommandStack`, and `ProjectData` imports for public app-shell persistence/session contracts.

`ProjectSessionPersistenceAdapter.ts` is the only app-shell module authorized to bridge to `ProjectService` in this wave. It may know about `ProjectService` and command-stream DTOs as adapter-private implementation detail, but it must no longer import `RuntimeSession.ts` to obtain persistence handle types.

`ProjectSessionUseCases.ts` and `AutoSaveUseCases.ts` must request snapshot/restore/save/open behavior through the selected kernel/persistence boundary. They must not pass raw `World`/`CommandStack` pairs to persistence.

## ProjectSessionUseCases / AutoSaveUseCases ownership

`ProjectSessionUseCases` owns user-facing project-session orchestration only: startup initialization/fallback, create/new/open/restore/sign-out flow sequencing, current/opened session metadata behavior, and invoking the session kernel/persistence port. It must not construct or mutate `World`/`CommandStack` directly and must not import concrete runtime internals.

`AutoSaveUseCases` owns autosave timing/status orchestration only. It may depend on a snapshot-capable kernel subset with `getVersion()` and `snapshot(...)` behavior. It must not know restore, initialization, Drive internals, browser storage, command history, or rendering details.

## initializeWorld command/history treatment

`initializeWorld` remains command-backed. Wave 022 must preserve the current initialization model: initialization creates default projection planes through command/history semantics, and undo/redo/startup/open/new behavior must remain user-visible equivalent. The implementation may make this ownership explicit through `RuntimeSession`; it must not redesign initialization operations, command descriptors, command replay, or history semantics.

## Selection-delete boundary preservation

The corrected Wave 021 boundary is protected. Delete/Backspace command construction remains in `SelectionDeletionCommandService` behind `SelectionDeletionCommandPort`. Wave 022 may preserve runtime wiring to that service, but it must not broaden the selection-delete public API, move delete command construction back into `SelectionUseCases`, or convert the service into a generic command executor.

## Direct command-producer deferrals

Direct command producers outside the project-session/persistence seam are deferred. The implementation must not migrate or redesign:

- canvas point movement/style command producers;
- construction/quick-tool command producers;
- process-history command producers;
- toolbar/history command producers beyond existing wiring preservation;
- active-plane or keyboard/history ports beyond type fallout directly required by selected scope.

Those are later wave candidates and must not be pulled into Wave 022 as a broad facade.

## 3D overlay / pointer-boundary preservation

Wave 022 is not a rendering, CSS, Three, canvas, or overlay wave. The implementation must not edit `App.vue`, `ThreeView.vue`, scene host behavior, OrbitControls, SVG drag behavior, or overlay CSS unless a reviewed delta explicitly broadens scope.

Validation must nevertheless preserve the known 3D overlay pointer contract: the overlay remains interactive, owns hit testing, and does not pass drag gestures through to the SVG canvas. The current UI contract e2e coverage cited by the scope check must remain part of the validation set when frontend/e2e validation runs.

## Protected out-of-scope surfaces

Forbidden without a reviewed delta/mini-cycle:

- persistence schema/version changes;
- command descriptor or replay redesign;
- `OperationRegistry` changes;
- migration/backcompat compatibility paths;
- Drive/auth internals or real credential behavior;
- browser production composition redesign from Wave 020;
- backend changes;
- docs/spec source changes;
- package scripts/tooling changes;
- validation-platform work;
- rendering, Three, SVG/canvas, overlay CSS, or UI feature behavior changes;
- broad test/e2e suite deletion or rewrite;
- command descriptor/replay, persistence schema, or backend/frontend contract work;
- stale audit-history mining;
- protected secret/config/env/provider file reads or logs.

## Source-control hygiene instructions

The implementation stage must begin by capturing path-scoped status and diff for the intended source/test files plus the Cycle 022 implementation artifact directory. Full repository status may be too large; path-scoped evidence is acceptable and required.

The current worktree contains broad unrelated dirty/untracked context and adjacent audit/validation noise. Implementation must:

- touch only files required by the selected Wave 022 scope;
- stage/commit only intentionally changed Wave 022 files;
- never revert, normalize, reformat, or incorporate unrelated dirty frontend files, unrelated e2e deletions, old audit noise, validation log noise, or `.saivage` plan/report noise;
- not switch branches, rebase, push, or recover discarded stale audit history;
- not read protected secret/config/env/provider files even if they appear in status output.

## Validation requirements for implementation

All validation stdout/stderr must be captured under:

`architecture-audit/cycle-022-runtime-session-kernel-persistence-port-boundary/validation/`

Minimum required evidence:

1. Pre-edit and post-edit path-scoped status/diff for Wave 022 source/test paths and protected dirty-path context.
2. Static scans proving:
   - `ProjectSessionPersistenceAdapter.ts` no longer imports `RuntimeSession.ts`;
   - `ProjectSessionUseCases.ts` no longer imports the concrete `RuntimeSession` class;
   - `AppShellPorts.ts` has no concrete `World`, `CommandStack`, or `ProjectData` imports for app-shell persistence contracts;
   - `ProjectService` imports remain isolated to `ProjectSessionPersistenceAdapter.ts` among app-shell modules;
   - selection-delete command construction remains in `SelectionDeletionCommandService`, not `SelectionUseCases`.
3. Focused Vitest for:
   - `frontend/tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts`;
   - `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts`;
   - `frontend/tests/unit/application/selectionDeletion/SelectionDeletionCommandService.test.ts` if runtime wiring or static assertions touch selection-delete;
   - focused `ProjectService` serialization/restore tests only if adapter typing changes require behavior confirmation.
4. Root and frontend `npm run lint` where scripts are defined.
5. Focused Vitest for touched modules and full root/frontend Vitest suites where defined.
6. Root and frontend `npm run build` where scripts are defined.
7. Root and frontend Playwright/e2e where scripts are defined because startup/open/new/save/autosave, Delete/Backspace, undo/redo, and overlay behavior are user-observable.
8. Live preview refresh on `0.0.0.0:5173`, HTTP reachability probe, and credential-free Playwright/live smoke for startup/new project, representative save/status behavior, Delete/Backspace + undo, and 3D overlay no-click-through.

Undefined commands may be skipped only with exact package-script evidence and an explicit implementation-log justification. Defined commands are mandatory.

## Stop conditions

Stop implementation and request a reviewed delta/plan edit if any of the following becomes necessary:

- changing `ProjectService` schema/replay/descriptor behavior or `OperationRegistry`;
- replacing command-stream persistence with a different domain/session snapshot contract;
- changing initialization command/history semantics;
- migrating canvas/tool/construction/process-history command producers;
- modifying Drive/auth, backend, docs/specs, package/tooling, validation platform, or UI feature behavior;
- changing rendering/Three/SVG/canvas/overlay pointer behavior;
- preserving dual raw-pair and kernel persistence paths rather than deleting the old seam;
- adding broad facades, compatibility overloads, or service-locator style APIs;
- changing unrelated dirty files to make tests pass;
- reading or logging protected secret/config/env/provider material.

## Residual risks accepted for implementation

- The new kernel can drift toward a god object if implementers add view, command-producer, browser, Drive, or rendering concerns. This decision accepts the risk only with the narrow ownership rules above.
- `ProjectSessionPersistenceAdapter` still targets a concrete command-stream `ProjectService`; deeper persistence-contract cleanup is deferred unless a reviewed future wave chooses it.
- Restore isolation and autosave status behavior are user-visible; even type-only refactors can regress them, so focused and e2e validation are mandatory.
- Existing raw runtime access for direct command producers and rendering-facing consumers remains architectural debt, but is intentionally deferred rather than smuggled into this wave.
- Broad dirty worktree/audit noise may confuse staging; path-scoped status/diff and file-specific commits are required.

## Next stage recommendation

Because the critic evidence is accepted under failure tolerance and `round-01-review-post-021-plan-correction.md` records no blocking issues, this decision authorizes the next unique implementation stage:

`cycle-022-implement-runtime-session-kernel-persistence-port-boundary-post-021-plan-correction`

If the decision-stage critic or reviewer finds this artifact failed to bind scope or introduced unreviewed broadening, route back to a decision correction stage before implementation. Otherwise, do not schedule additional proposal corrections/review for Wave 022 before implementation.
