# Proposal Restructure — Introduce an application composition boundary around project runtime

**Wave:** 001 — Invert the World/application boundary  
**Proposal type:** Restructure, asks whether the fix belongs one conceptual layer higher  
**Source-code changes now:** none; this is a proposal for the later implementation stage.

## Summary

Instead of only moving `World.initialize(commandStack)` into a standalone function, introduce a small application runtime/composition module that owns the `World`, `CommandStack`, and world initialization use case together. Vue components receive a typed runtime object or provided ports rather than constructing and coordinating the model root directly. This still deletes `World.initialize(commandStack)` and forbidden `World` imports, but it places the fix one layer higher: the application shell becomes responsible for lifecycle orchestration, while `World` is only the domain model.

This proposal is more structural than the direct proposal, but still bounded if it targets only the world/command initialization boundary and does not attempt full `App.vue` shell extraction (reserved for Wave 009).

## Evidence this proposal addresses

- `App.vue` currently constructs the domain root and stack directly (`frontend/src/App.vue:115`, `frontend/src/App.vue:123`, `frontend/src/App.vue:147`).
- It provides `world` and `commandStack` separately (`frontend/src/App.vue:148`) and later reassigns/provides a new `World` on sign-out (`frontend/src/App.vue:778`, `frontend/src/App.vue:779`).
- `World` still reaches upward into command infrastructure (`frontend/src/domain/world/World.ts:105`, `frontend/src/domain/world/World.ts:106`, `frontend/src/domain/world/World.ts:110`).
- Initialization call sites are application lifecycle decisions in `App.vue` (`frontend/src/App.vue:323`, `frontend/src/App.vue:384`, `frontend/src/App.vue:439`), not domain behavior.

## Target design

Create an application boundary such as:

```ts
// frontend/src/application/runtime/createProjectRuntime.ts
export interface ProjectRuntime {
  readonly world: World;
  readonly commandStack: CommandStack;
  initializeWorld(): void;
  resetForNewProject(): void;
  clearForLoad(): void;
}

export function createProjectRuntime(): ProjectRuntime { ... }
```

The runtime internally composes:

- `new World()`,
- `new CommandStack()`,
- `initializeWorld(world, commandStack)`,
- reset/clear behavior needed by project lifecycle.

Dependency direction becomes:

`Vue/App -> application runtime -> application use cases/commands -> domain World`

`World` does not know that commands, command stacks, Vue, stores, or persistence exist.

## Files to change

Primary changes:

- `frontend/src/domain/world/World.ts`
  - Same required deletion as direct proposal: remove `initialize(commandStack)` and forbidden imports.
- New `frontend/src/application/runtime/createProjectRuntime.ts` or equivalent
  - Creates and owns the `World` + `CommandStack` pair.
  - Exposes `initializeWorld()` and reset/clear methods.
  - Internally uses existing `InitializationSequenceFactory.buildWorldInitialization(...)`.
- New `frontend/src/application/world/initializeWorld.ts` or internal runtime helper
  - Builds the initialization command and pushes it to the stack.
- `frontend/src/App.vue`
  - Replace direct `new World()` and `new CommandStack()` composition with the runtime.
  - Continue providing `world` and `commandStack` if child components still inject those tokens, but source them from `runtime`.
  - Replace `world.initialize(commandStack)` calls with `runtime.initializeWorld()`.
  - Avoid broad project-shell extraction; do not move Drive/autosave/keyboard behavior in this wave unless it is required to keep the runtime coherent.
- `frontend/src/services/DependencyService.ts`
  - Move/rename into a domain-owned dependency location, or introduce a domain dependency graph object as in the direct proposal.
- `frontend/src/main.ts`
  - Optionally replace raw descriptor registration with a tiny `bootstrapApplication()` composition function if the runtime module becomes the clear place for startup composition. Otherwise leave descriptor registration as-is.

Secondary changes only if bounded:

- `frontend/src/domain/world/Element2D.ts` and concrete realization signatures
  - Introduce a read-only domain context interface if practical.
