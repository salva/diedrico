# Proposal Restructure — Shared presentation realization/read context for 2D and 3D selectors

## Summary

Instead of creating a three-presentation-only read port, introduce a shared presentation realization/read context consumed by both three-presentation and the existing canvas presentation read-port boundary. This is conceptually cleaner only if implementation planning proves that canvas and three presentation would otherwise duplicate projection-plane traversal and realization capabilities in a material way.

This option is explicitly demoted behind Proposal Direct for Cycle 017. It should be chosen only if the direct read-port plan cannot avoid a second broad realization adapter without duplicating the same read/realization ownership already present in `CanvasWorldReadPort`.

## Files to change

- new shared read-context module under `frontend/src/application/presentation/` or a reviewed equivalent location
- `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts`
- `frontend/src/application/threePresentation/ThreePresentationModel.ts`
- `frontend/src/application/threePresentation/ThreePresentationController.ts`
- `frontend/src/application/threePresentation/*Selector.ts`
- `frontend/src/rendering/threeView/ThreeViewRuntime.ts`
- `frontend/src/components/panels/ThreeView.vue`
- focused canvas/three presentation context tests

## Minimal shared surface if chosen

The shared context must be composed from small selector-owned slices. It must not be a class or snapshot that absorbs every presentation concern.

### Shared realization context slice

Allowed capabilities:

- provide typed projection-plane realization context needed by both 2D canvas projection output and 3D plane/planar-element selectors;
- provide typed 2D element realization context where both canvas and three-presentation currently need the same element-on-plane realization inputs;
- provide typed transform/matrix DTOs shared by canvas/three presentation when this directly deletes current `any` seams;
- wrap concrete `World` once at the application presentation boundary while keeping selectors dependent on slices.

Forbidden capabilities:

- expose raw `World`, mutable `ProjectionPlane`, mutable `Element2D`, command stack, persistence, dependency-service, or process-tree mutation APIs;
- absorb visibility, style, hit-testing, scene-object construction, overlay pointer policy, selection state, tool state, command/use-case behavior, or app-shell lifecycle;
- own Three.js scene-host, OrbitControls, SVG rendering, or component lifecycle logic.

### Canvas-specific slice

Allowed capabilities:

- retain the current Wave 016 canvas read-port responsibilities needed for canvas presentation selectors and projected-3D-on-2D selector output;
- delegate to the shared realization context only for duplicated realization/transform data;
- keep canvas visibility/style/interaction policies in their existing named modules unless a tiny typed read dependency is strictly required.

Forbidden capabilities:

- rewriting Wave 016 canvas selector ownership into a new global context;
- moving overlay pointer policy, hit-query behavior, style policy, or visibility policy into the shared realization context.

### Three-presentation slices

Allowed capabilities mirror the direct proposal but as slices over the shared context:

- projection planes: enumerate/render projection planes, fixed-plane identity/orientation, grid/reference-axis inputs, typed plane realization;
- planar elements: enumerate/render planar 2D elements, typed element realization, owning-plane placement data, typed transforms;
- reconstructed elements: enumerate/render current reconstructed 3D objects and read their typed realization DTOs;
- guides: enumerate/render current guide geometry and labels through typed realization data;
- hinges: read fixed hinge/half-hinge presentation data and typed coordinate inputs.

Forbidden capabilities:

- raw domain map traversal, mutation, command construction, persistence serialization, new reconstruction semantics, process-tree ownership, or scene/rendering lifecycle behavior.

## Non-owned concerns that must stay out

The shared context must not absorb:

- command/undo, command factories, construction use-cases, or tool state;
- persistence, Drive/local project services, backend API contracts, or project schema decisions;
- Vue component lifecycle, app-shell orchestration, keyboard routing, active-plane UI state, or selection mutations;
- Three.js scene setup, mesh creation, OrbitControls/camera/lights/animation, SVG renderer internals, or overlay pointer policy;
- validation platform/tooling, package scripts, docs/spec reconciliation, or broader domain-model redesign.

If any of these non-owned concerns appear necessary to complete the restructure, this proposal must be rejected or sent through a new reviewed wave-plan/delta rather than implemented inside Cycle 017.

## Files/tests/docs/fixtures to DELETE

- Delete duplicate canvas-only and three-only realization read methods that are replaced by the shared context.
- Delete concrete full-`World` presentation APIs in the touched selectors/controllers.
- Delete local transform/matrix `any` helper seams if the shared context owns typed transform DTOs.
- Delete stale tests that preserve separate concrete-`World` selector setup.
- Delete compatibility facades that keep both old and new presentation read paths alive.

## Expected behavior change

No intended behavior change. The architectural outcome is one owned presentation read/realization contract rather than parallel 2D and 3D adapters.

## No-backcompat/aggressive-deletion rationale

If presentation realization is shared, preserving separate canvas/three adapters would create parallel paths. This option deletes duplication and old full-`World` selector APIs rather than wrapping them.

## Risks

- Higher risk of overreach: a shared context can become a god snapshot owning traversal, style, visibility, projection, and scene concerns. The allowed/forbidden surface above is mandatory if this path is selected.
- More files are likely touched, increasing validation burden.
- It may accidentally reopen Wave 016’s settled selector model; if the change rewrites canvas presentation beyond tiny realization/transform sharing, reject this option for Cycle 017.
- It may hide a deeper domain realization redesign under a presentation-context name. If the domain realization contract itself needs redesign, stop for a future wave instead.

## Validation plan

1. Static inventory of all canvas/three presentation realization reads and transform helpers before edits, with evidence that the shared surface removes actual duplication rather than centralizing unrelated concerns.
2. Focused Vitest must explicitly include:
   - `frontend/tests/unit/application/threePresentation/threePresentationSelector.spec.ts`
   - `frontend/tests/unit/application/threePresentation/threePresentationConcernSelectors.spec.ts`
   - new shared-context tests under `frontend/tests/unit/application/presentation/` or the reviewed equivalent location
   - current canvas-presentation read-port/selector tests affected by the context, including `frontend/tests/unit/application/canvasPresentation/canvasWorldReadPort.spec.ts` if that contract changes.
3. Root/frontend lint.
4. Full root/frontend Vitest.
5. Root/frontend build.
6. Root/frontend Playwright/e2e and live browser smoke because this option touches both canvas and 3D presentation boundaries.
7. Preview refresh/probe at closure.

## Non-goals

Do not redesign persistence, command stack, backend, app shell, validation platform, Drive/local services, docs/specs, scene-host interaction, overlay pointer policy, style/visibility policy ownership, or broad domain realization semantics.

## Recommendation relative to direct proposal

Prefer the direct three-read-port proposal. Choose this restructure only if a concrete pre-implementation inventory proves unavoidable duplicate realization/read-context ownership between `CanvasWorldReadPort` and the planned three read port, and only if the final design remains the minimal slice-based surface above. Otherwise reject this proposal for Cycle 017 and defer any deeper shared realization-context convergence to a future reviewed wave.
