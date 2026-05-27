# Proposal Restructure — Introduce a shared application realization/query adapter before deleting tool raw-world access

## Summary

Implement Wave 026 one conceptual layer higher than the direct proposal: create a shared application-level realization/query adapter used by tools, canvas presentation, and three presentation. The adapter owns all runtime-local translation from concrete `World` to behavior-sized read and realization capabilities. Tools receive a small slice of that adapter; canvas and three presentation receive scene/presentation slices.

This is broader than the direct proposal but still bounded to the same Wave 026 seam. It asks whether duplicating ad hoc world-mirroring realization contexts in `ArgumentCollectorTool`, `CanvasWorldReadPort`, and `ThreeWorldReadPort` is the real design smell, and whether deleting `ToolContext.world` should happen by first establishing one application-owned read/realization adapter layer.

## Current evidence

- Raw world tool injection exists at `frontend/src/application/appShell/RuntimeSession.ts:75`.
- Tool contracts expose concrete `World` at `frontend/src/tools/ITool.ts:10-29` and `frontend/src/types/ToolArgumentCollector.ts:156-160`.
- Tool collection and concrete validators use world lookups/realizations as read-only interaction logic; examples appear in `ArgumentCollectorTool.ts:162-216` and `residual-tool-adapter-scan.stdout.log`.
- `CanvasWorldReadPort` returns raw domain collections and mirrors world realization methods at `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:15-70`.
- `ThreeWorldReadPort` builds another world-mirroring realization context and traverses domain objects to produce 3D read models at `frontend/src/application/threePresentation/ThreeWorldReadPort.ts:66-135`.
- `RuntimeSession` also has runtime-local properties/process realization reads at `RuntimeSession.ts:301-342` and `:399-408`, but those are not required for deleting tool raw-world access.

## Target outcome

A new application adapter module becomes the single owner of world-backed read/realization queries used by active interaction and presentation boundaries. For example:

- `RuntimeWorldQueryAdapter` or `InteractionRealizationReadAdapter` wraps private `World` inside `RuntimeSession`.
- It exposes small slices:
  - `ToolInteractionReadPort` for tools and collection validators.
  - `CanvasPresentationReadPort` for canvas selectors.
  - `ThreePresentationReadPort` for 3D scene read models.
  - Optional internal `RealizationContextProvider` for adapter-local domain realization calls.
- `RuntimeSession` constructs this adapter once and passes slices to its named ports.
- Tools cannot access raw `World`; canvas/three adapters no longer each define independent broad world-mirroring realization contexts.

## Files to change

Production source:

- Add a focused adapter module under `frontend/src/application/appShell/` or `frontend/src/application/readModel/`, such as:
  - `RuntimeWorldReadAdapters.ts`, or
  - `RuntimeRealizationReadAdapter.ts`, or
  - `InteractionReadPorts.ts`
- `frontend/src/application/appShell/RuntimeSession.ts`
  - Construct the adapter from private `World`.
  - Pass adapter slices to canvas/tool/three presentation ports.
  - Delete raw-world injection into tools.
- `frontend/src/application/appShell/RuntimeViewPorts.ts`
  - Type `CanvasToolInvocationContext` / `CanvasViewPort` around the adapter slice, not raw world.
- `frontend/src/tools/ITool.ts`
  - Delete `World` import and `ToolContext.world`.
- `frontend/src/tools/ArgumentCollectorTool.ts`
  - Use `ToolInteractionReadPort` slice for active plane, element lookup, and validator context.
- `frontend/src/types/ToolArgumentCollector.ts`
  - Replace `CollectionContext.world` with `readPort` or more specific lookup/realization slices.
- Concrete tools under `frontend/src/tools/` that use world reads.
- `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts`
  - Either delete or shrink its local `createCanvasRealizationContext(world)` in favor of the shared adapter's canvas slice.
  - Rename only if the old `CanvasWorldReadPort` name becomes misleading and no compatibility layer is kept.
- `frontend/src/application/threePresentation/ThreeWorldReadPort.ts`
  - Replace local `createThreeRealizationContext(world)` with the shared adapter's presentation/realization slice where practical.
- `frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts` and `CanvasVisibilityPolicy.ts`
  - Adjust only where the read-port shape changes.
