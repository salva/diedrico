# Proposal Restructure — Three platform module with explicit host/runtime composition contract

## Summary

Ask whether the correct fix is one conceptual layer higher than the direct runtime/host seam: define a small `threeView` platform module boundary that owns host creation, runtime composition, adapter registry, lifecycle policy, and disposal policy as a cohesive platform contract. `ThreeView.vue` would consume a single platform factory or composable for the 3D view runtime, while the platform module internally wires the scene host, presentation controller, adapters, and registry contract.

This is still a bounded Wave 019 proposal. It does not redesign domain realization, app shell, canvas selectors, persistence, command/undo, backend, package/tooling, docs/spec, or the whole rendering architecture. It only elevates the seam from individual class constructor injection to an explicit 3D platform composition layer that names ownership once.

## Why consider a higher-level boundary?

The direct proposal can make `ThreeViewRuntime` injectable, but constructor injection alone may leave ownership scattered across class APIs. Current evidence shows multiple ownership concerns spanning classes:

- `ThreeView.vue` owns runtime construction and Vue/browser subscriptions (`frontend/src/components/panels/ThreeView.vue:44`, `:56`, `:59-64`, `:70`).
- `ThreeViewRuntime` owns concrete collaborator construction and hard-coded registry groups (`frontend/src/rendering/threeView/ThreeViewRuntime.ts:11-17`, `:23-27`).
- `ThreeSceneHost` owns camera/renderers/CSS2D DOM/OrbitControls/lights/animation/disposal (`frontend/src/rendering/threeView/ThreeSceneHost.ts:10-17`, `:20-52`, `:62-75`).
- `ThreeObjectRegistry` owns disposal of adapter-created objects (`frontend/src/rendering/threeView/ThreeObjectRegistry.ts:7-24`, `:28-36`).
- Scene adapters create all platform objects and labels, including CSS2D DOM elements in `AxisLabelSceneAdapter.ts` (`frontend/src/rendering/threeView/AxisLabelSceneAdapter.ts:13-31`).

A platform module can encode one explicit composition/ownership contract rather than leaving each class to document a fragment.

## Target architecture under this proposal

- `ThreeView.vue` remains a Vue composition shell:
  - owns mount/unmount lifecycle hooks and user option wiring;
  - delegates runtime creation to a named platform factory/composable;
  - owns or delegates world/selection/display subscriptions based on the reviewed contract, but does not gain low-level Three.js imports.
- `frontend/src/rendering/threeView/ThreeViewPlatform.ts` or equivalent new module owns production composition:
  - creates `ThreeSceneHost` with selected platform factories;
  - creates `ThreePresentationController`;
  - registers adapters against named render groups;
  - returns a runtime surface `{ mount, refresh, resize, dispose }`.
- `ThreeViewRuntime` becomes a pure orchestration class over an explicit adapter registry/list rather than one field per adapter.
- `ThreeSceneHost` remains the low-level resource owner but receives platform factories/policies from the platform module where needed for testability.
- `ThreeObjectRegistry` remains the object lifetime owner; adapter-created objects are explicitly transferred to it.
- Scene adapters remain focused DTO-to-Three-object converters; they do not own scene insertion or disposal.

## Files to change

Production source:

- `frontend/src/rendering/threeView/ThreeViewPlatform.ts` (new)
  - Defines the production composition factory and render-group adapter registry.
  - May export `createThreeViewRuntime()` or `createThreeViewPlatformRuntime()` used by `ThreeView.vue`.
- `frontend/src/rendering/threeView/ThreeViewRuntime.ts`
  - Replace fixed private adapter fields with an iterable render-group adapter configuration owned by the platform module.
  - Accept a host, presentation controller, and adapter registry/list through constructor parameters.
- `frontend/src/rendering/threeView/ThreeSceneHost.ts`
  - Accept minimal platform resource factories/policies if needed for lifecycle tests.
  - Keep actual low-level resource behavior in the host, not in Vue or adapters.
- `frontend/src/rendering/threeView/ThreeObjectRegistry.ts`
  - Clarify object ownership/disposal contract.
- `frontend/src/rendering/threeView/*SceneAdapter.ts`
  - Conform to a shared scene adapter contract if the runtime uses a registry/list.
  - Keep geometry/material creation localized.
- `frontend/src/components/panels/ThreeView.vue`
  - Replace direct `new ThreeViewRuntime()` with the platform factory if selected.
  - Do not introduce Three.js imports or app-shell responsibilities.

Tests:

- `frontend/tests/unit/rendering/threeView/threeViewPlatform.spec.ts` (new)
  - Verifies production composition registers the expected groups/adapters and produces a runtime surface.
