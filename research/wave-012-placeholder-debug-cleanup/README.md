# Wave 012 placeholder/debug cleanup research notes

Scout for `cycle-012-fresh-scout-proposals` / `t1-scout-wave-012-current-tree`.

Primary deliverable: `architecture-audit/cycle-012-placeholder-debug-cleanup/scope-check.md`.

Supporting scan logs:

- `source-scan.stdout` / `.stderr` — broad operation-directory and debug/TODO scan. The first `.stderr` was overwritten by the successful rerun; an earlier `/bin/sh` attempt failed on `set -o pipefail` and was immediately rerun under bash.
- `numbered-evidence.stdout` — numbered excerpts for placeholder READMEs, App.vue, ProjectService, GoogleDriveService, OperationRegistry, architecture gates, and package scripts.
- `compact-scan.stdout` — broad scan for active console/debug/TODO/spec references. It is intentionally noisy and should not be treated as a deletion list by itself.
- `focused-targets.stdout` — compact exact matches for Wave 012 target/hotspot files.

Key scout conclusions:

1. `frontend/src/commands/operations/paper/` and `frontend/src/commands/operations/toolbar/` are still README-only future-operation placeholders.
2. `frontend/src/commands/operations/debug/` is already gone after Wave 011; Wave 011 architecture gates prevent references to the deleted examples/debug setup surface.
3. `frontend/src/services/PaperService.ts` is absent; current rendering/geometry debug evidence is in utility/domain/rendering-adjacent files, especially `rectangleGrid.ts` and `projectionPlaneUtils.ts`.
4. Routine `console.log` remains in `GoogleDriveService.ts`, `rectangleGrid.ts`, `projectionPlaneUtils.ts`, `HingeLine.ts`, `Guide.ts`, and several command operation files.
5. Known validation debt from Wave 011 remains pre-existing: full Vitest failures, Node 24 / `vue-tsc` build failure, and corrupted broad e2e specs.
