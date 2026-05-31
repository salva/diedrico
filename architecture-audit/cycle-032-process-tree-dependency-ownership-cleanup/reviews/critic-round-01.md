---
synthesized_by: manager
reason: critic_dispatch_unavailable
critic_attempts:
  - "run_critic t2-critic-review-proposals failed: router reported no context window for nvidia-nim/moonshotai/kimi-k2.6"
  - "run_critic t2-critic-review-proposals-retry failed with the same provider context-window routing error"
---

# Critic Round 01 — Cycle 032 process-tree/dependency ownership cleanup

## Verdict

Approved for the next canonical Cycle 032 review stage with non-blocking corrections/warnings only. The artifact set is sufficient for a design-only fresh-scout/proposal stage: it identifies that the original Wave 005 delete targets (`ProcessTree.addAction()` and `getActionsDependingOnElement()`) are already absent, narrows implementation to current-source ownership seams, and avoids broadening into ProjectService persistence, command descriptor redesign, rendering/CSS/canvas/3D, Drive/auth, backend/docs/specs/package tooling, app-shell production composition, or Wave 006b panel command-controller work.

## Scope-check critique

The scope-check correctly handles the key stale-premise issue: Wave 005 remains valid by centrality and Cycle 031 explicitly recommends it next, but the specific historical API names are no longer present in `ProcessTree.ts`. It therefore proposes proving absence and deleting remaining dead/placeholder surfaces rather than silently expanding the wave. This satisfies the project priority to prefer deletion over shims and not preserve obsolete paths.

Strengths:

- Separates construction-history ownership (`ProcessTree`) from dependency graph ownership (`DependencyService`).
- Identifies the current DependencyService location as `frontend/src/domain/world/DependencyService.ts`, correcting the stale referenced path.
- Distinguishes `ActionsPanel.vue` component boundary, which already consumes injected read/intent ports, from application-layer `ProcessHistoryUseCases`, which still owns concrete process-tree operation construction.
- Preserves Cycle 031 outcomes: current-schema command-stream persistence, OperationRegistry descriptor boundary, and no ProjectService migrations/backcompat.
- Documents pre-existing scoped dirt and says not to normalize or adopt it.

Non-blocking warning:

- Some citations should be rechecked in the implementation-stage scout before editing because line numbers may drift and at least one `ActionGroup.ts` citation appears derived from a combined capture rather than the file's local line count. This does not block proposal readiness because the cited files/behaviors are still specific and verifiable.

## Proposal-direct critique

The direct proposal is the stronger implementation candidate. It is bounded, deletion-focused, and aligned with the no-backcompat priority:

- Deletes the unused parallel `processStore.ts` if static import scan confirms no active imports.
- Deletes unimplemented `RemoveActionGroupFromProcessTreeOp` and `RemoveSubprocessFromProcessTreeOp` descriptors/tests instead of preserving false extension points.
- Leaves `ActionsPanel.vue` alone unless small import/type fallout occurs, because the component already consumes injected ports.
- Preserves user-visible panel behavior, undo/redo, save/open replay for active operations, and 3D/preview behavior.
- Defines stop conditions that prevent accidental broadening into ProjectService, OperationRegistry redesign, app-shell composition, or Wave 006b controller work.

No blocking design gap found.

Non-blocking warning:

- The implementation stage should confirm whether `frontend/src/commands/operations/processTree/README.md` exists before listing it as an actual delete target. If absent, the implementation log should record it as a proposed stale-doc target not present in current source rather than creating churn.

## Proposal-restructure critique

The restructure proposal is a useful alternate/stop-path rather than the default. It correctly tests the higher-level question: whether the related-action/read-model seam should become a narrow process-history/dependency read boundary before deletion. It also includes the same delete list and validation obligations.

Strengths:

- It avoids making `ProcessTree` a dependency-query owner.
- It keeps `ActionsPanel.vue` as a consumer of ports and does not reopen Wave 006b command-controller scope.
- It names stop conditions for generalized selectors, app-shell redesign, DependencyService relocation, descriptor architecture, and panel/toolbar command-intent work.

Residual risk accepted for proposal stage:

- This path could become too broad if description/feasibility rendering requires many additional world ports. The proposal's stop conditions are adequate; reviewers should prefer proposal-direct unless they require stronger read-boundary proof.

## Rubric assessment

1. **Advances target outcome:** Yes. Both proposals keep ProcessTree as construction history and dependency queries in the dependency boundary.
2. **Improves architecture/code quality:** Yes. Direct path deletes dead store/descriptors and placeholder behavior; restructure path offers a stronger read boundary if justified.
3. **Respects no-backcompat/aggressive deletion:** Yes. It rejects compatibility for dead operation descriptors and unused process store paths.
4. **Avoids overfeaturism:** Yes, especially proposal-direct. Proposal-restructure includes adequate stop conditions.
5. **Risks/regressions identified:** Yes. Persistence descriptor deletion, dirty-file overlap, dynamic imports, and app-shell broadening are named.
6. **Validation sufficient:** Yes. Static scans, focused process/dependency/panel/persistence tests, full lint/Vitest/build/e2e, and live preview/probe are included.

## Required next step

Proceed to the canonical `cycle-032-review-round-01-process-tree-dependency-ownership-cleanup` stage after this Manager stage completes, using these artifacts as the proposal set. The review should favor `proposal-direct.md` unless it identifies a concrete reason that the read-boundary restructure must precede deletion.
