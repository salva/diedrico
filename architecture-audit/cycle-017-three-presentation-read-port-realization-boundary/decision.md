# Cycle 017 Decision — Three presentation read ports and realization boundary

## Decision status

**Decision: proceed to implementation.**

Cycle 017 review convergence is complete. The round-01 review initially found blocking issues in the proposal artifacts, but the same review artifact records a follow-up re-review after artifact-only corrections with **NO BLOCKING ISSUES** (`architecture-audit/cycle-017-three-presentation-read-port-realization-boundary/reviews/round-01-review.md`). No wave-plan edit is required before implementation: the current wave plan already contains Wave 017, **Three presentation read ports and realization boundary**, with this scope and guardrails (`architecture-audit/wave-plan.md:861-907`).

This decision records implementation constraints only. It does not implement source, test, package, tooling, or validation changes.

## Reviewed artifacts used

- `architecture-audit/cycle-017-three-presentation-read-port-realization-boundary/scope-check.md`
- `architecture-audit/cycle-017-three-presentation-read-port-realization-boundary/proposals/proposal-direct.md`
- `architecture-audit/cycle-017-three-presentation-read-port-realization-boundary/proposals/proposal-restructure.md`
- `architecture-audit/cycle-017-three-presentation-read-port-realization-boundary/reviews/round-01-review.md`
- `architecture-audit/wave-plan.md`

## Selected implementation path

**Selected: `proposal-direct.md` — Three presentation read port with limited canvas realization alignment.**

Rationale:

1. It directly targets the active Wave 017 leak: three-presentation selector/controller inputs still depend on full mutable `World`, while the wave target is explicit presentation read ports or read-context slices.
2. It preserves the architectural gain from Wave 016 by extending the read-port boundary to three-presentation without reopening the completed canvas selector model.
3. It has the smallest adequate scope for this wave: a three-presentation read port plus only tiny canvas realization/read-context type alignment where needed.
4. After corrections, the review records that direct proposal guardrails now define allowed selector-family slices, forbidden facade capabilities, focused tests, and stop conditions sufficiently for implementation.

## Rejected and fallback alternative

**Rejected as default: `proposal-restructure.md` — Shared presentation realization/read context for 2D and 3D selectors.**

The restructure path is not selected for Cycle 017 implementation because it carries higher overreach risk: a shared context could become a presentation god snapshot or accidentally reopen Wave 016 canvas ownership. It is retained only as a bounded fallback if implementation planning proves that the direct read-port path would duplicate materially identical realization/transform ownership already present in `CanvasWorldReadPort`.

Fallback conditions:

- Before switching to the shared-context approach, the implementer must record concrete evidence that the direct path would create duplicate ownership, not just similar method names.
- The fallback must remain inside the minimal shared surface described in `proposal-restructure.md`.
- If the required shared context would absorb scene-host, style, visibility, command, process-tree mutation, persistence, app-shell, backend, or broader domain-realization ownership, stop and request a reviewed delta/wave-plan edit instead of implementing the fallback.

## Exact implementation scope

Implementation may touch only the selected direct-path surfaces unless a documented stop condition is reached:

- `frontend/src/application/threePresentation/ThreePresentationModel.ts`
- `frontend/src/application/threePresentation/ThreePresentationController.ts`
- `frontend/src/application/threePresentation/ThreePresentationSelector.ts`
- `frontend/src/application/threePresentation/ProjectionPlane3DSelector.ts`
- `frontend/src/application/threePresentation/PlanarElement3DSelector.ts`
- `frontend/src/application/threePresentation/ReconstructedElement3DSelector.ts`
- `frontend/src/application/threePresentation/Guide3DSelector.ts`
- `frontend/src/application/threePresentation/Hinge3DSelector.ts`
- a new narrow module such as `frontend/src/application/threePresentation/ThreeWorldReadPort.ts`
- `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts` only for tiny shared realization/read-context type alignment
- `frontend/src/rendering/threeView/ThreeViewRuntime.ts` only to consume the new three-presentation input/read-port contract
- `frontend/src/components/panels/ThreeView.vue` only to wrap the injected runtime `World` at the presentation boundary
- focused tests under `frontend/tests/unit/application/threePresentation/`
- `frontend/tests/unit/application/canvasPresentation/canvasWorldReadPort.spec.ts` only if canvas read-port alignment changes

`CanvasVisibilityPolicy.ts` is **not** part of the selected direct implementation unless the change is an obvious tiny type alignment already required by the selected read-port boundary. If it requires style/process-tree redesign, leave it out.

## Required implementation shape

The direct implementation must create a narrow three-presentation read port or equivalent selector-owned slice contract. It must not rename `World` access behind a facade.

Allowed capabilities are limited to the categories already reviewed in `proposal-direct.md`:

