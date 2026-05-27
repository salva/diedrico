# Proposal Direct — Behavior-sized canvas projection DTO selectors

## Decision intent

Implement Wave 028 narrowly. Delete the active canvas selector dependency on raw projection planes and raw 3D collections by introducing focused canvas item selectors/read capabilities. Keep `RuntimeSession` as the private concrete `World` owner, preserve Wave 025–027 invariants, and avoid any generic `WorldReadModel`, `RuntimeWorld`, app-kernel facade, persistence/command redesign, or broad domain realization rewrite.

## Proposed design

### 1. Split canvas read-port contract by behavior

Replace the public `CanvasWorldReadPort` raw collection/realization shape with behavior-sized capabilities:

- `getCanvasPlaneTransforms(): CanvasPlaneTransformModel[]` or equivalent keyed DTO source for all render/input plane transforms.
- `getPlaneCanvasItems(): CanvasPlaneCanvasItems[]`, where each plane item group includes `planeId`, `transform`, and already-realized/classified plane-owned 2D item source DTOs.
- `getProjected3DCanvasItems(planeTransforms: CanvasPlaneTransformMap): CanvasRenderItem[]` or lower-level `Projected3DCanvasSourceItem[]` if review prefers primitive construction to remain outside the adapter.
- `isElementVisible(element)` may remain internal to the adapter/selector boundary; do not expose process-tree access.

The replacement should be named by canvas behavior, for example `CanvasPlaneItemsSelector` and `Projected3DCanvasItemsSelector` or a single `CanvasProjectionReadPort` with explicit methods. Do **not** create a generic read model whose methods mirror `World` (`getAllProjectionPlanes`, `getAll3DPoints`, etc.).

### 2. Localize traversal and realization inside focused selectors/adapters

Move these current responsibilities out of `CanvasPresentationSelector`:

- raw `readPort.getAllProjectionPlanes()` loops;
- `plane.getAllPoints()`, `plane.getAllLines()`, `plane.getAllCircles()` loops;
- public `readPort.realizePoint2D/Line2D/Circle2D` calls;
- selector-level line-kind `instanceof` classification.

The focused adapter may still use domain classes internally because it is the boundary from `World` to canvas DTOs. It should emit explicit DTO kinds (`point`, `finite-segment`, `guide`, `sibling-guide`, `half-hinge-line`, `infinite-line`, `circle`, `arc`) and plane geometry in plane coordinates so downstream render/query construction does not need raw domain objects.

### 3. Replace projected-3D raw traversal as one unit

Move the current `Projected3DCanvasSelector` nested traversal over raw planes and raw 3D collections into a projected-3D canvas item selector/read method. Delete or rewrite the current selector so its public inputs are behavior-sized (`planeTransforms` plus projected item source DTOs or a read method returning final projected render items). The raw 3D getter trio must be removed together from active canvas selector contracts or retained together with an implementation-log residual; direct proposal target is deletion.

### 4. Preserve transform/input behavior

Keep `CanvasPresentationModel.planeTransforms` because `SvgCanvas`/interaction code depends on presentation and query transforms. If possible, make `RuntimeSession.getPlaneTransformsForInput()` reuse the same transform DTO capability instead of directly iterating `this.world.getAllProjectionPlanes()`. Do not change `screenTo3D(...)`, free-point move sessions, tool command producers, active-plane selector behavior, or viewport math unless the new transform method requires a mechanical type adjustment.

### 5. Three read context alignment only if tiny

Inventory `ThreeWorldReadPort` but do not redesign it. If implementation can extract a small internal helper such as `createWorldRealizationReadContext(world)` used by both canvas and three adapters, do so only if:

- the helper returns the existing typed `ProjectionElementRealizationContext & Element3DRealizationContext`;
- it is not exported as a general app facade;
- it does not change `ThreeWorldReadPort` public methods;
- it reduces duplication without broadening Wave 028.

Otherwise leave three unchanged and record it as a residual.

## Files to change

Expected source files:

- `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts` — replace raw collection/realization public methods with behavior-sized methods and internalize realization context.
- `frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts` — consume plane item/projected item DTOs and retain only composition, style/render/query mapping, sorting, grid, and active transform logic.
- `frontend/src/application/canvasPresentation/Projected3DCanvasSelector.ts` — rewrite around projected-3D DTO/read capability or delete/replace if its responsibility moves into a new selector.
- `frontend/src/application/canvasPresentation/CanvasPresentationModel.ts` — add explicit item source DTO types if needed.
- `frontend/src/application/canvasPresentation/CanvasVisibilityPolicy.ts` — only if the visibility capability type must be narrowed; do not reintroduce process-tree access.
- New `frontend/src/application/canvasPresentation/CanvasPlaneItemsSelector.ts` and/or `Projected3DCanvasItemsSelector.ts` if chosen.
- `frontend/src/application/appShell/RuntimeSession.ts` — wire the changed read-port/selector contract and optionally reuse plane transform DTOs for input.
- `frontend/src/application/appShell/RuntimeViewPorts.ts` — only if transform DTO typing needs tightening.
- `frontend/src/application/threePresentation/ThreeWorldReadPort.ts` — only for tiny shared realization-context helper adoption, not public 3D redesign.

