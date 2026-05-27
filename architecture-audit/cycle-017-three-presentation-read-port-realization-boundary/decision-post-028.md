# Cycle 017 Decision — Three presentation read ports and realization boundary (post-Wave-028)

## Decision status

**Status:** APPROVED FOR IMPLEMENTATION  
**Selected path:** `proposals/proposal-direct.md`  
**Rejected alternative:** `proposals/proposal-restructure.md` as fallback / stop path only  
**Recommended next canonical stage:** `cycle-017-implement-three-presentation-read-port-realization-boundary-post-028`

This decision records the post-Wave-028 Wave 017 implementation path after the refreshed scout/proposal set and review round. It authorizes **no source implementation in this decision stage**. The next stage may implement only the bounded scope below.

## Artifacts inspected and relied on

- `architecture-audit/cycle-017-three-presentation-read-port-realization-boundary/scope-check.md`
- `architecture-audit/cycle-017-three-presentation-read-port-realization-boundary/proposals/proposal-direct.md`
- `architecture-audit/cycle-017-three-presentation-read-port-realization-boundary/proposals/proposal-restructure.md`
- `architecture-audit/cycle-017-three-presentation-read-port-realization-boundary/reviews/round-01-review-post-028.md`
- `architecture-audit/cycle-017-three-presentation-read-port-realization-boundary/critique/round-01-critique.md`
- `architecture-audit/cycle-028-canvas-projection-dto-selectors/implementation-log.md`
- `architecture-audit/wave-plan.md` Wave 017 / Wave 018 entries
- Current source evidence for `ThreeWorldReadPort.ts`, `ThreeView.vue`, `Projected3DCanvasReadPort.ts`, and the `current-ui-contract.spec.ts` pointer-boundary regression

Path-scoped diff/status was inspected first. Broad MCP `git_status` overflowed in this workspace, consistent with prior Cycle 028 notes; decision work therefore used path-scoped evidence and must not infer ownership of unrelated dirty files from broad status noise.

## Review convergence

Review convergence is closed for this proposal set.

- `reviews/round-01-review-post-028.md` records **NO BLOCKING ISSUES**.
- The review recommends `proposal-direct.md` as the preferred implementation path and `proposal-restructure.md` as fallback/stop path only.
- The review explicitly confirms that the current residual is the broad `ThreeWorldReadPort` adapter and selector dependency shape, not raw `World` injection into `ThreeView.vue`.
- The review requires two binding constraints for implementation:
  1. no broad replacement aggregate architecturally equivalent to today’s `ThreeWorldReadPort` may survive under a new name;
  2. any shared realization helper must remain a tiny typed `World` to realization-context factory only; otherwise implementation stops and routes to the Wave 018 plan-edit path.

## Critic synthesis / failure-tolerance context

`critique/round-01-critique.md` is a synthesized critique by the Manager because two consecutive critic dispatch attempts failed before work with provider routing error `router: no context window for "nvidia-nim/moonshotai/kimi-k2.6"`. This follows the project failure-tolerance rule: critic dispatch failure does not block progress after two failed attempts when the Manager synthesizes the artifact and marks the reason.

The synthesized critique reported **NO BLOCKING ISSUES** and approved the refreshed scope/proposal set for canonical review. The canonical reviewer then independently agreed with that outcome in `round-01-review-post-028.md`.

## Stale artifact noise context

The Cycle 017 directory contains stale older Cycle 017 validation/review/implementation artifacts from earlier in-tree work. Those files are documentation noise for this post-Wave-028 decision. The authoritative refreshed artifacts for this decision are the scope-check, proposals, synthesized critique, post-028 review, and this decision.

Implementation and validation must continue using path-scoped status/diff and must not treat older Cycle 017 closure/validation files as current authorization or evidence for the post-Wave-028 implementation.

## Selected implementation path

Select **Proposal Direct — Decompose ThreeWorldReadPort into behavior-sized 3D presentation read ports**.

Rationale:

- Current source already removed the stale Wave 017 premise that `ThreePresentationInput` and `ThreeView.vue` pass raw `World` through the component/runtime path.
- `RuntimeSession` remains the concrete world boundary that constructs a three presentation read port.
- The active architectural smell is now one broad `ThreeWorldReadPort` module/interface that owns full `World` traversal, realization-context assembly, projection-plane/grid DTOs, planar DTOs, reconstructed DTOs, guide/intersection DTOs, hinge DTOs, and classification logic.
- Wave 028 established the comparison pattern on the canvas side: behavior-sized public read-port methods and localized raw traversal in named adapter modules, including `Projected3DCanvasReadPort.ts` for projected 3D traversal.
- The direct proposal improves the presentation boundary without broadening into a domain realization redesign, scene-host redesign, command/persistence work, or generic app-kernel facade.