- projection-plane enumeration and typed plane presentation/realization inputs needed by `ProjectionPlane3DSelector`;
- planar-element enumeration, typed element realization, owning-plane placement inputs, and typed transform/matrix DTOs needed by `PlanarElement3DSelector`;
- reconstructed-element enumeration and typed realization DTOs for currently rendered reconstructed points, lines, segments, circles, and planes;
- guide enumeration and typed guide realization/label data needed by current 3D rendering;
- hinge and half-hinge data needed by current hinge DTO output;
- tiny shared realization-context/types with `CanvasWorldReadPort` only where they remove real duplicate ownership.

Forbidden capabilities:

- `world`, `getWorld`, mutable `World`, raw mutable `ProjectionPlane`, raw mutable `Element2D`, unrestricted element maps, command stack, dependency service, process-tree mutation, persistence serialization, scene-host lifecycle, OrbitControls/camera ownership, construction-tool state, app-shell state, Drive/local project services, or mutation helpers.

If a selector appears to require any forbidden capability, implementation must stop and request a reviewed delta rather than widening the port.

## Required DELETE list

The implementation must delete, not wrap or preserve:

- `ThreePresentationInput.world: World` as the active public three-presentation input contract;
- full-`World` selector signatures in touched active three-presentation selectors where a read-port/context slice is sufficient;
- calls that pass concrete mutable `World` from `ThreePresentationSelector` into each concern selector;
- local `matrix: any` seams in touched three-presentation selectors when the new boundary owns typed transform DTOs;
- tests/helpers that assert three-presentation selectors require concrete `World` for the touched constructor/input shapes;
- compatibility overloads, transitional dual full-`World`/read-port paths, broad presentation facades, and dead exports created during the transition.

If the bounded fallback is used, also delete duplicate canvas-only and three-only realization read methods replaced by the shared context.

## Mandatory validation and log locations

The implementation stage must capture full stdout/stderr under:

`architecture-audit/cycle-017-three-presentation-read-port-realization-boundary/validation/`

Required evidence:

1. Static scans before and after edits for:
   - full-`World` APIs/imports in `frontend/src/application/threePresentation`;
   - concrete `world` passed into three-presentation concern selectors;
   - `matrix: any` seams in touched three-presentation selectors;
   - `CanvasWorldReadPort` realization delegation if touched.
2. Focused Vitest including:
   - `frontend/tests/unit/application/threePresentation/threePresentationSelector.spec.ts`;
   - `frontend/tests/unit/application/threePresentation/threePresentationConcernSelectors.spec.ts`;
   - new or updated `ThreeWorldReadPort`/adapter tests under `frontend/tests/unit/application/threePresentation/`;
   - `frontend/tests/unit/application/canvasPresentation/canvasWorldReadPort.spec.ts` if canvas read-port alignment changes.
3. Root and frontend lint where scripts exist.
4. Full root and frontend Vitest suites.
5. Root and frontend build.
6. Root/frontend Playwright e2e because this wave touches user-observable 3D/canvas rendering boundaries, unless the implementation log gives a specific reviewed no-behavior-change justification accepted by the validation stage.
7. Live preview refresh on `0.0.0.0:5173`, HTTP reachability probe, and focused Playwright/live browser evidence for 3D view rendering plus representative 2D canvas rendering when the implementation touches rendering/runtime/component paths.

## Stop conditions

Stop implementation and request a reviewed delta or wave-plan edit if any of the following occurs:

- the read port must expose a general `World` facade or raw mutable domain objects;
- the change requires command/undo, persistence, backend, Drive/local project, app-shell, package/tooling, validation-platform, or docs/spec redesign;
- the change requires scene-host, OrbitControls, camera, lighting, animation, or broad Three.js lifecycle redesign;
- canvas presentation changes grow beyond tiny realization/read-context alignment and begin rewriting the Wave 016 selector model;
- domain realization semantics must change rather than only the presentation read boundary;
- implementation cannot delete the old full-`World` path without preserving compatibility wrappers or parallel APIs.

## Protected out-of-scope surfaces

Do not touch these areas in Cycle 017 implementation except to read them for evidence:

- backend source and backend package metadata;
- persistence/project schema, Drive/local project services, and migration code;
- command/undo factories, construction use-cases, and tool state machines;
- app-shell orchestration outside the minimal `ThreeView.vue` boundary wrapping listed above;
- `ThreeSceneHost`, OrbitControls/camera/lighting/animation ownership, and broad rendering-platform modules;
- docs/spec reconciliation;
- root/package/tooling changes;
- stale audit-history artifacts from discarded cycles;
- forbidden secret/config files.

## Residual risks accepted for implementation

- A narrow read port may still drift toward a broad facade; the implementation must keep capabilities selector-owned and validate with static scans and tests.
- `CanvasWorldReadPort` still has realization-boundary debt; Cycle 017 may align tiny shared types but must not hide a full domain-realization redesign under this wave.
- Scene-host interaction and broader 3D rendering lifecycle debt remains out of scope and may become a later wave.
- Some test-helper `any` cleanup may remain outside touched three-presentation selector/input seams; do not broaden this wave into general test cleanup.

## Next recommended stage

Proceed to **`cycle-017-implement-three-presentation-read-port-realization-boundary`**.

Implementation is authorized only under the constraints above. No blockers remain in the reviewed Cycle 017 proposal artifacts.
