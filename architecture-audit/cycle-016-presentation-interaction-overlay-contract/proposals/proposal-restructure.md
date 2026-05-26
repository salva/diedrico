# Proposal Restructure — Introduce a small presentation interaction policy boundary

## Intent

Solve the selected residual one conceptual layer higher by introducing a focused application-owned presentation interaction boundary. This boundary would own cross-surface highlight state and overlay pointer policy instead of wiring panel events directly through `App.vue` or ad hoc canvas state.

## Files to change

- Add `frontend/src/application/presentationInteraction/PresentationInteractionState.ts`
  - Typed DTO/state for highlighted element ids, highlight source, temporary/permanent mode, and overlay pointer mode.
- Add `frontend/src/application/presentationInteraction/PresentationInteractionController.ts`
  - Methods such as `highlightElements(source, ids, temporary)`, `clearHighlight(source)`, `currentHighlights()`, and `overlayPolicy()`.
- `frontend/src/App.vue`
  - Compose/provide the controller; remove no-op highlight handlers; delegate panel highlight events to the controller.
  - Bind overlay policy through explicit class/data attributes.
- `frontend/src/components/panels/ElementsPanel.vue`, `ActionsPanel.vue`, `ProcessTreeNode.vue`
  - Keep typed highlight events only as presentation intents.
- `frontend/src/components/workspace/SvgCanvas.vue`
  - Consume controller highlight state when building the canvas presentation read model instead of relying only on local hover and selection/cascade state.
  - Delete routine interaction logs touched by this path.
- `frontend/src/components/panels/ThreeView.vue` and overlay CSS in `App.vue`
  - Consume the policy for explicit overlay pointer behavior.
- `frontend/src/components/toolbars/ToolFamilyButton.vue`
  - Delete routine logs in presentation interaction controls.
- `frontend/vite.config.ts`
  - Delete stale backend proxy as adjacent app-runtime cleanup if review accepts it.
- Tests under `frontend/tests/unit/application/presentationInteraction/`, existing canvas presentation tests, panel component tests, architecture/static tests, and e2e current UI specs.

## Files/tests/docs/fixtures to DELETE

- Delete `App.vue` no-op highlight handlers.
- Delete direct ad hoc panel-to-canvas highlight wiring that bypasses the controller.
- Delete duplicate highlight storage if both `useHoverHighlight` and the new presentation interaction state would own the same concept; either fold `useHoverHighlight` into the new boundary or make it a thin adapter.
- Delete routine presentation `console.log` calls in touched files.
- Delete stale Vite `/api` backend proxy if included by decision.
- Delete tests that assert implementation-specific no-op highlight behavior or click-around-overlay workarounds without explicit policy assertions.

## Expected behavior change

- Cross-surface highlighting becomes a named application presentation contract shared by panels and canvas selectors.
- Overlay pointer/hit-test behavior is centralized and executable tests document it.
- Canvas presentation model consumes one interaction-state input for hover/panel/cascade highlight instead of merging unrelated local/global sources ad hoc.

## Risks

- This may be over-structured if the accepted product behavior is simply to delete panel highlight emits. Review should reject this proposal if no current user-facing highlight behavior is worth preserving.
- A new state owner can duplicate `selectionStore` or `useHoverHighlight` unless old ownership is aggressively deleted or made a thin adapter.
- Scope can creep into a full interaction-state architecture; implementation must stay limited to highlight and overlay policy.

## Validation plan

1. Unit tests for presentation interaction state/controller: temporary highlights clear by source, permanent highlights persist until explicit clear, overlay policy returns the intended mode.
2. Focused canvas presentation tests proving controller highlight ids affect render DTO style/selection state.
3. Component tests for panel typed intents and `App.vue` delegation.
4. Focused Playwright for panel highlight feedback and overlay pointer policy.
5. Static tests/scans: no no-op highlight handlers, no duplicate highlight owners, no stale backend proxy if deleted, and no routine logs in touched presentation files.
6. Mandatory full cadence: root/frontend lint, focused Vitest, full root/frontend Vitest, root/frontend build, root/frontend e2e, live preview refresh/probe and live browser smoke.

## No-backcompat/aggressive-deletion rationale

Prefer one explicit presentation-interaction owner over preserving no-op handlers, duplicate hover stores, or implicit overlay behavior. If an old highlight path is not part of the current product contract, delete it rather than adapting it.
