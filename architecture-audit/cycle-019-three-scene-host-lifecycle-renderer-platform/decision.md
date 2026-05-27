# Cycle 019 Decision — Three scene-host lifecycle / renderer platform boundary

## Decision status

**Decision:** proceed to implementation using `proposals/proposal-direct.md`.

**Review convergence:** complete after round 01. `reviews/round-01-review.md` records **NO BLOCKING ISSUES** and recommends proceeding to `cycle-019-decision`. No corrections round is required before implementation.

**Recommended next stage:** `cycle-019-implement-three-scene-host-lifecycle-renderer-platform`, provided the implementation stage first re-checks focused status and the bound paths below.

This is a planning/decision artifact only. No source, test, package, backend, docs/spec, persistence, command/undo, or tooling implementation is performed in this stage.

## Artifacts inspected

Decision is based on the reviewed Cycle 019 artifacts and the current Wave 019 entry:

- `architecture-audit/wave-plan.md` — Wave 019 entry, extracted during this decision stage to `.saivage/stages/cycle-019-decision/wave-019-entry.stdout`.
- `architecture-audit/cycle-019-three-scene-host-lifecycle-renderer-platform/scope-check.md`.
- `architecture-audit/cycle-019-three-scene-host-lifecycle-renderer-platform/proposals/proposal-direct.md`.
- `architecture-audit/cycle-019-three-scene-host-lifecycle-renderer-platform/proposals/proposal-restructure.md`.
- `architecture-audit/cycle-019-three-scene-host-lifecycle-renderer-platform/reviews/round-01-review.md`.
- Focused status for this stage was captured at `.saivage/stages/cycle-019-decision/status-focused.stdout`; the full workspace status remains too large because unrelated dirty/untracked work exists outside this decision scope.

Forbidden secret/config paths were not read. This decision does not rely on `.saivage/saivage.json`, auth profiles, env files, provider configs, OAuth/Drive credentials, or shell history.

## Current path corrections and binding

The implementation must use current source paths, not stale audit assumptions:

- `frontend/src/services/three/` is absent and out of scope.
- Active Cycle 019 production surfaces are under:
  - `frontend/src/rendering/threeView/`
  - `frontend/src/components/panels/ThreeView.vue` only for thin shell mount/unmount/watch/listener/runtime construction wiring if needed
  - `frontend/src/application/threePresentation/ThreeWorldReadPort.ts` only for dependency verification that Wave 018's typed realization-context boundary still holds; do not redesign it in Cycle 019
- `AxisLabelSceneAdapter.ts` is active through `ProjectionPlaneSceneAdapter.ts`; do not delete it unless implementation changes prove the import is dead and focused tests/static scans confirm no active usage remains.

## Selected implementation path

### Selected: `proposal-direct.md`

Implement the direct path: make the existing `ThreeViewRuntime`, `ThreeSceneHost`, and registry/adapter lifecycle seams explicit and testable without introducing a broader 3D platform module.

Rationale:

1. It targets the current central smell exactly: runtime hard-wiring, scene-host platform lifecycle ownership, and implicit registry/adapter ownership.
2. It satisfies the Wave 019 target outcome with the smallest architectural lift.
3. It is less likely than the restructure proposal to create a new composition god-module.
4. The reviewer preferred it and found no blocking issues.
5. It preserves the intended ordering: clean the 3D runtime/platform boundary before later app-shell/backend/docs/debug/package-tooling cleanup, without reopening prior domain-realization work.

### Rejected/deferred alternative: `proposal-restructure.md`

`proposal-restructure.md` is viable but not selected for Cycle 019. Its `ThreeViewPlatform`-style composition module may be appropriate only if implementation of the direct path proves ownership remains scattered after a small runtime/host seam is added.

Deferred aspects must **not** be silently incorporated into implementation unless they remain strictly equivalent to the direct proposal's bounded factory/test seam. In particular, do not add a new platform module that absorbs host logic, Vue subscription policy, adapter geometry logic, app-shell state ownership, or a generalized rendering framework. If implementation genuinely needs that broader module, stop and run a reviewed mini-cycle/delta proposal.

