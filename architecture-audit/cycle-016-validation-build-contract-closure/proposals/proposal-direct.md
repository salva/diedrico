# Proposal Direct — Wire presentation highlight state and name the 3D overlay interaction policy

## Intent

Implement a bounded presentation-interaction cleanup that directly addresses the post-Wave-015 residuals without reopening earlier architecture waves. Retain the current overlay-as-panel UI, but make its pointer/hit-test behavior explicit and tested. Connect or delete panel highlight events instead of leaving no-op adapters.

## Files to change

- `frontend/src/App.vue`
  - Replace `handleHighlightElements()` / `handleClearHighlight()` no-ops with calls to the selected presentation-highlight owner, or remove panel highlight event wiring if the retained panels do not need that behavior.
  - Add explicit overlay interaction class/state comments only if needed by CSS/tests; avoid broad shell refactor.
- `frontend/src/stores/selectionStore.ts` and/or `frontend/src/composables/useHoverHighlight.ts`
  - Use the existing global hover/highlight or selection/cascade state as the owner for panel-driven highlight feedback, with typed temporary/permanent semantics.
- `frontend/src/components/panels/ElementsPanel.vue`
- `frontend/src/components/panels/ActionsPanel.vue`
- `frontend/src/components/panels/ProcessTreeNode.vue`
  - Keep highlight emits only if they map to the chosen owner; otherwise delete dead emits/listeners from the panel tree.
- `frontend/src/components/workspace/SvgCanvas.vue`
  - Consume the selected panel-highlight state through the existing `CanvasPresentationController` context if needed.
  - Delete routine debug logs in the touched canvas interaction paths.
- `frontend/src/components/panels/ThreeView.vue` and `frontend/src/App.vue` overlay CSS
  - Keep 3D controls clickable but state the overlay policy explicitly. If the selected behavior is that the overlay intentionally captures pointer events inside its rectangle, tests should assert 2D e2e clicks use non-overlapped canvas regions and 3D controls remain interactive. If review prefers pass-through except controls, set pointer-events accordingly and test both pass-through canvas clicks and controls.
- `frontend/src/components/toolbars/ToolFamilyButton.vue`
  - Delete routine dropdown/tool-selection `console.log` calls.
- `frontend/vite.config.ts`
  - Delete stale `/api` proxy to `localhost:3000` because Wave 010 deleted the backend workspace and project API.
- Tests:
  - Add or update focused unit tests for highlight owner/state.
  - Add/update static architecture tests for no no-op panel-highlight adapters and no stale backend proxy.
  - Add/update Playwright current-contract tests for panel highlight/overlay policy.

## Files/tests/docs/fixtures to DELETE

- Delete `App.vue` no-op highlight adapter bodies if highlight events are retained through a real owner; delete the handlers entirely if panel highlight events are removed.
- Delete panel `highlight-elements` / `clear-highlight` emits and forwarding code if review determines the panels should not own hover feedback.
- Delete routine `console.log` calls in touched presentation files, especially `SvgCanvas.vue` lifecycle/tool/zoom/property logs and `ToolFamilyButton.vue` dropdown logs.
- Delete stale Vite dev-server `/api -> localhost:3000` proxy if this proposal is accepted.
- Delete or rewrite e2e expectations that merely avoid the 3D overlay without naming the intended policy.

## Expected behavior change

- Hovering or otherwise invoking panel highlight affordances either visibly affects canvas presentation through the same selected/highlight DTO path as existing canvas hover/cascade state, or the UI no longer emits a dead highlight signal.
- The 3D overlay's pointer behavior becomes deliberate: either it captures pointer events as an explicit floating panel, or non-control overlay regions pass through to the 2D canvas. The chosen behavior is covered by e2e.
- Normal browser console output is quieter in the touched presentation paths.
- Dev server no longer suggests an active backend `/api` route if the stale proxy is deleted.

## Risks

- Wiring panel hover to global highlight state can create stale highlight state if panel unmount/leave cleanup is incomplete.
- Changing pointer-events on the 3D overlay can break 3D controls if controls do not opt back into pointer events.
- Deleting the Vite `/api` proxy may expose hidden stale tests or docs that still assume a backend project API; this is desirable under no-backcompat priorities but must be validated.

## Validation plan

1. Static scan for no `void elementIds`, no empty `handleClearHighlight`, no routine `console.log` in touched presentation files, and no stale `/api` proxy if deleted.
2. Focused Vitest for highlight owner/state and any updated panel/canvas boundary tests.
3. Focused Playwright for current UI: panel highlight behavior (or absence of dead highlight UI), 2D point creation under the selected overlay policy, and 3D controls still usable.
4. Mandatory root/frontend lint, focused Vitest, full root/frontend Vitest, root/frontend build, root/frontend e2e.
5. Refresh persistent preview with `npm run dev --workspace=frontend -- --host 0.0.0.0`, capture HTTP 200, and run live browser smoke for the changed interactions.

## No-backcompat/aggressive-deletion rationale

Do not preserve dead highlight event plumbing or stale backend proxy config for compatibility. Either make the current UI contract real and tested or delete the dead surface.
