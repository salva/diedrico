# Cycle 028 Decision — Canvas projection DTO selectors and realization-read context ownership

## Decision status

**Decision:** proceed to `cycle-028-implement-canvas-projection-dto-selectors` with **Proposal Direct — Behavior-sized canvas projection DTO selectors** as the selected implementation path.

**Review convergence:** complete for Cycle 028 proposal selection. `architecture-audit/cycle-028-canvas-projection-dto-selectors/reviews/round-01-review.md` returned **Blocking issues: None** and explicitly recommended Proposal Direct as the preferred implementation choice. No corrections round is required before implementation.

**Critic context:** the proposal critique at `architecture-audit/cycle-028-canvas-projection-dto-selectors/critique/round-01-critique.md` was synthesized by the Manager after two consecutive critic dispatch failures (`reason: critic_dispatch_unavailable`). The synthesized critique found **NO BLOCKING ISSUES** and deemed the scope check plus both proposals complete enough for review. This is accepted as harness/provider context only; it is not a content blocker.

**Implementation authorization:** authorized only for the exact scope below. Any broader change requires a reviewed delta proposal or plan-edit mini-cycle before source implementation continues.

## Artifacts considered

This decision is based on:

- `architecture-audit/wave-plan.md`, Wave 028 entry.
- `architecture-audit/cycle-028-canvas-projection-dto-selectors/scope-check.md`.
- `architecture-audit/cycle-028-canvas-projection-dto-selectors/proposals/proposal-direct.md`.
- `architecture-audit/cycle-028-canvas-projection-dto-selectors/proposals/proposal-restructure.md`.
- `architecture-audit/cycle-028-canvas-projection-dto-selectors/critique/round-01-critique.md`.
- `architecture-audit/cycle-028-canvas-projection-dto-selectors/reviews/round-01-review.md`.
- `architecture-audit/cycle-027-runtime-read-model-extractors/implementation-log.md`.
- Current source seams in `CanvasWorldReadPort.ts`, `CanvasPresentationSelector.ts`, `Projected3DCanvasSelector.ts`, and `ThreeWorldReadPort.ts`.

## Selected proposal

Select `proposals/proposal-direct.md`.

Rationale:

1. It directly targets the residual Wave 027 canvas seams: public raw projection-plane access, the raw 3D getter trio, selector-owned `plane.getAll*()` traversal, projected-3D nested traversal, and public canvas realization methods.
2. It advances the Wave 028 target outcome without creating a generic `RuntimeWorld`, `WorldReadModel`, app-kernel facade, or all-purpose presentation snapshot.
3. It preserves Wave 025–027 invariants: `CanvasWorldReadPort.getProcessTree()` remains deleted, canvas visibility remains behavior-sized, `RuntimeSession` remains the private concrete `World` owner, and production Vue components do not receive concrete `World`.
4. It respects aggressive deletion: replaced raw getters, raw loops, public realization seams, stale mocks, and transitional dual raw-and-DTO paths must be removed, not wrapped.

## Rejected alternative

Reject `proposals/proposal-restructure.md` for this implementation stage as the primary path.

Reason: current evidence does not prove that a higher-level realization-read context factory must be introduced before deleting the canvas raw traversal seams. `ThreeWorldReadPort` is a real residual, but its public surface is already behavior-named; the sharper active leak is the canvas public raw traversal contract. The restructure path remains a fallback only if implementation proves a tiny typed shared realization-context factory is necessary to avoid duplicated context assembly while still completing the mandatory canvas deletions.

If used as a fallback, the shared context helper must be limited to typed realization contexts and must not expose raw world collection methods, commands, persistence, Vue/store concerns, backend access, or a generic read facade.

## Bound implementation scope

In scope:

