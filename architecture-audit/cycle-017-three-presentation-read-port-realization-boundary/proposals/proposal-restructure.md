# Proposal Restructure — Test whether the real fix belongs in the domain realization-context boundary

## Summary

This proposal asks whether Wave 017 should stop before implementation and hand off to a Wave 018/domain-realization plan edit instead of further decomposing `ThreeWorldReadPort` at the presentation layer.

Current post-Wave-028 evidence supports the direct presentation decomposition first: selectors/components no longer receive raw `World`, canvas has behavior-sized DTO/read-port public methods, and `ThreeWorldReadPort` is now a broad but legitimate adapter boundary. However, both canvas and three adapters still assemble nearly identical realization contexts around concrete `World`, and the domain context contract itself still mixes lookup and collection capabilities. If a pre-implementation inventory proves that clean three decomposition requires changing those lower contracts, implementation must stop and route through a reviewed Wave 018/domain-realization plan-edit stage.

## Current evidence motivating the restructure question

- `ThreeWorldReadPort.ts` locally creates `createThreeRealizationContext(world)` with lookup and collection methods (`frontend/src/application/threePresentation/ThreeWorldReadPort.ts:66-79`).
- `CanvasWorldReadPort.ts` locally creates the same shape as `createCanvasRealizationContext(world)` (`frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:17-30`).
- `ProjectionElementRealizationContext` includes both dependency lookups and collection methods (`frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts:9-20`).
- `Element2D.realize2D` and `Element3D.realize3D` are already typed against realization-context interfaces (`frontend/src/domain/world/Element2D.ts:101-108`, `frontend/src/domain/world/Element3D.ts:35-42`), so the lower domain vocabulary exists.
- Wave 018 in `architecture-audit/wave-plan.md:939-985` is explicitly scoped to domain realization context boundaries and names both `CanvasWorldReadPort.ts` and `ThreeWorldReadPort.ts` as presentation adapters that pass concrete `World` into domain realization.

## Decision question

Before implementing Proposal Direct, ask:

> Can `ThreeWorldReadPort` be decomposed into concern-owned presentation read ports while keeping domain realization APIs unchanged and without creating a shared god context?

If **yes**, choose Proposal Direct. If **no**, do not broaden Wave 017. Instead, write a corrective plan-edit/review stage that moves the active work to Wave 018/domain-realization context boundary.

## Files to change if this restructure path wins immediately

If the restructure path is selected instead of direct implementation, the next implementation stage should **not** start by editing production source. It should first run a plan-edit/review mini-cycle. Candidate plan-edit files/artifacts:

- `architecture-audit/wave-plan.md` — adjust Wave 017/Wave 018 ordering/scope if reviewer agrees the Wave 017 premise is invalidated.
- `architecture-audit/cycle-017-three-presentation-read-port-realization-boundary/decision.md` — record that Wave 017 implementation is deferred or narrowed.
- New corrective stage artifacts for the reviewed plan edit.

If, after a reviewed plan edit, Wave 018 implementation is authorized, likely production scope would be:

- `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts`
- Domain realization implementors using `ProjectionElementRealizationContext`, `Element3DRealizationContext`, and `PlaneEquationRealizationContext`
- `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts`
- `frontend/src/application/canvasPresentation/Projected3DCanvasReadPort.ts`
- `frontend/src/application/threePresentation/ThreeWorldReadPort.ts` / new read-port modules
- Focused realization-context, canvas, and three tests

That production scope is **not authorized inside Wave 017 without the reviewed plan-edit path**.

## Minimal allowed Wave 017 restructure if reviewer wants a tiny shared helper

A tiny helper can still fit Wave 017 only if it is strictly this:

```ts
createWorldRealizationReadContext(world: World): ProjectionElementRealizationContext & Element3DRealizationContext
```

Allowed properties:

- lives in an application adapter module, not in Vue/runtime/scene code;
- contains only typed realization-context methods already required by domain realization contracts;
- is consumed by both `CanvasWorldReadPort` and three read-port concern adapters to delete duplicated context assembly;
- has no public selector DTO methods and no mutation/command/persistence/store/rendering behavior.

Forbidden properties:

- no `RuntimeWorld`, `WorldReadModel`, `PresentationWorld`, app-kernel facade, snapshot, generic `getAllElements`, command stack, process tree mutation, dependency service mutation, persistence serialization, selection state, style/visibility ownership, scene-host/OrbitControls, Vue lifecycle, package/tooling, backend, or docs/spec behavior.

If the helper needs more than this, it belongs to Wave 018.

## Files/tests/docs/fixtures to DELETE if a reviewed Wave 018 path wins later

Only after plan-edit/review authorization:

- Delete concrete `World`/broad `any` realization parameters from active domain realization contracts where typed contexts can replace them.
- Delete duplicated canvas/three realization-context factories if replaced by a single typed context adapter.
- Delete presentation adapters’ dependence on lower domain contracts that expose unnecessary collection capabilities.
- Delete stale tests that call domain realization with concrete `World` where typed context builders are now required.
- Delete any compatibility overloads that preserve old `World` realization signatures.

Within the current Wave 017 proposal stage, delete nothing in production source.

## Expected behavior change

No intended user-visible behavior change. This restructure would change internal contracts only. Geometry feasibility, projection-plane rendering, 2D canvas projection, 3D view rendering, command behavior, persistence, and overlay pointer behavior must remain equivalent.

## No-backcompat/aggressive-deletion rationale

If the domain realization contract is truly the blocker, preserving presentation-only wrappers would leave duplicated adapter logic and keep the actual architectural smell intact. The correct no-backcompat path would be to delete old realization signatures and duplicate factories through Wave 018 after review, not to build compatibility layers.

## Risks

- High overreach risk: the restructure can easily become a broad domain/app-kernel redesign. The reviewed plan-edit gate is mandatory if it exceeds a tiny typed helper.
- Higher validation burden because domain realization changes touch canvas, three presentation, and many domain tests.
- If selected prematurely, it delays the simpler cleanup of the current broad `ThreeWorldReadPort` adapter.
- Changing realization context contracts can affect geometry semantics; this needs more focused domain-realization tests than Wave 017 direct decomposition.

## Validation plan if a tiny helper is included in Wave 017

Same as Proposal Direct, plus:

1. Focused tests proving both canvas and three adapters consume the helper without changing public read-port DTO behavior.
2. Static scan proving the helper exports only typed realization context creation and no world/read-model facade methods.
3. Canvas focused tests if `CanvasWorldReadPort.ts` or `Projected3DCanvasReadPort.ts` is touched.

## Validation plan if the work becomes Wave 018/domain-realization

After reviewed plan edit only:

1. Caller inventory for `realize2D(...)`, `realize3D(...)`, `getPlaneEquation(...)`, projection-plane realization helpers, and context factory call sites.
2. Focused domain realization tests for 2D elements, 3D points/lines/segments/planes, hinges, guides, intersections, and infeasible cases.
3. Focused canvas and three presentation tests proving read-port DTOs did not drift.
4. Static scans for deleted `World`/`any` realization signatures and absence of compatibility overloads.
5. Root/frontend lint, full Vitest, build, Playwright/e2e, preview refresh/probe, and pointer-boundary e2e evidence.

## Stop conditions / plan-edit triggers

Recommend a precise corrective plan-edit/review stage instead of Wave 017 implementation if any of these are proven during review or implementation planning:

- Concern read-port decomposition requires changing `ProjectionElementRealizationContext`, `Element3DRealizationContext`, `PlaneEquationRealizationContext`, or domain realization method semantics.
- The only way to remove duplicate three/canvas context assembly is a helper that exposes broad world collections/read-models beyond the existing domain context contract.
- Tests cannot be made explicit without constructing a lower domain realization context contract.
- The direct split would leave a hidden broad aggregate that is architecturally equivalent to the current `ThreeWorldReadPort`.
- Public canvas read-port seams would need to change beyond consuming a tiny realization-context helper.

Recommended corrective stage name if triggered: `cycle-017-plan-edit-domain-realization-boundary-post-028` (or the Manager’s canonical equivalent), followed by a critic/reviewer review before any implementation.

## Recommendation relative to Proposal Direct

Prefer **Proposal Direct** for the current Wave 017 review because current source supports a bounded decomposition: the component/runtime read-port boundary already exists, and the remaining broad adapter can be split without changing domain realization contracts. Keep this restructure as the explicit stop path if direct implementation proves the real defect belongs one layer lower in Wave 018.
