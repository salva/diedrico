# Round 01 Review — Wave 004: Command/Undo + Persistence Contract

**Stage:** `cycle-004-review-round-01`
**Reviewer:** primary reviewer, attempt 1
**Date:** 2026-05-25
**Artifacts reviewed:**
- `architecture-audit/cycle-004-command-undo-persistence-contract/scope-check.md`
- `architecture-audit/cycle-004-command-undo-persistence-contract/proposals/proposal-direct.md`
- `architecture-audit/cycle-004-command-undo-persistence-contract/proposals/proposal-restructure.md`
- `architecture-audit/wave-plan.md` (Wave 004 entry)

**Source code verified against:**
- `frontend/src/commands/Command.ts`
- `frontend/src/commands/CommandStack.ts`
- `frontend/src/commands/operations/IOperation.ts`
- `frontend/src/services/ProjectService.ts` (full 801 lines)
- `frontend/src/domain/world/World.ts` (nextId / generateId paths)
- `frontend/src/App.vue` (save/load call sites)
- `frontend/src/commands/operations/world/AddFreePointOp.ts`
- `frontend/src/commands/operations/world/AddGuideOp.ts`
- `frontend/src/commands/operations/world/AddIntersectionPointOp.ts`
- `frontend/tests/unit/architecture/serializationCoverage.spec.ts`
- `frontend/tests/unit/services/ProjectService.serialization.test.ts`
- `frontend/tests/e2e/persistence.spec.ts`
- `frontend/tests/unit/services/ProjectService.roundTrip.spec.ts`
- `frontend/tests/integration/projectService.determinism.spec.ts`

---

## Proposal Scoring Against Six Required Criteria

### Proposal Direct — Typed Operation Registry + Explicit Command/Undo Restoration APIs

#### Criterion 1: Does it advance the wave's target outcome?

**Score: Strong Yes**

The wave plan target is: "Command/undo exposes explicit typed APIs for inspection, restoration, and serialization. Persistence uses one chosen contract — typed operation descriptors/registry or a deliberate domain snapshot — without private-field casts, migration branches, corrupted-operation compatibility fallbacks, or broad `any` shapes at the main boundary."

Proposal Direct directly addresses every element:
- Typed `CommandSnapshot`/`RestoredCommandInput` and `Command.restore(...)` eliminate private-cast restoration.
- `CommandStack.restoreCommittedCommands(...)` eliminates `(commandStack as any).undoStack.push(...)`.
- `World.peekNextId()`/`restoreNextId()` eliminate `(world as any).nextId`.
- Operation registry with discriminated descriptors eliminates the monolithic `reconstructOperation()` switch.
- Deletion of migration helpers, corrupted-operation skip, and legacy format fallbacks.
- Typed `ProjectData` with discriminated operation descriptors replaces `Record<string, any>` at the boundary.

This is a direct, complete implementation of the wave target.

#### Criterion 2: Does it improve architecture and code quality?

**Score: Strong Yes**

- Eliminates all four private-cast patterns in `ProjectService` (verified at lines 271, 313, 356-358, 369-370).
- Replaces the 370-line `reconstructOperation()` switch (lines 395-761) with a composable operation-family registry pattern. The proposal explicitly warns against making the registry a new god-module and prescribes family-level registrars composed by a small `registerAllOperations()`.
- Replaces broad `Record<string, any>` on `IOperation.parameters`/`outputs` with typed `OperationDescriptor` generics. This is a fundamental type-safety improvement.
- Shrinks `ProjectService` from importing ~40 concrete operation classes (lines 23-65) to depending only on the registry/contract module.
- Addresses the `AddGuideOp` parameter-mutation anti-pattern (back-filling generated IDs into `this.parameters`) by prescribing typed output state instead of mutable persistence bags. Verified at `AddGuideOp.ts:39-40` and `AddGuideOp.ts:113-114`.
- Fixes the save-side-effect bug where `world.getNextId()` increments the counter during serialization (verified at `App.vue:386,524,547,584`).

#### Criterion 3: Does it respect no-backcompat / aggressive deletion priorities?

**Score: Yes**

- Explicitly deletes all migration code: `migrateIdToCamelCase`, `migrateHierarchicalId`, `migrateOperationParams`, `migrateProjectData` (ProjectService lines 99-255).
- Deletes corrupted-operation skip (`null as any` at line 423-429).
- Deletes legacy `AddPlane3D` orientation branch (lines 572-581).
- Deletes object-vs-array format fallbacks (lines 583-630).
- Deletes obsolete tests: `serializationCoverage.spec.ts` (verified as skip-only, encodes old switch), `ProjectService.serialization.test.ts` (verified as direct `reconstructOperation()` calls), and `e2e/persistence.spec.ts` (verified as targeting `localhost:3000/api/projects` backend).
- Deletes the monolithic reconstruction switch after registry replacement.
- Does NOT preserve any compatibility barrels, overloads, or shims.

