# Proposal Direct — Accept and harden the existing explicit runtime/host lifecycle seams

## Summary

Implement Wave 019 directly by converging on the current source shape rather than inventing a broader renderer redesign. The current code already has the essential direct seams: `ThreeViewRuntime` accepts injected host/controller/adapters, `ThreeSceneHost` accepts a platform port for renderer/label renderer/controls/animation/pixel ratio, `ThreeObjectRegistry` owns adapter-created object disposal, and focused host/runtime/registry tests already exist.

The direct implementation should therefore be small and deletion-oriented: preserve the current class boundaries, remove remaining weak test/contract ambiguity, and add only narrowly necessary code/test refinements that make the lifecycle and ownership contract explicit. Do not add a new platform module unless review selects the restructure proposal.

## Current evidence

- `ThreeView.vue` remains a shell that injects the Three presentation port, constructs a runtime, mounts/resizes/refreshes/disposes it, subscribes to world changes, and watches selection/display options (`frontend/src/components/panels/ThreeView.vue:32`, `:41-46`, `:49-72`).
- `ThreeViewRuntime` already defines host/registry/controller/adapter/group/options interfaces and constructor injection while retaining default production collaborators (`frontend/src/rendering/threeView/ThreeViewRuntime.ts:19-68`).
- `ThreeViewRuntime.refresh()` builds the presentation model and replaces the five named registry groups (`frontend/src/rendering/threeView/ThreeViewRuntime.ts:73-80`).
- `ThreeSceneHost` already has `ThreeSceneHostPlatform` for renderer, CSS2D label renderer, controls, request/cancel animation frame, and pixel ratio (`frontend/src/rendering/threeView/ThreeSceneHost.ts:34-55`).
- `ThreeSceneHost` owns camera, renderer, CSS2D DOM, controls, lights, resize, animation, registry disposal, renderer disposal, and label DOM removal (`frontend/src/rendering/threeView/ThreeSceneHost.ts:58-143`).
- `ThreeObjectRegistry` already owns grouped replacement and disposal of geometry/material/material arrays/CSS2D DOM (`frontend/src/rendering/threeView/ThreeObjectRegistry.ts:7-42`).
- Active adapters create owned Three objects from DTOs; `AxisLabelSceneAdapter` is active through `ProjectionPlaneSceneAdapter` and must not be deleted as dead code (`frontend/src/rendering/threeView/ProjectionPlaneSceneAdapter.ts:3-6`, `:25-30`; `frontend/src/rendering/threeView/AxisLabelSceneAdapter.ts:5-31`).
- Existing focused tests already cover runtime orchestration, host lifecycle, registry disposal, adapters, and shell boundary. `threeSceneAdapters.spec.ts` still uses broad `as any` fixtures, which is the clearest residual weak contract.

## Files to change

Production source — only if needed by the narrow hardening work:

- `frontend/src/rendering/threeView/ThreeViewRuntime.ts`
  - Keep the current injected host/controller/adapter contract.
  - Do not add a second production construction path.
  - If implementation inventory finds ambiguity around default composition, add a small exported type/comment or helper local to this file; do not move composition to a new platform module in the direct path.
- `frontend/src/rendering/threeView/ThreeSceneHost.ts`
  - Keep `ThreeSceneHostPlatform` as the only platform resource seam.
  - Clarify idempotent mount/dispose semantics if tests reveal ambiguity.
  - Do not change OrbitControls configuration, CSS2D label pointer behavior, camera defaults, renderer defaults, or animation timing unless a focused lifecycle test proves a bug.
- `frontend/src/rendering/threeView/ThreeObjectRegistry.ts`
  - Preserve registry-owned disposal semantics.
  - Add/clarify ownership comments only if needed; avoid cosmetic churn.
- `frontend/src/rendering/threeView/*SceneAdapter.ts`
  - Keep adapters as DTO-to-Three-object converters.
  - Do not reorganize geometry/material construction unless required to remove weak test contracts or clarify ownership.
- `frontend/src/components/panels/ThreeView.vue`
  - Prefer no production change. Touch only if a small shell-boundary cleanup is necessary and remains limited to mount/unmount/watch/listener/runtime wiring.

Tests:

- `frontend/tests/unit/rendering/threeView/threeSceneAdapters.spec.ts`
  - Replace broad `as any` DTO fixtures with typed fixture builders or `satisfies`-checked DTO objects for projection-plane, planar, reconstructed, guide, and hinge DTOs.
  - Keep representative adapter behavior coverage; do not rewrite the suite into exhaustive visual testing.
- `frontend/tests/unit/rendering/threeView/threeViewRuntime.spec.ts`
  - Preserve current injected collaborator tests. Add a default-composition guard only if implementation changes default construction comments/API.
- `frontend/tests/unit/rendering/threeView/threeSceneHost.spec.ts`
  - Preserve current lifecycle assertions. Add focused assertions only for clarified lifecycle semantics.
