# Cycle 022 Review Round 01 — Runtime session kernel / persistence port boundary

## Artifacts reviewed

- `architecture-audit/cycle-022-runtime-session-kernel-persistence-port-boundary/scope-check.md`
- `architecture-audit/cycle-022-runtime-session-kernel-persistence-port-boundary/proposals/proposal-direct.md`
- `architecture-audit/cycle-022-runtime-session-kernel-persistence-port-boundary/proposals/proposal-restructure.md`
- `architecture-audit/cycle-022-runtime-session-kernel-persistence-port-boundary/critique/round-01-critique-post-021-plan-correction.md`
- `architecture-audit/wave-plan.md` Wave 022 entry
- `frontend/src/application/appShell/AppShellPorts.ts`
- `frontend/src/application/appShell/RuntimeSession.ts`
- `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts`
- `frontend/src/application/appShell/ProjectSessionUseCases.ts`
- `frontend/src/application/appShell/AutoSaveUseCases.ts`
- `frontend/src/application/world/initializeWorld.ts`
- `frontend/src/services/ProjectService.ts`
- `frontend/src/application/selectionDeletion/SelectionDeletionCommandService.ts`
- `frontend/tests/e2e/current-ui-contract.spec.ts`
- path-scoped status at `architecture-audit/cycle-022-runtime-session-kernel-persistence-port-boundary/reviews/reviewer-scoped-status.stdout`

## Source-control and scope hygiene

Path-scoped status confirms this review stage did not require production-source edits. The tree does contain unrelated/manager-owned audit churn in the Wave 022 directory, including an already-modified `decision.md` and validation logs, plus untracked review/status artifacts. Those files are outside the implementation decision itself and should not be treated as Wave 022 source implementation evidence.

I did not read protected secret/config contents. Review stayed within the scoped audit artifacts and application files named in the assignment.

## Critic / design-loop evidence

Critic evidence exists at `critique/round-01-critique-post-021-plan-correction.md` and is protocol-compliant as a synthesized critique:

- `synthesized_by: manager`
- `reason: critic_dispatch_unavailable`

That satisfies the failure-tolerance rule for this design stage. No blocker here.

## Current-source premise check

The current source still contains the exact bounded seam the wave claims:

- `ProjectSessionPersistenceAdapter.ts` imports persistence handle types from `RuntimeSession.ts` (`frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts:1-3`).
- `ProjectSessionUseCases.ts` depends on the concrete `RuntimeSession` class (`frontend/src/application/appShell/ProjectSessionUseCases.ts:3-10`).
- `RuntimeSession.ts` exports persistence-specific handle extensions carrying raw `CommandStack` and `World` (`frontend/src/application/appShell/RuntimeSession.ts:22-29`, `frontend/src/application/appShell/RuntimeSession.ts:246-257`).
- `AppShellPorts.ts` already keeps the public persistence port relatively narrow and free of `World`, `CommandStack`, and `ProjectData` imports (`frontend/src/application/appShell/AppShellPorts.ts:52-64`).
- `ProjectService.ts` still correctly owns schema validation, command serialization, and replay internals (`frontend/src/services/ProjectService.ts:23-78`).

So the Wave 022 premise remains valid as a bounded runtime/session/persistence-boundary cleanup, not a fresh plan-correction candidate.

## Proposal scoring

### proposal-direct.md

1. **Advances the wave target outcome:** **Pass.** It directly removes the adapter-to-runtime type seam and narrows `ProjectSessionUseCases` to a named project-session kernel.
2. **Improves architecture/code quality:** **Pass.** It replaces concrete class and concrete handle coupling with smaller contracts while keeping runtime ownership centralized.
3. **Respects no-backcompat / aggressive deletion:** **Pass.** It explicitly deletes `RuntimeSession` persistence handle exports/imports and avoids parallel old/new paths.
4. **Avoids overfeaturism:** **Pass.** It stays out of schema/replay, Drive/auth, rendering, app-shell composition redesign, and leaf command-producer migration.
5. **Risks / hidden regressions:** **Pass with ordinary implementation risk.** The proposal correctly highlights restore isolation, autosave status, and hidden behavior drift as the main risks and keeps mitigations focused.
6. **Validation sufficiency:** **Pass.** The proposed matrix includes static boundary checks, focused Vitest, full lint/test/build, Playwright/e2e, preview refresh, and explicit 3D overlay protection.

### proposal-restructure.md

1. **Advances the wave target outcome:** **Partial pass.** It usefully tests whether the wave should broaden, but its main conclusion is to reject broadening now.
2. **Improves architecture/code quality:** **Pass as decision support, not as implementation choice.** It correctly identifies that a higher-level rewrite should be split into future waves if ever needed.
3. **Respects no-backcompat / aggressive deletion:** **Pass.** It does not argue for preserving legacy dual paths.
4. **Avoids overfeaturism:** **Strong pass.** Its main value is preventing Wave 022 from expanding into persistence-schema or command-kernel redesign.
5. **Risks / hidden regressions:** **Pass.** It accurately identifies the regression surface of choosing restructure now.
6. **Validation sufficiency:** **Pass for its purpose.** It correctly shows that a true restructure would require a much broader validation matrix, which is evidence against choosing it now.

## Required boundary-preservation checks

- **Wave 020 app-shell composition preservation:** Satisfied in the proposals. Nothing proposes reopening production browser/runtime composition, keyboard target injection, Drive wiring, or environment defaults.
- **Corrected Wave 021 selection-delete boundary preservation:** Satisfied. Current source still keeps deletion command creation in `SelectionDeletionCommandService` (`frontend/src/application/selectionDeletion/SelectionDeletionCommandService.ts:29-36`), with runtime wiring through `selectionDeletionCommandPort()` (`frontend/src/application/appShell/RuntimeSession.ts:170-172`).
- **3D overlay pointer-boundary fix preservation:** Satisfied. The proposals keep rendering/CSS out of scope and require validation of the current UI contract e2e protection (`frontend/tests/e2e/current-ui-contract.spec.ts:89-117`).
- **initializeWorld command/history ownership:** Satisfied. Proposals preserve command-backed initialization and do not redesign world initialization semantics (`frontend/src/application/world/initializeWorld.ts:18-35`).
- **Protected surfaces remain out of scope:** Satisfied in both proposals.

## Findings

No blocking issues found in the round-01 proposal set.

## Decision guidance

Recommend proceeding to `cycle-022-decision-post-021-plan-correction` and selecting **`proposal-direct.md`** as the implementation candidate.

Decision considerations:

- Keep the extracted kernel intentionally small; do not let it absorb read ports, command producers, browser concerns, or Drive concerns.
- Delete the old `RuntimeSession` persistence-handle exports in the same change that introduces the new contract module.
- Preserve `ProjectService` as the adapter-private serializer/deserializer boundary for this wave.
- Treat any discovered need to change schema/replay, command descriptors, or broad command-producer ownership as a stop condition requiring a plan edit, not an implementation expansion.
