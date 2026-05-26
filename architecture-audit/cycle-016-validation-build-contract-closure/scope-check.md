# Cycle 016 Scope Check — Presentation interaction and overlay contract

**Stage:** `cycle-016-fresh-scout-proposals`  
**Selected next wave title:** Presentation interaction and overlay contract  
**Source-code changes in this stage:** none. This stage only scouts and proposes.

## 1. Preconditions inspected

Current workspace state was inspected before writing proposals. The working tree contains broad inherited dirty/untracked Saivage/audit/source changes from earlier waves; this scout did not revert or normalize them and did not edit production source. Secret/config paths were not read.

Relevant completion evidence:

- Wave 014 validation-contract closure is complete: the implementation log records green root/frontend lint, focused Vitest, full root/frontend Vitest, root/frontend build, root/frontend e2e, focused keyboard/selection Playwright, and live preview reachability (`architecture-audit/cycle-014-validation-contract-ownership/implementation-log.md`).
- Wave 015 TypeScript/build-contract convergence is complete: final retry logs record green root/frontend lint, focused Wave 015 Vitest, full root/frontend Vitest, root/frontend build, root/frontend e2e, and persistent preview reachability (`architecture-audit/cycle-015-typescript-build-contracts/implementation-log.md`).
- The current root scripts now delegate to the frontend workspace for build, test, lint, architecture tests, and e2e (`architecture-audit/cycle-016-validation-build-contract-closure/source-evidence.stdout:1`, `architecture-audit/cycle-016-validation-build-contract-closure/source-evidence.stdout:10`).
- The frontend build/lint/e2e scripts are executable current gates: `build` is `vue-tsc && vite build`, `lint` is the architecture gate, and `test:e2e` is Playwright (`architecture-audit/cycle-016-validation-build-contract-closure/source-evidence.stdout:35`, `architecture-audit/cycle-016-validation-build-contract-closure/source-evidence.stdout:42`).

## 2. Wave-plan status and need for a plan edit

`architecture-audit/wave-plan.md` currently ends with Wave 015. Wave 015's return-to-Wave-014 closure has been satisfied by the recent stage history, so there is no existing unexecuted plan entry that directly owns the next residual architectural risk. A reviewed plan edit is therefore required before implementing Cycle 016.

This stage records the proposed plan edit in `plan-edit-needed.md` and writes proposals against that proposed new entry. Implementation must not begin until the review/decision stage accepts either this new wave entry or a different re-ranked scope.

## 3. Re-ranking remaining risks after Waves 014 and 015

After the validation/build contract closures, the most central remaining issues are no longer build red gates or stale e2e suite corruption. Current evidence points to user-interaction and presentation-boundary drift:

1. **Presentation interaction ownership is incomplete.** `App.vue` still wires `ElementsPanel` and `ActionsPanel` highlight events to no-op handlers (`frontend/src/App.vue:39`, `frontend/src/App.vue:50`, `frontend/src/App.vue:164`, `frontend/src/App.vue:169`). Panels continue to emit highlight events (`frontend/src/components/panels/ElementsPanel.vue:141`, `frontend/src/components/panels/ElementsPanel.vue:339`; `frontend/src/components/panels/ActionsPanel.vue:61`; `frontend/src/components/panels/ProcessTreeNode.vue:212`, `frontend/src/components/panels/ProcessTreeNode.vue:378`), while the 2D canvas uses a separate hover/cascade presentation path (`frontend/src/components/workspace/SvgCanvas.vue:127`, `frontend/src/components/workspace/SvgCanvas.vue:252`, `frontend/src/components/workspace/SvgCanvas.vue:545`). This leaves panel-driven highlight feedback architecturally disconnected from rendering selectors.
2. **The 3D overlay has no explicit pointer/hit-test policy.** The 3D panel is rendered as an absolute overlay over the 2D canvas (`frontend/src/App.vue:61`, `frontend/src/App.vue:260`) and its canvas consumes the full overlay area (`frontend/src/components/panels/ThreeView.vue:2`, `frontend/src/components/panels/ThreeView.vue:81`). Wave 015 closure accepted a residual that the overlay intercepts part of the SVG canvas and e2e must click around it (`architecture-audit/cycle-015-typescript-build-contracts/implementation-log.md`, final retry residual risks). That is a cross-rendering/user-interaction contract, not a test-only nuisance.
3. **Routine debug output remains in active presentation/domain paths and obscures validation evidence.** Examples include `SvgCanvas.vue` normal lifecycle/tool/zoom/property logs (`frontend/src/components/workspace/SvgCanvas.vue:490`, `frontend/src/components/workspace/SvgCanvas.vue:515`, `frontend/src/components/workspace/SvgCanvas.vue:789`, `frontend/src/components/workspace/SvgCanvas.vue:927`, `frontend/src/components/workspace/SvgCanvas.vue:1165`) and `ToolFamilyButton.vue` dropdown/tool-selection logs (`frontend/src/components/toolbars/ToolFamilyButton.vue:98`, `frontend/src/components/toolbars/ToolFamilyButton.vue:104`). Broader domain/process debug logs remain too, but presentation-interaction logs are the central subset for this wave.
4. **A stale backend proxy remains in Vite config after backend deletion.** The backend workspace and project API were deleted in Wave 010, but the dev server still proxies `/api` to `localhost:3000` (`frontend/vite.config.ts:14`, `frontend/vite.config.ts:17`). This is lower centrality than the interaction contract but belongs in the direct delete list if the selected wave touches app/runtime integration configuration.
5. **One store still imports command-stack infrastructure.** `processStore.ts` imports `CommandStack` (`frontend/src/stores/processStore.ts:7`). This is a residual command/use-case leak, but it is narrower and less central than the current user-facing presentation feedback/overlay contract because it is not currently observed as a validation/live-preview caveat in Wave 015 closure.