## Bound implementation scope

Implementation may change only the surfaces required to implement the selected direct path:

### Production source allowed

- `frontend/src/rendering/threeView/ThreeViewRuntime.ts`
  - Delete implicit private hard-wiring that prevents focused test doubles for the host, presentation controller, and scene adapters.
  - Add narrow typed interfaces/options or a small factory seam for runtime orchestration.
  - Keep responsibility limited to presentation-model refresh and named group replacement.
- `frontend/src/rendering/threeView/ThreeSceneHost.ts`
  - Make mount/resize/dispose/animation/renderer/label-renderer/controls lifecycle ownership explicit and testable.
  - Add only the minimum renderer/label-renderer/controls/animation factory seam needed for jsdom/unit tests.
  - Keep camera, lights, OrbitControls, WebGL renderer, CSS2D renderer, animation loop, resize, registry disposal, renderer disposal, and label DOM removal host-owned.
- `frontend/src/rendering/threeView/ThreeObjectRegistry.ts`
  - Clarify and test the ownership contract for registry-owned scene objects and CSS2D label DOM cleanup.
  - Add disposal safeguards only if required by focused tests and consistent with existing group replacement semantics.
- Active scene adapters under `frontend/src/rendering/threeView/` as needed for a shared adapter contract or ownership comments/types:
  - `ProjectionPlaneSceneAdapter.ts`
  - `PlanarElementSceneAdapter.ts`
  - `ReconstructedElementSceneAdapter.ts`
  - `GuideSceneAdapter.ts`
  - `HingeSceneAdapter.ts`
  - `AxisLabelSceneAdapter.ts`
- `frontend/src/components/panels/ThreeView.vue`
  - Touch only if the direct runtime construction seam or watcher/listener cleanup requires a shell wiring adjustment.
  - Keep it a Vue composition shell, not a Three.js platform owner.

### Tests allowed/expected

- Add `frontend/tests/unit/rendering/threeView/threeViewRuntime.spec.ts`.
- Add or extend `frontend/tests/unit/rendering/threeView/threeSceneHost.spec.ts`.
- Extend `frontend/tests/unit/rendering/threeView/threeObjectRegistry.spec.ts` only where registry ownership/disposal contract gaps are found.
- Update `frontend/tests/unit/rendering/threeView/threeSceneAdapters.spec.ts` only if adapter interface/types change.
- Update `frontend/tests/unit/components/panels/threeViewShellBoundary.spec.ts` only if shell wiring/imports change.

## Required DELETE/removal outcomes

The implementation is incomplete if these old surfaces remain in parallel with the new boundary:

- Delete implicit `ThreeViewRuntime` construction that forces production concrete `ThreeSceneHost`, `ThreePresentationController`, and all adapters as unreplaceable private fields.
- Delete compatibility wrappers, transitional overloads, or broad scene-manager facades that preserve both old and new production construction paths.
- Delete stale test helpers/tests that mount `ThreeView.vue` only to inspect low-level host/registry behavior once runtime/host focused tests exist.
- Delete renderer/label DOM ownership ambiguity by encoding and testing CSS2D DOM attachment/removal, renderer disposal, and animation-frame cancellation.
- Delete duplicate or dead scene-host lifecycle helpers/scene-adapter exports only if the implementation-stage static scan proves they are unused.
- Do **not** delete `AxisLabelSceneAdapter.ts` under the current evidence unless subsequent static usage and tests prove it has become dead.

## Forbidden repairs and protected out-of-scope surfaces

Implementation must not broaden into:

- domain realization contract redesign, `World`/`any` realization cleanup, or `ThreeWorldReadPort` contract changes beyond dependency verification;
- canvas presentation selectors, overlay interactions, 2D rendering selector extraction, or canvas UI redesign;
- command/undo, persistence, project lifecycle, autosave, Drive/local storage, or app-shell service concentration;
- backend or frontend/backend project-contract work;
- docs/spec cleanup, debug cleanup, package/tooling churn, root validation-platform redesign, dependency upgrades, or lockfile churn;
- broad test rewrites unrelated to the touched three-view runtime/host/registry/adapter/shell boundary;
- stale audit-history mining from discarded cycle artifacts.

