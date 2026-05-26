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
- `source-three-scene-lifecycle-t3.stdout`: current `ThreeView.vue`, `ThreeViewRuntime.ts`, and `ThreeSceneHost.ts` lifecycle evidence showing Vue shell watcher/listener/subscription wiring, runtime adapter orchestration, and scene-host ownership of camera/renderers/OrbitControls/lights/animation/disposal.
- `static-three-scene-lifecycle-t3.stdout`: current static scan for OrbitControls, animation frame, resize/listener, renderer/camera/scene, adapter object creation, and disposal seams in the 3D rendering platform.
- `baseline-three-appshell-evidence-t3.stdout`: baseline citations for remaining 3D rendering concentration, app-shell concentration, and why rendering platform work remains central before later peripheral cleanup.

## Ranking rationale

Wave 018 remains the recommended immediate next wave because it sits directly under the presentation read-port work completed in Waves 016 and 017. The current selectors now consume read ports, but the read-port adapters must still pass full `World` into domain realization. That means later rendering, scene, app-shell, and documentation waves would be forced to preserve or work around a core domain contract that is still too broad.

Wave 019 is now added as the ordered next step after Wave 018: Three scene-host lifecycle and renderer platform boundary. This is ranked after Wave 018, not before it, because scene-host/runtime cleanup should consume stable typed realization/read-context outputs rather than compensating for full-`World`/`any` domain realization seams. It is ranked before app-shell service concentration, backend/frontend contract stance, validation-gate hardening, placeholder/debug cleanup, and docs/spec drift because current evidence shows the 3D rendering platform still owns central user-visible lifecycle concerns: `ThreeView.vue` wires resize/watch/world-change subscriptions, `ThreeViewRuntime` hard-wires the host/controller/adapters, and `ThreeSceneHost` owns camera/renderers/CSS2D DOM/OrbitControls/lights/animation/disposal in one class. App-shell and backend/docs cleanup are important, but they should not be pulled ahead of this remaining rendering-platform boundary unless Wave 018 invalidates the premise and a reviewed plan edit re-ranks again.

The proposed Wave 018 is bounded: it does not implement source changes in this stage, and its future implementation scope is limited to caller inventory, typed realization context contracts, presentation read-port adapter alignment, focused tests, and mandatory validation. Wave 019 is also bounded as planning only in this stage; its future implementation scope is limited to Three.js runtime/platform lifecycle seams, testable host/runtime/registry contracts, adapter disposal ownership, focused tests, and mandatory validation. Both entries explicitly reject broad app-shell, command/undo, persistence, backend, package/tooling, docs/spec, or validation-framework redesigns unless a reviewed plan edit broadens scope.

## Recommended next stage

Run `cycle-018-wave-plan-extension-review` before any Cycle 018 scout/proposals or implementation. If the review signs off, start the canonical `cycle-018-fresh-scout-proposals` stage for Wave 018 — Domain realization context boundary — with scope check and direct/restructure proposals. Do not implement Wave 018 until proposal review convergence and decision are recorded. After Wave 018 completes and the plan is re-read, Wave 019 — Three scene-host lifecycle and renderer platform boundary — is the recommended next ordered candidate unless Wave 018 evidence requires a reviewed re-rank.
