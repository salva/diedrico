# Proposal Direct — Explicit Three runtime/host lifecycle seams

## Summary

Implement Wave 019 directly by making the existing 3D runtime/platform boundary explicit and testable without redesigning the app shell or presentation selectors. Keep `ThreeView.vue` as a thin Vue shell, keep the existing presentation-controller/read-port architecture, and introduce narrow lifecycle/composition seams around `ThreeViewRuntime`, `ThreeSceneHost`, and `ThreeObjectRegistry`.

The central change is to delete implicit hard-wiring and implicit host lifecycle ownership where it blocks focused tests, not to abstract every Three.js primitive. Runtime orchestration should be constructible with test doubles for the host, controller, and adapters. Scene-host platform resources should expose a small lifecycle contract that can be exercised in jsdom/unit tests with controlled requestAnimationFrame/cancelAnimationFrame and lightweight renderer/controls factories where needed.

## Evidence grounding

- `ThreeView.vue` constructs `new ThreeViewRuntime()` and owns mount/resize/world-change/watch/dispose wiring (`frontend/src/components/panels/ThreeView.vue:44`, `:54`, `:56`, `:59-64`, `:70`).
- `ThreeViewRuntime` directly instantiates host, controller, and five adapters (`frontend/src/rendering/threeView/ThreeViewRuntime.ts:11-17`) and hard-codes group replacement (`frontend/src/rendering/threeView/ThreeViewRuntime.ts:23-27`).
- `ThreeSceneHost` owns scene/registry plus camera, WebGL renderer, CSS2D renderer, OrbitControls, lights, resize, animation loop, and disposal (`frontend/src/rendering/threeView/ThreeSceneHost.ts:10-17`, `:20-52`, `:55-67`, `:70-75`).
- `ThreeObjectRegistry` already centralizes group replacement and disposal of geometry/material/CSS2D DOM (`frontend/src/rendering/threeView/ThreeObjectRegistry.ts:7-24`, `:28-36`).
- `AxisLabelSceneAdapter.ts` is active via `ProjectionPlaneSceneAdapter.ts`, so it is not a delete candidate in the direct path.
- Wave 018 completed the typed realization-context boundary in `ThreeWorldReadPort`, so no Wave 019 plan edit is required.

## Files to change

Production source:

- `frontend/src/rendering/threeView/ThreeViewRuntime.ts`
  - Add narrow interfaces/types for the host surface used by the runtime, presentation controller surface, adapter surface, and render group names.
  - Add constructor or factory options so tests can inject host/controller/adapters while production still uses one default composition path.
  - Keep `refresh()` responsibility as presentation-model build plus named group replacement.
- `frontend/src/rendering/threeView/ThreeSceneHost.ts`
  - Make mount/dispose idempotence and lifecycle ownership explicit.
  - Introduce only the minimum factory seam needed to test renderer/label renderer/controls/animation behavior without real WebGL where jsdom cannot support it.
  - Keep camera, lights, controls, renderer, label renderer, resize, and animation as host-owned platform concerns.
  - Avoid extracting a generic scene manager or primitive factory maze.
- `frontend/src/rendering/threeView/ThreeObjectRegistry.ts`
  - Add/clarify public contract comments or small types for registry-owned objects if useful.
  - Add any missing disposal safeguards discovered by focused tests, such as safe repeated disposal, without changing group semantics.
- `frontend/src/rendering/threeView/*SceneAdapter.ts`
  - Add small shared adapter interface/type if needed by runtime injection.
  - Clarify that adapter-created Three.js objects transfer ownership to the registry for disposal.
  - Do not reorganize geometry construction unless needed to satisfy the ownership contract.
- `frontend/src/components/panels/ThreeView.vue`
  - Update only if runtime construction moves to an explicit `createThreeViewRuntime()` factory or if watcher cleanup must become explicit. Keep the component as a shell.

Tests:

- `frontend/tests/unit/rendering/threeView/threeViewRuntime.spec.ts` (new)
  - Verify `refresh()` calls controller once, calls each adapter, and replaces the expected registry groups with adapter outputs using test doubles.
- `frontend/tests/unit/rendering/threeView/threeSceneHost.spec.ts` (new or extended)
  - Verify mount attaches CSS2D label DOM, configures resize, starts one animation loop, and dispose cancels animation, disposes controls/renderer/registry, and removes label DOM.
  - Verify repeated dispose/mount behavior only to the extent it is part of the selected lifecycle contract.
- `frontend/tests/unit/rendering/threeView/threeObjectRegistry.spec.ts`
  - Extend if needed for nested object/material-array/CSS2D disposal ownership expectations.
