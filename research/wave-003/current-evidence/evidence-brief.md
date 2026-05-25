# Wave 003 Current Evidence Scout — Authoritative World State / Dead Store Workspace

**Stage:** `cycle-003-fresh-scout-proposals`  
**Task:** `t1-current-evidence-scout`  
**Access date:** 2026-05-25  
**Scope:** Current source tree after Waves 001–002 only. No source files were modified.

## Executive summary

Wave 003 premises still hold and are stronger after Waves 001–002:

- The authoritative geometric state is now clearly `World → ProjectionPlane → ProjectionPlaneElementStore`: `World` owns `projectionPlanes`, process/dependency services, and exposes projection-plane lookup/iteration APIs (`frontend/src/domain/world/World.ts:113`, `frontend/src/domain/world/World.ts:159`, `frontend/src/domain/world/World.ts:720`, `frontend/src/domain/world/World.ts:744`); projection planes delegate point/line/circle ownership to `ProjectionPlaneElementStore` (`frontend/src/domain/world/projectionPlane/ProjectionPlane.ts:14`, `frontend/src/domain/world/projectionPlane/ProjectionPlane.ts:38`, `frontend/src/domain/world/projectionPlane/ProjectionPlaneElementStore.ts:11`, `frontend/src/domain/world/projectionPlane/ProjectionPlaneElementStore.ts:12`).
- `worldStore.ts` is still an independent Pinia geometry store with its own `elements2D`, `elements3D`, `guides`, and `dependencyGraph` maps/actions (`frontend/src/stores/worldStore.ts:7`, `frontend/src/stores/worldStore.ts:8`, `frontend/src/stores/worldStore.ts:9`, `frontend/src/stores/worldStore.ts:10`, `frontend/src/stores/worldStore.ts:96`, `frontend/src/stores/worldStore.ts:130`, `frontend/src/stores/worldStore.ts:166`). This duplicates the domain-owned geometry model and should not remain as an owner of geometry.
- `Workspace2D.vue` and `ElementRenderer.vue` remain legacy/dead workspace paths. `Workspace2D.vue` is the only source importer of `ElementRenderer.vue` and imports the legacy store/composables/types (`frontend/src/components/workspace/Workspace2D.vue:37`, `frontend/src/components/workspace/Workspace2D.vue:66`, `frontend/src/components/workspace/Workspace2D.vue:69`, `frontend/src/components/workspace/Workspace2D.vue:70`, `frontend/src/components/workspace/Workspace2D.vue:77`, `frontend/src/components/workspace/Workspace2D.vue:79`). It also calls `command.execute()` directly in multiple handlers (`frontend/src/components/workspace/Workspace2D.vue:197`, `frontend/src/components/workspace/Workspace2D.vue:250`, `frontend/src/components/workspace/Workspace2D.vue:299`, `frontend/src/components/workspace/Workspace2D.vue:366`, `frontend/src/components/workspace/Workspace2D.vue:440`, `frontend/src/components/workspace/Workspace2D.vue:514`). Current `frontend/src/commands` contains no `FreePoint2DCommand`, `PointOnElement2DCommand`, `Intersection2DCommand`, `Segment2DCommand`, `Line2DCommand`, or `Circle2DCommand` files.
- `useSnapping.ts` and `useElementGeometry.ts` are store-backed legacy geometry helpers. They import `useWorldStore` and `ElementTypes` (`frontend/src/composables/useSnapping.ts:2`, `frontend/src/composables/useSnapping.ts:4`, `frontend/src/composables/useElementGeometry.ts:11`, `frontend/src/composables/useElementGeometry.ts:13`) and inspect `worldStore.elements2D` for point/segment/line/circle operations (`frontend/src/composables/useElementGeometry.ts:33`, `frontend/src/composables/useElementGeometry.ts:139`, `frontend/src/composables/useElementGeometry.ts:190`). Their only active source consumer found is `Workspace2D.vue` (`frontend/src/components/workspace/Workspace2D.vue:77`, `frontend/src/components/workspace/Workspace2D.vue:79`), so they are deletion candidates unless proposal authors deliberately reuse them as pure read-model utilities.
- `ElementTypes.ts` is not only used by the dead workspace path. Additional active consumers import its `Element2D`/`Element3D` shapes: `ElementPropertiesDialog.vue`, `ElementGroup.vue`, and `ValidationService.ts` (`frontend/src/components/dialogs/ElementPropertiesDialog.vue:125`, `frontend/src/components/panels/ElementGroup.vue:27`, `frontend/src/services/ValidationService.ts:3`). Proposal authors should not blindly delete the file without converting or deleting these consumers.

