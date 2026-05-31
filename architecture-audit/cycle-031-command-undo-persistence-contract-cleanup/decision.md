# Cycle 031 Decision — Command/undo persistence contract cleanup

## Decision status

Cycle 031 review convergence is complete for the proposal set. Proceed to the unique next implementation stage:

`cycle-031-implement-command-undo-persistence-contract-cleanup`

Selected implementation path: **`proposals/proposal-direct.md`** — typed operation descriptor cleanup inside the current command-stream persistence boundary.

Rejected as primary path: **`proposals/proposal-restructure.md`**. Keep it only as a stop-condition fallback if direct implementation proves the current registry/operation boundary cannot honestly remove the live descriptor/cast seams without a higher-level persistence-contract split.

No production source, tests, package files, validation, preview refresh, or protected config/secret files were modified or executed by this decision stage.

## Evidence reviewed

Decision inputs:

- `architecture-audit/cycle-031-command-undo-persistence-contract-cleanup/scope-check.md`
- `architecture-audit/cycle-031-command-undo-persistence-contract-cleanup/proposals/proposal-direct.md`
- `architecture-audit/cycle-031-command-undo-persistence-contract-cleanup/proposals/proposal-restructure.md`
- `architecture-audit/cycle-031-command-undo-persistence-contract-cleanup/reviews/critic-round-01.md`
- `architecture-audit/cycle-031-command-undo-persistence-contract-cleanup/reviews/round-01-review.md`

Review convergence:

- `reviews/critic-round-01.md` is accepted as synthesized Critic evidence. It is explicitly marked `synthesized_by: manager` with `reason: critic_dispatch_unavailable`, matching the failure-tolerant Designer/Critic protocol.
- `reviews/round-01-review.md` records **No blocking issues found for Cycle 031 round 01** and recommends proceeding to the decision stage with `proposal-direct.md` as the preferred proposal.
- The review confirms the narrowed current-source premise: `ProjectService` is already a current-schema command-stream orchestrator, not a monolithic concrete-operation reconstruction switch or migration owner.

## Source-control hygiene baseline

This decision stage inspected scoped status and diff summary before authoring the decision. Captured logs:

- `.saivage/stages/cycle-031-decision-command-undo-persistence-contract-cleanup/logs/scoped-status.txt`
- `.saivage/stages/cycle-031-decision-command-undo-persistence-contract-cleanup/logs/scoped-status.err`
- `.saivage/stages/cycle-031-decision-command-undo-persistence-contract-cleanup/logs/scoped-diffstat.txt`
- `.saivage/stages/cycle-031-decision-command-undo-persistence-contract-cleanup/logs/scoped-diffstat.err`

Observed scoped dirty source/test context at decision time:

- Modified: `frontend/src/commands/Command.ts`
- Modified: `frontend/src/commands/factories/DeletionSequenceFactory.ts`
- Modified: `frontend/src/commands/factories/PointSequenceFactory.ts`
- Modified: `frontend/src/commands/operations/IOperation.ts`
- Modified: `frontend/src/commands/operations/world/AddCircleCircleIntersectionPoint2DOp.ts`
- Modified: `frontend/src/commands/operations/world/AddFreePointOp.ts`
- Modified: `frontend/src/commands/operations/world/AddLineCircleIntersectionPoint2DOp.ts`
- Modified: `frontend/src/commands/operations/world/AddLineLineIntersectionPoint2DOp.ts`
- Modified: `frontend/src/commands/operations/world/AddSiblingIntersectionPoint2DOp.ts`
- Deleted in scoped diffstat: `frontend/tests/e2e/active-plane-shortcuts.spec.ts`
- Deleted in scoped diffstat: `frontend/tests/e2e/selection-mask.spec.ts`
- Existing review artifacts under `architecture-audit/cycle-031-command-undo-persistence-contract-cleanup/reviews/`

Implementation must capture a fresh scoped baseline before editing. It must not silently adopt, revert, normalize, stage, or attribute the above command/operation dirty diffs or deleted e2e specs as Cycle 031 output unless the implementation log explicitly records their prior existence and a reviewed need to touch them.

## Selected target architecture

Cycle 031 keeps the current architecture choice: **current-schema command-stream persistence**.

After implementation:

1. `ProjectService` remains a thin current-schema project envelope and command-stream orchestrator.
2. `ProjectService` validates the project envelope/current schema, delegates operation descriptor restoration/validation to the registry boundary, replays operations into a fresh world, and restores committed command history.
3. `ProjectService` must not import concrete operation modules, inspect operation parameter bags, cast into `Command`/`CommandStack` internals, migrate older schemas, or reconstruct concrete operations through a local switch.
4. `CommandSnapshot` remains the persistence-facing command DTO with typed operation descriptors.
5. `Command.restore(...)`, `Command.toSnapshot()`, `CommandStack.getCommittedCommands()`, and `CommandStack.restoreCommittedCommands(...)` remain the public command/undo inspection and restoration APIs.
6. `OperationRegistry` remains the single restore/serialize boundary for active operation descriptors and owns descriptor-type dispatch and validation.
7. Persisted operation classes move away from mutable `parameters: Record<string, any>` and broad `outputs: Record<string, any>` state toward constructor-owned typed fields, typed serialized descriptors, and typed operation outputs.

