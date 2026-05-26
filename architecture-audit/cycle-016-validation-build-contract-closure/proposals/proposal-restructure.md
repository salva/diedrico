# Proposal Restructure — Introduce a presentation interaction policy boundary

## Intent

Solve the same residual problem one conceptual layer higher: create a small application-owned `presentationInteraction` boundary that owns cross-surface interaction state and policies instead of wiring panel events directly into `App.vue` or the canvas. This treats panel highlighting, canvas hover/cascade highlighting, and overlay pointer policy as one presentation-interaction contract.

## Files to change

- Add `frontend/src/application/presentationInteraction/PresentationInteractionState.ts`
  - Typed DTO/state for highlighted element ids, temporary/permanent highlight source, and overlay pointer mode.
- Add `frontend/src/application/presentationInteraction/PresentationInteractionController.ts`
  - Methods such as `highlightElements(source, ids, temporary)`, `clearHighlight(source)`, and `overlayPolicy()`.
- `frontend/src/App.vue`
  - Compose/provide the controller; remove no-op highlight handlers and delegate panel events to the controller.
  - Bind overlay CSS classes/data attributes from controller policy.
- `frontend/src/components/panels/ElementsPanel.vue`, `ActionsPanel.vue`, `ProcessTreeNode.vue`
  - Keep typed highlight events only as presentation intents, not direct canvas knowledge.
- `frontend/src/components/workspace/SvgCanvas.vue`
  - Consume the controller/state when building `CanvasPresentationController` context instead of owning only local hover plus selection/cascade highlight state.
  - Delete routine interaction logs touched by this path.
- `frontend/src/components/panels/ThreeView.vue` and overlay CSS in `App.vue`
  - Consume the policy for explicit overlay pointer behavior.
- `frontend/src/components/toolbars/ToolFamilyButton.vue`
  - Delete routine logs in presentation interaction controls.
- `frontend/vite.config.ts`
  - Delete stale backend proxy as adjacent app-runtime cleanup if review accepts it in this wave.
- Tests under `frontend/tests/unit/application/presentationInteraction/`, existing canvas presentation tests, panel component tests, architecture tests, and e2e current UI specs.

## Files/tests/docs/fixtures to DELETE

- Delete `App.vue` no-op highlight handlers.
- Delete direct ad hoc panel-to-canvas highlight wiring that bypasses the new controller.
- Delete duplicate highlight storage if both `useHoverHighlight` and a new presentation state would otherwise own the same concept; either fold `useHoverHighlight` into the new boundary or make it a thin adapter.
- Delete routine presentation `console.log` calls in touched files.
- Delete stale Vite `/api` backend proxy if included by decision.
- Delete tests that assert implementation-specific no-op highlight behavior or click-around-overlay workarounds without an explicit policy assertion.

## Expected behavior change

- Cross-surface highlighting becomes a named application presentation contract shared by panels and canvas selectors.
- The overlay pointer/hit-test behavior is centralized and documented by executable tests rather than incidental CSS/e2e coordinate choices.
- Canvas presentation model can consume a single interaction-state input for hover, panel highlight, and cascade highlight instead of merging unrelated local/global sources ad hoc.

## Risks

- A new boundary may be overkill if the accepted behavior is simply to delete panel highlight emits. Review should reject this proposal if no current user-facing highlight behavior is worth preserving.
- Introducing another state owner can duplicate `selectionStore` or `useHoverHighlight` unless the implementation aggressively deletes or adapts the old owner.
- Scope can creep into a full interaction-state architecture. Keep the boundary limited to highlight and overlay pointer policy.

## Validation plan

1. Unit tests for `presentationInteraction` state/controller: temporary highlights clear by source, permanent highlights persist until explicit clear, overlay policy returns the intended mode.
2. Focused canvas presentation tests proving controller highlight ids affect render DTO style/selection state.
3. Component tests for panels emitting typed presentation intents and `App.vue` delegating through the controller.
4. Focused Playwright for panel highlight feedback and overlay pointer policy.
5. Static architecture tests: no no-op highlight handlers, no duplicate highlight owners, no stale backend proxy if deleted, and no routine logs in touched presentation files.
6. Mandatory full cadence: root/frontend lint, focused Vitest, full root/frontend Vitest, root/frontend build, root/frontend e2e, live preview refresh/probe and live browser smoke.

## No-backcompat/aggressive-deletion rationale

Prefer a single explicit presentation-interaction owner over preserving no-op handlers, duplicate hover stores, or implicit overlay behavior. If an old highlight path is not part of the current product contract, delete it rather than adapting it.
