# Proposal Restructure — Current-Format Domain Snapshot Contract + Undo History Rebuild Boundary

## Summary

Evaluate one conceptual layer higher: instead of treating operation replay as the project file contract, make the project file a typed current-format domain snapshot (`World` + process/dependency-relevant domain state) and treat command history as an optional in-memory undo concern rebuilt from a snapshot-load command boundary.

This proposal is intentionally more disruptive than the direct registry proposal. It asks whether persistence should target the authoritative domain model established by Waves 001–003 rather than operation constructors. It would delete `ProjectService`'s command-sourcing reconstruction switch and avoid operation registries as a persistence concern, but it must solve a harder question: how to preserve or intentionally redefine undo/redo after load.

## Why consider a higher-level fix?

- The current command-stream persistence contract couples project files to operation constructor details. `ProjectService` imports every concrete operation class (`frontend/src/services/ProjectService.ts:23-65`) and maps serialized records back to constructors in a large switch (`frontend/src/services/ProjectService.ts:395-761`).
- Operation descriptors leak internal execution mechanics: operations store constructor fields, broad `parameters`, mutable `outputs`, and bespoke serializers. Example `AddFreePoint2DOp` mirrors `planeId`/`position` into `parameters`, then serializes both input and output ID after apply (`frontend/src/commands/operations/world/AddFreePointOp.ts:11-21`, `frontend/src/commands/operations/world/AddFreePointOp.ts:31-33`, `frontend/src/commands/operations/world/AddFreePointOp.ts:56-62`).
- Wave 003 established one authoritative state source (`World` and projection planes), so persistence could target that state directly instead of replaying every historic mutation.
- Current loading already has to patch non-operation state after replay (active plane fallback at `frontend/src/services/ProjectService.ts:373-380`) and private-write ID counters (`frontend/src/services/ProjectService.ts:311-314`). A snapshot contract can make those fields explicit.

## Target outcome

- Project files store one typed current-format snapshot of the authoritative domain state and project metadata.
- `ProjectService` no longer imports operation classes for deserialization and no longer reconstructs operations to load a file.
- `World` exposes typed export/import snapshot APIs or a separate `WorldSnapshotMapper` owns conversion through narrow domain accessors.
- Undo/redo after load is explicitly defined through one of two reviewed choices:
  1. **Preferred if feasible in one cycle:** create one real `LoadProjectSnapshotCommand` or `ReplaceWorldSnapshotCommand` that can undo to the pre-load snapshot and redo to the loaded snapshot, while normal future edits create regular commands. The historic pre-save undo stack is not persisted.
  2. **Alternative if product requirement demands historic undo:** persist both a snapshot and a typed command-history registry. This collapses back toward Proposal Direct and should not be selected unless reviewers reject losing historic undo after load.
- Old migration/backcompat/private-cast paths are deleted. Old project versions fail fast.

## Files to change

### Snapshot contract

- Create `frontend/src/domain/world/WorldSnapshot.ts`
  - Define current-schema snapshot DTOs for projection planes, 2D elements (points/lines/segments/circles/guides), 3D planes/elements, hinge lines, process tree/action groups, dependency-relevant references, label generator state if needed, active plane, and ID counters.
  - Use JSON-compatible typed fields, not `any` or class instances.

- Create `frontend/src/domain/world/WorldSnapshotMapper.ts` or `frontend/src/application/project/WorldSnapshotMapper.ts`
  - Export `exportWorldSnapshot(world): WorldSnapshot` and `restoreWorldSnapshot(snapshot, world): void`.
  - Prefer domain/application mapper over adding a massive serialization method to `World` if that keeps `World` from becoming a persistence god-module.
  - Use existing domain accessors where possible. If private domain state lacks accessors, add narrow typed accessors/restorers rather than broad map exposure.

