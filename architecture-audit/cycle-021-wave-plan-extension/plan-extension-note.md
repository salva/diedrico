# Cycle 021 Wave-Plan Extension Note

## Purpose and outcome

This planning-only stage extends `architecture-audit/wave-plan.md` after Wave 020 because the existing plan ended while central clean-architecture work remains. The appended Wave 021 entry is **Selection/delete command-kernel boundary**. The recommended next stage is `cycle-021-fresh-scout-proposals` after this plan extension receives review/corrections as needed; no implementation should begin from this stage.

## Source-control hygiene

Pre-edit scoped status was captured in:

- `architecture-audit/cycle-021-wave-plan-extension/pre-edit-scoped-status.stdout`
- `architecture-audit/cycle-021-wave-plan-extension/pre-edit-scoped-status.stderr`

The scoped status showed pre-existing dirty production/component/command files outside this task's planning scope, including command files and component files. They were not reverted, formatted, incorporated, or used as implementation work. This task only writes planning artifacts: `architecture-audit/wave-plan.md`, this note, evidence logs under `architecture-audit/cycle-021-wave-plan-extension/`, the Saivage task report, and the commit containing those files.

## Evidence inspected

Planning and Wave 020 closure evidence:

- `architecture-audit/wave-plan.md` was read, including its Wave 020 entry and current tail.
- `architecture-audit/cycle-020-app-shell-project-session-browser-boundary/decision.md` was read. It explicitly retained `SelectionUseCases` direct construction of delete commands through `Command` / `DeletionSequenceFactory` as residual debt for a future reviewed wave.
- `architecture-audit/cycle-020-app-shell-project-session-browser-boundary/implementation-log.md` was read. It marks Wave 020 complete, confirms validation/preview closure, and repeats two central residuals: `SelectionUseCases` still directly constructs delete commands and `AppShellRuntime.ts` still owns in-memory `World`/`CommandStack` creation as a broader application-kernel candidate.
- Source scans are captured in `current-source-evidence.stdout` and `planning-evidence.stdout`.
- The current plan tail was captured in `wave-plan-tail-before.stdout`.

Current source evidence supporting Wave 021:

- `frontend/src/application/appShell/SelectionUseCases.ts` imports `Command`, `CommandStack`, `DeletionSequenceFactory`, and `World`; `deleteSelected()` creates a command, asks the deletion factory to fill it, commits it, pushes it to the stack, and clears selection.
- `SelectionUseCases` also reaches through `World.getDependencyService().getElementsInDeletionOrder(...)` for cascade preview, mixing selection state, dependency read behavior, command construction, and command execution in one use case.
- `frontend/src/application/appShell/AppShellRuntime.ts` creates `new World()` and `new CommandStack()` and wires both into `SelectionUseCases`, making the runtime the active composition point for this seam.
- `frontend/src/application/appShell/AppShellPorts.ts` still exposes persistence/session types in terms of concrete `CommandStack`, `World`, and `ProjectData`, which is related application-kernel/persistence residue but broader than the immediate delete-selection leak.
- `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts` still adapts to `ProjectService`, confirming persistence-contract residue remains but is not the most direct post-Wave-020 app-shell command leak.

## Centrality ranking rationale

Wave 021 is ranked next because it addresses the most explicit residual accepted by Wave 020: app-shell selection/delete still constructs concrete commands and pushes them to the command stack inside a use-case class. This sits directly on user-observable keyboard/delete behavior and on the application/use-case boundary that Wave 020 just clarified. Cleaning it next avoids allowing the freshly cleaned app-shell composition boundary to keep a central command-construction leak.

The selected wave is bounded: it targets `SelectionUseCases` and a narrow command-boundary/kernel for delete-selected behavior. It intentionally does not absorb canvas/tool construction, process-history panel/toolbar commands, persistence schema, command descriptor replay, rendering, backend, validation platform, docs/specs, or debug cleanup.

## Deferred candidates

- **Broader application kernel / runtime object ownership**: `AppShellRuntime.ts` still owns `World` and `CommandStack`. This remains important, but Wave 020 explicitly allowed it and the next smallest central leak is `SelectionUseCases` command construction. Wave 021 may propose a bounded higher-layer selection/delete command kernel if necessary, but not a whole-runtime rewrite.
- **Persistence contract residue**: `ProjectService` and app-shell persistence ports still use concrete command/domain/project-data shapes. This remains central, but Wave 020 intentionally avoided persistence internals; changing persistence before removing the active selection/delete command leak would broaden the next cycle unnecessarily.
- **Backend/frontend contract stance**: current active evidence continues to prioritize frontend app-shell/use-case boundaries. Backend stance should wait until the active frontend command/application boundary is cleaner.
- **Validation gate hardening**: validation is currently green after Wave 020. Additional gate hardening is valuable but should not come before a central application/use-case boundary violation on the delete path.
- **Placeholder/debug/noisy surfaces**: scans show remaining console/TODO/placeholder surfaces in canvas/toolbars/panels/factories, but those are cleanup/peripheral compared with the app-shell command-construction seam.
- **Docs/spec drift**: documentation should follow structural waves and should not freeze the current residual app-shell command leak.
- **Remaining rendering/domain-contract seams**: rendering/domain seams remain candidates, but Wave 020’s explicit residual points to application command ownership as the next ordered work.

## No implementation performed

No production source, tests, packages, backend, docs/specs, secret/config/env/provider files, or validation/tooling files were intentionally modified. This task did not run implementation validation because it is a planning-only wave-plan extension. The next stage should be proposal scouting/review for Wave 021, not implementation.
