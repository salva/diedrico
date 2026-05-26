# Cycle 018 Wave-Plan Extension Note

## Status

This note supports the `cycle-018-wave-plan-extension` edit to `architecture-audit/wave-plan.md`. No production source, tests, package metadata, tooling, backend code, docs/spec content, or next-wave implementation was changed.

## Pre-edit status and hygiene

Path-focused status was captured in `status-pre-edit.stdout` / `status-pre-edit.stderr`. It showed many unrelated dirty production files under `frontend/src/` plus untracked Cycle 018 audit/stage artifacts. Those production changes were treated as pre-existing work and were not reverted or edited. This task only changed:

- `architecture-audit/wave-plan.md`
- `architecture-audit/cycle-018-wave-plan-extension/plan-extension-note.md`
- supporting evidence logs under `architecture-audit/cycle-018-wave-plan-extension/`
- this task report under `.saivage/stages/cycle-018-wave-plan-extension/reports/`

No forbidden secret/config paths were read.

## Evidence inspected

- `architecture-audit/wave-plan.md` headings showed the plan ended at Wave 017 before this extension (`wave-headings-pre-edit.stdout`).
- Wave 016 completion recorded that `CanvasWorldReadPort` still delegates realization through concrete runtime `World` (`architecture-audit/cycle-016-canvas-presentation-overlay-boundary/implementation-log.md`, “Residual risks / future candidates”).
- Wave 017 completion recorded that both canvas and three presentation read ports still call domain realization APIs requiring full runtime `World`, and recommended a new domain-realization-context-boundary wave (`architecture-audit/cycle-017-three-presentation-read-port-realization-boundary/implementation-log.md`, “Residual risks after closure” and “Next-wave recommendation / re-rank”).
- Cycle 017 validation summary independently recommended a reviewed wave-plan edit mini-cycle followed by Cycle 018 scout/proposals for the domain-realization-context-boundary candidate (`.saivage/stages/cycle-017-validation-and-preview-refresh/summary.json`).
- Baseline risks identify weak realization contracts and domain-internal World coupling as central risks (`architecture-audit/baseline/risk-register.md`, R6 and R11; `architecture-audit/baseline/architecture-map.md`, “Additional service/domain coupling paths”).
- Current source samples were captured with line numbers:
  - `source-canvas-read-port.stdout`: `CanvasWorldReadPort` exposes realization methods and calls domain realization with `world` at adapter lines 46-51.
  - `source-three-read-port.stdout`: `ThreeWorldReadPort` wraps `World` and calls 2D/3D realization with `world` at lines 84-86, 98, and 117.
  - `source-domain-realization-context.stdout`: `Element2D` already uses `ProjectionElementRealizationContext` at lines 1 and 108, while `Element3D.realize3D(world: any): any` remains at line 40 and `ProjectionElementRealizationContext` is defined at `ProjectionPlaneContext.ts:9-20`.
  - `static-realization-world-scan.stdout` and `static-any-scan.stdout`: current residual full-`World` and `any` realization seams across application read ports and domain realization classes.

## Ranking rationale

Wave 018 is ranked ahead of broader 3D scene-host lifecycle, app-shell service concentration, backend/frontend contract stance, validation-gate hardening beyond the already green gates, placeholder/debug cleanup, and docs/spec drift because it sits directly under the presentation read-port work completed in Waves 016 and 017. The current selectors now consume read ports, but the read-port adapters must still pass full `World` into domain realization. That means later rendering, scene, app-shell, and documentation waves would be forced to preserve or work around a core domain contract that is still too broad.

The proposed Wave 018 is bounded: it does not implement source changes in this stage, and its future implementation scope is limited to caller inventory, typed realization context contracts, presentation read-port adapter alignment, focused tests, and mandatory validation. It explicitly rejects broad rendering/platform, command/undo, persistence, backend, package/tooling, docs/spec, or validation-framework redesigns unless a reviewed plan edit broadens scope.

## Recommended next stage

Run `cycle-018-wave-plan-extension-review` before any Cycle 018 scout/proposals or implementation. If the review signs off, start the canonical `cycle-018-fresh-scout-proposals` stage for Wave 018 — Domain realization context boundary — with scope check and direct/restructure proposals. Do not implement Wave 018 until proposal review convergence and decision are recorded.