- `frontend/tests/unit/rendering/threeView/threeViewRuntime.spec.ts` (new)
  - Verifies runtime iterates the adapter registry and replaces groups.
- `frontend/tests/unit/rendering/threeView/threeSceneHost.spec.ts` (new)
  - Verifies host resource lifecycle/disposal.
- Existing registry/adapter/shell tests updated as needed.

## Files/tests/docs/fixtures to DELETE

- Delete one-field-per-adapter hard-wiring from `ThreeViewRuntime` if replaced by a platform-owned adapter registry/list.
- Delete direct production runtime construction in `ThreeView.vue` if a platform factory becomes the only production construction path.
- Delete duplicate production composition helpers if any exist or are introduced during implementation. There must be one production platform factory, not both a new platform and the old private hard-wiring.
- Delete stale tests that assert the exact old private fields/import layout instead of the platform contract.
- Delete compatibility wrappers that preserve both direct `new ThreeViewRuntime()` production wiring and the new platform factory.
- Do not delete `AxisLabelSceneAdapter.ts`; current usage through `ProjectionPlaneSceneAdapter.ts` proves it is active unless the platform registry design replaces it deliberately.
- Do not delete docs/spec/backend/package fixtures in this wave.

## Expected behavior change

No user-visible behavior change is intended. The 3D panel should keep the same controls, display option toggles, object rendering, labels, OrbitControls behavior, resize response, and disposal behavior.

Architectural behavior changes:

- Production composition becomes a named 3D platform boundary.
- Runtime orchestration becomes data-driven over an adapter registry/list.
- Host lifecycle and registry ownership are tested independently of Vue and without needing broad app-shell mounting.

## No-backcompat rationale

The runtime construction API and private collaborator layout are internal. If a platform factory is introduced, delete old production wiring rather than preserving two construction paths. Tests and callers should use the new platform contract or explicit test doubles; compatibility wrappers around old implicit wiring would keep the architectural smell.

## Validation plan

Same mandatory validation as the direct proposal, with additional focused platform test coverage:

1. Pre-edit static scans for shell lifecycle, runtime hard-wiring, host resources, adapter usage, registry disposal.
2. Focused Vitest:
   - `npm run test --workspace=frontend -- tests/unit/rendering/threeView/threeViewPlatform.spec.ts tests/unit/rendering/threeView/threeViewRuntime.spec.ts tests/unit/rendering/threeView/threeSceneHost.spec.ts tests/unit/rendering/threeView/threeObjectRegistry.spec.ts tests/unit/rendering/threeView/threeSceneAdapters.spec.ts tests/unit/components/panels/threeViewShellBoundary.spec.ts`
3. Root/frontend lint.
4. Root/frontend full Vitest.
5. Root/frontend build.
6. Root/frontend Playwright e2e.
7. Live preview refresh on `0.0.0.0:5173`, HTTP 200 probe, and Playwright/live smoke for 3D view rendering and controls.

## Risks

- A platform module can become a new god-module if it absorbs host logic, adapter geometry, or Vue subscriptions. It must remain a composition/ownership contract, not a second scene host.
- A data-driven adapter registry can obscure simple group updates if over-generalized. Keep group names and adapter DTO inputs strongly typed.
- Moving subscription ownership from Vue into a platform/composable could overreach into app-shell/reactivity architecture. Under this proposal, only move subscription wiring if it clearly belongs to the 3D platform and does not require broader app-shell changes.
- Host factories can become too granular. Keep test seams at renderer/label-renderer/controls/animation boundaries only.
- Because this is a slightly broader conceptual layer than the direct proposal, review should reject it if the platform contract cannot be kept small.

## Stop conditions for broader 3D/app-shell redesign

Stop and require a reviewed mini-cycle/plan edit if implementation needs any of these:

- Changing how `World`, selection store, or view store are provided by the app shell outside `ThreeView.vue`.
- Redesigning `ThreePresentationController`, `ThreePresentationSelector`, or `ThreeWorldReadPort` contracts beyond consuming their current outputs.
- Redesigning overlay pointer behavior or canvas presentation interactions.
- Introducing a general rendering platform shared with 2D SVG/canvas rendering.
- Changing command/undo, persistence, backend, package/tooling, validation framework, docs/spec, or app project lifecycle.
- Replacing OrbitControls behavior or visible 3D controls with new user-facing interaction semantics.

## Recommendation relative to direct proposal

Choose this restructure proposal if reviewers believe the direct injection seam would leave too many ownership decisions implicit across `ThreeView.vue`, `ThreeViewRuntime`, `ThreeSceneHost`, adapters, and registry. Choose the direct proposal if a small constructor/factory seam plus host lifecycle tests is sufficient to satisfy Wave 019 without creating a new platform module.
