# Proposal Direct — Delete legacy store/workspace geometry path

**Wave:** 003 — Establish one authoritative world state and delete dead store/workspace paths  
**Strategy:** implement the wave as planned: remove dead workspace/store-backed geometry code and convert the few remaining references to the current `World`/projection-plane path.

## Target outcome

After this wave, there is one authoritative geometric state source: `World` and its projection planes. Vue stores may remain for UI state (`toolStore`, `viewStore`, `selectionStore`, settings/auth), but no Pinia store owns points, lines, circles, 3D elements, guides, or a dependency graph in parallel with `World`.

## Files to change

- `frontend/src/main.ts`
  - Delete the dev helpers that import `./stores/worldStore` and read `worldStore.world`, because the current store has no `world` field (`frontend/src/main.ts:39`, `frontend/src/main.ts:43`, `frontend/src/main.ts:52`, `frontend/src/main.ts:57`, `frontend/src/main.ts:60`; `frontend/src/stores/worldStore.ts:6`). If dev helper functionality is still desired, expose it from the `World` instance provided by `App.vue` only in a later app-shell/debug cleanup wave; do not preserve a store shim here.
- `frontend/src/components/dialogs/ElementPropertiesDialog.vue`
  - Replace any `ElementTypes`-only DTO typing with domain element/read-model types or local narrow props, so `ElementTypes.ts` can be deleted rather than kept as a legacy domain model.
- `frontend/src/components/panels/ElementGroup.vue`
  - Replace `ElementTypes` DTO usage with a local UI row/read-model type or a domain-derived interface.
- `frontend/src/services/ValidationService.ts`
  - If the service is active, retarget it to domain elements or delete it if evidence during implementation proves no active source imports it.
- `frontend/tests/integration/formatUtils.integration.spec.ts`
  - Convert fixtures away from `ElementTypes` or delete the test if it only covers deleted DTO formatting.
- Architecture tests under `frontend/tests/unit/architecture/**`
  - Add/update a boundary test asserting no source imports `@/stores/worldStore`, `../stores/worldStore`, `Workspace2D.vue`, `ElementRenderer.vue`, or `@/types/ElementTypes` after the deletion.
- Focused tests around active user flows if existing tests already cover them: world initialization, active-plane select-all/delete, Paper hit testing, and tool construction flows.

## Files/tests/docs/fixtures to DELETE

Delete these files outright, with no compatibility barrels or re-export shims:

- `frontend/src/components/workspace/Workspace2D.vue`
  - Evidence: not imported by `App.vue`, which renders `SvgCanvas.vue` (`frontend/src/App.vue:59`, `frontend/src/App.vue:107`); imports absent command modules (`frontend/src/components/workspace/Workspace2D.vue:71` through `frontend/src/components/workspace/Workspace2D.vue:76`); owns command execution against `worldStore` (`frontend/src/components/workspace/Workspace2D.vue:185`, `frontend/src/components/workspace/Workspace2D.vue:193`).
- `frontend/src/components/workspace/ElementRenderer.vue`
  - Evidence: only reached from `Workspace2D.vue` (`frontend/src/components/workspace/Workspace2D.vue:37`, `frontend/src/components/workspace/Workspace2D.vue:69`); reads `worldStore.elements2D` (`frontend/src/components/workspace/ElementRenderer.vue:81`, `frontend/src/components/workspace/ElementRenderer.vue:95`); returns placeholder geometry for non-free point variants (`frontend/src/components/workspace/ElementRenderer.vue:103` through `frontend/src/components/workspace/ElementRenderer.vue:115`).
- `frontend/src/composables/useSnapping.ts`
  - Evidence: only active source import is `Workspace2D.vue` (`frontend/src/components/workspace/Workspace2D.vue:77`, `frontend/src/components/workspace/Workspace2D.vue:85`); reads `worldStore.allElements2D` (`frontend/src/composables/useSnapping.ts:21`, `frontend/src/composables/useSnapping.ts:49`); returns placeholder coordinates for unresolved point variants (`frontend/src/composables/useSnapping.ts:98`, `frontend/src/composables/useSnapping.ts:110`). Active snapping/hit preview is already in `SvgCanvas`/`Paper` (`frontend/src/components/workspace/SvgCanvas.vue:1224`, `frontend/src/components/workspace/SvgCanvas.vue:1225`, `frontend/src/components/workspace/SvgCanvas.vue:1555`, `frontend/src/components/workspace/SvgCanvas.vue:1565`).
- `frontend/src/composables/useElementGeometry.ts`
  - Evidence: only active source import is `Workspace2D.vue` (`frontend/src/components/workspace/Workspace2D.vue:79`, `frontend/src/components/workspace/Workspace2D.vue:87`); reads `worldStore.elements2D` (`frontend/src/composables/useElementGeometry.ts:33`, `frontend/src/composables/useElementGeometry.ts:34`, `frontend/src/composables/useElementGeometry.ts:139`, `frontend/src/composables/useElementGeometry.ts:140`); leaves line/circle distance unimplemented (`frontend/src/composables/useElementGeometry.ts:70`, `frontend/src/composables/useElementGeometry.ts:79`) and fakes intersections (`frontend/src/composables/useElementGeometry.ts:202`, `frontend/src/composables/useElementGeometry.ts:204`).
