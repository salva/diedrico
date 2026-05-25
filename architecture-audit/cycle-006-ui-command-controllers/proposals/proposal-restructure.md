# Proposal Restructure — Application construction use-cases above tool controllers

## Summary

This proposal asks whether the fix belongs one conceptual layer higher than direct tool-controller extraction. It does: the durable abstraction should be **application construction use-cases** with thin tool controllers/adapters. Tool controllers translate UI interaction state into use-case requests, while construction use-cases own command assembly and process-tree action semantics. This is still a **006a-only candidate** and is procedurally blocked until a reviewed wave-plan edit formalizes 006a canvas/tool use-cases/controllers and 006b panel/toolbar intent cleanup as separate dependent waves.

## Gating status

- **Implementation readiness:** blocked under the current single Wave 006 plan entry.
- **Required next step:** run a reviewed wave-plan edit/decision that splits Wave 006 into 006a canvas/tool construction use-cases/controllers and 006b panel/toolbar command-intent cleanup.
- **Current proposal scope:** 006a only; `ActionsPanel.vue` and `Toolbar.vue` are explicit 006b targets, not optional leftovers.
- **Reason:** the higher-level construction-use-case boundary should be proven first on the canvas/tool construction surface; panel process-history edits and toolbar example/debug setup require separate use-case concepts and validation.

## Target outcome

- Vue components emit user events and render state.
- Tool classes/controllers collect arguments and produce typed construction requests.
- Application use-cases such as `createFreePoint`, `createLineByTwoPoints`, `createGuideWithSibling`, `createIntersection`, `createAuxiliaryProjectionPlane`, `moveFreePoint`, and `updateElementStyle` own validation orchestration, sequence factories, command lifecycle, and process-tree grouping.
- Low-level `commands/operations/**` remains the command contract layer from Wave 004; UI and tool interaction modules do not import concrete operations.

## Why this is higher than direct extraction

The current leaks are not only in Vue components. `ITool` declares that tools translate input into commands and execute via the stack (`frontend/src/tools/ITool.ts:4-13`), `ArgumentCollectorTool` creates and pushes `Command`s (`frontend/src/tools/ArgumentCollectorTool.ts:138-155`), and concrete tools create action groups/actions and call factories (`frontend/src/tools/PointTool.ts:78-85`, `frontend/src/tools/GuideTool.ts:101-127`, `frontend/src/tools/IntersectionTool.ts:98-173`). A direct per-tool controller would remove imports but could preserve scattered construction semantics in many controllers. A use-case layer consolidates the repeated command/action-group pattern and makes controllers thin.

## Files to change in 006a

### New use-case layer

- Add `frontend/src/application/construction/` with focused use-cases:
  - `createFreePoint.ts`
  - `createLine.ts`
  - `createSegment.ts`
  - `createCircle.ts`
  - `createGuide.ts`
  - `createIntersection.ts`
  - `createProjectionPlane.ts`
  - `create3DPoint.ts`, `create3DLine.ts`, `create3DSegment.ts`, `create3DPlane.ts`
  - `moveFreePoint.ts`
  - `updateElementStyle.ts`
- Add a shared `ConstructionCommandRunner` that owns command creation, action-group creation policy, commit/rollback, feasibility check, and `CommandStack.push`.
- Move/rewrite selected `frontend/src/commands/factories/**` and `frontend/src/services/factories/PlaneSequenceFactory.ts` as private construction-use-case helpers or keep them as operation-sequence helpers only under a single application-owned namespace.

### Thin tool/controller adapters

- Add `frontend/src/application/tools/` adapters that map collected arguments to construction-use-case requests and return user-facing messages/completion instructions.
- Refactor `frontend/src/tools/**` to retain interaction state only: argument specs, masks, hit-test-compatible validators, and status messages.
- Refactor `SvgCanvas.vue` to call a controller/use-case facade for tool completion, style update, and point movement.

### Explicitly out of 006a / required new 006b

- `ActionsPanel.vue` process-tree stack/edit use-cases are a separate process-history application surface and must be captured in the formal 006b plan entry before 006a implementation begins.
- `Toolbar.vue` Alt+E example setup should become either a construction-example use-case or be deleted as debug/example functionality; this separate cleanup must be captured in the formal 006b plan entry before 006a implementation begins.

## Explicit DELETE list

- Delete UI/tool imports of concrete operations for the 006a canvas/tool path.
- Delete open-command APIs from tool interaction types.
- Delete command lifecycle code from `ArgumentCollectorTool`.
- Delete duplicate sequence-factory namespace split between `commands/factories` and `services/factories` for construction use-cases addressed in 006a.
- Delete or privatize factories that are just application use-case internals; do not leave public factory layers that encourage UI imports.
- Delete obsolete tests asserting tools call specific operations; replace with use-case/controller behavior tests.
- Add 006b DELETE targets to the edited wave plan before implementation: `ActionsPanel.vue` operation imports, `Toolbar.vue` Alt+E concrete operation construction, and panel/toolbar command-internal tests if any. Until this edit is reviewed and accepted, this proposal remains blocked.

## Expected behavior change

No intended behavior change for users. The architectural behavior changes more strongly than the direct proposal: construction semantics become reusable application use-cases, not per-controller command assembly. This should reduce duplication around action-group creation, process-tree action insertion, command commit/rollback, and feasibility checks.

## Risks

- Higher-level consolidation touches more files than a minimal controller extraction, so it must be carefully sliced by construction family and backed by focused tests.
- Naming and placement must avoid creating a new god `ConstructionUseCases.ts`; use small modules and a shared command runner.
- Some existing sequence factories may already be close to use-case helpers; moving all at once may be unnecessary churn. Prefer move/delete only where it removes UI-facing factory imports.
- Full validation is already known to have repository-wide debt from Wave 005; implementation logs must distinguish pre-existing toolchain/e2e failures from attributable regressions.

## Validation plan for implementation

Focused tests:

- Unit tests for each construction use-case and shared command runner.
- Controller/adapter tests proving collected arguments become the correct use-case request and completion behavior.
- Tool tests for masks/status/argument collection with no command assertions.
- Regression tests for guide sibling creation, intersection index selection, dynamic-plane trace validation, quick 3D flows if retained, point dragging, style updates, and undo/redo.

Full cadence:

- Root/workspace lint.
- Focused Vitest for application construction/tool modules.
- Full root Vitest.
- Root/workspace build.
- Frontend Playwright/e2e for point/line/segment/circle/guide/intersection/dynamic plane/selection/undo-redo/properties and any retained quick setup paths.
- Live Playwright MCP user-flow smoke.
- Live preview refresh on `0.0.0.0` and reachability probe.

## Recommendation

Choose this restructure proposal only after the reviewed 006a/006b wave-plan split is recorded. It better satisfies the project priority order (clean architecture before minimal change) while respecting the scope guard, but it is not implementation-ready under the current single Wave 006 entry.
