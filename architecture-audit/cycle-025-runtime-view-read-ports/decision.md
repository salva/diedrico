# Cycle 025 Decision — Runtime view/read ports for rendering and panels

## Decision status

Cycle 025 is approved to proceed to implementation.

Selected implementation path: **`proposals/proposal-direct.md`**.

Rejected alternative: **`proposals/proposal-restructure.md`** remains a fallback only and is not selected for this cycle.

This decision is binding for the next implementation stage. It is a planning/decision artifact only: no production source, tests, package/tooling, backend, docs/specs, secret/config, or implementation changes are made in this stage.

## Evidence inspected

The decision was made after inspecting the scoped Cycle 025 artifacts:

- `architecture-audit/cycle-025-runtime-view-read-ports/scope-check.md`
- `architecture-audit/cycle-025-runtime-view-read-ports/proposals/proposal-direct.md`
- `architecture-audit/cycle-025-runtime-view-read-ports/proposals/proposal-restructure.md`
- `architecture-audit/cycle-025-runtime-view-read-ports/reviews/round-01-review.md`
- `architecture-audit/cycle-025-runtime-view-read-ports/corrections-round-01.md`
- `architecture-audit/cycle-025-runtime-view-read-ports/reviews/round-02-review.md`
- Wave 025 entry in `architecture-audit/wave-plan.md`

Current source-control evidence was captured before writing this decision:

- `architecture-audit/cycle-025-runtime-view-read-ports/decision-status.stdout.log`
- `architecture-audit/cycle-025-runtime-view-read-ports/decision-status.stderr.log`
- `architecture-audit/cycle-025-runtime-view-read-ports/decision-scoped-source-diff.stdout.log`
- `architecture-audit/cycle-025-runtime-view-read-ports/decision-scoped-source-diff.stderr.log`

The status sample confirms the repository remains broadly dirty with many unrelated historical audit, stage, frontend, and deleted-template paths. The scoped source diff for the Cycle 025 implementation paths was empty at decision time. The implementation stage must continue path-scoped hygiene and must not revert, normalize, or incorporate unrelated dirty worktree changes.

Protected secret/config contents were not read.

## Review convergence

Review convergence is complete.

Round 01 review found two blocking issues in the preferred direct proposal:

1. **PropertiesDialog ownership was not reconciled.** `SvgCanvas.vue` currently forwards a concrete `World` into `PropertiesDialog.vue`, so the proposal could not truthfully claim removal of the production raw-World view seam unless the dialog seam was explicitly included or formally deferred.
2. **ProcessTreeNode read-model shape was too vague.** `ProcessTreeNode.vue` currently receives `world: World` and performs domain/world lookups for action descriptions, infeasibility, and element/projection-plane reads; the proposal needed a concrete DTO shape and a ban on hidden world-like helper facades.

`corrections-round-01.md` records that `proposal-direct.md` was edited in place to resolve both blockers:

- `PropertiesDialog.vue` is now explicitly in scope; its `world: World | null` prop and concrete domain read formatting must be removed and replaced by a narrow properties/style read contract or parent-prepared view model.
- `ProcessTreeNode.vue` must receive parent-prepared `ProcessNodeViewModel` data with display fields such as `descriptionParts`, `isInfeasible`, and `hideBecauseElementMissing`/equivalent, and the proposal explicitly forbids generic world traversal helpers on the read port or node view model.

Round 02 review returned **NO BLOCKING ISSUES** and recommended proceeding to decision with `proposal-direct.md` as the preferred path. It scored the direct proposal highest because it solves the bounded runtime/view seam without introducing an unnecessary new top-level read layer.

## Rationale for selecting `proposal-direct.md`

`proposal-direct.md` is selected because it directly advances Wave 025's target outcome: delete the remaining concrete `World` read seam from runtime/view wiring and replace it with behavior-sized read/view ports owned by the runtime/session boundary.

The selected path is preferred over `proposal-restructure.md` because:

