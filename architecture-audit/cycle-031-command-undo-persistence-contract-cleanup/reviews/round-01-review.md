# Cycle 031 Round 01 Review — Command/undo persistence contract cleanup

## Scope and evidence reviewed

Reviewed the Cycle 031 scope-check, both proposals, the synthesized critic artifact, the Wave 004 plan section, current source in `Command.ts`, `CommandStack.ts`, `IOperation.ts`, `OperationRegistry.ts`, `ProjectService.ts`, and the world/process-tree descriptor registration modules. Also checked path-scoped git status/diff evidence and current scoped worktree state.

## Path-scoped status/diff summary

Current scoped worktree evidence shows pre-existing dirty files in command typing/operation typing areas plus two deleted e2e specs, and the new Cycle 031 review artifact directory. No Cycle 031 implementation source/test changes were performed in this review stage.

Scoped status observed:

- Modified: `frontend/src/commands/Command.ts`
- Modified: `frontend/src/commands/factories/DeletionSequenceFactory.ts`
- Modified: `frontend/src/commands/factories/PointSequenceFactory.ts`
- Modified: `frontend/src/commands/operations/IOperation.ts`
- Modified: `frontend/src/commands/operations/world/AddCircleCircleIntersectionPoint2DOp.ts`
- Modified: `frontend/src/commands/operations/world/AddFreePointOp.ts`
- Modified: `frontend/src/commands/operations/world/AddLineCircleIntersectionPoint2DOp.ts`
- Modified: `frontend/src/commands/operations/world/AddLineLineIntersectionPoint2DOp.ts`
- Modified: `frontend/src/commands/operations/world/AddSiblingIntersectionPoint2DOp.ts`
- Deleted: `frontend/tests/e2e/active-plane-shortcuts.spec.ts`
- Deleted: `frontend/tests/e2e/selection-mask.spec.ts`
- Untracked/new review artifact directory under `architecture-audit/cycle-031-command-undo-persistence-contract-cleanup/reviews/`

Scoped diffstat observed:

- command/operation typing edits are small and pre-existing in the worktree
- deleted e2e specs remain pre-existing and out of scope for this review stage
- no validation, preview, package/tooling, backend, docs/specs, rendering, Drive/auth, or app-shell composition edits were introduced by this review

## Critic artifact / Designer-Critic protocol check

`reviews/critic-round-01.md` is explicitly marked:

- `synthesized_by: manager`
- `reason: critic_dispatch_unavailable`

That satisfies the stated failure-tolerance rule for the Designer/Critic protocol. The synthesized critic artifact is accepted for this review round because it documents the unavailable critic dispatches, identifies the reviewed artifacts, and applies the required proposal-screening logic. Therefore, **Designer/Critic protocol evidence is satisfied for Cycle 031 round 01**.

## Narrowed current-source premise check

The current source narrows the old Wave 004 premise in an important way, and the proposals mostly reflect that correctly:

- `ProjectService` is already a current-schema command-stream orchestrator rather than a monolithic concrete-operation reconstruction switch.
- `ProjectService` imports `deserializeOperation` from `OperationRegistry`, not every concrete operation class.
- unsupported schema versions are already rejected directly instead of migrated.
- `Command.restore(...)`, `Command.toSnapshot()`, `CommandStack.getCommittedCommands()`, and `CommandStack.restoreCommittedCommands(...)` already exist as explicit command/undo persistence APIs.

So the remaining central work is **not** deleting nonexistent migration/switch code. The remaining central work is the descriptor/registry/private-cast cleanup that still exists in the operation and persistence boundary:

- broad `OperationDescriptor` / `IOperation` defaults
- `OperationRegistry.register(...)` cast-based storage
- shallow outer descriptor validation
- widespread mutable `parameters: Record<string, any>` / `outputs: Record<string, any>` bags
- process-tree restore cast `obj(d, 'action') as unknown as Action`
- adjacent private/internal cast seams that must only be touched if the chosen implementation truly requires them

## Proposal scoring

