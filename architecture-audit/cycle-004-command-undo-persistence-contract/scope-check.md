# Scope Check — Wave 004: Command/Undo + Persistence Contract

**Stage:** `cycle-004-fresh-scout-proposals`  
**Wave plan entry:** Wave 004 — Define the command/undo and persistence contract, then delete migration/private-cast paths  
**Source-code changes in this stage:** none.

## Verdict

Wave 004 can proceed without editing `architecture-audit/wave-plan.md`.

The premises still hold after Waves 001–003. Wave 001 moved initialization orchestration out of `World`, Wave 002 split the projection-plane domain modules, and Wave 003 deleted the duplicate store/workspace geometry path. Those changes make Wave 004 more central, not less: project persistence now targets the cleaned `World`/projection-plane state and the command stream, but the persistence boundary still reaches into private command/world/stack internals and still encodes old migration/compatibility paths.

## Evidence that Waves 001–003 changed the starting point

- Wave 001 deleted `World.initialize(commandStack)` and made initialization an application use case; the implementation log says `frontend/src/domain/world/World.ts` no longer imports command/application initialization infrastructure and `frontend/src/application/world/initializeWorld.ts` now owns the initializer (`architecture-audit/cycle-001-invert-world-application-boundary/implementation-log.md`). Current `World` confirms initialization is not automatic: constructor comments say initialization is explicit and outside the domain root (`frontend/src/domain/world/World.ts:180-182`), and `clear()` also does not reinitialize automatically (`frontend/src/domain/world/World.ts:256-257`).
- Wave 002 deleted the old `frontend/src/domain/world/ProjectionPlane.ts` monolith and created focused `projectionPlane/` modules (`architecture-audit/cycle-002-split-projection-plane-domain-god-module/implementation-log.md`). Current operations now import/use those cleaned domain surfaces through `World`/plane APIs, e.g. `AddAuxiliaryProjectionPlaneOp` imports `AuxiliaryProjectionPlane` from the new module (`frontend/src/commands/operations/world/AddAuxiliaryProjectionPlaneOp.ts:21-24`).
- Wave 003 deleted the store-backed duplicate geometry path and dead workspace files (`architecture-audit/cycle-003-authoritative-world-state-delete-dead-store-workspace/implementation-log.md`). Persistence no longer has to preserve that path; active save/open calls still run through `ProjectService.serializeCommands(...)` and `ProjectService.deserializeCommands(...)` from `App.vue` (`frontend/src/App.vue:386-430`, `frontend/src/App.vue:524-589`).

## Current command/undo contract

- `Command` is still the generic operation container and stores `protected operations: IOperation[]` plus `protected world: World` (`frontend/src/commands/Command.ts:86-92`). It has a typed read API, `getOperations(): readonly IOperation[]`, but `ProjectService` does not use it (`frontend/src/commands/Command.ts:101-107`; `frontend/src/services/ProjectService.ts:267-282`).
- `Command` creates nondeterministic runtime IDs/timestamps in the constructor (`frontend/src/commands/Command.ts:94-99`, `frontend/src/commands/Command.ts:230-235`). Loading bypasses the constructor by building a command-like object literal instead of restoring a real `Command` (`frontend/src/services/ProjectService.ts:330-349`).
- `CommandStack` keeps private undo/redo arrays (`frontend/src/commands/CommandStack.ts:21-24`) and exposes read-only committed commands through `getCommands()` (`frontend/src/commands/CommandStack.ts:132-137`). It does not expose a typed restoration API, so deserialization pushes directly into `(commandStack as any).undoStack` (`frontend/src/services/ProjectService.ts:369-370`).
- `World` still has a private `nextId` counter (`frontend/src/domain/world/World.ts:136`) with an incrementing `getNextId()` accessor (`frontend/src/domain/world/World.ts:267-271`) but no explicit restore/peek API. `ProjectService` restores it through `(world as any).nextId` (`frontend/src/services/ProjectService.ts:311-314`).

## Current operation serialization contract

- `IOperation` explicitly requires broad `Record<string, any>` outputs, parameters, and serialized operation index signatures (`frontend/src/commands/operations/IOperation.ts:116-128`, `frontend/src/commands/operations/IOperation.ts:134-160`). The interface comments still instruct new operations to add a case to `ProjectService.reconstructOperation()` and expose `parameters: Record<string, any>` (`frontend/src/commands/operations/IOperation.ts:51-68`).
- Concrete operations often duplicate state across constructor private fields, broad `parameters`, `outputs`, and bespoke `serialize()` methods. Example: `AddFreePoint2DOp` stores `planeId`/`position` as private constructor parameters, mirrors them into `parameters`, mutates `outputs` during `apply`, and serializes an untyped array position plus optional output ID (`frontend/src/commands/operations/world/AddFreePointOp.ts:11-21`, `frontend/src/commands/operations/world/AddFreePointOp.ts:31-33`, `frontend/src/commands/operations/world/AddFreePointOp.ts:56-62`).
- Some operations mutate broad parameter bags during apply for persistence, e.g. guide operations back-fill generated IDs into `this.parameters` (`frontend/src/commands/operations/world/AddGuideOp.ts:31-40`, `frontend/src/commands/operations/world/AddGuideOp.ts:105-114`).
- Current persistence has no discriminated operation descriptor type. `ProjectService` defines `SerializedOperation` as `{ opType: string; [key: string]: any }` (`frontend/src/services/ProjectService.ts:90-96`).
- `AddIntersectionPoint2DOp` is still an active operation class/export, but current production source only references it through the world-operation barrel and `ProjectService` reconstruction; no frontend tool/source call site constructs it directly after Waves 001–003. Current unit tests still instantiate it as a command operation (`frontend/src/commands/operations/world/AddIntersectionPointOp.ts:13-14`; `frontend/src/commands/operations/world/index.ts:10`; `frontend/tests/unit/commands/createIntersectionPoint.spec.ts:46`). Therefore Wave 004 must not blindly delete the class unless implementation proves the tests encode dead architecture; at minimum it must delete the legacy `ProjectService` switch branch by moving current-format restoration into the operation registry.