- `frontend/src/domain/world/World.ts`
  - Add narrow snapshot restoration hooks only if needed: clear/replace projection planes, restore active plane, restore ID counters, and restore process tree through typed APIs.
  - Add `peekNextId()`/`restoreNextId(...)` regardless; current save uses incrementing `getNextId()` from `App.vue` (`frontend/src/App.vue:386`, `frontend/src/App.vue:524`, `frontend/src/App.vue:547`, `frontend/src/App.vue:584`).

- `frontend/src/domain/processTree/**`
  - Add snapshot export/restore APIs if ProcessTree state cannot otherwise be reconstructed cleanly.
  - This touches Wave 005 territory, so the implementation must keep the API minimal and defer deprecated process API cleanup to Wave 005.

### Command/undo boundary

- `frontend/src/commands/Command.ts`
  - Add a typed command factory for snapshot replacement if undo-after-load is preserved by a command, e.g. `createReplaceWorldSnapshotCommand(beforeSnapshot, afterSnapshot, world, mapper)`.
  - Alternatively add a generic `Command.restore(...)` only for the single load command, not for every historic operation.

- `frontend/src/commands/CommandStack.ts`
  - Add `replaceHistoryAfterProjectLoad(command?: Command): void` or `clearAndPushLoadCommand(command)`.
  - Delete the need for `ProjectService` to touch private stacks.

### Project service

- `frontend/src/services/ProjectService.ts`
  - Replace command-stream `ProjectData.commands` with a typed `snapshot` field.
  - Replace `serializeCommands(...)` with `serializeProject(world, projectName)` (or keep a compatibility name only if changed call sites are updated immediately; do not preserve overloads).
  - Replace `deserializeCommands(data, world, commandStack)` with `loadProjectSnapshot(data, world, commandStack)`.
  - Delete imports of every operation class (`frontend/src/services/ProjectService.ts:23-65`).
  - Delete all operation reconstruction, migration, and broad fallback paths (`frontend/src/services/ProjectService.ts:99-255`, `frontend/src/services/ProjectService.ts:395-761`).
  - Validate current snapshot schema only.

- `frontend/src/App.vue`
  - Update save/open/autosave paths to call the snapshot API. Existing Drive/local orchestration remains in App for now because app-shell extraction is later Wave 009.

### Tests

- Create `frontend/tests/unit/domain/worldSnapshot.spec.ts`
  - Export/restore empty initialized world, simple 2D geometry, dependent geometry (line/circle intersections), auxiliary planes, and 3D reconstructed elements if currently representable.

- Create `frontend/tests/unit/services/ProjectService.snapshot.spec.ts`
  - Project file schema validation, current-schema fail-fast behavior, metadata, ID counter preservation, active plane preservation, and no operation-class imports.

- Update or replace round-trip/determinism tests:
  - `frontend/tests/unit/services/ProjectService.roundTrip.spec.ts`
  - `frontend/tests/unit/services/ProjectService.selfContainment.spec.ts`
  - `frontend/tests/integration/projectService.determinism.spec.ts`
  - `frontend/tests/integration/projectService.cascadeDeletion.spec.ts`

- Delete operation serialization architecture tests and service reconstruction tests unless reused for command undo internals.

## Explicit DELETE list

- Delete command-stream project file contract from `ProjectService` if snapshot is selected:
  - `ProjectData.commands` and `SerializedCommand` as persistence DTOs (`frontend/src/services/ProjectService.ts:70-88`).
  - `serializeCommands(...)` and `deserializeCommands(...)` command replay implementation (`frontend/src/services/ProjectService.ts:257-380`).
  - `reconstructOperation(...)` switch (`frontend/src/services/ProjectService.ts:395-761`).
  - Concrete operation imports in ProjectService (`frontend/src/services/ProjectService.ts:23-65`).
- Delete private-cast paths:
  - `(cmd as any).operations` (`frontend/src/services/ProjectService.ts:271`).
  - `(world as any).nextId` (`frontend/src/services/ProjectService.ts:313`).
  - `(op as any).parameters` (`frontend/src/services/ProjectService.ts:356-358`).
  - `(commandStack as any).undoStack.push(...)` (`frontend/src/services/ProjectService.ts:369-370`).
