# Cycle 030 Review — Round 01

## Inputs reviewed

- `architecture-audit/cycle-030-app-shell-persistence-dto-port-contract-cleanup/scope-check.md`
- `architecture-audit/cycle-030-app-shell-persistence-dto-port-contract-cleanup/proposals/proposal-direct.md`
- `architecture-audit/cycle-030-app-shell-persistence-dto-port-contract-cleanup/proposals/proposal-restructure.md`
- `architecture-audit/cycle-030-app-shell-persistence-dto-port-contract-cleanup/critique/round-01-critique.md`
- `architecture-audit/cycle-030-wave-plan-extension/plan-extension-rationale.md`
- Current source/tests at the cited app-shell persistence seam:
  - `frontend/src/application/appShell/AppShellPorts.ts`
  - `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts`
  - `frontend/src/application/appShell/ProjectSessionKernel.ts`
  - `frontend/src/application/appShell/ProjectSessionUseCases.ts`
  - `frontend/src/application/appShell/AutoSaveUseCases.ts`
  - `frontend/src/services/ProjectService.ts`
  - `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts`
  - `frontend/tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts`
- Path-scoped source-control evidence:
  - `architecture-audit/cycle-030-app-shell-persistence-dto-port-contract-cleanup/evidence/reviewer-path-status.log`
  - `architecture-audit/cycle-030-app-shell-persistence-dto-port-contract-cleanup/evidence/reviewer-path-diff.log`

No production source/test implementation was performed during this review.

## Source/protocol verification

- The current seam exists as described: `PersistedProjectSession` is only a nominal marker in `AppShellPorts.ts`; `snapshotCurrentSession(...)`, `ProjectSessionKernel.snapshot(...)`, and `RuntimeSession.snapshot(...)` erase the payload as `object`; and the adapter converts between `ProjectData` and the marker with `unknown` double casts.
- `ProjectService.validateProjectData(data)` already asserts the concrete current schema, and `deserializeCommands(...)` already owns replay/restore behavior. Nothing in the reviewed evidence shows that Wave 030 must redesign command descriptors, replay semantics, or schema migration before removing the app-shell cast seam.
- `AppShellBoundary.test.ts` currently hard-codes the old architectural rule by expecting `PersistedProjectSession` and forbidding any `ProjectService` import in app-shell ports. `AppShellRuntimeUseCases.test.ts` currently encodes the weak seam with `data: any` and `payload: data as never` mocks.
- Path-scoped git diff for the reviewed implementation files is empty. The only scoped status noise shown here is the untracked critique directory/artifact, which matches the stage’s design-only history.
- Critic protocol evidence is acceptable: `critique/round-01-critique.md` explicitly records two failed critic dispatches and is correctly marked `synthesized_by: manager` / `reason: critic_dispatch_unavailable`, which satisfies the project’s failure-tolerance rule.

## Proposal scoring against required criteria

### Proposal Direct — `proposals/proposal-direct.md`

1. **Advances the wave target outcome:** Pass. It directly removes the cast-only marker/object seam at the app-shell persistence boundary.
2. **Improves architecture/code quality:** Pass. It deletes nominal indirection and stale test guards with the smallest bounded change.
3. **Respects no-backcompat/aggressive deletion priorities:** Pass. It explicitly deletes the marker, object seam, double casts, and stale mocks instead of preserving dual paths.
4. **Avoids overfeaturism:** Pass with caution. It stays bounded if it keeps `ProjectService` as validation/serialization owner and does not broaden into Drive/auth or command-descriptor redesign.
5. **Risks/regressions:** Acceptable. Main risk is architectural leakage if `AppShellPorts.ts` starts depending on a service-module type name without clearly redefining the boundary rule.
6. **Validation sufficiency:** Pass. The proposed static scans, focused tests, full lint/Vitest/build, Playwright/e2e, and preview checks are sufficient.

### Proposal Restructure — `proposals/proposal-restructure.md`

1. **Advances the wave target outcome:** Pass. It also removes the cast seam.
2. **Improves architecture/code quality:** Mixed. It can keep the boundary name owned nearer the app-shell, but only if kept as a tiny type-only alias.
3. **Respects no-backcompat/aggressive deletion priorities:** Pass. It still deletes the old marker/object/double-cast path.
4. **Avoids overfeaturism:** Borderline. Adding a new contract module for what may be a single alias risks unnecessary layering if direct import is already acceptable.
5. **Risks/regressions:** Higher than direct. The extra module can create duplicate ownership or drift if it stops being a pure alias.
6. **Validation sufficiency:** Pass. The added architecture check is appropriate if this path is chosen.

## Decision recommendation

Prefer **`proposal-direct.md`** for the decision stage. It is the smallest honest deletion of the seam and best matches Wave 030’s bounded goal.

The restructure proposal should remain only as a fallback if the implementation/review team concludes that a type-only `ProjectData` import in `AppShellPorts.ts` is an unacceptable boundary choice. If that fallback is used, the added module must stay type-only and must not duplicate schema ownership or runtime validation logic.

## Blocking issues

### 1. Direct proposal is underspecified about the `DrivePort` contract choice, which can cause implementation churn or an accidental half-tightened public boundary.

The direct proposal says to “consider” tightening `DrivePort.createFile/updateFile` to the typed payload if propagation is easy, but it does not make a decision rule for the implementation stage. `AppShellPorts.ts` currently defines all three Drive payload methods around `object`, while the wave’s stated target is the app-shell persistence DTO seam. Leaving `createFile/updateFile` ambiguous risks either overreach into Drive/auth typing or a partial cleanup that leaves the public app-shell save path generically typed.

**Required correction:** revise the selected proposal in place to state one explicit implementation rule for `DrivePort`: either (a) `createFile/updateFile` are in-scope and must be retyped to the same payload while `loadFile` stays `unknown`, or (b) all `DrivePort` payload shapes remain unchanged in Wave 030 and the typed payload cleanup stops at session/persistence ports only, with the residual documented. The decision stage should not have to invent this boundary.

## Non-blocking notes

- Preserve `RuntimeSession.restoreValidatedProject(...)` candidate-restore behavior exactly.
- Preserve Waves 024–029 protections, including current 3D overlay pointer behavior and no changes to 3D/canvas presentation files.
- If implementation evidence shows command descriptor/schema work is actually required to remove the seam, stop and send the cycle back through a reviewed plan/proposal correction rather than broadening implementation ad hoc.

## Next-stage recommendation

Do **not** proceed directly to decision yet. Run `cycle-030-corrections-round-01-app-shell-persistence-dto-port-contract-cleanup` to update the chosen proposal with an explicit `DrivePort` boundary rule, then re-run `cycle-030-review-round-02-app-shell-persistence-dto-port-contract-cleanup`.