## Exact implementation scope

The implementation stage may change only the files needed for the selected direct proposal within these surfaces:

### Core command and operation contracts

- `frontend/src/commands/operations/IOperation.ts`
  - Finish/normalize generic descriptor and output typing.
  - Define one current descriptor shape. Prefer the existing flat descriptor shape unless implementation evidence requires a reviewed delta.
  - Do not add dual flat-plus-payload formats, compatibility shims, or migration branches.

- `frontend/src/commands/Command.ts`
  - Preserve `CommandSnapshot`, `Command.restore(...)`, and `toSnapshot()`.
  - Keep `addAndExecute(...)` operation-result typing precise.
  - Narrow or document `getOperations()` as runtime/test inspection only if it remains; it must not be the persistence API.

- `frontend/src/commands/CommandStack.ts`
  - Preserve `getCommittedCommands()` and `restoreCommittedCommands(...)` as the only command-history persistence APIs.
  - Add no private-stack escape hatch and no persistence reads of `undoStack` internals.

### Registry and descriptor ownership

- `frontend/src/commands/operations/OperationRegistry.ts`
  - Keep registry-owned operation serialization/restoration dispatch.
  - Strengthen typing and validation enough that central casts are reduced, not merely renamed.
  - Preserve unknown-operation and duplicate-registration rejection behavior.
  - If global default registration state causes test-order coupling, fix it only within the registry/contract boundary.

- `frontend/src/commands/operations/world/registerWorldOperationDescriptors.ts`
  - Convert touched flat JSON field parsing to typed descriptor validators/restorers.
  - Keep concrete world-operation imports inside registry/descriptor registration modules, not in `ProjectService`.

- `frontend/src/commands/operations/processTree/registerProcessTreeOperationDescriptors.ts`
  - Delete the persistence cast `obj(d, 'action') as unknown as Action`.
  - Replace it with an explicit current-schema serialized action descriptor/validator/rehydration path, or stop for a delta if process-tree action persistence requires broader action-model redesign.

### Operation implementations

- Active persisted operation modules under:
  - `frontend/src/commands/operations/world/*.ts`
  - `frontend/src/commands/operations/processTree/*.ts`

Allowed changes:

- Delete mutable `parameters: Record<string, any>` bags where they duplicate constructor fields used for serialization.
- Delete broad `outputs: Record<string, any>` defaults where an operation-specific output interface/result replaces them.
- Make `serialize()` return the operation’s declared typed descriptor.
- Preserve `apply`, `undo`, redo ID reuse, world mutation semantics, and process-tree updates.
- Do not broaden into unrelated domain private-cast cleanup unless the descriptor conversion of a touched operation cannot work without it and a reviewed delta approves the expansion.

### ProjectService

- `frontend/src/services/ProjectService.ts`
  - Keep strict current-schema version rejection.
  - Keep command-stream save/open/replay/restore orchestration.
  - May delegate operation descriptor assertion to the registry if this can be done before applying operations without broadening scope.
  - Must not introduce migrations, old-schema compatibility, domain snapshots, Drive/auth logic, or concrete-operation imports.

### Tests and architecture checks

Implementation may update/add focused tests only for this contract cleanup:

- `frontend/tests/unit/commands/operations/operationRegistry.spec.ts`
- `frontend/tests/unit/commands/command.spec.ts`
- `frontend/tests/unit/commands/commandStack.spec.ts`
- `frontend/tests/unit/services/ProjectService.roundTrip.spec.ts`
- `frontend/tests/integration/projectService.determinism.spec.ts`
- `frontend/tests/unit/services/ProjectService.subprocess.spec.ts`
- affected operation/factory tests
- an architecture/import-boundary test if needed to assert `ProjectService` does not import concrete operation modules and persistence does not inspect command/stack private fields

Do not broadly rewrite e2e suites. Do not silently normalize the pre-existing deleted e2e specs.

## Explicit DELETE list

The implementation must delete or replace these live persistence-contract smells where in scope:

- Operation `parameters: Record<string, any>` bags in converted persisted operation classes.
- Broad operation `outputs: Record<string, any>` defaults in converted operation classes where typed output interfaces/results are known.
- The process-tree action descriptor cast `obj(d, 'action') as unknown as Action`.
- Tests or fixtures that assert mutable `operation.parameters` or command/stack private internals as the persistence contract.
- Any obsolete serialization expectations that depend on broad `any` descriptor behavior.

The implementation must **not** chase phantom delete targets:

- ProjectService migration helpers are absent in current source.
- ProjectService monolithic concrete-operation reconstruction switch code is absent in current source.
- Do not reintroduce either surface in order to delete it later.

