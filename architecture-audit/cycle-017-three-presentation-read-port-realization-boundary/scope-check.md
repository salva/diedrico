# Cycle 017 Scope Check — Three presentation read ports and realization boundary (post-Wave-028 refresh)

## Stage status

This is a fresh scout/proposal refresh for **Wave 017 — Three presentation read ports and realization boundary** after Wave 028 closure. It is documentation-only: no production source, tests, package/tooling, backend, persistence, command, scene-host, or UI behavior implementation is authorized by this artifact.

The current source already contains earlier Cycle 017 implementation artifacts and a newer post-Wave-028 code shape. This refresh treats older Cycle 017 files as current in-tree files to verify, not as authoritative historical conclusions. The selected Wave 017 scope remains valid, but its implementation premise must be reframed: the raw Vue/component full-`World` three-presentation input has already been removed; the current residual is the **broad `ThreeWorldReadPort` adapter that wraps full `World` traversal, realization-context assembly, DTO families, classification, and guide/intersection aggregation in one module**.

Recommended next stage if Critic/Reviewer approve these artifacts: `cycle-017-review-round-01-post-028`.

## First inspections and source-control reconciliation

Current path-scoped status/diff were inspected before editing and captured under `.saivage/stages/cycle-017-fresh-scout-proposals-post-028/design-notes/`:

- `pre-scout-scoped-status.stdout.log`
- `pre-scout-scoped-diffstat.stdout.log`

Findings:

- Existing Cycle 017 audit artifacts are dirty/untracked, including `scope-check.md`, validation logs, old `reviews/`, and old implementation/closure artifacts. They are stale relative to this post-Wave-028 scout and are replaced only where this task requires (`scope-check.md`, `proposals/proposal-direct.md`, `proposals/proposal-restructure.md`).
- Known unrelated dirty source files remain protected and were not read for implementation logic, reverted, staged as source changes, or incorporated into the design: `frontend/src/domain/calculations/Intersections.ts` and `frontend/src/domain/processTree/ActionGroup.ts`. The scoped diffstat shows them as unrelated dirty files.
- Secret/provider/env/config files were not read.

## Current wave-plan and Wave 028 evidence

- `architecture-audit/wave-plan.md:861-905` still identifies Wave 017 as the three-presentation read-port/realization-boundary wave, with scope in `frontend/src/application/threePresentation/*`, limited `CanvasWorldReadPort` alignment, `ThreeView.vue`, runtime, and focused tests. Its delete list includes full-`World` selector signatures and compatibility wrappers.
- `architecture-audit/cycle-028-canvas-projection-dto-selectors/implementation-log.md` records that Wave 028 deleted public raw canvas getter/realization seams and localized projected-3D traversal in `Projected3DCanvasReadPort.ts`; it explicitly left `ThreeWorldReadPort` as a future residual.
- `architecture-audit/cycle-028-canvas-projection-dto-selectors/next-wave-recommendation.md` recommends Wave 017 as the immediate next work because `ThreeWorldReadPort.ts` remains the broadest active presentation adapter and Wave 028 stabilized the canvas DTO/read-port pattern.
- `architecture-audit/cycle-026-hotfix-3d-view-interaction-regression/implementation-log.md` and Wave 028 closure evidence protect the 3D overlay pointer-boundary: `.three-view-overlay` must own pointer events and must not pass drag gestures through to the SVG canvas.

## Current source evidence

### Three presentation component/runtime no longer inject raw World

- `frontend/src/components/panels/ThreeView.vue:41-50` injects `ThreePresentationInjectionKey`, obtains `threePresentationPort.getReadPort()`, and refreshes `ThreeViewRuntime` with `{ readPort, displayOptions, selectedIds }`; no concrete `World` is passed to the component.
- `frontend/src/application/appShell/RuntimeSession.ts:93-99` creates the concrete adapter at the runtime boundary with `createThreeWorldReadPort(this.world)` and exposes only `getReadPort()` through `ThreePresentationPort`.
- `frontend/src/application/appShell/RuntimeViewPorts.ts:133-134` types `ThreePresentationPort.getReadPort(): ThreeWorldReadPort`.
- `frontend/src/rendering/threeView/ThreeViewRuntime.ts:73-80` consumes `ThreePresentationInput`, builds a presentation model, and only replaces owned scene groups; it does not traverse `World`.