- `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts` — replace public raw collection and public realization selector methods with behavior-sized canvas read capabilities; keep visibility narrow.
- `frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts` — remove raw projection-plane/per-plane traversal ownership where DTO selectors replace it; retain explicit composition, style/render/query mapping, sorting, grid, and active-transform responsibilities only as appropriate.
- `frontend/src/application/canvasPresentation/Projected3DCanvasSelector.ts` — replace or delete raw plane × raw 3D traversal as one unit through behavior-sized projected-3D canvas DTO/read methods.
- `frontend/src/application/canvasPresentation/CanvasPresentationModel.ts` — add precise DTO types only where needed for plane-owned 2D canvas items or projected-3D canvas items.
- `frontend/src/application/canvasPresentation/CanvasVisibilityPolicy.ts` — only if visibility typing must be narrowed without reintroducing process-tree/world access.
- New focused canvas-presentation modules such as `CanvasPlaneItemsSelector`, `Projected3DCanvasItemsSelector`, or `CanvasProjectionReadPort` if they are behavior-named and not world-shaped facades.
- `frontend/src/application/appShell/RuntimeSession.ts` — wire the changed canvas presentation/read-port contract and optionally reuse the same plane-transform capability for `getPlaneTransformsForInput()`.
- `frontend/src/application/appShell/RuntimeViewPorts.ts` — only for mechanical type tightening required by transform/input consumers.
- `frontend/src/application/threePresentation/ThreeWorldReadPort.ts` — inventory only, or adopt a tiny shared realization-context helper only if it directly removes duplicate context assembly without changing public 3D read-port methods.
- Focused tests for changed canvas DTO/read-port selectors, projected-3D item generation, runtime wiring, visibility, transform/input seams, static architecture boundaries, and overlay pointer preservation.

Out of scope and protected:

- Persistence schema/replay, `ProjectService`, local/Drive persistence, command history, command producers, command serialization, `CommandStack`, backend, docs/specs, package/tooling, validation-platform code, preview scripts, Drive/auth/browser adapters, provider/config/env files, toolbar/history typing cleanup, broad app-kernel work, broad domain realization semantic redesign, broad 3D scene/read-port redesign, UI feature changes, and command-backed visibility.
- Properties/process/elements panel read-model redesign remains outside Cycle 028 unless a purely mechanical type compile adjustment is unavoidable.
- `screenTo3D`, free-point move sessions, tool command producers, active-plane behavior, grid behavior, and viewport math must not be redesigned.

## Required delete list

The implementation must delete these surfaces when replaced by behavior-sized DTO/read selectors:

- `CanvasWorldReadPort.getAllProjectionPlanes()` as a public canvas selector dependency.
- `CanvasWorldReadPort.getAll3DPoints()`, `getAll3DLines()`, and `getAll3DSegments()` together from the active canvas selector contract. Partial deletion of this trio is forbidden.
- Public `CanvasWorldReadPort.realizePoint2D`, `realizeLine2D`, `realizeCircle2D`, `realizePoint3D`, `realizeLine3D`, and `realizeSegment3D` methods.
- `CanvasPresentationSelector` raw `plane.getAllPoints()`, `plane.getAllLines()`, and `plane.getAllCircles()` loops where DTO item selectors replace them.
- `Projected3DCanvasSelector` raw nested loops over all projection planes and all 3D points/lines/segments where projected-3D DTO/read methods replace them.
- Selector-level domain `instanceof` classification outside the focused adapter/DTO selector boundary where DTO kinds can carry explicit canvas element kinds.
- Test mocks and fixtures that encode raw getter contracts, especially projected-3D selector mocks expecting raw plane and raw 3D getters.
- Any transitional compatibility wrappers or dual raw-and-DTO selector paths introduced during implementation.

Must remain deleted or forbidden:

- `CanvasWorldReadPort.getProcessTree()`.
- `Pick<World, 'getProcessTree'>` or process-tree-shaped canvas visibility.
- Casts back to concrete `World` for canvas visibility.
- Generic `RuntimeWorld`, `WorldReadModel`, `CanvasWorld`, broad presentation snapshot, or app-kernel facades.
- Concrete `World` injection or raw `World` props in production Vue components.

