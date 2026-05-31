# Cycle 030 Review — Round 02

## Inputs reviewed

- `architecture-audit/cycle-030-app-shell-persistence-dto-port-contract-cleanup/scope-check.md`
- `architecture-audit/cycle-030-app-shell-persistence-dto-port-contract-cleanup/proposals/proposal-direct.md`
- `architecture-audit/cycle-030-app-shell-persistence-dto-port-contract-cleanup/proposals/proposal-restructure.md`
- `architecture-audit/cycle-030-app-shell-persistence-dto-port-contract-cleanup/reviews/round-01-review.md`
- `architecture-audit/cycle-030-app-shell-persistence-dto-port-contract-cleanup/critique/corrections-round-01-critique.md`
- Current source/tests at the cited app-shell persistence seam:
  - `frontend/src/application/appShell/AppShellPorts.ts`
  - `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts`
  - `frontend/src/application/appShell/ProjectSessionKernel.ts`
  - `frontend/src/application/appShell/RuntimeSession.ts`
  - `frontend/src/application/appShell/ProjectSessionUseCases.ts`
  - `frontend/src/application/appShell/AutoSaveUseCases.ts`
  - `frontend/src/services/ProjectService.ts`
  - `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts`
  - `frontend/tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts`
- Path-scoped source-control evidence:
  - `architecture-audit/cycle-030-app-shell-persistence-dto-port-contract-cleanup/evidence/reviewer-path-status.log`
  - `architecture-audit/cycle-030-app-shell-persistence-dto-port-contract-cleanup/evidence/reviewer-path-diff.log`

No production source/test implementation was performed during this review.

## Round-01 blocker verification

**Resolved.** The direct proposal now makes the `DrivePort` boundary choice explicit and internally consistent:

- `DrivePort.createFile(...)` and `DrivePort.updateFile(...)` are in scope and must accept `ProjectSessionPersistencePayload`.
- `DrivePort.loadFile(...)` must remain / become `Promise<unknown>` until `ProjectService.validateProjectData(...)` validates the remote payload.

This rule is no longer implied or optional. It is stated in the target architecture, files-to-change list, risk section, validation plan, dedicated boundary-rule section, protected surfaces, and stop conditions of `proposal-direct.md`.

That corrected rule matches the currently cited source behavior:

- trusted create/update paths snapshot the current runtime session and pass it directly to `drive.createFile(...)` / `drive.updateFile(...)` from `ProjectSessionUseCases.ts` and `AutoSaveUseCases.ts`;
- the open path treats `drive.loadFile(...)` output as untrusted input that must pass through `validateProjectData(...)` before restore.

## Scope/protocol verification

- Current production source remains unchanged at the reviewed seam: `PersistedProjectSession`, `object` snapshot types, and adapter cast bridges still exist in source, which is expected because this stage is review-only.
- The corrected proposal did **not** broaden into `ProjectService` schema/replay semantics, command descriptor redesign, `OperationRegistry`, Drive/auth internals, backend/docs/specs/package-tooling, rendering/CSS/canvas/3D behavior, UI features, or app-shell production composition redesign.
- `RuntimeSession.restoreValidatedProject(...)` candidate-restore safety remains explicitly preserved in the proposal and still exists in current source.
- Path-scoped evidence remains clean for implementation files. The only scoped status noise shown is the untracked critique artifact directory already explained by the prior synthesized critique stage.
- Protected secret/config surfaces were not read.

## Proposal scoring against required criteria

### Proposal Direct — `proposals/proposal-direct.md`

1. **Advances the wave target outcome:** Pass. It directly deletes the cast-only marker/object seam and now fully specifies the save/load boundary rule.
2. **Improves architecture/code quality:** Pass. It removes nominal indirection and generic-object leakage at the public app-shell persistence seam with bounded, type-focused changes.
3. **Respects no-backcompat/aggressive deletion priorities:** Pass. It explicitly deletes `PersistedProjectSession`, `object` seam types, adapter double casts, and stale test assumptions rather than preserving dual paths.
4. **Avoids overfeaturism:** Pass. The correction tightened the contract without introducing a new abstraction layer or broadening into protected surfaces.
5. **Risks/regressions:** Acceptable. The remaining meaningful risk is only that implementation could discover unexpected Drive/auth-internal fallout; the proposal now handles that honestly with explicit stop conditions instead of silent scope creep.
6. **Validation sufficiency:** Pass. The planned static scans, focused app-shell tests, full lint/Vitest/build, Playwright/e2e, and preview/live-smoke checks remain sufficient for implementation review later.

### Proposal Restructure — `proposals/proposal-restructure.md`

1. **Advances the wave target outcome:** Pass.
2. **Improves architecture/code quality:** Mixed. It can keep DTO naming owned nearer the boundary, but only if kept as a tiny type-only contract alias.
3. **Respects no-backcompat/aggressive deletion priorities:** Pass.
4. **Avoids overfeaturism:** Borderline. It still adds a module that the direct path does not need unless review rejects the direct type import choice.
5. **Risks/regressions:** Higher than direct because it adds another ownership location that can drift if it stops being type-only.
6. **Validation sufficiency:** Pass.

## Decision recommendation

No blocking review issues remain.

Recommend proceeding to **`cycle-030-decision-app-shell-persistence-dto-port-contract-cleanup`** with **`proposal-direct.md` preferred**.

The restructure proposal remains an acceptable fallback only if the decision stage determines that `AppShellPorts.ts` must not import `ProjectService`'s DTO type name directly, even as a type-only dependency. Otherwise the direct proposal is the better bounded fit.

## Non-blocking notes

- Implementation must preserve candidate-restore behavior in `RuntimeSession.restoreValidatedProject(...)` exactly.
- Implementation must preserve Waves 024–029 protections, including current live preview / 3D overlay pointer behavior and no changes to `threePresentation` or canvas presentation surfaces.
- If implementation proves that tightening `DrivePort.createFile/updateFile` actually requires Drive/auth internals redesign or command/persistence schema redesign, stop and return for a reviewed delta rather than broadening ad hoc.

## Next-stage recommendation

Proceed to `cycle-030-decision-app-shell-persistence-dto-port-contract-cleanup`, recording that review round 02 cleared the corrected direct proposal with no remaining blockers.