## Waves 001–002 impact on Wave 003

- Wave 001 moved initialization out of `World` and deleted `World.initialize(commandStack)`, making `World` a cleaner domain root. The implementation log records `frontend/src/application/world/initializeWorld.ts` as the application initializer and deletion of command/application imports from `World.ts`.
- Wave 002 deleted the old monolithic `frontend/src/domain/world/ProjectionPlane.ts` and split authoritative plane responsibilities into `frontend/src/domain/world/projectionPlane/`. The new `ProjectionPlaneElementStore` makes plane-owned element maps explicit and reduces any argument for retaining a parallel `worldStore` geometry owner.
- Remaining-wave centrality is unchanged: Wave 003 should still precede persistence/command contracts (Wave 004) and rendering/tool/UI extraction waves because those later layers must read one authoritative state model, not a store/domain hybrid.

## Current authoritative state evidence

### `World` domain root

`World` owns projection planes and core domain services:

- `projectionPlanes: Map<string, ProjectionPlane>` is declared as all base/auxiliary projection planes (`frontend/src/domain/world/World.ts:113`) and initialized in the constructor (`frontend/src/domain/world/World.ts:159`).
- `processTree` and `dependencyService` remain owned by `World` (`frontend/src/domain/world/World.ts:121`, `frontend/src/domain/world/World.ts:124`, `frontend/src/domain/world/World.ts:177`, `frontend/src/domain/world/World.ts:178`).
- Projection planes are added to `World.projectionPlanes` and registered with dependency service (`frontend/src/domain/world/World.ts:411`, `frontend/src/domain/world/World.ts:436`, `frontend/src/domain/world/World.ts:439`).
- Public accessors expose plane lookup/iteration (`frontend/src/domain/world/World.ts:720`, `frontend/src/domain/world/World.ts:731`, `frontend/src/domain/world/World.ts:744`).

### `ProjectionPlane` / `ProjectionPlaneElementStore`

- `ProjectionPlane` imports and owns a `ProjectionPlaneElementStore` (`frontend/src/domain/world/projectionPlane/ProjectionPlane.ts:14`, `frontend/src/domain/world/projectionPlane/ProjectionPlane.ts:38`, `frontend/src/domain/world/projectionPlane/ProjectionPlane.ts:54`).
- The store has separate private maps for points, lines, and circles (`frontend/src/domain/world/projectionPlane/ProjectionPlaneElementStore.ts:11`, `frontend/src/domain/world/projectionPlane/ProjectionPlaneElementStore.ts:12`, `frontend/src/domain/world/projectionPlane/ProjectionPlaneElementStore.ts:13`, `frontend/src/domain/world/projectionPlane/ProjectionPlaneElementStore.ts:14`).
- Store methods add/read/remove point/line/circle maps (`frontend/src/domain/world/projectionPlane/ProjectionPlaneElementStore.ts:30`, `frontend/src/domain/world/projectionPlane/ProjectionPlaneElementStore.ts:35`, `frontend/src/domain/world/projectionPlane/ProjectionPlaneElementStore.ts:52`, `frontend/src/domain/world/projectionPlane/ProjectionPlaneElementStore.ts:57`, `frontend/src/domain/world/projectionPlane/ProjectionPlaneElementStore.ts:73`, `frontend/src/domain/world/projectionPlane/ProjectionPlaneElementStore.ts:78`).
- `ProjectionPlane` treats segments/guides as line subtypes in the authoritative plane storage (`frontend/src/domain/world/projectionPlane/ProjectionPlane.ts:170`, `frontend/src/domain/world/projectionPlane/ProjectionPlane.ts:882`, `frontend/src/domain/world/projectionPlane/ProjectionPlane.ts:983`, `frontend/src/domain/world/projectionPlane/ProjectionPlane.ts:1044`).

## Legacy duplicate state evidence

### `worldStore.ts`

`worldStore.ts` still defines a separate state model:

- State includes `elements2D`, `elements3D`, `guides`, and `dependencyGraph` (`frontend/src/stores/worldStore.ts:6`, `frontend/src/stores/worldStore.ts:7`, `frontend/src/stores/worldStore.ts:8`, `frontend/src/stores/worldStore.ts:9`, `frontend/src/stores/worldStore.ts:10`).
- Initial state creates independent maps and a separate `DependencyGraph` (`frontend/src/stores/worldStore.ts:15`, `frontend/src/stores/worldStore.ts:16`, `frontend/src/stores/worldStore.ts:17`, `frontend/src/stores/worldStore.ts:18`).
- Getters expose store-owned arrays/lookups for 2D/3D elements and guides (`frontend/src/stores/worldStore.ts:25`, `frontend/src/stores/worldStore.ts:30`, `frontend/src/stores/worldStore.ts:36`, `frontend/src/stores/worldStore.ts:60`, `frontend/src/stores/worldStore.ts:66`).
- Actions mutate store-owned geometry and dependency graph (`frontend/src/stores/worldStore.ts:96`, `frontend/src/stores/worldStore.ts:100`, `frontend/src/stores/worldStore.ts:106`, `frontend/src/stores/worldStore.ts:110`, `frontend/src/stores/worldStore.ts:130`, `frontend/src/stores/worldStore.ts:150`, `frontend/src/stores/worldStore.ts:166`, `frontend/src/stores/worldStore.ts:180`, `frontend/src/stores/worldStore.ts:188`).

This should be deleted outright if no active non-legacy usage remains. If a store remains, it should be renamed/replaced as UI/read-model state and must not keep geometry maps or a dependency graph.

### Debug globals in `main.ts`

`main.ts` dynamically imports `./stores/worldStore` for DEV debug helpers and then accesses `worldStore.world.getDependencyService()` / `worldStore.world` (`frontend/src/main.ts:39`, `frontend/src/main.ts:41`, `frontend/src/main.ts:43`, `frontend/src/main.ts:48`, `frontend/src/main.ts:50`, `frontend/src/main.ts:52`, `frontend/src/main.ts:57`, `frontend/src/main.ts:58`, `frontend/src/main.ts:60`). Current `worldStore.ts` evidence shows no `world` property in the state (`frontend/src/stores/worldStore.ts:6`, `frontend/src/stores/worldStore.ts:15`), so these helpers appear stale/broken and should be deleted or redirected to the actual app-provided world only if the proposal intentionally keeps debug access.

## Dead workspace evidence

### `Workspace2D.vue`

- Renders `ElementRenderer` in its template (`frontend/src/components/workspace/Workspace2D.vue:37`).
- Imports `useWorldStore`, `ElementRenderer`, `ElementTypes`, `useSnapping`, and `useElementGeometry` (`frontend/src/components/workspace/Workspace2D.vue:66`, `frontend/src/components/workspace/Workspace2D.vue:69`, `frontend/src/components/workspace/Workspace2D.vue:70`, `frontend/src/components/workspace/Workspace2D.vue:77`, `frontend/src/components/workspace/Workspace2D.vue:79`).
- Creates a store instance (`frontend/src/components/workspace/Workspace2D.vue:81`).
- Executes legacy command objects directly (`frontend/src/components/workspace/Workspace2D.vue:197`, `frontend/src/components/workspace/Workspace2D.vue:250`, `frontend/src/components/workspace/Workspace2D.vue:299`, `frontend/src/components/workspace/Workspace2D.vue:366`, `frontend/src/components/workspace/Workspace2D.vue:440`, `frontend/src/components/workspace/Workspace2D.vue:514`).
- The current command directory has no files matching its old command-class imports (`FreePoint2DCommand`, `PointOnElement2DCommand`, `Intersection2DCommand`, `Segment2DCommand`, `Line2DCommand`, `Circle2DCommand`).

Recommendation: delete `Workspace2D.vue`; do not migrate it.

### `ElementRenderer.vue`

