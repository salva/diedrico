# Cycle 027 Decision — Runtime read-model extractors and presentation DTO ports

**Stage:** `cycle-027-decision`  
**Status:** implementation path selected; no source implementation performed.  
**Selected path:** `proposals/proposal-direct.md` after corrections round 01 and review round 02.  
**Rejected/fallback path:** `proposals/proposal-restructure.md` remains fallback-only and is not selected for Cycle 027 implementation.

## Evidence inspected before decision

Decision is based on the reviewed Cycle 027 artifact set and current scoped hygiene checks:

- `architecture-audit/cycle-027-runtime-read-model-extractors/scope-check.md`
- `architecture-audit/cycle-027-runtime-read-model-extractors/proposals/proposal-direct.md`
- `architecture-audit/cycle-027-runtime-read-model-extractors/proposals/proposal-restructure.md`
- `architecture-audit/cycle-027-runtime-read-model-extractors/reviews/round-01-review.md`
- `architecture-audit/cycle-027-runtime-read-model-extractors/corrections-round-01.md`
- `architecture-audit/cycle-027-runtime-read-model-extractors/reviews/round-02-review.md`
- `architecture-audit/wave-plan.md`, Wave 027 entry captured for this decision in `validation/decision-wave027-entry.stdout.log`
- Scoped diff check for the Cycle 027 planning directory plus protected source paths returned no implementation diff before this decision was written.

A broad MCP `git_status` call overflowed because the worktree is known to be very dirty. This decision therefore relies on path-scoped status/diff discipline and the already captured scout/review evidence. Secret/config files were not read.

## Review convergence status

Review convergence is complete for Cycle 027 planning.

- Round 01 reviewed both proposals and found the scoped problem real: `RuntimeSession` still concentrates runtime ownership plus properties/process/elements read-model construction, `CanvasWorldReadPort` still exposes raw projection/process seams, and `ThreeWorldReadPort` still owns broad traversal/realization internally.
- Round 01 preferred `proposal-direct.md` but raised two blockers:
  1. elements visibility had to be explicitly modeled as an adjacent intent boundary, not hidden as read-model mutation;
  2. canvas-port narrowing needed a concrete caller map and residual rule for `getProcessTree()`, `getAllProjectionPlanes()`, and raw projected-3D getters.
- Corrections round 01 edited `proposal-direct.md` in place and documented the changes in `corrections-round-01.md`.
- Round 02 verified both blockers resolved and states **NO BLOCKING ISSUES**. It recommends proceeding to `cycle-027-decision` and selecting `proposal-direct.md`.

Because round 02 has no blocking issues, the next stage may be implementation under the selected direct path.

## Decision

Select **`proposals/proposal-direct.md`** for Cycle 027 implementation.

Rationale:

- It directly advances the Wave 027 target outcome: extract properties-dialog, process-tree, and elements-panel read-model construction from `RuntimeSession`; delete the canvas process-tree visibility leak; and narrow presentation read ports only where behavior-sized DTO seams are concrete.
- It improves architecture/code quality without introducing a new broad composition hub. The selected path removes inline helper bodies, concrete class formatting, broad `any` seams, and runtime-local realization calls from `RuntimeSession` where the focused builders own them.
- It respects the no-backcompat/deletion priority by requiring deleted inline helpers and the `CanvasWorldReadPort.getProcessTree()` seam rather than wrappers or parallel paths.
- It avoids overfeaturism by allowing named residuals for raw projection-plane and projected-3D collection access when current selectors still require them, instead of inventing a generic `RuntimeWorld`/`WorldReadModel` facade.

Reject **`proposals/proposal-restructure.md`** for this cycle. It remains a useful fallback if implementation proves the direct extraction cannot materially shrink `RuntimeSession`, but current review evidence does not justify introducing `RuntimeReadModelPorts` / `RuntimeReadModelContext`. That path has higher risk of replacing the current god-module with a renamed read-model hub and broadening into active-plane/selection/application-kernel composition.

## Bound implementation scope

The implementation stage must follow the selected direct proposal exactly. It may change only files needed for the following concerns:

### New focused runtime read-model / intent modules