## DTO/read-port ownership rules

- New public canvas read methods must be named by canvas behavior, not by raw world collections.
- Plane-owned 2D canvas item DTOs should carry explicit element kind, element id, plane id, realized geometry in plane coordinates, and enough source/style identity for downstream render/query mapping without exposing mutable domain objects.
- Projected-3D canvas item DTOs or read methods must own the all-plane/all-3D traversal and feasibility filtering behind a behavior-sized boundary. The raw 3D getter trio must be deleted together if this replacement lands.
- Plane transform DTO ownership must remain explicit for both rendering and input. `CanvasPresentationModel.planeTransforms` may remain because interaction code consumes it.
- `RuntimeSession.getPlaneTransformsForInput()` may be routed through the same transform read capability to remove duplicate raw plane traversal, but this must not alter input, hit, move, active-plane, grid, or screen-to-3D behavior.
- `CanvasPresentationSelector` should not be allowed to regain raw domain traversal under new names. Its residual ownership must be narrow: composition, styling/render/query mapping, ordering, grid, and active-transform selection.

## Realization-read context ownership rules

- Canvas realization context assembly must be localized inside the adapter/selector boundary and not exposed as public `realize*` calls to presentation selectors.
- A tiny shared helper such as `createWorldRealizationReadContext(world)` is allowed only if implementation proves it avoids duplicated canvas/three context assembly and exports typed realization context factories only.
- The helper, if introduced, must not become a generic world/read-model facade and must not import or expose commands, persistence, Vue components, stores, backend, Drive/auth, package/tooling, or mutation APIs.
- `ThreeWorldReadPort` public methods must not change in Cycle 028 unless a reviewed delta proposal is written. Three may only consume the tiny shared context helper if the helper is already justified by canvas implementation needs.

## Caller seam treatment

- `CanvasWorldReadPort.getAllProjectionPlanes()` should be deleted from active canvas selector dependencies if plane transforms and plane-owned item DTOs replace all named callers. If it cannot be deleted, the implementation must stop or record a reviewed residual with an exact caller map.
- `CanvasPresentationSelector` must stop calling `plane.getAllPoints()`, `plane.getAllLines()`, and `plane.getAllCircles()` directly if the selected DTO selector can own those loops.
- `Projected3DCanvasSelector` must stop combining raw plane traversal, raw 3D collection traversal, realization, projection, and primitive emission unless reviewed evidence proves this combined owner is still the least-bad bounded seam.
- `ThreeWorldReadPort` remains a residual boundary, not the target architecture for this cycle. Broad 3D scene extraction is deferred.

## Wave 025–027 invariant preservation

Implementation must preserve:

- Wave 027 deletion of the canvas process-tree visibility leak.
- Narrow `CanvasVisibilityPolicy`/visibility-port behavior with no command-backed visibility redesign.
- `RuntimeSession` as private owner/composer of concrete `World` and `CommandStack`.
- Focused runtime read-model ownership from Wave 027; do not move properties/process/elements DTO helpers back into `RuntimeSession`.
- No generic world facade, no production Vue concrete `World` access, no raw tool-world seam, and no package/tooling/backend/docs/persistence churn.
- Cycle 026/027 3D overlay pointer-boundary behavior: the 3D overlay must retain pointer ownership and must not pass drag gestures through to the 2D canvas.

## Source-control hygiene

The worktree is broadly dirty and broad `git_status` may overflow. Implementation must use path-scoped status/diff checks for Cycle 028 targets before editing and before commit.

Known unrelated dirty source files from Cycle 028 scout/review are protected:

- `frontend/src/domain/calculations/Intersections.ts`
- `frontend/src/domain/processTree/ActionGroup.ts`