#### Criterion 4: Does it avoid overfeaturism?

**Score: Yes**

- The proposal is focused on the command/undo/persistence contract scope defined by Wave 004. It does not attempt rendering selectors, tool controller extraction, or UI shell cleanup.
- The operation registry is the minimum needed to decouple `ProjectService` from concrete operation imports.
- `World` API changes are minimal: `peekNextId()` and `restoreNextId()` only.
- The proposal explicitly defers process-tree cleanup to Wave 005 and UI work to Wave 006+.

#### Criterion 5: Does it introduce new risks or hidden regressions?

**Score: Moderate concern — see W1 below**

- **W1 (warning):** The proposal requires changing every active operation's `IOperation` implementation to use typed descriptors instead of `Record<string, any>` parameters/outputs. This is a large surface area. While the proposal calls the change "mechanical," the guide operations currently mutate `this.parameters` during `apply()` (verified at `AddGuideOp.ts:39-40`, `AddGuideOp.ts:113-114`). Moving generated IDs from mutable `parameters` to typed output state may require careful `undo()` repair because the current `undo()` reads `this.outputs.guideId` (which is already correct), but the `serialize()` method reads `this.outputs.guideId || this.parameters.guideId` (line 70, 144) suggesting there are code paths that still depend on the parameter back-fill. The implementation must ensure all code paths (apply, undo, redo, serialize, restore) are consistent after the mutation pattern is removed.
- **W2 (info):** The `Command.restore(...)` factory introduces a second command-creation path alongside the normal constructor. The proposal correctly notes that restoration must supply persisted identity/timestamp while the normal path generates fresh ones. Implementation must ensure the normal path cannot accidentally receive restored metadata (e.g., by making `Command.restore()` the only way to create a command with a specific ID).
- **W3 (info):** The proposal mentions `CommandStack.restoreCommittedCommands()` but does not specify whether redo state is persisted. The current code does NOT persist redo state (only the undo stack is serialized). The proposal correctly says "restore committed/undo stack only unless tests prove redo state is persisted." This is fine as long as the implementation does not accidentally persist redo.

#### Criterion 6: Is the proposed validation sufficient?

**Score: Yes, with minor note**

- The validation plan covers static deletion checks, focused Vitest for all touched modules, contract/determinism behavior tests, full cadence, live app/Playwright verification, and preview refresh.
- The static deletion regex explicitly targets `as any`, `Record<string, any>`, `reconstructOperation`, migration function names, `undoStack.push`, and legacy/backcompat keywords.
- New test coverage is specified: command snapshot/restore, command-stack restore, operation registry coverage, and updated round-trip/determinism tests.
- The plan correctly identifies that Drive live testing may not be possible without credentials and prescribes mocked Drive tests as fallback with documentation.
- Minor note: the proposal's focused Vitest list includes `tests/unit/services/ProjectService.subprocess.spec.ts` which was not verified as existing. If it does not exist, the command should be adjusted at implementation time without blocker status.

---

### Proposal Restructure — Current-Format Domain Snapshot Contract + Undo History Rebuild Boundary

#### Criterion 1: Does it advance the wave's target outcome?

**Score: Partially**

- The proposal eliminates private casts, migration code, and the monolithic reconstruction switch, which advances the target.
- However, it changes the persistence contract from command-stream to domain snapshot, which is a more fundamental shift than the wave plan's "one chosen contract — typed operation descriptors/registry or a deliberate domain snapshot" language permits. The wave plan does consider snapshots as an option, but the snapshot approach introduces a significant additional concern: how to preserve undo/redo semantics after load.
- The proposal acknowledges this by offering two choices: (1) single `LoadProjectSnapshotCommand` with no historic undo, or (2) persist both snapshot + typed command history. Option (2) collapses back toward Proposal Direct with additional snapshot work, making it strictly more complex for the same wave.

#### Criterion 2: Does it improve architecture and code quality?

**Score: Yes in principle, but risky for one cycle**

- Decoupling persistence from operation constructors is architecturally attractive and aligns with the long-term direction.
- However, the `WorldSnapshot` DTO must encode construction definitions for all dependent element types (line-line intersections, line-circle intersections, circle-circle intersections, auxiliary planes, 3D reconstructed elements) and their process/dependency links. The proposal itself identifies this as a risk: "A snapshot must include construction-type-specific payloads for every dependent element class and tests must prove parametric recomputation still works after load."
- The proposal estimates 2-4 new modules, 8-12 modified files, and 3+ deleted/replaced test files. This is materially larger than Proposal Direct's 1 registry contract, 2-3 family registrar modules, targeted API changes, and rewritten tests.

#### Criterion 3: Does it respect no-backcompat / aggressive deletion priorities?

**Score: Yes**