- it removes `RuntimeSession.worldForView()`, `AppShellRuntime.world`, and `WorldInjectionKey<World>` without adding broader structural churn;
- it covers every known production consumer in the scoped seam, including child-prop leaks through `PropertiesDialog.vue` and `ProcessTreeNode.vue`;
- it keeps the implementation bounded to app-shell/view/read-port ownership instead of creating a new `application/viewRead` layer before necessity is proven;
- it better matches the no-backcompat priority by deleting the raw-world path instead of preserving parallel raw-world and port paths;
- its stop conditions are explicit if implementation evidence shows a deeper domain realization or generic read facade is required.

`proposal-restructure.md` is rejected for this cycle because its new view-query bundle layer is broader than necessary and risks becoming a framework-like or world-like facade. It may be reconsidered only through a reviewed plan/proposal edit if implementation proves the direct approach cannot keep behavior-sized boundaries sharp.

## Binding implementation scope

The implementation stage must follow `proposal-direct.md` exactly, subject to this decision's constraints.

### Runtime and app-shell ownership

`RuntimeSession` remains the sole owner of the concrete `World` for view/read adaptation. It may construct behavior-sized ports from its private world, but it must not return or provide the concrete world to Vue descendants.

Required runtime/app-shell changes:

- Delete `RuntimeSession.worldForView()` once all production view consumers are ported.
- Stop `AppShellRuntime` from calling `session.worldForView()`.
- Delete the `world` field from the app-shell runtime return shape.
- Replace `App.vue`'s `provide(WorldInjectionKey, runtime.world)` with named behavior-sized read/view port providers.
- Delete `WorldInjectionKey: InjectionKey<World>` when no production view consumer remains.
- Add typed injection keys for named behavior ports, such as canvas view, process-tree read, elements-panel, three-presentation, and active-plane selector ports.

### Required behavior-sized ports

The implementation must provide narrow, named contracts for current UI behavior only:

- **Canvas view/read port:** canvas presentation data, input transform/active-plane read data, hover/label lookup, screen-to-3D support, query support, and change subscription/invalidation.
- **Properties read/style port or canvas properties member:** read-only geometry/style/default data for `PropertiesDialog.vue`, plus the existing narrow style-save payload shape. It must not expose `World`, raw elements, generic lookup helpers, direct domain mutation, command-history changes, or persistence semantics.
- **Process-tree read port:** current tree/read subscription, related-action lookup from selected ids, and parent-prepared process-node view models.
- **Elements-panel port:** grouped element-list DTOs, change subscription, and named visibility toggle intent preserving current behavior.
- **Three-presentation port:** three-view presentation read model and change subscription/invalidation supplied by runtime rather than created inside the Vue component.
- **Active-plane selector port:** plane options, active-plane id/label, set-active-plane behavior, and change subscription/invalidation.

### Component migration requirements

The implementation must remove concrete `World` injection/prop use from these production view surfaces:

- `frontend/src/components/workspace/SvgCanvas.vue`
- `frontend/src/components/dialogs/PropertiesDialog.vue`
- `frontend/src/components/panels/ActionsPanel.vue`
- `frontend/src/components/panels/ProcessTreeNode.vue`
- `frontend/src/components/panels/ElementsPanel.vue`
- `frontend/src/components/panels/ThreeView.vue`
- `frontend/src/components/toolbars/PlaneSelector.vue`

Specific component requirements:

