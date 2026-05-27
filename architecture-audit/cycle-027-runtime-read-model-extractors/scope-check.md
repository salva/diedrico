# Cycle 027 Scope Check — Runtime read-model extractors and presentation DTO ports

**Stage:** `cycle-027-fresh-scout-proposals`  
**Wave-plan entry:** Wave 027 — Runtime read-model extractors and presentation DTO ports  
**Status:** ready for proposal review; no implementation performed.

## Source-control hygiene

- Current broad worktree status is very dirty. The bounded status capture in `validation/scout-source-evidence.stdout.log` records the first 160 status entries and a total of 1787 status lines.
- Unrelated dirty work includes many `.saivage/` records, stale audit artifacts, deleted `.github/.specify` files, and production source/test changes outside this planning task. This task did not revert, normalize, stage, or incorporate that work.
- Secret/config paths appeared only as path names in status output (`.saivage/auth-profiles.json`, `.saivage/config.json`, `.saivage/saivage.json`); their contents were not read.
- Files intentionally created/modified by this task are limited to this Cycle 027 planning directory, validation evidence logs, and the required task report.

## Inputs inspected first

- Reviewed Wave 027 entry in `architecture-audit/wave-plan.md` (captured at `validation/scout-source-evidence.stdout.log`).
- Reviewed plan-extension note and review: `architecture-audit/cycle-027-wave-plan-extension/plan-extension-note.md`, `architecture-audit/cycle-027-wave-plan-extension/review.md`.
- Reviewed Wave 026 completion log: `architecture-audit/cycle-026-tool-interaction-read-context/implementation-log.md`.
- Reviewed urgent 3D interaction hotfix log: `architecture-audit/cycle-026-hotfix-3d-view-interaction-regression/implementation-log.md`.
- Inspected current source samples listed in the stage objective and captured line-numbered evidence in `validation/scout-source-evidence.stdout.log`, `validation/scout-key-files.stdout.log`, and `validation/scout-targeted-lines.stdout.log`.

## Premise check

Wave 027 premises still hold.

1. **RuntimeSession is still the concrete runtime owner and a read-model god-module.** It owns private `World` and `CommandStack` (`frontend/src/application/appShell/RuntimeSession.ts:37-39`) and constructs canvas, process tree, elements panel, three-presentation, active-plane, selection, command-history, selection-deletion, and persistence ports in one class (`RuntimeSession.ts:42-80`, `:83-160`, `:163-183`, `:186-242`, `:263-281`).
2. **Properties dialog read-model logic remains inline and uses raw domain traversal/casts.** `getPropertiesDialogViewModel()` casts `findVisibleElement()` to `any` (`RuntimeSession.ts:303-306`), uses raw world classification (`RuntimeSession.ts:320-328`), realizes point/circle coordinates against `this.world` (`RuntimeSession.ts:331-345`), and derives dependencies with concrete subclass checks (`RuntimeSession.ts:348-362`).
3. **Process-tree read-model/infeasibility logic remains inline.** `processTreeReadPort()` reads the process tree and dependency service directly (`RuntimeSession.ts:83-107`). `createProcessNodeViewModel()` maps action description parts with `getActionDescriptionParts(node, this.world)` and calculates infeasibility with a runtime helper (`RuntimeSession.ts:374-399`). `isActionInfeasible()` resolves elements through the world and calls `element.realize2D(this.world)` (`RuntimeSession.ts:401-412`).
4. **Elements-panel read model and visibility intent remain inline.** `elementsPanelPort()` sorts projection planes, groups points/lines/segments/circles/guides with concrete `instanceof` checks, and formats 3D elements directly (`RuntimeSession.ts:110-149`). `toggleVisibility()` mutates `visualStyle` and calls `world.markDirty()` inside the read-port body (`RuntimeSession.ts:150-158`). `formatElementForPanel()`, `getElementProperties()`, and `findVisibleElement()` use `any` (`RuntimeSession.ts:419-442`).
5. **Canvas presentation port still exposes raw domain collections and process tree.** `CanvasWorldReadPort` returns `ProjectionPlane[]`, 3D domain element arrays, and `ProcessTree`, plus a world-shaped realization context mirroring many `World` methods (`frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:15-28`, `:31-43`, `:46-69`). `CanvasPresentationSelector` and `Projected3DCanvasSelector` call `readPort.getAllProjectionPlanes()` (`CanvasPresentationSelector.ts:27`, `:32`; `Projected3DCanvasSelector.ts:14`). `CanvasVisibilityPolicy` still models visibility around a `Pick<World, 'getProcessTree'>` seam (`frontend/src/application/canvasPresentation/CanvasVisibilityPolicy.ts:5`).
6. **Three presentation is already DTO-oriented at the public interface, but its adapter still centralizes domain traversal and realization.** `ThreeWorldReadPort` imports `World`, auxiliary-plane/concrete guide/segment predicates, creates a broad realization context, traverses all projection planes and reconstructed 3D elements, and calls realization methods in the adapter (`frontend/src/application/threePresentation/ThreeWorldReadPort.ts:6-12`, `:56-78`, `:81-135`). `ThreeView.vue` consumes the bounded port as a shell (`frontend/src/components/panels/ThreeView.vue:45-50`), so the main seam is adapter ownership, not 3D component size.
7. **Vue components currently consume ports/DTOs rather than raw World, and should stay that way.** `ActionsPanel.vue` injects `ProcessTreeReadInjectionKey` and process-history command port (`frontend/src/components/panels/ActionsPanel.vue:51-69`); `ElementsPanel.vue` injects `ElementsPanelInjectionKey` and delegates visibility toggles to the port (`frontend/src/components/panels/ElementsPanel.vue:128-143`, `:220`); `ThreeView.vue` receives `threePresentationPort.getReadPort()` (`ThreeView.vue:45`). No proposal should reintroduce raw `World` props/injection.
8. **The 3D hotfix lesson remains relevant to validation, not scope expansion.** App shell overlay uses `pointer-events: auto` (`frontend/src/App.vue:70`, `:277-278`) and `ThreeView.vue` controls also declare `pointer-events: auto` (`frontend/src/components/panels/ThreeView.vue:91-92`). The hotfix log proves overlay hit testing can regress even when runtime/read-port architecture is untouched, so Wave 027 validation must preserve this contract if presentation-adjacent code changes.

