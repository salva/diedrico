# Cycle 025 Corrections Round 01 — proposal-direct.md

## Purpose

This correction round edits `proposals/proposal-direct.md` in place to address the two blocking issues raised in `reviews/round-01-review.md` before review round 02. It is a planning-only correction: no production source, tests, package/tooling, backend, docs/specs, secret/config, or implementation files were changed.

## Source-control and scope hygiene

- The repository is broadly dirty outside this task; the correction used path-scoped diff/status discipline and did not revert unrelated work.
- Protected secret/config contents were not read.
- Edited artifact: `architecture-audit/cycle-025-runtime-view-read-ports/proposals/proposal-direct.md`.
- Added artifact: `architecture-audit/cycle-025-runtime-view-read-ports/corrections-round-01.md`.
- `proposal-restructure.md` was left unchanged because the review accepted it as an accurate fallback and the required blockers concerned the preferred direct proposal only.

## Blocker 1 — PropertiesDialog ownership

### Review blocker

Round 01 found that `SvgCanvas.vue` still forwards `:world="world"` into `PropertiesDialog.vue`, while `proposal-direct.md` only mentioned a vague "properties read seam". The proposal therefore overclaimed raw-World seam removal unless the dialog was explicitly included or formally deferred.

### Evidence reread

- `frontend/src/components/workspace/SvgCanvas.vue` injects `WorldInjectionKey` and passes the concrete world to `<PropertiesDialog :world="world" ...>`.
- `frontend/src/components/dialogs/PropertiesDialog.vue` declares `world: World | null`, imports `World`, imports multiple domain subclasses, and reads element type, plane id, coordinates, dependencies, and placeholder style/default data through the raw world prop.

### In-place correction

`proposal-direct.md` now includes `PropertiesDialog.vue` in Wave 025 scope rather than deferring it. The proposal now requires:

- `RuntimeSession` to expose `propertiesReadPort()` or a `properties` member on `canvasViewPort()` for read-only dialog view data and current save payload construction.
- `SvgCanvas.vue` to pass that narrow properties contract to the dialog instead of `:world="world"`.
- `PropertiesDialog.vue` to delete the `world: World | null` prop, the `World` import, and concrete domain imports used for dialog read formatting.
- The replacement contract/view model to contain only UI-shaped fields: `elementLabel`, `elementType`, optional `planeId`, optional `coordinates`, `dependencies`, optional `createdBy`, current/default visual style values, and editable-style flags.
- The style save event to remain a narrow style-change payload without adding domain mutation, command-history changes, or persistence semantics.

### Consistency updates

The files-to-change section, DELETE list, tests, validation plan, risks, stop conditions, expected behavior, and no-backcompat rationale now all mention the properties dialog explicitly. The updated delete list covers both `PropertiesDialog.vue` raw-world imports/prop and `SvgCanvas.vue` prop forwarding, so Wave 025 can truthfully claim removal of the production raw-World view seam if implemented.

## Blocker 2 — ProcessTreeNode read-model design

### Review blocker

Round 01 found that `ProcessTreeNode.vue` could not be verified to lose its `World` prop because the proposal only said to use DTO/read-model fields. The reviewer required a concrete behavior-level replacement shape and an explicit ban on hidden world-like helper facades.

### Evidence reread

- `frontend/src/components/panels/ActionsPanel.vue` injects `WorldInjectionKey`, obtains `getProcessTree()`, subscribes to world/tree changes, passes `:world="world"` recursively, and calls `world.getDependencyService()` for related actions.
- `frontend/src/components/panels/ProcessTreeNode.vue` declares `world: World`, forwards it recursively, calls `getActionDescriptionParts(props.node, props.world)`, uses `getElement2D`, `getElement3DById`, `getProjectionPlaneById`, and calls `element.realize2D(props.world)` for infeasibility.

### In-place correction

`proposal-direct.md` now requires `ActionsPanel.vue` to subscribe to a process-tree read model from `ProcessTreeReadInjectionKey` and pass parent-prepared process-node view models to `ProcessTreeNode.vue`. It also moves related-action lookup behind the process-tree read port so Vue no longer calls `world.getDependencyService()`.

The replacement `ProcessNodeViewModel` shape is specified at behavior level:

- structural fields for current rendering/controls: `id`, `type`, subprocess `name`, `children`, `showIntermediates`, `isOutput`, `isAuxiliary`, and action `elementId` where highlight/selection behavior still needs it;
- action display fields prepared by the read port: `descriptionParts`, `isInfeasible`, and `hideBecauseElementMissing` or equivalent;
- optional label/reference data only when the template needs it.

The proposal now explicitly forbids adding generic world traversal or world-like helpers to `ProcessTreeReadPort`, `ProcessNodeViewModel`, or props passed to `ProcessTreeNode.vue`, including `getElement2D`, `getElement3DById`, `getProjectionPlaneById`, `realize2D`, `getActionDescriptionParts(node, world)`, `getDependencyService`, and `getAll*` helpers. If implementation cannot prepare the DTOs without those helpers, the proposal requires stopping for a plan edit instead of smuggling a `World` facade into the port.

### Consistency updates

The files-to-change section, DELETE list, tests, validation plan, risks, stop conditions, and no-backcompat rationale now reflect the concrete process-tree replacement shape and the anti-facade rule. Static/boundary validation now includes checks that process-tree read ports/view models do not expose generic traversal helpers.

## Review-round-02 recommendation

The two round-01 blockers have been corrected in the preferred direct proposal without broadening the wave beyond bounded runtime rendering/view read ports. This stage should proceed to `cycle-025-review-round-02` for a second review of the corrected proposal.