- `SvgCanvas.vue` must inject the canvas view/read port and existing command producer port, not `WorldInjectionKey`; it must replace direct active-plane reads, plane transform enumeration, label lookup, component-local `createCanvasWorldReadPort(world)`, `screenTo3D(..., world)`, and world-version polling with port operations/subscriptions.
- `PropertiesDialog.vue` must delete the `world: World | null` prop and concrete world/domain imports used for dialog read formatting. It must receive a narrow properties/style contract or parent-prepared `PropertiesDialogViewModel` containing only fields needed by the current UI: label/type, optional plane/coordinates/dependencies/created-by, style values/defaults, and editable flags.
- `ActionsPanel.vue` must use the process-tree read port for tree state and related-action lookup while continuing to use the existing process-history command port for commands.
- `ProcessTreeNode.vue` must delete the `world` prop and recursive `:world="world"` forwarding. It must render from behavior-level `ProcessNodeViewModel` data rather than calling `getActionDescriptionParts(..., world)`, element lookups, projection-plane lookups, `realize2D(world)`, dependency service reads, or other world-style helpers.
- `ElementsPanel.vue` must render grouped DTOs from its port, replace polling with subscription, and replace direct visual-style mutation plus `world.markDirty()` with a named visibility toggle method on the port.
- `ThreeView.vue` must consume a runtime-provided three-presentation port, not inject world or call `createThreeWorldReadPort(world)` locally.
- `PlaneSelector.vue` must consume the active-plane selector port, not inject world or poll `world.getVersion()`.

## Delete list

The implementation must delete, not wrap, these legacy surfaces when all consumers are moved:

- `RuntimeSession.worldForView()`.
- `AppShellRuntime` returned `world` field.
- `App.vue` `provide(WorldInjectionKey, runtime.world)`.
- `WorldInjectionKey: InjectionKey<World>` and its concrete `World` import.
- `inject(WorldInjectionKey)` in scoped production view consumers.
- `SvgCanvas.vue` forwarding of concrete world into `PropertiesDialog.vue`.
- `PropertiesDialog.vue` `world: World | null` prop and concrete world/domain imports used only for read formatting.
- `ActionsPanel.vue` direct world injection and direct dependency-service reads.
- `ProcessTreeNode.vue` `world` prop and recursive forwarding.
- Component-side 100ms `world.getVersion()` polling in the scoped consumers where replaced by subscriptions.
- Vue-component calls to `createCanvasWorldReadPort(world)` and `createThreeWorldReadPort(world)`.
- `ElementsPanel.vue` `any` element formatting and concrete `instanceof` grouping where DTOs cover the current UI.
- Direct elements-panel visibility mutation through raw element lookup plus `world.markDirty()`.
- Tests that assert concrete world injection/return, `PropertiesDialog.vue` raw world props, or `ProcessTreeNode.vue` raw world props remain available.
- Any transitional broad facade, duplicate raw-world plus port path, or compatibility shim created during implementation.

## Forbidden replacements and anti-facade rules

The implementation must not replace `WorldInjectionKey` with a generic `WorldViewFacade`, string-key catch-all, service locator, untyped map, or broad bundle that mirrors `World` methods.

The following methods/behaviors are explicitly forbidden on Vue-facing process-tree ports, process-node DTOs, properties contracts, or component props:

- `getElement2D`
- `getElement3DById`
- `getProjectionPlaneById`
- `getDependencyService`
- generic `getAll*` world traversal helpers
- raw `realize2D` helpers
- `getActionDescriptionParts(node, world)` or any equivalent that requires a component to pass a domain root/context
- direct raw-domain mutation methods

Raw `World` and raw domain traversal may remain localized inside `RuntimeSession` or small application adapters only as implementation detail for preparing behavior-sized DTOs/read models.

## Protected out-of-scope surfaces

The implementation must not modify, redesign, or opportunistically clean up these surfaces unless a reviewed delta proposal is approved first:

- command producers, command descriptors, command serialization/replay, undo/redo semantics, and `CommandStack`;
- persistence schema, persistence DTOs, project replay, `ProjectService`, Drive sync, auth, browser/storage adapters, and backend/frontend contracts;
- backend code, docs/spec reconciliation, debug/placeholder cleanup, package scripts, dependency/tooling configuration, validation-platform hardening, and Playwright/tooling infrastructure;
- broad domain realization redesign, process-tree ownership redesign, element id model redesign, application-kernel rewrite, renderer host lifecycle redesign, or store architecture rewrite;
- stale audit-history mining or unrelated historical cycle artifacts.

## Validation requirements for the implementation stage

The implementation stage must capture full stdout/stderr logs under:

`architecture-audit/cycle-025-runtime-view-read-ports/validation/`

