# Proposal Restructure — Move production 3D runtime composition to a named platform boundary

## Summary

Test whether the correct fix is one layer higher than preserving the current direct constructor-default shape. Current source already has good low-level seams, but production composition is still split between `ThreeView.vue` calling `new ThreeViewRuntime()` and `ThreeViewRuntime` defaulting host/controller/adapters inside its constructor. This proposal introduces a small named `threeView` platform/composition module so production wiring, adapter registration, and runtime creation are owned in one place, while `ThreeViewRuntime` becomes pure orchestration over injected collaborators.

This is still bounded to Wave 019. It must not become an app-shell redesign, a generic renderer platform, a domain realization/read-port change, or a UI feature wave.

## Why consider a higher-level boundary?

The current direct source is testable, but production ownership remains somewhat implicit:

- `ThreeView.vue` directly imports `ThreeViewRuntime` and constructs it (`frontend/src/components/panels/ThreeView.vue:32`, `:46`).
- `ThreeViewRuntime` declares injection interfaces but also imports and constructs the concrete `ThreeSceneHost`, `ThreePresentationController`, and all five adapters as constructor defaults (`frontend/src/rendering/threeView/ThreeViewRuntime.ts:11-17`, `:59-68`).
- `ThreeSceneHost` separately owns platform resource factories and low-level lifecycle (`frontend/src/rendering/threeView/ThreeSceneHost.ts:34-55`, `:73-143`).
- Adapters and registry already define object creation/disposal ownership, but production registration of groups/adapters is encoded as five explicit fields inside `ThreeViewRuntime` (`frontend/src/rendering/threeView/ThreeViewRuntime.ts:38-46`, `:73-80`).

A tiny platform module can make production composition explicit without moving low-level host logic or Vue subscriptions.

## Target architecture

- `ThreeView.vue` remains a Vue shell:
  - injects the Three presentation port;
  - owns component mount/unmount, world subscription, selection/display watchers, and resize listener unless a future app-shell wave changes that;
  - calls a production factory such as `createThreeViewRuntime()` instead of `new ThreeViewRuntime()`.
- New `frontend/src/rendering/threeView/ThreeViewPlatform.ts` (name can vary if reviewed) owns production 3D runtime composition:
  - creates the default `ThreeSceneHost`;
  - creates the default `ThreePresentationController`;
  - creates/registers the active adapters for the five render groups;
  - returns a `ThreeViewRuntime` surface.
- `ThreeViewRuntime` stops importing concrete host/controller/adapters for default construction and requires explicit collaborators or a complete adapter registry from the platform factory/tests.
- `ThreeSceneHost` remains the platform resource owner behind `ThreeSceneHostPlatform`; do not move renderer/camera/controls/animation into the new platform module.
- `ThreeObjectRegistry` remains the object lifetime owner.
- Scene adapters remain DTO-to-Three-object converters; `AxisLabelSceneAdapter` stays active unless replaced deliberately and proven dead.

## Files to change

Production source:

- `frontend/src/rendering/threeView/ThreeViewPlatform.ts` (new)
  - Export `createThreeViewRuntime()` or equivalent production factory.
  - Own the default composition of host, presentation controller, and active scene adapters.
  - May define the ordered adapter/group registry if the runtime becomes data-driven.
- `frontend/src/rendering/threeView/ThreeViewRuntime.ts`
  - Remove imports of concrete `ThreeSceneHost`, `ThreePresentationController`, and concrete scene adapters if production composition moves to `ThreeViewPlatform.ts`.
  - Require explicit host/controller/adapters in constructor, or accept a single typed adapter registry/list supplied by the platform factory.
  - Keep `refresh()` as model-build plus group replacement orchestration.
- `frontend/src/components/panels/ThreeView.vue`
  - Replace direct `new ThreeViewRuntime()` with the new production factory.
  - Preserve shell-local injection, display/selection wiring, world subscription, resize listener, mount/unmount, and disposal.
- `frontend/src/rendering/threeView/ThreeSceneHost.ts`
  - Prefer no behavioral change. Keep `ThreeSceneHostPlatform` as the host's renderer/controls/animation seam.
- `frontend/src/rendering/threeView/ThreeObjectRegistry.ts` and `*SceneAdapter.ts`
  - Change only if needed to align with a typed adapter registry/ownership contract.

Tests:

- `frontend/tests/unit/rendering/threeView/threeViewPlatform.spec.ts` (new)
  - Verify the factory creates a runtime with the expected production composition or adapter group registration without requiring real WebGL.
- `frontend/tests/unit/rendering/threeView/threeViewRuntime.spec.ts`
  - Update for required explicit collaborators or adapter registry/list.
  - Verify all groups are replaced in the selected order.
