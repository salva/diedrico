# Cycle 029 Decision — 3D presentation DTO read ports and realization-context ownership

## Decision status

**Status:** approved for implementation.  
**Selected implementation path:** `proposal-direct.md` — bounded 3D presentation DTO read ports.  
**Rejected as default:** `proposal-restructure.md` — retained only as a stop-condition contingency.  
**Source implementation in this decision stage:** none.

Cycle 029 review convergence is complete after one review round. `architecture-audit/cycle-029-3d-presentation-dto-read-ports-and-realization-context-ownership/reviews/round-01-review.md` reports **NO BLOCKING ISSUES** and recommends proceeding to this decision stage with `proposal-direct.md` selected. The design Critic evidence is accepted under the project failure-tolerance protocol: `architecture-audit/cycle-029-3d-presentation-dto-read-ports-and-realization-context-ownership/critique/round-01-critique.md` is explicitly marked `synthesized_by: manager` with `reason: critic_dispatch_unavailable` after two failed Critic dispatch attempts, and it also approves the proposal set with no blocking issues.

## Evidence basis

This decision is based on:

- `scope-check.md`, which validates Wave 029 as the next central wave after Wave 028 and inventories the active 3D read-port seam.
- `proposals/proposal-direct.md`, which proposes deleting 3D read-model domain realization/style leakage through bounded DTO read ports.
- `proposals/proposal-restructure.md`, which defines stop conditions for a split or higher-level realization-context plan edit.
- `critique/round-01-critique.md`, synthesized under the approved Critic failure-tolerance rule and approving the design artifacts.
- `reviews/round-01-review.md`, which finds no blockers and selects the direct proposal.
- `architecture-audit/wave-plan.md` Wave 029, added after Wave 028 closure.
- `architecture-audit/cycle-028-canvas-projection-dto-selectors/implementation-log.md`, which names `ThreeWorldReadPort` as the remaining rendering/read-boundary residual while preserving Wave 028 canvas DTO boundaries.
- Path-scoped source-control evidence: no Cycle 029 implementation source changes are present in the reviewed 3D presentation target files; unrelated dirty files remain protected.

## Selected path

Implement `proposal-direct.md` exactly as the Cycle 029 implementation scope.

The implementation must keep the current `ThreePresentationController` / selector / `ThreeViewRuntime` architecture and change the 3D read-port boundary so selector-facing read models expose only DTO-native presentation source data: ids, discriminated kinds, primitive geometry, visibility/style DTOs, and behavior-sized source records. Domain realization objects, concrete domain classes, `VisualStyle`, and raw `World` traversal must not cross into selector-facing 3D read models.

`proposal-restructure.md` is rejected as the default because the reviewed evidence shows current consumers are narrow enough for a bounded 3D presentation cleanup. It remains the mandatory fallback only if implementation hits one of the stop conditions below. Selecting the fallback requires stopping implementation and opening a reviewed plan-edit or delta-proposal mini-cycle; do not silently broaden Cycle 029.

## Exact implementation scope

Implementation may change only the following surfaces, and only to execute the selected direct proposal:

- `frontend/src/application/threePresentation/ThreeWorldReadPort.ts`
- `frontend/src/application/threePresentation/ThreeProjectionPlaneReadPort.ts`
- `frontend/src/application/threePresentation/ThreePlanarElementReadPort.ts`
- `frontend/src/application/threePresentation/ThreeReconstructedElementReadPort.ts`
- `frontend/src/application/threePresentation/ThreeGuideReadPort.ts`
- `frontend/src/application/threePresentation/ThreeHingeReadPort.ts`
- `frontend/src/application/threePresentation/ThreeRealizationContext.ts`
- `frontend/src/application/threePresentation/ThreePresentationReadModel.ts` and adjacent focused 3D DTO/read-model modules if needed to define DTO-native source contracts.
- `frontend/src/application/threePresentation/ThreeStylePolicy.ts` to remove selector-facing `VisualStyle` dependence or convert domain style to DTO style internally.
- `frontend/src/application/threePresentation/*Selector.ts` only to consume the new DTO-native source contracts and remove domain realization/style assumptions.
- `frontend/src/application/threePresentation/ThreePresentationModel.ts` only if read-port input types must move or be renamed; final renderer DTO behavior should remain stable where possible.
- `frontend/src/application/presentation/WorldRealizationContext.ts` only for a tiny helper/factory extraction that directly supports the 3D adapter boundary without creating a generic read facade.
- `frontend/src/application/appShell/RuntimeSession.ts` and `frontend/src/application/appShell/RuntimeViewPorts.ts` only to preserve `ThreePresentationPort` wiring to the changed read-port factory.
- `frontend/src/rendering/threeView/**` only where final DTO names or renderer inputs must adapt to the narrowed contract.
- `frontend/src/components/panels/ThreeView.vue` only if `ThreePresentationInput` or read-port wiring types require a shell update; do not redesign the component.
- Focused tests under `frontend/tests/unit/application/threePresentation/`, `frontend/tests/unit/rendering/threeView/`, `frontend/tests/unit/components/panels/`, architecture-boundary tests, and e2e validation references needed for this wave.

