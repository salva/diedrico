# Proposal Restructure — Introduce an application composition boundary around project runtime

**Wave:** 001 — Invert the World/application boundary  
**Proposal type:** Restructure, asks whether the fix belongs one conceptual layer higher  
**Source-code changes now:** none; this is a proposal for the later implementation stage.

## Summary

Instead of only moving `World.initialize(commandStack)` into a standalone function, introduce a small application runtime/composition module that owns the `World`, `CommandStack`, and world initialization use case together. Vue components receive a typed runtime object or provided ports rather than constructing and coordinating the model root directly. This still deletes `World.initialize(commandStack)` and forbidden `World` imports, but it places the fix one layer higher: the application shell becomes responsible for lifecycle orchestration, while `World` is only the domain model.

Round-01 review found that this runtime is not actually bounded for Wave 001 because `App.vue` already performs sign-out, load-clear, and stale re-provide lifecycle operations that a runtime would have to own to be coherent. Therefore this corrected restructure proposal explicitly declines introducing `ProjectRuntime` in Wave 001. The runtime concept should be carried forward as Wave 009 input, while Wave 001 should choose the direct initializer proposal.

## Evidence this proposal addresses

- `App.vue` currently constructs the domain root and stack directly (`frontend/src/App.vue:115`, `frontend/src/App.vue:123`, `frontend/src/App.vue:147`).
- It provides `world` and `commandStack` separately (`frontend/src/App.vue:148`) and later reassigns/provides a new `World` on sign-out (`frontend/src/App.vue:778`, `frontend/src/App.vue:779`).
- `World` still reaches upward into command infrastructure (`frontend/src/domain/world/World.ts:105`, `frontend/src/domain/world/World.ts:106`, `frontend/src/domain/world/World.ts:110`).
- Initialization call sites are application lifecycle decisions in `App.vue` (`frontend/src/App.vue:323`, `frontend/src/App.vue:384`, `frontend/src/App.vue:439`), not domain behavior.

## Target design

**Corrected Wave 001 position:** do not introduce `ProjectRuntime` in this wave. Use the direct proposal's `frontend/src/application/world/initializeWorld.ts` use case as the complete Wave 001 application boundary. This still tests the higher-level option and rejects it for this cycle because a partial runtime would either bypass sign-out/load lifecycle or expand into Wave 009.

Rejected runtime sketch for later Wave 009 input:

```ts
// frontend/src/application/runtime/createProjectRuntime.ts
export interface ProjectRuntime {
  readonly world: World;
  readonly commandStack: CommandStack;
  initializeWorld(): void;
}

export function createProjectRuntime(): ProjectRuntime { ... }
```

If revived in Wave 009, the runtime contract cannot be merely narrow; it must include the full lifecycle currently spread through `App.vue`. The previously considered narrow contract was:

- `createProjectRuntime()` postcondition: returns one freshly constructed `World` and one freshly constructed `CommandStack` that remain the references provided to Vue children for the lifetime of the mounted app instance.
- `initializeWorld()` precondition: may be called during project creation/load fallback when the runtime's `world` is empty or partially restored.
- `initializeWorld()` postcondition: preserves the current initialization idempotency rule; if projection planes already exist it leaves the world and command stack unchanged, otherwise it records the initialization command exactly as the direct proposal does.
- It must not replace `runtime.world` or `runtime.commandStack` after Vue `provide()` has exposed them, because doing so would make injected child references stale.

The runtime internally composes:

- `new World()`,
- `new CommandStack()`,
- `initializeWorld(world, commandStack)`.

Round-01 correction: lifecycle reset/load/sign-out methods cannot be excluded if a runtime is introduced, because `App.vue` currently clears/reassigns world state and command history during load/sign-out paths. Adding them now would enter Wave 009 app-shell extraction; omitting them would leave an incoherent partial wrapper. Therefore the restructure proposal is rejected for Wave 001 in favor of the direct proposal.

Dependency direction becomes:

`Vue/App -> application runtime -> application use cases/commands -> domain World`

`World` does not know that commands, command stacks, Vue, stores, or persistence exist.

## Files to change

Primary changes:

- `frontend/src/domain/world/World.ts`
  - Same required deletion as direct proposal: remove `initialize(commandStack)` and forbidden imports.
- Do **not** add `frontend/src/application/runtime/createProjectRuntime.ts` in Wave 001.
  - Record runtime extraction as a Wave 009/app-shell candidate instead.
  - Use the direct proposal's `frontend/src/application/world/initializeWorld.ts` as the only new application boundary for this wave.
- New `frontend/src/application/world/initializeWorld.ts` or internal runtime helper
  - Builds the initialization command and pushes it to the stack.
- `frontend/src/App.vue`
  - Keep direct `new World()` and `new CommandStack()` composition in Wave 001; do not introduce a runtime wrapper.
  - Replace `world.initialize(commandStack)` calls with `initializeWorld(world, commandStack)` from the new application use case.
  - Delete the stale commented old initialization call.
  - Avoid broad project-shell extraction; Drive/autosave/keyboard/sign-out/load-reset behavior remains in `App.vue` until a future reviewed runtime/app-shell wave.
- `frontend/src/services/DependencyService.ts`
  - Same concrete direct-plan move: mechanically move to `frontend/src/domain/world/DependencyService.ts`, keep the exported class name/behavior, update `World.ts` to import it from the domain path, and delete the old service-layer file with no re-export. Current evidence shows `World.ts` is the only direct importer.
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

