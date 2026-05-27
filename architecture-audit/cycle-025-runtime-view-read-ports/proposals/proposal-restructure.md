# Proposal Restructure — Introduce a view-query bundle boundary before removing concrete World injection

## Summary

This alternative asks whether Wave 025 should solve the read seam one conceptual layer higher than component-specific injection keys: create a small application-level **runtime view query bundle** composed of behavior modules, then provide only those modules to Vue. The bundle is not a generic `WorldViewFacade`; it is a typed composition root for named view/query services owned by `RuntimeSession`.

Compared with the direct proposal, this creates an explicit `application/viewRead` (or similar) layer to concentrate DTO mapping, change subscriptions, and read-model construction before components consume it. It may be preferable if the team wants stronger boundaries and easier boundary tests, but it has higher implementation breadth.

## Conceptual target

Add a new application-layer boundary, for example:

- `frontend/src/application/viewRead/RuntimeViewReadPorts.ts`
- `frontend/src/application/viewRead/RuntimeViewReadBundle.ts`
- `frontend/src/application/viewRead/CanvasViewReadService.ts`
- `frontend/src/application/viewRead/ProcessTreeViewReadService.ts`
- `frontend/src/application/viewRead/ElementsPanelViewReadService.ts`
- `frontend/src/application/viewRead/ThreeViewReadService.ts`
- `frontend/src/application/viewRead/ActivePlaneSelectorService.ts`

`RuntimeSession` constructs the bundle from its private `World` and exposes the bundle or individual bundle members to `AppShellRuntime`. Vue receives only typed behavior services. Domain-heavy realization and process-tree translation stay in this application read layer rather than inside Vue components.

## Files to change

### New application read layer

- New `frontend/src/application/viewRead/` directory (name can be adjusted during implementation) with:
  - Shared subscription/change-invalidation type.
  - DTO types for element lists, process-tree node view data, active-plane options, canvas view operations, and three presentation port wrapper.
  - Service factories that adapt from `World` to behavior-sized read/query services.
- Optional boundary tests for this directory to prevent imports from Vue components back into `domain/world/World` through injection.

### Existing app-shell/runtime files

- `frontend/src/application/appShell/RuntimeSession.ts`
  - Create one `runtimeViewReadBundle()` or separate service factories from private `world`.
  - Delete `worldForView()` once bundle services replace consumers.
- `frontend/src/application/appShell/AppShellRuntime.ts`
  - Stop returning `world`.
  - Return either `viewRead` bundle or individual behavior services.
  - Initialize active-plane state through existing/new port, not direct `world.getActivePlaneId()`.
- `frontend/src/application/appShell/RuntimeInjectionKeys.ts`
  - Delete `WorldInjectionKey<World>`.
  - Add injection key(s) for the view-read bundle or bundle members. Prefer member keys if the bundle would be too broad for component access.
- `frontend/src/App.vue`
  - Provide view-read services/bundle members instead of `runtime.world`.

### Consumers

- `frontend/src/components/workspace/SvgCanvas.vue`
  - Consume canvas view service, not `World`.
- `frontend/src/components/panels/ActionsPanel.vue`
  - Consume process-tree view service and existing process-history command port.
- `frontend/src/components/panels/ProcessTreeNode.vue`
  - Consume/receive process-node DTOs and node helper functions, not `World`.
- `frontend/src/components/panels/ElementsPanel.vue`
  - Consume elements-panel view service and visibility intent.
- `frontend/src/components/panels/ThreeView.vue`
  - Consume three-view read service from the view-read layer.
- `frontend/src/components/toolbars/PlaneSelector.vue`
  - Consume active-plane selector service.

### Existing presentation modules

- `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts`
- `frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts`
- `frontend/src/application/canvasPresentation/CanvasVisibilityPolicy.ts`
- `frontend/src/application/threePresentation/ThreeWorldReadPort.ts`

Move component-local adapter creation into `application/viewRead`. Narrow adapter interfaces opportunistically only where it does not trigger domain realization redesign.

## Files/tests/docs/fixtures to DELETE

Same deletion goal as the direct proposal:

- Delete `RuntimeSession.worldForView()`.
- Delete `AppShellRuntime.world` return path.
- Delete `App.vue` concrete `WorldInjectionKey` provider.
- Delete `WorldInjectionKey: InjectionKey<World>` and all concrete-world view injections.
- Delete `ProcessTreeNode.vue` `world: World` prop and recursive forwarding.
- Delete component-side `world.getVersion()` polling replaced by bundle subscriptions.
- Delete component-side `createCanvasWorldReadPort(world)` and `createThreeWorldReadPort(world)`.
- Delete direct elements-panel `any`/`instanceof` formatting and visibility mutation once DTO service owns it.
- Delete tests expecting raw world exposure.
- Delete any transitional bundle member that simply mirrors `World` wholesale.

Do not delete or rewrite command producers, persistence schema/replay, `ProjectService`, backend, docs/specs, package scripts, Drive/auth, validation platform, or broad domain realization internals.

## Expected behavior change

Functional behavior should remain equivalent to current UI behavior. Architectural behavior changes are stronger than the direct proposal:

- Vue no longer depends on the domain root for read/rendering.
- DTO mapping and read behavior live in an application view-read layer instead of being scattered across components.
- Boundary tests can assert that components consume view-read contracts and do not import `World` through runtime injection.
- `RuntimeSession` remains the owner of `World` and constructs view-read services from it.

## Advantages over direct proposal

- Centralizes all view-read translation in one layer, reducing repeated subscription/version logic and making future cleanup easier.
- Makes it harder for components to accumulate domain traversal after `WorldInjectionKey` is deleted.
- Gives process-tree node DTO preparation a natural home, avoiding a bloated `ActionsPanel.vue`.
- Gives elements-panel grouping/formatting and visibility behavior a proper application service boundary.

## Disadvantages / risks

| Risk | Why it matters | Mitigation |
| --- | --- | --- |
| Bundle becomes a broad facade | A single `viewRead` object could mirror `World` under a new name. | Expose member services with behavior-specific interfaces; boundary tests reject generic world-like methods. |
| Larger file churn | New directory and DTO services touch more files than direct injection replacement. | Keep services thin adapters; no domain realization or command redesign. |
| Over-abstracting renderer adapters | Canvas/Three already have presentation read ports; an added layer can duplicate them. | Treat view-read layer as composition/adaptation only; do not duplicate renderer host logic. |
| Process-tree DTO mapping is non-trivial | Descriptions/infeasibility currently call domain functions with `World`. | Start with DTO/helper service methods for exactly current component needs; stop for plan edit if domain realization redesign is required. |

## Validation plan

Same mandatory validation as direct proposal, plus one additional boundary assertion:

1. Static/boundary test for `application/viewRead` ownership: Vue components may import view-read contracts/injection keys but must not inject/import concrete `World` for scoped rendering/panel reads.
2. Static scans proving no production `worldForView`, no concrete `WorldInjectionKey`, no `inject(WorldInjectionKey)`, no `provide(WorldInjectionKey)`, no component-local `createCanvasWorldReadPort(world)` / `createThreeWorldReadPort(world)`, and no scoped component `world.getVersion()` polling.
3. Focused Vitest for each view-read service and updated components.
4. Root/frontend lint, full Vitest, build, Playwright e2e, live preview refresh/probe, and focused live smoke as listed in the scope-check.

## No-backcompat rationale

The concrete world view seam is internal architecture debt. A view-read bundle must replace it, not coexist with it. Keeping `WorldInjectionKey` or a broad compatibility facade would preserve the same leak under a new name and should be rejected.

## Stop conditions for broader redesign

Stop and request a reviewed plan edit if:

- process-node descriptions/infeasibility cannot be represented without redesigning domain realization contracts;
- elements visibility must become command-backed/persisted differently to preserve behavior;
- canvas/three read-model narrowing requires changing realization ownership or renderer host lifecycles;
- any command, persistence, backend, Drive/auth, docs/specs, tooling, or application-kernel redesign becomes necessary.

## Recommendation

Prefer `proposal-direct.md` unless reviewers want the stronger new `application/viewRead` layer now. The direct proposal can still keep service factories small and behavior-sized in existing app-shell/application modules. Choose this restructure only if the review decides that placing DTO mapping in a named view-read layer is worth the extra breadth and is necessary to prevent a broad `World` facade from reappearing.