- `frontend/src/stores/worldStore.ts`
  - Evidence: owns duplicate geometry maps and dependency graph (`frontend/src/stores/worldStore.ts:6` through `frontend/src/stores/worldStore.ts:10`), mutates them (`frontend/src/stores/worldStore.ts:96`, `frontend/src/stores/worldStore.ts:106`, `frontend/src/stores/worldStore.ts:130`, `frontend/src/stores/worldStore.ts:140`, `frontend/src/stores/worldStore.ts:150`, `frontend/src/stores/worldStore.ts:158`, `frontend/src/stores/worldStore.ts:166`, `frontend/src/stores/worldStore.ts:180`), and does not expose the `world` field expected by `main.ts` debug helpers (`frontend/src/main.ts:43`, `frontend/src/main.ts:60`).
- `frontend/src/types/ElementTypes.ts`
  - Delete if the implementation can convert its few remaining active consumers to local read-model/domain types in this cycle. Evidence: it defines a parallel structural geometry model (`frontend/src/types/ElementTypes.ts:9`, `frontend/src/types/ElementTypes.ts:196`) separate from domain classes and projection-plane ownership.
- Any tests or fixtures that only import deleted store/workspace/type files, including TODO e2e comments that still require `Workspace2D` integration if touched during implementation. At minimum, delete or rewrite references in `frontend/tests/e2e/basic-construction.spec.ts` and `frontend/tests/e2e/distance-transport.spec.ts` if those specs are edited for e2e repair in the implementation wave.

## Expected behavior change

No user-facing behavior should be lost because the active app path already uses `SvgCanvas.vue`, `PaperService`, `SVGRenderer`, tool classes, injected `World`, and projection-plane iteration. Development-only `window.dumpDependencies`, `window.traceInvalidation`, and `window.getWorld` helpers currently point at a non-existent `worldStore.world`; deleting them removes broken debug surface rather than supported behavior.

Expected observable behavior after implementation:

- App still renders the main SVG canvas through `SvgCanvas.vue`.
- Construction tools still create domain elements through current tool/command paths.
- Selection, hover/hit-test, active-plane switching, select-all, delete cascade, undo/redo, and parametric updates still operate on `World`/projection planes.
- No source can create or mutate geometry through Pinia `worldStore`.

## Validation plan for implementation wave

Run and capture all logs under `architecture-audit/cycle-003-authoritative-world-state-delete-dead-store-workspace/validation/`.

### Static deletion/import checks

- `test ! -e frontend/src/components/workspace/Workspace2D.vue && echo deleted`
- `test ! -e frontend/src/components/workspace/ElementRenderer.vue && echo deleted`
- `test ! -e frontend/src/stores/worldStore.ts && echo deleted`
- `test ! -e frontend/src/composables/useSnapping.ts && echo deleted`
- `test ! -e frontend/src/composables/useElementGeometry.ts && echo deleted`
- `test ! -e frontend/src/types/ElementTypes.ts && echo deleted` if the reviewed implementation deletes it; otherwise grep must prove it is no longer a geometry-authority type and the decision must explain why deletion was impossible in one cycle.
- `grep -R "worldStore\|useWorldStore\|Workspace2D\|ElementRenderer\|ElementTypes\|useSnapping\|useElementGeometry" -n frontend/src frontend/tests || true` and review every remaining match.

### Focused Vitest

- Architecture boundary test forbidding deleted imports.
- World initialization coverage: `frontend/tests/integration/worldInitialization.spec.ts`.
- Projection-plane/cache coverage touched by authoritative state checks: `frontend/tests/unit/projectionPlane.spec.ts`, `frontend/tests/unit/domain/realizationCache.spec.ts`.
- Selection/delete/cascade and active-plane/select-all coverage where existing tests are runnable.
- Tool/Paper hit-test-adjacent focused tests covering point/line/segment/circle/guide construction and hover/snap-adjacent behavior, using current test filenames discovered during implementation.
- Parametric update/realization tests for moved points and dependent realizations.
- Undo/redo tests touching command stack and construction/deletion flows.

### Full required cadence

- `npm run lint` at root and `npm run lint --workspace=frontend`.
- Focused Vitest commands listed above.
- `npm run test` at root, plus backend test if root still skips backend.
- `npm run build` at root and `npm run build --workspace=frontend`; backend build if root still skips backend.
- `npm run test:e2e --workspace=frontend` because frontend/user-facing behavior is touched.
- Live Playwright/manual preview checks against the refreshed Vite app: construct a point, segment/line, guide/intersection-adjacent flow where available, switch active plane, select and delete, undo/redo, verify a parametric move updates dependents, and verify preview reachability.

Known validation debt from Waves 001–002 (missing `eslint`, `vue-tsc` crash under Node v24, malformed e2e specs, legacy full-suite failures) must be reclassified in the implementation log. Wave 003 should not introduce new attributable failures and should add static deletion checks that pass even if unrelated repository debt remains.

## Risks

- `ElementTypes.ts` may have a few active non-dead consumers. The implementation must not keep it as a parallel domain model; it should either delete it or convert it to local UI read-model types with a clear grep proving no geometry authority remains.
- Removing `main.ts` debug helpers may affect developer console workflows, but the current helpers are already broken by the absent `worldStore.world` field and should not block architectural cleanup.
- Full e2e validation is currently blocked by malformed legacy specs. If not repaired in this wave, the implementation log must classify that blockage and still perform static/focused/live preview checks for the touched surfaces.
- Deleting files can reveal stale tests that import them. Those tests should be deleted or rewritten if they only encode the old store-backed workspace path; do not add compatibility shims.
