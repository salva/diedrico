# Wave 006a Decision — Canvas/tool command controllers

**Cycle:** `cycle-006a-canvas-tool-command-controllers`  
**Decision stage:** `cycle-006a-decision`  
**Source-code changes in this stage:** none.  
**Decision-stage verification:** updated in `cycle-006a-decision`; no `frontend/`, `backend/`, or `specs/` source changes are part of this decision stage.  
**Review convergence:** complete after round 01.  
**Selected implementation proposal:** `proposals/proposal-direct.md`.  
**Rejected/deferred alternative:** `proposals/proposal-restructure.md`.

## Artifacts considered

This decision is based on the Wave 006a convergence set and the reviewed Wave 006 split:

- `scope-check.md` — confirms Wave 006a premises still hold and limits this cycle to the active `SvgCanvas.vue` / `frontend/src/tools/**` canvas/tool command lifecycle, excluding `ActionsPanel.vue` and `Toolbar.vue` as Wave 006b residuals.
- `proposals/proposal-direct.md` — proposes an in-place application-owned canvas/tool controller boundary while preserving the existing tool interaction model.
- `proposals/proposal-restructure.md` — proposes a broader application interaction port and central command router as a higher-level alternative.
- `reviews/round-01-review.md` — reviews the corrected proposal set, records the earlier fresh-scout tool-scope correction context, scores both proposals, recommends Proposal Direct, and declares **NO BLOCKING ISSUES**.
- `architecture-audit/wave-plan.md` — contains the reviewed Wave 006a entry that explicitly scopes canvas/tool command controllers before Wave 006b panel/toolbar cleanup.
- `architecture-audit/cycle-006-ui-command-controllers/reviews/plan-split-review.md` — accepted the split of original Wave 006 into Wave 006a and Wave 006b with no blockers.

## Review convergence result

Review convergence is complete for Wave 006a after round 01.

The review artifact states **NO BLOCKING ISSUES** and confirms that the corrected proposal set satisfies the review criteria. It also records that the earlier fresh-scout blocker around overbroad 3D/example tool scope was corrected in-place before this decision. No further review round is required before implementation.

## Selected proposal

Wave 006a will implement **Proposal Direct: Extract canvas/tool command controllers in-place**.

Reasons:

1. It directly addresses the active canvas/tool leaks evidenced in `scope-check.md`: `SvgCanvas.vue` constructs and pushes commands for point dragging and style edits, `ToolContext` exposes `CommandStack`, `ArgumentCollectorTool` owns an open-command lifecycle, and concrete tools import command/factory/process-tree internals.
2. It creates the required application use-case/controller boundary for canvas construction, validation orchestration, command-stack execution, point movement, style updates, rollback/commit semantics, and undo/redo effects without broadening into unrelated UI surfaces.
3. It respects the reviewed 006a/006b split: `ActionsPanel.vue` and `Toolbar.vue` stay out of this implementation and remain explicit Wave 006b targets.
4. It applies the no-backcompat/aggressive-deletion priority by deleting command-shaped tool APIs, direct operation imports, misleading factory layering, unused/misaligned command-execution composables, and obsolete command-internals tests rather than wrapping them.
5. It is less likely than the broader restructure option to create a new generic router/god module or prematurely design for panel/toolbar consumers before the active canvas/tool path is cleaned.

## Rejected/deferred alternative

`proposals/proposal-restructure.md` is rejected as the Wave 006a implementation baseline.

The restructure proposal is architecturally valid and identifies a useful long-term seam: typed application interaction intents could later be shared by canvas tools and Wave 006b panel/toolbar surfaces. However, using that broader interaction port as the primary 006a implementation risks over-designing for future consumers, widening the cycle, and creating a central router that becomes a new god module. The selected direct proposal already delivers the necessary boundary for this wave: presentation/tool classes stop constructing commands, while application use-cases/controllers own command execution.

The useful insight from Proposal Restructure is retained only as an implementation constraint: any controller/use-case API introduced in 006a should use typed intents/results and avoid exposing `Command`, `CommandStack`, concrete operations, or process-tree operations back to Vue components and tools. Implementation must not specialize for `ActionsPanel.vue` or `Toolbar.vue` in this wave.

## Exact implementation scope

The implementation stage must follow Proposal Direct and stay within the active canvas/tool command lifecycle.

### Canvas component path

