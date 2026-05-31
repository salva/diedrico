# Cycle 024 Review Round 01 — Command-producer runtime ports for canvas, construction, and process history

## Scope of this review

Reviewed artifacts:

- `architecture-audit/cycle-024-command-producer-runtime-ports-for-canvas-construction-and-process-history/scope-check.md`
- `architecture-audit/cycle-024-command-producer-runtime-ports-for-canvas-construction-and-process-history/proposals/proposal-direct.md`
- `architecture-audit/cycle-024-command-producer-runtime-ports-for-canvas-construction-and-process-history/proposals/proposal-restructure.md`
- `architecture-audit/cycle-024-command-producer-runtime-ports-for-canvas-construction-and-process-history/critique/critic-review.md`
- `architecture-audit/cycle-024-command-producer-runtime-ports-for-canvas-construction-and-process-history/critique/critic-review-addendum.md`
- relevant Wave 024 entry in `architecture-audit/wave-plan.md:1469+`
- `architecture-audit/cycle-023-runtime-session-consumer-ports-command-history-boundary/decision.md`
- current source seams in `frontend/src/application/appShell/RuntimeSession.ts`, `frontend/src/application/tools/CanvasToolController.ts`, `frontend/src/application/construction/ConstructionUseCases.ts`, `frontend/src/application/construction/QuickToolUseCases.ts`, `frontend/src/application/processHistory/ProcessHistoryController.ts`, `frontend/src/application/processHistory/ProcessHistoryUseCases.ts`, `frontend/src/components/workspace/SvgCanvas.vue`, and `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts`

This review is design-only. No production implementation, validation run, preview refresh, or decision finalization is approved here.

## Source-control / dirty-context check

Path-scoped status confirms unrelated dirty frontend component files outside this wave scope:

- `frontend/src/components/panels/ActionGroupItem.vue`
- `frontend/src/components/panels/ActionItem.vue`
- `frontend/src/components/panels/ElementTypeGroup.vue`
- `frontend/src/components/toolbars/MainToolbar.vue`

Current stage critique artifacts are also untracked. These unrelated dirty files must remain untouched by any future Cycle 024 implementation.

## Current-source seam verification

The corrected proposal set is grounded in current source, not in stale plan wording:

- `RuntimeSession.canvasCommandProducerPort(...)` still constructs `CanvasToolController` with private `world` and `commandStack` (`frontend/src/application/appShell/RuntimeSession.ts:109-114`).
- `RuntimeSession.processHistoryCommandPort()` still constructs `ProcessHistoryController` with private `world` and `commandStack` (`frontend/src/application/appShell/RuntimeSession.ts:117-121`).
- `CanvasToolController` still accepts `world` and `commandStack`, creates `CanvasPointMovementUseCase` / `CanvasStyleUseCase`, and passes raw runtime objects into construction and quick-tool use cases (`frontend/src/application/tools/CanvasToolController.ts:1-44`).
- `ConstructionUseCases` still accepts raw `World` and `CommandStack`, constructs `Command`, commits, and pushes (`frontend/src/application/construction/ConstructionUseCases.ts:29-49`).
- `QuickToolUseCases` still carries stale `world` / `commandStack` params despite returning only the existing removed/debug response (`frontend/src/application/construction/QuickToolUseCases.ts:4-15`).
- `ProcessHistoryController` still accepts raw `world` and `commandStack` and passes them into `ProcessHistoryUseCases` (`frontend/src/application/processHistory/ProcessHistoryController.ts:14-25`).
- `ProcessHistoryUseCases` still constructs `Command`, commits, and pushes to `commandStack` (`frontend/src/application/processHistory/ProcessHistoryUseCases.ts:20-24`, `:72-90`).
- `SvgCanvas.vue` injects `CanvasCommandProducerInjectionKey` as `ToolCommandSink`, not raw `commandStack` (`frontend/src/components/workspace/SvgCanvas.vue:206`, `:348`).
- `AppShellBoundary.test.ts` explicitly asserts `commandStackForDeferredCommandProducers()` is absent and raw command-stack provide/inject is absent (`frontend/tests/unit/application/appShell/AppShellBoundary.test.ts:113`, `:133-136`).

Conclusion: the proposal set correctly identifies the active seam as runtime-owned constructor handoff plus downstream raw command lifecycle ownership. The wave-plan text is stale where it still discusses `commandStackForDeferredCommandProducers()` and raw provide/inject as active surfaces.

## Critic protocol verification

Designer/Critic failure tolerance evidence is present and acceptable for this review round:

- `critique/critic-review.md` is marked `synthesized_by: manager` with `reason: critic_dispatch_unavailable` and records two failed Critic dispatches.
- `critique/critic-review-addendum.md` is likewise synthesized and documents the follow-up correction review.
- The synthesized critique and addendum are sufficient evidence that the required Critic loop was attempted and failure-tolerance was applied per protocol.

No blocker is raised on Critic availability for this round.

## Proposal scoring

### Proposal Direct — scorecard

1. **Advances the wave target outcome:** PASS  
   It targets the actual remaining seam: raw runtime `world` / `commandStack` injection into command-producing controllers/use cases.

2. **Improves architecture and code quality:** PASS  
   It removes raw stack dependencies from scoped producers and centralizes command lifecycle ownership without reopening consumer-port, persistence, rendering, or app-shell composition redesign.

3. **Respects no-backcompat / aggressive deletion priorities:** PASS  
   It explicitly deletes raw constructor params/imports, `commandStack.push(...)`, stale quick-tool params, dual paths, and dead exports instead of preserving fallbacks.

4. **Avoids overfeaturism:** PASS  
   It stays bounded to command-production ownership and does not turn this cycle into rendering, persistence, descriptor, or broad tool redesign.

5. **Risks / hidden regressions:** PASS WITH CAUTION  
   Real risks remain around point-drag preview/rollback semantics, process-history state transitions, and construction command behavior, but the proposal names them and scopes test coverage accordingly.

6. **Validation sufficiency:** PASS  
   The proposed implementation validation covers focused unit/boundary tests, full lint/test/build, Playwright/e2e, live preview refresh, reachability probe, and 3D overlay pointer preservation.

### Proposal Restructure — scorecard

1. **Advances the wave target outcome:** PASS AS CONTINGENCY  
   It would address the seam if direct implementation proves structurally insufficient.

2. **Improves architecture and code quality:** MIXED  
   A small kernel could reduce duplication, but it also risks becoming a renamed generic command bus.

3. **Respects no-backcompat / aggressive deletion priorities:** PASS  
   It still requires deletion of raw stack paths and duplicated lifecycle helpers.

4. **Avoids overfeaturism:** WARNING  
   Option A becomes too broad if implemented preemptively; it should be used only if direct implementation cannot stay behavior-sized.

5. **Risks / hidden regressions:** WARNING  
   The kernel path increases risk of hiding raw stack semantics behind a broader abstraction and silently broadening scope.

6. **Validation sufficiency:** PASS  
   The validation plan is adequate if the restructure path is explicitly selected through review/decision.

## Review decision on stale Wave 024 wording

**Decision: the corrected current-source proposal set is acceptable to supersede stale Wave 024 accessor/provide-inject wording for this cycle; a wave-plan correction stage is not required before implementation.**

Rationale:

- The wave's architectural centrality and ordering remain valid after Cycle 023.
- The stale wording is local to how the seam was described, not to whether the seam still exists.
- Current source and boundary tests clearly show that `commandStackForDeferredCommandProducers()` and raw command-stack provide/inject are already absent, while the runtime constructor handoff and downstream raw command lifecycle ownership remain active.
- The corrected `scope-check.md`, proposal set, and eventual `decision.md` can safely serve as the authoritative Cycle 024 scope basis without reopening `wave-plan.md` first.

Requirement for the next stage: `decision.md` must explicitly state that Cycle 024 implementation authority comes from the reviewed current-source proposal set and supersedes the stale Wave 024 accessor/provide-inject wording for this cycle.

## Blocking issues

None.

## Non-blocking cautions to carry into decision/implementation

- Do not rely on or fold in the unrelated dirty `frontend/src/commands/Command.ts` work referenced by the proposal artifacts unless separately reconciled.
- Keep `SelectionDeletionCommandService` out of scope unless a reviewed delta explicitly broadens the wave.
- Preserve `SvgCanvas.vue` / Three overlay pointer behavior and treat it strictly as an implementation validation requirement, not a review-stage change target.
- Unrelated dirty files under `frontend/src/components/panels/` and `frontend/src/components/toolbars/MainToolbar.vue` must remain untouched.

## Preferred path and next-stage recommendation

Preferred proposal: **`proposal-direct.md`**.

Recommended next canonical stage: `cycle-024-decision-command-producer-runtime-ports-for-canvas-construction-and-process-history`, selecting the direct proposal with the above stale-plan supersession language recorded explicitly in `decision.md`. No correction round is required from this review.
