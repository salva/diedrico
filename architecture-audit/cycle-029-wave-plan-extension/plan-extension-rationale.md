# Cycle 029 Wave Plan Extension Rationale

## Status and guardrails

**Design status:** draft for Critic/Reviewer approval in `cycle-029-wave-plan-extension-post-028`.

This plan extension re-read the Wave 028 decision and closure evidence, the current wave-plan tail, path-scoped source candidates, and path-scoped git evidence before selecting Wave 029. It does not implement source changes.

Protected unrelated dirty files are documented but intentionally not used as premises: path-scoped status shows `frontend/src/domain/calculations/Intersections.ts` and `frontend/src/domain/processTree/ActionGroup.ts` are modified outside this stage (`architecture-audit/cycle-029-wave-plan-extension/evidence/scoped-status-and-diff.txt`). Their contents were not read for architectural selection, reverted, staged, or incorporated.

## Evidence read

- Wave 028 closure says canvas public raw seams were deleted, projected-3D raw traversal was localized in `Projected3DCanvasReadPort.ts`, and residual candidates are DTO-native canvas style policy, narrower `ThreeWorldReadPort` scene/read-port ownership, and a typed realization-context factory only if future evidence proves duplicated assembly (`architecture-audit/cycle-028-canvas-projection-dto-selectors/implementation-log.md`, “Final residual risks and next-wave recommendation”).
- Current `CanvasPresentationSelector` consumes behavior-sized read-port methods but still maps DTOs to primitives and calls style policies through domain-shaped casts (`frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts:32-76`). This is real, but after Wave 028 it is a canvas styling/DTO polish seam rather than the next central read-boundary owner.
- `CanvasWorldReadPort` is now an adapter with behavior-sized public methods, while its private implementation still traverses projection planes, realizes plane items, uses `resolveVisibility`, and classifies roles/kinds internally (`frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:12-16`, `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:18-95`). This is an accepted adapter boundary from Wave 028, not a public selector leak.
- `Projected3DCanvasReadPort` intentionally owns projected-3D raw world traversal for the 2D canvas projection seam (`frontend/src/application/canvasPresentation/Projected3DCanvasReadPort.ts:5-12`). Architecture tests now guard this localization (`frontend/tests/unit/application/appShell/Cycle027Architecture.test.ts:28-42`).
- The 3D presentation façade composes five separate world-backed read ports from the same concrete `World` (`frontend/src/application/threePresentation/ThreeWorldReadPort.ts:29-45`). Its sub-ports still expose domain realization objects and domain styles in read models and individually traverse raw world/plane collections (`frontend/src/application/threePresentation/ThreeProjectionPlaneReadPort.ts:18-39`, `frontend/src/application/threePresentation/ThreePlanarElementReadPort.ts:10-39`, `frontend/src/application/threePresentation/ThreeReconstructedElementReadPort.ts:12-24`, `frontend/src/application/threePresentation/ThreeGuideReadPort.ts:21-55`, `frontend/src/application/threePresentation/ThreeHingeReadPort.ts:8-20`).
- 3D realization context assembly is split between the shared world context and a three-specific wrapper that adds raw collection callbacks (`frontend/src/application/presentation/WorldRealizationContext.ts:4-14`, `frontend/src/application/threePresentation/ThreeRealizationContext.ts:12-20`). This confirms a concrete 3D read-port/realization-context ownership seam without requiring a broad domain realization redesign first.
- Runtime still hands the 3D surface a persistent presentation read-port bundle from the concrete `World` (`frontend/src/application/appShell/RuntimeSession.ts:88-94`). That is the active composition point for a bounded 3D presentation read-port wave.
- Persistence adapter DTO casts remain real: `ProjectSessionPersistenceAdapter` casts validated `ProjectData` through `unknown` into `PersistedProjectSession`, and back again on restore (`frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts:10-20`). But `ProjectService` now uses typed command snapshots, validates the current schema, deserializes through `OperationRegistry`, and restores committed commands without the old private-cast/migration architecture (`frontend/src/services/ProjectService.ts:24-78`, `frontend/src/services/ProjectService.ts:80-129`). This is lower centrality than the still-active 3D presentation read-boundary seam.
- E2E overlay pointer coverage remains a required validation constraint for presentation-adjacent work (`frontend/tests/e2e/current-ui-contract.spec.ts:89-116`).

## Residual candidate ranking after Wave 028

1. **Selected: 3D presentation read-port DTO ownership and realization-context boundary.** This is the next highest-centrality seam because 3D presentation still exports multiple world-backed read ports whose models carry domain realization/style objects and whose implementation repeats raw traversal/context assembly. It sits on the rendering/read boundary immediately adjacent to the just-cleaned canvas projection read boundary and is exercised through the runtime 3D presentation port.
2. **DTO-native canvas style policy.** Real and useful, but now localized to DTO-to-primitive styling in `CanvasPresentationSelector`. It does not decide ownership of raw world reads and should follow the larger remaining 3D read boundary unless a future scope-check proves selectors cannot progress without it.
3. **Typed/shared realization-context factory.** A supporting concern, not an independent broad wave yet. Wave 029 should include it only where it deletes duplication inside 3D presentation read ports without creating a generic world/read-model façade.
4. **Persistence adapter DTO casts.** Real but currently smaller than the rendering/read boundary: the service has a typed current schema and operation registry, while the adapter cast is an app-shell/persistence DTO alignment seam. It should not outrank the active 3D scene/read-port ownership issue.
5. **Unrelated dirty `Intersections.ts` / `ActionGroup.ts`.** Out of scope. Their modified status is documented only for source-control hygiene; they are not centrality evidence for Wave 029.
6. **Backend/docs/spec/tooling/Drive/auth/preview ergonomics/UI cleanup.** Lower centrality under the project priorities and current evidence.

## Recommended plan edit

Append **Wave 029 — 3D presentation DTO read ports and realization-context ownership** to `architecture-audit/wave-plan.md`. The next canonical stage, if the Critic and Reviewer accept this extension, should be:

`cycle-029-fresh-scout-proposals-3d-presentation-dto-read-ports-and-realization-context-ownership`
