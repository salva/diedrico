# Proposal Direct — Move initialization orchestration out of `World`

**Wave:** 001 — Invert the World/application boundary  
**Proposal type:** Direct, focused implementation of the accepted wave  
**Source-code changes now:** none; this is a proposal for the later implementation stage.

## Summary

Create a small application initializer that owns the existing initialization command sequence, replace all `world.initialize(commandStack)` call sites with that initializer, and delete `World.initialize(commandStack)` plus its command/application imports. Move or re-home `DependencyService` so `World.ts` no longer imports from `frontend/src/services/`. Keep descriptor registration in runtime composition (`main.ts`) and make only the narrowest realization/visibility context changes needed to remove direct `World` imports from the most central domain abstractions.

This is the shortest path to the Wave 001 target: `World` becomes constructible as a domain model root without importing commands, command stacks, application services, Vue, or persistence.

## Evidence this proposal addresses

- `World.ts` currently imports `DependencyService`, `Command`, `buildWorldInitialization`, and `CommandStack` (`frontend/src/domain/world/World.ts:94`, `frontend/src/domain/world/World.ts:105`, `frontend/src/domain/world/World.ts:106`, `frontend/src/domain/world/World.ts:110`).
- `World.initialize(commandStack)` constructs and pushes `Command` infrastructure from inside the domain root (`frontend/src/domain/world/World.ts:197`, `frontend/src/domain/world/World.ts:206`).
- `App.vue` has three active initialization call sites (`frontend/src/App.vue:323`, `frontend/src/App.vue:384`, `frontend/src/App.vue:439`).
- The existing sequence factory already contains the geometric setup sequence (`frontend/src/commands/factories/InitializationSequenceFactory.ts:39`) and sets the active plane at the end (`frontend/src/commands/factories/InitializationSequenceFactory.ts:143`).

## Target design

Add an application/use-case function, for example:

```ts
// frontend/src/application/world/initializeWorld.ts
export function initializeWorld(world: World, commandStack: CommandStack): void {
  if (world.getAllProjectionPlanes().length > 0) return;

  const initCmd = new Command('Initialize World', world);
  initCmd.addAndExecute(new PushSubprocessOp('World Initialization'));
  const groupId = createInitializationGroupId();
  initCmd.addAndExecute(new AddProcessTreeActionGroupOp(createActionGroup(groupId)));
  buildWorldInitialization(world, initCmd, groupId);
  initCmd.addAndExecute(new PopSubprocessOp());
  initCmd.commit();
  commandStack.push(initCmd);
  world.markDirty();
}
```

The exact location/name can be adjusted during implementation, but the dependency direction must be:

`App/startup -> application initializer -> commands/factories/operations -> World`

and never:

`World -> commands/application initializer/command stack`.

## Files to change

Primary changes:

- `frontend/src/domain/world/World.ts`
  - Delete `initialize(commandStack)`.
  - Delete imports of `Command`, `CommandStack`, `buildWorldInitialization`, `createActionGroup`, `AddProcessTreeActionGroupOp`, `PushSubprocessOp`, and `PopSubprocessOp`.
  - Replace `DependencyService` service-layer import with a domain-owned location or domain port (see next bullet).
- `frontend/src/services/DependencyService.ts`
  - Move to a domain path such as `frontend/src/domain/dependencies/DependencyGraph.ts` or `frontend/src/domain/world/DependencyService.ts`, or rename to a domain concept if implementation can update imports in one bounded change.
  - Keep behavior unchanged; do not redesign process/dependency ownership in this wave.
- New file such as `frontend/src/application/world/initializeWorld.ts` or `frontend/src/commands/factories/WorldInitializationUseCase.ts`
  - Own construction of the initialization command and command-stack push.
  - Reuse `buildWorldInitialization` to avoid changing the geometric sequence.
- `frontend/src/App.vue`
  - Import the new initializer and replace active `world.initialize(commandStack)` calls at `frontend/src/App.vue:323`, `frontend/src/App.vue:384`, and `frontend/src/App.vue:439`.
  - Remove the stale commented `// world.initialize(commandStack);` block if it now preserves the old mental model (`frontend/src/App.vue:157`).
- `frontend/src/commands/factories/InitializationSequenceFactory.ts`
  - Likely unchanged except import paths if `DependencyService` move cascades indirectly.
- `frontend/src/main.ts`
  - Leave descriptor registration in place unless the implementation introduces a top-level bootstrap module; do not move descriptors into `World`.