- `frontend/tests/unit/components/panels/threeViewShellBoundary.spec.ts`
  - Update shell import expectation from `ThreeViewRuntime` to the platform factory.
  - Preserve assertions that the shell has no low-level Three.js imports and that overlay pointer events remain `auto`.
- `frontend/tests/unit/rendering/threeView/threeSceneHost.spec.ts`, `threeObjectRegistry.spec.ts`, `threeSceneAdapters.spec.ts`
  - Preserve and adjust only as needed.

## Files/tests/docs/fixtures to DELETE

Delete, not wrap:

- Concrete default production wiring from `ThreeViewRuntime` once `ThreeViewPlatform.ts` owns it.
- Direct production runtime construction in `ThreeView.vue` once the factory is selected.
- Compatibility constructors/overloads that keep both old constructor-default production composition and new platform-factory composition.
- Stale tests asserting exact old import/default-constructor text rather than the selected platform contract.
- Broad `as any` adapter DTO fixtures when typed fixtures can be introduced as part of the same test cleanup.
- Any dead adapter export discovered by static scan.

Do not delete `AxisLabelSceneAdapter.ts` under current evidence. Do not delete docs/spec/backend/package/tooling files.

## Expected behavior change

No intended user-visible behavior change. The 3D view keeps current rendering, controls, display options, labels, resize behavior, and overlay pointer ownership.

Architectural effect:

- Production 3D runtime composition is named and centralized.
- `ThreeViewRuntime` is pure orchestration and no longer mixes injected seams with concrete default wiring.
- Vue remains a shell and does not gain low-level Three.js imports.

## No-backcompat rationale

The old no-arg runtime production composition is an internal implementation detail, not a compatibility surface. If the platform factory is selected, delete constructor-default production wiring rather than keeping parallel old/new construction paths. Tests should use explicit collaborators; production should use the single factory.

## Validation plan

Capture logs under `architecture-audit/cycle-019-three-scene-host-lifecycle-renderer-platform/validation/`:

1. Static scans before/after for:
   - `new ThreeViewRuntime`, concrete imports in `ThreeViewRuntime.ts`, `createThreeViewRuntime`, `ThreeSceneHostPlatform`, active adapters, `AxisLabelSceneAdapter`, `as any` in threeView tests, and overlay pointer-boundary assertions.
2. Focused Vitest:
   - `npm run test --workspace=frontend -- tests/unit/rendering/threeView/threeViewPlatform.spec.ts tests/unit/rendering/threeView/threeViewRuntime.spec.ts tests/unit/rendering/threeView/threeSceneHost.spec.ts tests/unit/rendering/threeView/threeObjectRegistry.spec.ts tests/unit/rendering/threeView/threeSceneAdapters.spec.ts tests/unit/components/panels/threeViewShellBoundary.spec.ts`
3. Root/frontend lint.
4. Root/frontend full Vitest.
5. Root/frontend build.
6. Root/frontend Playwright e2e, including `current-ui-contract.spec.ts` overlay pointer-boundary coverage.
7. Live preview refresh on `0.0.0.0:5173`, HTTP 200 probe, and browser smoke verifying representative 3D rendering/controls and overlay pointer ownership.

## Risks

- The new platform module can become a god-module if it absorbs host lifecycle, adapter geometry creation, Vue subscriptions, or app-shell project/session ownership. It must remain composition-only.
- Moving production composition can cause broad import churn if overdone. Keep the file set bounded to `threeView` rendering modules, `ThreeView.vue`, and focused tests.
- A data-driven adapter registry can reduce type precision if implemented as loose arrays. Keep group names and DTO adapter types strongly typed.
- Requiring explicit runtime collaborators may make tests verbose. Prefer small typed test builders rather than `as any` shims.
- Any accidental CSS/OrbitControls change could revive the 3D click-through regression or alter controls behavior; validation must protect it.

## Stop conditions

Stop for a reviewed mini-cycle/plan edit if implementation requires:

- Moving world/selection/view-store ownership out of `ThreeView.vue` into a broader app-shell runtime service.
- Changing `ThreePresentationController`, `ThreePresentationSelector`, read ports, or Wave 018 realization contexts beyond consuming current outputs.
- Redesigning SVG/canvas presentation, overlay pointer CSS, OrbitControls behavior, command/undo, persistence, backend, Drive/auth, package/tooling, validation infrastructure, docs/spec, or UI features.
- Introducing a general renderer platform shared by 2D canvas/SVG and Three.js.
- Touching unrelated dirty `Intersections.ts` or `ActionGroup.ts`.

## Recommendation relative to direct proposal

Choose this restructure proposal only if review concludes that constructor-default production composition in `ThreeViewRuntime` is still an architectural smell worth deleting in Wave 019. Otherwise choose the direct proposal, which accepts the current seams and limits implementation to residual hardening/validation.
