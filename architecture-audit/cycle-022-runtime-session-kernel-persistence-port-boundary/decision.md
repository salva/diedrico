# Cycle 022 Decision — Runtime session kernel and persistence port boundary

## Decision status

**Decision:** proceed to implementation.

**Selected implementation path:** `proposals/proposal-direct.md` — named app-shell runtime session with a narrow persistence port.

**Rejected alternative:** `proposals/proposal-restructure.md` is rejected for Cycle 022 implementation and retained only as a fallback concept if a future reviewed delta proves the direct session boundary cannot satisfy the wave without immediate god-object drift or hidden behavior regression.

**Review convergence:** complete. `reviews/round-02-review.md` records **NO BLOCKING ISSUES** after `corrections-round-01.md` addressed all round-01 blockers.

No source, test, package/tooling, backend, docs/spec source, protected config, env, provider, Drive credential, or secret material was changed by this decision stage.

## Evidence inspected before decision

Decision-stage source-control evidence was captured before writing this artifact:

- `.saivage/stages/cycle-022-decision/scoped-status-diff.stdout`
- `.saivage/stages/cycle-022-decision/scoped-status-diff.stderr`

Cycle 022 artifacts inspected:

- `architecture-audit/wave-plan.md` Wave 022 entry
- `scope-check.md`
- `proposals/proposal-direct.md`
- `proposals/proposal-restructure.md`
- `reviews/round-01-review.md`
- `corrections-round-01.md`
- `reviews/round-02-review.md`

The scoped status shows this cycle is operating amid unrelated dirty frontend source/test files and untracked audit/review/stage artifacts, including the current `.saivage/stages/cycle-022-decision/` directory and adjacent Cycle 022 evidence logs/reviews. The scoped diffstat shows adjacent frontend production/test changes outside this decision scope; they must not be reverted, reformatted, incorporated, or treated as implementation scope except where explicitly authorized by a later implementation task. No decision-stage source implementation was performed.

## Correction and review history

Round 01 blocked decision on three points:

1. The preferred direct proposal underspecified open/restore failure semantics.
2. The restructure proposal left too much discretion for keyboard/history, active-plane, selection, and broader platform scope creep.
3. Validation plans did not explicitly require failure-path coverage for invalid/corrupt payloads, restore failures, command-stack/world state after failed open, and autosave/session-boundary exceptions.

`corrections-round-01.md` corrected the proposals in place:

- `proposal-direct.md` now mandates **validation-before-destructive-reset / atomic restore** semantics for user-initiated open/restore through the new session boundary.
- `proposal-restructure.md` is now explicitly **non-preferred fallback only** and excludes keyboard/history migration, active-plane migration, selection migration, generic command execution, rendering, persistence schema/replay redesign, Drive/auth changes, and broad application-platform work unless a reviewed delta broadens scope.
- Both proposals now require focused validation for invalid/corrupt payloads, restore/deserialization failures, command-stack/world/session state after failed open, and autosave/session-boundary exception behavior.

Round 02 reviewed the corrected artifacts and recorded **NO BLOCKING ISSUES**. It recommends `proposal-direct.md` because it fixes the reviewed runtime/session and persistence-port seam with lower churn and lower abstraction risk than the fallback restructure path.

## Rationale for selecting `proposal-direct.md`

The direct proposal is selected because it best satisfies Wave 022's target outcome without unreviewed broadening:

- It introduces one named runtime session boundary at the existing app-shell composition point.
- It deletes the raw `{ world, commandStack }` persistence-port contract instead of wrapping it.
- It keeps `ProjectService` command-stream persistence as adapter-private infrastructure.
- It moves initialize/clear/snapshot/restore/version-observation behavior behind the session boundary while preserving current successful-flow behavior.
- It explicitly treats open/restore failure atomicity as part of the new session boundary, not as a schema/replay redesign.
- It avoids pulling leaf command producers, rendering, keyboard/history migration, active-plane migration, selection API redesign, backend, docs/spec, package/tooling, or Drive/auth internals into this wave.

`proposal-restructure.md` is rejected for implementation because it is broader than necessary for this cycle. Even after correction, it adds more abstraction and churn than the reviewed seam requires. It may be reconsidered only through a reviewed delta if implementation proves the direct boundary cannot remain narrow.

## Bound implementation scope

The next implementation stage must follow `proposal-direct.md` exactly and stay within these surfaces:

### Production files in scope

- `frontend/src/application/appShell/AppShellRuntime.ts`
- `frontend/src/application/appShell/AppShellPorts.ts`
- `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts`
- `frontend/src/application/appShell/ProjectSessionUseCases.ts`
- `frontend/src/application/appShell/AutoSaveUseCases.ts`
- a new focused runtime-session module under `frontend/src/application/appShell/`, likely `RuntimeSession.ts` or `ProjectSessionKernel.ts`
- `frontend/src/application/world/initializeWorld.ts` only for import/export adjustments needed by the session boundary; no semantic rewrite is expected
- `frontend/src/application/selectionDeletion/SelectionDeletionCommandService.ts` only if construction-site accessors require a narrow wiring adjustment; no public API or behavior redesign is expected