- Do not delete direct `new World()` / `new CommandStack()` construction from `App.vue` in Wave 001; that deletion belongs to a future coherent runtime/app-shell wave.
- Delete/avoid any compatibility bridge that re-exposes `world.initialize()` from an application module or future runtime.
- Delete old service-layer `DependencyService` file/path if fully moved into domain.

## Expected behavior change

No user-visible behavior change is intended.

Architectural behavior changes are broader than the direct proposal:

- `App.vue` remains the owner of the world/command pair for Wave 001, but delegates initialization orchestration to the application initializer.
- `World` becomes a pure model root.
- A full runtime remains a future Wave 009/app-shell concern, not a Wave 001 artifact.
- Descriptor registration remains explicit runtime composition and is not hidden inside `World`.

The geometric result must remain identical to current initialization: `P_H`, `P_V`, origin points, hinge line/halves, process-tree records, and active plane are still created.


## Complete test update surface for `world.initialize(commandStack)`

Even though this restructure proposal is rejected for Wave 001, any accepted Wave 001 implementation must update the same verified test surface as the direct proposal:

| File | Evidence | Required update |
|---|---|---|
| `frontend/src/domain/world/World.ts` | method declaration at `frontend/src/domain/world/World.ts:193` | Delete the method and replace coverage with application-initializer tests. |
| `frontend/src/App.vue` | active calls at `frontend/src/App.vue:323`, `frontend/src/App.vue:384`, `frontend/src/App.vue:439`; stale comment at `frontend/src/App.vue:157` | Replace with `initializeWorld(world, commandStack)` and delete stale commented call. |
| `frontend/tests/integration/worldInitialization.spec.ts` | direct calls at lines 21, 50, 67, 82, 114, 124, 149, 151, 169, 184, 198, 221, 247, 260 | Convert to initializer integration coverage while preserving geometric/process-tree assertions. |
| `frontend/tests/unit/commands/initializeWorldCommand.spec.ts` | direct call at line 26 | Replace obsolete `World.initialize` API assertion with initializer/command-stack behavior or delete if redundant. |
| `frontend/tests/helpers/worldHelpers.ts` | `new CommandStack(world)` and `world.initialize(commandStack)` at `frontend/tests/helpers/worldHelpers.ts:43` and `frontend/tests/helpers/worldHelpers.ts:44` | Import/call `initializeWorld(world, commandStack)`, remove the stale constructor argument, and keep returning `{ world, commandStack }`. |
| `frontend/tests/unit/commands/commandStack.spec.ts` | stale `new CommandStack(world)` constructor argument at `frontend/tests/unit/commands/commandStack.spec.ts:38` | Remove the unused `world` argument so the test matches the current constructorless `CommandStack` contract. |

The review-mentioned `frontend/tests/e2e/active-plane-shortcuts.spec.ts` and `frontend/tests/unit/services/paperService.spec.ts` are not direct call sites in current grep output, but may depend on initialized-world behavior and must be covered by focused/full validation.

## CommandStack dependency direction and constructor implications

`CommandStack` currently imports `Command` only (`frontend/src/commands/CommandStack.ts:16`) and declares no constructor (`frontend/src/commands/CommandStack.ts:22`); it does not import `World` or own application initialization. The existing `new CommandStack(world)` in `frontend/tests/helpers/worldHelpers.ts:43` is a stale extra argument and should be removed during the accepted direct implementation. The allowed direction remains `application initializer -> commands/CommandStack -> domain World`; the forbidden direction is `World -> CommandStack`.

## Validation plan for implementation wave

Focused validation:

1. Do not add `createProjectRuntime()` tests in Wave 001 because the runtime is rejected for this wave.
2. Unit-test world initializer internals as in direct proposal.
3. Architecture test:
   - `World.ts` has no imports from `frontend/src/commands/`, `frontend/src/services/`, Vue components, stores, or persistence.
   - `App.vue` initialization calls use the application initializer; direct construction remains until a future runtime/app-shell wave.
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
| This can drift into Wave 009 `App.vue` shell extraction. | High | Reject runtime for Wave 001; only move initialization orchestration into `initializeWorld(world, commandStack)`. |
| Child components may assume separate injected `world`/`commandStack` tokens. | Medium | Do not change provide/inject tokens in Wave 001; App.vue continues providing the existing objects. |
| Introducing runtime without sign-out/load APIs would create stale-reference or bypass behavior. | High | Reject runtime for Wave 001; record it as Wave 009 input where sign-out/load/autosave lifecycle can be designed together. |
| More files touched than the direct proposal. | Medium | Avoid extra runtime files; use the direct proposal's implementation surface. |
| Moving `DependencyService` into domain may still be broad. | Low | Current evidence shows only `World.ts` directly imports it; mechanically move to `frontend/src/domain/world/DependencyService.ts` and delete the old service path with no re-export. |

## Comparison with direct proposal

| Criterion | Direct proposal | Restructure proposal |
|---|---|---|
| Deletes `World.initialize(commandStack)` | Yes | Yes |
| Removes `World` command/application imports | Yes | Yes |
| Moves ownership one conceptual layer higher | Partly: initializer function | Runtime/composition module rejected for Wave 001 |
| Touches `App.vue` | Replaces call sites only | Rejected for Wave 001; future runtime would replace construction and lifecycle together |
| Risk of broadening into app shell | Low | High for restructure in Wave 001 |
| Better long-term boundary | Good | Better only when handled as a future full app-shell lifecycle wave |

## Recommendation

Do not choose the restructure proposal for Wave 001. Choose the direct initializer proposal now. Record `ProjectRuntime`/application shell extraction as Wave 009 input, where reset, load-clear, sign-out, autosave, and Vue provide/inject reference semantics can be designed as one coherent lifecycle boundary.