- `frontend/src/application/appShell/readModels/PropertiesDialogReadModel.ts`
- `frontend/src/application/appShell/readModels/ProcessTreeReadModel.ts`
- `frontend/src/application/appShell/readModels/ElementsPanelReadModel.ts`
- `frontend/src/application/appShell/readModels/ElementVisibilityIntent.ts` or an equivalently small adjacent visibility intent module
- Optional focused local helper/types module such as `RuntimeReadModelContext.ts` only if it is behavior-sized and not a mirrored `World` facade.

### Existing runtime/app-shell files

- `frontend/src/application/appShell/RuntimeSession.ts`
- `frontend/src/application/appShell/RuntimeViewPorts.ts`

`RuntimeSession` remains the concrete owner/composer of `World` and `CommandStack`. It may wire the new focused builders/intent, but it must not keep duplicate inline read-model paths after extraction.

### Presentation read ports/selectors

- `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts`
- `frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts`
- `frontend/src/application/canvasPresentation/Projected3DCanvasSelector.ts`
- `frontend/src/application/canvasPresentation/CanvasVisibilityPolicy.ts`
- `frontend/src/application/threePresentation/ThreeWorldReadPort.ts`

### Vue consumers and tests only for contract alignment

- `frontend/src/components/dialogs/PropertiesDialog.vue` only if the view-model contract must be tightened without UI behavior change.
- `frontend/src/components/panels/ActionsPanel.vue`
- `frontend/src/components/panels/ProcessTreeNode.vue`
- `frontend/src/components/panels/ElementsPanel.vue`
- `frontend/src/components/workspace/SvgCanvas.vue`
- `frontend/src/components/panels/ThreeView.vue`
- Focused tests for the new builders/intent, RuntimeSession wiring, canvas/three presentation DTO seams, `ProcessTreeNode.vue` recursive DTO behavior, and overlay pointer-boundary preservation if presentation-adjacent files are touched.

No source, test, package, backend, docs/spec, persistence, Drive/auth, secret/config, or implementation changes are part of this decision stage.

## Required DELETE list for implementation

The implementation is incomplete unless replaced surfaces are deleted rather than wrapped:

- Delete inline `RuntimeSession.getPropertiesDialogViewModel()` and moved properties helpers: `describeElementType`, `describeCoordinates`, `describeDependencies`, and moved style/read helper logic.
- Delete inline `RuntimeSession.createProcessNodeViewModel()`, `isActionInfeasible()`, related-action dependency traversal, and moved process-node count helper logic.
- Delete inline `RuntimeSession.elementsPanelPort()` grouping/formatting body and the raw `toggleVisibility()` mutation body after the adjacent visibility intent owns it.
- Delete `RuntimeSession` broad helper `any` / `as any` read-model seams where typed builders replace them, especially around visible-element lookup, panel formatting, and element properties.
- Delete runtime-local `realize2D(this.world)` calls for properties/process read models where focused adapters now own realization.
- Delete `CanvasWorldReadPort.getProcessTree()` and the `Pick<World, 'getProcessTree'>` canvas visibility seam in this wave.
- Delete stale tests that assert read-model construction lives inside `RuntimeSession`; replace with builder/intent tests.
- Delete raw `CanvasWorldReadPort.getAllProjectionPlanes()` and `getAll3DPoints()` / `getAll3DLines()` / `getAll3DSegments()` only if concrete behavior-sized selector DTO methods replace all current named callers in the same implementation. Otherwise keep them only as documented residuals.

Do not delete or rewrite persistence, command history/producer ports, backend, package scripts, docs/specs, Drive/auth, preview scripts, broad domain realization files, or unrelated dirty worktree changes.

## Ownership rules

### RuntimeSession and RuntimeViewPorts

- `RuntimeSession` owns construction and composition of private `World` and `CommandStack` only.
- `RuntimeSession` may construct focused read-model builders and intent ports but must not contain the bulky properties/process/elements traversal, formatting, concrete class classification, or direct panel DTO mapping after implementation.
- `RuntimeViewPorts.ts` may tighten or rename DTO/port types only where needed to express the new ownership honestly.
- Do not introduce compatibility wrappers that preserve old inline behavior alongside new builders.

### Properties read model

- A focused properties-dialog builder owns element lookup, type labeling, coordinate formatting, dependencies, created-by placeholder behavior, and style DTO mapping.
- It should receive behavior-sized domain read/realization capabilities, not full UI component access and not a generic world-like facade.
- User-visible properties dialog behavior is intended to remain equivalent.

