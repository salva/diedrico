# Proposal Restructure — Introduce a small RuntimeReadModel composition layer before per-panel extraction

## Summary

Implement Wave 027 one conceptual layer higher than the direct proposal: introduce a small `RuntimeReadModelPorts` composition layer that owns all read-model port factories currently in `RuntimeSession`, then split properties/process/elements/canvas/three builders behind that layer. `RuntimeSession` would only create the concrete `World`/`CommandStack`, initialize/restore them, and hand a private runtime read-model context to the composition layer. This is still bounded to read models and presentation DTOs; it does not redesign persistence, command producers, domain realization, or a general application kernel.

This path is useful if review judges the direct extraction too piecemeal because `RuntimeSession` currently mixes multiple read-model port factories in one class (`RuntimeSession.ts:42-183`, `:201-227`) and would remain overly broad even after moving individual helper bodies.

## Files to change

### New composition layer

- `frontend/src/application/appShell/readModels/RuntimeReadModelPorts.ts`
  - Factory that receives private behavior-sized access to `World` subscriptions, active-plane reads, selection reads, read-model builders, canvas/three adapter factories, and current visibility intent.
  - Returns `CanvasViewPort`, `ProcessTreeReadPort`, `ElementsPanelPort`, `ThreePresentationPort`, `ActivePlaneSelectorPort`, and `SelectionReadPort` wiring functions or equivalent named factories.
- `frontend/src/application/appShell/readModels/RuntimeReadModelContext.ts`
  - A deliberately non-generic context made of named behavior capabilities required by the read-model layer. It must not expose a mirrored `World` API or command mutation.
- Per-concern modules:
  - `PropertiesDialogReadModel.ts`
  - `ProcessTreeReadModel.ts`
  - `ElementsPanelReadModel.ts`
  - `CanvasRuntimeReadModel.ts` or `CanvasPresentationRuntimePort.ts` if canvas input/presentation wiring is extracted.
  - `ThreePresentationRuntimePort.ts` only if three adapter wiring benefits from the shared composition layer.

### Existing app-shell and presentation files

- `frontend/src/application/appShell/RuntimeSession.ts`
  - Remove inline read-model port factory bodies for canvas, process tree, elements panel, three presentation, active-plane selector, and selection read where transferred to `RuntimeReadModelPorts`.
  - Keep command-producing ports, command history, persistence snapshot/restore, initialization/reset, and concrete `World`/`CommandStack` ownership.
- `frontend/src/application/appShell/RuntimeViewPorts.ts`
  - Keep public view-port interfaces or move interfaces to a read-model ports module only if it improves ownership without churn.
- `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts`
- `frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts`
- `frontend/src/application/canvasPresentation/Projected3DCanvasSelector.ts`
- `frontend/src/application/canvasPresentation/CanvasVisibilityPolicy.ts`
- `frontend/src/application/threePresentation/ThreeWorldReadPort.ts`
  - Consume or expose DTO/read-model methods through the new read-model composition layer as needed; keep changes bounded.

### Consumers and tests

- `frontend/src/components/dialogs/PropertiesDialog.vue`
- `frontend/src/components/panels/ActionsPanel.vue`
- `frontend/src/components/panels/ProcessTreeNode.vue`
- `frontend/src/components/panels/ElementsPanel.vue`
- `frontend/src/components/workspace/SvgCanvas.vue`
- `frontend/src/components/panels/ThreeView.vue`
  - Type alignment only; no UI redesign.
- Focused tests for the composition layer plus per-concern builders and RuntimeSession delegation.

## Files/tests/docs/fixtures to DELETE

- Delete all read-model port factory bodies from `RuntimeSession` that move into `RuntimeReadModelPorts`:
  - `canvasViewPort()` body may become a one-line delegation;
  - `processTreeReadPort()` body;
  - `elementsPanelPort()` body;
  - `threePresentationPort()` body;
  - `activePlaneSelectorPort()` and `selectionReadPort()` bodies if they are included in the composition layer.
- Delete inline helper methods and imports from `RuntimeSession` that only supported these read models.
- Delete broad `any` helper seams and runtime-local `realize2D(this.world)` calls in moved read-model logic.
- Delete `CanvasWorldReadPort.getProcessTree()` and raw collection methods only where the new composition layer gives selectors behavior-sized DTOs.
- Delete stale tests that instantiate `RuntimeSession` specifically to inspect inline read-model formatting; replace with tests for `RuntimeReadModelPorts` and builders.
- Do not delete or rewrite persistence, command history/producer ports, `CommandStack`, `ProjectService`, backend, package/tooling, Drive/auth, docs/specs, preview scripts, or domain realization internals.

## Expected behavior change

No intended user-visible behavior change. This proposal changes ownership more aggressively than the direct proposal but preserves current DTO outputs and current visibility semantics.

- RuntimeSession becomes a smaller owner/composer with read-model ports delegated to `RuntimeReadModelPorts`.
- Vue components continue injecting the same runtime ports and do not gain raw `World` access.
- Properties/process/elements/canvas/three behavior remains equivalent.
- 3D overlay pointer ownership remains `pointer-events: auto` and covered by tests/live smoke if presentation-adjacent files are touched.

## Risks

- The new `RuntimeReadModelContext` could become a renamed `World` facade. This is the main risk. It must be limited to named behaviors and split by concern if it starts mirroring `World`.
- Moving many port factories at once increases churn and test surface compared with the direct proposal.
- Active-plane and selection-read extraction may be less central than properties/process/elements; include them only if it makes RuntimeSession materially cleaner without creating a generic kernel.
- Review may judge this path as over-structuring for the current wave. If so, use the direct proposal.

## Validation plan for implementation

Same mandatory cadence as the direct proposal, with extra focused coverage for `RuntimeReadModelPorts` composition:

1. Pre-edit scoped status/diff and seam scans.
2. Focused Vitest for `RuntimeReadModelPorts` delegating to properties/process/elements/canvas/three builders.
3. Focused Vitest for each per-concern read-model builder.
4. Focused RuntimeSession tests proving it wires the composition layer without exposing raw `World` to Vue/components/tools.
5. Focused canvas/three presentation tests where port DTOs change.
6. Overlay pointer-boundary tests/e2e evidence if touching presentation-adjacent files.
7. Static scans for no generic `RuntimeWorld`/`WorldReadModel` facade, no production Vue raw `World`, no Wave 026 tool-context regression, and deleted inline RuntimeSession helpers.
8. Root/frontend lint, full Vitest, build, e2e.
9. Live preview refresh on `0.0.0.0:5173`, HTTP 200, and live smoke for properties dialog, actions/process panel, elements visibility, canvas render/hit/hover, 3D interaction, and undo/redo.

## No-backcompat rationale

The old inline RuntimeSession read-model port factories are internal architecture. If a composition layer is selected, keeping old inline factories as wrappers would preserve duplicate paths and undermine the refactor. Delete the old bodies and tests that depend on them; update consumers to the new owned read-model ports directly.

## Stop conditions

Stop for reviewed plan edit if this path expands into command mutation, persistence schema/replay, ProjectService, backend/frontend contracts, Drive/auth, package/tooling, validation platform, docs/spec, preview tooling, broad domain realization redesign, UI feature work, or a generic application kernel. If the context starts mirroring `World`, abandon or split it rather than preserving a renamed facade.

## Recommendation

Prefer `proposal-direct.md` unless review concludes `RuntimeSession` will remain too broad after per-concern extraction. The direct path has lower churn and lower risk of inventing a generic runtime facade. This restructure path is the fallback if the architecture problem is judged to be the ownership of read-model port factory composition itself, not only the inline helper bodies.
