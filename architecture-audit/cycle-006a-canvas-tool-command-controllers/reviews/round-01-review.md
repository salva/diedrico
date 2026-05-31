# Round 01 Review — Wave 006a Canvas/tool command controllers

## Result

NO BLOCKING ISSUES.

## Evidence checked

- `architecture-audit/cycle-006a-canvas-tool-command-controllers/scope-check.md`
- `architecture-audit/cycle-006a-canvas-tool-command-controllers/proposals/proposal-direct.md`
- `architecture-audit/cycle-006a-canvas-tool-command-controllers/proposals/proposal-restructure.md`
- `architecture-audit/wave-plan.md` (Wave 006a entry)
- `architecture-audit/cycle-006-ui-command-controllers/reviews/plan-split-review.md`
- `architecture-audit/cycle-006a-canvas-tool-command-controllers/reviews/round-01-review-followup-tool-scope.md`
- `.saivage/stages/cycle-006a-fresh-scout-proposals/reports/t3-correct-proposal-direct-tool-scope.json`
- `.saivage/stages/cycle-006a-fresh-scout-proposals/reports/t4-review-after-tool-scope-correction.json`
- Current-code scout evidence cited from `scope-check.md`, including `frontend/src/components/workspace/SvgCanvas.vue`, `frontend/src/tools/ITool.ts`, `frontend/src/tools/ArgumentCollectorTool.ts`, `frontend/src/tools/PointTool.ts`, `frontend/src/tools/GuideTool.ts`, `frontend/src/tools/IntersectionTool.ts`, `frontend/src/tools/CreateProjectionPlaneTool.ts`, and `frontend/src/composables/useCommandExecution.ts`

## Fresh-scout correction context

This round-01 stage inherits one earlier blocker from the fresh-scout/proposals review: the first version of `proposal-direct.md` named multiple 3D/example tools too broadly without tying each to explicit 006a scope evidence. That issue was corrected in-place during `cycle-006a-fresh-scout-proposals` (`t3-correct-proposal-direct-tool-scope`) and re-reviewed as resolved (`t4-review-after-tool-scope-correction`; `round-01-review-followup-tool-scope.md`).

This consolidated artifact reflects the **corrected current proposal state**, not only the historical pre-correction blocker.

## Acceptance-criteria check

1. **Review cites the required artifacts** — PASS.
   - This review cites `scope-check.md`, `proposal-direct.md`, `proposal-restructure.md`, the current Wave 006a entry in `wave-plan.md`, and the fresh-scout correction/re-review artifacts.
2. **`ActionsPanel.vue` and `Toolbar.vue` remain out of 006a implementation scope** — PASS.
   - `scope-check.md` explicitly keeps them as Wave 006b residuals.
   - `proposal-direct.md` says “Do **not** delete or patch `ActionsPanel.vue` or `Toolbar.vue`; record them as Wave 006b residuals.”
   - `proposal-restructure.md` likewise keeps them out of scope as future consumers only.
3. **3D/example tools are not overbroadly swept into 006a without evidence** — PASS after correction.
   - `proposal-direct.md` now separates tools into required core 006a construction tools, required dynamic-plane handling, conditionally retained 3D construction tools, and conditionally retained quick/example tools.
   - The conditional groups are tied to active `SvgCanvas.vue` registration evidence and require an explicit retain/delete classification rather than a blanket migration.
4. **Aggressive deletion priority is applied** — PASS.
   - Both proposals target direct `Command`/`CommandStack`/operation imports in `SvgCanvas.vue` and tool files, obsolete/open-command tool APIs, misleading `commands/factories` vs `services/factories` layering, command-internals tests, and `useCommandExecution.ts` if unused or misaligned.
5. **Review provides a recommendation or blockers** — PASS.
   - Recommendation is below: proceed to decision with no blocking issues; prefer Proposal Direct as the implementation-fit 006a choice while preserving Proposal Restructure as the stronger-but-heavier alternative.
6. **No frontend/backend/specs source files modified during review** — PASS.
   - This review stage updates review/report artifacts only; no application-source edits are part of this review work.

## Proposal scoring against the six required criteria

### Proposal Direct — `proposals/proposal-direct.md`

1. **Advances the wave target outcome** — PASS.
   - It directly targets the active 006a leaks from `SvgCanvas.vue`, `ITool.ts`, `ArgumentCollectorTool.ts`, the concrete canvas tools, point movement/style updates, and the active construction factory path identified in `scope-check.md`.