Minimum required validation:

1. Pre/post status and scoped diff logs.
2. Static scans proving absence of production `worldForView`, `WorldInjectionKey: InjectionKey<World>`, `inject(WorldInjectionKey)`, `provide(WorldInjectionKey)`, `PropertiesDialog.vue` raw world prop/import, `ProcessTreeNode.vue` raw world prop, scoped component `world.getVersion()` polling, component-local `createCanvasWorldReadPort(world)`, and component-local `createThreeWorldReadPort(world)`.
3. Static/boundary scans or tests proving Vue-facing process-tree read models do not expose generic world traversal helpers or raw realization helpers.
4. Focused Vitest covering app-shell runtime/read-port wiring, canvas presentation/input/hover/coordinate behavior, properties-dialog view-model/style payload behavior, process-tree read-model/render behavior, elements list/visibility behavior, plane selector read/write behavior, three-view refresh, and command-history regression.
5. `npm run lint` at the root and per workspace where defined.
6. Full Vitest at the root and frontend/workspace level where scripts are defined.
7. `npm run build` at the root and per workspace where defined.
8. Playwright/e2e because rendering, panels, properties dialog, plane selector, and 3D view are user-observable.
9. Live preview refresh bound to `0.0.0.0`, HTTP reachability probe, and credential-free live smoke covering canvas render/hit/hover, properties dialog open/read/save-cancel, elements visibility toggle, actions panel rendering, plane selector switching, 3D refresh, and undo/redo regression through the existing command-history path.

If any validation command fails for reasons attributable to the implementation, the wave is not complete. If Playwright/e2e or live preview smoke is skipped, the implementation log must state an explicit justification; unjustified skips reject the wave.

## Stop conditions

Stop implementation and request a reviewed plan/proposal edit if any of these become necessary:

- preserving `WorldInjectionKey`, `worldForView()`, `runtime.world`, or a duplicate raw-world path for production view compatibility;
- adding a generic world-like facade, broad view bundle, string-key catch-all, or Vue-facing traversal API to make migration easier;
- changing command, undo/redo, persistence, replay, backend, Drive/auth, package/tooling, docs/specs, or validation-platform behavior;
- redesigning domain realization contexts, process-tree ownership, element id semantics, renderer host lifecycle, store architecture, or the application kernel;
- failing to prepare properties-dialog or process-tree DTOs without exposing raw world-style helpers;
- needing to touch unrelated dirty source paths to make the selected proposal work.

## Residual risks accepted for implementation

- Process-node DTO preparation may be non-trivial because current descriptions and infeasibility checks are domain-heavy. This risk is accepted only under the anti-facade rules above.
- Properties-dialog view data may require careful shaping to preserve current style/default behavior without raw domain imports. This is in scope, but direct mutation, command-history changes, and persistence redesign are not.
- Canvas and three adapters may still contain internal domain coupling after this wave. That is acceptable if the raw coupling is localized inside runtime/application adapters and no longer exposed to Vue descendants.
- Elements visibility remains current behavior behind a named port intent, not a broader command-backed redesign. If command semantics prove required, stop for a reviewed plan edit.
- The repository is broadly dirty before implementation. The implementation stage must isolate its changes and must not repair or incorporate unrelated worktree state.

## Source-control hygiene for the next stage

The implementation stage must:

- inspect status and scoped diffs before editing;
- touch only files required by the selected implementation scope and associated focused tests/logs;
- avoid reading protected secret/config/provider/env/token/credential/history files;
- not switch branches, rebase, push, or restore unrelated changes;
- not modify backend/docs/specs/package/tooling or unrelated frontend source unless a stop condition triggers a reviewed delta proposal;
- commit only the implementation files it actually changes.

## Next-stage recommendation

Because review round 02 returned **NO BLOCKING ISSUES**, the next stage should be:

`cycle-025-implement-runtime-view-read-ports`

Recommended objective: implement `proposal-direct.md` under the constraints in this decision, then run the full Cycle 025 validation and live preview refresh protocol.
