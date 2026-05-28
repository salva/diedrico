# Proposal Restructure — Application command-producer kernel or plan split before implementation

## Summary

This proposal asks whether Wave 024 should move one conceptual layer higher than the direct cleanup: instead of only moving stack pushes behind narrow producer services, create a small application command-producer kernel that owns command lifecycle policies for all application command producers, then migrate canvas/construction/process-history as first clients.

The answer is conditional. Current source supports a bounded direct implementation, but the construction producer is broad enough that a higher-level kernel may be justified **only** if implementation cannot remove raw `CommandStack` without duplicating command lifecycle code or exposing generic command mutation through many small ports. If that happens, stop for a reviewed plan edit/delta before source changes.

## Current evidence for considering restructure

The direct seam is real:

- `RuntimeSession` passes private `world`/`commandStack` into canvas and process-history controllers (`frontend/src/application/appShell/RuntimeSession.ts:109-121`).
- `CanvasToolController` accepts raw `world`/`commandStack` and passes them to point movement, style, construction, and quick-tool use cases (`frontend/src/application/tools/CanvasToolController.ts:13-25`, `:28-44`).
- `ConstructionUseCases.ts` owns a large command-production switch spanning 2D, guide, intersection, tangent, 3D, and projection-plane creation (`frontend/src/application/construction/ConstructionUseCases.ts:35-238`).
- `ProcessHistoryUseCases` repeats the command lifecycle pattern for process-tree operations (`frontend/src/application/processHistory/ProcessHistoryUseCases.ts:72-90`).

The stale Wave 024 plan language is also important: `commandStackForDeferredCommandProducers()` is already absent and boundary tests assert it remains absent. Therefore any restructure must target current producer ownership, not revive a raw accessor cleanup that no longer exists. Any review/decision selecting this restructure path must explicitly state that the corrected Cycle 024 proposal set supersedes stale Wave 024 accessor/provide-inject wording for implementation scope, or else require a reviewed wave-plan/decision correction before implementation.

## Restructure option A: small application command-producer kernel

Create a narrowly bounded kernel module under `frontend/src/application/commandKernel/` or `frontend/src/application/commandProduction/` with these responsibilities:

- own creation of `Command` against the runtime `World`;
- provide transactional command execution primitives: execute operation sequence, rollback on failure, commit then push;
- provide preview-session semantics for temporary command mutations (needed by point drag);
- notify world changes only through existing command/world mechanisms;
- keep undo/redo/history access in existing `CommandHistoryPort`, not in this kernel.

The kernel would expose semantic use-case adapters, not raw stack methods:

- `CanvasCommandProducer` for construction/style/point movement;
- `ProcessHistoryCommandProducer` for process-tree actions;
- possibly `SelectionDeletionCommandProducer` in a later wave, but not in Wave 024 unless a reviewed plan edit expands scope.

### Files to change under option A

- Add kernel contracts/implementation under `frontend/src/application/commandProduction/`.
- Refactor `CanvasPointMovementUseCase`, `CanvasStyleUseCase`, `ConstructionUseCases`, `QuickToolUseCases`, `ProcessHistoryUseCases`, `CanvasToolController`, `ProcessHistoryController`, and `RuntimeSession` to consume kernel-backed producers.
- Update focused tests and boundary tests accordingly.

### DELETE list under option A

Same as direct proposal, plus delete any duplicate per-use-case lifecycle helper that becomes redundant after kernel extraction. Do not keep both a kernel and separate ad hoc command executors with overlapping semantics.

### Risks under option A

- The kernel can become a generic command bus/mini-framework that hides domain responsibilities and invites overfeaturism.
- If it exposes `execute(description, (cmd, world) => ...)` too broadly, it may simply rename raw `World`/`CommandStack` access.
- It may pull in selection deletion, initialization, persistence restore, or operation descriptor concerns prematurely.

### When option A is justified

Use option A only if the direct approach would require three or more duplicated command lifecycle implementations or would leave multiple modules still importing `CommandStack` solely to push committed commands.

## Restructure option B: split Wave 024 before implementation

If the fresh implementation scout finds construction cannot be narrowed without broader factory/operation redesign, split Wave 024 through a reviewed plan edit:

1. **024a — Canvas/process command lifecycle port cleanup**
   - point movement;
   - style update;
   - process-history actions;
   - quick-tool stale param deletion.
2. **024b — Construction command producer decomposition**
   - construction intent execution;
   - process action group creation;
   - sequence factory ownership;
   - guide/intersection/3D/dynamic-plane construction command ownership.

This split is valid only if construction proves too broad to safely migrate in the same cycle while preserving guide/intersection/3D flows and validation. Do not silently narrow the implementation while claiming full Wave 024 completion.

## Files/tests/docs/fixtures to DELETE if split is selected

For 024a:

- delete raw `CommandStack` dependencies from point movement, style, process-history, controller wiring, and quick-tool stale params;
- leave construction raw stack seam explicitly documented as 024b residual.

For 024b:

- delete raw `CommandStack` dependency from construction execution;
- delete duplicated construction command lifecycle helpers;
- delete tests that inspect command internals rather than construction behavior/use-case contracts.

A split requires editing `architecture-audit/wave-plan.md` through review before implementation because current Wave 024 success criteria expect all scoped producers to be addressed.

## Expected behavior change

No user-visible behavior change for either restructure option. If split is selected, user-visible behavior must still remain unchanged for the implemented subset, and the implementation log must clearly state the unimplemented construction residual rather than claiming full Wave 024 closure.

## Protected surfaces

Same protected surfaces as direct proposal:

- no persistence schema/replay, `ProjectService`, operation descriptor/registry, backend/docs/specs, package/tooling, Drive/auth, rendering/Three/CSS, app-shell project lifecycle, or UI feature work;
- no broad rendering/read-port extraction;
- no `CommandStack`/undo history redesign;
- no reintroduction of `commandStackForDeferredCommandProducers()`;
- preserve 3D overlay pointer behavior from `frontend/tests/e2e/current-ui-contract.spec.ts:89-117`.

## Validation plan

If option A is chosen, validation must cover the same full Wave 024 set as direct proposal plus kernel-focused unit tests for:

- successful command execution commits and pushes once;
- failed command execution rolls back and does not push;
- preview session repeats rollback/reapply, commit pushes once, cancel rolls back;
- undo/redo works through existing `CommandHistoryPort` after kernel-produced commands.

If option B split is chosen, run a reviewed plan-edit mini-cycle first. Each sub-wave must then have its own validation logs and explicit residual list. In all implementation paths, live preview refresh/probe is deferred to the implementation/validation stage and must bind to `0.0.0.0:5173` with HTTP reachability evidence; this proposal correction stage performs no preview work and does not change preview-server behavior.

## Recommendation

Do **not** choose a broad restructure now. Current source already has intent surfaces (`ToolCommandSink`, `ProcessHistoryIntentSink`) and the direct proposal can delete the active raw stack handoffs without redesigning command descriptors, persistence, rendering, or tool state.

Choose restructure only if the critic/reviewer or implementation scout finds that direct migration would either:

- create a generic facade indistinguishable from `CommandStack`,
- duplicate transactional command lifecycle code across several services, or
- require unsafe construction/factory redesign beyond Wave 024's protected scope.

If any of those triggers occur, stop and run a reviewed plan-edit/delta rather than implementing an overbroad kernel inside Wave 024.