2. **Improves architecture and code quality** — PASS.
   - It moves command construction/execution out of Vue and tool classes into application-owned controllers/use-cases while preserving tool interaction responsibilities.
   - It also cleans up the misleading factory split and obsolete command-shaped tool abstractions.
3. **Respects no-backcompat / aggressive deletion priorities** — PASS.
   - Strong delete posture: direct operation imports, `ToolContext.commandStack`, open-command APIs, obsolete command-internals tests, unused `useCommandExecution.ts`, and misleading factory namespaces are all targeted for deletion or replacement rather than wrapped.
4. **Avoids overfeaturism** — PASS after correction.
   - The corrected proposal no longer treats every 3D/example tool as an automatic migration target. It bounds them with explicit evidence and retain/delete rules, which keeps 006a centered on the active canvas/tool surface.
5. **Introduces new risks / hidden regressions** — ACCEPTABLE WITH MANAGED RISKS.
   - Main risks are point-drag preview/rollback semantics, interaction-vs-command validation splits for intersection and dynamic-plane tools, and retained quick/3D flows that may still hide edge cases.
   - These risks are explicitly named and matched with focused tests and e2e requirements.
6. **Validation sufficiency** — PASS.
   - Focused controller/use-case/tool/canvas tests plus full lint/Vitest/build/e2e/Playwright/preview cadence are appropriate for this wave’s user-visible surface.

**Assessment:** Best fit for Wave 006a implementation scope.

### Proposal Restructure — `proposals/proposal-restructure.md`

1. **Advances the wave target outcome** — PASS.
   - It reaches the same architectural destination and may create a cleaner long-term seam for Wave 006b.
2. **Improves architecture and code quality** — PASS.
   - The application interaction port further decouples tools from command implementation details and creates a stronger public boundary.
3. **Respects no-backcompat / aggressive deletion priorities** — PASS.
   - It also deletes UI-facing command/operation imports, command-shaped tool APIs, old public sequence-factory APIs, and obsolete tests.
4. **Avoids overfeaturism** — MIXED / ACCEPTABLE.
   - This is the heavier option. It risks designing a broader abstraction for later panel/toolbar consumers before 006a alone has been implemented.
   - The proposal does explicitly warn against specializing for `ActionsPanel.vue`/`Toolbar.vue` now, which keeps the risk acceptable rather than blocking.
5. **Introduces new risks / hidden regressions** — ACCEPTABLE WITH HIGHER DESIGN RISK.
   - The intent-port/router can become a new god module or widen the cycle if not kept narrow and split by use-case.
   - This is a real risk but is honestly disclosed and not hidden.
6. **Validation sufficiency** — PASS.
   - The proposed intent DTO tests, router/use-case tests, focused interaction tests, and full validation cadence are sufficient if this direction is chosen.

**Assessment:** Architecturally strong, but heavier than needed for a single 006a cycle unless implementation can keep the interaction port very small.

## Scope and deletion review notes

- **Wave-plan alignment** — The current Wave 006a entry in `wave-plan.md` matches both proposals and the scope check: active canvas/tool command-controller extraction now, `ActionsPanel.vue`/`Toolbar.vue` in Wave 006b later.
- **Active-surface guard** — The corrected direct proposal now properly grounds its conditional 3D/example tool treatment in active `SvgCanvas.vue` registration evidence and explicit retain/delete decisions. This resolves the prior overbreadth concern.
- **`useCommandExecution.ts`** — The scope-check evidence that it is unused/misaligned is sufficient to keep deletion/replacement as an explicit implementation requirement.
- **Aggressive deletion priority** — Both proposals correctly prefer deleting obsolete APIs, direct imports, and command-internals tests over preserving shims or dual paths.

## Recommendation

Proceed to decision with **Proposal Direct** as the preferred implementation recommendation for Wave 006a.

Why:
- it squarely addresses the active canvas/tool command-construction leaks identified in the scope check,
- it is now properly bounded after the tool-scope correction,
- it respects the 006a/006b split without broadening into panel/toolbar work,
- and it is less likely than Proposal Restructure to spend this cycle on a too-broad abstraction before the concrete canvas/tool extraction is complete.

Proposal Restructure remains a valid alternative, but only if the Manager deliberately accepts the extra design breadth and ensures the interaction port does not become a new god module.

## Conclusion

The corrected proposal set satisfies the Wave 006a round-01 review criteria and acceptance criteria.

**NO BLOCKING ISSUES.**
