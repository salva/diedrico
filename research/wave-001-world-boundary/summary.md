# Wave 001 World/Application Boundary Research Summary

**Date:** 2026-05-25  
**Stage:** `cycle-001-fresh-scout-proposals`  
**Purpose:** Support scope check and proposals for Wave 001 without modifying application source.

## 30-second summary

Wave 001 remains valid. `frontend/src/domain/world/World.ts` still imports command/application infrastructure and exposes `initialize(commandStack)`, which constructs and pushes a command from inside the domain root. The best bounded implementation path is to move initialization orchestration into an application initializer or minimal runtime module, replace `App.vue` call sites, and delete the old `World.initialize` API and command imports.

## Key evidence

- `World.ts` imports `DependencyService`, `Command`, `buildWorldInitialization`, and `CommandStack` (`frontend/src/domain/world/World.ts:94`, `frontend/src/domain/world/World.ts:105`, `frontend/src/domain/world/World.ts:106`, `frontend/src/domain/world/World.ts:110`).
- `World.initialize(commandStack)` constructs `new Command('Initialize World', this)`, delegates to `buildWorldInitialization`, commits, pushes to stack, and marks world dirty (`frontend/src/domain/world/World.ts:197`, `frontend/src/domain/world/World.ts:206`).
- Active call sites are in application lifecycle code in `App.vue` (`frontend/src/App.vue:323`, `frontend/src/App.vue:384`, `frontend/src/App.vue:439`).
- Existing initialization sequence already lives in `InitializationSequenceFactory.buildWorldInitialization(world, cmd, groupId)` (`frontend/src/commands/factories/InitializationSequenceFactory.ts:39`), which makes relocation feasible.
- Descriptor registration is already runtime composition in `main.ts` (`frontend/src/main.ts:24`, `frontend/src/main.ts:25`) and does not need to be moved into the domain.

## Artifacts written

- `architecture-audit/cycle-001-invert-world-application-boundary/scope-check.md`
- `architecture-audit/cycle-001-invert-world-application-boundary/proposals/proposal-direct.md`
- `architecture-audit/cycle-001-invert-world-application-boundary/proposals/proposal-restructure.md`

## Recommendation

Prefer `proposal-direct.md` if the implementation cycle must be maximally bounded: application initializer + delete `World.initialize` + import-boundary tests. Choose `proposal-restructure.md` only if reviewer accepts a minimal runtime composition module without broader `App.vue` shell extraction.