Expected tests:

- `frontend/tests/unit/application/canvasPresentation/canvasWorldReadPort.spec.ts`
- `frontend/tests/unit/application/canvasPresentation/canvasPresentationSelector.spec.ts`
- `frontend/tests/unit/application/canvasPresentation/projected3DCanvasSelector.spec.ts`
- New focused tests for any new selector module.
- Architecture/static tests or scripted scans for deleted raw seams.
- Existing `frontend/tests/e2e/current-ui-contract.spec.ts` must remain valid and may be extended only if needed for projected-3D display coverage.

## Files/tests/docs/fixtures to DELETE

Delete these surfaces if replaced by the DTO selectors:

- `CanvasWorldReadPort.getAllProjectionPlanes()` from the active public canvas selector contract.
- `CanvasWorldReadPort.getAll3DPoints()`, `getAll3DLines()`, and `getAll3DSegments()` together from the active public canvas selector contract.
- Public `CanvasWorldReadPort.realizePoint2D`, `realizeLine2D`, `realizeCircle2D`, `realizePoint3D`, `realizeLine3D`, and `realizeSegment3D` methods.
- `CanvasPresentationSelector` raw `plane.getAll*()` loops.
- `Projected3DCanvasSelector` raw nested loops over projection planes and 3D collections if replaced by projected DTO source methods.
- Selector-level domain `instanceof` classification outside the adapter/DTO selector boundary.
- Test mocks that encode raw getter contracts, especially the current projected-3D read-port mock.
- Any compatibility wrappers or dual raw-and-DTO paths introduced during implementation.

Do not delete production docs/specs/backend/package files in this wave.

## Expected behavior change

No intended user-visible behavior change. Rendering order, IDs, source entity IDs, styles, hit/query geometry, grid/active-plane behavior, hover/selection/cascade highlighting, projected-3D visibility, screen-to-3D coordinate status, point move, and 3D overlay pointer ownership should remain equivalent. The intended change is architectural: raw traversal and realization ownership move behind explicit canvas DTO selector boundaries.

## Risks and mitigations

- **DTO facade risk:** A new method can mirror `World` collections. Mitigate by naming methods by canvas behavior and returning render/query source DTOs, not domain collections.
- **Render/query drift:** Moving realization can alter IDs, layer ordering, finite/infinite line handling, guide/hinge classification, or query geometry. Mitigate with focused snapshot-style assertions over representative points, finite segments, lines, guides/hinges, circles, and projected 3D items.
- **Transform/input drift:** Plane transforms support both rendering and input. Mitigate by testing `planeTransforms`, `getPlaneTransformsForInput()`, hit/query, active grid, and screen-to-3D where touched.
- **Visibility regression:** Do not reintroduce process-tree reads. Add static scan for `getProcessTree` in canvas presentation and tests for hidden elements.
- **3D overlay regression:** Preserve existing e2e overlay pointer test if any presentation-adjacent file is touched.
- **Three overreach:** Shared context helper may become a facade. If helper is not trivial, leave three unchanged and record residual.

## Validation plan

Implementation must capture logs under `architecture-audit/cycle-028-canvas-projection-dto-selectors/validation/`:

1. Pre/post scoped status/diff and static scans for raw getter deletion/retention, realization-method deletion, no `getProcessTree`, no generic facade names, no Vue concrete `World`, and no dual raw-and-DTO path.
2. Focused Vitest for canvas read-port/selector modules, projected-3D item generation, visibility consumption, and runtime transform wiring.
3. Focused hit/query/grid/screen-to-3D tests if transform ownership changes.
4. Root/frontend lint, full Vitest, build.
5. Root/frontend Playwright/e2e where defined, including `current-ui-contract.spec.ts` and overlay pointer ownership.
6. Live preview refresh on `0.0.0.0:5173`, HTTP 200 probe, and live/browser smoke for canvas render/hit/hover, projected-3D display when available, active-plane/grid, 3D view interaction, elements visibility display, and undo/redo regression.

## No-backcompat rationale

These seams are internal architecture boundaries, not public compatibility contracts. Keeping raw projection-plane/3D getters beside DTO selectors would preserve the bypass path Wave 028 is meant to remove. Delete replaced getters, realization methods, raw loops, stale tests, and transitional wrappers instead of maintaining dual paths.

## Stop conditions

Stop for reviewed plan edit/delta proposal if implementation requires domain realization semantic changes, projection-plane mutation redesign, command/persistence changes, broad 3D read-port/scene extraction, UI feature behavior changes, package/tooling edits, backend/docs/specs changes, or partial deletion of the 3D getter trio.