- `frontend/src/components/workspace/SvgCanvas.vue`
  - Invocation type wiring only.
- Focused tests for the new adapter slices, tool behavior, and presentation read models.

## Files/tests/docs/fixtures to DELETE

- Delete `ToolContext.world` and `CollectionContext.world`.
- Delete `RuntimeSession` raw-world tool injection at `invokeToolClick`.
- Delete local duplicated realization context factories in `CanvasWorldReadPort.ts` and `ThreeWorldReadPort.ts` if the shared adapter replaces them cleanly.
- Delete raw canvas read-port methods that return domain collections if the adapter can supply presentation DTOs without breaking selectors.
- Delete dead `CanvasWorldReadPort` exports if renamed/replaced; do not keep a compatibility re-export just to preserve names.
- Delete tests that mock full `World` for tools or assert independent canvas/three world-mirror contexts.
- Do not delete or rewrite command producer services, persistence, backend, docs/specs, package scripts, Drive/auth, validation platform, or global domain realization internals.

## Expected behavior change

User-visible behavior should remain equivalent to current behavior. The behavior guarantee is the same as the direct proposal: all active construction, hit testing, selection-mask, tangent/parallel/perpendicular, projection-plane/3D, canvas presentation, 3D presentation, and undo/redo flows should continue to work.

Architectural behavior changes are broader:

- Runtime-local world-to-read translation has one application-owned adapter layer instead of three parallel context factories.
- Tools and presentation adapters consume slices of a common read/realization capability model.
- Future waves have a clearer target for deeper domain realization redesign because current world-backed realization logic is localized in one adapter.

## Risks

- This proposal may exceed one-cycle size if it tries to redesign all presentation read models. Mitigation: keep the shared adapter internal and replace only directly duplicated realization-context methods needed for tools/canvas/three seams.
- A shared adapter can become a god adapter if every world method is exposed. Mitigation: expose slices by consumer and require every method to cite a current caller.
- Moving canvas and three adapters at the same time increases regression risk in rendering. Mitigation: keep public presentation read models stable unless a method is demonstrably raw-domain leakage.
- If the adapter has to understand too many domain realization internals, that is evidence for a separate domain-realization wave. Mitigation: stop before changing `Element2D.realize2D(...)` globally.
- Shared abstraction may be premature if tool deletion can be done cleanly with a smaller direct read port. The review should prefer direct unless it finds canvas/three duplicate context factories are blocking or likely to recreate the raw-world leak.

## Validation plan

Same mandatory validation as the direct proposal, plus focused adapter-slice tests:

1. Static scan inventory before/after for raw tool world access and duplicate canvas/three world-mirror factories.
2. Focused unit tests for the shared adapter's tool slice and presentation slices.
3. Focused tool/argument-collection tests for all concrete tools whose world reads moved.
4. Focused canvas presentation selector/read-port tests.
5. Focused three presentation read-model tests.
6. Root/frontend lint, full Vitest, build, e2e.
7. Live preview refresh/probe and browser smoke for construction, tangent/parallel/perpendicular, projection-plane/3D construction, hit/hover, 3D refresh, and undo/redo.

## No-backcompat rationale

The old seams are internal and should be deleted, not wrapped. If a shared adapter replaces `CanvasWorldReadPort` or `ThreeWorldReadPort` names, do not keep legacy aliases unless production imports require a temporary rename within the same commit and no dual behavior remains. Keeping independent world mirrors plus a shared adapter would preserve duplication and defeat this proposal.

## Stop conditions

Stop and request reviewed plan edit if the work requires:

- changing the domain realization contract globally (`Element2D.realize2D(...)`, projection-plane realization ownership, or 3D realization ownership)
- changing command production/history/undo/redo semantics
- changing persistence schema/replay or ProjectService
- changing backend/frontend contract stance
- package/tooling or validation-platform restructuring
- docs/spec reconciliation outside implementation log
- Drive/auth/browser integration changes
- broad application-kernel redesign

## Recommendation compared with direct proposal

Prefer the direct proposal unless review concludes that leaving canvas/three with separate world-mirroring realization contexts would immediately recreate the same tool-context leak or make the direct read port a hidden facade. The restructure proposal is appropriate if the desired architectural improvement is not just deleting `ToolContext.world`, but establishing one application-owned realization/query boundary consumed by tools and presentation adapters.