## 4. Selected bounded scope

Cycle 016 should own the **presentation interaction and overlay contract**:

- `frontend/src/App.vue` only for panel highlight wiring and explicit 3D overlay interaction policy composition.
- `frontend/src/stores/selectionStore.ts` and/or `frontend/src/composables/useHoverHighlight.ts` only if they are the accepted owner for panel-driven highlight state.
- `frontend/src/components/panels/ElementsPanel.vue`, `ActionsPanel.vue`, and `ProcessTreeNode.vue` only where their highlight event contract must be typed/narrowed or deleted.
- `frontend/src/components/workspace/SvgCanvas.vue` only where it must consume the selected panel-highlight state and where routine presentation debug logs are deleted.
- `frontend/src/components/panels/ThreeView.vue` and overlay CSS in `App.vue` only for an explicit pointer-event/hit-test policy, not a 3D rendering redesign.
- `frontend/src/components/toolbars/ToolFamilyButton.vue` only to delete routine dropdown/tool-selection logging if included in the accepted direct proposal.
- `frontend/vite.config.ts` only to delete the stale `/api` backend proxy if accepted as an adjacent app-runtime cleanup.
- Focused unit/static/e2e tests for panel highlight feedback, overlay click policy, retained 2D construction outside/under the overlay contract, and no stale backend proxy/debug logs in touched presentation files.

## 5. Explicit out-of-scope items

- No production implementation in this scout/proposal stage.
- No reopening Waves 001–015 structural work: no domain model split, command/undo redesign, persistence contract redesign, backend resurrection, broad docs rewrite, or full test-suite rewrite.
- No broad debug-log purge across every domain/service file. Cycle 016 should delete only logs in the selected presentation/overlay/app-runtime surfaces unless review accepts a separate broader logging wave.
- No broad e2e expansion to replace every deleted legacy spec. Add or update only current-contract e2e tests required for highlight/overlay behavior.
- No secret/config reads. Do not inspect `.saivage/saivage.json`, auth profiles, env files, OAuth tokens, Google credentials, or provider configs.

## 6. Premises and invalidated assumptions

- **Invalidated:** The original wave plan's structural sequence ended at Wave 015 and cannot authorize a new implementation wave without a reviewed plan edit.
- **Still valid:** Clean architecture remains higher priority than coverage breadth. Stale compatibility surfaces should be deleted, not wrapped.
- **New central premise:** With build/unit/e2e/preview gates green after Waves 014/015, the next central maintainability gain is to make the remaining user-facing presentation interaction boundary explicit rather than continuing to tolerate no-op highlight adapters and implicit overlay interception.

## 7. Validation requirements for the implementation wave

Minimum validation for the accepted implementation:

1. Static boundary scan proving no no-op panel highlight handlers remain in `App.vue`, no routine `console.log` remains in touched presentation files, and stale `/api` backend proxy is absent if the direct proposal's config cleanup is accepted.
2. Focused Vitest for the selected highlight state owner and panel/canvas interaction contract.
3. Focused Playwright exercising panel hover/highlight or selected process/element feedback, 2D point creation in an area governed by the overlay policy, and 3D overlay controls still usable if overlay pointer policy changes.
4. Mandatory root/frontend lint, focused Vitest, full root/frontend Vitest, root/frontend build, root/frontend e2e.
5. Live preview refresh on `0.0.0.0:5173`, HTTP 200 reachability probe, and live Playwright/MCP smoke covering the changed interaction contract.
