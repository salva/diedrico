# Cycle 026 Decision — Tool interaction read context and realization adapter seam

## Decision

**Selected implementation path:** `proposals/proposal-direct.md` after Corrections Round 01.

Cycle 026 may proceed to implementation using the corrected direct proposal. The selected path is to delete the raw `World` handoff into active tools and replace it with behavior-sized runtime-owned tool read/realization ports. This directly addresses the Wave 026 target seam while preserving the command sink, persistence, presentation read models, and other protected surfaces unless a reviewed stop condition is triggered.

**Rejected alternative:** `proposals/proposal-restructure.md` is not selected for this cycle. It remains a fallback only if implementation proves the corrected direct path cannot remove `ToolContext.world` without creating a hidden world facade or without broader shared adapter extraction. The restructure proposal is broader than current evidence requires because it moves tools, canvas presentation, and three presentation behind a shared application adapter in one wave, increasing regression and god-adapter risk.

## Evidence inspected

This decision is based on the current Cycle 026 artifacts and scoped source-control evidence, without source implementation:

- `architecture-audit/cycle-026-tool-interaction-read-context/scope-check.md`
- `architecture-audit/cycle-026-tool-interaction-read-context/proposals/proposal-direct.md`
- `architecture-audit/cycle-026-tool-interaction-read-context/proposals/proposal-restructure.md`
- `architecture-audit/cycle-026-tool-interaction-read-context/reviews/round-01-review.md`
- `architecture-audit/cycle-026-tool-interaction-read-context/corrections-round-01.md`
- `architecture-audit/cycle-026-tool-interaction-read-context/reviews/round-02-review.md`
- `architecture-audit/wave-plan.md`, Wave 026 entry
- Scoped status/diff logs captured for this decision:
  - `architecture-audit/cycle-026-tool-interaction-read-context/decision-scoped-status.stdout.log`
  - `architecture-audit/cycle-026-tool-interaction-read-context/decision-scoped-status.stderr.log`
  - `architecture-audit/cycle-026-tool-interaction-read-context/decision-scoped-diff.stdout.log`
  - `architecture-audit/cycle-026-tool-interaction-read-context/decision-scoped-diff.stderr.log`
  - `architecture-audit/cycle-026-tool-interaction-read-context/decision-wave026-grep.stdout.log`
  - `architecture-audit/cycle-026-tool-interaction-read-context/decision-wave026-grep.stderr.log`

Scoped status showed the Cycle 026 review artifacts as untracked and no scoped source diff for the selected source paths. This decision does not implement production, test, package, backend, docs/spec, or config changes.

## Review convergence status

Review convergence is complete.

Round 01 returned **BLOCKING ISSUES** against the direct proposal:

1. The original direct proposal overreached by treating deletion of `CanvasWorldReadPort` raw collection returns and `getProcessTree()` as a Wave 026 delete target without evidence that those surfaces block deletion of tool raw-world access.
2. The anti-facade guard was not concrete enough; it needed a caller map proving every new port method served an existing tool need.
3. Residual out-of-scope seams needed explicit acceptance, including `RuntimeSession` properties/process reads, `CanvasToolController` world ownership for mutation orchestration, and presentation-local realization helpers.

Corrections Round 01 edited `proposal-direct.md` in place to resolve all three blockers:

- Canvas/three adapter work is now optional and bounded to helper extraction directly required by the tool context split.
- `CanvasWorldReadPort.getProcessTree()`, canvas raw collection returns, canvas selector DTOs, and three read models are protected unless a reviewed mini-cycle expands scope.
- Every new tool read/realization method must map to enumerated current tool callers, and generic `WorldView` / `ToolWorld` / `WorldQuery` / `query(...)` / `traverse(...)` / `getAll...` / collection-dump facades are forbidden.
- Residual runtime/process/properties reads, `CanvasToolController` mutation ownership, and presentation-local helpers are accepted future-wave debt when not required for deleting raw tool-world access.

Round 02 returned **NO BLOCKING ISSUES** and recommended `cycle-026-decision` with `proposal-direct.md` as the preferred proposal. It scored the corrected direct proposal as passing the wave target, architecture/code-quality, no-backcompat deletion, overfeaturism, risk, and validation criteria, with the main residual caution being avoidance of a renamed `World` facade during implementation.

## Bound implementation scope

The implementation stage is authorized to change only the surfaces required by the corrected direct proposal:

### In-scope production files/surfaces

- `frontend/src/application/appShell/RuntimeSession.ts`
  - Build the runtime-owned tool read/realization port from the private `World`.
  - Replace `tool.handleClick({ ...context, world: this.world })` with world-free invocation.
  - Do not redesign properties/process reads, command producers, persistence, restore/snapshot, or unrelated runtime session responsibilities.
