# Wave 006b panel/toolbar command-intent scout

**Date:** 2026-05-26  
**Stage:** `cycle-006b-fresh-scout-proposals`  
**Primary artifacts:**

- `architecture-audit/cycle-006b-panel-toolbar-command-intents/scope-check.md`
- `architecture-audit/cycle-006b-panel-toolbar-command-intents/proposals/proposal-direct.md`
- `architecture-audit/cycle-006b-panel-toolbar-command-intents/proposals/proposal-restructure.md`

## Executive summary

Wave 006b can proceed without a wave-plan edit. Wave 006a established application-owned canvas/tool command controllers, and its implementation log explicitly left `ActionsPanel.vue` and `Toolbar.vue` untouched as 006b residuals. Current source confirms both residuals still directly construct commands/operations:

- `ActionsPanel.vue` imports `Command` and process-tree operations at lines 54-60 and constructs/pushes five process-history commands at lines 265-314.
- `Toolbar.vue` imports `Command`, `Vector3`, and concrete world operations at lines 121-126 and implements an Alt+E “for testing” projection-plane setup command at lines 248-305.
- Wave 006a application patterns now exist in `frontend/src/application/tools/CanvasToolController.ts`, `frontend/src/application/construction/ConstructionUseCases.ts`, and canvas use-cases; 006b should reuse that boundary style without reopening `SvgCanvas.vue` / tools.

## Recommendation

Use Proposal Direct for the next review unless the reviewer wants to remove toolbar undo/redo `CommandStack` access in this wave. Proposal Direct is tightly scoped to process-history use-cases plus deletion or delegation of Alt+E. Proposal Restructure is cleaner for all UI chrome history intents, but risks overlapping Wave 009 App-shell extraction.

## Evidence sources

- Current source inspected directly:
  - `frontend/src/components/panels/ActionsPanel.vue`
  - `frontend/src/components/toolbars/Toolbar.vue`
  - `frontend/src/application/**`
  - `frontend/src/commands/operations/processTree/**`
- Supporting stage artifacts:
  - `architecture-audit/wave-plan.md`
  - `architecture-audit/cycle-006-ui-command-controllers/scope-check.md`
  - `architecture-audit/cycle-006a-canvas-tool-command-controllers/implementation-log.md`
- Stable scout log generated for this task:
  - `architecture-audit/cycle-006b-panel-toolbar-command-intents/source-scout.stdout`
  - `architecture-audit/cycle-006b-panel-toolbar-command-intents/source-scout.stderr`

No external web sources were needed; this was a source-tree architecture scout.
