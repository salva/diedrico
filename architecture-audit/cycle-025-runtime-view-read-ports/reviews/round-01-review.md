# Cycle 025 Review Round 01 — Runtime view/read ports for rendering and panels

## Scope and source-control verification

- Reviewed `scope-check.md`, both proposals, the Wave 025 plan entry, and current source evidence in `RuntimeSession`, `AppShellRuntime`, `RuntimeInjectionKeys`, `App.vue`, `SvgCanvas.vue`, `ActionsPanel.vue`, `ProcessTreeNode.vue`, `ElementsPanel.vue`, `ThreeView.vue`, and `PlaneSelector.vue`.
- Verified the repository is broadly dirty outside this wave. The review is therefore based on path-scoped evidence only; no implementation or reconciliation of unrelated work is required in this stage.
- Verified protected/out-of-scope surfaces remain out of scope in the reviewed proposals: command producers/history semantics, persistence schema/replay, backend/docs/spec/package-tooling, Drive/auth, broad domain realization redesign, and broad application-kernel work.
- Verified one important in-scope coupling called out by the scope-check: the panel seam is not resolved unless `ProcessTreeNode.vue` stops receiving `world: World` as a prop.

## Proposal scoring

### proposal-direct.md

1. **Advances wave target outcome:** **7/10** — correctly targets deletion of `worldForView()`, `WorldInjectionKey`, component injection sites, component-local adapter construction, and polling.
2. **Improves architecture/code quality:** **7/10** — behavior-sized ports and moving subscriptions out of components would materially improve the runtime boundary.
3. **Respects no-backcompat/aggressive deletion:** **8/10** — delete list is explicit and rejects compatibility facades.
4. **Avoids overfeaturism:** **6/10** — mostly bounded, but it currently overclaims likely ownership for the properties dialog seam without proving that it can be migrated inside this wave.
5. **Risks/regressions:** **5/10** — process-tree node description/infeasibility and properties-dialog world access are under-specified and could force either a hidden broad facade or scope creep during implementation.
6. **Validation sufficiency:** **8/10** — required scans, focused tests, full suites, builds, Playwright/e2e, and preview/live smoke are all named.

### proposal-restructure.md

1. **Advances wave target outcome:** **6/10** — it can solve the seam, but it adds a new `application/viewRead` layer that is not shown to be necessary yet.
2. **Improves architecture/code quality:** **7/10** — centralizing DTO mapping could be good, but only if the extra layer stays thin.
3. **Respects no-backcompat/aggressive deletion:** **8/10** — deletion goals are aligned with the wave.
4. **Avoids overfeaturism:** **4/10** — higher breadth and directory churn make it easier to overbuild a framework-like read bundle for a seam that may be fixable more narrowly.
5. **Risks/regressions:** **5/10** — the proposed bundle/service layer risks becoming a renamed broad facade and expands implementation breadth before necessity is established.
6. **Validation sufficiency:** **8/10** — validation plan is adequate.

## Findings

### BLOCKING ISSUES

1. **Properties dialog ownership is not reconciled in the preferred direct proposal.**
   - Current source still passes `:world="world"` from `SvgCanvas.vue` into `PropertiesDialog.vue`, so deleting `WorldInjectionKey` from production view descendants is not fully planned unless the proposal explicitly classifies this dialog seam.
   - The direct proposal says `canvasViewPort()` will cover a "properties read seam" but does not state whether `PropertiesDialog.vue` is in scope to stop consuming `World`, whether it will instead receive a narrower style/properties port, or whether this dialog is an accepted deferred consumer requiring a plan edit.
   - Correction required: update the proposal in place to explicitly resolve the properties-dialog seam one way or the other: either (a) include `frontend/src/components/dialogs/PropertiesDialog.vue` and its replacement contract in scope/delete/test/validation lists, or (b) justify with evidence why it is intentionally deferred and how Wave 025 can still truthfully claim removal of the production `WorldInjectionKey` seam without leaving that consumer behind.

2. **Process-tree read-port design is too vague to verify that `ProcessTreeNode.vue` can lose its `World` prop without hidden facade leakage.**
   - Current source uses `getActionDescriptionParts(props.node, props.world)`, `getElement2D/getElement3DById/getProjectionPlaneById`, and `element.realize2D(props.world)` inside `ProcessTreeNode.vue`.
   - The direct proposal says to replace this with DTO/read-model fields, but it does not specify the ownership boundary strongly enough to prevent a broad "just expose world-like helpers on the process-tree port" fallback.
   - Correction required: update the proposal to name the concrete replacement shape at a behavior level (for example, parent-prepared process-node view models containing description parts, feasibility flag, and any element label/reference data needed by `ProcessTreeNode.vue`) and explicitly forbid reintroducing generic world traversal helpers on the process-tree port.

### Non-blocking observations

- `proposal-direct.md` is still the better fit once corrected; it is narrower and more consistent with the wave-plan guard than creating a new `application/viewRead` layer now.
- `proposal-restructure.md` is acceptable as a fallback but should not be chosen without a positive reason that the narrower direct approach cannot keep boundaries sharp.
- The review agrees with the scope-check that command producers, persistence schema/replay, backend/docs/spec/package-tooling, domain-realization redesign, Drive/auth, and broad kernel work remain out of scope.

## Recommendation

**BLOCKING ISSUES** — run a corrections round on `proposal-direct.md` before decision.

Preferred direction after correction: keep the **direct** approach, but make two points explicit in the proposal text before sign-off:

1. how the properties dialog stops depending on the raw world or is formally deferred without contradicting the wave claim; and
2. how `ProcessTreeNode.vue` receives pre-shaped process-node view data so the process-tree read port does not become a disguised `World` facade.

If those corrections are made in-place and no broader scope creep is introduced, this cycle should be able to proceed to `cycle-025-decision` with `proposal-direct.md` as the likely winner.