Do not revert, stage, incorporate, depend on, or “clean up” those unrelated modifications unless a reviewed delta proposal proves they are directly required by the Cycle 028 implementation scope. They are not part of this decision.

Secret/config/provider/env/Drive/auth files remain protected and must not be read, logged, pasted, or copied.

## Validation requirements for implementation

Capture full stdout/stderr under `architecture-audit/cycle-028-canvas-projection-dto-selectors/validation/`.

Minimum required evidence:

1. Pre/post path-scoped status/diff and static scans for raw canvas getters, public realization methods, `CanvasPresentationSelector` raw `plane.getAll*()` loops, `Projected3DCanvasSelector` raw loops, `getProcessTree` regressions, process-tree-shaped visibility, generic facade names, Vue concrete `World`, runtime transform/input wiring, `ThreeWorldReadPort` context duplication, and overlay pointer rules.
2. Focused Vitest for new/changed canvas DTO selector/read-port modules, `CanvasPresentationSelector`, `Projected3DCanvasSelector`, `CanvasWorldReadPort`, `CanvasVisibilityPolicy` if touched, and `RuntimeSession` canvas wiring.
3. Focused transform/input/hit/query/active-plane/grid/screen-to-3D tests if transform ownership or dependencies change.
4. Architecture/static scans proving deleted raw seams are absent, retained residuals have caller maps, no dual raw-and-DTO path remains, and forbidden facades were not added.
5. Root and frontend lint where scripts are defined.
6. Root and frontend full Vitest where scripts are defined.
7. Root and frontend build where scripts are defined.
8. Root/frontend Playwright or e2e where scripts are defined because this wave touches user-observable canvas/presentation behavior.
9. Preservation of `current-ui-contract.spec.ts`, especially the 3D overlay pointer-boundary regression.
10. Live preview refresh bound to `0.0.0.0:5173`, HTTP 200 reachability probe, and focused live/browser smoke for representative canvas render/hit/hover, projected-3D display, active-plane/grid, screen-to-3D coordinate behavior where available, 3D view interaction, visibility display, and undo/redo regression.

Undefined commands may be skipped only with exact package-script evidence and explicit justification in `implementation-log.md`.

## Stop conditions

Stop and request a reviewed delta proposal or plan edit if:

- raw canvas getter deletion requires domain realization semantic changes, projection-plane mutation ownership redesign, command/persistence changes, broad 3D scene/read-port extraction, package/tooling edits, backend/docs/spec changes, Drive/auth work, or UI feature redesign;
- the raw 3D getter trio cannot be deleted or retained as an all-or-nothing group;
- a proposed DTO method mirrors `World` collections under a new name rather than behavior-sized canvas DTOs;
- implementation needs to alter `screenTo3D`, tool command producers, command history, persistence, preview tooling, or validation infrastructure;
- unrelated dirty files become necessary to make tests pass;
- a shared realization context helper starts accumulating raw collection/read-model convenience APIs;
- source changes would touch protected secret/config/provider/env files.

## Residual risks accepted for implementation

- Proposal Direct leaves exact DTO type names to implementation; this is acceptable if names remain behavior-sized and static scans prove no world-shaped facade is introduced.
- Render/query drift is possible when moving traversal and realization ownership; focused tests must compare representative primitive IDs, source entity IDs, kinds, geometry, ordering, and query items.
- Transform/input drift is possible because plane transforms serve both rendering and interaction; implementation must test input transforms if that seam changes.
- `ThreeWorldReadPort` remains broader than ideal. It is accepted as a residual unless a tiny shared context helper can reduce duplicate context assembly without broadening scope.
- The separate Manager-synthesized critique is accepted as failure-tolerance context, not a proposal-content weakness.

## Next canonical stage

Because review convergence has no blockers, the next canonical stage should be:

`cycle-028-implement-canvas-projection-dto-selectors`

That stage must implement Proposal Direct within the scope and stop conditions in this decision, then proceed to the mandatory validation/preview-refresh stage.
