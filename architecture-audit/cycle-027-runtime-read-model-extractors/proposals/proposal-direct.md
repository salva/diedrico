# Proposal Direct — Extract focused runtime read-model builders and narrow presentation DTO ports

## Summary

Implement Wave 027 as a direct extraction from `RuntimeSession`: move properties-dialog, process-tree, and elements-panel read-model construction into focused application modules, then narrow canvas/three presentation read ports only where current selectors can consume behavior-sized DTOs without broader domain realization redesign. `RuntimeSession` remains the composition owner of `World` and `CommandStack`, but it stops containing inline read-model traversal, formatting, concrete class classification, and visibility mutation bodies.

## Files to change

### New focused application modules

- `frontend/src/application/appShell/readModels/PropertiesDialogReadModel.ts`
  - Owns `PropertiesDialogViewModel` creation, element type labeling, coordinate formatting, dependency extraction, style view, and typed visible-element lookup.
- `frontend/src/application/appShell/readModels/ProcessTreeReadModel.ts`
  - Owns `ProcessTreeReadModel` creation, action description mapping, related-action lookup, action infeasibility calculation, node counting, and tree subscription plumbing helper types if useful.
- `frontend/src/application/appShell/readModels/ElementsPanelReadModel.ts`
  - Owns projection-plane grouping/sorting, 2D/3D element DTO formatting, typed element property formatting, visible-state display, and a named `toggleElementVisibility` intent preserving current direct style/dirty semantics.
- Optional shared local types/helpers under `frontend/src/application/appShell/readModels/RuntimeReadModelContext.ts` if needed to pass precise behavior-sized read/realization dependencies without exposing all of `World`.

### Existing runtime/app-shell files

- `frontend/src/application/appShell/RuntimeSession.ts`
  - Replace inline properties/process/elements helper methods with construction/wiring of the focused builders.
  - Keep private `World`/`CommandStack`, command producer ports, persistence handles, selection, active-plane, and canvas input transforms unless a small typed extraction is directly needed by the new builders.
  - Remove unused domain imports once inline helpers disappear.
- `frontend/src/application/appShell/RuntimeViewPorts.ts`
  - Keep public DTO shapes stable where possible; tighten types if the builder interfaces need named DTO exports.

### Presentation read ports/selectors

- `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts`
  - Replace raw collection/process-tree methods with selector-ready methods where directly supported by current selector call sites; at minimum remove `getProcessTree()` if no selector still needs process-tree access after read-model extraction.
  - If raw `getAllProjectionPlanes()` remains because selectors still need plane-owned element iteration, document it as a bounded residual with caller map and future-wave rationale rather than wrapping it in a generic facade.
- `frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts`
- `frontend/src/application/canvasPresentation/Projected3DCanvasSelector.ts`
- `frontend/src/application/canvasPresentation/CanvasVisibilityPolicy.ts`
  - Consume narrowed canvas read methods where available; delete any process-tree/world-shaped visibility seam replaced by the new read-model context.
- `frontend/src/application/threePresentation/ThreeWorldReadPort.ts`
  - Extract internal scene DTO factory functions if this reduces adapter size without changing public `ThreeWorldReadPort`; narrow or document realization-context methods. Do not rewrite `ThreeView.vue` or the scene host.

### Vue consumers and tests

- `frontend/src/components/dialogs/PropertiesDialog.vue` only if the view-model contract becomes more precise with no UI behavior change.
- `frontend/src/components/panels/ActionsPanel.vue`, `frontend/src/components/panels/ProcessTreeNode.vue`, `frontend/src/components/panels/ElementsPanel.vue` only for type/port-name alignment.
- `frontend/src/components/workspace/SvgCanvas.vue` and `frontend/src/components/panels/ThreeView.vue` only for presentation port typing alignment.
- Focused tests under current frontend test locations for the new read-model modules, RuntimeSession wiring, canvas read-port narrowing, three read-port adapter behavior if changed, and overlay pointer-boundary preservation if presentation-adjacent files are touched.

## Files/tests/docs/fixtures to DELETE

- Delete inline `RuntimeSession` helpers replaced by builders:
  - properties helpers: `getPropertiesDialogViewModel`, `describeElementType`, `describeCoordinates`, `describeDependencies`, `styleView` if moved;
  - process helpers: `createProcessNodeViewModel`, `isActionInfeasible`, `countProcessNodeViewModels` if moved;
  - elements helpers: `formatElementForPanel`, `getElementProperties`, `findVisibleElement` if moved.
