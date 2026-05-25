# Decision — Wave 004: Command/Undo + Persistence Contract

**Stage:** `cycle-004-decision`  
**Cycle directory:** `architecture-audit/cycle-004-command-undo-persistence-contract/`  
**Decision date:** 2026-05-25  
**Source-code changes in this stage:** none.

## Artifacts considered

This decision is based on the current Wave 004 artifact set:

- Scope check: `architecture-audit/cycle-004-command-undo-persistence-contract/scope-check.md`
- Direct proposal: `architecture-audit/cycle-004-command-undo-persistence-contract/proposals/proposal-direct.md`
- Restructure proposal: `architecture-audit/cycle-004-command-undo-persistence-contract/proposals/proposal-restructure.md`
- Round 01 review: `architecture-audit/cycle-004-command-undo-persistence-contract/reviews/round-01-review.md`
- Wave plan entry: `architecture-audit/wave-plan.md`, Wave 004 — “Define the command/undo and persistence contract, then delete migration/private-cast paths”

The scope check concludes that Wave 004 can proceed without editing `wave-plan.md`: Waves 001–003 strengthened the premise that persistence must target the cleaned `World`/projection-plane state and command stream, while `ProjectService` still private-casts into command/world/stack internals and still carries migration/backcompat paths.

## Review convergence verdict

Review convergence is complete after round 01.

The primary review artifact, `reviews/round-01-review.md`, records **NO BLOCKING ISSUES** for Proposal Direct and recommends it for implementation. The review scores Proposal Direct as a strong fit for the wave target, architecture/code-quality priorities, no-backcompat deletion priorities, and validation requirements. The review classifies its concerns W1–W3 as implementation-phase warnings, not design blockers.

No second opinion is required. No manager synthesis was required because the reviewer produced the artifact on the first dispatch attempt.

## Selected proposal

**Selected for implementation:** `proposals/proposal-direct.md` — **Typed Operation Registry + Explicit Command/Undo Restoration APIs**.

Proposal Direct is selected because it implements the Wave 004 target while preserving the current command-sourced persistence model:

1. It adds explicit typed command/undo restoration APIs instead of allowing persistence to construct fake command objects or push into private stacks.
2. It moves operation serialization/deserialization into a typed operation descriptor/registry contract instead of keeping a large `ProjectService.reconstructOperation()` switch.
3. It deletes private-field casts, migration/backcompat branches, corrupted-operation fallbacks, and broad `any` boundaries at the persistence contract.
4. It fixes the save-time world-ID side effect by requiring a non-mutating `World.peekNextId()` or equivalent.
5. It fits one implementation cycle and does not pull Wave 005 process-tree ownership or later UI/rendering concerns forward.

## Rejected / deferred alternative

**Rejected for Wave 004 implementation:** `proposals/proposal-restructure.md` — **Current-Format Domain Snapshot Contract + Undo History Rebuild Boundary**.

Proposal Restructure is architecturally plausible but is deferred because the round 01 review identifies material one-cycle risks:

- A snapshot contract must encode construction definitions and dependency/process graph state for dependent geometry, auxiliary planes, 3D reconstructed elements, and process-tree state. Missing one dependency field could break parametric recomputation after load.
- The snapshot direction introduces unsettled undo-after-load semantics: either historic undo history is dropped/redefined through a load command, or both snapshot and typed command history are persisted, collapsing back toward Proposal Direct plus extra scope.
- It touches Wave 005 process-tree territory before the command/persistence boundary has been stabilized.
- The proposal itself recommends not selecting it unless reviewers intentionally reject command history as the project-file contract.

The snapshot idea may be reconsidered only through a future reviewed wave-plan edit if later waves conclude that command-sourced project files are the wrong long-term contract. It is not part of the next implementation scope.

## Implementation scope for the next stage

The implementation stage must follow Proposal Direct exactly. No implementation may deviate from this decision or from `proposal-direct.md` without a new mini-cycle consisting of a delta proposal, one bounded review round, and sign-off.

The next implementation stage must change only the files needed to implement Proposal Direct’s selected contract, including the following scope.

### Command and undo APIs

- `frontend/src/commands/Command.ts`
  - Add typed command snapshot/restoration input types.
  - Add a restoration factory such as `Command.restore(...)` that returns a real committed command with restored id, timestamp, description, status, and operation order.
  - Keep normal command creation nondeterministic/fresh; restored identity and timestamps must only be supplied through the restore path.
  - Expose serializable operation inspection through typed APIs rather than mutable internals.