- `frontend/src/application/appShell/RuntimeViewPorts.ts`
  - Align `CanvasToolInvocationContext` / `CanvasViewPort.invokeToolClick` typing with the world-free tool context.
  - Narrow touched `any` seams only where directly part of the tool invocation split.
- `frontend/src/tools/ITool.ts`
  - Delete the concrete `World` import and `world: World` from `ToolContext`.
  - Type touched context fields such as `paperToPlaneTransform` without broad `any` where directly part of the split.
- `frontend/src/tools/ArgumentCollectorTool.ts`
  - Replace active-plane lookup, hit-result element lookup, and validator context world use with the selected read port.
- `frontend/src/types/ToolArgumentCollector.ts`
  - Delete `CollectionContext.world` and update validator/execution context types/comments to use bounded read capabilities.
- Concrete active tools under `frontend/src/tools/` that currently use `context.world`, `CollectionContext.world`, or `realize2D(context.world)`, including at minimum the tools named by the proposal and final static scan:
  - `CircleTool.ts`
  - `Create3DPointTool.ts`
  - `Create3DLineTool.ts`
  - `Create3DSegmentTool.ts`
  - `Create3DPlaneTool.ts`
  - `CreateProjectionPlaneTool.ts`
  - `ParallelLineTool.ts`
  - `PerpendicularLineTool.ts`
  - `TangentLineToCircleThroughPointTool.ts`
  - `TangentLineToCircleParallelToLineTool.ts`
- `frontend/src/application/tools/CanvasToolController.ts` and `ToolCommandIntents.ts` only for type alignment with the existing command sink; no command semantic redesign.
- `frontend/src/components/workspace/SvgCanvas.vue` only for tool invocation type wiring if required.
- `frontend/src/application/canvasPresentation/CanvasInteractionQuery.ts` only if hit-result read models need a narrowly typed identifier to support the tool read port.
- `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts`, `CanvasPresentationSelector.ts`, `CanvasVisibilityPolicy.ts`, and `frontend/src/application/threePresentation/ThreeWorldReadPort.ts` only for optional, directly adjacent helper extraction needed to construct the tool read/realization port. They are not independent cleanup targets in this cycle.
- Focused tests and static/boundary scans for touched tool/runtime/presentation boundaries.
- Cycle implementation artifacts:
  - `architecture-audit/cycle-026-tool-interaction-read-context/implementation-log.md`
  - `architecture-audit/cycle-026-tool-interaction-read-context/validation/**`

### Required delete list

The implementation must delete, not shim:

- `world: World` from `frontend/src/tools/ITool.ts` and the corresponding `World` import when no longer needed.
- `CollectionContext.world` from `frontend/src/types/ToolArgumentCollector.ts`.
- Active production `context.world`, `CollectionContext.world`, and `realize2D(context.world)` usages in tools.
- The raw-world injection implementation in `RuntimeSession.canvasViewPort().invokeToolClick`.
- Any transitional dual raw-world/read-port path, compatibility wrapper, broad catch-all tool facade, dead export, or test that asserts full `World` injection into tool contexts.
- Touched broad `any` seams only where directly part of the tool context split; do not expand into unrelated type cleanup.

### Ownership rules

- `RuntimeSession` remains the owner of the concrete `World` for this seam.
- Tools must receive only named behavior-sized read/realization capabilities plus existing command-sink mutation capabilities.
- Tool mutations continue through `ToolCommandSink` / existing command intent flow; the read port must not become a mutation or command-execution service.
- Vue/Svg canvas code remains thin and event-oriented; it must not receive or construct `World` access.
- `CanvasToolController` may retain `World` / `CommandStack` ownership for mutation/use-case orchestration because that is outside this read-context deletion unless type alignment is directly necessary.
- Presentation adapters may retain local runtime/domain realization helpers when not needed for the tool port; record them as residual future-wave candidates rather than silently broadening this wave.

### Tool read/realization port requirements

Any new tool read/realization port must be behavior-sized and caller-mapped. Every method must map to at least one current tool caller identified by the corrected proposal or by the final implementation scan. Allowed categories are limited to active tool needs such as:

- projection-plane lookup and distinct-plane checks for argument collection, 3D construction, and projection-plane creation;
- hit-result element lookup by id for `ArgumentCollectorTool`;
- point/line/circle lookup where a concrete tool needs a specific element type;
- point/line/circle realization reads for circle, projection-plane, parallel/perpendicular, and tangent validation/variant selection;
- projection-plane transform or 3D realization only if a current tool caller demonstrably needs that behavior directly.

Forbidden replacements include generic `WorldView`, `ToolWorld`, `RuntimeWorld`, `WorldQuery`, `query(...)`, `traverse(...)`, `getAll...`, raw collection dumps, canvas/three-only pass-through methods on the tool port, catch-all realization contexts mirroring `World`, and compatibility overloads that keep `ToolContext.world` beside the new port.

## Protected out-of-scope surfaces

