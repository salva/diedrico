# Wave 005 Review — Round 01

**Cycle:** `cycle-005-process-tree-dependency-ownership`  
**Stage:** `cycle-005-review-round-01`  
**Reviewer:** primary reviewer  
**Artifacts reviewed:** `scope-check.md`, `proposals/proposal-direct.md`, `proposals/proposal-restructure.md`, relevant Wave 005 entry in `architecture-audit/wave-plan.md`, and current referenced code in `frontend/src/domain/processTree/ProcessTree.ts`, `frontend/src/domain/world/DependencyService.ts`, and `frontend/src/components/panels/ActionsPanel.vue`.

## Overall verdict

**BLOCKING ISSUES**

Proposal Direct is the better fit for Wave 005 **if corrected**. It matches the wave-plan’s central goal: make `ProcessTree` own construction history only, delete deprecated process/dependency overlap, and avoid dragging the broader UI command-construction refactor forward from Wave 006. Proposal Restructure identifies real cleanup opportunities, especially deleting `DependencyService` compatibility shims, but its `ActionsPanel` use-case extraction crosses too far into Wave 006 for this cycle and weakens wave-boundary discipline.

That said, both proposals need in-place edits before decision because neither one clearly resolves the acceptance-criteria question of whether deleting `DependencyService` no-op shims and extracting `ActionsPanel` process-history use-cases belongs in Wave 005 or Wave 006. The review recommendation is:

- **Keep Wave 005 focused on Proposal Direct’s domain cleanup**: delete `ProcessTree.addAction()`, `World.addAction()`, `ProcessTree.getActionsDependingOnElement()`, and the implicit-action-group tests.
- **Pull deletion of `DependencyService` no-op compatibility shims into Wave 005 as part of the same ownership cleanup**, because those shims are the same deprecated overlap and already contaminate current tests.
- **Do not require `ActionsPanel` process-history use-case extraction in Wave 005**; keep that in Wave 006 unless a narrowly scoped edit is needed only to stop usage of deleted APIs.

## Proposal comparison against required criteria

### 1) Does it advance the wave target outcome?

**Proposal Direct — score: 5/5**  
Yes. It squarely deletes the deprecated process-tree insertion path and deprecated dependency query path described in the scope check and wave plan. It also correctly keeps `getActionsProducingElement()` as construction-history provenance rather than dependency lookup.

**Proposal Restructure — score: 4/5**  
Mostly yes, but it advances a second target as well: extracting an application use-case boundary from `ActionsPanel.vue`. That is architecturally defensible, yet it exceeds the wave’s primary ownership cleanup and starts Wave 006’s UI-command-construction work early.

### 2) Does it improve architecture and code quality?

**Proposal Direct — score: 4/5**  
Good improvement: it removes obsolete API surface and forces explicit action-group ownership. However, as written it leaves `DependencyService.rebuildDependencyMaps()` / `getActionDependencies()` as residual compatibility surface even though the scope check shows those methods are already deprecated no-ops and active tests still rely on them. That weakens the claimed “single dependency boundary.”

**Proposal Restructure — score: 4/5**  
Also good, especially on dependency-boundary hardening and removing panel debug noise. But the proposed use-case layer risks becoming a thin wrapper unless tightly bounded, and it creates more moving pieces than the wave strictly needs.

### 3) Does it respect no-backcompat / aggressive deletion priorities?

**Proposal Direct — score: 3/5**  
Partially. It aggressively deletes `ProcessTree.addAction()`, `World.addAction()`, `ProcessTree.getActionsDependingOnElement()`, and obsolete implicit-group tests. But it stops short of clearly deleting the deprecated `DependencyService` compatibility shims the scope check already identifies as dead residue.

**Proposal Restructure — score: 5/5**  
Yes on deletion posture. It explicitly deletes the process/dependency compatibility residue and direct panel operation imports. Its only drawback is breadth, not deletion discipline.

### 4) Does it avoid overfeaturism?

**Proposal Direct — score: 5/5**  
Yes. It keeps the change centered on process-tree/dependency ownership and test cleanup.

**Proposal Restructure — score: 2/5**  
Not enough. The `ActionsPanel` use-case seam may be correct long-term, but introducing it here blends two waves: Wave 005 ownership cleanup and Wave 006 UI command-construction extraction.