## Current persistence contract and leaks

- `ProjectService` imports many concrete operation classes solely for deserialization (`frontend/src/services/ProjectService.ts:23-65`). This keeps the operation reconstruction registry as a large service-layer switch rather than an operation-owned contract.
- Save is command-sourced: `serializeCommands()` takes a `CommandStack`, a caller-supplied next element ID, and a project name, then serializes the undo stack (`frontend/src/services/ProjectService.ts:257-294`). It uses `(cmd as any).operations` instead of `Command.getOperations()` and falls back to `op.parameters`/`op.outputs` when `serialize()` is missing (`frontend/src/services/ProjectService.ts:267-282`).
- Load mutates passed-in objects in place: applies migrations, validates, clears the stack, sets private `World.nextId`, reconstructs operations, replays them into the world, and private-pushes command-like objects into the undo stack (`frontend/src/services/ProjectService.ts:301-370`).
- Load path includes verbose debug logging in normal persistence flow (`frontend/src/services/ProjectService.ts:314-326`, `frontend/src/services/ProjectService.ts:353-366`). Debug logging cleanup is broadly planned for Wave 012, but Wave 004 should delete logs that are attached to removed migration/private-cast code.
- The operation reconstruction switch is monolithic (`frontend/src/services/ProjectService.ts:395-761`). It contains legacy/backcompat branches and fallbacks: corrupted-operation skip returning `null as any` (`frontend/src/services/ProjectService.ts:423-429`), legacy `AddIntersectionPoint2D` comment (`frontend/src/services/ProjectService.ts:564-566`), legacy `AddPlane3D` orientation conversion (`frontend/src/services/ProjectService.ts:572-581`), array-or-object format acceptance (`frontend/src/services/ProjectService.ts:583-595`, `frontend/src/services/ProjectService.ts:613-617`), and parameter-name fallbacks (`frontend/src/services/ProjectService.ts:626-630`).
- Schema migration code remains despite no-backcompat priorities: ID migration helpers and recursive `Record<string, any>` migration are present (`frontend/src/services/ProjectService.ts:99-255`), and `deserializeCommands()` applies migration before validation (`frontend/src/services/ProjectService.ts:301-306`).
- `validateProjectData(data: any)` is a broad validation boundary and checks only top-level shape/schema/commands array (`frontend/src/services/ProjectService.ts:764-793`).

## Current tests and coverage concerns

- Existing architecture coverage still encodes the old monolithic switch: `serializationCoverage.spec.ts` tells contributors to add cases to `ProjectService.reconstructOperation()` (`frontend/tests/unit/architecture/serializationCoverage.spec.ts:7-59`). This should be replaced if Wave 004 adopts an operation registry.
- `ProjectService.serialization.test.ts` directly calls `ProjectService.reconstructOperation(...)` for many ad hoc objects (`frontend/tests/unit/services/ProjectService.serialization.test.ts:11-79` and following). This both assumes reconstruction is a ProjectService API and locks in loose serialized shapes.
- Round-trip/self-containment/determinism tests already exist and are valuable implementation validation surfaces (`frontend/tests/unit/services/ProjectService.roundTrip.spec.ts`, `frontend/tests/unit/services/ProjectService.selfContainment.spec.ts`, `frontend/tests/integration/projectService.determinism.spec.ts`), but several call sites appear stale against the current `serializeCommands(commandStack, nextElementId, projectName)` signature in the source (`frontend/src/services/ProjectService.ts:261`; e.g. `frontend/tests/integration/projectService.determinism.spec.ts:91`, `frontend/tests/unit/services/ProjectService.roundTrip.spec.ts:246`). Implementation should repair or delete stale tests rather than preserving compatibility overloads.
- `frontend/tests/e2e/persistence.spec.ts` is obsolete for current frontend persistence: it targets `localhost:3000/api/projects` backend endpoints and hand-edits `elements2D` (`frontend/tests/e2e/persistence.spec.ts:18-101`, `frontend/tests/e2e/persistence.spec.ts:103-169`), while current app persistence uses browser/Drive-facing `ProjectService` calls from `App.vue` (`frontend/src/App.vue:386-430`, `frontend/src/App.vue:524-589`).

## Re-ranking remaining waves after Waves 001–003

No wave-plan edit is required. The existing order remains architecturally correct:

1. **Wave 004 remains next and central.** Command history is the project file contract and the undo/redo restoration boundary; process-tree cleanup and UI command-controller extraction depend on a stable operation/command contract.
2. **Wave 005 remains after Wave 004.** ProcessTree mutations are persisted as operations (`ProjectService` reconstructs process-tree operations at `frontend/src/services/ProjectService.ts:555-562`, `frontend/src/services/ProjectService.ts:723-757`), so cleaning ProcessTree before the command/persistence contract would freeze stale serialization.
3. **Wave 006 remains after Wave 005.** UI/tool command construction should not be moved until the operation descriptors/registry or snapshot boundary is settled.
4. Later rendering, shell, backend, validation-gate, and docs waves remain dependent on these central contracts.

## Proceed / edit decision

Proceed to Wave 004 proposals without a wave-plan edit. Both proposals must explicitly choose the persistence contract and delete the current private casts, broad `any` main boundary, migration/backcompat/corrupted-operation fallbacks, obsolete tests, and either the monolithic reconstruction switch or the command-sourced format itself if a snapshot contract is selected.