If any of the above becomes necessary, stop and request a reviewed plan edit or mini-cycle before changing those areas.

## Validation requirements for implementation

All implementation validation logs must be captured under:

`architecture-audit/cycle-019-three-scene-host-lifecycle-renderer-platform/validation/`

Minimum required gates:

1. Pre-edit static scans for:
   - `ThreeView.vue` lifecycle/watch/listener/runtime construction responsibilities;
   - `ThreeViewRuntime` hard-wired dependencies;
   - `ThreeSceneHost` renderer/camera/controls/animation/disposal responsibilities;
   - scene-adapter static usage, including `AxisLabelSceneAdapter.ts`;
   - `ThreeObjectRegistry` disposal behavior.
2. Focused Vitest for touched three-view modules, expected command shape:
   - `npm run test --workspace=frontend -- tests/unit/rendering/threeView/threeViewRuntime.spec.ts tests/unit/rendering/threeView/threeSceneHost.spec.ts tests/unit/rendering/threeView/threeObjectRegistry.spec.ts tests/unit/rendering/threeView/threeSceneAdapters.spec.ts tests/unit/components/panels/threeViewShellBoundary.spec.ts`
3. Root and frontend lint:
   - `npm run lint`
   - `npm run lint --workspace=frontend`
4. Full root and frontend Vitest:
   - `npm run test`
   - `npm run test --workspace=frontend`
5. Root and frontend build:
   - `npm run build`
   - `npm run build --workspace=frontend`
6. Root and frontend Playwright/e2e because 3D rendering and controls are user-observable:
   - `npm run test:e2e`
   - `npm run test:e2e --workspace=frontend`
7. Live preview refresh and browser evidence:
   - refresh/start the frontend preview with `npm run dev --workspace=frontend -- --host 0.0.0.0`;
   - capture an HTTP 200 reachability probe;
   - run focused Playwright/live browser smoke verifying representative 3D panel rendering, controls visibility/interaction, display-option toggles, and no obvious canvas/overlay regression.

Any skipped gate must be explicitly justified in `implementation-log.md`; frontend/e2e/live preview gates may not be skipped merely because the change is architectural, since the touched 3D rendering boundary is user-observable.

## Stop conditions

Stop implementation and route back to a reviewed mini-cycle or plan edit if:

- runtime/host lifecycle work requires changing domain realization/read-port contracts;
- a new platform module becomes necessary rather than a small direct seam;
- Vue shell ownership must expand beyond current `ThreeView.vue` mount/unmount/watch/listener/runtime construction wiring;
- user-facing 3D interaction semantics must change beyond encoding current lifecycle/ownership behavior;
- registry ownership/disposal proves shared-object lifetime assumptions are wrong and needs a deeper renderer-object lifetime redesign;
- implementation requires backend, app-shell, persistence, command/undo, package/tooling, docs/spec, validation-platform, or broad UI/test rewrite changes.

## Residual risks accepted for implementation

- Adding too many injection points could create an abstract factory maze; implementation must keep seams at host/controller/adapter/lifecycle boundaries.
- WebGL/CSS2D/OrbitControls tests can overfit implementation details; focused tests should assert ownership effects and collaborator calls, not reimplement Three.js internals.
- Animation loop lifecycle is fragile: double-starts, leaked frames, and missed cancellation must be covered.
- Registry disposal can leak geometry/material/CSS2D DOM or dispose shared objects too early if ownership is mischaracterized.
- OrbitControls and label/canvas layering are user-observable; e2e/live smoke must cover representative controls and 3D rendering after the refactor.

## Final recommendation

Proceed to `cycle-019-implement-three-scene-host-lifecycle-renderer-platform` using `proposal-direct.md` exactly as constrained above. No blockers remain before implementation.