- `frontend/src/domain/world/styleService.ts`
  - Introduce `VisibilityContext`/`ProcessTreeProvider` as in direct proposal.

## Files/tests/docs/fixtures to DELETE

Required deletes:

- Delete `World.initialize(commandStack)`.
- Delete `World.ts` command-stack/application imports:
  - `Command`, `CommandStack`, initialization factory, process-tree operation classes.
- Delete stale `App.vue` comments preserving the old direct `World` initialization path.
- Delete any old tests that require direct `World.initialize(...)`.

Additional restructure deletes:

- Delete direct runtime construction from `App.vue` (`new World()`, `new CommandStack()`) if the runtime module replaces it fully.
- Delete any compatibility bridge that exposes `world.initialize()` from the runtime.
- Delete old service-layer `DependencyService` file/path if fully moved into domain.

## Expected behavior change

No user-visible behavior change is intended.

Architectural behavior changes are broader than the direct proposal:

- `App.vue` stops being the first owner of the world/command pair and instead consumes an application runtime.
- `World` becomes a pure model root.
- The runtime becomes the single application composition point for initialization decisions.
- Descriptor registration remains explicit runtime composition and is not hidden inside `World`.

The geometric result must remain identical to current initialization: `P_H`, `P_V`, origin points, hinge line/halves, process-tree records, and active plane are still created.

## Validation plan for implementation wave

Focused validation:

1. Unit-test `createProjectRuntime()`:
   - constructs a `World` and `CommandStack`,
   - initializes an empty world exactly once,
   - clears/resets without replacing injected references unexpectedly if reset methods are included.
2. Unit-test world initializer internals as in direct proposal.
3. Architecture test:
   - `World.ts` has no imports from `frontend/src/commands/`, `frontend/src/services/`, Vue components, stores, or persistence.
   - `App.vue` no longer constructs `World`/`CommandStack` directly if runtime replacement is accepted.
4. Regression test for project creation/load fallback lifecycle if feasible at unit/component level.

Mandatory wave validation cadence:

- root/workspace lint,
- focused Vitest for runtime/initializer/boundary tests,
- full Vitest,
- root/workspace build,
- Playwright/e2e because app startup/project lifecycle composition is touched,
- live preview refresh and reachability probe.

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---:|---|
| This can drift into Wave 009 `App.vue` shell extraction. | High | Hard scope guard: only move world/command/runtime initialization composition; leave Drive/autosave/keyboard/select-all orchestration in `App.vue`. |
| Child components may assume separate injected `world`/`commandStack` tokens. | Medium | Continue providing the same tokens from the runtime; do not force broad injection changes in this wave. |
| Replacing direct `new World()` on sign-out may expose stale-provide behavior. | Medium | Prefer runtime reset that preserves object identity if practical; otherwise record as Wave 009 risk. |
| More files touched than the direct proposal. | Medium | Keep runtime API minimal and resist refactoring persistence/UI shell behavior. |
| Moving `DependencyService` into domain may still be broad. | Medium | Same mitigation as direct proposal: mechanical import update or domain-local re-export only if deletion can still be completed. |

## Comparison with direct proposal

| Criterion | Direct proposal | Restructure proposal |
|---|---|---|
| Deletes `World.initialize(commandStack)` | Yes | Yes |
| Removes `World` command/application imports | Yes | Yes |
| Moves ownership one conceptual layer higher | Partly: initializer function | More clearly: runtime/composition module |
| Touches `App.vue` | Replaces call sites only | Replaces world/stack construction and call sites |
| Risk of broadening into app shell | Low | Medium/high unless guarded |
| Better long-term boundary | Good | Better, if kept bounded |

## Recommendation

Use the restructure proposal only if the reviewer agrees the current `App.vue` ownership of `World` + `CommandStack` is part of the same boundary inversion and can be corrected without entering Wave 009 scope. Otherwise choose the direct proposal now and record application runtime extraction as a future app-shell/use-case concern.