No other production, test, package, validation-platform, backend, docs, specs, persistence, command, Drive/auth, preview-script, or UI-feature surfaces are in scope.

## Required ownership rules

### 3D read-port / DTO ownership

- `ThreeWorldReadPort.ts` or one focused new 3D presentation adapter module must be the private owner of concrete `World` traversal for 3D presentation.
- Individual selector-facing read ports must return DTO-native source models, not domain realization classes or domain style types.
- Selectors may own display-option filtering, grouping, static/reference axes, ids/kinds, and final `ThreePresentationModel` assembly.
- Selectors must not import domain realization types, concrete domain classes for classification, or `VisualStyle` as part of their read-model contracts.
- Public 3D read models must not expose fields named or shaped as `realization`, `planeRealization`, domain `visualStyle`, or equivalent domain-object carriers.
- Infeasible geometry should be filtered inside the adapter boundary or represented as explicit DTO visibility state; selectors must not call domain feasibility APIs.

### Realization-context ownership

- Realization context assembly belongs inside the 3D presentation adapter/factory boundary for this wave.
- `createThreeRealizationContext` may be renamed, narrowed, or centralized only to remove duplicate 3D adapter context construction.
- `WorldRealizationContext.ts` may only receive a tiny typed helper/factory split if it is necessary to share existing lookup behavior cleanly; it must not become a broad `WorldReadModel`, `RuntimeWorld`, scene kernel, app kernel, or mutable world facade.
- Domain realization semantics are protected. Do not change `Element2D.realize2D`, `Element3D.realize3D`, projection-plane realization semantics, `ProjectionPlaneContext.ts`, persistence replay, or command construction under this decision.

### Adapter-private conversions versus forbidden leaks

Static guards and implementation review must distinguish allowed private adapter conversion from forbidden selector/read-model exports:

- Domain realization APIs, domain `instanceof` checks, and domain `VisualStyle` inspection may exist only inside private adapter/conversion code that turns domain state into DTOs.
- `AuxiliaryProjectionPlane instanceof` and `Segment2DByPoints instanceof` checks, if still required, must remain adapter-private and must not survive in selector-facing DTO contracts.
- Selector/read-model modules must not expose or require domain realization classes or domain style objects.

## DELETE list

The implementation must aggressively delete the old public leakage rather than preserve compatibility wrappers:

- Delete `ThreeEntityPresentationData` if it remains a `VisualStyle` carrier.
- Delete domain realization imports from selector-facing 3D read model type definitions, including projection-plane, plane, 2D point/line/circle, 3D point/line/segment/plane, guide, and hinge realization classes.
- Delete public read-model fields named `realization`, `planeRealization`, and domain `visualStyle` in `application/threePresentation` read ports.
- Delete or replace stale tests/mocks that assert raw domain realization/style read models.
- Delete repeated raw world traversal from individual sub-port modules where it is replaced by the single private adapter/context owner.
- Delete selector-facing `instanceof` classification.
- Delete `getProjectionPlaneGridSource()` only if an equivalent DTO-focused seam preserves projection-plane grid behavior without forcing a broader renderer rewrite. If deleting that method would broaden the wave, keep a bounded DTO method instead.

Do not create dual raw-and-DTO public paths, compatibility wrappers, generic world facades, scene kernels, or app-kernel abstractions.

## Wave 028 and overlay behavior preservation

The implementation must preserve Wave 028 canvas DTO boundaries:

- Do not reintroduce public raw canvas getters, generic runtime/world facades, process-tree-shaped canvas seams, or `WorldReadModel` / `RuntimeWorld` abstractions.
- Do not churn `CanvasWorldReadPort`, `Projected3DCanvasReadPort`, `CanvasPresentationSelector`, or canvas tests except for a tiny shared helper consumption explicitly justified by the implementation and still preserving public canvas DTO contracts.

The implementation must preserve 3D overlay pointer behavior:

- `ThreeView.vue` remains a shell over `ThreePresentationPort` / `ThreeViewRuntime` unless a small type-wiring update is required.
- The 3D overlay must continue to own pointer interaction and must not pass drag gestures through to the 2D canvas.
- `frontend/tests/e2e/current-ui-contract.spec.ts` overlay pointer-boundary coverage is mandatory validation.

Expected user-visible behavior change is **none**. Projection planes, grids/reference axes, auxiliary axes, planar 2D-on-3D elements, reconstructed 3D elements, selected guide perpendicular planes/intersections, hinges, visibility, and color must remain equivalent for current observable cases.

## Protected out-of-scope surfaces

The Cycle 029 implementation is forbidden from broadening into:

