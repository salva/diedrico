# Proposal Restructure — Convert Cycle 023 into a reviewed plan-correction / re-rank

## Summary

This alternative treats the stale Wave 023 premise as requiring a small reviewed plan correction before proceeding. Instead of merely closing Cycle 023, update the wave plan and cycle records to reflect that the runtime-session consumer-port and command-history boundary is already present in current source, then re-rank the remaining central work.

No production source changes are proposed.

## When to choose this path

Choose this proposal if Critic/reviewer or Manager believes the existing `architecture-audit/wave-plan.md` text is misleading enough that a formal plan edit is required before continuing. This is appropriate because the Wave 023 entry still describes raw accessors and consumer dependencies that current source has already removed.

## Target outcome

After the plan-correction path:

- `architecture-audit/wave-plan.md` no longer presents Wave 023 as a pending implementation target against already-changed source.
- The plan explicitly records the current source state: active-plane, selection, keyboard, and selection-delete app-shell consumers are already behind ports; remaining central debt is command-producer runtime ports (Wave 024), view/read presentation concentration, and persistence adapter DTO casts.
- The next canonical stage is a fresh Wave 024 scout/proposal stage unless the plan correction re-ranks another more central current-source seam.
- No source implementation occurs during the correction.

## Files to change

### Audit/docs artifacts only

- `architecture-audit/wave-plan.md`
  - Mark Wave 023 as complete/stale-against-current-source or move its completed target outcome into historical grounding.
  - Confirm Wave 024 command-producer runtime ports as the next central candidate, or explicitly re-rank if fresh evidence says otherwise.
  - Preserve the no-backcompat/aggressive deletion requirements for future implementation waves.

- `architecture-audit/cycle-023-runtime-session-consumer-ports-command-history-boundary/decision.md` or a similarly named closure/plan-correction decision artifact
  - Cite the revised scope check and Critic/reviewer outcome.
  - State that no Wave 023 source implementation is authorized.

- Optional `architecture-audit/cycle-023-runtime-session-consumer-ports-command-history-boundary/reviews/*` updates only through the normal review/critic path.

### Production/test files

None.

## Files/tests/docs/fixtures to DELETE

None in the correction itself. Do not delete existing source/tests, validation logs, or e2e specs while correcting plan text. Future implementation waves must still delete obsolete raw command-producer surfaces rather than keep shims.

## Expected behavior change

None. This is a plan/artifact correction.

## Current-source residuals to carry forward

A corrected plan should carry forward these current-source findings:

1. **Wave 024 command-producer seam:** `RuntimeSession.canvasCommandProducerPort(...)` and `processHistoryCommandPort()` pass the owned `world` and `commandStack` to command-producing controllers (`frontend/src/application/appShell/RuntimeSession.ts:109-121`). This is the next likely central implementation wave.
2. **View/read-model concentration:** `RuntimeSession` owns canvas, process-tree, elements-panel, three-presentation, active-plane selector, and properties-dialog read handoffs (`RuntimeSession.ts:29-107`, `:226-236`). Defer to a later read-model/rendering wave.
3. **Persistence DTO/cast seam:** `ProjectSessionPersistenceAdapter` still bridges opaque app-shell payloads to `ProjectData` casts (`frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts:10-20`), while concrete persistence handles live in `ProjectSessionPersistenceTargets.ts:1-12`. Defer until a persistence-contract wave if it cannot be fixed without `ProjectService` redesign.
4. **3D overlay contract:** any future rendering/read-model wave must preserve `frontend/tests/e2e/current-ui-contract.spec.ts:89-117`.

## Risks

- A plan correction can become process churn if it rewrites too much of the wave plan. Keep the edit narrow: mark Wave 023 reconciled and confirm/re-rank the next wave.
- If the correction over-focuses on persistence casts, it may pull persistence schema/replay work ahead of the more central command-producer seam; require source evidence and centrality rationale before re-ranking away from Wave 024.
- Existing Cycle 023 implementation/validation artifacts in the worktree may be noisy. The correction should cite current source, not assume every artifact in the directory is authoritative.

## Protected surfaces

No production source, tests, package/tooling, backend, docs/spec source outside the wave-plan correction, Drive/auth internals, rendering/Three/canvas/CSS, persistence schema/replay, command descriptors, or protected config/env/provider files may be touched.

## Validation plan

Because this path changes only audit/plan artifacts, validation is limited to:

1. Path-scoped status/diff for `architecture-audit/wave-plan.md` and Cycle 023 artifacts.
2. Static source scans attached as evidence for the plan correction.
3. Critic/reviewer approval of the corrected plan text.

Do not run source validation or preview refresh unless a later implementation wave changes source.

## Stop conditions

Stop and request a new design/review round if the correction would:

- rewrite Wave 024 implementation details without fresh scout evidence;
- reorder waves away from command-producer runtime ports without explicit centrality evidence;
- authorize source changes in the plan-correction stage;
- touch package/tooling/backend/docs/spec source broadly;
- inspect or cite protected secret/config/env/provider file contents.

## Recommendation

Prefer the direct closure proposal if the Manager can proceed with a Cycle 023 decision/closure artifact without editing the wave plan. Choose this restructure proposal only if formal plan text must be corrected before the next scout. In both cases, do not schedule a Wave 023 implementation coder from the stale original proposal set.