- Delete `RuntimeSession` broad `any`/`as any` read-model seams where builders provide typed element unions/DTOs.
- Delete runtime-local `realize2D(this.world)` calls for properties/process read models.
- Delete `CanvasWorldReadPort.getProcessTree()` if no active canvas selector needs it.
- Delete raw canvas collection methods only when replaced by behavior-sized selector DTO methods in the same implementation.
- Delete stale tests that assert `RuntimeSession` directly formats properties/process/elements data; replace with builder tests.
- Do **not** delete persistence, command history, command producers, backend, package scripts, docs/specs, Drive/auth, preview scripts, or broad domain realization files.

## Expected behavior change

No intended user-visible behavior change.

- Properties dialog still shows the same labels, type, coordinates, dependency ids, created-by placeholder, and style values.
- Actions/process panel still shows the same tree, descriptions, infeasibility indicators, related-action highlighting, subprocess stack state, rename/toggle behavior, and subscriptions.
- Elements panel still groups 2D/3D elements the same way and toggles visibility with current direct style/dirty semantics, but the mutation is named as an application intent rather than hidden in a read-port object literal.
- Canvas presentation and 3D view render the same geometry; any port narrowing is internal.
- 3D overlay remains hit-testable and does not become click-through.

## Risks

- Builder extraction could create a generic `RuntimeWorld` facade. Mitigation: pass behavior-sized functions or a small explicit context per builder; do not mirror `World` wholesale.
- Elements visibility may deserve command-backed undo/persistence semantics. Mitigation: preserve current semantics behind a named intent; if honest cleanup requires command/persistence redesign, stop for a reviewed plan edit.
- Canvas selectors may still legitimately need raw projection-plane iteration until a deeper selector/domain DTO wave. Mitigation: narrow only where practical and document any residual raw collection method with caller map.
- Three adapter cleanup can overreach into scene-host or domain-realization redesign. Mitigation: keep `ThreeView.vue` shell and public port stable unless small DTO factory extraction is directly tied to this wave.
- Very dirty worktree can obscure ownership. Mitigation: use path-scoped diffs/status and commit only Cycle 027 planning/implementation files when implementation happens.

## Validation plan for implementation

Capture all stdout/stderr under `architecture-audit/cycle-027-runtime-read-model-extractors/validation/`.

1. Pre-edit path-scoped status/diff and static scans for the scoped seams.
2. Focused Vitest for properties read-model builder.
3. Focused Vitest for process-tree read model, related-action mapping, and infeasibility behavior.
4. Focused Vitest for elements-panel read model and visibility intent.
5. Focused Vitest for RuntimeSession wiring and any changed canvas/three presentation read ports/selectors.
6. Existing/focused overlay pointer-boundary unit/e2e test evidence if presentation-adjacent files are touched.
7. Static/architecture scans proving no production Vue component receives concrete `World`, no deleted RuntimeSession helper seams remain, no `ToolContext.world`/`CollectionContext.world` regression occurs, and no generic world-like facade was added.
8. Root and frontend lint where scripts are defined.
9. Root and frontend full Vitest.
10. Root and frontend build.
11. Root and frontend Playwright/e2e because properties/process/elements/canvas/3D behavior is user-observable.
12. Refresh preview from the working command known to bind correctly (`frontend` workspace `npm run dev -- --host 0.0.0.0` if root forwarding remains broken), capture HTTP 200, and run live smoke for properties dialog, actions/process panel, elements visibility toggle, canvas render/hit/hover, 3D view interaction, and undo/redo without credentials.

## No-backcompat rationale

These are internal read-model ownership seams. Keeping inline `RuntimeSession` formatting plus extracted builders would preserve the god-module and invite dual paths. Delete replaced helpers, casts, and broad port methods instead of adding compatibility wrappers. Preserve user behavior by updating active consumers/tests directly.

## Stop conditions

Stop and request a reviewed plan edit if implementation requires persistence schema/replay, `ProjectService`, command-backed visibility, command producer/history redesign, backend/frontend contracts, Drive/auth, package/tooling, validation-platform, docs/spec, preview tooling, broad domain realization ownership, or a generic application-kernel redesign.
