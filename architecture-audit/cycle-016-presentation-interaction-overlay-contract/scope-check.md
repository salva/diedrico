# Cycle 016 Scope Check — Presentation interaction and overlay contract

**Stage:** `cycle-016-fresh-scout-proposals`  
**Selected next wave title:** Presentation interaction and overlay contract  
**Source-code changes in this stage:** none. This stage only scouts and proposes.

## 1. Preconditions inspected

The current git status was inspected first. The working tree contains broad inherited dirty/untracked Saivage, audit, and source changes from earlier stages; this scout did not revert, normalize, or implement production source changes. Secret/config paths were not read.

Recent completion evidence was re-read:

- Wave 014 validation-contract ownership is closed with green root/frontend lint, focused/full Vitest, root/frontend build, root/frontend e2e, focused keyboard/current-UI Playwright, live preview reachability, and explicit selection-mask evidence (`architecture-audit/cycle-014-validation-contract-ownership/implementation-log.md`).
- Wave 015 TypeScript/build-contract convergence is closed enough for the current plan history: the implementation log records Wave 015 build-contract repairs and subsequent final validation/preview retry is reported complete in the stage history (`architecture-audit/cycle-015-typescript-build-contracts/implementation-log.md`).
- Current root scripts now list only the frontend workspace, with root `build`, `test`, `lint`, and `test:e2e` delegating to frontend (`package.json:7`, `package.json:13`, `package.json:14`, `package.json:15`, `package.json:21`; captured in `source-evidence.stdout`).

Read-only source evidence was captured in `architecture-audit/cycle-016-presentation-interaction-overlay-contract/source-evidence.stdout`.

## 2. Wave-plan status and required plan edit

`architecture-audit/wave-plan.md` contains Waves 001–015. The recent stage history says Wave 014 closure and Wave 015 final validation/preview retry are complete, so the listed plan has no remaining unexecuted structural wave entry that directly authorizes the next residual risk. A reviewed plan edit is required before implementation.

This stage therefore writes proposals against a proposed new Wave 016 entry and records the plan-edit need in `plan-edit-needed.md`. Implementation must not begin until `cycle-016-review-round-01` and the later decision stage accept either this scope or a different re-ranked scope.

## 3. Re-ranked residual risks after Waves 014/015

1. **Presentation interaction ownership is incomplete and user-visible.** `App.vue` still listens to panel highlight/clear events (`frontend/src/App.vue:43`, `frontend/src/App.vue:44`, `frontend/src/App.vue:54`, `frontend/src/App.vue:55`) but the handlers discard the data or do nothing (`frontend/src/App.vue:160`, `frontend/src/App.vue:165`). Panels continue to define/emit highlight contracts (`frontend/src/components/panels/ElementsPanel.vue:141`, `frontend/src/components/panels/ElementsPanel.vue:339`; `frontend/src/components/panels/ActionsPanel.vue:42`, `frontend/src/components/panels/ActionsPanel.vue:61`; `frontend/src/components/panels/ProcessTreeNode.vue:212`, `frontend/src/components/panels/ProcessTreeNode.vue:378`, `frontend/src/components/panels/ProcessTreeNode.vue:389`, `frontend/src/components/panels/ProcessTreeNode.vue:392`). Meanwhile `SvgCanvas.vue` has its own hover/cascade render inputs (`frontend/src/components/workspace/SvgCanvas.vue:141`, `frontend/src/components/workspace/SvgCanvas.vue:205`, `frontend/src/components/workspace/SvgCanvas.vue:258`, `frontend/src/components/workspace/SvgCanvas.vue:549`, `frontend/src/components/workspace/SvgCanvas.vue:556`). This is a cross-surface presentation boundary leak.
2. **The 3D overlay hit-test policy is implicit.** `App.vue` renders `ThreeView` as an absolute overlay (`frontend/src/App.vue:70`, `frontend/src/App.vue:261`) above the 2D canvas, but no explicit policy says whether the overlay intentionally captures or passes through pointer events. This previously showed up as e2e coordinate fragility in Wave 014/015 validation notes.
3. **Routine presentation debug output remains in active runtime paths.** `SvgCanvas.vue`, `ElementsPanel.vue`, and `ToolFamilyButton.vue` still contain normal-path `console.log` calls (`frontend/src/components/workspace/SvgCanvas.vue:490`, `frontend/src/components/workspace/SvgCanvas.vue:515`, `frontend/src/components/workspace/SvgCanvas.vue:760`, `frontend/src/components/workspace/SvgCanvas.vue:789`, `frontend/src/components/workspace/SvgCanvas.vue:927`, `frontend/src/components/workspace/SvgCanvas.vue:1165`; `frontend/src/components/panels/ElementsPanel.vue:165`, `frontend/src/components/panels/ElementsPanel.vue:188`; `frontend/src/components/toolbars/ToolFamilyButton.vue:98`, `frontend/src/components/toolbars/ToolFamilyButton.vue:104`). This obscures validation and live-preview diagnostics.
4. **Stale backend-runtime configuration remains after backend deletion.** The root workspace lists only `frontend` (`package.json:7`), yet `frontend/vite.config.ts` still proxies `/api` to `localhost:3000` (`frontend/vite.config.ts:17`). This is lower centrality than highlight/overlay ownership but is a clean adjacent runtime-config deletion candidate if review accepts it.
5. **A process store still imports command infrastructure.** `frontend/src/stores/processStore.ts` imports and instantiates `CommandStack` (`frontend/src/stores/processStore.ts:7`, `frontend/src/stores/processStore.ts:11`, `frontend/src/stores/processStore.ts:17`). This remains a command/use-case leak, but it is narrower than the current user-visible presentation interaction contract and is not the selected Cycle 016 scope unless review reranks it.

