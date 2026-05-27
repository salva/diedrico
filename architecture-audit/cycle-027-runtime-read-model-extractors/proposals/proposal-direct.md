# Proposal Direct — Extract focused runtime read-model builders and narrow presentation DTO ports

## Summary

Implement Wave 027 as a direct extraction from `RuntimeSession`: move properties-dialog, process-tree, and elements-panel read-model construction into focused application modules, then narrow canvas/three presentation read ports only where current selectors can consume behavior-sized DTOs without broader domain realization redesign. `RuntimeSession` remains the composition owner of `World` and `CommandStack`, but it stops containing inline read-model traversal, formatting, concrete class classification, and visibility mutation bodies.

The elements work is deliberately split into two adjacent responsibilities, not one read/write “read-model” object:

1. `ElementsPanelReadModel` builds the display DTOs only: projection-plane grouping/sorting, 2D/3D element DTO formatting, typed element property formatting, and visible-state display.
2. A small adjacent visibility intent port/service owns the current `toggleElementVisibility` application intent. It preserves the existing direct `visualStyle` mutation plus dirty-state semantics for this wave, but it is **not represented as part of the elements read model itself** and must not be hidden inside a DTO builder.

If implementing this split shows that visibility cleanup honestly requires command-backed visibility, undo/redo semantics, persistence schema/replay, or visibility history redesign, the wave must stop for a reviewed plan edit instead of silently expanding Wave 027.

## Files to change

### New focused application modules

- `frontend/src/application/appShell/readModels/PropertiesDialogReadModel.ts`
  - Owns `PropertiesDialogViewModel` creation, element type labeling, coordinate formatting, dependency extraction, style view, and typed visible-element lookup.
- `frontend/src/application/appShell/readModels/ProcessTreeReadModel.ts`
  - Owns `ProcessTreeReadModel` creation, action description mapping, related-action lookup, action infeasibility calculation, node counting, and tree subscription plumbing helper types if useful.
- `frontend/src/application/appShell/readModels/ElementsPanelReadModel.ts`
  - Owns projection-plane grouping/sorting, 2D/3D element DTO formatting, typed element property formatting, and visible-state display only.
  - Must not expose mutation methods on the read-model builder or DTOs.
- `frontend/src/application/appShell/readModels/ElementVisibilityIntent.ts` or an equivalently small adjacent module
  - Owns the named `toggleElementVisibility` application intent while preserving current direct style/dirty semantics.
  - Receives only the behavior-sized lookup/mutation/dirty callbacks it needs; it must not become a command facade, persistence hook, undo/redo participant, or read-model builder.
- Optional shared local types/helpers under `frontend/src/application/appShell/readModels/RuntimeReadModelContext.ts` if needed to pass precise behavior-sized read/realization dependencies without exposing all of `World`.

### Existing runtime/app-shell files

- `frontend/src/application/appShell/RuntimeSession.ts`
  - Replace inline properties/process/elements helper methods with construction/wiring of the focused builders and the adjacent visibility intent.
  - Keep private `World`/`CommandStack`, command producer ports, persistence handles, selection, active-plane, and canvas input transforms unless a small typed extraction is directly needed by the new builders.
  - Remove unused domain imports once inline helpers disappear.
- `frontend/src/application/appShell/RuntimeViewPorts.ts`
  - Keep public DTO shapes stable where possible; tighten types if the builder interfaces need named DTO exports.
  - Keep the elements panel port shape honest: display DTO creation comes from the read-model builder, while the visibility toggle delegates to the adjacent intent boundary rather than being described as read-model state.

### Presentation read ports/selectors

- `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts`
  - Apply the caller map below. Delete `getProcessTree()` in this wave by replacing the visibility seam with a behavior-sized visibility method or policy input; do not leave process-tree access on the canvas read port.
  - Keep `getAllProjectionPlanes()` only as an explicit residual for current plane-owned 2D canvas traversal and projected-3D projection iteration unless the implementation can replace both current callers with behavior-sized selector DTOs inside this wave without inventing a generic facade.
  - Keep raw 3D collection getters only as an explicit residual for `Projected3DCanvasSelector` unless this wave introduces a concrete projected-3D canvas DTO selector method that deletes all three raw getters together.