- Imports legacy structural `ElementTypes` and `useWorldStore` (`frontend/src/components/workspace/ElementRenderer.vue:80`, `frontend/src/components/workspace/ElementRenderer.vue:81`).
- Creates a store instance and looks up dependent elements from `worldStore.elements2D` (`frontend/src/components/workspace/ElementRenderer.vue:88`, `frontend/src/components/workspace/ElementRenderer.vue:93`, `frontend/src/components/workspace/ElementRenderer.vue:95`).
- Contains placeholder/unsupported coordinate comments for derived point variants (`frontend/src/components/workspace/ElementRenderer.vue:103`, `frontend/src/components/workspace/ElementRenderer.vue:113`).

Recommendation: delete `ElementRenderer.vue` with `Workspace2D.vue`.

## Store-backed composables evidence

### `useSnapping.ts`

- Imports `useWorldStore` and legacy `Point2D` type (`frontend/src/composables/useSnapping.ts:2`, `frontend/src/composables/useSnapping.ts:4`).
- Creates `worldStore` (`frontend/src/composables/useSnapping.ts:11`).
- Exposes `snapToPoint` and grid snapping, but current grep found only `Workspace2D.vue` as a source consumer (`frontend/src/components/workspace/Workspace2D.vue:77`, `frontend/src/components/workspace/Workspace2D.vue:85`).

Recommendation: delete if `Workspace2D.vue` is deleted, unless the implementation intentionally extracts a new pure snapping read-model from `World` for active canvas/tools.

### `useElementGeometry.ts`

- Imports `useWorldStore` and legacy `ElementTypes` (`frontend/src/composables/useElementGeometry.ts:11`, `frontend/src/composables/useElementGeometry.ts:13`).
- Reads `worldStore.elements2D` to resolve segment endpoints and hit-test candidates (`frontend/src/composables/useElementGeometry.ts:33`, `frontend/src/composables/useElementGeometry.ts:34`, `frontend/src/composables/useElementGeometry.ts:139`, `frontend/src/composables/useElementGeometry.ts:140`, `frontend/src/composables/useElementGeometry.ts:185`, `frontend/src/composables/useElementGeometry.ts:190`).
- Contains `any` parameters in line/circle distance helpers (`frontend/src/composables/useElementGeometry.ts:70`, `frontend/src/composables/useElementGeometry.ts:79`).
- Current grep found only `Workspace2D.vue` as a source consumer (`frontend/src/components/workspace/Workspace2D.vue:79`, `frontend/src/components/workspace/Workspace2D.vue:87`).

Recommendation: delete with `Workspace2D.vue` unless active `SvgCanvas`/tools need a replacement read-model; if a replacement is needed, build it from `World`/projection planes, not `worldStore`.

## `ElementTypes.ts` evidence and caution

`ElementTypes.ts` defines a parallel structural element model:

- 2D element base and point/segment/line/circle/guide unions (`frontend/src/types/ElementTypes.ts:9`, `frontend/src/types/ElementTypes.ts:25`, `frontend/src/types/ElementTypes.ts:63`, `frontend/src/types/ElementTypes.ts:76`, `frontend/src/types/ElementTypes.ts:91`, `frontend/src/types/ElementTypes.ts:115`, `frontend/src/types/ElementTypes.ts:128`, `frontend/src/types/ElementTypes.ts:144`, `frontend/src/types/ElementTypes.ts:171`, `frontend/src/types/ElementTypes.ts:196`).
- 3D structural elements and type guards (`frontend/src/types/ElementTypes.ts:212`, `frontend/src/types/ElementTypes.ts:223`, `frontend/src/types/ElementTypes.ts:234`, `frontend/src/types/ElementTypes.ts:245`, `frontend/src/types/ElementTypes.ts:256`, `frontend/src/types/ElementTypes.ts:267`, `frontend/src/types/ElementTypes.ts:288`).

But it is still imported outside the dead workspace/store cluster:

- `ElementPropertiesDialog.vue` prop type (`frontend/src/components/dialogs/ElementPropertiesDialog.vue:125`, `frontend/src/components/dialogs/ElementPropertiesDialog.vue:131`).
- `ElementGroup.vue` prop/event type (`frontend/src/components/panels/ElementGroup.vue:27`, `frontend/src/components/panels/ElementGroup.vue:31`, `frontend/src/components/panels/ElementGroup.vue:37`).
- `ValidationService.ts` validation input types (`frontend/src/services/ValidationService.ts:3`, `frontend/src/services/ValidationService.ts:16`).
- `formatUtils.integration.spec.ts` imports `Element2D` in tests, and `dynamic-planes.spec.ts` references `worldStore` debug access.