### 5) Does it avoid introduced risks / hidden regressions?

**Proposal Direct — score: 4/5**  
Lower risk because it stays on the existing command/operation path. Main hidden risk is incomplete cleanup if `DependencyService` shims remain and stale tests get rewritten around them instead of deleted.

**Proposal Restructure — score: 3/5**  
Higher risk because it changes component/application seams at the same time as deleting domain APIs. The panel behavior may remain equivalent, but the proposal increases blast radius without strong evidence that Wave 005 requires it.

### 6) Is the proposed validation sufficient?

**Proposal Direct — score: 3/5**  
Mostly, but it is missing one explicit focused check for the dependency-shim deletion decision. If Wave 005 deletes `rebuildDependencyMaps()` and `getActionDependencies()`, validation must name focused dependency-service or deletion-cascade tests that prove no caller still depends on rebuild semantics.

**Proposal Restructure — score: 4/5**  
Stronger on focused validation because it explicitly includes use-case and dependency-service checks, though that is partly because it broadens the implementation.

## Required decision on the two disputed scope points

### A. Should Wave 005 delete `DependencyService` no-op compatibility shims?

**Yes — this belongs in Wave 005.**

Reasoning:

- The shims are the same deprecated process/dependency overlap the wave exists to remove.
- `DependencyService.rebuildDependencyMaps()` is explicitly deprecated and no-op in current code (`frontend/src/domain/world/DependencyService.ts`).
- `DependencyService.getActionDependencies()` is explicitly a dead placeholder that returns an empty array.
- The scope check already shows current tests still call these methods, so leaving them behind would preserve obsolete ownership assumptions rather than deleting them.

Wave 005 should therefore delete these shims and rewrite/delete the affected tests accordingly.

### B. Should Wave 005 extract `ActionsPanel` process-history use-cases?

**No — not as a requirement for this wave. Defer to Wave 006.**

Reasoning:

- The wave-plan says `ActionsPanel.vue` only “as needed to consume the cleaned boundary.”
- The current panel issue is real (`ActionsPanel.vue` imports concrete process-tree operations directly), but the plan already reserves UI command-construction extraction for Wave 006.
- Wave 005 can meet its target outcome without introducing a new use-case layer, as long as the panel stops using deleted APIs and any touched comments/logic reflect the single dependency boundary honestly.

If implementation happens to require a tiny local cleanup in `ActionsPanel.vue`, that is acceptable. But a new process-history use-case boundary should not be mandatory for this decision round.

## Concrete blockers requiring in-place edits before decision

1. **Proposal Direct must explicitly absorb deletion of deprecated `DependencyService` compatibility shims** (`rebuildDependencyMaps()` and `getActionDependencies()`) and the associated stale tests/call sites. As written, it leaves a gap between the claimed ownership cleanup and the actual deprecated boundary still present in code/tests.
2. **Proposal Direct must explicitly state that `ActionsPanel` use-case extraction is deferred to Wave 006**, with only minimal panel edits allowed if needed to stop deleted API usage or correct dependency-boundary comments/logic.
3. **Proposal Restructure must either narrow itself to remove the mandatory `ActionsPanel` use-case extraction or clearly mark that part as rejected for this wave.** Otherwise it remains too broad relative to wave ordering.
4. **Both proposals should tighten validation language around the dependency compatibility-shim deletion**, naming the focused tests that will prove deletion-cascade and dependency registration behavior still works without `rebuildDependencyMaps()`.

## Implementation recommendation

**Recommended direction: Proposal Direct, after correction.**

Adopt Proposal Direct as the base, but edit it to include:

- deletion of `ProcessTree.addAction()`;
- deletion of `World.addAction()`;
- deletion of `ProcessTree.getActionsDependingOnElement()`;
- deletion of `DependencyService.rebuildDependencyMaps()` and `DependencyService.getActionDependencies()`;
- deletion/rewriting of implicit action-group tests and dependency-shim fixture shortcuts;
- explicit deferral of `ActionsPanel` process-history use-case extraction to Wave 006.

That gives Wave 005 a clean architectural outcome without prematurely merging it with Wave 006.