| Criterion | Proposal Direct | Proposal Restructure |
|---|---|---|
| 1. Advances target outcome | **Pass** — directly matches the narrowed source reality: keep current-schema command-stream persistence and sharpen descriptor/registry/contracts without reopening nonexistent ProjectService migration/switch work. | **Pass** — could also reach the target if direct cleanup proves structurally insufficient, but is less directly aligned to the now-narrowed seam. |
| 2. Improves architecture and code quality | **Pass** — removes broad mutable parameter/output bags, strengthens typed descriptors, preserves ProjectService as a thin orchestrator, and targets the live process-tree cast seam. | **Pass with caution** — can improve layering further by separating persistence DTOs from runtime operations, but risks more churn and broader dependency movement than the wave strictly needs. |
| 3. Respects no-backcompat / aggressive deletion priorities | **Pass** — explicitly deletes obsolete mutable bags/casts/tests and avoids reintroducing migrations or compatibility paths. | **Pass** — also deletion-oriented and rejects dual formats/migrations, but its larger boundary reshuffle increases the risk of leaving transitional surfaces unless tightly controlled. |
| 4. Avoids overfeaturism | **Pass** — bounded to the active persistence seam and names stop conditions against snapshot redesign, app-shell redesign, or unrelated world-API expansion. | **Warning** — the proposal is intentionally broader and risks reopening registry ownership/global-singleton/composition questions that may exceed this wave unless the direct path is proven insufficient. |
| 5. Risks / hidden regressions are identified and controlled | **Pass** — correctly identifies process-tree action modeling, initialization private casts, global registry state, and pre-existing e2e deletions as the real hazards. | **Warning** — identifies those hazards, but its mitigation boundary is looser; registry relocation, singleton removal, and serializer removal could broaden implementation unless tightly justified. |
| 6. Validation sufficiency | **Pass** — includes scoped diff capture, forbidden-seam scans, focused command/registry/ProjectService tests, full lint/Vitest/build, e2e/Playwright, and live preview reachability. | **Pass** — keeps the mandatory validation cadence and adds contract-boundary tests if the broader contract module is selected. |

## Protected-surface checks

The reviewed proposal set keeps the following protected/out-of-scope surfaces out of implementation scope, which is correct for this review stage and for the intended wave boundary:

- rendering/CSS/canvas/3D behavior and overlay interaction
- Drive/auth internals and protected credentials/config
- backend, docs, specs, and package/tooling churn
- validation-platform redesign
- UI feature work and app-shell production composition redesign
- stale audit-history mining
- unrelated dirty-file normalization, including the pre-existing deleted e2e specs unless validation later proves they must be addressed explicitly

No protected config/secret files were read during this review.

## Preservation and validation-requirement checks

The proposal set correctly treats the following as **preservation requirements validated during implementation**, not as targets to change during review:

- Waves 024-030 behavior remains preserved
- Cycle 030 app-shell DTO port boundary remains preserved
- save/open/autosave behavior remains preserved
- undo/redo after load remains preserved
- deterministic replay remains preserved
- active-plane restoration fallback remains preserved
- live preview reachability and current 3D overlay pointer behavior remain preserved

The direct proposal is stronger here because it more clearly keeps `ProjectService` as the current-schema command-stream owner and avoids reopening app-shell/persistence composition boundaries that were just cleaned up in Cycle 030.

## Proposal-specific findings

### Proposal Direct

This is the preferred proposal for the decision stage.

Why it fits best:

- It matches the current source truth that `ProjectService` no longer contains the old switch/migration smell.
- It targets the actual remaining central seams: typed descriptors, registry validation/ownership sharpness, mutable operation bags, and the process-tree `Action` cast.
- It is more likely to delete bad persistence surfaces without accidentally reopening app-shell or broader runtime composition work.
- Its stop conditions correctly require a reviewed delta if process-tree action cleanup or initialization/private-world seams turn into a larger architectural decision.

Non-blocking caution:

- “Strengthen registry generics where practical” must not devolve into merely renaming central casts. The decision stage should prefer this proposal with the expectation that implementation must actually reduce cast-driven persistence seams, not cosmetically move them.

### Proposal Restructure

This is a valid alternative, but it should be treated as a fallback only if implementation evidence shows the direct proposal cannot honestly remove the process-tree cast and typed descriptor seams within the current boundary.

Why it is not preferred:

- It is broader than the narrowed current-source premise now warrants.
- It risks reopening registry ownership/global singleton composition questions and operation-owned serializer questions that may exceed the wave’s bounded goal.
- The extra abstraction only pays off if the direct proposal proves unable to delete the live persistence-contract smells cleanly.

Non-blocking caution:

- If the decision stage still keeps this option alive as an alternative, it should be cited as the higher-level fallback only when direct cleanup fails the stop conditions; it should not be selected just because it is cleaner in the abstract.

## Final review decision

**No blocking issues found for Cycle 031 round 01.**

The narrowed premise is handled correctly enough for review convergence:

- the synthesized critic artifact is accepted;
- Designer/Critic protocol evidence is satisfied;
- the review confirms ProjectService migration/monolithic switch work is absent in current source;
- the real remaining work is descriptor/registry/private-cast cleanup;
- protected surfaces remain out of scope;
- preservation and validation requirements are included correctly.

## Recommendation to decision stage

Proceed to **`cycle-031-decision-command-undo-persistence-contract-cleanup`**.

Decision guidance:

- **Preferred proposal:** `proposal-direct.md`
- **Rejected as primary choice for now:** `proposal-restructure.md`, unless the decision rationale explicitly records it as a fallback only if direct implementation hits the named stop conditions around process-tree action DTO modeling, initialization/private-world seams, or a forced higher-level persistence boundary split.