Recommendation: proposal should include either (a) a focused conversion of these non-workspace consumers to real domain element types / selector DTOs before deleting `ElementTypes.ts`, or (b) retain `ElementTypes.ts` only if it is explicitly reclassified as a presentation DTO contract and stripped of store/workspace ownership semantics. Under no-backcompat priorities, deletion is preferable if feasible in one cycle.

## Import/reachability summary

Current grep found these active source/test references relevant to Wave 003:

- `worldStore`: `Workspace2D.vue`, `ElementRenderer.vue`, `useSnapping.ts`, `useElementGeometry.ts`, `main.ts` DEV debug helpers, `dynamic-planes.spec.ts`, and `worldStore.ts` itself.
- `Workspace2D.vue`: no active source import found besides its own file; it imports `ElementRenderer.vue`.
- `ElementRenderer.vue`: only active source import found is `Workspace2D.vue`.
- `useSnapping.ts` / `useElementGeometry.ts`: only active source consumer found is `Workspace2D.vue`.
- `ElementTypes.ts`: used by dead workspace/store path plus `ElementPropertiesDialog.vue`, `ElementGroup.vue`, `ValidationService.ts`, and one integration test.

## Tests / validation surfaces for implementation proposal

For Wave 003 implementation, focused and full validation should include at minimum:

- Static deletion/import checks:
  - `test ! -e frontend/src/components/workspace/Workspace2D.vue`
  - `test ! -e frontend/src/components/workspace/ElementRenderer.vue`
  - grep that no active source imports `@/stores/worldStore`, `Workspace2D`, `ElementRenderer`, store-backed `useSnapping`, or store-backed `useElementGeometry` after the chosen proposal.
  - if deleting `ElementTypes.ts`, grep no imports remain.
- Focused Vitest likely relevant to authoritative domain behavior:
  - `frontend/tests/integration/worldInitialization.spec.ts`
  - `frontend/tests/unit/projectionPlane.spec.ts`
  - `frontend/tests/unit/domain/realizationCache.spec.ts`
  - guide/intersection factory tests if snapping/hit-test-adjacent behavior is touched.
  - selection/store tests if UI state stores are changed.
- E2E/user flows named by the stage acceptance criteria:
  - construction: `frontend/tests/e2e/basic-construction.spec.ts`
  - snapping/hit-test-adjacent: `frontend/tests/e2e/circle-tool-snapping.spec.ts`, `frontend/tests/e2e/selection-mask.spec.ts`, `frontend/tests/e2e/guide-creation.spec.ts`
  - selection: `frontend/tests/e2e/selection.spec.ts`
  - parametric updates: `frontend/tests/e2e/parametric-update.spec.ts`
  - undo/redo: `frontend/tests/e2e/undo-redo.spec.ts`, `frontend/tests/e2e/undo-redo-fix.spec.ts`
  - dynamic/auxiliary planes: `frontend/tests/e2e/dynamic-planes.spec.ts` if debug world access or plane read models are changed.
- Mandatory wave cadence still applies: root/workspace lint, focused Vitest, full Vitest, root/workspace build, Playwright/e2e, and live preview refresh/probe. Recent logs show lint/build/full/e2e have pre-existing environment/test debt, so implementation logs should classify failures carefully, but not skip the commands.

## Re-rank / wave-plan implication

No wave-plan edit appears necessary for Wave 003. Waves 001–002 strengthened the centrality of Wave 003 rather than invalidating it. The remaining waves should stay ordered as planned: one authoritative state source must be established before persistence private-cast cleanup, process/dependency cleanup, UI command-controller extraction, rendering selectors, and app-shell/backend/doc waves.

## Source artifacts produced by this scout

- Full raw command logs were generated locally as ignored `.log` files; committed evidence is summarized in the targeted `.txt` artifacts below.
- `research/wave-003/current-evidence/targeted-evidence.txt` — targeted line-number excerpts.
- `research/wave-003/current-evidence/evidence-summary-lines.txt` — compact grep line evidence used for this brief.
- `research/wave-003/current-evidence/secondary-evidence.txt` — `main.ts`, surviving `ElementTypes` consumers, and dynamic-plane e2e snippets.
