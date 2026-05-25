# Proposal Restructure — Promote authoritative read-model boundary before deleting store/workspace path

**Wave:** 003 — Establish one authoritative world state and delete dead store/workspace paths  
**Strategy:** ask whether the right fix is one layer higher than file deletion: define a domain-derived workspace read-model/query boundary, then delete the legacy store/workspace files against that boundary.

## Why consider a higher-layer fix?

The direct proposal can delete clearly dead files, but the current active canvas still mixes rendering, hit testing, tool dispatch, viewport state, injected `World`, Paper primitive generation, selection state, and direct domain traversal inside `SvgCanvas.vue`. Evidence: `SvgCanvas` injects `World` (`frontend/src/components/workspace/SvgCanvas.vue:421`), builds plane transform maps from all projection planes (`frontend/src/components/workspace/SvgCanvas.vue:553`, `frontend/src/components/workspace/SvgCanvas.vue:568`), constructs `PrimitiveContext` directly (`frontend/src/components/workspace/SvgCanvas.vue:583`, `frontend/src/components/workspace/SvgCanvas.vue:603`), and performs hit tests with `Paper.hitTest(..., world)` (`frontend/src/components/workspace/SvgCanvas.vue:1224`, `frontend/src/components/workspace/SvgCanvas.vue:1225`, `frontend/src/components/workspace/SvgCanvas.vue:1555`, `frontend/src/components/workspace/SvgCanvas.vue:1565`).

A higher-layer fix would avoid replacing `worldStore` with ad hoc `World` traversal scattered across components. It would introduce an application/presentation query boundary that derives workspace view state from `World`/projection planes, then delete the legacy store-backed path. This is conceptually cleaner, but it risks broadening the wave into Wave 007 rendering selectors and Wave 006 tool-controller work.

## Target outcome

`World` and projection planes remain the only geometric state owners. A small read-model/query module exposes derived workspace data for UI code without owning geometry. Stores hold UI state only. Legacy `Workspace2D.vue`, `ElementRenderer.vue`, `worldStore.ts`, snapping/geometry composables, and parallel `ElementTypes` are deleted or converted away.

## Proposed boundary

Create one narrow module, for example:

- `frontend/src/application/world/worldViewQueries.ts` or `frontend/src/presentation/world/worldReadModel.ts`
  - Pure functions over `World` and active-plane/selection inputs.
  - Returns arrays or DTOs derived from domain objects/realizations, not mutable source-of-truth maps.
  - Initial scope limited to what is required to delete the legacy store path and support existing active behavior: active-plane element IDs, element lookup by ID, plane list/name, and hit-test/snap-adjacent read needs.

This module must not duplicate `PaperService`/`SVGRenderer` rendering selectors from Wave 007. It should be a small bridge/query boundary, not a second rendering architecture.

## Files to change

- Add `frontend/src/application/world/worldViewQueries.ts` (or reviewed equivalent name) with pure query functions over `World`/projection planes.
- `frontend/src/components/workspace/SvgCanvas.vue`
  - Replace repeated direct active-plane element traversal or label lookup with query calls only where doing so reduces duplication and supports deletion of legacy paths. Do not attempt a full renderer-selector extraction in this wave.
- `frontend/src/App.vue`
  - Keep providing the `World` instance (`frontend/src/App.vue:148`, `frontend/src/App.vue:149`) and keep active-plane/select-all behavior on projection planes (`frontend/src/App.vue:843`, `frontend/src/App.vue:846`, `frontend/src/App.vue:851`, `frontend/src/App.vue:856`), or move only small reusable query logic into the new read-model module.
- `frontend/src/main.ts`
  - Delete broken `worldStore` debug helper imports (`frontend/src/main.ts:39`, `frontend/src/main.ts:43`, `frontend/src/main.ts:52`, `frontend/src/main.ts:57`, `frontend/src/main.ts:60`) rather than adapting them to the read-model. Debug helper redesign belongs to a later shell/debug cleanup.