## Rejected alternative and fallback rule

Reject `proposal-restructure.md` as the immediate implementation path. It is retained only as the explicit stop path if implementation proves the direct split cannot be completed honestly inside Wave 017.

The next implementation stage must stop and request a reviewed Wave 018/domain-realization plan edit if any of these become true:

- decomposing the three read port requires changing `ProjectionElementRealizationContext`, `Element3DRealizationContext`, `PlaneEquationRealizationContext`, or domain realization semantics;
- a shared helper needs world collection/read-model methods beyond the existing typed realization context contract;
- the direct split would leave a hidden broad aggregate equivalent to the current `ThreeWorldReadPort`;
- public canvas read-port seams deleted by Wave 028 would need to change beyond consuming a tiny typed realization-context helper.

## Authorized source scope for the next implementation stage

The next implementation stage may touch only these production areas as needed for the selected direct path:

Primary three-presentation scope:

- `frontend/src/application/threePresentation/ThreeWorldReadPort.ts`
- new focused modules under `frontend/src/application/threePresentation/`, such as:
  - `ThreeProjectionPlaneReadPort.ts`
  - `ThreePlanarElementReadPort.ts`
  - `ThreeReconstructedElementReadPort.ts`
  - `ThreeGuideReadPort.ts`
  - `ThreeHingeReadPort.ts`
  - optional local `ThreeRealizationContext.ts`
- `frontend/src/application/threePresentation/ThreePresentationModel.ts`
- `frontend/src/application/threePresentation/ThreePresentationController.ts`
- `frontend/src/application/threePresentation/ThreePresentationSelector.ts`
- `frontend/src/application/threePresentation/ProjectionPlane3DSelector.ts`
- `frontend/src/application/threePresentation/PlanarElement3DSelector.ts`
- `frontend/src/application/threePresentation/ReconstructedElement3DSelector.ts`
- `frontend/src/application/threePresentation/Guide3DSelector.ts`
- `frontend/src/application/threePresentation/Hinge3DSelector.ts`

Boundary/wiring scope, mechanical only:

- `frontend/src/application/appShell/RuntimeSession.ts`
- `frontend/src/application/appShell/RuntimeViewPorts.ts`
- `frontend/src/components/panels/ThreeView.vue`
- `frontend/src/rendering/threeView/ThreeViewRuntime.ts`

Optional tiny shared realization helper:

- A new application-level helper such as `frontend/src/application/presentation/WorldRealizationReadContext.ts` is allowed only if it exports a typed `World` to `ProjectionElementRealizationContext & Element3DRealizationContext` factory and no selector/read-model/app-kernel facade behavior.
- `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts` may be touched only to consume that tiny helper, not to change public canvas read-port behavior.

Tests authorized for focused updates:

- `frontend/tests/unit/application/threePresentation/threePresentationSelector.spec.ts`
- `frontend/tests/unit/application/threePresentation/threePresentationConcernSelectors.spec.ts`
- new focused three read-port slice/adapter tests
- `frontend/tests/unit/components/panels/threeViewShellBoundary.spec.ts`
- static architecture guard tests, preferably an existing app-shell/architecture guard or a Cycle017-specific focused guard
- canvas read-port/projected-3D tests only if canvas/shared realization-context wiring is touched

## Required DELETE list

The implementation stage must delete, not wrap or preserve, these stale surfaces where touched:

- the broad public `ThreeWorldReadPort` selector dependency, or its broad god-interface role if the file remains only as a composition/type export;
- `ProjectionPlane3DSelector.select(readPort: ThreeWorldReadPort, ...)` and other selector dependencies on a full broad port where a named concern port is sufficient;
- `Pick<ThreeWorldReadPort, ...>` stopgaps in concern selectors, replacing them with named concern-port interfaces;
- duplicated local `createThreeRealizationContext` if a tiny shared typed context factory is introduced;
- touched broad `as any` test fixtures in three-presentation tests that exist only because tests mock one large port/world-like object;
- transitional wrappers, overloads, dead exports, and dual broad-port plus slice-port paths created during implementation.

Do **not** delete or rewrite docs/specs/backend/package/tooling files for this wave.

