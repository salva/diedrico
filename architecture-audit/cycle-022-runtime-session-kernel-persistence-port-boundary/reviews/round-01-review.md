# Cycle 022 Review Round 01 — Runtime session kernel and persistence port boundary

**Decision:** BLOCKING ISSUES

## Review scope and evidence checked

Reviewed:

- `architecture-audit/cycle-022-runtime-session-kernel-persistence-port-boundary/scope-check.md`
- `architecture-audit/cycle-022-runtime-session-kernel-persistence-port-boundary/proposals/proposal-direct.md`
- `architecture-audit/cycle-022-runtime-session-kernel-persistence-port-boundary/proposals/proposal-restructure.md`
- `architecture-audit/cycle-022-wave-plan-extension/plan-extension-note.md`
- `architecture-audit/wave-plan.md` (Wave 022 entry)
- `frontend/src/application/appShell/AppShellRuntime.ts`
- `frontend/src/application/appShell/AppShellPorts.ts`
- `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts`
- `frontend/src/application/appShell/ProjectSessionUseCases.ts`
- `frontend/src/application/appShell/AutoSaveUseCases.ts`
- `frontend/src/application/appShell/KeyboardShortcutRouter.ts`
- `frontend/src/application/appShell/ActivePlaneUseCases.ts`
- `frontend/src/application/selectionDeletion/SelectionDeletionCommandService.ts`
- `frontend/src/services/ProjectService.ts`
- `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts`
- `frontend/tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts`
- scoped source-control evidence in `review-scoped-status.stdout` / `review-scoped-diffstat.stdout`

No implementation/source refactor was performed during review.

## Source-control reconciliation and protected scope check

- Scoped status confirms this review is operating in a dirty workspace with multiple untracked audit/log artifacts adjacent to Cycle 022 and the wave-plan-extension stage (`review-scoped-status.stdout`). Those files are evidence/log churn only; no production-source diff is present in the scoped diffstat (`review-scoped-diffstat.stdout` is empty).
- This satisfies the requirement to inspect current source-control state first and confirms implementation has not started.
- The proposals remain properly bounded away from backend, docs/spec sources, package/tooling churn, schema/replay redesign, broad command-kernel migration, and Drive/auth internals. That boundary matches both the scope check and current source evidence in `AppShellRuntime.ts`, `AppShellPorts.ts`, `ProjectSessionUseCases.ts`, `AutoSaveUseCases.ts`, `ProjectSessionPersistenceAdapter.ts`, and `ProjectService.ts`.

## Current architectural seam verified

The scoped source still shows the exact Wave 022 smell the scout identified:

- `createAppShellRuntime` constructs `World` and `CommandStack` directly and wires them into multiple app-shell services (`frontend/src/application/appShell/AppShellRuntime.ts`).
- `ProjectSessionPersistencePort` leaks `World`, `CommandStack`, and `ProjectData` into app-shell contracts (`frontend/src/application/appShell/AppShellPorts.ts`).
- `ProjectSessionUseCases` directly orchestrates `world.clear()`, `commandStack.clear()`, `initializeWorld(...)`, `world.markDirty()`, projection-plane fallback checks, and raw persistence calls (`frontend/src/application/appShell/ProjectSessionUseCases.ts`).
- `AutoSaveUseCases` directly depends on `world.getVersion()` and raw-pair persistence snapshots (`frontend/src/application/appShell/AutoSaveUseCases.ts`).
- `ProjectSessionPersistenceAdapter` is already the right bridge point for `ProjectService`, but it currently mirrors the leaked raw shape (`frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts`).

That means the stage is correctly aimed at runtime session ownership and persistence-port narrowing, not broader persistence redesign.

## Proposal scoring

### Proposal A — `proposal-direct.md`

1. **Advances the wave target outcome:** **Strong pass**
   - It directly addresses the scoped defect by introducing one named runtime-session boundary at the existing composition root while preserving `ProjectService` as adapter-private infrastructure.
   - It explicitly moves initialize/clear/snapshot/restore/version behavior behind the session boundary and removes app-shell use-case imports of `World`, `CommandStack`, `ProjectData`, and `initializeWorld`.

2. **Improves architecture and code quality:** **Pass with one needed correction**
   - Good: narrows the app-shell persistence contract, localizes runtime session behavior, and keeps `ProjectService` behind the adapter.
   - Concern: the proposal currently leaves the runtime boundary too underspecified around restore/open failure atomicity. `openProject()` today clears the world before validation/restore (`ProjectSessionUseCases.ts`), so a bad file can leave the session partially cleared. The proposal mentions this nuance only as a scout note, not as an explicit implementation decision or test obligation.

3. **Respects no-backcompat / aggressive deletion priorities:** **Pass**
   - It explicitly deletes the raw `snapshotCurrentSession({ world, commandStack, ... })` / `restoreSession(data, { world, commandStack })` contract and rejects transitional overloads.
   - This aligns with the project priority to remove internal shims instead of preserving dual paths.

4. **Avoids overfeaturism:** **Pass**
   - It keeps the change centered on app-shell runtime/session and persistence seams.
   - It does not attempt schema, replay, backend, rendering, or leaf-command migration.