### Test files in scope

- `frontend/tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts`
- `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts`
- a new focused runtime-session test file if useful, e.g. `frontend/tests/unit/application/appShell/RuntimeSession.test.ts`

Additional tests may be touched only when directly required to replace assertions for the deleted raw-pair app-shell persistence contract or to cover the mandatory failure-path semantics below.

## Required DELETE list

The implementation must delete, not wrap or preserve, the following legacy surfaces:

- `ProjectSessionPersistencePort.snapshotCurrentSession(deps: { commandStack: CommandStack; world: World; projectName: string }): ProjectData`.
- `ProjectSessionPersistencePort.restoreSession(data: ProjectData, deps: { world: World; commandStack: CommandStack }): void`.
- App-shell port imports of `CommandStack`, `World`, and `ProjectData` where they only exist to expose persistence/session contracts.
- Direct `ProjectSessionUseCases` dependencies/imports on `CommandStack`, `World`, `ProjectData`, and `initializeWorld` where replaced by session methods.
- Direct `AutoSaveUseCases` dependencies/imports on `CommandStack` and `World` where replaced by session methods.
- Tests/fakes that assert persistence receives raw concrete kernel objects or that app-shell ports expose `ProjectData`.
- Transitional overloads, compatibility wrappers, adapter shims, or dual paths that allow old raw-pair persistence and the new runtime-session boundary to coexist.

## Runtime session/kernel ownership rules

The selected runtime session boundary must own only:

- current `World` and `CommandStack` lifecycle;
- default-world initialization through existing command-backed `initializeWorld` behavior;
- clear/reset/new-session behavior;
- validation-before-destructive open/restore orchestration;
- snapshot requests for current project state;
- restore requests for validated project data;
- dirty/version implications needed by project-session and autosave use cases;
- narrow named accessors for current consumers that still legitimately need raw runtime objects in this wave, such as active-plane, keyboard undo/redo, canvas integration, and `SelectionDeletionCommandService` wiring.

The session must not become a generic application kernel, service locator, event bus, rendering selector host, Drive/auth facade, command-execution platform, or owner of leaf canvas/style/construction/process-history command producers.

## Narrow persistence port rules

`AppShellPorts.ts` and app-shell use cases must stop exposing concrete `World`, `CommandStack`, and `ProjectData` as the app-shell persistence/session contract. `ProjectSessionPersistenceAdapter.ts` remains the allowed bridge to `ProjectService` and may remain aware of current command-stream DTOs and concrete runtime objects only as adapter-private implementation detail or through the reviewed session owner.

`ProjectService` schema version, command snapshots, operation descriptors, `OperationRegistry`, replay algorithm, migration behavior, and Drive/auth behavior are not implementation scope. If hiding `ProjectService` behind the session boundary requires changing any of those internals, implementation must stop and request a reviewed delta.

## Atomic open/restore semantics

The implementation must use **validation-before-destructive-reset / atomic restore** semantics for user-initiated open/restore through the new session boundary.

Required invariant: if validation fails, deserialization throws, or restore cannot complete, then the pre-open active session remains intact, including:

- active `World` contents and next element id;
- `CommandStack` committed/undo/redo state and undo/redo behavior;
- projection planes and active-plane fallback state;
- selected/current project metadata;
- dirty/version state;
- autosave eligibility and future autosave behavior.

Valid successful restore behavior should remain equivalent to current behavior, including projection-plane fallback initialization and dirty marking after a valid project opens. Atomicity must be implemented at the session boundary, for example by validating before clearing the active session and restoring into an isolated/new runtime pair if needed. It must not be implemented by redesigning `ProjectService` schema/replay or by adding compatibility paths.

## Failure-path validation requirements

Focused validation must explicitly prove:

- invalid/corrupt project payloads do not clear or partially replace the active session;
- restore/deserialization failures do not leave a half-cleared or half-restored active session;
- command-stack/world state after failed open is equivalent to the pre-open snapshot, including committed command count, undo/redo behavior, projection planes, selected/current project identity, and next element id where currently observable;
- autosave/session-boundary exceptions propagate or surface through existing save-status/error paths without marking the session clean, disabling future autosave, or overwriting the active remote/local project with invalid data.

## Forbidden repairs and protected out-of-scope surfaces

The implementation stage must not perform any of the following without a reviewed delta/mini-cycle:

- modify `ProjectService` schema version, command snapshot shape, operation descriptors, `OperationRegistry`, replay semantics, or migration/backcompat behavior;
- introduce generic command execution or migrate canvas movement/style/construction/process-history/toolbar command producers;
- migrate `KeyboardShortcutRouter` undo/redo/history access into a new history port;
- migrate active-plane use cases or selection use cases into kernel ports beyond construction-site preservation needed by the direct session boundary;
- change `SelectionDeletionCommandService` public behavior or turn it into a generic command executor;
- rework rendering selectors, Three view, canvas presentation, domain realization contracts, backend, docs/spec source, package scripts/tooling, validation architecture, debug placeholders, Drive/auth internals, or real credential behavior;
- read, log, paste, copy, or include protected config/env/provider/secret contents.

If any forbidden repair appears necessary to satisfy the selected proposal, implementation must stop and request a reviewed delta instead of broadening discretionarily.

## Source-control hygiene instructions

The implementation stage must begin with path-scoped status/diff evidence for its intended source/test paths and the Cycle 022 implementation artifact directory. Existing unrelated dirty or untracked audit/stage/log files must not be reverted, reformatted, staged, incorporated, or used as source authority unless directly authorized by the implementation task.

Commit only the files intentionally changed by the implementation. Do not switch branches, rebase, push, or mine discarded stale audit history.

## Validation and log requirements

All implementation validation stdout/stderr must be captured to stable files under:

`architecture-audit/cycle-022-runtime-session-kernel-persistence-port-boundary/validation/`

The implementation log must record source files changed, legacy surfaces deleted, commands run with log paths, residual risks, preview refresh/probe evidence, and any newly observed architectural issues for future waves.

Minimum required validation:

1. Pre-edit scoped `git status`/`git diff --stat` for touched paths.
2. Static scans for `World`, `CommandStack`, `ProjectData`, `ProjectService`, `snapshotCurrentSession`, `restoreSession`, and `initializeWorld` in app-shell files.
3. Focused Vitest for app-shell runtime/session/persistence tests, including the mandatory failure-path tests listed above.
4. Architecture/static boundary checks proving:
   - `AppShellPorts.ts` no longer imports `World`, `CommandStack`, or `ProjectData` for app-shell persistence contracts;
   - `ProjectSessionUseCases.ts` and `AutoSaveUseCases.ts` no longer pass raw world/command-stack pairs to persistence;
   - `ProjectSessionPersistenceAdapter.ts` remains the only app-shell `ProjectService` import.
5. `npm run lint` at the repository root and in every workspace where defined, including `frontend` if defined.
6. Focused Vitest for touched modules and the full root/frontend Vitest suite where defined.
7. `npm run build` at the repository root and in every workspace where defined, including `frontend` if defined.
8. Playwright/e2e at the repository root and in every workspace where defined because startup/open/new/save/autosave and keyboard/delete behavior are user-observable.
9. Refresh the live preview bound to `0.0.0.0:5173`, capture an HTTP 200 reachability probe, and run Playwright/live smoke for startup/new project plus representative save/status and delete/undo behavior without real Drive credentials.

Undefined commands may be skipped only with exact package-script evidence and an explicit implementation-log justification. Defined commands are mandatory.

## Stop conditions

Stop implementation and request a reviewed delta if:

- atomic open/restore cannot be achieved at the session boundary without modifying persistence schema/replay/descriptor internals;
- the runtime session begins absorbing leaf command producers, rendering, Drive/auth, browser globals, or broad platform concerns;
- preserving behavior requires compatibility overloads or parallel raw-pair and session-boundary persistence paths;
- focused failure-path tests reveal a deeper `ProjectService`, command-stack, or world-cloning contract problem outside the selected scope;
- any protected secret/config/env/provider file would need to be read or logged;
- unrelated dirty files must be changed to make the implementation pass.

## Residual risks accepted for implementation

- The runtime session could become too broad if implementers use it as a general app kernel. This decision accepts the risk only with the ownership limits above.
- Atomic restore may be subtle because current `ProjectService.deserializeCommands` mutates supplied runtime objects. Implementation should isolate restore work at the session boundary and stop if deeper replay/schema changes become necessary.
- Autosave timing and save-status behavior are user-visible and require fake-scheduler/unit tests plus e2e/live smoke.
- Current consumers may still require named raw-object accessors after this wave. Those accessors are acceptable only for existing reviewed consumers and must not undermine the narrowed persistence/use-case port boundary.

## Next stage recommendation

Because review convergence is complete and `reviews/round-02-review.md` records **NO BLOCKING ISSUES**, proceed to:

`cycle-022-implement-runtime-session-kernel-persistence-port-boundary`

Do not schedule additional corrections/review before implementation unless the reviewer for this decision artifact finds that this decision failed to bind the reviewed scope or introduced unreviewed broadening.