- `frontend/tests/unit/rendering/threeView/threeObjectRegistry.spec.ts`
  - Preserve current disposal/idempotence coverage; extend only if a real gap is found.
- `frontend/tests/unit/components/panels/threeViewShellBoundary.spec.ts`
  - Preserve shell and overlay pointer-boundary assertions; update only if source text changes.

## Files/tests/docs/fixtures to DELETE

Delete, not wrap:

- Broad `as any` scene-adapter DTO fixtures when typed DTO fixtures can express the contract.
- Any duplicate/parallel production construction helper introduced during implementation by accident.
- Any stale Vue-mount test helper that inspects host/registry internals now covered by `threeViewRuntime`, `threeSceneHost`, and `threeObjectRegistry` tests.
- Any dead scene-host lifecycle helper or adapter export found by static scan.

Do not delete `AxisLabelSceneAdapter.ts` under current evidence. Do not delete docs/spec/backend/package/tooling files.

## Expected behavior change

No intended user-visible behavior change. The 3D view should keep the same display options, projection planes, grids, axes/labels, planar elements, reconstructed elements, guides, hinges, resize behavior, OrbitControls behavior, CSS2D labels, and overlay pointer ownership.

Internal effect:

- The existing runtime/host/registry seam becomes the accepted direct Wave 019 architecture.
- Adapter tests stop relying on broad `as any` DTO shims where typed fixture contracts are practical.
- Lifecycle/disposal ownership remains explicit and validated without broad redesign.

## No-backcompat rationale

This wave is internal architecture. If a weak test shim, duplicate helper, or stale private construction path conflicts with the accepted direct seam, delete it rather than preserving compatibility. The current injected runtime/host platform seam is the single direct path; do not keep parallel old/new construction wrappers.

## Validation plan

Capture logs under `architecture-audit/cycle-019-three-scene-host-lifecycle-renderer-platform/validation/`:

1. Static scans before and after implementation for:
   - `new ThreeViewRuntime`, `ThreeViewRuntimeOptions`, `ThreeSceneHostPlatform`, `requestAnimationFrame`, `cancelAnimationFrame`, `CSS2DRenderer`, `OrbitControls`, `ThreeObjectRegistry`, `AxisLabelSceneAdapter`, and `as any` in `frontend/tests/unit/rendering/threeView/`.
   - `three-view-overlay` pointer assertions in unit/e2e tests.
2. Focused Vitest:
   - `npm run test --workspace=frontend -- tests/unit/rendering/threeView/threeViewRuntime.spec.ts tests/unit/rendering/threeView/threeSceneHost.spec.ts tests/unit/rendering/threeView/threeObjectRegistry.spec.ts tests/unit/rendering/threeView/threeSceneAdapters.spec.ts tests/unit/components/panels/threeViewShellBoundary.spec.ts`
3. Root/frontend lint where defined:
   - `npm run lint`
   - `npm run lint --workspace=frontend`
4. Full root/frontend Vitest:
   - `npm run test`
   - `npm run test --workspace=frontend`
5. Root/frontend build:
   - `npm run build`
   - `npm run build --workspace=frontend`
6. Root/frontend Playwright e2e:
   - `npm run test:e2e`
   - `npm run test:e2e --workspace=frontend`
   - Must include the current overlay pointer-boundary test in `frontend/tests/e2e/current-ui-contract.spec.ts:89-117`.
7. Live preview refresh:
   - Start/refresh `npm run dev --workspace=frontend -- --host 0.0.0.0`.
   - Capture HTTP 200 from `http://127.0.0.1:5173/`.
   - Run browser smoke proving the app shell, SVG canvas, 3D overlay/panel, controls, and representative 3D content render; verify overlay still owns pointer hit-testing.

## Risks

- The direct path may be too small if reviewers want production composition separated from constructor defaults. If so, select the restructure proposal instead.
- Over-editing already-good lifecycle code can introduce animation leaks or OrbitControls regressions. Keep changes minimal and validation broad.
- Typed adapter fixtures can become verbose; use focused builders rather than large snapshot-like DTO dumps.
- Static/source-control noise in the workspace can hide unrelated changes. Use path-scoped status/diff and stage only selected Wave 019 files.

## Stop conditions

Stop and request a reviewed mini-cycle/plan edit if implementation requires:

- Domain realization/read-context changes or raw `World`/`any` realization seams.
- App-shell project/session lifecycle redesign, canvas presentation redesign, command/undo, persistence, backend, Drive/auth, package/tooling, validation-platform, docs/spec, or UI-feature work.
- User-visible OrbitControls, overlay CSS/pointer, option semantics, or rendering behavior changes.
- A new broad renderer service/facade or general rendering platform shared with SVG/canvas.
- Touching unrelated dirty `Intersections.ts` or `ActionGroup.ts` for compile/test success.

## Recommendation

Prefer this direct proposal if review agrees that the current source already contains the intended Wave 019 seam and only needs contract hardening plus full validation. If review wants production composition to be named outside `ThreeViewRuntime` constructor defaults, choose the restructure proposal.
