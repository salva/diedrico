# Cycle 025 Review Round 02 — Runtime view/read ports for rendering and panels

## Scope and source-control verification

- Re-read `reviews/round-01-review.md`, `corrections-round-01.md`, `scope-check.md`, `proposal-direct.md`, and `proposal-restructure.md`.
- Re-checked current source evidence in `SvgCanvas.vue`, `PropertiesDialog.vue`, `ActionsPanel.vue`, `ProcessTreeNode.vue`, `RuntimeSession.ts`, `AppShellRuntime.ts`, `RuntimeInjectionKeys.ts`, and `App.vue`.
- Verified this remains a review-only stage: scoped `git status` shows new/untracked stage artifacts only under `.saivage/stages/cycle-025-review-round-02/` and `architecture-audit/cycle-025-runtime-view-read-ports/reviews/`; scoped `git diff --name-only` is empty for production/source paths reviewed here.
- Verified protected/out-of-scope surfaces remain excluded in the reviewed proposals: no command-producer broadening, persistence schema/replay, backend/docs/spec/package-tooling churn, Drive/auth, broad domain realization redesign, broad application-kernel work, or implementation activity is proposed.

## Round-01 blocker verification

### Blocker 1 — PropertiesDialog ownership

**Resolved.**

Evidence and assessment:

- Current source still proves the seam is real: `SvgCanvas.vue` forwards `:world="world"` into `PropertiesDialog.vue`, and `PropertiesDialog.vue` still reads world/domain details directly.
- `proposal-direct.md` now explicitly includes `frontend/src/components/dialogs/PropertiesDialog.vue` in Wave 025 scope.
- The direct proposal now states that `RuntimeSession` will expose `propertiesReadPort()` or `canvasViewPort().properties` for read-only dialog data and current save payload construction.
- The proposal explicitly requires deleting the dialog's `world: World | null` prop and removing concrete `World`/domain imports used only for dialog read formatting.
- The replacement contract is concrete enough for review: `elementLabel`, `elementType`, optional `planeId`, optional `coordinates`, `dependencies`, optional `createdBy`, current/default style values, and editable-style flags.
- The proposal keeps save behavior narrow and explicitly forbids introducing domain mutation, command-history changes, or persistence redesign.

Conclusion: the proposal no longer contradicts the Wave 025 claim about removing the production `WorldInjectionKey` / `worldForView()` view seam. Properties dialog ownership is now explicitly resolved within scope.

### Blocker 2 — ProcessTreeNode read-model replacement shape

**Resolved.**

Evidence and assessment:

- Current source still proves the seam is real: `ProcessTreeNode.vue` receives `world`, forwards it recursively, and uses `getActionDescriptionParts(..., world)`, element lookups, projection-plane lookup, and `realize2D(world)`.
- `proposal-direct.md` now requires `ActionsPanel.vue` to subscribe to a process-tree read model from `ProcessTreeReadInjectionKey` and pass parent-prepared process-node view models into `ProcessTreeNode.vue`.
- The proposal now names a concrete `ProcessNodeViewModel` shape at behavior level: structural fields, `descriptionParts`, `isInfeasible`, and `hideBecauseElementMissing`/equivalent, with optional label/reference data only when needed by the template.
- The proposal explicitly forbids generic world-style traversal helpers on `ProcessTreeReadPort`, `ProcessNodeViewModel`, or `ProcessTreeNode.vue` props, including `getElement2D`, `getElement3DById`, `getProjectionPlaneById`, `realize2D`, `getActionDescriptionParts(node, world)`, `getDependencyService`, and `getAll*` helpers.
- The proposal also includes a stop condition: if those DTOs cannot be prepared without such helpers, implementation must stop for a plan edit rather than smuggling in a `World` facade.

Conclusion: the direct proposal is now concrete enough to review and strongly guards against a disguised `World` helper layer.

## Proposal scoring update

### proposal-direct.md

1. **Advances wave target outcome:** **9/10** — directly targets deletion of `worldForView()`, `WorldInjectionKey`, child `world` props, component-local adapter construction, and polling while now explicitly covering the two previously missing seams.
2. **Improves architecture/code quality:** **9/10** — behavior-sized ports, parent-prepared process-node view models, and removal of raw-world dialog/process-tree coupling materially sharpen the runtime/view boundary.
3. **Respects no-backcompat/aggressive deletion:** **9/10** — delete list is explicit and rejects shims, duplicate raw-world/port paths, and broad facades.
4. **Avoids overfeaturism:** **8/10** — remains bounded to the app-shell/view seam and does not introduce an unnecessary new top-level read layer.
5. **Risks/regressions:** **7/10** — there is still implementation risk around DTO completeness and realization-heavy data, but the anti-facade rules and stop conditions now make that risk honest and controllable.
6. **Validation sufficiency:** **9/10** — validation covers static seam deletion, focused runtime/component behavior, full lint/tests/build, Playwright/e2e, and live preview smoke.

### proposal-restructure.md

1. **Advances wave target outcome:** **6/10** — still capable of removing the seam, but with broader layer churn than is currently justified.
2. **Improves architecture/code quality:** **7/10** — central DTO mapping could help, but necessity is still unproven for this wave.
3. **Respects no-backcompat/aggressive deletion:** **8/10** — deletion goals remain aligned.
4. **Avoids overfeaturism:** **4/10** — still at higher risk of creating an unnecessary framework-like read layer.
5. **Risks/regressions:** **5/10** — broader breadth increases the chance of drift beyond Wave 025's bounded seam cleanup.
6. **Validation sufficiency:** **8/10** — adequate, but not enough to outweigh the added breadth.

## Findings

### NO BLOCKING ISSUES

The two round-01 blockers have been resolved in `proposal-direct.md`.

### Non-blocking observations

- `proposal-direct.md` remains the preferred choice because it solves the scoped seam with less structural churn than `proposal-restructure.md`.
- The direct proposal correctly keeps command producers, persistence/replay, backend, docs/specs, package/tooling, Drive/auth, broad realization redesign, and broad kernel work out of scope.
- During implementation review, the highest-value guardrail will be to reject any convenience helper that effectively recreates `World` traversal under a new port name.

## Recommendation

**NO BLOCKING ISSUES** — proceed to `cycle-025-decision`.

Preferred proposal: **`proposal-direct.md`**.

Decision note for the manager:

- Choose the direct proposal unless new evidence appears that the required process-tree/properties DTOs cannot be prepared without a broader application read layer.
- If implementation later discovers that a generic traversal facade or broader domain-realization redesign is required, that should trigger the proposal's stated stop condition and a reviewed plan edit rather than silent scope drift.