Secondary/narrow context changes if feasible in the same implementation:

- `frontend/src/domain/world/Element2D.ts` and concrete subclasses using `realize2D(world: World)`
  - Introduce a minimal `WorldReadContext`/`RealizationContext` type in the domain world package if this can be completed without expanding the wave.
  - If it risks broad churn across every geometric class, defer most realization context tightening to Wave 002 but at least document the residual in `implementation-log.md`.
- `frontend/src/domain/world/styleService.ts`
  - Change `resolveVisibility(element, world)` to accept a narrower `{ getProcessTree(): ProcessTree }` or `VisibilityContext` if straightforward.

## Files/tests/docs/fixtures to DELETE

Required deletes:

- Delete the `World.initialize(commandStack)` method from `frontend/src/domain/world/World.ts`.
- Delete domain imports in `World.ts` for:
  - `@/commands/Command`
  - `@/commands/CommandStack`
  - `@/commands/factories/InitializationSequenceFactory`
  - `@/commands/operations/processTree/AddProcessTreeActionGroupOp`
  - `@/commands/operations/processTree` subprocess operations
- Delete the stale commented initialization path in `App.vue` if replaced.
- Delete any tests found during implementation that assert `world.initialize(...)` is the initialization API; replace them with application-initializer tests.

Conditional deletes:

- Delete or move the service-layer `DependencyService` path from `frontend/src/services/DependencyService.ts` if no active non-domain service semantics remain after import updates.
- Delete compatibility wrapper functions such as `World.initialize = initializeWorld` if someone is tempted to preserve the old API. Do not add such wrappers.

## Expected behavior change

No user-visible behavior change is intended.

The app must still create, on new/fallback initialization:

- fixed 3D planes `P_H` and `P_V`,
- corresponding projection planes,
- origin points `O_H` and `O_V`,
- hinge line and half-hinge lines,
- initialization process-tree records,
- active plane set to horizontal `P_H`.

Architectural behavior changes:

- `new World()` becomes a pure domain construction step with no command/application imports.
- Initialization is an application use case that records a command in `CommandStack`.
- `World.ts` no longer imports from `frontend/src/commands/` or `frontend/src/services/`.

## Validation plan for implementation wave

Focused validation:

1. Add/update unit tests for the new initializer:
   - empty world gets initialized once,
   - second call is idempotent when projection planes already exist,
   - command stack records the initialization command,
   - `P_H`, `P_V`, origins, hinge/half-hinge lines, active plane, and process-tree action group exist.
2. Add/update architecture import-boundary test:
   - `frontend/src/domain/world/World.ts` must not import `frontend/src/commands/`, `frontend/src/services/`, Vue components, or stores.
   - If `DependencyService` is moved, assert no domain import points to old service path.
3. Add pure construction test for `new World()` without command stack.

Mandatory wave validation cadence:

- root `npm run lint` and workspace lint where defined,
- focused Vitest for initializer and architecture boundary tests,
- full Vitest suite at root,
- root/workspace `npm run build`,
- Playwright/e2e because frontend startup/project creation behavior is touched,
- live preview refresh and reachability probe recorded in the implementation log.

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---:|---|
| Moving `DependencyService` imports may touch many command/tool files. | Medium | Keep the move mechanical and behavior-preserving; if too broad, introduce a domain-local export and delete the service-layer file only when all imports are updated. |
| `World.initialize` idempotency currently checks `projectionPlanes.size > 0`; external initializer must preserve it. | Medium | Unit-test empty and non-empty cases. |
| Initialization group ID uses `Date.now()`, which can make tests nondeterministic. | Low/Medium | Hide group ID generation behind a small function with injectable deterministic ID in tests, or assert shape rather than exact ID. |
| `App.vue` sign-out reassigns `world` and re-provides it after setup. | Medium but adjacent | Do not broaden unless the initializer replacement exposes a bug; record as later app-shell risk. |
| Realization/visibility context cleanup may expand beyond one wave. | Medium | Treat `World.initialize` and forbidden imports as mandatory; only narrow `Element2D`/`styleService` contexts if the change remains bounded. |

## Why this proposal is preferred if minimizing wave size

It directly deletes the central inversion identified by the plan while reusing the existing initialization factory and keeping behavior stable. It does not attempt to redesign commands, process-tree ownership, persistence, or rendering before their planned waves.