- `frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts`
- `frontend/src/application/canvasPresentation/Projected3DCanvasSelector.ts`
- `frontend/src/application/canvasPresentation/CanvasVisibilityPolicy.ts`
  - Consume narrowed canvas read methods where available; delete the process-tree/world-shaped visibility seam replaced by a dedicated canvas visibility capability.
  - Do not route selectors through a generic `World`/`RuntimeWorld` facade.
- `frontend/src/application/threePresentation/ThreeWorldReadPort.ts`
  - Extract internal scene DTO factory functions if this reduces adapter size without changing public `ThreeWorldReadPort`; narrow or document realization-context methods. Do not rewrite `ThreeView.vue` or the scene host.

### Concrete caller map and residual rule for `CanvasWorldReadPort`

The implementation decision for each broad canvas seam is caller-by-caller and must be reflected in code/tests/logs:

| Current seam | Current named callers/evidence | Wave 027 treatment |
| --- | --- | --- |
| `getProcessTree()` | `CanvasVisibilityPolicy.isCanvasElementVisible()` accepts `Pick<World, 'getProcessTree'>` and is called by `CanvasPresentationSelector` for points, lines, and circles (`CanvasPresentationSelector.ts:37`, `:48`, `:75`). `CanvasWorldReadPort` exposes `getProcessTree()` only to satisfy that visibility policy. | **Delete in this wave.** Replace the process-tree-shaped dependency with a behavior-sized visibility capability such as `isElementVisible(element)` or a policy callback owned by the canvas adapter. The canvas port/selectors must not expose or consume `ProcessTree`. |
| `getAllProjectionPlanes()` | `CanvasPresentationSelector` iterates planes twice to build transform maps and 2D render/query items (`CanvasPresentationSelector.ts:27`, `:32`). `Projected3DCanvasSelector` also iterates planes to project reconstructed 3D entities onto each projection plane (`Projected3DCanvasSelector.ts:14`). The realization context inside `CanvasWorldReadPort` also supplies `getAllProjectionPlanes()` for domain realization internals. | **Explicit residual unless fully deleted by concrete DTO selectors.** It may remain because current selectors still need plane-owned `getAllPoints()/getAllLines()/getAllCircles()` traversal and projected-3D per-plane iteration. If kept, document it in the implementation log as a residual with these callers and future-wave rationale. Do not wrap it in a generic facade. Delete it only if both 2D canvas traversal and projected-3D projection iteration are replaced by named behavior-sized DTO methods in the same wave. |
| `getAll3DPoints()`, `getAll3DLines()`, `getAll3DSegments()` | `Projected3DCanvasSelector` uses these raw collections to render projected 3D points, lines, and segments onto each projection plane (`Projected3DCanvasSelector.ts:19`, `:36`, `:55`). The elements panel currently has separate app-shell 3D grouping in `RuntimeSession`, but that is not a canvas-port caller. | **Explicit residual unless deleted as a complete projected-3D DTO seam.** Keep all three together if `Projected3DCanvasSelector` still owns projection math. Delete all three only if a named method such as `getProjected3DCanvasItems(planeTransforms)` or equivalent behavior-sized selector DTO source replaces the selector's raw 3D collection loops without widening scope into domain realization redesign. Partial deletion of only one raw 3D getter is not acceptable. |
| 2D/3D realization methods (`realizePoint2D`, `realizeLine2D`, `realizeCircle2D`, `realizePoint3D`, `realizeLine3D`, `realizeSegment3D`) | `CanvasPresentationSelector` and `Projected3DCanvasSelector` use these methods immediately after retrieving plane/domain entities. | **Residual unless the corresponding entity collection seam is replaced.** Do not claim realization narrowing while selectors still receive raw domain entities. If a DTO selector replaces a collection seam, delete the paired realization method(s) at the same time. |

Residual rule: a broad canvas method can remain only when this table names its current callers, explains why a behavior-sized DTO replacement would exceed Wave 027, and records the residual in `implementation-log.md`. A method marked “delete in this wave” must be absent from the final implementation; keeping it requires a reviewed proposal/plan correction before implementation proceeds.

