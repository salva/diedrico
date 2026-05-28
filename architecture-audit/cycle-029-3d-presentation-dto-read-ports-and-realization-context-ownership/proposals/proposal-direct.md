# Proposal Direct — Bounded 3D presentation DTO read ports

## Recommendation

Implement Wave 029 as a bounded cleanup of the active 3D presentation read boundary. Keep the current `ThreePresentationController`/selector/scene-adapter architecture, but change the read ports so they expose renderer-oriented DTO source data instead of domain realization objects, `VisualStyle`, or repeated raw traversal through each sub-port.

This proposal is the preferred path if review agrees the current consumers are sufficiently narrow: the read-port methods are used only by `application/threePresentation` selectors/tests and are wired through `RuntimeSession` into `ThreeViewRuntime`.

## Architectural target

After implementation:

- `RuntimeSession` remains the private concrete `World` owner and still exposes a `ThreePresentationPort` for the 3D panel.
- A single 3D presentation adapter/factory owns raw `World` traversal and realization-context assembly.
- 3D read ports are behavior-sized and return DTO source models made of primitive geometry, ids, presentation kind, visibility, and `ThreeStyleDto`/small style source data.
- Selectors assemble final `ThreePresentationModel` DTOs without importing domain realization types, `VisualStyle`, concrete domain classes, or calling domain realization methods.
- `ThreeViewRuntime` and scene adapters continue to consume the existing `ThreePresentationModel` DTO groups.

## Files to change

### Primary 3D presentation files

- `frontend/src/application/threePresentation/ThreeWorldReadPort.ts`
  - Keep `ThreePresentationReadPorts`, but re-export only DTO-native read-port types.
  - Replace five independent `create*ReadPort(world)` calls with a shared adapter/context object that is private to the factory.
- `frontend/src/application/threePresentation/ThreePresentationReadModel.ts`
  - Delete or replace the `VisualStyle`-based `ThreeEntityPresentationData` shape.
  - Introduce DTO-native source types only if not better colocated in concern-specific modules.
- `frontend/src/application/threePresentation/ThreeProjectionPlaneReadPort.ts`
  - Replace `ProjectionPlaneRealization3D` / `Plane3DRealization3D` return fields with projection-plane source DTOs containing plane id, kind, surface basis/geometry, auxiliary axes source, and optional precomputed grid segments.
  - Delete `getProjectionPlaneGridSource()` if grid geometry can be emitted with the projection-plane model.
- `frontend/src/application/threePresentation/ThreePlanarElementReadPort.ts`
  - Replace plane/element realization read models with planar source DTOs carrying final lifted 3D geometry or enough primitive geometry to build final DTOs without domain realization APIs.
  - Replace `isSegment` plus `realization.isBounded()` with explicit `kind: 'planar-line' | 'planar-segment'` source kinds.
- `frontend/src/application/threePresentation/ThreeReconstructedElementReadPort.ts`
  - Replace realization-object models with reconstructed point/line/segment/plane geometry source DTOs.
- `frontend/src/application/threePresentation/ThreeGuideReadPort.ts`
  - Replace guide and intersection read models with DTO-native selected guide geometry and reconstructed intersection geometry sources.
- `frontend/src/application/threePresentation/ThreeHingeReadPort.ts`
  - Replace `Line3DRealization3D` read model with hinge start/end geometry DTO source.
- `frontend/src/application/threePresentation/ThreeRealizationContext.ts`
  - Consolidate context assembly so the factory builds one typed realization context/collection bundle used internally by adapters.
  - Do not change domain `ProjectionPlaneContext` semantics unless a tiny helper extraction is needed.
- `frontend/src/application/threePresentation/ThreeStylePolicy.ts`
  - Replace `ThreeStyleSource { visualStyle?: VisualStyle }` with DTO-native style/visibility helpers, or move all domain style mapping into adapters and let selectors receive `ThreeStyleDto` directly.

### Selectors and runtime consumers

- `frontend/src/application/threePresentation/ProjectionPlane3DSelector.ts`
- `frontend/src/application/threePresentation/PlanarElement3DSelector.ts`
- `frontend/src/application/threePresentation/ReconstructedElement3DSelector.ts`
- `frontend/src/application/threePresentation/Guide3DSelector.ts`
- `frontend/src/application/threePresentation/Hinge3DSelector.ts`
  - Update selector inputs to new DTO source models.
  - Remove checks against domain realization APIs (`.feasible`, `.isFeasible()`, `.getDirection()`, `.getRadius()`, `.getCartesian()`) unless those are on DTO-owned helper values rather than domain classes.
  - Prefer filtering infeasible items in adapters so selectors only handle renderable source DTOs.
- `frontend/src/application/threePresentation/ThreePresentationModel.ts`
  - Keep the final DTO model stable where possible; update `ThreePresentationInput` only if read-port types move.