- `frontend/src/commands/CommandStack.ts`
  - Expose readonly committed-command inspection if the existing API is insufficient.
  - Add a typed restoration API for committed/undo history, such as `restoreCommittedCommands(...)`.
  - Notify listeners through the stack API rather than through private array mutation.
  - Do not persist redo state unless implementation finds current evidence that redo state is already persisted. Current evidence and review W3 say it is not.

- `frontend/src/domain/world/World.ts`
  - Add a non-mutating next-ID read API such as `peekNextId()`.
  - Add a validated restore API such as `restoreNextId(nextElementId: number)`.
  - Preserve existing ID generation behavior except for accepting a restored counter during project load.

### Operation contract and registry

- `frontend/src/commands/operations/IOperation.ts`
  - Replace the main persistence boundary’s broad `Record<string, any>` / optional fallback model with JSON-compatible typed descriptor types.
  - Replace documentation that instructs contributors to add cases to `ProjectService.reconstructOperation()` or to expose `parameters: Record<string, any>`.

- `frontend/src/commands/operations/**`
  - Convert active operations to typed descriptors and colocated restore/from-descriptor functions or equivalent registry hooks.
  - Create a small operation registry plus family-level registrars, avoiding a new god-module.
  - Ensure every registered `opType` is unique and every active persisted operation is covered.
  - Move generated-output persistence state out of mutable `parameters` bags and into typed output state.

### Project service and app persistence calls

- `frontend/src/services/ProjectService.ts`
  - Depend on the operation registry/contract module rather than importing every concrete operation class solely for deserialization.
  - Serialize through command/stack/operation descriptor APIs instead of `(cmd as any).operations` or fallback `parameters`/`outputs` bags.
  - Deserialize through `Command.restore(...)`, operation-registry restore functions, `World.restoreNextId(...)`, and command-stack restoration APIs.
  - Delete the migration helpers, corrupted-operation skips, legacy vector/parameter fallbacks, debug logs attached to removed load/replay internals, and the monolithic `reconstructOperation()` switch.
  - Validate the current schema only and fail fast on old/corrupt project data.

- `frontend/src/App.vue`
  - Replace save-path calls that read the next element ID through incrementing `world.getNextId()` with the non-mutating next-ID read API.
  - Keep Drive/local orchestration behavior unchanged except for typed API names and signatures required by the new persistence contract.

### Tests

The implementation must add, delete, or rewrite tests as specified by Proposal Direct:

- Add/update command snapshot/restore tests.
- Add/update command-stack restoration tests.
- Add operation-registry coverage and descriptor round-trip tests.
- Update ProjectService round-trip, self-containment, determinism, cascade-deletion, and process-tree persistence tests to the current typed contract.
- Delete or rewrite tests that encode the old `ProjectService.reconstructOperation()` switch/private-cast architecture.
- Delete or replace the obsolete backend/legacy DTO persistence e2e if it still targets inactive `localhost:3000/api/projects` and `elements2D` DTOs.

## Aggressive DELETE list

The implementation must delete, not wrap, the following legacy surfaces unless the implementation records a reviewed mini-cycle changing this decision:

1. Private-cast persistence paths:
   - `(cmd as any).operations` in `ProjectService.serializeCommands()`.
   - `(world as any).nextId` in `ProjectService.deserializeCommands()`.
   - `(op as any).parameters` debug/load paths.
   - `(commandStack as any).undoStack.push(...)`.

2. Broad fallback operation serialization:
   - Any persistence fallback that serializes `op.parameters` / `op.outputs` when `serialize()` is absent.
   - Main-boundary `Record<string, any>` descriptor shapes where replaced by current typed descriptors.

3. Migration/backcompat/corruption handling:
   - `migrateIdToCamelCase`, `migrateHierarchicalId`, `migrateOperationParams`, `migrateProjectData`, and related migration logging.
   - Corrupted-operation skip paths that return `null as any`.
   - Legacy `AddPlane3D` orientation conversion branches.
   - Object-vs-array vector fallback and old parameter-name fallback branches, after serializers/tests are normalized to one current shape.