- In `frontend/src/components/workspace/SvgCanvas.vue`:
  - Remove direct command/operation construction for the selected canvas path, including `Command`, concrete point-move operations, style-update operations, and direct stack push calls used for point movement or style editing.
  - Replace point-drag open-command state with controller/use-case calls for preview, commit, and cancel.
  - Replace `handleSaveProperties()` command assembly with a typed style-update intent/use-case call.
  - Keep rendering, coordinate conversion, hit testing, selection state, paper/view interactions, and active tool lifecycle in the component unless a narrow change is required to delegate the command lifecycle.
  - Keep selection behavior local unless it is strictly necessary to preserve command-controller delegation; selection extraction is not a 006a target.

### Tool API and active tool classes

- In `frontend/src/tools/ITool.ts`:
  - Delete `CommandStack` exposure from `ToolContext`.
  - Define a typed tool-command sink/controller facade or equivalent use-case entrypoint that carries only application-level intents/results.
  - Update comments so tools are described as argument/interaction collectors, not command creators/executors.
- In `frontend/src/tools/ArgumentCollectorTool.ts`:
  - Delete the open-command lifecycle, including `new Command`, `executeOperations(cmd, ...)`, commit/rollback ownership, and direct `commandStack.push()`.
  - Replace command-shaped subclass hooks with typed intent construction/execution through the controller boundary.
  - Preserve argument collection, any-order collection, validation, masks, status, warnings, and completion/reset behavior.
- Required core canvas construction tools to migrate through the new boundary:
  - `PointTool.ts`
  - `LineTool.ts`
  - `SegmentTool.ts`
  - `CircleTool.ts`
  - `GuideTool.ts`
  - `IntersectionTool.ts`
  - `ParallelLineTool.ts`
  - `PerpendicularLineTool.ts`
  - `TangentLineToCircleThroughPointTool.ts`
  - `TangentLineToCircleParallelToLineTool.ts`
- Required dynamic-plane tool:
  - `CreateProjectionPlaneTool.ts`, including dynamic projection-plane validation and command sequencing through application use-cases/controllers.

### Evidence-backed 3D/example/quick tool handling

Implementation must explicitly classify each actively registered 3D/example/quick canvas tool before changing or deleting it. The classification must be recorded in `implementation-log.md`.

- **Conditionally retained 3D construction tools:**
  - `Create3DPointTool.ts`
  - `Create3DLineTool.ts`
  - `Create3DSegmentTool.ts`
  - `Create3DPlaneTool.ts`
  - These are in scope only because `SvgCanvas.vue` actively imports/exposes them in the canvas tool factory path. If retained as current user-facing canvas flows, migrate them through the same typed controller/use-case boundary and remove direct command/factory/operation imports. If proven debug-only, unreachable, or not worth preserving, delete their active registration/import/tool/test path rather than retaining a parallel command-construction path.
- **Conditionally retained quick/example tools:**
  - `QuickProjectionSetupTool.ts`
  - `Quick3DLineTool.ts`
  - `Quick3DSegmentTool.ts`
  - `ExampleConstructionsTool.ts` / `InteractiveProjectionSetupTool`
  - These are not mandatory migration targets merely because files exist. If retained as user-facing canvas behavior, route them through the new boundary. If debug/example-only or obsolete, delete their active canvas registration/import/tool/test path. They may be deferred only if removed from the active canvas factory path without leaving a command-construction leak.
- Do not broaden this classification into `Toolbar.vue` example/debug setup; toolbar shortcut decisions are Wave 006b.

### Application controller/use-case boundary

Introduce or use application-level modules for canvas/tool command creation and execution, such as focused modules under `frontend/src/application/tools/`, `frontend/src/application/construction/`, and `frontend/src/application/canvas/`. The exact names may vary, but the boundary must satisfy these requirements:

- Vue components and tools pass typed intents, collected argument DTOs, drag/style requests, and interaction metadata.
- Application controllers/use-cases own command creation, concrete operation sequencing, validation orchestration, process-tree action group creation, commit/rollback, command-stack push, and typed success/error results.
- Tools/components do not import concrete operation classes, process-tree operation classes, UI-facing sequence factories, `Command`, or `CommandStack` for the selected path.
- The application layer may import existing command/operation classes as implementation details.
- Avoid a broad generic router or god module; split construction, movement, style, and execution responsibilities into focused units.

### Factory path cleanup