- `frontend/src/application/appShell/RuntimeSession.ts`
- `frontend/src/application/appShell/RuntimeViewPorts.ts`
  - Preserve the `ThreePresentationPort` shape if possible; update imports/types if read-port module names change.
- `frontend/src/rendering/threeView/*`
  - No expected behavior changes. Update only if final DTO types are renamed/refined.
- `frontend/src/components/panels/ThreeView.vue`
  - No expected behavior change. Update only if `ThreePresentationInput` changes.

### Tests

- `frontend/tests/unit/application/threePresentation/threePresentationConcernSelectors.spec.ts`
  - Replace mocks that inject realization objects or `visualStyle` with DTO-native read-port sources.
  - Add assertions that no selector DTO contains domain realization objects.
- `frontend/tests/unit/application/threePresentation/threePresentationSelector.spec.ts`
  - Update read-port mocks to the new behavior methods.
- `frontend/tests/unit/application/appShell/Cycle027Architecture.test.ts` or a new architecture test file
  - Add guards for Wave 029 boundary: no `VisualStyle` imports in `ThreePresentationReadModel.ts` / read-port models, no domain realization type imports in 3D selector modules, no broad `RuntimeWorld`/`WorldReadModel`/`SceneKernel` façade.
- `frontend/tests/unit/rendering/threeView/threeViewRuntime.spec.ts`
  - Update only if DTO type names change.
- `frontend/tests/unit/components/panels/threeViewShellBoundary.spec.ts`
  - Preserve shell-boundary assertions; update only for type/name changes.
- `frontend/tests/e2e/current-ui-contract.spec.ts`
  - Preserve; no rewrite expected. It must still run as validation, especially overlay pointer behavior.

## Proposed DTO/read-port shape

Names are illustrative and should be refined during implementation, but the contract should follow this shape:

```ts
export interface ThreeStyleStateDto {
  readonly visible: boolean;
  readonly color?: number | string;
}

export interface ThreeProjectionPlaneSourceDto {
  readonly id: string;
  readonly kind: 'fixed' | 'auxiliary';
  readonly surface: { center: Vec3; normal: Vec3; size: number };
  readonly basis?: { origin: Vec3; uAxis: Vec3; vAxis: Vec3 };
  readonly gridSegments: SegmentGeometryDto[];
}

export interface ThreePlanarElementSourceDto {
  readonly id: string;
  readonly planeId: string;
  readonly kind: 'planar-point' | 'planar-line' | 'planar-segment' | 'planar-circle';
  readonly style: ThreeStyleDto;
  readonly position?: Vec3;
  readonly start?: Vec3;
  readonly end?: Vec3;
  readonly points?: Vec3[];
}

export interface ThreeReconstructedElementSourceDto {
  readonly id: string;
  readonly kind: 'reconstructed-point' | 'reconstructed-line' | 'reconstructed-segment' | 'reconstructed-plane';
  readonly style: ThreeStyleDto;
  readonly position?: Vec3;
  readonly start?: Vec3;
  readonly end?: Vec3;
  readonly geometry?: PlaneGeometryDto;
}
```

The selected implementation may instead make read ports return final `ProjectionPlanePresentationDto[]`, `PlanarElementPresentationDto[]`, etc. That is acceptable if the selectors remain meaningful as orchestration/option filters. Do not keep both raw source models and final DTO models as parallel public paths.

## Implementation sequence

1. **Introduce DTO-native source types.** Add concern-specific source DTOs in the relevant read-port modules or a focused `ThreePresentationReadModel.ts` replacement. Include ids, kind, visible/style, and primitive geometry only.
2. **Centralize adapter internals.** In `createThreePresentationReadPorts(world)`, build one private context object containing:
   - `world`
   - `realizationContext = createThreeRealizationContext(...)` or a renamed internal factory
   - domain-to-DTO conversion helpers for `Vec3`, `SegmentGeometryDto`, style visibility/color, and feasibility filtering.
3. **Migrate projection-plane port.** Convert plane realization to surface/grid/axis source DTOs inside the adapter. Delete `getProjectionPlaneGridSource()` if grid segments are available directly.
4. **Migrate planar port.** Convert plane-owned point/line/circle realizations into lifted 3D geometry/source DTOs inside the adapter. Filter infeasible elements before returning.
5. **Migrate reconstructed port.** Convert 3D point/line/segment/plane realizations into geometry DTOs inside the adapter.
6. **Migrate guide and hinge ports.** Convert selected guide perpendicular-plane source and intersection geometry to DTO-native sources; convert hinge realization to start/end line DTO source.
7. **Update selectors.** Remove domain realization/style assumptions from selectors. Selectors should handle display options, grouping, final ids/kinds, static axes, and minor presentation math only.
8. **Delete stale exports/tests.** Remove `VisualStyle`-based `ThreeEntityPresentationData`, realization-object read-model fields, stale read-port methods, and mocks that preserve old leaks.
9. **Add static guards.** Add architecture tests/scans for the new boundary.