4. Monolithic service reconstruction:
   - `ProjectService.reconstructOperation()` and the concrete operation imports in `ProjectService` that exist solely to support that switch.
   - The legacy `AddIntersectionPoint2D` service-switch branch. The `AddIntersectionPoint2DOp` class itself must be resolved during implementation: delete it only if the implementation proves the class/tests are dead architecture; otherwise move its current-format restoration into the registry.

5. Obsolete tests/docs/comments:
   - Old `frontend/tests/unit/architecture/serializationCoverage.spec.ts` switch-coverage architecture test, unless fully replaced by a registry coverage test.
   - Old `frontend/tests/unit/services/ProjectService.serialization.test.ts` service-switch tests, unless fully rewritten as registry contract tests.
   - `frontend/tests/e2e/persistence.spec.ts` if it still targets the inactive backend/legacy DTO path rather than current frontend persistence.
   - `IOperation` documentation instructing contributors to edit `ProjectService.reconstructOperation()` or expose broad parameter bags.

## Accepted residual risks and constraints

The following round-01 review warnings are accepted as implementation constraints:

### W1 — `AddGuideOp` mutable parameter bags

Guide operations currently back-fill generated guide IDs into mutable `parameters` during `apply()` while undo reads output state. Implementation must remove this persistence mutation pattern carefully and verify all paths are consistent:

- `apply()` must record generated guide IDs in typed output state.
- `undo()` and redo/re-apply paths must use the same typed state.
- `serialize()` must not fall back to `parameters.guideId`.
- Registry restoration must recreate the operation with enough typed input/output data for undo/redo and round-trip persistence.

### W2 — `Command.restore(...)` creation semantics

`Command.restore(...)` must be the sole way to create a command with persisted id/timestamp/status metadata. Normal command construction must continue to generate fresh IDs and timestamps. The implementation must avoid a public constructor or helper that accidentally lets ordinary editing paths inject restored metadata.

### W3 — Redo-state persistence semantics

Current persistence serializes committed undo history only, not redo history. The implementation must preserve that semantic: restore committed/undo commands only, and do not add redo persistence unless current source/tests prove redo state is already part of the project file contract and a reviewed mini-cycle updates this decision.

### Additional accepted risks

- The operation-registry migration touches many active operation files. This is accepted because it replaces the current broad, private-cast boundary with the typed contract required by Wave 004.
- Line numbers cited in proposals/reviews are evidence, not implementation instructions; implementation must verify references against the current source before editing.
- If a proposed focused Vitest file does not exist, the implementation may adjust the command list while preserving equivalent focused coverage and documenting the adjustment in `implementation-log.md`.

## Validation requirements for the implementation stage

The implementation stage must capture full stdout/stderr logs under:

`architecture-audit/cycle-004-command-undo-persistence-contract/validation/`

Required validation:

1. Static deletion/reference checks for private casts, broad descriptor `any`/`Record<string, any>` boundaries, `reconstructOperation`, migration helper names, corrupted/legacy/backcompat branches, and private undo-stack mutation.
2. Focused Vitest for command restore, command-stack restore, operation registry, ProjectService round-trip/self-containment/process-tree persistence, determinism, and cascade deletion surfaces touched by the wave.
3. Full project validation cadence required by the wave plan: root/workspace lint where defined, full Vitest, root/frontend/backend builds where defined, and frontend Playwright/e2e because this wave touches frontend persistence and user-observable save/open behavior.
4. Behavioral persistence checks proving current-format save/open preserves geometry, process tree state, next element ID, and undo/redo after load per the committed-history-only semantics.
5. Failure tests proving unknown op types and old/corrupt schema records fail fast rather than migrating or skipping.
6. Drive/local persistence coverage. If live Drive credentials are unavailable, do not read secrets; use mocked Drive service coverage and document the live Drive limitation in the implementation log.
7. Live preview refresh after successful validation: restart/refresh the app on `0.0.0.0`, probe `http://127.0.0.1:5173/`, and record the command/PID/probe result in `implementation-log.md`.

## Non-deviation rule

The implementation stage must implement Proposal Direct as selected here. If implementation discovers that the selected registry/command-stream contract is infeasible, or if it needs to alter redo persistence, switch to a snapshot contract, preserve migration compatibility, retain a private-cast path, or keep a legacy test/path from the DELETE list, it must stop and request a mini-cycle. The mini-cycle must include a delta proposal, one bounded review round, and a decision update before source changes continue.
