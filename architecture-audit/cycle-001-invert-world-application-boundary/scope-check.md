# Scope Check — Wave 001: Invert the World/application boundary

**Stage:** `cycle-001-fresh-scout-proposals`  
**Wave:** 001 — Invert the World/application boundary  
**Date:** 2026-05-25  
**Source-code changes in this stage:** none intended; this artifact is evidence/proposal only.

## Verdict

Wave 001 premises still hold. `World` remains the foundational domain root, but it still imports command/application infrastructure and owns the initialization orchestration that should live outside the domain. The accepted wave plan can proceed without a plan edit.

The most important current coupling is still explicit and central:

- `World.ts` imports service/application/command infrastructure: `DependencyService`, `Command`, `buildWorldInitialization`, process-tree command operations, and `CommandStack` (`frontend/src/domain/world/World.ts:94`, `frontend/src/domain/world/World.ts:105`, `frontend/src/domain/world/World.ts:106`, `frontend/src/domain/world/World.ts:110`).
- `World.initialize(commandStack)` creates and commits a command, pushes subprocess/action-group operations, delegates to the command factory, and pushes to the stack (`frontend/src/domain/world/World.ts:197`, `frontend/src/domain/world/World.ts:206`).
- Application startup still calls `world.initialize(commandStack)` from `App.vue` after failed restore, project creation, and legacy-empty load paths (`frontend/src/App.vue:323`, `frontend/src/App.vue:384`, `frontend/src/App.vue:439`).

## Wave-plan premise check

| Wave 001 premise | Current evidence | Still valid? | Notes |
|---|---|---:|---|
| `World` imports commands/application services and must be made domain-owned | `World.ts` imports `DependencyService`, `Command`, `buildWorldInitialization`, and `CommandStack` (`frontend/src/domain/world/World.ts:94`, `frontend/src/domain/world/World.ts:105`, `frontend/src/domain/world/World.ts:106`, `frontend/src/domain/world/World.ts:110`) | Yes | The exact inversion remains present. |
| `World.initialize(commandStack)` must be deleted/moved | `World.initialize` creates `new Command('Initialize World', this)`, calls `buildWorldInitialization`, commits, and pushes to `commandStack` (`frontend/src/domain/world/World.ts:197`, `frontend/src/domain/world/World.ts:206`) | Yes | This is the core DELETE item. |
| Initialization orchestration belongs outside the domain root | `InitializationSequenceFactory.buildWorldInitialization(world, cmd, groupId)` already contains the actual ordered setup operations and uses both `World` and `Command` (`frontend/src/commands/factories/InitializationSequenceFactory.ts:39`) | Yes | Existing factory can be wrapped/relocated behind an application initializer without changing geometry behavior. |
| Startup must still create P_H/P_V, hinge line, origins, and process-tree state | Factory creates plane ops for `P_H`/`P_V` (`frontend/src/commands/factories/InitializationSequenceFactory.ts:42`, `frontend/src/commands/factories/InitializationSequenceFactory.ts:57`), action records (`frontend/src/commands/factories/InitializationSequenceFactory.ts:52`, `frontend/src/commands/factories/InitializationSequenceFactory.ts:67`), origin ops, hinge halves, and active plane (`frontend/src/commands/factories/InitializationSequenceFactory.ts:143`) | Yes | Proposals must preserve this exact sequence. |
| `Element2D.realize2D(world: World)` is a domain-internal root coupling to narrow if practical | `Element2D.ts` imports `World` and requires `abstract realize2D(world: World)` (`frontend/src/domain/world/Element2D.ts:1`, `frontend/src/domain/world/Element2D.ts:108`) | Yes | This is broader than initialization; a limited domain `RealizationContext` is practical in Wave 001 only if kept bounded. |
| `styleService` walks `World`/`ProcessTree` and should use a narrower context | `resolveVisibility(element, world)` calls `world.getProcessTree()` (`frontend/src/domain/world/styleService.ts:58`, `frontend/src/domain/world/styleService.ts:65`) | Yes | This can be converted to a `VisibilityContext`/`ProcessTreeProvider`; deeper process ownership remains Wave 005. |
| Descriptor registration is runtime composition and should remain outside the domain root | `main.ts` imports and invokes `registerAllDescriptors()` before app mount (`frontend/src/main.ts:24`, `frontend/src/main.ts:25`); registry error text assumes registration (`frontend/src/domain/world/descriptors/DescriptorRegistry.ts:52`) | Yes | No evidence that `World` owns descriptor registration; proposals should preserve main/runtime composition. |