- Delete migration/backcompat/corrupt fallback code:
  - Migration helpers (`frontend/src/services/ProjectService.ts:99-255`).
  - Corrupted-operation skip (`frontend/src/services/ProjectService.ts:423-429`).
  - Legacy `AddPlane3D` / old vector object / parameter-name fallback branches (`frontend/src/services/ProjectService.ts:572-630`).
- Delete obsolete tests that encode command-sourced persistence as the project file API:
  - `frontend/tests/unit/architecture/serializationCoverage.spec.ts`.
  - `frontend/tests/unit/services/ProjectService.serialization.test.ts`.
  - Backend/legacy DTO e2e persistence spec (`frontend/tests/e2e/persistence.spec.ts`) unless rewritten.

## Expected behavior change

- Save/open loads the final authored project state from a current-format snapshot instead of replaying historical operations.
- Old files containing command streams are rejected under no-backcompat priorities.
- Historic pre-save undo stack is not preserved unless the implementation explicitly persists it too. Preferred behavior: after opening a file, the stack is empty or contains a single load/replace command; subsequent user edits have normal undo/redo.
- Project load becomes less sensitive to operation constructor changes, making later UI/tool/process refactors easier.

## Risks and trade-offs

- **Undo/redo after load acceptance risk:** The Wave 004 acceptance criteria name undo/redo after load. If reviewers interpret that as preserving historic command-by-command undo from before save, a pure snapshot is insufficient. It can only guarantee undo/redo for post-load edits or a single replace-world load command unless command history is also persisted.
- **Snapshot mapper scope risk:** `World` and `ProcessTree` may lack enough typed read/restore APIs. Adding them could expand into Wave 005 process ownership or a domain god-serializer if not tightly bounded.
- **Parametric/process graph completeness risk:** A snapshot must include construction definitions and process/dependency links, not just rendered coordinates, or parametric updates will break. This is harder than typed operation replay because operations already encode dependencies during apply.
- **One-cycle size risk:** Comprehensive world snapshot export/restore across fixed planes, auxiliary planes, guides, intersections, 3D elements, process tree, and dependency service may exceed a single wave implementation cycle.

## Validation plan for implementation wave

Capture logs under `architecture-audit/cycle-004-command-undo-persistence-contract/validation/`.

1. Static deletion checks:
   - No `ProjectService` import from `frontend/src/commands/operations/**`.
   - No `reconstructOperation`, migration helpers, private casts, or `Record<string, any>` at the project-file boundary.
2. Focused Vitest:
   - `worldSnapshot.spec.ts`, `ProjectService.snapshot.spec.ts`, command-stack load-command tests, and updated determinism/cascade/self-containment tests.
3. Behavior tests:
   - Save/open simple and dependent geometry.
   - Save/open auxiliary planes and 3D reconstructed elements if reachable in current tests.
   - Active plane and next ID counter preserved.
   - Parametric update after load still recomputes dependent geometry.
   - Undo/redo after load per selected semantics: either single load command undo/redo or normal post-load edit undo/redo.
4. Full validation cadence:
   - Root/frontend lint, focused Vitest, full root Vitest, root/frontend/backend builds where defined, frontend Playwright e2e.
5. Drive/local persistence:
   - Mock Drive-backed save/load around `GoogleDriveService` without reading secrets.
   - Live UI save/open where current credentials/UI allow; otherwise document why Drive live path is not exercised and rely on mocked Drive plus local project data tests.
6. Live preview:
   - Restart on `0.0.0.0` and probe `http://127.0.0.1:5173/`.

## Recommendation

Do **not** select this proposal for Wave 004 unless reviewers decide that command history should no longer be the project-file contract. The snapshot direction is architecturally attractive because it decouples persistence from operation constructors, but it is larger and risks weakening historic undo-after-load. The direct operation-registry proposal better fits one cycle and the existing command-sourced behavior while still deleting private casts, migrations, and broad `any` boundaries.