## Explicit DELETE list

- Delete `ThreeEntityPresentationData` if it remains a `VisualStyle` carrier.
- Delete domain realization imports from 3D read model type definitions:
  - `ProjectionPlaneRealization3D`
  - `Plane3DRealization3D`
  - `Point2DRealization2D`
  - `Line2DRealization2D`
  - `Circle2DRealization2D`
  - `Point3DRealization3D`
  - `Line3DRealization3D`
  - `Segment3DRealization3D`
  - `Line3DRealization3D` for hinges
- Delete public read-model fields named `realization`, `planeRealization`, and domain `visualStyle` in `application/threePresentation` read ports.
- Delete `getProjectionPlaneGridSource()` if grid source is folded into projection-plane DTOs.
- Delete repeated raw traversal from individual sub-port modules where replaced by a single private adapter/context owned by `ThreeWorldReadPort.ts` or a focused new `ThreeWorldPresentationAdapter.ts`.
- Delete `instanceof` classification from selector-facing read models. If `AuxiliaryProjectionPlane` / `Segment2DByPoints` checks remain, they must be internal adapter implementation only.
- Delete stale tests/mocks that assert realization/style leakage.
- Do not create compatibility wrappers, dual raw-and-DTO public read ports, generic `RuntimeWorld`, `WorldReadModel`, `ThreeWorld`, `SceneKernel`, or app-kernel façade.

## Expected behavior changes

None intended. The 3D view should render the same projection planes, grids, reference/auxiliary axes, planar 2D elements on planes, reconstructed 3D elements, selected guide perpendicular planes/intersections, and hinge lines. Visibility and color should remain equivalent for current observable cases. Overlay pointer ownership must remain unchanged.

## Risks and mitigations

- **Risk: moving geometry conversion into adapters makes selectors too thin.** Mitigation: selectors can still own display-option filtering, static/reference axes, final DTO ids/kinds, and final grouping. The architecture gain is worth a thinner selector if it deletes domain leakage.
- **Risk: grid generation depends on projection realization APIs.** Mitigation: keep grid generation in the projection-plane adapter or a private helper; do not expose realization objects to selectors.
- **Risk: style mapping loses selected/hovered semantics.** Current 3D selectors only use `visualStyle` visibility/color, while selection is used for selected guides. Preserve that exact behavior; do not invent new selected/hovered styling.
- **Risk: guide intersection math still needs line/plane geometry.** Mitigation: expose primitive `Vec3`/segment/line geometry source DTOs and keep the intersection math in `Guide3DSelector`, or precompute markers in the adapter. Do not expose domain realization classes.
- **Risk: broad realization redesign temptation.** Mitigation: domain realization classes and `ProjectionPlaneContext.ts` remain unchanged unless only a tiny helper/factory extraction is required.

## Validation plan

Capture all logs under `architecture-audit/cycle-029-3d-presentation-dto-read-ports-and-realization-context-ownership/validation/`:

1. Static scans:
   - `grep -R "VisualStyle\|Realization" frontend/src/application/threePresentation/*ReadPort.ts frontend/src/application/threePresentation/*ReadModel.ts frontend/src/application/threePresentation/*Selector.ts`
   - targeted scan proving any remaining `world.getAll*` traversal is localized to the selected adapter boundary.
   - scan for forbidden broad façade names: `RuntimeWorld`, `WorldReadModel`, `SceneKernel`, `ThreeWorld`.
2. Focused Vitest:
   - `npm run test -- --run tests/unit/application/threePresentation/threePresentationConcernSelectors.spec.ts tests/unit/application/threePresentation/threePresentationSelector.spec.ts tests/unit/rendering/threeView/threeViewRuntime.spec.ts tests/unit/components/panels/threeViewShellBoundary.spec.ts` from `frontend/`.
3. Root/frontend lint where defined.
4. Root/frontend full Vitest.
5. Root/frontend build.
6. Root/frontend e2e, including `frontend/tests/e2e/current-ui-contract.spec.ts` overlay pointer test.
7. Refresh live preview on `0.0.0.0:5173`, probe `http://127.0.0.1:5173/` for HTTP 200, and run live/browser smoke if tooling is available.

## No-backcompat / aggressive deletion rationale

This proposal intentionally deletes the old realization/style read-model surface rather than wrapping it. Tests should be rewritten around DTO contracts instead of preserving raw domain-object mocks. There is no need for compatibility because these are internal frontend application contracts with narrow current consumers.

## Protected surfaces

No changes to command producers/history, persistence, command descriptors, `OperationRegistry`, `ProjectService`, Drive/auth, backend, docs/specs, package/tooling, validation platform, preview scripts, canvas public read-port contracts, app-shell production composition beyond type wiring, CSS-only overlay behavior, or unrelated dirty files.