- Same aggressive DELETE list as Proposal Direct for migration/backcompat/corrupt-fallback code.
- Additionally deletes `ProjectData.commands`, `SerializedCommand`, `serializeCommands()`, `deserializeCommands()`, and the entire command-stream persistence contract.
- Under no-backcompat priorities, rejecting old command-stream files is acceptable.

#### Criterion 4: Does it avoid overfeaturism?

**Score: No — the proposal itself recommends not selecting it**

- The proposal explicitly states: "Do **not** select this proposal for Wave 004 unless reviewers decide that command history should no longer be the project-file contract."
- The snapshot approach introduces a `WorldSnapshot` + `WorldSnapshotMapper` + `LoadProjectSnapshotCommand` (or equivalent) — three new abstractions that are not needed for the wave's core goal of cleaning the existing command-stream contract.
- The undo-after-load semantics are unsettled: the proposal presents two choices but does not recommend one definitively, which means the implementation would need to resolve an open design question during the wave cycle.

#### Criterion 5: Does it introduce new risks or hidden regressions?

**Score: Significant risks — see W4 below**

- **W4 (warning):** The parametric/process graph completeness risk is substantial. Operations currently encode dependencies implicitly through constructor parameters and apply-time world state. A snapshot must explicitly capture all of this. If any dependency is missed in the snapshot DTO, parametric recomputation will break after load. This is a correctness risk that is harder to verify than operation replay correctness.
- **W5 (warning):** The one-cycle size risk is real. The proposal estimates a scope 2-4× larger than Proposal Direct. If the cycle runs out of implementation budget, the wave may end with a partial snapshot contract that is worse than a clean operation registry because it introduces a new untested persistence format while leaving the old one in an inconsistent state.
- **W6 (info):** The proposal touches `ProcessTree` snapshot export/restore, which is Wave 005 territory. The proposal says "keep the API minimal and defer deprecated process API cleanup to Wave 005," but any snapshot that includes process-tree state necessarily couples Wave 004 to Wave 005's scope.

#### Criterion 6: Is the proposed validation sufficient?

**Score: Partially**

- The validation plan is similar to Proposal Direct's, which is good.
- However, it adds parametric-recomputation-after-load as a required test, which is a harder property to verify comprehensively. The plan says "Parametric update after load still recomputes dependent geometry" but does not specify which parametric chains must be tested.
- Missing: the plan does not specify how to verify that the snapshot DTO captures all dependency fields. An exhaustive check would require comparing snapshot-restored world state against operation-replayed world state for every element type, which is essentially the round-trip test the existing codebase already has but inverted.

---

## Verdict

**NO BLOCKING ISSUES** for Proposal Direct.

**Proposal Restructure** is not recommended for Wave 004 implementation due to the one-cycle size risk (W5) and parametric-completeness risk (W4), both of which could leave the codebase in a worse state if the cycle budget is exceeded. The proposal itself agrees ("Do not select this proposal for Wave 004 unless reviewers decide that command history should no longer be the project-file contract").

## Recommended Proposal

**Proposal Direct** is recommended for implementation.

It directly implements the Wave 004 target, eliminates all identified private casts and migration/backcompat code, improves type safety at the operation boundary, and fits within one implementation cycle. The warnings W1–W3 are implementation-phase concerns, not design blockers.

## Warnings Accepted as Implementation-Phase Items

- **W1:** Implementation must carefully repair the `AddGuideOp` parameter-mutation pattern and verify all code paths (apply, undo, redo, serialize, restore) are consistent. This is an implementation detail, not a proposal defect.
- **W2:** `Command.restore()` must be the sole path for creating commands with restored identity. The constructor must continue to generate fresh IDs.
- **W3:** Redo state should not be persisted unless implementation discovers evidence that it is currently persisted (it is not, based on current code inspection).
- **W4/W5/W6:** These apply only to Proposal Restructure and are moot if Proposal Direct is selected.

## Minor Corrections Suggested for Proposal Direct (non-blocking)

1. **Line-range references in the proposal should be treated as approximate.** The proposal cites specific line numbers in `ProjectService.ts`, but these will drift as implementation proceeds. Implementation should verify each reference against the current source rather than relying on proposal line numbers.

2. **The proposal mentions `ProjectService.subprocess.spec.ts` in its focused Vitest list** but this file's existence was not verified. If it does not exist, the test command should be adjusted at implementation time.

3. **The `AddIntersectionPoint2DOp` class** is listed in the DELETE list with a conditional: "delete the class only if implementation confirms those tests represent dead architecture, otherwise move its current-format restoration into the registry." This conditional is appropriate and should be resolved during implementation.

4. **The proposal says "Delete stale comments tying persistence to broad operation `parameters` once the registry owns serialization."** This should also include updating the large doc comment on `IOperation` (lines 1-88 of `IOperation.ts`) which currently instructs contributors to "Add case to ProjectService.reconstructOperation() switch" and "expose `parameters: Record<string, any>`." This documentation is the primary vector for the old architecture pattern and must be replaced with registry-based instructions.