## Protected out-of-scope surfaces

The implementation must not broaden into:

- domain snapshot redesign or snapshot-vs-command-sourcing replacement
- ProjectService schema migration/backcompat or old-project compatibility
- monolithic reconstruction switch code
- rendering, CSS, canvas interaction, pointer behavior, or 3D overlay behavior
- Drive/auth internals, credential-backed flows, protected config, protected env files, or `.saivage` secret/config reads
- backend changes
- docs/specs rewrites unrelated to Cycle 031 implementation evidence
- package/tooling churn
- validation-platform work
- UI features or app-shell production composition redesign
- broad e2e rewrite or cleanup of unrelated deleted e2e specs
- stale audit-history mining or conclusions from discarded old cycles
- unrelated dirty-file normalization

## Behavioral preservation requirements

User-visible behavior should remain unchanged:

- construction tools and operations behave the same
- undo/redo behavior remains the same before and after load
- save/open/autosave payload remains the current command-stream project data shape, except malformed current-schema operation descriptors may be rejected earlier and with clearer errors
- deterministic replay and restored command history remain stable
- active-plane restoration fallback remains stable
- Cycle 030 app-shell DTO port boundary remains intact: app-shell persistence continues passing `ProjectData`; Drive create/update use typed session payload; Drive load remains `unknown` until validation
- live preview, canvas, and 3D overlay behavior remain preserved

## Stop conditions requiring a delta proposal/review

Implementation must stop and request a reviewed delta instead of broadening if any of these occur:

1. Direct typed descriptor cleanup requires replacing command-stream persistence with a domain snapshot.
2. Process-tree action serialization cannot be represented as a current-schema typed descriptor without a broader process-tree/action model redesign.
3. Initialization operation undo or redo ID reuse requires changing World private ownership APIs.
4. Sibling/intersection private world/domain casts must be fixed beyond descriptor serialization to make the wave pass.
5. Validation requires resolving the pre-existing deleted e2e specs or unrelated dirty diffs.
6. The implementation wants to introduce migrations, compatibility shims, dual descriptor formats, `@ts-ignore`, broad `any` relocation, or a new ProjectService concrete-operation switch.
7. The implementation needs rendering/CSS/canvas/3D, Drive/auth, backend, package/tooling, app-shell composition, validation-platform, or UI feature work.

If a stop condition is hit, do not continue by local judgment. Produce a mini delta proposal, run the bounded review path, and only then implement the approved delta.

## Required validation for implementation stage

Implementation must capture full stdout/stderr under:

`architecture-audit/cycle-031-command-undo-persistence-contract-cleanup/validation/`

Minimum required evidence:

1. Fresh pre-edit scoped `git status --short` and `git diff --stat` for Cycle 031 paths, explicitly attributing pre-existing command/operation diffs and deleted e2e specs.
2. Static scans proving forbidden persistence seams are absent or reduced as scoped:
   - no `(cmd as any).operations` persistence path
   - no `(commandStack as any).undoStack` persistence path
   - no `obj(d, 'action') as unknown as Action`
   - no `ProjectService` concrete-operation imports
   - no ProjectService migration/backcompat helpers or reconstruction switch
   - no mutable `parameters: Record<string, any>` in converted persisted operations
3. Focused Vitest for command, command stack, operation registry, ProjectService roundtrip, ProjectService determinism, ProjectService subprocess, and affected operation/factory tests.
4. Root and frontend lint where defined.
5. Root and frontend full Vitest suites where defined.
6. Root and frontend builds where defined.
7. Playwright/e2e coverage for credential-free project save/open or current project-flow behavior when applicable.
8. Live preview refresh bound to `0.0.0.0`, HTTP reachability probe, and a live smoke of create/save/open-equivalent/undo-redo where possible without protected credentials.
9. Final post-edit scoped `git status --short` and `git diff --stat`, with unrelated pre-existing changes still attributed rather than silently adopted.

The implementation log must record every command, log path, source files changed, tests/fixtures deleted, protected-surface checks, residual risks, and preview refresh/probe evidence.

## Residual risks accepted for implementation

- The process-tree `Action` persistence shape may not currently be a stable DTO. This is accepted only up to the point where an explicit descriptor can be introduced within the direct boundary; otherwise it is a stop condition.
- Converting all active persisted operations may be broad. The implementation should sequence by operation family and keep focused tests green, but must not leave parallel old/new descriptor paths.
- Global registry state may still create test-order coupling. Fix within the registry boundary if encountered; do not redesign app-shell composition or broader dependency injection without a reviewed delta.
- Pre-existing command/operation diffs and deleted e2e specs may complicate attribution and validation. Implementation must preserve source-control hygiene and not normalize them silently.

## Final instruction

Proceed with `proposal-direct.md` exactly within the scope above. Treat `proposal-restructure.md` as a fallback/stop path only. Do not implement, validate, preview-refresh, or touch protected/out-of-scope surfaces until the next implementation stage starts and captures its own fresh baseline.