## Current boundary map for this wave

### Domain root currently owns pure model state and application orchestration

`World` contains geometric maps/caches and process/dependency fields, but also constructs infrastructure. The pure-domain state remains in fields such as projection planes, 3D planes/elements, process tree, caches, and active plane; the impurity comes from `World.initialize(commandStack)` and the concrete `DependencyService` import/instantiation (`frontend/src/domain/world/World.ts:128`, `frontend/src/domain/world/World.ts:182`, `frontend/src/domain/world/World.ts:197`).

### Initialization is already factored enough to move

The operation sequence is centralized in `InitializationSequenceFactory.buildWorldInitialization(world, cmd, groupId)` (`frontend/src/commands/factories/InitializationSequenceFactory.ts:39`). This factory receives an open command and adds operations for planes, projection planes, origins, hinge lines, process-tree actions, and active-plane setup. Therefore the implementation wave can create an application/use-case initializer that builds and pushes the command, then delete `World.initialize(commandStack)`.

### Startup call sites are few and explicit

`App.vue` has three active calls to `world.initialize(commandStack)` (`frontend/src/App.vue:323`, `frontend/src/App.vue:384`, `frontend/src/App.vue:439`) plus one intentionally commented non-call (`frontend/src/App.vue:157`). These can be migrated in one implementation wave.

### Descriptor registration is already a composition concern

`main.ts` registers descriptors once before `createApp(...).mount(...)` (`frontend/src/main.ts:24`, `frontend/src/main.ts:25`). This should stay as composition/startup wiring. Wave 001 does not need to move descriptors unless implementation introduces an application bootstrap module that centralizes existing composition.

## Explicit DELETE list status

The accepted Wave 001 DELETE list remains applicable:

1. Delete `World.initialize(commandStack)` entirely.
2. Delete `World.ts` imports of `Command`, `CommandStack`, command factories, process-tree operation classes, and service-layer dependency helpers where possible in this wave.
3. Delete dead compatibility comments or wrappers preserving the old `World`-drives-commands initialization path, including stale comments around direct `world.initialize(...)` use if replaced.
4. Delete or rewrite tests that require initialization through `World` if such tests exist during implementation scouting.

Potential adjustment: `DependencyService` is currently under `frontend/src/services/DependencyService.ts`, but semantically acts as a stateful domain dependency graph (`frontend/src/services/DependencyService.ts:42`, `frontend/src/services/DependencyService.ts:49`). The direct proposal can move it into the domain or introduce a local domain port in the same wave if small. If not moved, leaving `World.ts` importing `@/services/DependencyService` would fail the wave success criterion.

## Scope risks for implementation

- `App.vue` currently reassigns `world = new World()` on sign-out and calls `provide('world', world)` again (`frontend/src/App.vue:778`, `frontend/src/App.vue:779`). This stale-injection pattern is adjacent to initialization but likely belongs to later app-shell cleanup unless it blocks replacing `world.initialize(...)`.
- `InitializationOps.ts` still uses private casts such as `(world as any)` and `world.getDependencyService()` (`frontend/src/commands/operations/world/InitializationOps.ts:82`, `frontend/src/commands/operations/world/InitializationOps.ts:83`, `frontend/src/commands/operations/world/InitializationOps.ts:158`, `frontend/src/commands/operations/world/InitializationOps.ts:159`). Those are persistence/command contract cleanup candidates for Wave 004 unless needed to remove the `DependencyService` service import from `World`.
- `styleService` can accept a narrower process-tree context in Wave 001, but full process-tree dependency ownership should remain Wave 005.

## Scope decision

Proceed with Wave 001 as planned. The wave should implement a narrow application initializer and domain context/port cleanup around `World`, not broaden into command serialization, process-tree API removal, rendering, or app-shell refactoring.