- command producers/history, `CommandStack`, command descriptors/serialization, undo/redo, operation descriptors, or `OperationRegistry`;
- persistence schema/replay, `ProjectService`, project snapshot/restore, migrations, or Drive/local persistence contracts;
- Drive/auth/provider/config/secret internals or any secret/config reads;
- backend, docs, specs, package/tooling, dependency upgrades, validation-platform work, or preview-script ergonomics;
- UI feature work, CSS-only overlay redesign, toolbar/actions-panel command leaks, or app-shell production composition redesign;
- broad domain realization redesign, `ProjectionPlaneContext.ts` semantic changes, or domain geometry policy changes;
- DTO-native canvas style cleanup beyond the selected 3D scope;
- stale audit-history mining or recreation of absent `frontend/src/services/Element2DRenderer3D.ts`.

## Source-control hygiene

The current workspace has broad dirty context, and broad `git status` has previously overflowed. Implementation must use path-scoped status/diff before editing and before commit.

Known unrelated dirty source files are protected:

- `frontend/src/domain/calculations/Intersections.ts`
- `frontend/src/domain/processTree/ActionGroup.ts`

Do not read for implementation logic, revert, normalize, stage, commit, or depend on those changes unless a reviewed delta explicitly authorizes them. The same rule applies to any other unrelated dirty file discovered by path-scoped checks. Only files required by the selected Cycle 029 implementation may be changed or committed.

## Validation requirements for the implementation stage

Capture full stdout/stderr logs under:

`architecture-audit/cycle-029-3d-presentation-dto-read-ports-and-realization-context-ownership/validation/`

Minimum required validation:

1. Static scans proving selector-facing 3D read models no longer export domain realization types or `VisualStyle`, while allowing adapter-private conversions.
2. Static scans proving raw 3D `World` traversal is localized to the selected 3D adapter/factory boundary and no forbidden broad facade names are introduced (`RuntimeWorld`, `WorldReadModel`, `SceneKernel`, broad `ThreeWorld` facade, app-kernel facade).
3. Focused Vitest for 3D presentation selectors/read-port DTO contracts.
4. Focused `ThreeViewRuntime` / scene adapter tests if final DTO contracts change at the renderer boundary.
5. Architecture-boundary tests guarding no generic runtime/world facade and no Wave 028 canvas raw-seam regression.
6. Root and frontend lint where scripts are defined.
7. Focused and full Vitest from the appropriate root/workspace locations.
8. Root and frontend build where scripts are defined.
9. Root and frontend Playwright/e2e for the frontend-visible rendering change, including `current-ui-contract.spec.ts` overlay pointer-boundary behavior.
10. Live preview refresh on `0.0.0.0:5173`, HTTP reachability probe for `http://127.0.0.1:5173/`, and browser/MCP or CLI Playwright evidence if MCP is unavailable.

The implementation wave is rejected if any required validation fails for reasons attributable to the change or if e2e/preview is skipped without explicit justified logging.

## Stop conditions

Stop implementation and request a reviewed plan edit or delta proposal if any of the following becomes necessary:

1. Changing domain realization semantics (`Element2D.realize2D`, `Element3D.realize3D`, projection-plane realization classes, `Plane3DRealization3D`, or `ProjectionPlaneContext.ts`).
2. Changing persistence/replay, command history, command descriptors, operation registry, or project schema behavior.
3. Rewriting the 3D scene host, object lifecycle, overlay ownership, or renderer architecture beyond DTO input adaptation.
4. Redesigning app-shell composition or exposing a generic world/read-model facade from `RuntimeSession`.
5. Churning Wave 028 canvas public contracts or reopening raw canvas selector seams.
6. Discovering that guide/hinge realization context requires domain-level ownership outside 3D presentation rather than adapter-private conversion.
7. Needing to touch protected unrelated dirty files or secret/config paths.

At a stop condition, do not continue with partial implementation, compatibility wrappers, or hidden broadening.

## Residual risks accepted for implementation

- Static scans may produce false positives unless they distinguish adapter-private conversion from selector/read-model exports; implementation must write the guard carefully.
- Grid generation may require keeping an equivalent DTO-focused method instead of deleting `getProjectionPlaneGridSource()` outright.
- Guide intersection and hinge geometry may still require adapter-private domain realization calls; that is acceptable only if the selector-facing DTO contract remains clean.
- The direct proposal touches many 3D presentation modules, so implementation must avoid turning the adapter into a generic scene/world facade.

## Next stage recommendation

Proceed to the canonical implementation stage:

`cycle-029-implement-3d-presentation-dto-read-ports-and-realization-context-ownership`

The implementation stage must implement `proposal-direct.md` within the exact scope and protections above. If a stop condition is encountered, it must stop and open the appropriate reviewed correction/plan-edit path rather than implementing `proposal-restructure.md` implicitly.
