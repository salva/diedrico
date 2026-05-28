# Proposal Direct — Close Cycle 023 as already satisfied, then proceed to Wave 024 scout

## Summary

Do not implement another Wave 023 source refactor. The current source already contains the central runtime-session consumer ports and command-history boundary that Wave 023 originally proposed: `ActivePlaneUseCases`, `SelectionUseCases`, and `KeyboardShortcutRouter` consume narrow ports; `RuntimeSession` creates those ports while privately owning `World`/`CommandStack`; and `AppShellRuntime` wires port objects rather than raw runtime objects for those app-shell consumers.

The direct path is therefore a **decision/closure reconciliation**, not code implementation. It should preserve current source, record the evidence, and advance to the next central wave.

## Target outcome

After this path:

- Cycle 023 artifacts accurately state that the Wave 023 implementation premise is stale against current source.
- No production source/test/package/backend/docs/spec files are changed by Cycle 023 fresh-scout/proposal work.
- The Manager has a precise next-stage recommendation: review/critic these artifacts, then write a Cycle 023 decision/closure note or plan-correction note rather than dispatching a coder for Wave 023 implementation.
- Wave 024 becomes the next central scout target because command-producer runtime seams remain active.

## Evidence basis

Key current-source evidence:

- `RuntimeSession` owns `World`/`CommandStack` privately (`frontend/src/application/appShell/RuntimeSession.ts:24-26`).
- `RuntimeSession` exposes behavior ports for canvas/read, active plane, selection, command history, and deletion (`RuntimeSession.ts:29-165`).
- `AppShellPorts.ts` defines `ActivePlanePort`, `SelectionReadPort`, and `CommandHistoryPort` (`frontend/src/application/appShell/AppShellPorts.ts:31-56`).
- `ActivePlaneUseCases` depends on `ActivePlanePort` (`frontend/src/application/appShell/ActivePlaneUseCases.ts:1-12`).
- `SelectionUseCases` depends on `SelectionReadPort` and `SelectionDeletionCommandPort` (`frontend/src/application/appShell/SelectionUseCases.ts:1-13`).
- `KeyboardShortcutRouter` depends on `CommandHistoryPort` and uses it for undo/redo (`frontend/src/application/appShell/KeyboardShortcutRouter.ts:5-17`, `:96-100`).
- `AppShellRuntime` wires `session.activePlanePort()`, `session.selectionReadPort()`, `session.selectionDeletionCommandPort()`, and `session.commandHistoryPort()` into consumers (`frontend/src/application/appShell/AppShellRuntime.ts:15-23`, `:44-47`, `:76-85`).
- Current grep evidence in `design-notes/consumer-seams.txt` found no old `worldForView`, `worldForUseCases`, `commandStackForShortcuts`, or `commandStackForCommandServices` accessors/call sites.

## Files to change

### Audit/stage artifacts only

- `architecture-audit/cycle-023-runtime-session-consumer-ports-command-history-boundary/scope-check.md` — keep the current-source correction.
- `architecture-audit/cycle-023-runtime-session-consumer-ports-command-history-boundary/proposals/proposal-direct.md` — this proposal.
- `architecture-audit/cycle-023-runtime-session-consumer-ports-command-history-boundary/proposals/proposal-restructure.md` — fallback plan-correction proposal.
- Optional: a future Manager-owned `decision.md` / closure artifact after Critic/reviewer approval.

### Production/test files

None in this path. A coder implementation stage for Wave 023 should not be scheduled from these artifacts.

## Files/tests/docs/fixtures to DELETE

None in this direct closure path. The no-backcompat principle still applies to future implementation waves, but deleting source in a stale Wave 023 cycle would be unreviewed churn.

## Expected behavior change

None. This path is artifact reconciliation only.

## Risks

- Treating this as a normal implementation wave would duplicate existing ports and risk degrading current architecture.
- Skipping artifact reconciliation could leave `architecture-audit/wave-plan.md` and Cycle 023 records implying work remains that source has already absorbed.
- Existing dirty context includes unrelated `frontend/src/commands/Command.ts` modifications and Cycle 022/023 audit noise; closure must not stage or normalize those paths.

## Protected surfaces

Do not touch production source, tests, package/tooling, backend, docs/spec source, Drive/auth, persistence schema/replay, command descriptors, rendering/Three/canvas/CSS, or protected config/env/provider files.

Preserve the current UI/e2e contracts, especially the 3D overlay pointer ownership behavior asserted in `frontend/tests/e2e/current-ui-contract.spec.ts:89-117`.

## Validation plan

For this direct closure path, broad runtime validation is not required because no source changes are proposed. The Manager/reviewer may request:

1. Static scans proving old Wave 023 raw accessors remain absent.
2. Static scans proving app-shell consumers use `ActivePlanePort`, `SelectionReadPort`, and `CommandHistoryPort`.
3. Path-scoped status/diff to verify only audit/stage artifacts changed.

Do not run full lint/test/build/e2e as part of this design-only proposal unless a later closure stage explicitly chooses to refresh validation evidence; no source implementation is authorized here.

## Next stage recommendation

After Critic/reviewer approval, write a Cycle 023 decision/closure artifact that selects this direct reconciliation path and recommends:

`cycle-024-fresh-scout-proposals-command-producer-runtime-ports-for-canvas-construction-and-process-history`

If the Planner/Manager requires a formal wave-plan edit before proceeding, schedule a reviewed plan-correction stage limited to marking Wave 023 complete/stale and confirming Wave 024 as the next central wave.