## ThreeWorldReadPort responsibility split and read-port ownership rules

Implementation must split the current broad responsibility into explicit concern-owned ports equivalent to:

- projection planes and grid source;
- planar 2D-on-3D elements;
- reconstructed 3D elements;
- selected guides and guide-intersection source models;
- hinges.

Rules:

- Concrete `World` traversal belongs only inside runtime-created adapter factories and their concern adapter modules.
- Selectors consume DTO-oriented concern ports, not `World`, domain collections, mutable app state, command state, persistence records, or scene-host lifecycle.
- `ThreePresentationSelector` may orchestrate concern selectors, but it must pass named read-port slices/fields to each selector rather than one god object.
- No new `RuntimeWorld`, `WorldReadModel`, `PresentationWorld`, app-kernel facade, or generic all-purpose presentation snapshot is allowed.
- No broad aggregate may survive if it exposes the same method cluster as the current `ThreeWorldReadPort` under a different name. A composition type is allowed only when it contains explicit named concern slices.

## Realization-context ownership rules

- Wave 017 may keep realization-context construction private to three concern adapters or move it to a tiny local helper if multiple three modules need it.
- A shared helper with canvas is allowed only if it is a typed `World` to realization-context adapter using the existing domain context vocabulary.
- The helper must not own selector DTO methods, style policy, visibility policy, selection, app-shell state, command/undo, persistence, mutation, process-tree rendering, rendering lifecycle, scene-host behavior, or generic world collection/read-model convenience APIs beyond the existing realization context contract.
- If the clean fix requires domain realization API redesign, implementation must stop and route through the Wave 018 fallback path.

## ThreeView consumption boundaries

`ThreeView.vue` must remain a composition shell:

- it may obtain the injected `ThreePresentationPort`, get the selected read-port composition, collect display options and selected IDs, and refresh `ThreeViewRuntime`;
- it must not import concrete `World`, domain realization classes, domain traversal helpers, Three.js low-level scene adapters, command services, persistence services, or canvas selectors;
- any change to `ThreeView.vue` or `ThreeViewRuntime.ts` must be mechanical type/name alignment only;
- no layout, overlay, CSS pointer behavior, OrbitControls, camera, renderer lifecycle, or user-facing 3D interaction behavior may change.

## Relation to Projected3DCanvasReadPort and Wave 028 invariants

Wave 017 must follow the Wave 028 pattern without reopening Wave 028:

- public presentation consumers receive behavior-sized DTO/read-port capabilities;
- raw `World` traversal stays localized in named adapter modules;
- projected-3D canvas traversal remains localized in `Projected3DCanvasReadPort.ts`;
- `CanvasWorldReadPort` public raw getter/realization seams deleted by Wave 028 must not be reintroduced;
- Wave 025-028 invariants remain protected: no generic runtime world/app-kernel facade, no raw Vue `World` injection, no raw tool-world seam, no process-tree-shaped canvas visibility regression, no compatibility wrappers.

## DTO family and classification rules

DTO construction/classification must move to the smallest adapter module that owns each concern:

- projection-plane adapters own fixed/auxiliary classification and grid source lookup;
- planar adapters own plane element traversal, 2D realization, and segment-vs-line classification;
- reconstructed adapters own 3D point/line/segment/plane source DTOs;
- guide adapters own selected guide lookup, guide/sibling-guide classification, exception containment, and guide-intersection source DTOs;
- hinge adapters own hinge traversal and realization.

Selectors should compose/transform DTOs for rendering but must not regain raw domain traversal or broad world classification responsibility.

## 3D overlay pointer-boundary preservation

The implementation must preserve the Cycle 026/028 3D overlay interaction boundary:

- `.three-view-overlay` owns pointer interaction with `pointer-events: auto`;
- `.three-canvas` remains interactive within the overlay;
- drag gestures on the 3D overlay must not pass through to move the SVG canvas;
- `frontend/tests/e2e/current-ui-contract.spec.ts` pointer-boundary test must pass in root and frontend e2e validation.

No implementation change may alter overlay CSS/layout/event routing unless a reviewed delta proposal explicitly authorizes it. This decision does not authorize such a delta.

## Protected out-of-scope surfaces

Do not touch or depend on:

- persistence schema/replay, project service, Drive/local persistence, auth/provider/env/config files, or secrets;
- command history, command producers, command serialization, `CommandStack`, tool state machines, active-plane behavior, or `screenTo3D`;
- backend, docs, specs, package/tooling, validation platform, or preview scripts;
- scene-host, OrbitControls, camera, lights, renderer lifecycle, animation loop, or Three.js platform setup;
- broad canvas presentation rewrite, canvas selector style-policy cleanup, or public canvas read-port API redesign;
- broad domain realization API redesign inside Wave 017;
- stale older Cycle 017 audit artifacts except as noise to be ignored.

## Source-control hygiene

The worktree has broad dirty context. Implementation must use scoped status/diff before and after edits and stage only files inside the authorized Wave 017 scope.

Protected unrelated dirty source files:

- `frontend/src/domain/calculations/Intersections.ts`
- `frontend/src/domain/processTree/ActionGroup.ts`

Wave 017 implementation must not read those files for implementation logic, revert them, stage them, incorporate them, or require them to pass compile/test. If they become necessary for compile/test success, stop and report that as a scope violation requiring Manager decision.

Do not mine, revive, or cross-reference discarded stale audit history. The current source tree and refreshed post-Wave-028 artifacts are authoritative.

## Validation requirements for the implementation stage

All logs must be captured under:

`architecture-audit/cycle-017-three-presentation-read-port-realization-boundary/validation/`

Required evidence:

1. Scoped pre/post status and diff for authorized Wave 017 paths, with explicit note that unrelated `Intersections.ts` and `ActionGroup.ts` were not touched.
2. Static scans proving:
   - no production Vue component imports/receives concrete `World`;
   - no `RuntimeWorld`, `WorldReadModel`, generic app-kernel facade, or raw tool-world seam was added;
   - no `CanvasWorldReadPort` public raw getter/realization seam was reintroduced;
   - concern selectors depend on named slice ports, not a broad `ThreeWorldReadPort` god-interface;
   - no dual broad/sliced read-port compatibility path remains;
   - touched three-presentation tests no longer use broad `as any` seams where explicit slice fixtures are practical.
3. Focused Vitest for:
   - `frontend/tests/unit/application/threePresentation/threePresentationSelector.spec.ts`
   - `frontend/tests/unit/application/threePresentation/threePresentationConcernSelectors.spec.ts`
   - new/updated three read-port slice/adapter tests
   - `frontend/tests/unit/components/panels/threeViewShellBoundary.spec.ts`
   - canvas read-port/projected-3D tests only if canvas/shared context is touched.
4. Root and frontend `npm run lint` where defined.
5. Root and frontend full Vitest where defined.
6. Root and frontend `npm run build` where defined.
7. Root and frontend Playwright/e2e because 3D presentation behavior is user-observable, with explicit evidence that the `current-ui-contract.spec.ts` overlay pointer-boundary regression passes.
8. Live preview refresh bound to `0.0.0.0:5173`, HTTP 200 reachability probe, and a brief 3D live/browser smoke where tooling is available.

A skipped validation step is acceptable only with explicit justification in the implementation log; failures attributable to the Wave 017 change reject the implementation.

## Stop conditions

Stop implementation and request a reviewed delta/plan edit if:

- direct decomposition requires domain realization semantic/API changes;
- a shared realization helper grows beyond a tiny typed context factory;
- a broad `ThreeWorldReadPort` equivalent remains under a new name;
- public canvas raw seams deleted by Wave 028 would be reintroduced;
- scene-host, OrbitControls, overlay/pointer behavior, command/undo, persistence, package/tooling, backend/docs/specs, auth/provider/env files, or broad UI behavior changes become necessary;
- unrelated dirty `Intersections.ts` / `ActionGroup.ts` changes become necessary for compile/test success;
- the overlay pointer-boundary e2e cannot be preserved.

## Residual risks accepted for implementation

- The split can become cosmetic if a hidden broad aggregate survives. This is accepted only with the static guard requirement above.
- A shared realization helper can drift into a generic world/read-model facade. This is accepted only with the stop condition above.
- Moving DTO classification among adapter modules can cause subtle 3D DTO drift. Focused adapter/selector tests must cover representative projection planes, grids, planar elements, reconstructed elements, guides/intersections, hinges, axes, labels, display toggles, and selection-driven guide display.
- The stale Cycle 017 artifact noise can confuse validation evidence. Implementation must write a fresh `implementation-log.md` that indexes only current post-Wave-028 validation logs.

## Final instruction

Proceed to `cycle-017-implement-three-presentation-read-port-realization-boundary-post-028` only if the Manager accepts this decision and stage review finds that this decision stage made no production implementation changes.
