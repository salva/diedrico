# Proposal Restructure — Test whether Wave 022 should be elevated to a runtime/session or persistence-contract rewrite

## Recommendation

Do **not** choose a broad restructure implementation now. Current source has a real Wave 022 seam, but the seam is narrower than a full persistence or command-kernel redesign. The correct restructure response is to reject silent broadening and proceed with the direct kernel/adapter-boundary cleanup unless implementation evidence proves one of the stop conditions below.

This proposal exists to test whether the right fix is conceptually higher than the current wave assumed. The answer from current evidence is: **not yet**. A higher-level rewrite would overreach into command descriptors, replay semantics, Drive/backend stance, or leaf command producers before the runtime/session contract is named.

## Higher-level options considered

### Option A — Full persistence contract rewrite around domain snapshots

Replace command-stream persistence with an explicit domain snapshot or session snapshot contract owned by runtime/session.

**Rejected for Wave 022.** `ProjectService` currently has a coherent current-schema command-stream contract: `serializeCommands(commandStack, nextElementId, projectName)`, `deserializeCommands(projectData, world, commandStack)`, and validation over committed command snapshots (`frontend/src/services/ProjectService.ts:24-80`). Replacing this would reopen schema, replay, operation descriptors, and undo/redo semantics. The corrected Wave 022 entry explicitly forbids schema/replay redesign unless a reviewed plan edit broadens scope.

### Option B — General command-kernel facade for all app command producers

Introduce a broad command executor/session facade consumed by initialization, selection-delete, canvas movement/style, construction, process-history, toolbar, and tools.

**Rejected for Wave 022.** Static search confirms many direct command producers remain, but they are separate leaf/use-case seams. Pulling them into Wave 022 would violate the scope guard and risk a god-kernel. The runtime/session persistence boundary should be cleaned first so later command-producer waves can consume a clearer session owner.

### Option C — RuntimeSession split into multiple services before boundary cleanup

Decompose `RuntimeSession` into separate read-port factory, command-port factory, persistence service, initialization service, and view-session modules in one wave.

**Rejected for Wave 022 as too broad.** `RuntimeSession` is large, but current Wave 022 has one actionable central seam: project-session/persistence handle ownership. Splitting all view/command/read ports would touch rendering, tools, process history, and UI composition. Those are protected/out of scope.

### Option D — Minimal direct kernel/adapter cleanup

Name the project-session kernel, move adapter-facing persistence target types out of `RuntimeSession.ts`, delete the adapter-to-runtime import and use-case concrete runtime dependency, and preserve all behavior.

**Preferred.** This advances the target outcome without crossing into schema/replay, Drive/auth, rendering, or leaf command producers.

## When a plan edit/split is required before implementation

Stop the Wave 022 implementation and schedule a reviewed plan-edit stage if fresh implementation evidence proves any of these:

1. `ProjectSessionPersistenceAdapter` cannot stop importing `RuntimeSession` without changing `ProjectService` schema/replay/descriptor behavior.
2. The correct target is no longer command-stream persistence but a domain snapshot/session snapshot, requiring schema and ProjectService redesign.
3. Project-session kernel extraction forces migration of canvas/tool/construction/process-history command producers in the same wave.
4. Initialization command semantics must change to make the kernel contract coherent.
5. Validation requires broad e2e/spec/package/tooling repair unrelated to the Wave 022 boundary.
6. The current source changes again such that `ProjectSessionUseCases`, `AutoSaveUseCases`, and `ProjectSessionPersistenceAdapter` already satisfy the direct success criteria before implementation begins.

If any condition holds, do not broaden source changes. Edit `architecture-audit/wave-plan.md` through the required bounded review process and either split Wave 022 or re-rank to the next central wave.

## Restructure target if a future plan edit is needed

If a later reviewed plan edit chooses a higher-level rewrite, the likely target should be a multi-wave sequence, not one large implementation:

1. **Runtime/session contract wave** — direct proposal scope: name kernel and adapter-facing persistence targets.
2. **Persistence contract wave** — choose command-stream registry hardening vs domain/session snapshot, delete obsolete schema/replay paths.
3. **Command producer consolidation wave(s)** — migrate canvas/style/construction/process-history producers to consume the stable session/command boundary.
4. **RuntimeSession decomposition wave** — split read-port factories from command/persistence/session lifecycle once the consumers are stable.

This ordering preserves architectural centrality and avoids a god facade.

## Files to change if restructure were selected after plan edit

Only after reviewed plan edit, potential files would include:

- `frontend/src/services/ProjectService.ts`
- `frontend/src/commands/operations/OperationRegistry.ts`
- `frontend/src/commands/Command.ts`
- `frontend/src/commands/CommandStack.ts`
- broader app command producers under `frontend/src/application/canvas/`, `frontend/src/application/construction/`, `frontend/src/application/processHistory/`, and tools/controllers
- persistence/e2e tests and service round-trip tests

These files are **not authorized** by the current Wave 022 direct implementation except for read-only evidence or narrow tests.

## Files/tests/docs/fixtures to DELETE if restructure were later selected

Only under a reviewed future plan edit:

- old command-stream schema/replay paths if replaced by domain/session snapshots;
- operation descriptor registry paths if replaced by a different persistence contract;
- duplicated command execution facades if a single command kernel is introduced;
- stale tests encoding the replaced persistence contract.

Do not delete any of these in the current Wave 022 implementation.

## Expected behavior change

For the current Wave 022: none; choose direct proposal.

For a future higher-level rewrite: behavior should still be user-visible equivalent for startup/open/save/autosave/undo/redo, but persistence artifact shape and replay internals could change. That requires its own proposal/review/validation cycle and must not be smuggled into this wave.

## Risks of choosing restructure now

- Turns a bounded boundary cleanup into a broad persistence/command redesign.
- Reopens command descriptor and operation registry correctness after those have already been central waves.
- Risks breaking startup/open/save/autosave/undo/redo while changing too many ownership axes at once.
- Risks reintroducing a broad runtime god object or compatibility layers to support old and new flows.
- Distracts from protected Wave 020 browser composition and corrected Wave 021 selection-delete boundaries.

## Validation if restructure were later approved

A future restructure would require, at minimum:

- all direct Wave 022 validation;
- full ProjectService serialization/round-trip/self-containment coverage;
- command descriptor/operation registry focused tests;
- undo/redo after load tests;
- persistence e2e/open/save flows;
- explicit schema/current-format tests;
- live preview smoke for startup/open/save/delete/undo and 3D overlay protection.

Because that validation matrix is much broader than the current seam, it is evidence that restructure is not the right current implementation choice.

## Current-stage conclusion

Proceed to review with both proposals, but select `proposal-direct.md` unless the critic/reviewer identifies a concrete blocker. No corrective plan-edit stage is needed from current evidence; a plan edit is required only if implementation discovers the stop conditions above.
