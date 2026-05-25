# Wave 005 Corrections Round 01 Note

**Cycle:** `cycle-005-process-tree-dependency-ownership`  
**Stage:** `cycle-005-corrections-round-01`  
**Source-code changes in this stage:** none intended or performed.  
**Purpose:** record the in-place proposal edits made after `reviews/round-01-review.md` before `cycle-005-review-round-02`.

## Round-01 blocker mapping

### Blocker 1 — Proposal Direct must absorb `DependencyService` compatibility-shim deletion

**Review blocker:** Proposal Direct left a gap by deleting `ProcessTree.addAction()`, `World.addAction()`, and `ProcessTree.getActionsDependingOnElement()` while not clearly deleting `DependencyService.rebuildDependencyMaps()` and `DependencyService.getActionDependencies()`.

**Edits made:**

- Renamed Proposal Direct to "Delete deprecated process/dependency compatibility APIs" to make dependency-shim deletion part of the direct scope.
- Updated the summary and target outcome to state that `DependencyService.rebuildDependencyMaps()` and `DependencyService.getActionDependencies()` are deleted, not retained as no-op compatibility shims.
- Added `frontend/src/domain/world/DependencyService.ts` to Proposal Direct's domain files-to-change section with explicit deletion instructions for both methods and an instruction not to replace them with aliases, stubs, wrappers, or barrels.
- Expanded the test section to remove `rebuildDependencyMaps()` calls in `DeletionSequenceFactory.spec.ts` and `removeElementOps.spec.ts`, replacing them with real dependency registration when needed.
- Expanded the explicit DELETE list to include both `DependencyService` methods and all stale tests/call sites using them.

### Blocker 2 — Proposal Direct must defer broad `ActionsPanel` use-case extraction to Wave 006

**Review blocker:** Proposal Direct needed to explicitly state that `ActionsPanel` process-history use-case extraction/direct operation import removal is not Wave 005 scope.

**Edits made:**

- Added direct target-outcome language that `ActionsPanel.vue` stays on the current command-operation construction path except for narrow compile/comment/debug cleanup.
- Rewrote the `UI/panels` section to say not to extract a process-history use-case/controller boundary in Wave 005 and to keep direct process-tree operation imports as a Wave 006 residual.
- Added an `Explicit Wave 006 deferral` section stating that any new `frontend/src/application/processTree/*UseCases.ts` module would be a scope deviation requiring a mini-cycle.
- Updated risks and residual issues to frame `ActionsPanel` direct operation construction as intentionally deferred, not an unresolved Wave 005 blocker.

### Blocker 3 — Proposal Restructure must be narrowed or marked as too broad/rejected for Wave 005

**Review blocker:** Proposal Restructure still made `ActionsPanel` use-case extraction mandatory, blending Wave 005 and Wave 006.

**Edits made:**

- Retitled Proposal Restructure as "Higher-level use-case extraction considered, but too broad for Wave 005".
- Rewrote the summary to position it as a rejected alternative for Wave 005 implementation and future input for Wave 006.
- Added a `Why this is not the recommended Wave 005 implementation` section explaining the wave-boundary problem and risk of a one-off/anemic use-case seam.
- Changed its target outcome to "if this alternative were chosen" rather than the default implementation target.
- Marked application/use-case and `ActionsPanel` extraction sections as deferred to Wave 006 by default, with adoption only if the decision explicitly accepts the broader alternative.
- Split the DELETE list into Wave 005 deletions retained regardless of proposal choice and additional UI-operation deletions only if the broader alternative is explicitly selected.

### Blocker 4 — Both proposals must tighten validation around dependency-shim deletion and full cadence

**Review blocker:** Validation needed explicit static deletion checks and focused tests proving deletion-cascade/dependency behavior without `rebuildDependencyMaps()`.

**Edits made:**

- Proposal Direct static checks now include `getActionDependencies`, `rebuildDependencyMaps`, compatibility shim definitions/callers, and a check that no process-history use-case extraction slipped into the direct path.
- Proposal Direct focused tests now explicitly cover process-tree group insertion, subprocess behavior, dependency update/deletion without rebuild shims, dependency-service graph behavior, undo/redo/persistence replay, and `ActionsPanel` only if touched.
- Proposal Restructure static checks now distinguish expected results for corrected Proposal Direct versus the broader alternative, including direct `ActionsPanel` operation imports as Wave 006 residual unless the broader alternative is explicitly selected.
- Proposal Restructure focused and full-cadence validation now explicitly covers dependency-shim deletion, undo/redo/persistence, e2e, and live preview refresh.

## Files intentionally changed by this correction stage

- `architecture-audit/cycle-005-process-tree-dependency-ownership/proposals/proposal-direct.md`
- `architecture-audit/cycle-005-process-tree-dependency-ownership/proposals/proposal-restructure.md`
- `architecture-audit/cycle-005-process-tree-dependency-ownership/corrections-round-01-note.md`
- `.saivage/stages/cycle-005-corrections-round-01/tasks.json`

No source files under `frontend/`, `backend/`, `specs/`, or `docs/` are part of this correction stage.