Implication: the original Wave 017 delete item “delete `ThreePresentationInput.world: World`” is already satisfied in current source (`frontend/src/application/threePresentation/ThreePresentationModel.ts:10` defines `readPort`, not `world`). The stage must not re-implement that already-closed seam.

### Current `ThreeWorldReadPort` residual

`frontend/src/application/threePresentation/ThreeWorldReadPort.ts` is now the central residual:

- It imports concrete `World` and domain classes/helpers at `ThreeWorldReadPort.ts:6-12` and wraps the concrete `World` in `createThreeWorldReadPort(world: World)` at `ThreeWorldReadPort.ts:81-82`.
- It defines multiple read-model families in one file: projection-plane models (`ThreeWorldReadPort.ts:16-21`), planar point/line/circle models (`ThreeWorldReadPort.ts:23-33`), reconstructed models (`ThreeWorldReadPort.ts:35-40`), guide/intersection models (`ThreeWorldReadPort.ts:42-52`), and hinge models (`ThreeWorldReadPort.ts:54-63`).
- It assembles a realization context locally at `ThreeWorldReadPort.ts:66-79`, duplicating the shape now also present in canvas presentation (`frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:17-30`).
- It owns projection-plane traversal and auxiliary/fixed classification at `ThreeWorldReadPort.ts:84-89`, grid source lookup at `ThreeWorldReadPort.ts:90-97`, per-plane 2D traversal plus `Segment2DByPoints` classification at `ThreeWorldReadPort.ts:98-104`, reconstructed 3D traversal at `ThreeWorldReadPort.ts:105-110`, selected guide lookup/classification and exception swallowing at `ThreeWorldReadPort.ts:111-119`, guide-intersection source aggregation at `ThreeWorldReadPort.ts:120-133`, and hinge traversal/realization at `ThreeWorldReadPort.ts:134`.
- The public interface at `ThreeWorldReadPort.ts:56-63` is behavior-named, but it is still a single broad port with seven unrelated responsibilities.

### Current selector consumption is already sliced, but tied to one broad interface

- `ProjectionPlane3DSelector` accepts the whole `ThreeWorldReadPort` at `frontend/src/application/threePresentation/ProjectionPlane3DSelector.ts:9-10` even though it uses projection-plane and grid capabilities (`ProjectionPlane3DSelector.ts:15-25`, `ProjectionPlane3DSelector.ts:36-40`).
- Other selectors already use `Pick<ThreeWorldReadPort, ...>` slices: planar elements at `PlanarElement3DSelector.ts:7-12`, reconstructed elements at `ReconstructedElement3DSelector.ts:8-12`, guides at `Guide3DSelector.ts:8-24`, and hinges at `Hinge3DSelector.ts:7-12`.
- `ThreePresentationSelector` still orchestrates all concern selectors with the same `readPort` object at `frontend/src/application/threePresentation/ThreePresentationSelector.ts:17-24`.

Implication: the bounded direct fix should formalize these slices into explicit read-port interfaces/modules and split adapter construction/selection by concern. It should not invent a generic `RuntimeWorld`, `WorldReadModel`, app-kernel facade, or all-purpose presentation snapshot.

### Canvas DTO pattern after Wave 028

- `CanvasWorldReadPort` now exposes behavior-sized methods only: `getCanvasPlaneTransforms`, `getPlaneCanvasItems`, and `getProjected3DCanvasItems` (`frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:11-15`).
- It still privately assembles `createCanvasRealizationContext(world)` at `CanvasWorldReadPort.ts:17-30`, traverses planes and 2D elements internally at `CanvasWorldReadPort.ts:40-99`, and delegates projected-3D traversal to `Projected3DCanvasReadPort` at `CanvasWorldReadPort.ts:102-109`.
- `Projected3DCanvasReadPort` localizes raw projected-3D traversal at `frontend/src/application/canvasPresentation/Projected3DCanvasReadPort.ts:5-12`.

Implication: Wave 017 should apply the same behavior-sized adapter principle to three presentation while preserving the intentional adapter boundary. It should not move canvas traversal back into selectors or share a broad presentation/world facade.

### Domain realization context boundary

- `ProjectionElementRealizationContext` currently includes both lookup and broad collection methods (`frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts:9-20`).
- `Element2D.realize2D(context: ProjectionElementRealizationContext)` is typed at `frontend/src/domain/world/Element2D.ts:101-108`.
- `Element3D.realize3D(context: Element3DRealizationContext)` is typed at `frontend/src/domain/world/Element3D.ts:35-42`.

