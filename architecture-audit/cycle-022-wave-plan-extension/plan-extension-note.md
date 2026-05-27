# Cycle 022 wave-plan extension note

## Purpose and constraints

This stage extends `architecture-audit/wave-plan.md` after Wave 021 because the current plan ended at the selection/delete command-kernel boundary while central clean-architecture work remains. This is a planning-only change: no production source, tests, packages, backend, docs/specs, config, or secrets were modified.

## Evidence inspected

- Scoped source-control evidence: `architecture-audit/cycle-022-wave-plan-extension/pre-scoped-status.stdout` shows `wave-plan.md` was initially clean and the Cycle 022 planning directory was new/untracked before this task wrote planning artifacts.
- Current plan index: `architecture-audit/cycle-022-wave-plan-extension/wave-plan-index.stdout` showed Wave 021 as the last defined wave before this extension.
- Wave 021 completion: `architecture-audit/cycle-021-selection-delete-command-kernel-boundary/implementation-log.md` marks Wave 021 complete, records the extracted `SelectionDeletionCommandService`, and lists residual risks around other command producers and broader runtime/kernel ownership.
- Wave 021 decision: `architecture-audit/cycle-021-selection-delete-command-kernel-boundary/decision.md` bounded implementation to the direct selection/delete path and explicitly protected persistence, runtime ownership, canvas/tool, process-history, toolbar, backend, docs/specs, and package/tooling surfaces.
- Wave 020 completion: `architecture-audit/cycle-020-app-shell-project-session-browser-boundary/implementation-log.md` confirms app-shell browser/default construction was extracted, but `AppShellRuntime` intentionally retained `World`/`CommandStack` ownership.
- Current source scans: `command-producer-scan.stdout`, `runtime-persistence-scan.stdout`, and `source-evidence-lines.stdout` capture the post-Wave-021 command producers, app-shell runtime object creation, and project-session persistence contract evidence.

## Centrality ranking after Wave 021

The next most central architectural risk is the runtime session / persistence port boundary, not another leaf command producer. Wave 021 removed direct delete command construction from `SelectionUseCases`, but current source still has the app shell creating and sharing concrete runtime-kernel objects:

- `createAppShellRuntime` imports and instantiates `World` and `CommandStack` (`frontend/src/application/appShell/AppShellRuntime.ts:2`, `:3`, `:17`, `:18`).
- The same runtime wires `SelectionDeletionCommandService(world, commandStack)` (`frontend/src/application/appShell/AppShellRuntime.ts:40`), which is acceptable after Wave 021 but exposes that runtime session ownership is still implicit.
- `AppShellPorts` defines persistence in terms of concrete `CommandStack`, `World`, and `ProjectData` (`frontend/src/application/appShell/AppShellPorts.ts:2`, `:3`, `:5`, `:26`, `:28`).
- `ProjectSessionPersistenceAdapter` bridges those raw objects directly into static `ProjectService` calls (`frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts:7`, `:8`, `:15`, `:16`).
- `ProjectService` remains command-stream persistence orchestration over `CommandStack` and `World` (`frontend/src/services/ProjectService.ts:2`, `:5`, `:6`, `:27`, `:45`).
- `initializeWorld` still creates, commits, and pushes a command for default world setup (`frontend/src/application/world/initializeWorld.ts:19`, `:22`, `:33`, `:34`), making initialization part of the same unnamed runtime/session contract.

This seam is central because startup, new/open project, save/autosave, initialization, command history, and the selection-delete service all depend on the same concrete runtime state. Later leaf waves should consume a named runtime/session contract rather than continue adding ports around raw `World`/`CommandStack` pairs.

## Deferred candidates and rationale

- Other direct command producers remain real: point movement, style updates, construction, and process-history use cases still create/commit/push commands (`source-evidence-lines.stdout`). They are deferred because they are leaf application command seams and should be refactored after the runtime/session boundary they depend on is explicit.
- Persistence schema or command descriptor redesign remains deferred. Wave 022 is deliberately bounded to app-shell/session port ownership; `ProjectService`, `OperationRegistry`, schema constants, and command replay internals are adapter targets only unless a reviewed plan edit broadens scope.
- Canvas/rendering `World` injection and version polling remain deferred. Rendering and presentation read-port cleanup should follow a stable runtime session/read model rather than lead it.
- Backend/frontend contract stance, validation gate hardening, placeholder/debug cleanup, docs/spec drift, and noisy logging are lower-priority than the active frontend runtime/session seam and remain explicitly deferred.

## Files changed

- `architecture-audit/wave-plan.md` — appended reviewed-ready Wave 022 with scope, guard, evidence, target outcome, delete list, success criteria, dependencies, validation requirements, risks, and no-backcompat rationale.
- `architecture-audit/cycle-022-wave-plan-extension/plan-extension-note.md` — this supporting evidence and ranking note.
- `architecture-audit/cycle-022-wave-plan-extension/*.stdout|*.stderr` — scoped planning evidence generated by this task.
- `.saivage/stages/cycle-022-wave-plan-extension/reports/t1-extend-wave-plan-022.json` — task report.

## Source-control hygiene

This task used path-scoped status/scans because global `git_status` overflowed due to existing workspace dirt. Adjacent dirty work was not reverted, incorporated, reformatted, or inspected beyond the bounded current-source samples cited above. No secret/config/env/provider files were read.

## Recommended next stage

The next stage should be review of this plan extension (`t2-review-stage`) and, if accepted or corrected, the canonical fresh scout/proposals stage for Wave 022: `cycle-022-fresh-scout-proposals`. Implementation must not begin until review convergence and a Wave 022 decision are recorded.
