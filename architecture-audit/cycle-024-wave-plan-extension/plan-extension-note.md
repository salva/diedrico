# Cycle 024 Plan Extension Note — Wave 024 command-producer runtime seam

## Planning-only scope

This stage extends `architecture-audit/wave-plan.md` after Wave 023. It does not implement Wave 024 and does not modify production source, tests, package/tooling, backend, docs/specs, debug surfaces, protected config, Drive/auth internals, rendering internals, persistence schema/replay, or command descriptor code.

Recommended next stage: `cycle-024-fresh-scout-proposals` for Wave 024, after review/correction of this plan extension if needed. The next stage should produce `scope-check.md`, `proposals/proposal-direct.md`, and `proposals/proposal-restructure.md`; it should not jump directly to implementation.

## Source-control hygiene

Pre-edit scoped status was captured in `pre-edit-scoped-status.stdout.log`. It showed pre-existing dirty production files in command-related paths plus unrelated `frontend/src/components/toolbars/MainToolbar.vue` and an untracked stage report directory:

- `frontend/src/commands/Command.ts`
- `frontend/src/commands/factories/DeletionSequenceFactory.ts`
- `frontend/src/commands/factories/PointSequenceFactory.ts`
- `frontend/src/commands/operations/IOperation.ts`
- several `frontend/src/commands/operations/world/*Intersection*` / `AddFreePointOp.ts` files
- `frontend/src/components/toolbars/MainToolbar.vue`
- `.saivage/stages/cycle-024-wave-plan-extension/`

Those adjacent dirty files were not reverted, incorporated, or modified by this planning task. Source reads were limited to bounded evidence excerpts and static scans. The only intended tracked changes from this task are `architecture-audit/wave-plan.md`, this note, scan/log artifacts under `architecture-audit/cycle-024-wave-plan-extension/`, and the task report.

## Evidence inspected

- Current wave plan: `architecture-audit/wave-plan.md`, including Wave 023 and the absence of a post-Wave-023 Wave 024 entry before this task.
- Wave 023 implementation/closure log: `architecture-audit/cycle-023-runtime-session-consumer-ports-command-history-boundary/implementation-log.md`.
- Wave 022 implementation/closure log: `architecture-audit/cycle-022-runtime-session-kernel-persistence-port-boundary/implementation-log.md`.
- Current source excerpts and static scans captured under this directory:
  - `pre-edit-scoped-status.stdout.log`
  - `seam-scan-commandstack.stdout.log`
  - `source-excerpts-command-producers.stdout.log`
  - `deferred-candidates-scan.stdout.log`
  - `wave-plan-tail-index.stdout.log`

Key post-Wave-023 facts:

1. Wave 023 is complete and deliberately leaves only two major runtime raw seams: `worldForView()` as rendering/view handoff and `commandStackForDeferredCommandProducers()` as deferred command-producer handoff. The implementation log names future command-producer ports as a next-wave candidate.
2. `RuntimeSession` still owns concrete `World`/`CommandStack` and exposes `commandStackForDeferredCommandProducers()` (`RuntimeSession.ts:19`, `:25-26`). `AppShellRuntime` unwraps it and returns `commandStack` (`AppShellRuntime.ts:16-17`, `:101`).
3. `SvgCanvas.vue` still injects raw `commandStack` for downstream command execution (`seam-scan-commandstack.stdout.log`, `frontend/src/components/workspace/SvgCanvas.vue:419`).
4. `CanvasPointMovementUseCase` owns preview/commit/cancel command lifecycle and pushes raw commands (`CanvasPointMovementUseCase.ts:2-5`, `:9`, `:12`, `:18-19`, `:32-33`).
5. `CanvasStyleUseCase` owns style command construction, includes an `as any` operation cast, commits, and pushes (`CanvasStyleUseCase.ts:1-4`, `:8`, `:11`, `:13-15`).
6. `ConstructionUseCases` accepts raw `World`/`CommandStack`, imports many factories/operations, builds/commits/pushes commands, coordinates process action groups, feasibility checks, intersections, and dynamic projection-plane setup (`ConstructionUseCases.ts:1-21`, `:29-44`, `:56-188`).
7. `ProcessHistoryUseCases` and `ProcessHistoryController` still receive raw `World`/`CommandStack`, cast unknown to `CommandStack`, create concrete process-tree commands, commit, and push (`ProcessHistoryUseCases.ts:1-9`, `:20-24`, `:72-78`; `ProcessHistoryController.ts:1-2`, `:15-35`, `:41-42`).
8. Tool context already has `commandSink`/typed construction intents, but broad `World` reads remain for interaction/hit-test and collection context. That supports a bounded command-producer wave rather than a broad tool/rendering read-port rewrite (`ITool.ts:19-29`; `ArgumentCollectorTool.ts:91-104`, `:130-143`, `:162-216`).

## Centrality ranking and rationale

Wave 024 should target command-producer runtime ports for canvas, construction, and process history because this is the next active application-kernel seam after Wave 023. It directly controls command creation, rollback/commit, stack push, feasibility checks, process action grouping, and undo/redo semantics across user-facing construction flows. Leaving it raw would force future rendering, persistence, and UI-shell work to preserve raw `CommandStack` injection or work around it.

This seam is more central than the remaining candidates because it sits between user intents and the command/undo kernel. It is also narrow enough for one reviewed wave: remove `commandStackForDeferredCommandProducers()`, replace raw stack injection with behavior-sized command-production ports/services, and validate canvas movement/style/construction/process-history behavior.

## Deferred candidates

- **Raw `worldForView()` / rendering read seam:** still real and important, but rendering/view selectors should consume a stable command-production boundary and should not be mixed with command lifecycle migration.
- **`ProjectSessionPersistenceAdapter` DTO/cast residue and `ProjectService` internals:** still real, but Wave 023 intentionally bounded schema/replay out of scope. Persistence contract work should be a later dedicated wave if current evidence supports it.
- **Backend/frontend contract stance:** important but less central than active frontend command-production ownership and dependent on persistence decisions.
- **Validation gate hardening:** mandatory when planned, but current post-Wave-023 validation is green and command-production cleanup should precede freezing additional boundaries.
- **Placeholder/debug cleanup and docs/spec drift:** lower architectural centrality and should remain behind runtime, command, persistence, and rendering boundaries.
- **Remaining rendering/domain-contract seams:** important but should follow command-producer cleanup so canvas/rendering no longer carries raw command-stack injection.

## No-backcompat / deletion stance

The Wave 024 plan entry treats raw `commandStackForDeferredCommandProducers()` and raw command-stack injection as internal architecture debt, not compatibility surfaces. It requires deleting the accessor and dual raw/port paths once reviewed ports/services exist, rather than wrapping or preserving the old stack handoff. Any retained `World` access must be classified as interaction/read/rendering access and deferred explicitly, not hidden as command-production compatibility.

## No implementation performed

No production source/test/backend/package/docs/spec/debug files were edited in this task. No build/test/e2e validation was run because this was a planning-only extension; implementation-wave validation requirements are specified in the appended Wave 024 entry.
