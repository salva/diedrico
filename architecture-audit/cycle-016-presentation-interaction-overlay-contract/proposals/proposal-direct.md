# Proposal Direct — Wire presentation highlight state and name the 3D overlay policy

## Intent

Implement the smallest bounded cleanup for the selected residual: retain existing panel/canvas/overlay structure, but make the highlight and overlay contracts real instead of incidental. Connect panel highlight events to the existing presentation state owner, or delete them if review determines they are not a current product contract. Name and test the 3D overlay pointer policy.

## Files to change

- `frontend/src/App.vue`
  - Replace `handleHighlightElements()` / `handleClearHighlight()` no-ops with calls to the accepted highlight owner, or remove panel highlight event wiring if the events are deleted.
  - Add explicit overlay CSS class/policy only where needed for tests and readability.
- `frontend/src/composables/useHoverHighlight.ts` and/or `frontend/src/stores/selectionStore.ts`
  - Reuse the current hover/highlight or selection/cascade state as the owner for panel-driven feedback with typed temporary/permanent semantics.
- `frontend/src/components/panels/ElementsPanel.vue`
- `frontend/src/components/panels/ActionsPanel.vue`
- `frontend/src/components/panels/ProcessTreeNode.vue`
  - Keep highlight emits only if they map to the selected owner; otherwise delete the dead emits and forwarding chain.
- `frontend/src/components/workspace/SvgCanvas.vue`
  - Consume the selected panel-highlight state through the existing canvas presentation model inputs.
  - Delete routine debug logs in touched canvas interaction/render paths.
- `frontend/src/components/panels/ThreeView.vue` and `frontend/src/App.vue` overlay CSS
  - Make the selected overlay behavior explicit. If the overlay captures pointer events as a floating 3D panel, tests should assert 2D clicks use non-overlapped canvas regions and 3D controls remain interactive. If review prefers pass-through except controls, set/test pointer events accordingly.
- `frontend/src/components/toolbars/ToolFamilyButton.vue`
  - Delete routine dropdown/tool-selection logs.
- `frontend/vite.config.ts`
  - Delete the stale `/api -> localhost:3000` proxy if review accepts this adjacent runtime cleanup.
- Tests:
  - Focused unit/static tests for highlight owner and no dead adapters/logs/proxy.
  - Focused Playwright/current-UI tests for panel highlight and overlay policy.

## Files/tests/docs/fixtures to DELETE

- Delete `App.vue` no-op highlight adapter bodies (`void elementIds`, `void temporary`, empty clear handler) or delete the handlers entirely.
- Delete panel `highlight-elements` / `clear-highlight` emits and forwarding code if the direct implementation chooses not to retain panel highlight behavior.
- Delete routine `console.log` calls in touched presentation files, especially `SvgCanvas.vue`, `ElementsPanel.vue`, and `ToolFamilyButton.vue` normal paths.
- Delete stale Vite dev-server `/api` proxy if accepted by decision.
- Delete or rewrite e2e expectations that rely on unnamed click-around-overlay behavior.

## Expected behavior change

- Panel highlight actions either visibly affect canvas presentation through the same highlight/read-model path as current hover/cascade state, or dead highlight UI/events are removed.
- The 3D overlay's pointer behavior is deliberate and tested.
- Normal browser console output is quieter in the touched presentation paths.
- Dev-server config no longer advertises a backend `/api` route if the stale proxy is deleted.

## Risks

- Highlight state can become stale if temporary panel highlights are not cleared on leave/unmount.
- Pointer-event changes can break 3D controls unless controls explicitly remain interactive.
- Deleting the stale Vite proxy can expose stale docs/tests still assuming a backend API; this is desirable under aggressive deletion but must be captured in validation.

## Validation plan

1. Static scan for no no-op highlight handlers, no routine `console.log` in touched presentation files, and no stale `/api` proxy if deleted.
2. Focused Vitest for highlight owner/state and any updated panel/canvas presentation tests.
3. Focused Playwright for panel highlight behavior or explicit absence of dead highlight UI, 2D construction under the selected overlay policy, and 3D controls if pointer policy changes.
4. Mandatory root/frontend lint, focused Vitest, full root/frontend Vitest, root/frontend build, root/frontend e2e.
5. Refresh persistent preview on `0.0.0.0:5173`, capture HTTP 200, and run live browser smoke for the changed interaction contract.

## No-backcompat/aggressive-deletion rationale

Do not preserve dead highlight event plumbing, routine presentation logs, or stale backend proxy config. Either make the current UI contract real and tested or delete the dead surface.