### Vue consumers and tests

- `frontend/src/components/dialogs/PropertiesDialog.vue` only if the view-model contract becomes more precise with no UI behavior change.
- Process-tree consumers: `frontend/src/components/panels/ActionsPanel.vue` and `frontend/src/components/panels/ProcessTreeNode.vue` are both in scope for type/port-name alignment with the extracted `ProcessTreeReadModel`; `ProcessTreeNode.vue` must be checked because it renders the recursive node DTO shape and infeasibility/related-action flags supplied by the process read model. No UI behavior or recursive component redesign is intended.
- Elements consumer: `frontend/src/components/panels/ElementsPanel.vue` only for type/port-name alignment with the extracted elements read model and adjacent visibility intent.
- `frontend/src/components/workspace/SvgCanvas.vue` and `frontend/src/components/panels/ThreeView.vue` only for presentation port typing alignment.
- Focused tests under current frontend test locations for the new read-model modules, visibility intent, RuntimeSession wiring, canvas read-port narrowing/residuals, three read-port adapter behavior if changed, recursive `ProcessTreeNode.vue` DTO behavior, and overlay pointer-boundary preservation if presentation-adjacent files are touched.

## Files/tests/docs/fixtures to DELETE

- Delete inline `RuntimeSession` helpers replaced by builders:
  - properties helpers: `getPropertiesDialogViewModel`, `describeElementType`, `describeCoordinates`, `describeDependencies`, `styleView` if moved;
  - process helpers: `createProcessNodeViewModel`, `isActionInfeasible`, `countProcessNodeViewModels` if moved;
  - elements helpers: `formatElementForPanel`, `getElementProperties`, `findVisibleElement` if moved.
- Delete any inline `RuntimeSession` visibility-toggle body moved behind the adjacent visibility intent; do not duplicate it in both `RuntimeSession` and an elements read-model module.
- Delete `RuntimeSession` broad `any`/`as any` read-model seams where builders provide typed element unions/DTOs.
- Delete runtime-local `realize2D(this.world)` calls for properties/process read models.
- Delete `CanvasWorldReadPort.getProcessTree()` and the canvas `Pick<World, 'getProcessTree'>` visibility seam in this wave.
- Delete raw canvas `getAllProjectionPlanes()` and raw 3D collection getters only when replaced by behavior-sized selector DTO methods for all current named callers in the same implementation; otherwise keep them as explicit residuals documented with the caller map above.
- Delete stale tests that assert `RuntimeSession` directly formats properties/process/elements data; replace with builder/intent tests.
- Do **not** delete persistence, command history, command producers, backend, package scripts, docs/specs, Drive/auth, preview scripts, or broad domain realization files.

## Expected behavior change

No intended user-visible behavior change.

- Properties dialog still shows the same labels, type, coordinates, dependency ids, created-by placeholder, and style values.
- Actions/process panel still shows the same tree, descriptions, infeasibility indicators, related-action highlighting, subprocess stack state, rename/toggle behavior, and subscriptions.
- `ProcessTreeNode.vue` still renders the same recursive node DTO structure and flags; the extraction changes ownership of those DTOs, not panel behavior.
- Elements panel still groups 2D/3D elements the same way and toggles visibility with current direct style/dirty semantics, but the mutation is named as an adjacent application intent rather than hidden in a read-model builder or read-port object literal.
- Canvas presentation and 3D view render the same geometry; any port narrowing is internal. `CanvasWorldReadPort.getProcessTree()` is removed, while raw projection-plane and projected-3D collection seams may remain only as documented residuals if their current selector callers still need them.
- 3D overlay remains hit-testable and does not become click-through.

## Risks