## 4. Selected bounded scope

Cycle 016 should own **presentation interaction and overlay contract**:

- `frontend/src/App.vue` for replacing/deleting no-op panel highlight adapters and for explicit 3D overlay interaction policy composition.
- `frontend/src/stores/selectionStore.ts` and/or `frontend/src/composables/useHoverHighlight.ts` only if accepted as the owner/adapter for panel-driven highlight state.
- `frontend/src/components/panels/ElementsPanel.vue`, `ActionsPanel.vue`, and `ProcessTreeNode.vue` only to keep typed highlight intents or delete dead highlight emits.
- `frontend/src/components/workspace/SvgCanvas.vue` only to consume the selected highlight state through the existing canvas presentation read-model inputs and delete routine logs in touched paths.
- `frontend/src/components/panels/ThreeView.vue` and `App.vue` overlay CSS only to name/test the pointer policy, not to redesign 3D rendering.
- `frontend/src/components/toolbars/ToolFamilyButton.vue` only for routine presentation log deletion.
- `frontend/vite.config.ts` only to delete the stale `/api` proxy if the reviewed decision includes that adjacent runtime cleanup.
- Focused tests for panel highlight, overlay policy, no stale logs/proxy in touched files, and current e2e/live behavior.

## 5. Explicit out of scope

- No production source implementation in this scout/proposal stage.
- No domain-model, command/undo, persistence, backend resurrection, full app-shell, 2D/3D rendering redesign, docs rewrite, or broad test-suite rewrite.
- No broad debug-log purge across domain/services outside touched presentation/runtime surfaces.
- No expansion into `processStore.ts` command ownership unless the review stage rejects this scope and chooses that as the new plan-edited wave.
- No secret/config reads: do not inspect `.saivage/saivage.json`, auth profiles, env files, OAuth tokens, Google credentials, or provider configs.

## 6. Validation requirements for the implementation wave

1. Static scans proving no no-op panel highlight handlers remain, no routine `console.log` remains in touched presentation files, and no stale `/api` backend proxy remains if the config deletion is accepted.
2. Focused Vitest for the selected highlight owner/state and any panel/canvas presentation contract changes.
3. Focused Playwright for panel highlight behavior or explicit deletion of dead highlight UI, 2D construction under the selected overlay policy, and 3D overlay controls if pointer behavior changes.
4. Mandatory root/frontend lint, focused Vitest, full root/frontend Vitest, root/frontend build, root/frontend e2e.
5. Live preview refresh on `0.0.0.0:5173`, HTTP 200 reachability probe, and live browser smoke for changed interactions.