Implementation must not modify, delete, or absorb the following unless a reviewed mini-cycle / plan edit explicitly expands scope:

- `CanvasWorldReadPort.getProcessTree()` and canvas raw domain collection returns, unless a specific current tool-port method requires a shared helper and the change remains directly tied to deleting `ToolContext.world`.
- Canvas selector DTO redesign, broad presentation adapter redesign, and three presentation traversal/read-model redesign.
- `RuntimeSession` properties-dialog coordinate reads and process-tree infeasibility reads, unless type alignment is directly required by the selected tool port.
- `CanvasToolController` command mutation ownership beyond type alignment.
- Persistence schema/replay, `ProjectService`, local/Drive project serialization, and `ProjectSessionPersistenceAdapter` contracts.
- Backend, docs/spec reconciliation, debug cleanup, package/tooling churn, and validation-platform framework work.
- Drive/auth/browser integration internals and any secret/config reads.
- Command history, command descriptors, command producer redesign, undo/redo lifecycle redesign, and broad command semantics.
- Broad domain realization redesign, including global `Element2D.realize2D(...)` ownership changes.
- Broad application-kernel/service-locator work.
- Elements visibility command/persistence behavior.
- Stale discarded audit history.

## Source-control hygiene constraints

The implementation stage must begin with path-scoped status and diff. The worktree may contain broad unrelated dirty state; do not revert, normalize, incorporate, or rely on unrelated changes. Touch only files required by the selected implementation scope and the required audit/validation artifacts. Do not switch branches, rebase, push, or read protected secret/config files.

## Validation requirements for implementation

The implementation stage must capture stdout/stderr to stable files under:

`architecture-audit/cycle-026-tool-interaction-read-context/validation/`

Minimum required validation:

1. Pre- and post-edit scoped git status/diff for touched paths.
2. Static scans proving absence of `ToolContext.world`, `CollectionContext.world`, active production tool `context.world`, `realize2D(context.world)`, raw-world tool injection through `invokeToolClick`, dual raw-world/read-port paths, compatibility wrappers, and generic `WorldView`/`ToolWorld`/query/traverse/get-all facades.
3. Caller-map evidence showing every new tool read/realization port method has an enumerated current tool caller and no canvas/three-only method is placed on the tool port.
4. Focused Vitest for `ArgumentCollectorTool`, representative concrete tools using realization reads, runtime canvas invocation wiring, and canvas/three adapters only if touched.
5. Existing command-sink/controller tests or focused equivalents proving command behavior remains intact.
6. Root and frontend lint where scripts exist.
7. Focused and full root/frontend Vitest where scripts exist.
8. Root and frontend build where scripts exist.
9. Playwright/e2e because the wave touches frontend construction/canvas/3D user-observable behavior.
10. Live preview refresh bound to `0.0.0.0:5173`, HTTP reachability probe, and live/Playwright smoke for representative 2D construction, tangent/parallel/perpendicular, projection-plane or 3D construction, hover/hit testing, 3D refresh, and undo/redo.

Undefined commands may be skipped only with exact package-script evidence in `implementation-log.md`; defined commands are mandatory. Any validation failure attributable to the change rejects the wave until fixed.

## Stop conditions

Stop implementation and request a reviewed plan edit or mini-cycle if any of the following becomes necessary:

- keeping `ToolContext.world` or a dual raw-world/read-port path;
- adding a generic world facade or any new tool-port method without a current caller-map proof;
- changing persistence/replay/project service/Drive/local serialization;
- redesigning command descriptors/history/producers/undo-redo semantics;
- changing package/tooling, backend contracts, docs/specs, validation infrastructure, Drive/auth, or secret/config handling;
- changing global domain realization ownership, including `Element2D.realize2D(...)` contract;
- deleting or reshaping `CanvasWorldReadPort.getProcessTree()`, canvas raw collection returns, canvas selector DTOs, or three read models for reasons not directly required by the tool context split;
- absorbing unrelated dirty worktree changes.

## Residual risks accepted for implementation

- A narrow read port can still drift into a renamed `World` facade; this is controlled by the caller-map rule and static scans.
- Tangent, parallel/perpendicular, projection-plane, and 3D construction behavior is sensitive because it depends on realization reads; focused and live validation must cover these paths.
- Runtime properties/process reads and presentation-local realization helpers remain future-wave debt when not needed for this cycle.
- Canvas/three adapters remain adjacent architecture debt, but broad presentation/domain realization cleanup is intentionally deferred unless the selected direct path proves impossible.

## Next stage recommendation

Because Round 02 found **NO BLOCKING ISSUES**, the next stage should be:

`cycle-026-implement-tool-interaction-read-context`

That implementation stage must follow this decision and the corrected `proposal-direct.md` exactly. Any deviation that broadens scope requires a reviewed mini-cycle before source implementation continues.
