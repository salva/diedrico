# Decision — Wave 001: Invert the World/application boundary

**Stage:** `cycle-001-decision`  
**Wave:** 001 — Invert the World/application boundary  
**Date:** 2026-05-25  
**Decision status:** review convergence complete; ready for implementation  
**Source-code changes in this stage:** none; this decision records the implementation scope only.

## Decision

Choose **Proposal Direct — Move initialization orchestration out of `World`** for Wave 001 implementation.

The implementation stage must follow `architecture-audit/cycle-001-invert-world-application-boundary/proposals/proposal-direct.md` as corrected before review round 02. The implementation must not deviate from this decision, broaden into rejected/deferred runtime extraction, or preserve the deleted API through wrappers. Any material deviation requires a new mini-cycle with a delta proposal, one bounded review round, and sign-off before code changes continue.

## Review convergence record

Review convergence is complete after round 02 with **NO BLOCKING ISSUES**.

Artifacts used for this decision:

- `scope-check.md` confirmed that Wave 001 premises still hold: `World` remains the domain root but still imports command/application/service infrastructure, `World.initialize(commandStack)` still owns initialization orchestration, and active startup call sites remain in `App.vue`.
- `proposals/proposal-direct.md` defines the accepted implementation: create a focused application initializer, delete `World.initialize(commandStack)`, move `DependencyService` into the domain world package, update startup/test call sites, and keep descriptor registration as runtime composition.
- `proposals/proposal-restructure.md` evaluates the higher-level `ProjectRuntime` option but, after correction, explicitly rejects introducing it in Wave 001 because a coherent runtime would require sign-out/load/reset/autosave lifecycle work belonging to a later app-shell wave.
- `reviews/round-01-review.md` raised blockers B1 and B2: incomplete test call-site inventory and incomplete `ProjectRuntime` lifecycle scope.
- `reviews/corrections-round-01-note.md` records the in-place proposal corrections: complete direct-call/test inventory, mechanical `DependencyService` move target, stale `CommandStack(world)` cleanup, and explicit rejection of `ProjectRuntime` for this wave.
- `reviews/round-02-review.md` verifies B1/B2 and W1/W2 are resolved, rescored the corrected proposals, and recommends Proposal Direct with verdict **NO BLOCKING ISSUES**.

## Selected proposal and rationale

### Selected: Proposal Direct

Proposal Direct is selected because it directly achieves the Wave 001 target outcome with the smallest coherent implementation surface:

1. It inverts the central dependency direction by moving initialization orchestration from `World` into an application/use-case layer.
2. It deletes the forbidden domain-to-command/application imports from `World.ts` rather than wrapping them.
3. It makes `new World()` a pure domain construction step without requiring `CommandStack` or command factories.
4. It mechanically moves `DependencyService` from the service layer into the domain world package, removing the `World.ts` import from `frontend/src/services/` without a conceptual rename or broad dependency redesign.
5. It includes the corrected, verified test update surface for every direct `world.initialize(commandStack)` caller.
6. It avoids overfeaturism by deferring full app-shell/runtime lifecycle extraction until the planned later shell wave.

### Rejected/deferred: Proposal Restructure / `ProjectRuntime`

The `ProjectRuntime` restructure is rejected for Wave 001 and deferred as input for the later app-shell/runtime wave.

Reasoning:

- A runtime that only owns `world`, `commandStack`, and `initializeWorld()` would be a partial wrapper because `App.vue` still owns sign-out, load-clear, reset, autosave, and provide/inject lifecycle behavior.
- Making `ProjectRuntime` coherent now would expand this foundational boundary wave into app-shell extraction, which belongs to a later wave after command, persistence, rendering, and tool/use-case boundaries are cleaner.
- Review round 02 explicitly notes that the corrected restructure proposal converges to the direct implementation for Wave 001 and mainly serves as a decision record for deferring `ProjectRuntime`.

Do **not** add `frontend/src/application/runtime/createProjectRuntime.ts` or change Vue provide/inject ownership in Wave 001 unless a new reviewed mini-cycle supersedes this decision.

## Exact next implementation scope

The next implementation stage must perform exactly the following scope unless a mini-cycle approves changes.

### Required production source changes

1. **Create application initializer**
   - Add `frontend/src/application/world/initializeWorld.ts`.
   - It must own construction/commit/push of the initialization command.
   - It must reuse the existing initialization sequence factory so geometric setup behavior remains unchanged.
   - It must preserve current idempotency: do nothing when projection planes already exist.
   - Dependency direction must be: `App/startup -> application initializer -> commands/factories/operations -> World`.

2. **Clean `World.ts` boundary**
   - Delete `World.initialize(commandStack)` from `frontend/src/domain/world/World.ts`.
   - Delete `World.ts` imports of command/application infrastructure, including `Command`, `CommandStack`, `buildWorldInitialization`, `AddProcessTreeActionGroupOp`, and process-tree subprocess operation classes.
   - Ensure `World.ts` has no imports from `frontend/src/commands/`, `frontend/src/services/`, Vue components, stores, or persistence.

3. **Move dependency graph service into the domain world package**
   - Move `frontend/src/services/DependencyService.ts` to `frontend/src/domain/world/DependencyService.ts`.
   - Keep the `DependencyService` class name and behavior for this wave.
   - Update `World.ts` to import it from the domain-local path.
   - Delete the old `frontend/src/services/DependencyService.ts` file; do not leave a re-export, shim, compatibility wrapper, or parallel path.

