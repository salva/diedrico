# Proposal Restructure — Move realization/read-context ownership higher before canvas DTO deletion

## Decision intent

Use this proposal as the higher-layer test required by Wave 028. It asks whether direct canvas DTO selector extraction is treating a symptom and whether the correct architectural fix is to first centralize realization-read context ownership or reshape `ThreeWorldReadPort` boundaries. This path should be selected only if the fresh implementation inventory proves direct deletion of canvas raw traversal would otherwise duplicate context assembly, create DTO facades, or leave canvas/three with inconsistent realization semantics.

## Proposed design

### 1. Introduce an application-owned realization read-context factory

Create a small internal application/domain-adapter module, for example `frontend/src/application/realization/WorldRealizationReadContext.ts`, that owns the conversion from concrete `World` to typed domain realization contexts:

- `ProjectionElementRealizationContext`
- `Element3DRealizationContext`
- `PlaneEquationRealizationContext` if directly needed

This module must expose typed context factories only, not raw world collection methods, mutations, command/persistence handles, or generic world read APIs. It exists to remove duplicated context assembly currently present in canvas and three adapters (`CanvasWorldReadPort.ts:32-44`; `ThreeWorldReadPort.ts:66-78`).

### 2. Rebuild canvas DTO selectors on top of the shared context

After context ownership is centralized, still perform the canvas-specific deletion from Proposal Direct: behavior-sized plane item and projected-3D item selectors replace raw public `CanvasWorldReadPort` getters and public `realize*` methods. The difference is that realization context assembly is no longer hidden independently in canvas/three adapters.

### 3. Narrow `ThreeWorldReadPort` only at the duplicate boundary

Adopt the shared context factory inside `ThreeWorldReadPort` if it prevents duplication. Do not change its public read-model methods, scene runtime, ThreeView component, display options, or 3D rendering behavior in this wave. If ThreeWorldReadPort requires a public contract redesign to benefit, stop and leave it as a future wave.

### 4. Optional read-context boundary tests

Add a narrow architecture/static test proving:

- the shared realization context module does not import commands, persistence, Vue components, stores, or backend;
- canvas/three adapters use the shared factory rather than duplicating world-to-context assembly;
- the shared factory does not expose `World`-shaped collection APIs beyond the existing domain realization interfaces.

## When this broader path is justified

Select Proposal Restructure instead of Proposal Direct only if at least one condition is proven during review/implementation planning:

1. Direct canvas DTO selector extraction would duplicate the same realization-context assembly now present in `ThreeWorldReadPort` and thereby create two competing context owners.
2. Canvas projected-3D DTO generation and three projected/planar read models need an identical context helper to remain behavior-equivalent.
3. Static scans show several application read adapters already duplicating the exact `ProjectionElementRealizationContext & Element3DRealizationContext` assembly and a small shared factory would reduce coupling without expanding public surfaces.
4. Direct extraction cannot delete public canvas `realize*` methods cleanly unless context ownership is moved one conceptual layer higher first.

Do **not** select this path merely because `ThreeWorldReadPort` still has broad internal traversal. Its public methods are already behavior-named, and broad 3D scene/read-port extraction is a separate future wave.

## Files to change

Expected source files if selected:

- New `frontend/src/application/realization/WorldRealizationReadContext.ts` or similarly named narrow factory module.
- `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts`
- `frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts`
- `frontend/src/application/canvasPresentation/Projected3DCanvasSelector.ts`
- `frontend/src/application/canvasPresentation/CanvasPresentationModel.ts` if DTO types are needed.
- `frontend/src/application/appShell/RuntimeSession.ts` for wiring.
- `frontend/src/application/threePresentation/ThreeWorldReadPort.ts` only to consume the shared factory.
- `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts` only if existing typed interfaces require a very small export/type alias adjustment; no semantic redesign.

Expected tests:

- Same canvas-presentation tests as Proposal Direct.
- New focused tests/static checks for the shared realization-context factory.
- Existing 3D/e2e overlay tests to ensure three behavior is unchanged if `ThreeWorldReadPort` is touched.

## Files/tests/docs/fixtures to DELETE

Same as Proposal Direct for canvas raw seams:

- Delete public raw canvas projection-plane getter dependency if replaced.
- Delete raw 3D getter trio together if replaced.
- Delete public canvas `realize*` methods if selectors own realization internally.
- Delete raw `CanvasPresentationSelector` and `Projected3DCanvasSelector` loops where replaced.
- Delete stale tests/mocks expecting raw canvas read-port methods.

Additional restructure delete targets:

- Delete duplicated `createCanvasRealizationContext` / `createThreeRealizationContext` bodies from their current adapter files if the shared factory replaces them.
- Delete any local context helper whose only purpose was transitional compatibility.

Do not delete or rewrite ThreeView runtime/scene modules, persistence, commands, backend, package/tooling, docs/specs, or app-shell read-model builders.

## Expected behavior change

No user-visible behavior change. The only intended difference from Proposal Direct is ownership of realization context assembly. Canvas rendering/query/projected-3D behavior, 3D view behavior, pointer ownership, active-plane/grid, and screen-to-3D support remain equivalent.

## Risks and mitigations

- **Global facade risk:** The shared context factory could become a new app-kernel/world facade. Mitigate by exporting only functions returning typed domain realization contexts and by banning raw collection/read-model convenience methods.
- **Over-broad three work:** Touching `ThreeWorldReadPort` can invite scene/read-model redesign. Mitigate by limiting the change to context-factory consumption and preserving public methods.
- **Delayed deletion:** This path may spend effort on context ownership without deleting raw canvas seams. Mitigate by making canvas deletion mandatory in the same implementation unless stop conditions fire.
- **Domain-interface churn:** Adjusting `ProjectionPlaneContext` could become a domain realization redesign. Mitigate by allowing only type alias/export cleanup; any semantic change stops the wave.

## Validation plan

Same mandatory validation as Proposal Direct, plus:

1. Static scan/architecture test proving no duplicated canvas/three realization-context factory remains if the shared module is adopted.
2. Static scan proving the shared context module imports only domain context/types and concrete `World`, not commands, persistence, Vue, stores, backend, or package/tooling concerns.
3. Focused `ThreeWorldReadPort` tests or existing three presentation tests if the adapter changes, plus preservation of overlay pointer e2e evidence.

## No-backcompat rationale

Duplicated realization-context helpers and raw canvas getters are internal seams. If the shared context factory is selected, keeping old local helper copies or raw public canvas getters would preserve parallel paths. Delete them rather than maintaining compatibility wrappers.

## Stop conditions

Stop and return to a plan-edit mini-cycle if:

- the shared context factory needs to expose a generic world/read-model API;
- `ThreeWorldReadPort` public methods or ThreeView runtime must be redesigned;
- domain realization interfaces require semantic changes rather than a small ownership/type adjustment;
- canvas raw getter deletion cannot proceed after context extraction;
- any command/persistence/backend/docs/package/Drive/auth/UI feature work becomes necessary.

## Recommendation relative to Proposal Direct

Prefer Proposal Direct unless review finds a proven duplicate-context blocker. Current source shows the canvas public raw traversal contract is the sharper central seam, while `ThreeWorldReadPort` already has behavior-named public methods. Proposal Restructure is the fallback if realization-context ownership must move one layer higher to avoid creating another hidden duplication.