### Process read model and `ProcessTreeNode.vue`

- A focused process read-model builder owns process-tree DTO creation, action description mapping, related-action lookup, infeasibility calculation, and node counting/subscription helper types if needed.
- `ProcessTreeNode.vue` must be checked and tested because it renders the recursive node DTO shape and infeasibility/related-action flags supplied by the builder.
- UI behavior for actions/process panel, recursive display, subprocess state, related-action highlighting, and infeasibility indicators must remain equivalent.

### Elements read model and visibility intent boundary

- `ElementsPanelReadModel` owns display DTOs only: plane grouping/sorting, 2D/3D element DTO formatting, typed properties, and visible-state display.
- Visibility toggling is a separate adjacent application intent such as `ElementVisibilityIntent.toggleElementVisibility(...)`.
- The intent may preserve current direct `visualStyle` mutation plus `world.markDirty()` semantics for this wave.
- Mutation must not be hidden inside read-model builders or DTOs.
- If honest cleanup requires command-backed visibility, undo/redo semantics, persistence schema/replay, or visibility history redesign, implementation must stop for a reviewed plan edit.

### CanvasWorldReadPort caller map and residual treatment

The implementation must follow the corrected caller-by-caller rule:

| Current seam | Cycle 027 treatment |
| --- | --- |
| `getProcessTree()` | **Delete in this wave.** Replace the process-tree-shaped visibility dependency with a behavior-sized visibility capability such as `isElementVisible(element)` or a policy callback owned by the canvas adapter. The canvas port/selectors must not expose or consume `ProcessTree`. |
| `getAllProjectionPlanes()` | **Explicit residual unless fully deleted by concrete DTO selectors.** It may remain only if `CanvasPresentationSelector` still needs plane-owned 2D traversal and/or `Projected3DCanvasSelector` still needs per-plane projected-3D iteration. If retained, record named callers and future-wave rationale in `implementation-log.md`. |
| `getAll3DPoints()`, `getAll3DLines()`, `getAll3DSegments()` | **All-or-nothing residual/delete seam.** Keep all three together only if `Projected3DCanvasSelector` still owns projection math. Delete all three only if a named projected-3D canvas DTO method replaces all current raw 3D loops. Partial deletion is not acceptable. |
| 2D/3D realization methods | Residual unless the corresponding raw entity collection seam is replaced. Do not claim realization narrowing while selectors still receive raw domain entities. |

### ThreeWorldReadPort bounded treatment

- Keep `ThreeView.vue` as a shell and avoid rewriting the scene host.
- `ThreeWorldReadPort` may receive small internal scene DTO factory extraction or bounded realization-context cleanup only if directly tied to Wave 027 read-model/presentation seams.
- Do not broaden into 3D scene adapter redesign, rendering feature work, or global domain realization ownership.

## Forbidden approaches

Implementation must not introduce:

- a generic `RuntimeWorld`, `WorldReadModel`, application-kernel, or facade that mirrors `World`;
- Vue component access to concrete `World`;
- duplicate old/new read-model paths for backward compatibility;
- command-backed visibility, persistence/undo semantics, or command-history redesign without a reviewed plan edit;
- broad `Element2D.realize2D(...)`, projection-plane realization, or domain model redesign hidden under this wave;
- package/tooling churn, validation-platform work, docs/spec rewrite, backend/Drive/auth changes, UI feature work, or preview-script ergonomics work.

## Protected out-of-scope surfaces

The following are explicitly protected and must not be modified unless a reviewed delta/plan edit is completed first:

- persistence schema/replay, `ProjectService`, snapshot/restore contracts;
- backend routes/models/storage and frontend/backend contract stance;
- docs/specs/debug cleanup and package/tooling changes;
- Drive/auth/browser credential/config integration;
- command history, command producers, `CommandStack`, undo/redo persistence semantics;
- broad domain realization, projection-plane ownership, or geometry-domain redesign;
- toolbar-history typing, app-kernel composition, active-plane/selection redesign beyond direct type alignment;
- UI feature work or visual redesign of properties/process/elements/canvas/3D panels;
- stale audit history mining or recovery from discarded cycles.

## Validation requirements for implementation

All validation stdout/stderr must be captured under:

`architecture-audit/cycle-027-runtime-read-model-extractors/validation/`

Minimum implementation validation:

1. Pre-edit path-scoped status/diff and seam scans proving scoped ownership.
2. Focused Vitest for `PropertiesDialogReadModel`.
3. Focused Vitest for `ProcessTreeReadModel`, related-action mapping, infeasibility behavior, and recursive `ProcessTreeNode.vue` DTO rendering/flags.
4. Focused Vitest for `ElementsPanelReadModel` and the adjacent visibility intent, including proof the toggle is not exported as read-model state and still marks dirty with current semantics.
5. Focused Vitest for `RuntimeSession` wiring and changed canvas/three read ports/selectors.
6. Focused canvas/static tests proving `CanvasWorldReadPort.getProcessTree()` and `Pick<World, 'getProcessTree'>` are gone, and proving retained `getAllProjectionPlanes()` / raw 3D getters match the documented residual rule.
7. Static architecture scans proving no production Vue component receives concrete `World`, no deleted `RuntimeSession` helper seams remain, no Wave 026 `ToolContext.world` / `CollectionContext.world` regression occurs, no generic world-like facade was added, and no command-backed visibility/persistence/undo/history redesign slipped in.
8. Root and frontend `npm run lint` where defined.
9. Focused Vitest plus root and frontend full Vitest.
10. Root and frontend `npm run build` where defined.
11. Root/frontend Playwright/e2e where defined, because properties/process/elements/canvas/3D behavior is user-observable.
12. Overlay pointer-boundary unit/e2e evidence if presentation-adjacent files are touched, preserving the Cycle 026 hotfix contract that the 3D overlay/canvas remain hit-testable and do not become click-through.
13. Refresh the live preview bound on `0.0.0.0:5173`, capture an HTTP 200 reachability probe, and run live smoke for properties dialog, actions/process panel including recursive nodes, elements visibility toggle, representative canvas render/hit/hover, 3D view interaction, and undo/redo without credentials.

The wave is rejected if validation fails for reasons attributable to the implementation or if e2e/live checks are skipped without explicit justified log entries.

## Source-control hygiene for implementation

- The worktree is broadly dirty. Implementation must use path-scoped status/diff before and after edits.
- Touch only files required by the selected implementation scope.
- Do not revert, normalize, stage, or incorporate unrelated dirty changes.
- Do not switch branches, rebase, push, or read secret/config file contents.
- Commit only files intentionally changed by the implementation stage.
- If untracked/dirty files outside scope conflict with implementation, stop and report the conflict rather than sweeping them into the wave.

## Stop conditions

Stop for a reviewed delta proposal or plan edit if implementation requires any of the following:

- keeping `CanvasWorldReadPort.getProcessTree()` after the selected proposal marked it delete-in-this-wave;
- changing persistence schema/replay, `ProjectService`, Drive/auth, or backend/frontend contracts;
- command-backed visibility, undo/redo visibility semantics, visibility history, command history/producer redesign, or `CommandStack` changes;
- broad domain realization ownership redesign, broad projection-plane geometry redesign, or generic app-kernel/facade work;
- package/tooling, validation-platform, preview tooling, docs/spec, or broad test-framework churn;
- UI feature work or visual redesign;
- a need to modify protected surfaces or unrelated dirty worktree changes to make progress.

## Residual risks accepted for implementation

- Raw `getAllProjectionPlanes()` and raw projected-3D getters may remain as explicit residuals if current selectors still require them. That residual must be documented with named callers and future-wave rationale; it must not be disguised as completed port narrowing.
- Visibility remains direct style mutation plus dirty marking for this wave. The architectural improvement is naming the intent boundary and separating it from read-model DTO construction, not solving undo/persistence semantics.
- `ThreeWorldReadPort` may remain largely as an adapter if deeper cleanup would expand into scene-host or domain-realization redesign.
- The dirty worktree increases source-control risk; path-scoped diffs and narrow commits are mandatory.

## Next stage recommendation

Proceed to `cycle-027-implement-runtime-read-model-extractors` (or the manager's equivalent implementation stage name) only if this decision artifact passes review. The implementation stage must follow `proposal-direct.md` plus the constraints in this decision. No additional corrections/review round is needed before implementation because review round 02 reported **NO BLOCKING ISSUES**.