Implication: the domain already has a typed realization-context vocabulary. If Wave 017 cannot decompose the three adapter cleanly without changing this lower domain contract, implementation must stop and request a reviewed Wave 018/domain-realization plan edit rather than smuggling domain redesign into Wave 017.

### Test and pointer-boundary evidence

- `frontend/tests/unit/application/threePresentation/threePresentationConcernSelectors.spec.ts:19-113` covers concern selector DTO generation and the current adapter from injected world-like object to read port. It uses broad `as any` seams at `threePresentationConcernSelectors.spec.ts:20-23`, `35-38`, `48-55`, `64-71`, `81-82`, and `93-106` that should be replaced where touched with explicit read-port test builders or contract fixtures.
- `frontend/tests/unit/application/threePresentation/threePresentationSelector.spec.ts:23-32` verifies orchestration through `readPort` and selected IDs.
- `frontend/tests/unit/components/panels/threeViewShellBoundary.spec.ts:5-18` asserts `ThreeView.vue` delegates to `ThreeViewRuntime` through the three-presentation read port and avoids low-level Three.js/rendering/realization imports.
- `frontend/tests/unit/components/panels/threeViewShellBoundary.spec.ts:21-25` asserts the app shell 3D overlay uses `pointer-events: auto`.
- `frontend/tests/e2e/current-ui-contract.spec.ts:89-117` is the protected 3D overlay pointer-boundary regression: pointer events must resolve inside `[data-testid="three-view-overlay"]`, and dragging the overlay must not change the SVG `viewBox`.

## Selected bounded scope

Proceed with Wave 017 proposals, but bound implementation to **decomposing the current broad `ThreeWorldReadPort` and clarifying realization-context ownership at the 3D presentation adapter boundary**.

In scope for a future implementation after review:

- Split `ThreeWorldReadPort.ts` into behavior-named three-presentation read-port modules/slices for:
  - projection planes and grid source,
  - planar 2D-on-3D elements,
  - reconstructed 3D elements,
  - selected guides and guide-intersection source models,
  - hinges.
- Keep concrete `World` wrapping inside `RuntimeSession`/adapter factories; selectors/components/runtime continue to consume read ports/DTOs only.
- Delete the broad public `ThreeWorldReadPort` god-interface if the new aggregate input can be expressed as explicit concern ports, or reduce it to a composition type that contains only named slices.
- Move local classification/realization helpers into the smallest concern adapter modules that own them, with static guards preventing selector reintroduction of raw domain traversal.
- Introduce a tiny shared realization-context factory only if it is purely a typed `World`-to-`ProjectionElementRealizationContext & Element3DRealizationContext` adapter used by both canvas and three presentation. It must not expose collection/read-model convenience APIs beyond the existing domain context contract, and it must not become `RuntimeWorld`/`WorldReadModel`.
- Update focused tests to use explicit read-port slice fixtures and delete touched broad `as any` fixtures.

## Explicit out of scope

- No production implementation in this scout/proposal stage.
- No persistence schema/replay, project service, Drive/local persistence, command history, command producers, command serialization, `CommandStack`, backend, docs/specs, package/tooling, validation-platform, preview scripts, auth/provider/env/config files, or stale audit-history mining.
- No scene-host, OrbitControls, camera, renderer lifecycle, CSS overlay/pointer behavior, layout, or 3D UI feature change.
- No broad canvas presentation rewrite. Canvas may be touched only for a tiny shared realization-context helper or aligned tests/static guards if the reviewed proposal selects it.
- No broad domain realization API redesign in Wave 017. If needed, stop for Wave 018/plan-edit review.
- Do not touch or depend on unrelated dirty `Intersections.ts` / `ActionGroup.ts` work.

## DELETE candidates for implementation

- Delete the monolithic `ThreeWorldReadPort` interface as the public selector dependency, or reduce it to explicit named concern-port composition with no raw world-like catch-all methods.
- Delete all concern-selector type dependencies on the full `ThreeWorldReadPort` where a narrow named port is sufficient, especially `ProjectionPlane3DSelector.select(readPort: ThreeWorldReadPort, ...)`.
- Delete duplicated local `createThreeRealizationContext` if replaced by a tiny shared typed factory; otherwise keep realization-context creation private to the three adapter and document why it is intentionally separate.
- Delete touched broad `as any` three-presentation test seams that only exist because fixtures mock one large port or world-like object.
- Delete transitional wrappers, overloads, dead exports, and dual broad-port plus slice-port paths created during implementation.

