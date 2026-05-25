# Proposal Direct — Delete legacy store/workspace geometry path

**Wave:** 003 — Establish one authoritative world state and delete dead store/workspace paths  
**Strategy:** implement the wave as planned: remove dead workspace/store-backed geometry code and convert the few remaining references to the current `World`/projection-plane path.

## Target outcome

After this wave, there is one authoritative geometric state source: `World` and its projection planes. Vue stores may remain for UI state (`toolStore`, `viewStore`, `selectionStore`, settings/auth), but no Pinia store owns points, lines, circles, 3D elements, guides, or a dependency graph in parallel with `World`.

## Files to change

- `frontend/src/main.ts`
  - Delete the dev helpers that import `./stores/worldStore` and read `worldStore.world`, because the current store has no `world` field (`frontend/src/main.ts:39`, `frontend/src/main.ts:43`, `frontend/src/main.ts:52`, `frontend/src/main.ts:57`, `frontend/src/main.ts:60`; `frontend/src/stores/worldStore.ts:6`). If dev helper functionality is still desired, expose it from the `World` instance provided by `App.vue` only in a later app-shell/debug cleanup wave; do not preserve a store shim here.
- `frontend/src/main.ts` and active tests that still rely on its dev helpers
  - Delete the broken `worldStore` debug helper surface; delete `frontend/tests/e2e/dynamic-planes.spec.ts` during implementation because it depends on the broken `window.getWorld()` debug helper / store-backed path; do not rewrite it through debug injection and do not preserve the helper.
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
- `frontend/src/components/dialogs/ElementPropertiesDialog.vue`
  - Evidence: imports only the parallel `ElementTypes` DTO (`frontend/src/components/dialogs/ElementPropertiesDialog.vue:125`) and has no production importer; reviewer W1 found its only active reference is the dead `frontend/tests/integration/formatUtils.integration.spec.ts` fixture. Delete instead of converting.
- `frontend/src/components/panels/ElementGroup.vue`
  - Evidence: imports only the parallel `ElementTypes` DTO (`frontend/src/components/panels/ElementGroup.vue:27`) and has zero active production importers per reviewer W1. Delete instead of converting.
- `frontend/src/services/ValidationService.ts`
  - Evidence: imports `ElementTypes` (`frontend/src/services/ValidationService.ts:3`) and has zero active production importers per reviewer W1. Delete instead of retargeting.
- `frontend/tests/integration/formatUtils.integration.spec.ts`
  - Evidence: imports `ElementTypes` (`frontend/tests/integration/formatUtils.integration.spec.ts:11`) only to mount/test dead `ElementPropertiesDialog.vue`; delete with the dead component rather than preserving obsolete fixtures.
- `frontend/src/types/ElementTypes.ts`
  - Delete unconditionally after the dead consumers above and `worldStore`/workspace/composables are removed. Evidence: current grep shows every importer is one of the files being deleted (`ElementPropertiesDialog.vue`, `ElementGroup.vue`, `ElementRenderer.vue`, `Workspace2D.vue`, `useElementGeometry.ts`, `useSnapping.ts`, `ValidationService.ts`, `worldStore.ts`, `formatUtils.integration.spec.ts`), and it defines a parallel structural geometry model (`frontend/src/types/ElementTypes.ts:9`, `frontend/src/types/ElementTypes.ts:196`) separate from domain classes and projection-plane ownership.
- Any tests or fixtures that only import deleted store/workspace/type files, including TODO e2e comments that still require `Workspace2D` integration if touched during implementation. Explicitly delete `frontend/tests/e2e/dynamic-planes.spec.ts` when `main.ts` debug helpers are removed; it must not be rewritten through debug injection or kept alive by preserving `window.getWorld()` / `worldStore`. Delete or rewrite references in `frontend/tests/e2e/basic-construction.spec.ts` and `frontend/tests/e2e/distance-transport.spec.ts` if those specs are edited for e2e repair in the implementation wave.

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
- `test ! -e frontend/src/types/ElementTypes.ts && echo deleted`
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

- Deleting the now-identified dead `ElementTypes` consumers is prerequisite to unconditional `ElementTypes.ts` deletion; implementation must not preserve any compatibility shim or local conversion for `ElementPropertiesDialog.vue`, `ElementGroup.vue`, `ValidationService.ts`, or `formatUtils.integration.spec.ts`.
- Removing `main.ts` debug helpers may affect developer console workflows, but the current helpers are already broken by the absent `worldStore.world` field and should not block architectural cleanup.
- Full e2e validation is currently blocked by malformed legacy specs. If not repaired in this wave, the implementation log must classify that blockage and still perform static/focused/live preview checks for the touched surfaces.
- Deleting files can reveal stale tests that import them. Those tests should be deleted or rewritten if they only encode the old store-backed workspace path; do not add compatibility shims.