5. **Risks / hidden regressions:** **Mixed; blocker until corrected**
   - Positive: it names god-object, schema-creep, initialization-history, and autosave risks.
   - Blocking gap: it does not explicitly constrain or test the semantics of open/restore failure handling, including the current pre-validation `world.clear()` behavior and command-stack state after invalid/corrupt file loads. Since this wave centralizes restore ownership, failing to specify whether the new session API preserves or improves atomicity invites silent behavior drift in a user-observable flow.

6. **Validation sufficiency:** **Almost sufficient, but incomplete**
   - Strong on focused/unit/static boundary checks and full lint/test/build/e2e cadence.
   - Missing explicit focused assertions for invalid-project-data / failed-restore behavior after session-boundary extraction, even though `ProjectSessionUseCases.openProject()` and `ProjectSessionPersistenceAdapter.assertProjectData()` make that flow central to the refactor.

### Proposal B — `proposal-restructure.md`

1. **Advances the wave target outcome:** **Partial pass**
   - It would solve the target seam, but at a broader abstraction level than the wave requires.

2. **Improves architecture and code quality:** **Mixed**
   - Potential upside: cleaner long-term ownership if a session kernel eventually becomes a reusable central abstraction.
   - Current downside: it spreads Wave 022 across a new `sessionKernel/` area and optional keyboard/active-plane/selection touches before the review has shown those extra moves are necessary now.

3. **Respects no-backcompat / aggressive deletion priorities:** **Pass**
   - It also deletes the raw-pair persistence boundary and rejects compatibility layers.

4. **Avoids overfeaturism:** **Fail**
   - The proposal itself introduces optional migration of `KeyboardShortcutRouter`, `ActivePlaneUseCases`, and selection-related wiring. That is exactly the kind of “one conceptual layer higher” spread that this wave should avoid unless the direct path is proven insufficient.
   - Current source does not justify pulling keyboard/history or active-plane read concerns into the same wave; `KeyboardShortcutRouter.ts` still legitimately uses `CommandStack` directly for undo/redo and does not participate in persistence translation.

5. **Risks / hidden regressions:** **High risk**
   - The optional nature of keyboard/active-plane/selection changes makes the stop condition fuzzy and increases the chance of scope creep or a pseudo-platform abstraction that the project explicitly wants to avoid.

6. **Validation sufficiency:** **Adequate but too broad for the scope**
   - The validation plan is acceptable in isolation, but it corresponds to a larger implementation blast radius than is justified for this wave.

## Runtime session kernel ownership assessment

A named runtime session owner is warranted now. The current app shell is still the implicit owner of:

- runtime object construction (`AppShellRuntime.ts`)
- default-world initialization (`ProjectSessionUseCases.ts` + `initializeWorld.ts`)
- session reset/clear/new/open flows (`ProjectSessionUseCases.ts`)
- autosave version observation and snapshotting (`AutoSaveUseCases.ts`)
- persistence translation boundary (`AppShellPorts.ts` + `ProjectSessionPersistenceAdapter.ts`)

That ownership should become explicit in Wave 022, but it should remain **narrow**. The direct proposal’s session wrapper/kernel is enough if it owns only lifecycle + persistence-facing session operations and leaves keyboard routing, active-plane projection reads, rendering, and leaf command production out of scope.

## Persistence port narrowing assessment

The proposals are correct that `AppShellPorts.ts` must stop exposing:

- `CommandStack`
- `World`
- `ProjectData`

through `ProjectSessionPersistencePort`.

`ProjectSessionPersistenceAdapter.ts` is already the correct place to remain aware of `ProjectService` and the current command-stream DTO. No evidence reviewed here justifies broad persistence/schema/replay/registry redesign in this cycle.

## Stop conditions for broader redesign

The scout’s stop conditions are appropriate and should be kept:

- no schema/version/descriptor/replay changes in `ProjectService.ts`
- no generic command executor / broad command-kernel migration
- no Drive/auth contract redesign
- no backend/docs/package/tooling/rendering expansion

Additionally, review requires one more stop condition in the proposal text: **do not broaden into keyboard/history or active-plane/session read-port migration unless the direct session boundary cannot satisfy current app-shell constructor dependencies without altering user-visible behavior.**

## Blocking issues requiring corrections before decision

1. **Open/restore failure semantics are underspecified in the preferred direct proposal.**
   - Current code clears the world before validating/restoring loaded data (`ProjectSessionUseCases.ts`), and the wave will centralize that behavior behind the new session boundary.
   - The proposal must explicitly choose and document one of two behaviors: preserve current clear-then-validate semantics exactly, or improve to validation-before-destructive-reset / atomic restore. Either choice must be paired with focused tests for invalid data and restore failure paths.
   - Without this, the implementation could silently change a user-observable error path while claiming “no intended user-visible behavior change.”

2. **The restructure proposal is too broad to be decision-ready as written.**
   - It must either be narrowed to remove optional keyboard/active-plane/selection migration language, or be marked non-preferred/rejected in favor of the direct proposal. As written, it leaves too much discretion for scope creep inside implementation.

3. **Validation plans must explicitly include failure-path coverage for the new session boundary.**
   - The current review requires focused tests for invalid/corrupt project loads, restore failures, and autosave behavior when snapshot/restore boundaries throw, not just happy-path startup/create/open/new/sign-out/autosave flows.

## Recommendation

- **Preferred path after corrections:** `proposal-direct.md`
- **Not recommended as written:** `proposal-restructure.md`

After the above corrections are made in-place, run `cycle-022-review-round-02`. Do **not** proceed directly to decision yet.