- Move or fold the selected canvas construction logic from `frontend/src/commands/factories/*SequenceFactory.ts` and `frontend/src/services/factories/PlaneSequenceFactory.ts` into application-owned construction/use-case modules when those factories only serve UI construction use-cases.
- Delete the misleading public `commands/factories` versus `services/factories` split for the selected canvas path where replacement modules make it obsolete.
- Do not preserve old public sequence-factory APIs as compatibility shims if no active non-UI caller needs them.

### Tests

- Add or update focused controller/use-case tests independent of Vue rendering.
- Update tool tests to assert emitted typed intents, masks, validation/status/warning behavior, and completion/reset behavior rather than concrete command internals.
- Update canvas/component tests to assert delegation and user-visible behavior rather than operation construction.
- Delete obsolete tests that inspect `Command.getOperations()`, concrete operation instances, direct stack pushes, or old open-command tool internals for the selected path.

## Exact DELETE / retain-or-delete list

The implementation must delete the following surfaces from the selected canvas/tool path and leave no shims, parallel APIs, or misleading old exports unless a current non-006a active caller is explicitly documented:

- Direct concrete operation imports from `SvgCanvas.vue` for point movement and style updates.
- Direct command construction and direct command-stack push logic from `SvgCanvas.vue` for point movement and style updates.
- `CommandStack` exposure in `ToolContext` and any active tool APIs that require tools to push commands.
- `Command` imports from `ArgumentCollectorTool.ts` and retained concrete tools in the selected canvas path.
- Concrete operation and process-tree operation imports from retained concrete tools in the selected canvas path.
- Open-command lifecycle hooks such as `executeOperations(cmd, args, context)` in `ArgumentCollectorTool.ts` and subclasses.
- UI-facing sequence-factory imports from retained tools/components in the selected canvas path.
- Duplicate or misleading factory layering for the selected construction path, especially the public split between `frontend/src/commands/factories/*SequenceFactory.ts` and `frontend/src/services/factories/PlaneSequenceFactory.ts` where the selected implementation replaces it with application-owned construction/use-cases.
- `frontend/src/composables/useCommandExecution.ts` if static search confirms it remains unused by active source. If a current active caller is found, delete its broad legacy executor shape, remove `any` result exposure, and replace it with a thin typed adapter around the new application command-execution boundary.
- Obsolete command-internals tests for the selected path, including tests that assert concrete operation classes, `Command.getOperations()`, or direct `CommandStack.push()` from tools/components.
- Any debug/example/quick/3D tool active registration/import/test/docs path that the implementation classifies as non-user-facing or unreachable.

The implementation must explicitly retain or delete, with evidence, the following categories:

- Required core 006a construction tools listed above: retain behavior and migrate.
- Required dynamic projection-plane creation: retain behavior and migrate.
- Conditionally retained 3D construction tools: retain-and-migrate if user-facing; otherwise delete from active path.
- Conditionally retained quick/example tools: retain-and-migrate if user-facing; otherwise delete from active path.
- `ActionsPanel.vue` and `Toolbar.vue`: retain untouched in 006a, cite as Wave 006b residual command leaks if still present.

## Implementation constraints

- Do not modify `frontend/src/components/panels/ActionsPanel.vue` in Wave 006a.
- Do not modify `frontend/src/components/toolbars/Toolbar.vue` in Wave 006a.
- Do not create panel/toolbar-specific command-intent adapters in Wave 006a.
- Do not partially patch panel/toolbar command leaks as opportunistic cleanup; those belong to Wave 006b.
- Do not introduce a compatibility wrapper that still lets tools/components construct commands directly.
- Do not leave both old UI-facing factories and new application construction modules active for the same selected path.
- If implementation discovers that preserving behavior requires touching `ActionsPanel.vue`, `Toolbar.vue`, broad app-shell orchestration, rendering selectors, or unrelated persistence/backend code, stop and request a reviewed mini-cycle before broadening scope.

## Mandatory validation requirements

Implementation and validation stages must capture full stdout/stderr under `architecture-audit/cycle-006a-canvas-tool-command-controllers/validation/`.

### Static architecture/deletion checks

Run static checks proving the selected canvas/tool boundary no longer imports or exposes command internals. Include checks equivalent to:

- Search `frontend/src/components/workspace/SvgCanvas.vue`, `frontend/src/tools/ITool.ts`, `frontend/src/tools/ArgumentCollectorTool.ts`, and retained `frontend/src/tools/*.ts` for imports/usages of `Command`, `CommandStack`, concrete command operations, process-tree operations, and UI-facing sequence factories.
- Search active source for `useCommandExecution` and either prove it is deleted or prove its remaining form is a thin typed adapter.
- Search retained tools/components for `executeOperations(`, `new Command(`, `.push(command`, `.push(cmd`, `commandStack`, and direct `Add*Op` construction.
- Search the selected canvas path for old sequence-factory imports from `commands/factories` and `services/factories`, and classify any remaining hits as non-UI implementation details or delete them.
- Search `ActionsPanel.vue` and `Toolbar.vue` only to confirm they were not modified in the 006a implementation and to record residual leaks for Wave 006b.

### Focused tests

Run focused Vitest coverage for at least:

- Controller/use-case command lifecycle for free point, line, segment, circle, guide plus sibling guide, parallel/perpendicular/tangent line flows, line-line/line-circle/circle-circle intersections, and dynamic projection-plane creation.
- Retained 3D/quick/example canvas tool flows or deletion proof for each non-retained flow.
- Point movement preview, commit, cancel, rollback on failure, and undo/redo stack effects.
- Style/property update command creation and undo/redo stack effects.
- Tool interaction: argument collection, any-order collection, masks, warnings, status messages, validation propagation, completion/reset behavior, and emitted typed intents/results.
- Canvas/component behavior: coordinate-to-intent delegation, selection behavior staying local, properties/style dispatch, point-drag lifecycle, and no direct operation construction.
- Command rollback/failure cases so command-stack entries are not pushed for failed construction.

### User-visible behavior and e2e coverage

Because this wave touches frontend code, canvas construction, persistence-adjacent command stacks, and user-observable behavior, Playwright/e2e is mandatory unless the implementation log gives an explicit evidence-backed classification for a non-attributable infrastructure blocker.

E2e/live coverage must include representative behavior for:

- construction of points, lines, segments, circles;
- guide and sibling-guide creation;
- intersections;
- dynamic projection-plane creation;
- retained 3D/quick/example flows or evidence-backed deletion outcomes;
- selection behavior;
- properties/style editing;
- point move/drag preview and commit/cancel;
- undo/redo after construction, style update, and point movement.

### Full cadence

Run and log:

- `npm run lint` at root and `npm run lint --workspace=frontend` where defined.
- Focused Vitest commands for controller/use-case/tool/canvas coverage.
- Full Vitest: `npm run test` at root and frontend workspace where defined.
- Builds: `npm run build` at root, `npm run build --workspace=frontend`, and backend build only where the root/workspace scripts define it or if touched by validation policy.
- `npm run test:e2e --workspace=frontend` or the project-defined frontend Playwright command.
- Live Playwright MCP smoke for representative canvas construction and undo/redo whenever the MCP target is available.
- Live preview refresh bound to `0.0.0.0` plus reachability probe, recorded in `implementation-log.md`.

## Accepted residual risks

The following risks are accepted for implementation but must be tracked in `implementation-log.md`:

- Point-drag preview semantics may rely on rollback behavior that is currently embedded in `SvgCanvas.vue`; focused preview/commit/cancel tests must prove the extracted use-case preserves it.
- Intersection and dynamic-plane tools mix interaction-specific geometric choice logic with command sequencing; keep interaction-specific selection logic near tools while moving command creation/validation orchestration into use-cases to avoid duplicated geometry checks.
- Some 3D/quick/example tools are actively registered but may be debug-only or weakly covered; implementation must classify and either migrate or delete them without leaving parallel command construction.
- Existing e2e or validation instability may surface during the full cadence; failures must be classified as attributable or non-attributable with stable logs, not ignored.
- `ActionsPanel.vue` and `Toolbar.vue` remain known direct command-construction leaks after 006a; this is intentional and deferred to Wave 006b.

## Next implementation scope

Proceed to `cycle-006a-implement-canvas-tool-command-controllers` with Proposal Direct only. The implementation must introduce/use application use-cases or tool controllers for canvas/tool command creation, validation orchestration, command-stack execution, point movement, style updates, and undo/redo effects; aggressively delete the selected old command/factory/test surfaces; leave `ActionsPanel.vue` and `Toolbar.vue` untouched; run the mandatory validation cadence; refresh the live preview; and record results in `architecture-audit/cycle-006a-canvas-tool-command-controllers/implementation-log.md`.
