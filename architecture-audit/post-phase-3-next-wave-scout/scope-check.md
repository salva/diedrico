# Post-Phase-3 Next-Wave Scout — Scope Check

**Stage:** `post-phase-3-next-wave-scout-proposals`  
**Task:** `t1-scout-current-risks`  
**Source-code changes:** none

## Scope confirmation

This scout is a no-code planning extension after the reviewed Wave 001–013 plan was exhausted. It does **not** modify application source, tests, package scripts, docs, or `architecture-audit/wave-plan.md`. New artifacts are limited to `architecture-audit/post-phase-3-next-wave-scout/`.

Secret/provider/env paths were not read. Evidence was gathered from the current wave plan, Wave 012/013 implementation and validation logs, root/frontend package metadata, and current `frontend/src` / `frontend/tests` files.

## Current wave-plan status

`architecture-audit/wave-plan.md` currently ends at **Wave 013 — Reconcile docs/specs with the cleaned architecture**. Wave 013 is explicitly scoped as the final documentation/spec reconciliation wave after the structural waves, with dependencies on all earlier waves (`architecture-audit/wave-plan.md`, Wave 013 section). There is no Wave 014 entry to execute.

Wave 013 implementation log states that the selected docs/spec reconciliation proposal was implemented, stale MVP spec authority was deleted, and no runtime behavior changed (`architecture-audit/cycle-013-docs-specs-reconciliation/implementation-log.md`, “Summary”; “Deleted stale specs and harvesting rationale”). The same log’s final recommendation says the current plan was re-read, ends at Wave 013, and further work should be a reviewed planning/baseline-refresh cycle for residual validation/test-health/tooling debt rather than an unplanned Wave 014 implementation (`architecture-audit/cycle-013-docs-specs-reconciliation/implementation-log.md`, “Phase 3 / next-wave recommendation”).

Wave 012 implementation also completed its bounded placeholder/debug cleanup, deleted README-only operation families, and recorded residual validation debt as future candidate issues rather than Wave 012-attributable regressions (`architecture-audit/cycle-012-placeholder-debug-cleanup/implementation-log.md`, “Legacy surfaces deleted”; “Candidate future waves/issues”).

## Why PLAN_COMPLETE is not appropriate

The original ordered plan is exhausted, but the project objective is open-ended: continue refactor waves until no further meaningful clean-architecture/code-quality/correctness improvement remains. Current evidence shows meaningful remaining work:

- Full Vitest is still red due to intersection expectation failures, PropertiesDialog event expectations, and a zero-test guide integration file (`architecture-audit/cycle-013-docs-specs-reconciliation/validation/final-validation-summary.stdout:1-22`).
- Root and frontend build are still red because `vue-tsc` fails under Node 24 with `Search string not found: "/supportedTSExtensions = .*(?=;)"` before Vite build starts (`architecture-audit/cycle-013-docs-specs-reconciliation/validation/final-validation-summary.stdout:46-57`; `frontend/package.json:8`; `package.json:13`).
- Broad Playwright is still red before browser execution due to parse/corruption errors in `keyboard-shortcuts.spec.ts` and `selection-mask.spec.ts` (`architecture-audit/cycle-013-docs-specs-reconciliation/validation/final-validation-summary.stdout:59-67`).
- Current source still exposes correctness and type-boundary smells: line-line intersection returns an infeasible realization rather than `null` while tests expect `null` (`frontend/src/domain/calculations/Intersections.ts:110-123`; `frontend/tests/unit/calculations/intersections.spec.ts:78-147`), `PropertiesDialog.vue` reaches into domain internals via repeated `as any` casts and placeholder state (`frontend/src/components/dialogs/PropertiesDialog.vue:283-335`, `frontend/src/components/dialogs/PropertiesDialog.vue:356-374`), and `CanvasStyleUseCase` still force-casts an operation to `any` (`frontend/src/application/canvas/CanvasStyleUseCase.ts:1-13`).

These are not merely stale documentation issues. They reduce confidence in future waves because mandatory validation cannot distinguish regressions from accepted debt, and at least one red unit surface sits on a central geometric correctness contract.

## Scout conclusion

Continuous improvement requires extending `architecture-audit/wave-plan.md` through review convergence. The next wave should be proposed, reviewed, and then appended to the plan before implementation. This scout recommends a single bounded **Wave 014** centered on validation-health and correctness triage, with two framing options in `proposals/`:

1. **Direct:** repair the residual validation gates in place so root/frontend Vitest, build, and broad e2e become meaningful gates again.
2. **Restructure:** frame the same work one conceptual layer higher as validation contract ownership, forcing each red suite/tool to either have a clear owner and current contract or be deleted/replaced.

The recommended next unit is bounded and central because it restores the validation architecture required by every later refactor wave before pursuing peripheral source cleanup.
