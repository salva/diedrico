# Cycle 026 Wave-plan extension note

## Purpose

This planning-only task extends `architecture-audit/wave-plan.md` after Wave 025. No production source, tests, package/tooling, backend, docs/specs, secret/config, or next-wave implementation changes were made.

## Source-control hygiene

Path-scoped status and diff evidence were captured before editing this plan extension:

- `pre-scoped-status.stdout.log`
- `pre-scoped-diff.stdout.log`

The scoped status/diff showed unrelated dirty source changes in `frontend/src/domain/calculations/Intersections.ts` and `frontend/src/domain/processTree/ActionGroup.ts`. They were not reverted, normalized, incorporated, or relied on. This task modified only planning/audit artifacts and its report.

## Evidence inspected

Wave 025 closure artifacts were inspected first:

- `architecture-audit/cycle-025-runtime-view-read-ports/implementation-log.md` marks `**Wave 025 status: COMPLETE.**`, lists green lint/test/build/e2e/preview evidence, and names the residual next-wave candidates: `CanvasViewPort.invokeToolClick` still passes raw `World` into tools; canvas/three adapters still contain domain-heavy realization/read logic; elements visibility remains a named view intent rather than command-backed behavior.
- `architecture-audit/cycle-025-runtime-view-read-ports/reviews/validation-closure-review.md` reports no blockers and accepts the residual raw tool-context seam as future-wave work.
- `architecture-audit/cycle-025-runtime-view-read-ports/validation/closure-static-scan.stdout.log` confirms deleted view-world seams remain absent except private `RuntimeSession.world` ownership and `RuntimeSession.getVersion()`.

Current source samples were then inspected and line-number evidence was captured under this directory:

- `runtime-session-evidence.stdout.log` shows `RuntimeSession` privately owns `World`, builds canvas and three read adapters, and still calls `tool.handleClick({ ...context, world: this.world })` through `invokeToolClick` (`frontend/src/application/appShell/RuntimeSession.ts:41-77`). It also shows related adapter/realization seams in properties/process read helpers and `any` element formatting (`RuntimeSession.ts:301-340`, `:399-417`).
- `tool-context-evidence.stdout.log` shows `RuntimeViewPorts.CanvasToolInvocationContext` excludes world while `CanvasViewPort.invokeToolClick` bridges to `ITool`; `ITool.ToolContext` imports and exposes concrete `World` and has broad `any` state/context fields (`frontend/src/application/appShell/RuntimeViewPorts.ts:25-60`; `frontend/src/tools/ITool.ts:9-29`, `:42-49`). It also shows `ArgumentCollectorTool.handleClick` using `world` for plane lookup, hit-result element lookup, and collection validation context (`frontend/src/tools/ArgumentCollectorTool.ts:162-216`).
- `residual-seam-scan.stdout.log` shows concrete tools using `realize2D(context.world)` for circle, projection-plane, parallel/perpendicular, and tangent workflows, confirming the seam is active beyond the base collector.
- `adapter-realization-evidence.stdout.log` shows `CanvasWorldReadPort` returning raw domain collections and mirroring many `World` realization methods (`frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:15-70`) and `ThreeWorldReadPort` building read models by traversing concrete `World` and broad realization contexts (`frontend/src/application/threePresentation/ThreeWorldReadPort.ts:56-135`).
- `baseline-risk-map-evidence.stdout.log` confirms the baseline centrality principles still relevant here: domain/application `World` boundary risk (R1), god-module/safe-change risk (R2), UI/tool bypass risk (R5), weak type contracts (R6), rendering domain/view mixing (R8), and boundary-test weakness (R10/R11).

## Ranking rationale

Wave 025 removed the broad Vue-facing raw-world read seam. The next most central remaining seam is therefore inward: the runtime still reintroduces the concrete domain root into active tools through `CanvasViewPort.invokeToolClick` and `ITool.ToolContext.world`. This seam is more central than backend/docs/tooling/Drive/package cleanup because it sits on the active construction interaction path and can bypass the private-world/runtime-port architecture that Wave 025 established.

The proposed Wave 026 is bounded to tool interaction/read context and adjacent realization/read adapters. It does not absorb persistence schema/replay, backend/frontend contract stance, command history/producer redesign, generic application-kernel work, validation-platform hardening, docs/spec drift, Drive/auth, package/tooling churn, or broad domain realization redesign. The wave explicitly requires the fresh scout/proposals stage to inventory every tool/world/read-adapter use and stop for a reviewed plan edit if deleting `ToolContext.world` proves to require a deeper domain-realization redesign.

## Deferred candidates

- **Elements visibility command ownership:** still a real candidate, but current behavior is a named view intent after Wave 025. Making it command-backed would touch command/persistence semantics and is less central than deleting the raw tool context.
- **Toolbar-history unknown/provider typing:** a leaf type cleanup candidate, not the main active construction/read boundary.
- **ProjectSessionPersistenceAdapter / ProjectService DTO casts:** important but belongs to a persistence-contract wave, not this interaction seam.
- **Validation gate hardening, docs/spec drift, backend/frontend stance, Drive/auth, package/tooling:** enforcement/integration/documentation concerns that should wait until central interaction/read boundaries are cleaner.
- **Broad domain realization redesign:** potentially central, but too large for this plan extension unless the Cycle 026 scout proves the narrow tool/read-context removal cannot be completed without it.

## Wave-plan edit

`architecture-audit/wave-plan.md` now has a new `Wave 026 — Tool interaction read context and realization adapter seam` entry with required status, scope, scope guard, current grounding, target outcome, explicit DELETE list, success criteria, dependencies, validation requirements, risks, and no-backcompat rationale.

## Next recommended stage

After bounded review/correction of this plan extension, proceed to the canonical `cycle-026-fresh-scout-proposals` stage. That stage should write `architecture-audit/cycle-026-tool-interaction-read-context/scope-check.md` and the paired direct/restructure proposals before any implementation.