## Protected surfaces / invariants

- Preserve Wave 025–028 invariants: no generic `RuntimeWorld`, `WorldReadModel`, app-kernel facade, raw Vue `World` injection, raw tool-world seam, process-tree canvas visibility regression, or compatibility wrappers.
- Preserve Wave 028 canvas public read-port deletion: do not reintroduce `CanvasWorldReadPort.getAllProjectionPlanes`, raw 3D getter trio, or public `realize*` methods.
- Preserve the Cycle 026/028 pointer-boundary contract: `.three-view-overlay` owns pointer events, `.three-canvas` remains interactive, and overlay drags do not move the SVG canvas.
- Preserve current 3D render DTO behavior for projection planes, grids, planar elements, reconstructed elements, guides/intersections, hinges, axes, and labels.

## Premises and invalidated assumptions

Valid premises:

- Post-Wave-028, 3D presentation/read-port cleanup is still the highest-centrality remaining presentation-boundary work.
- Current source already implements a read-port boundary between `ThreeView.vue`/runtime and `RuntimeSession`; the remaining issue is adapter breadth and realization ownership, not raw component `World` injection.
- The Wave 028 canvas DTO/read-port pattern is the comparison point: behavior-sized public methods with raw traversal localized inside named adapter modules.

Invalidated or stale assumptions:

- The wave-plan’s older baseline text that `ThreePresentationInput` embeds `world: World` is no longer true in current source; `ThreePresentationModel.ts:10` uses `readPort`.
- Older Cycle 017 implementation/validation artifacts exist in tree and cannot be treated as a completed current cycle for this post-Wave-028 stage; they are stale artifacts being superseded by this scope/proposal refresh.
- The correct Wave 017 target is not “introduce any read port” (already done); it is “decompose the broad three read port and decide whether any realization-context ownership belongs one layer lower.”

## Validation requirements for future implementation

All validation logs must be captured under `architecture-audit/cycle-017-three-presentation-read-port-realization-boundary/validation/`.

Minimum required evidence:

1. Path-scoped status/diff before and after implementation, explicitly excluding unrelated `Intersections.ts` / `ActionGroup.ts` work.
2. Static scans proving:
   - no production Vue component imports/receives concrete `World`;
   - no generic `RuntimeWorld`, `WorldReadModel`, app-kernel facade, or raw tool-world seam was added;
   - no canvas raw public getter/realization seam was reintroduced;
   - `ProjectionPlane3DSelector` and other concern selectors depend on named slice ports, not the full broad `ThreeWorldReadPort` god-interface;
   - touched tests no longer use broad `as any` seams where explicit read-port fixtures are practical.
3. Focused Vitest:
   - `frontend/tests/unit/application/threePresentation/threePresentationSelector.spec.ts`
   - `frontend/tests/unit/application/threePresentation/threePresentationConcernSelectors.spec.ts`
   - new/updated three read-port slice/adapter tests
   - `frontend/tests/unit/components/panels/threeViewShellBoundary.spec.ts`
   - `frontend/tests/unit/application/canvasPresentation/canvasWorldReadPort.spec.ts` and projected-3D tests only if canvas/shared context is touched.
4. Root and frontend `npm run lint` where defined.
5. Root and frontend full Vitest where defined.
6. Root and frontend `npm run build` where defined.
7. Root/frontend Playwright/e2e because the wave touches 3D presentation behavior, with explicit evidence that `current-ui-contract.spec.ts` pointer-boundary test passes.
8. Live preview refresh bound to `0.0.0.0:5173`, reachability probe returning HTTP 200, and a brief 3D live/browser smoke where tooling is available.

## Stop conditions

Stop and request a reviewed plan-edit or delta proposal if:

- Decomposing `ThreeWorldReadPort` requires changing domain realization semantics, projection-plane mutation ownership, command/undo, persistence, package/tooling, backend/docs/specs, or scene-host/OrbitControls behavior.
- A “shared realization context” starts accumulating raw world collection methods, app-shell state, style/visibility policy, command/persistence, selection, or rendering lifecycle concerns.
- The implementation would reintroduce public raw canvas seams deleted by Wave 028.
- The pointer-boundary e2e cannot be preserved without changing overlay/scene-host behavior.
- Unrelated dirty `Intersections.ts` / `ActionGroup.ts` changes become necessary to compile or test.
- Any protected secret/config/provider/env file would need to be read or touched.
