# Wave 005 Corrections — Round 01

**Stage:** `cycle-005-corrections-round-01`  
**Task:** `t1-correct-wave-005-proposals`  
**Source review:** `reviews/round-01-review.md`  
**Source-code changes:** none; proposal/correction artifacts only.

## Blocker-to-edit mapping

### Blocker 1 — Proposal Direct must absorb `DependencyService` shim deletion

**Review blocker:** Proposal Direct left `DependencyService.rebuildDependencyMaps()` and `DependencyService.getActionDependencies()` as residual compatibility surface even though the scope check identified both as deprecated process/dependency overlap.

**Edits made:**

- Renamed Proposal Direct to "Delete deprecated process/dependency compatibility APIs" to make shim deletion part of the direct implementation scope.
- Updated the Summary and Target outcome to require deletion of `DependencyService.rebuildDependencyMaps()` and `DependencyService.getActionDependencies()` with no aliases, stubs, wrappers, barrels, or compatibility names left behind.
- Added `frontend/src/domain/world/DependencyService.ts` to the Domain files-to-change section with explicit deletion bullets for both methods and preservation of only live graph APIs.
- Expanded the Tests section to require removing `rebuildDependencyMaps()` calls in `DeletionSequenceFactory.spec.ts` and `removeElementOps.spec.ts`, replacing them with real dependency registration where needed.
- Expanded the Explicit DELETE list with both `DependencyService` methods and all stale call sites/fixture helpers.

### Blocker 2 — Proposal Direct must defer `ActionsPanel` use-case extraction to Wave 006

**Review blocker:** Proposal Direct needed to state explicitly that broad `ActionsPanel` process-history use-case extraction is not Wave 005 scope, while allowing only narrow cleanup needed by deleted APIs or boundary-honesty comments.

**Edits made:**

- Added a dedicated `Explicit Wave 006 deferral` section to Proposal Direct.
- Updated the Target outcome and UI/panels section to say `ActionsPanel.vue` remains on its current command-operation construction path for Wave 005.
- Limited allowed `ActionsPanel.vue` edits to compile fallout, misleading dependency comments, and narrow debug/noisy logging cleanup.
- Declared that adding a new `frontend/src/application/processTree/*UseCases.ts` module in Proposal Direct would be a scope deviation requiring a mini-cycle.
- Added a static validation check proving Proposal Direct did not introduce process-history use-case extraction.

### Blocker 3 — Proposal Restructure must narrow or mark `ActionsPanel` use-case extraction as rejected for this wave

**Review blocker:** Proposal Restructure's mandatory use-case extraction remained too broad and risked hidden Wave 006 implementation scope creep.

**Edits made:**

- Rewrote Proposal Restructure as "Higher-level use-case extraction considered, but too broad for Wave 005."
- Marked it in the Summary as a rejected alternative for Wave 005 implementation rather than the recommended path.
- Added `Why this is not the recommended Wave 005 implementation`, explaining that the use-case extraction belongs with Wave 006's broader UI command-construction refactor.
- Moved the use-case design into `Conceptual design retained for Wave 006 consideration`.
- Split files/tests/delete lists into Wave 005-required deletions versus additional deletions only if the broader alternative is explicitly selected.
- Clarified static validation expectations: `ActionsPanel.vue` operation-import hits are acceptable Wave 006 residuals for corrected Proposal Direct, and only fail if the restructure alternative is explicitly selected.

### Blocker 4 — Both proposals must tighten validation around dependency-shim deletion

**Review blocker:** Validation did not explicitly prove no caller still depended on `rebuildDependencyMaps()` or action-dependency placeholders, nor did it name focused tests for deletion-cascade/dependency registration behavior after shim removal.

**Edits made:**

- Proposal Direct now includes static deletion checks for `rebuildDependencyMaps` and `getActionDependencies` across `frontend/src`, `frontend/tests`, and `DependencyService.ts`.
- Proposal Direct focused Vitest now explicitly includes dependency update/deletion behavior without rebuild shims and a dependency-service graph test around `registerNode()`/`unregisterNode()`/`getDependents()`.
- Proposal Restructure now includes the same static deletion checks and focused dependency/deletion tests, plus separate validation expectations depending on whether the broader `ActionsPanel` extraction is selected.
- Both proposals retain the full mandatory cadence: root/workspace lint, focused Vitest, full Vitest, root/workspace builds, Playwright e2e for user-facing process-tree/UI behavior, and live preview refresh/reachability logging.

## Resulting recommendation for round-02 review

The corrected proposal set is ready for `cycle-005-review-round-02`:

- **Proposal Direct** is now implementation-ready and matches the round-01 recommendation: delete `ProcessTree.addAction()`, `World.addAction()`, `ProcessTree.getActionsDependingOnElement()`, `DependencyService.rebuildDependencyMaps()`, `DependencyService.getActionDependencies()`, obsolete implicit-group tests, dependency-shim test shortcuts, and compatibility names.
- **Proposal Restructure** remains useful decision context but is clearly positioned as too broad for Wave 005 unless the decision deliberately accepts a Wave 006 scope pull-forward.
- No frontend, backend, specs, or application source files were intentionally modified during this correction task.