## Selected bounded scope

Implementation proposals should include these read-model/presentation seams:

- Extract properties-dialog view-model building from `RuntimeSession` into a focused application read-model builder/port.
- Extract process-tree read-model, related-action, and infeasibility mapping from `RuntimeSession` into a focused process read-model builder/port.
- Extract elements-panel grouping/formatting and current visibility toggle intent from `RuntimeSession` into a focused elements read-model/intent port, preserving current semantics unless evidence during implementation requires a reviewed plan edit.
- Extract or narrow canvas presentation read-port DTO methods where current selectors can consume behavior-sized DTOs instead of raw projection-plane/process-tree/domain collection access.
- Keep `ThreeView.vue` as a shell and narrow `ThreeWorldReadPort` only where a bounded DTO/adaptor extraction follows directly from current runtime read-model/presentation seams.
- Keep active-plane, selection-read, canvas input transform, and screen-to-3D reads in scope only where they are directly factored into focused runtime read-model ports; do not turn this into a generic application-kernel redesign.

## Explicit out-of-scope stop conditions

Stop for a reviewed wave-plan edit or delta proposal if the implementation requires any of the following:

- Persistence schema/replay, `ProjectService`, Drive/auth, or snapshot/restore contract changes.
- Command history/producer redesign, command-backed visibility semantics, undo/redo persistence semantics, or `CommandStack` changes.
- Backend/frontend contract work.
- Package/tooling, validation-platform, preview-script, docs/spec, or broad test-framework churn.
- Broad `Element2D.realize2D(...)`, projection-plane realization ownership, domain realization context, or global domain model redesign.
- UI feature work or visual redesign of properties/process/elements/3D panels.
- Generic application-kernel or catch-all `RuntimeWorld`/`WorldReadModel` facade that mirrors `World`.

## DELETE list candidates for implementation

- Inline `RuntimeSession.getPropertiesDialogViewModel()`, `describeElementType()`, `describeCoordinates()`, `describeDependencies()`, and style/read helper logic after replacement by a focused properties read-model module.
- Inline `RuntimeSession.createProcessNodeViewModel()`, `isActionInfeasible()`, related-action dependency traversal, and process-node count helper after replacement by a focused process read-model module.
- Inline `RuntimeSession.elementsPanelPort()` grouping/formatting and `toggleVisibility()` raw mutation body after replacement by a focused elements read-model/intent module.
- `RuntimeSession` helper `any` seams in `findVisibleElement()`, `formatElementForPanel()`, and `getElementProperties()` where typed DTO builders replace them.
- Runtime-local `realize2D(this.world)` calls for properties/process read models where focused adapters own realization.
- `CanvasWorldReadPort.getProcessTree()` if visibility/process display decisions move behind named read contexts.
- Raw `CanvasWorldReadPort` collection methods where the selected proposal can replace them with selector-ready DTO snapshots.
- Three adapter world-shaped realization helper methods only where replacement is behavior-sized and directly tied to Wave 027.
- Stale tests that assert read-model construction lives in `RuntimeSession`; replace with focused builder/port tests.

## Dependencies and validation implications

- Depends on Wave 026 because raw tool-context access is already removed; this wave must not regress `ToolContext.world`, `CollectionContext.world`, `context.world`, or `realize2D(context.world)` deletions recorded by Wave 026.
- Must preserve the hotfix overlay pointer contract with unit/e2e/live evidence if touching presentation-adjacent files.
- Mandatory implementation validation should include root/frontend lint, focused Vitest for extracted runtime read-model/presentation modules, full root/frontend Vitest, root/frontend build, root/frontend e2e, live preview refresh on `0.0.0.0:5173`, HTTP probe, and live smoke for properties dialog, process/actions panel, elements visibility, representative canvas rendering/hit/hover, 3D view interaction, and undo/redo.

## Wave-plan adjustment assessment

No wave-plan edit is needed before review. Current source evidence supports the Wave 027 entry as written. The next stage should be `cycle-027-review-round-01` to review the two proposals in `proposals/`.