- Remaining `ElementTypes` consumers (`ElementPropertiesDialog.vue`, `ElementGroup.vue`, `ValidationService.ts`, `formatUtils.integration.spec.ts`) should use the new read-model only if they need UI DTOs; otherwise use local types or domain classes.
- Add focused unit tests for `worldViewQueries.ts` proving it derives from `World`/projection planes and does not mutate/own geometry.
- Add/update architecture tests forbidding imports from deleted store/workspace/type paths.

## Files/tests/docs/fixtures to DELETE

Same aggressive deletion set as the direct proposal:

- `frontend/src/components/workspace/Workspace2D.vue`
- `frontend/src/components/workspace/ElementRenderer.vue`
- `frontend/src/stores/worldStore.ts`
- `frontend/src/composables/useSnapping.ts`
- `frontend/src/composables/useElementGeometry.ts`
- `frontend/src/types/ElementTypes.ts`, unless the reviewed implementation proves a small read-model type module is needed and it is renamed/reduced so it no longer represents domain geometry ownership.
- Store-backed workspace tests/fixtures and TODO e2e references that only assert future `Workspace2D` integration.

No compatibility aliases such as `worldStore.world`, `LegacyElementTypes`, `Workspace2D` re-export barrels, or adapter stores are allowed.

## Expected behavior change

Behavior should remain equivalent for active user flows. The main structural change is that active UI queries use a narrow read-model/query boundary instead of direct legacy store maps or widespread component-level `World` traversal. Broken dev helper access to `worldStore.world` is removed.

## Validation plan for implementation wave

All validation logs must be captured under `architecture-audit/cycle-003-authoritative-world-state-delete-dead-store-workspace/validation/`.

### Static checks

- Deleted-file checks for `Workspace2D.vue`, `ElementRenderer.vue`, `worldStore.ts`, `useSnapping.ts`, `useElementGeometry.ts`, and preferably `ElementTypes.ts`.
- Grep for forbidden imports: `worldStore`, `useWorldStore`, `Workspace2D`, `ElementRenderer`, `ElementTypes`, `useSnapping`, `useElementGeometry`.
- Grep/read architecture test to confirm no new store owns geometry maps.
- If a new read-model module is introduced, grep to confirm it imports `World`/domain types but not Pinia stores and does not instantiate `Map` fields as mutable source-of-truth geometry storage.

### Focused tests

- New unit tests for world view/read-model query functions.
- Existing world initialization and projection-plane element-store tests.
- Focused `SvgCanvas`/Paper tests around primitive generation, hit-test-adjacent behavior, hover/snap target, and active-plane transforms where currently runnable.
- Construction tests for point, line/segment, circle, guide/intersection flows that touch `World`/projection planes.
- Parametric update and undo/redo tests for moved/deleted elements.

### Full cadence and live checks

Same mandatory cadence as the direct proposal:

- Root/frontend lint.
- Focused Vitest.
- Full root Vitest and backend test/build where root scripts skip backend.
- Root/frontend build.
- Frontend Playwright/e2e.
- Live preview refresh on `0.0.0.0:5173` with reachability probe.
- Manual/Playwright behavioral checks: construction, selection, snapping/hit-test-adjacent, parametric update, undo/redo, active-plane switching, preview rendering.

## Risks

- This proposal can accidentally pull Wave 007 rendering-selector work forward. The implementation must keep the read-model boundary narrow and avoid rewriting `PaperService`, `SVGRenderer`, or renderer DTOs beyond what is necessary for deleting the legacy store path.
- This proposal can also overlap Wave 006 if it starts moving tool command construction out of `SvgCanvas`. That must be avoided in Wave 003; tool/controller extraction remains Wave 006.
- Introducing a read-model module while deleting `ElementTypes.ts` requires careful naming so it is not perceived as a new parallel domain model. It must be query-only, derived, and tested against `World` fixtures.
- More files would be touched than the direct deletion path, increasing validation surface under existing repo validation debt.

## Recommendation

Prefer Proposal Direct for Wave 003 unless review finds that remaining `ElementTypes` consumers cannot be cleanly converted without a read-model boundary. The direct path better matches the wave scope and preserves Wave 006/007 ordering. If the reviewer selects this restructure proposal, constrain it to a tiny query module and explicit deletion of the legacy store/workspace path; do not perform renderer-selector or tool-controller extraction in this wave.