- `frontend/tests/unit/rendering/threeView/threeSceneAdapters.spec.ts`
  - Update if adapter interfaces/types change; keep behavior coverage for object creation/userData.
- `frontend/tests/unit/components/panels/threeViewShellBoundary.spec.ts`
  - Update only if shell import/factory text changes; keep it as a shell-boundary architecture test.

## Files/tests/docs/fixtures to DELETE

- Delete implicit hard-wiring in `ThreeViewRuntime` that forces concrete `ThreeSceneHost`, `ThreePresentationController`, and adapter construction inside private fields with no injection seam.
- Delete any stale test helper that mounts `ThreeView.vue` merely to observe low-level host/registry behavior once runtime/host tests exist.
- Delete renderer/label DOM disposal ambiguity by replacing informal lifecycle assumptions with explicit tested host behavior.
- Delete compatibility wrappers or overloads that preserve both old and new runtime construction paths. Production should have one default composition path plus test injection/factory support, not parallel APIs.
- Delete any dead scene adapter export discovered by static scan during implementation. Current scout proves `AxisLabelSceneAdapter.ts` is active, so it should not be deleted under this proposal unless usage changes.
- No docs/spec/backend/package/source fixtures are proposed for deletion in this wave.

## Expected behavior change

No intended user-visible behavior change. The 3D panel should still render projection planes, grids, axes/labels, 2D elements on planes, reconstructed 3D elements, guides, hinges, and controls with the same visible options. Orbit controls should remain available and CSS2D labels should remain non-interactive as currently styled by the host.

Internal behavior changes are architectural:

- Runtime composition becomes explicit and testable.
- Host lifecycle ownership becomes explicit and covered.
- Registry/object disposal contract becomes a named responsibility instead of an informal convention.

## No-backcompat rationale

The old runtime/host construction shape is an internal implementation detail. If constructor/factory seams are added, delete the old implicit hard-wired construction rather than preserving a compatibility wrapper. A single clear runtime/platform boundary is preferable to keeping parallel construction paths for tests or legacy callers.

## Validation plan

Capture all logs under `architecture-audit/cycle-019-three-scene-host-lifecycle-renderer-platform/validation/` during implementation:

1. Pre-edit static scans for lifecycle/watch/listener, hard-wiring, host resources, adapter usage, and registry disposal.
2. Focused Vitest:
   - `npm run test --workspace=frontend -- tests/unit/rendering/threeView/threeViewRuntime.spec.ts tests/unit/rendering/threeView/threeSceneHost.spec.ts tests/unit/rendering/threeView/threeObjectRegistry.spec.ts tests/unit/rendering/threeView/threeSceneAdapters.spec.ts tests/unit/components/panels/threeViewShellBoundary.spec.ts`
3. Root and frontend lint:
   - `npm run lint`
   - `npm run lint --workspace=frontend`
4. Full Vitest:
   - `npm run test`
   - `npm run test --workspace=frontend`
5. Build:
   - `npm run build`
   - `npm run build --workspace=frontend`
6. E2e because 3D rendering is user-observable:
   - `npm run test:e2e`
   - `npm run test:e2e --workspace=frontend`
7. Live preview refresh and smoke:
   - Start/refresh `npm run dev --workspace=frontend -- --host 0.0.0.0`.
   - Capture HTTP 200 probe.
   - Run Playwright/live browser smoke verifying the 3D panel renders, controls are visible, option toggles remain interactive, and no obvious overlay/canvas regression occurs.

## Risks

- Too much injection could create an abstract factory maze. Keep seams at host/controller/adapter/lifecycle boundaries only.
- Mocking WebGL/CSS2D/OrbitControls incorrectly could test implementation details rather than ownership. Tests should assert lifecycle effects and collaborator calls, not duplicate Three.js internals.
- Animation-loop changes can leak requestAnimationFrame callbacks or double-start loops if mount/dispose idempotence is not specified and tested.
- Registry disposal changes can dispose shared objects too early if adapter ownership is mischaracterized. The proposal assumes adapter outputs are registry-owned and not shared elsewhere.
- User-visible OrbitControls behavior can regress if controls configuration changes; live/e2e smoke must include representative controls visibility/interaction.

## Stop conditions

Stop for a reviewed mini-cycle/plan edit if implementation requires any of the following:

- Domain realization/read-port contract changes.
- App-shell project lifecycle or store ownership changes beyond the current `ThreeView.vue` shell wiring.
- Canvas presentation or overlay interaction redesign.
- Persistence, command/undo, backend, package/tooling, validation-platform, docs/spec, or broad UI changes.
- User-visible 3D interaction changes not covered by the selected lifecycle contract and validation plan.