4. **Update app startup call sites**
   - In `frontend/src/App.vue`, import/use `initializeWorld(world, commandStack)` instead of `world.initialize(commandStack)` at the three active call sites identified by the proposals.
   - Delete the stale commented old initialization call if it preserves the obsolete mental model.
   - Do not introduce `ProjectRuntime`; do not redesign sign-out/load/autosave lifecycle in this wave.

5. **Descriptor registration remains runtime composition**
   - Keep descriptor registration outside `World`.
   - Do not move descriptor registration into the domain root.
   - Only touch `frontend/src/main.ts` if the implementation needs a small composition helper and doing so remains within the accepted direct proposal.

### Required test changes

Update all verified direct `world.initialize(commandStack)` consumers in the same implementation change set. No intermediate implementation result may leave the test suite depending on the deleted API.

Required files/surfaces:

- `frontend/tests/integration/worldInitialization.spec.ts` — convert to initializer integration coverage while preserving assertions for planes, origins, hinge lines, half-hinge lines, idempotency, active plane, and process-tree records.
- `frontend/tests/unit/commands/initializeWorldCommand.spec.ts` — replace the obsolete `World.initialize` API expectation with focused initializer/command-stack behavior, or delete redundant assertions if coverage is fully subsumed by updated integration tests.
- `frontend/tests/helpers/worldHelpers.ts` — update `createTestWorld()` to construct `new CommandStack()` with no stale world argument, call `initializeWorld(world, commandStack)`, and continue returning `{ world, commandStack }` to avoid broad downstream churn.
- `frontend/tests/unit/commands/commandStack.spec.ts` — remove the stale `new CommandStack(world)` argument so tests match the current constructorless `CommandStack` contract.
- Add or update an architecture import-boundary test proving `frontend/src/domain/world/World.ts` does not import commands, services, Vue components, stores, or persistence.

Transitive tests such as active-plane shortcut and paper/rendering behavior may not be direct call sites, but must be covered by focused/full validation because they depend on initialized-world behavior.

### Optional/narrow changes allowed only if bounded

- `frontend/src/domain/world/styleService.ts` may accept a narrower process-tree/visibility context if the change is small and does not enter process-tree ownership cleanup.
- `frontend/src/domain/world/Element2D.ts` realization context tightening may be attempted only if it remains bounded. Broad `realize2D(world: World)` cleanup across many geometric classes is deferred to later waves if it expands.
- Private casts in `InitializationOps.ts` and deeper process-tree/dependency ownership are not Wave 001 scope unless strictly necessary to complete the accepted boundary deletion.

## DELETE list for implementation

The implementation must delete the following, not wrap or preserve them:

- `World.initialize(commandStack)` from `frontend/src/domain/world/World.ts`.
- `World.ts` imports of command classes, command stack types, initialization factories, process-tree command operations, and service-layer dependency helpers.
- The old service-layer file path `frontend/src/services/DependencyService.ts` after moving the class to the domain world package.
- Stale commented or compatibility initialization paths in `App.vue` that imply initialization still belongs to `World`.
- Tests or assertions that require initialization through `World.initialize(...)`; replace them with application-initializer coverage.
- Any proposed compatibility wrapper such as `World.initialize = initializeWorld` or a service-layer `DependencyService` re-export.

## Validation requirements for implementation stage

The implementation stage must record full command outputs under `architecture-audit/cycle-001-invert-world-application-boundary/validation/` and summarize them in `implementation-log.md`.

Minimum required validation:

1. Root `npm run lint` and workspace lint where defined.
2. Focused Vitest for the new initializer, updated initialization integration/unit tests, command-stack helper cleanup, and architecture boundary test.
3. Full Vitest suite at root.
4. Root `npm run build` and workspace build where defined.
5. Playwright/e2e because frontend startup/project creation behavior is touched.
6. Live preview refresh on `0.0.0.0` plus a reachability probe, recorded in `implementation-log.md`.

The wave is rejected if validation fails for reasons attributable to the change, or if e2e/live preview is skipped without explicit justification in the implementation log.

## Accepted residual risks

- `App.vue` still owns broad app-shell lifecycle responsibilities including sign-out, load-clear/reset, autosave, keyboard routing, and provide/inject reference management. This is accepted for Wave 001 and remains input to the later app-shell/runtime wave.
- `Element2D.realize2D(world: World)` and related realization context coupling may remain if tightening it would create broad churn. Any residual must be recorded in the implementation log for Wave 002/domain split follow-up.
- `styleService` may still expose process-tree ownership questions if narrowing it would enter Wave 005. Any residual must be recorded explicitly.
- `InitializationOps.ts` private casts and command/persistence contract weaknesses are accepted residuals for later command/persistence waves.
- The initialization group ID currently depends on runtime time generation; implementation tests should assert shape/behavior or isolate ID generation rather than making brittle timestamp assertions.

## Non-negotiable implementation constraints

- Do not modify backend/specs/docs or unrelated source as part of Wave 001 implementation.
- Do not add compatibility shims, old-path re-exports, or dual initialization APIs.
- Do not introduce `ProjectRuntime` or app-shell extraction in this wave.
- Do not move descriptor registration into `World`.
- Do not alter persistence, command serialization, process-tree ownership, rendering, or UI command-controller architecture except as strictly required by the accepted direct proposal.
- Do not deviate from this decision without a reviewed mini-cycle.
