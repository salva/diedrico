# Proposal Restructure — Test whether to replace Wave 021 with a broader application command-kernel wave

## Question tested

Should this cycle broaden from selection/delete into a higher-level application command kernel now that current source already has a selection-delete command boundary?

## Answer

Not inside Wave 021. Current source invalidates the original selection/delete extraction premise, but it does not justify silent absorption of unrelated command producers. A broader command-kernel/runtime-port wave may be the right next central wave, but it requires a reviewed `wave-plan.md` edit/re-rank before implementation.

## Evidence for broader residual command-kernel debt

Selection/delete is already isolated, but other command producers still exist:

- `RuntimeSession` owns private `World` and `CommandStack` (`frontend/src/application/appShell/RuntimeSession.ts:31-33`).
- Runtime wiring exposes separate command-producing controllers for canvas tools and process history (`frontend/src/application/appShell/RuntimeSession.ts:116-128`).
- world initialization uses direct command creation, commit, and push (`frontend/src/application/world/initializeWorld.ts:19-34`).
- canvas movement/style use cases still accept `CommandStack` and manage command lifecycle (`frontend/src/application/canvas/CanvasPointMovementUseCase.ts:3-33`; `frontend/src/application/canvas/CanvasStyleUseCase.ts:2-15`).
- construction and process-history use cases still create/commit/push commands (`frontend/src/application/construction/ConstructionUseCases.ts:2-44`; `frontend/src/application/processHistory/ProcessHistoryUseCases.ts:2-78`).

Those surfaces are central, but they are broader than selection/delete and affect canvas/tool/process-history behavior that Wave 021 explicitly said not to absorb silently.

## Restructure option considered

Introduce a small application command kernel now, with a generic command executor/transaction API shared by selection-delete, canvas movement/style, construction, process-history, and initialization.

Potential target shape if selected by a future reviewed wave:

- `RuntimeSession` remains the private owner of `World` and `CommandStack`.
- A behavior-sized command-production port or service owns command lifecycle (`create`, operation sequence, `commit`, `push`) per producer family.
- UI/app-shell callers consume intent ports, never raw command-stack objects.
- Each producer family keeps domain operation construction near its use case; no broad god facade accepts arbitrary operation arrays from UI.

## Why not implement restructure in Wave 021

A generic command-kernel migration would touch multiple producers and user flows outside the Wave 021 contract:

- canvas/tool interactions and point movement;
- style commands;
- construction/quick-tool use cases;
- process-history commands;
- initialization commands;
- possibly tests/e2e across canvas, keyboard, process panels, and persistence.

That violates the current Wave 021 guardrail: selection/delete cleanup must not silently absorb canvas/tool/panel/toolbar/process-history command paths. It also risks creating a new god service if done without a fresh inventory and reviewer-approved design.

## Files to change if this restructure is chosen later

Only after a reviewed plan edit creates a new wave/scope, likely candidates include:

- `architecture-audit/wave-plan.md` — first, to replace/supersede the stale Wave 021 premise and define the new wave.
- `frontend/src/application/appShell/RuntimeSession.ts` — runtime-owned command-production ports/wiring.
- `frontend/src/application/selectionDeletion/SelectionDeletionCommandService.ts` — only if adapting to the new port without widening public API.
- `frontend/src/application/canvas/CanvasPointMovementUseCase.ts`
- `frontend/src/application/canvas/CanvasStyleUseCase.ts`
- `frontend/src/application/construction/ConstructionUseCases.ts`
- `frontend/src/application/construction/QuickToolUseCases.ts`
- `frontend/src/application/processHistory/ProcessHistoryUseCases.ts`
- `frontend/src/application/processHistory/ProcessHistoryController.ts`
- `frontend/src/application/world/initializeWorld.ts`
- focused unit tests for the selected command-production boundary and current e2e user flows.

This list is intentionally **not** authorized for Wave 021 implementation.

## Files/tests/docs/fixtures to DELETE if chosen later

A future reviewed command-kernel wave should delete, not wrap:

- raw `CommandStack` constructor parameters from selected producer use cases after port replacement;
- direct `commandStack.push(...)` calls from selected producers after command lifecycle is centralized for that producer family;
- direct `new Command(...)` in selected caller shells where operation construction is moved behind application-owned producer services;
- tests that assert raw stack injection rather than behavior/port contracts;
- transitional overloads, compatibility wrappers, duplicate raw-and-port execution paths, and broad command facades.

It must not delete selection-delete’s already-good boundary just to reintroduce it under a new name.

## Expected behavior change

For a future restructure: no intended user-visible feature change. Delete, undo, redo, point creation, movement, style updates, process-history changes, persistence replay, and keyboard shortcuts must remain equivalent.

For this Wave 021 design stage: no behavior change.

## No-backcompat rationale

If a future wave selects a command-producer boundary, raw and typed command paths must not coexist. However, the no-backcompat rule does not allow broadening the wrong wave. The stale Wave 021 premise should be deleted first; then the next central command-runtime wave can delete the correct raw producer seams with a reviewed scope.

## Validation plan if selected later

A future restructure wave would require the full mandatory validation cadence:

1. Static scans for raw `CommandStack` / `new Command` / `commandStack.push` removal in selected producers and absence of dual paths.
2. Focused Vitest for each touched producer family.
3. Existing selection-delete tests to prove the current boundary remains intact.
4. Root/frontend lint.
5. Root/frontend full Vitest.
6. Root/frontend build.
7. Root/frontend Playwright e2e for keyboard, selection/delete/undo, canvas creation/move/style flows, and process-history if touched.
8. Live preview refresh on `0.0.0.0:5173`, HTTP probe, and browser smoke including 3D overlay no-click-through (`frontend/tests/e2e/current-ui-contract.spec.ts:89-117`).

## Risks

- High overreach risk: a generic command kernel can become a god service if it centralizes arbitrary operations without behavior-sized ports.
- Persistence/replay risk if command descriptors or `ProjectService` are touched; those must remain out of scope unless a later reviewed wave explicitly owns them.
- UI regression risk across canvas and keyboard flows; full e2e/live validation would be mandatory.
- Source-control risk from current unrelated/protected dirty files; a future implementation must path-scope and avoid normalizing them.

## Stop conditions

Stop and return to plan edit/review if a restructure requires:

- command descriptor/replay/persistence schema redesign;
- Drive/auth/backend/docs/spec/package/tooling changes;
- rendering/Three/canvas overlay behavior changes;
- broad process-history/canvas/tool/panel rewrites not listed in the reviewed wave;
- preserving both old raw-stack and new port paths;
- building a generic facade that simply renames `World` / `CommandStack` access without deleting concrete seams.

## Recommendation

Reject this restructure for Wave 021 implementation. Use it as evidence for the plan-edit stage: Wave 021 should be marked satisfied/superseded, and the next wave should be re-ranked around the most central remaining command/runtime producer seam with its own scope-check and proposals.
