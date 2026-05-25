# Wave 004 Command/Undo/Persistence Scout Summary

This research task produced the authoritative Wave 004 scout/proposal artifacts under:

- `architecture-audit/cycle-004-command-undo-persistence-contract/scope-check.md`
- `architecture-audit/cycle-004-command-undo-persistence-contract/proposals/proposal-direct.md`
- `architecture-audit/cycle-004-command-undo-persistence-contract/proposals/proposal-restructure.md`

## Key findings

- Wave 004 can proceed without a wave-plan edit. Waves 001–003 cleaned the domain/application boundary, projection-plane modules, and duplicate store geometry path; the command/persistence contract remains the next central dependency.
- Current persistence is command-sourced but leaks through private casts:
  - `(cmd as any).operations`
  - `(world as any).nextId`
  - `(op as any).parameters`
  - `(commandStack as any).undoStack.push(...)`
- `ProjectService` still imports many concrete operations and owns a monolithic reconstruction switch with migration/backcompat/corrupted-operation fallbacks.
- The main operation contract uses `Record<string, any>` / `[key: string]: any` at the boundary.
- Direct proposal recommends typed operation descriptors/registry plus explicit `Command`, `CommandStack`, and `World` restore/inspection APIs.
- Restructure proposal evaluates a domain snapshot project-file contract, but recommends against selecting it unless reviewers intentionally accept redefining historic undo-after-load semantics.

## Evidence logs

Scout command outputs were captured under:

- `architecture-audit/cycle-004-command-undo-persistence-contract/tmp-scout-rg.stdout.log`
- `architecture-audit/cycle-004-command-undo-persistence-contract/tmp-line-evidence.stdout.log`
- `architecture-audit/cycle-004-command-undo-persistence-contract/tmp-operation-evidence.stdout.log`
- `architecture-audit/cycle-004-command-undo-persistence-contract/tmp-callsite-rg.stdout.log`
- `architecture-audit/cycle-004-command-undo-persistence-contract/tmp-final-evidence.stdout.log`

These are temporary scout evidence logs, not implementation validation logs.
