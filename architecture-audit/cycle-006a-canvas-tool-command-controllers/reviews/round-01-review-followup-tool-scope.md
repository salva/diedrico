# Follow-up review — tool-scope correction

## Result

ACCEPTED — prior blocker resolved, no new blockers found.

## Recheck of prior blocker

The corrected `proposal-direct.md` now explicitly bounds the tool list into:

- required core 006a construction tools,
- required dynamic-plane tool,
- conditionally retained 3D construction tools, and
- conditionally retained quick/example tools.

For the previously problematic 3D/example tools, the proposal now explains why each enters consideration (active `SvgCanvas.vue` factory registration and retained-flow acceptance criteria) and, critically, states the allowed decision for each: migrate if retained user-facing behavior, otherwise delete if debug-only/unreachable. That resolves the previous overbroad blanket-scope issue.

## No new blockers introduced

- `ActionsPanel.vue` and `Toolbar.vue` remain explicitly excluded and deferred to Wave 006b.
- The target outcome still matches Wave 006a: canvas/tools emit intents while application controllers/use-cases own command creation/execution.
- DELETE posture remains aggressive, including direct command/operation imports, misleading factory split, and `useCommandExecution.ts` if unused.
- Validation cadence remains sufficient and unchanged.
- No application source changes were introduced in this scout/proposals stage.