- Builder extraction could create a generic `RuntimeWorld` facade. Mitigation: pass behavior-sized functions or a small explicit context per builder; do not mirror `World` wholesale.
- Elements visibility may deserve command-backed undo/persistence semantics. Mitigation: preserve current direct style/dirty semantics behind a named adjacent intent that is not part of the read model; if honest cleanup requires command/persistence/undo/history redesign, stop for a reviewed plan edit.
- Canvas selectors may still legitimately need raw projection-plane iteration until a deeper selector/domain DTO wave. Mitigation: use the caller map above, delete `getProcessTree()` now, narrow only where practical, and document any residual raw collection method with named callers and rationale.
- Projected 3D canvas rendering may tempt a partial raw-getter cleanup. Mitigation: keep `getAll3DPoints()`/`getAll3DLines()`/`getAll3DSegments()` together as residuals unless a complete projected-3D DTO seam replaces all three.
- Three adapter cleanup can overreach into scene-host or domain-realization redesign. Mitigation: keep `ThreeView.vue` shell and public port stable unless small DTO factory extraction is directly tied to this wave.
- Very dirty worktree can obscure ownership. Mitigation: use path-scoped diffs/status and commit only Cycle 027 planning/implementation files when implementation happens.

## Validation plan for implementation

Capture all stdout/stderr under `architecture-audit/cycle-027-runtime-read-model-extractors/validation/`.

1. Pre-edit path-scoped status/diff and static scans for the scoped seams.
2. Focused Vitest for properties read-model builder.
3. Focused Vitest for process-tree read model, related-action mapping, infeasibility behavior, and recursive `ProcessTreeNode.vue` DTO rendering/flags.
4. Focused Vitest for elements-panel read model and the adjacent visibility intent, including proof that the toggle is not exported as read-model state and still marks dirty with current semantics.
5. Focused Vitest for RuntimeSession wiring and any changed canvas/three presentation read ports/selectors.
6. Focused canvas seam tests/static assertions proving `CanvasWorldReadPort.getProcessTree()` and the `Pick<World, 'getProcessTree'>` visibility seam are gone, and proving any retained `getAllProjectionPlanes()` / raw 3D getters match the documented caller-map residuals.
7. Existing/focused overlay pointer-boundary unit/e2e test evidence if presentation-adjacent files are touched; carry forward the Cycle 026 hotfix lesson that `.three-view-overlay`, `.three-view-panel`, and `.three-canvas` must remain hit-testable rather than click-through.
8. Static/architecture scans proving no production Vue component receives concrete `World`, no deleted RuntimeSession helper seams remain, no `ToolContext.world`/`CollectionContext.world` regression occurs, no generic world-like facade was added, and no command-backed visibility/persistence/undo/history redesign slipped into the wave.
9. Root and frontend lint where scripts are defined.
10. Root and frontend full Vitest.
11. Root and frontend build.
12. Root and frontend Playwright/e2e because properties/process/elements/canvas/3D behavior is user-observable.
13. Refresh preview from the working command known to bind correctly (`frontend` workspace `npm run dev -- --host 0.0.0.0` if root forwarding remains broken), capture HTTP 200, and run live smoke for properties dialog, actions/process panel including recursive process-node display, elements visibility toggle, canvas render/hit/hover, 3D view interaction, and undo/redo without credentials.

## No-backcompat rationale

These are internal read-model ownership seams. Keeping inline `RuntimeSession` formatting plus extracted builders would preserve the god-module and invite dual paths. Delete replaced helpers, casts, the `getProcessTree()` canvas seam, and any broad port methods that have behavior-sized replacements instead of adding compatibility wrappers. Preserve user behavior by updating active consumers/tests directly. When raw projection-plane or projected-3D collection methods cannot be honestly deleted in this wave, keeping them is not a compatibility shim; it is an explicit residual with named callers and future-wave rationale so Wave 027 does not invent a fake facade.

## Stop conditions

Stop and request a reviewed plan edit if implementation requires persistence schema/replay, `ProjectService`, command-backed visibility, visibility undo/redo semantics, visibility history redesign, command producer/history redesign, backend/frontend contracts, Drive/auth, package/tooling, validation-platform, docs/spec, preview tooling, broad domain realization ownership, or a generic application-kernel redesign.

Stop specifically if removing canvas raw projection-plane or projected-3D collection access would require a broad canvas/domain DTO redesign beyond the concrete caller map above; document those methods as residuals instead of fabricating a generic facade. Conversely, stop for proposal correction if `CanvasWorldReadPort.getProcessTree()` cannot be deleted, because this proposal marks that process-tree seam as delete-in-this-wave.
