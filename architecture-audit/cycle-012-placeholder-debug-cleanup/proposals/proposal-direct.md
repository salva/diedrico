# Wave 012 Proposal Direct — Delete placeholders and routine debug noise

**Cycle:** `cycle-012-placeholder-debug-cleanup`  
**Proposal type:** direct implementation of Wave 012  
**Source basis:** `architecture-audit/cycle-012-placeholder-debug-cleanup/scope-check.md`  
**Source-code changes proposed:** yes, in the later implementation stage only. This proposal stage changes audit artifacts only.

## Summary

Implement Wave 012 as a focused deletion cleanup. Remove the two README-only operation-family directories, delete routine console/debug logging from active Drive, geometry/rendering-adjacent, domain-realization, and command-operation paths, and prune only directly adjacent stale comments/TODOs that preserve obsolete placeholder/debug mental models. Do not introduce a logging abstraction and do not broaden the work into Wave 013 docs/spec reconciliation.

This is intentionally a source-tree hygiene wave: it makes the active architecture easier to read by deleting vacant extension points and normal-flow debug output rather than preserving them behind shims or configuration flags.

## Current evidence

### README-bearing operation families

- `frontend/src/commands/operations/paper/README.md` is a README-only placeholder for future `InvalidateCacheOp`, `SetVisibilityOp`, and `UpdateHighlightOp` operations (`frontend/src/commands/operations/paper/README.md:1-10`). Delete it.
- `frontend/src/commands/operations/toolbar/README.md` is a README-only placeholder for future `SetActiveToolOp`, `SetToolFeedbackOp`, and `SetToolOptionsOp` operations (`frontend/src/commands/operations/toolbar/README.md:1-10`). Delete it.
- `frontend/src/commands/operations/processTree/README.md` is README-bearing but not placeholder-only: active implementation and descriptor files sit beside it, and the README describes current process-tree operations (`frontend/src/commands/operations/processTree/README.md:1-12`). Preserve it.
- `frontend/src/commands/operations/world/README.md` is README-bearing but not placeholder-only: active implementation and descriptor files sit beside it, and the README describes current geometric-domain operations (`frontend/src/commands/operations/world/README.md:1-12`). Preserve it.
- `frontend/src/commands/operations/viewState/README.md` is README-bearing and not README-only because `ViewStateOperations.ts` and `index.ts` are present; however, `OperationRegistry.ts` registers only world and process-tree descriptors (`frontend/src/commands/operations/OperationRegistry.ts:54-63`, `frontend/src/commands/operations/OperationRegistry.ts:78-79`). Preserve it in Wave 012 and leave any view-state operation contract/registration cleanup to a reviewed later wave or delta.
- `frontend/src/commands/operations/debug/` is already gone after Wave 011, and `frontend/tests/unit/architecture/importBoundaries.spec.ts:61-67` prevents active references to the removed example/debug setup names.

### Routine logging to delete

- Drive/auth/project flows log initialization metadata, restore/sign-in success, update metadata, default-name generation, and rename success in normal operation (`frontend/src/services/GoogleDriveService.ts:82-86`, `:108`, `:131-133`, `:204`, `:475-483`, `:527`, `:556-592`, `:631`).
- Rectangle grid generation/clipping contains a module-level debug flag and many normal-flow logs (`frontend/src/utils/rectangleGrid.ts:94`, `:113-119`, `:142-186`, `:211-223`, `:269`, `:306-307`).
- Projection-plane utility computation logs matrix diagnostics and expected normals (`frontend/src/utils/projectionPlaneUtils.ts:282-284`, `:293`, `:300-302`, `:341-351`).
- Domain realization logs half-hinge and sibling-guide internals (`frontend/src/domain/world/HingeLine.ts:111`, `:120`, `:131`, `:140`; `frontend/src/domain/world/Guide.ts:276`, `:282`, `:335`).
- Command operations log apply/redo/style/removal internals (`frontend/src/commands/operations/world/UpdateElementStyleOp.ts:97`, `:137`; `frontend/src/commands/operations/world/RemoveElementOps.ts:440`; `frontend/src/commands/operations/processTree/ToggleOutputOp.ts:20`, `:35`; `frontend/src/commands/operations/processTree/ToggleEncapsulationOp.ts:20`, `:35`).

### Non-target evidence

- `frontend/src/App.vue` has no current console-debug logging; its placeholder highlight handlers (`frontend/src/App.vue:160-165`) require component-contract decisions and are not a safe incidental deletion target for this direct cleanup.
- `frontend/src/services/ProjectService.ts` has no current routine debug logging and should not be changed for this wave.
- `frontend/src/services/PaperService.ts` no longer exists; current rendering-adjacent cleanup evidence is in `frontend/src/utils/rectangleGrid.ts`, `frontend/src/utils/projectionPlaneUtils.ts`, and related rendering/presentation modules.
- Broad old `Phase N` / `@see specs/001-dihedral-learning-mvp/...` comments are Wave 013 scope unless directly adjacent to code deleted by this wave.

## Files to change

### Delete placeholder operation directories

- Delete `frontend/src/commands/operations/paper/README.md` and the now-empty `frontend/src/commands/operations/paper/` directory.
- Delete `frontend/src/commands/operations/toolbar/README.md` and the now-empty `frontend/src/commands/operations/toolbar/` directory.

### Remove routine logs/debug-only branches

- `frontend/src/services/GoogleDriveService.ts`
  - Delete normal-flow `console.log` calls identified above.
  - Retain `console.error`/`console.warn` in genuine error/catch paths unless implementation finds a line is routine debug noise rather than user/actionable error reporting.
  - Prune directly adjacent stale task/spec breadcrumbs only where the edited block is already being touched and the comment preserves obsolete operation/debug context.
- `frontend/src/utils/rectangleGrid.ts`
  - Delete `clipDebugDone` and all debug-only branches/logs.
  - Preserve clipping/grid-generation behavior exactly; only remove side-effect logging.
- `frontend/src/utils/projectionPlaneUtils.ts`
  - Delete projection-matrix and expected-normal debug logs.
  - Preserve numeric calculations and return shapes exactly.
- `frontend/src/domain/world/HingeLine.ts`
  - Delete half-hinge sibling lookup `console.log` statements.
- `frontend/src/domain/world/Guide.ts`
  - Delete sibling-guide/broken-half-hinge debug `console.log` statements.
- `frontend/src/commands/operations/world/UpdateElementStyleOp.ts`
  - Delete apply/restore style debug logs.
- `frontend/src/commands/operations/world/RemoveElementOps.ts`
  - Delete sibling-guide removal debug log.
- `frontend/src/commands/operations/processTree/ToggleOutputOp.ts`
  - Delete apply/redo node-ID debug logs.
- `frontend/src/commands/operations/processTree/ToggleEncapsulationOp.ts`
  - Delete apply/redo subprocess-ID debug logs.

### Focused static gate update

Extend the Wave 011 architecture/static gate in `frontend/tests/unit/architecture/importBoundaries.spec.ts` or a new focused architecture spec only within the following bounded scope:

- Active `frontend/src/**` and `frontend/tests/**` references must not contain deleted/placeholder-only surfaces `operations/paper`, `operations/toolbar`, `operations/debug`, `ExamplesMenu`, `AddExampleSetupOp`, `projection-plane-setup`, or `basic-3d-point-setup`, except in architecture gate assertion text itself.
- Directory-presence/absence checks for operation-family READMEs are enforced by validation shell commands, not by an implicit broad source scanner: `paper/` and `toolbar/` must be absent, while `processTree/README.md`, `world/README.md`, and `viewState/README.md` must remain.
- Console/source-hygiene enforcement is restricted to the Wave 012 evidenced touched source files listed below, and the implementation must delete all `console.log`, `console.debug`, and `console.info` in those files rather than introduce an allowlist:
  - `frontend/src/services/GoogleDriveService.ts`
  - `frontend/src/utils/rectangleGrid.ts`
  - `frontend/src/utils/projectionPlaneUtils.ts`
  - `frontend/src/domain/world/HingeLine.ts`
  - `frontend/src/domain/world/Guide.ts`
  - `frontend/src/commands/operations/world/UpdateElementStyleOp.ts`
  - `frontend/src/commands/operations/world/RemoveElementOps.ts`
  - `frontend/src/commands/operations/processTree/ToggleOutputOp.ts`
  - `frontend/src/commands/operations/processTree/ToggleEncapsulationOp.ts`

Do not add a full-`frontend/src/**` console policy in Wave 012. If implementation discovers routine `console.log`/`debug`/`info` outside the files above, record it as future cleanup or stop for a reviewed delta; do not expand this wave into broad repository cleanup or an allowlist framework.

## Files/tests/docs/fixtures to DELETE

- `frontend/src/commands/operations/paper/README.md`
- `frontend/src/commands/operations/paper/`
- `frontend/src/commands/operations/toolbar/README.md`
- `frontend/src/commands/operations/toolbar/`
- Any tests/fixtures discovered during implementation that reference only those README-only placeholder operation families. Delete rather than update if they assert aspirational placeholder docs instead of runtime behavior.
- Any stale operation/debug comments directly adjacent to removed logging/placeholder code. Do not delete broad docs/spec files in Wave 012.

## Explicit non-goals

- Do not modify `architecture-audit/wave-plan.md`; the scope check says Wave 012 can proceed without a plan edit.
- Do not reintroduce or migrate the already-deleted `operations/debug/` examples surface.
- Do not solve Wave 013 broad docs/spec reconciliation, including all historical `specs/001-dihedral-learning-mvp` references.
- Do not repair Node 24 / `vue-tsc`, unrelated full Vitest failures, or corrupted broad e2e specs in this wave.
- Do not refactor App shell highlight-handler contracts, ProjectService persistence shape, or rendering selector architecture unless a directly touched debug line proves impossible to remove without such a change; if that happens, stop and run a delta proposal/review.

## Expected behavior change

- User-visible application behavior should not change.
- Normal browser/dev console output should be quieter during Drive operations, grid/projection calculations, domain realization, style updates, element removal, and process-tree toggles.
- Placeholder operation-family documentation disappears from active source so future readers do not infer unimplemented paper/toolbar command families exist.
- Error/warning reporting for genuine failures remains available where currently implemented with `console.error`/`console.warn`.

## Validation plan

All logs must be captured under `architecture-audit/cycle-012-placeholder-debug-cleanup/validation/` during the implementation/validation stages.

### Focused static/deletion checks

- Verify README-only placeholders are deleted:
  - `test ! -d frontend/src/commands/operations/paper`
  - `test ! -d frontend/src/commands/operations/toolbar`
- Verify README-bearing active/non-placeholder operation families were not deleted by an over-broad cleanup:
  - `test -f frontend/src/commands/operations/processTree/README.md`
  - `test -f frontend/src/commands/operations/world/README.md`
  - `test -f frontend/src/commands/operations/viewState/README.md`
- Search active source/tests for forbidden deleted surfaces, excluding `architecture-audit/` prose:
  - `operations/paper`
  - `operations/toolbar`
  - `operations/debug`
  - `ExamplesMenu`
  - `AddExampleSetupOp`
  - `projection-plane-setup`
  - `basic-3d-point-setup`
- Search only the Wave 012 evidenced touched files enumerated in the focused static gate section for remaining `console.log`, `console.debug`, and `console.info`; the scan must be empty for those files. Do not require broad docs/spec cleanup or unrelated `frontend/src/**` rewrites.

### Architecture/static gates

- `npm run lint` from the repo root.
- `npm run lint --workspace=frontend` from the repo root.
- `npm run test:architecture` from the repo root.
- `npm run test:architecture --workspace=frontend` from the repo root.

These currently execute Wave 011 architecture/static gates and are expected to pass. Any Wave 012 console/source-hygiene gate must prove its scope is limited to the enumerated touched files above and must not fail because of unrelated docs/spec prose or unrelated source files.

### Focused Vitest

Run focused tests for touched behavior where present:

- operation registry/serialization tests covering `frontend/src/commands/operations/OperationRegistry.ts` and command deserialization, to prove deleting placeholder directories did not affect registered operations;
- process-tree toggle operation tests if present, because `ToggleOutputOp.ts` and `ToggleEncapsulationOp.ts` are touched;
- style/update/remove operation tests if present, because `UpdateElementStyleOp.ts` and `RemoveElementOps.ts` are touched;
- geometry/rendering utility tests covering `rectangleGrid.ts` and `projectionPlaneUtils.ts` if present.

If an exact focused test file does not exist for one touched module, record the search and select the nearest behavior-level Vitest suite rather than creating broad new coverage unless static gates require it.

### Mandatory cadence

- Root full Vitest: `npm run test`.
- Frontend full Vitest: `npm run test --workspace=frontend`.
- Root build: `npm run build`.
- Frontend build: `npm run build --workspace=frontend`.
- Root e2e: `npm run test:e2e`.
- Frontend e2e: `npm run test:e2e --workspace=frontend`.

Known pre-existing debt from Wave 011 must be classified in the implementation log if still present:

- full Vitest failures in guide-creation, intersection calculations, and PropertiesDialog tests;
- Node 24 / `vue-tsc` build crash: `Search string not found: "/supportedTSExtensions = .*(?=;)/"`;
- corrupted broad e2e spec syntax in `keyboard-shortcuts.spec.ts` and `selection-mask.spec.ts`.

### Focused Playwright/live smoke

Because this wave touches frontend runtime source but should not change user behavior:

- Run the existing focused Playwright app-shell/project-flow guard used in Wave 011 if still available, e.g. `npx playwright test tests/e2e/wave010-app-shell-project-flow.spec.ts` from `frontend/`.
- Refresh the live preview server from `frontend/` with `npm run dev -- --host 0.0.0.0` and record logs/PID/binding evidence.
- Probe `curl -I http://127.0.0.1:5173/` and record the HTTP 200 reachability result.

## Risks and mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| A test or user flow implicitly depends on console output. | Low; console output should not be a runtime contract. | Run focused behavior tests and Playwright smoke; do not delete error/warn paths used for real failures. |
| Broad console scan finds unrelated logging outside the scope evidence. | Medium; over-broad cleanup could become unreviewed scope creep. | Do not run or encode a broad console gate; scan only the enumerated Wave 012 touched files and defer unrelated lines to a future reviewed wave/delta. |
| Removing placeholder directories breaks import/glob assumptions. | Low; registry imports only world/process-tree descriptors. | Run static scans plus operation registry/serialization focused tests. |
| Drive logs include partially redacted config metadata. | Medium privacy/noise concern if retained. | Delete routine success/metadata logs while preserving catch-path errors/warnings. |
| Known validation debt obscures Wave 012 regressions. | Medium. | Capture focused passing checks, compare mandatory failures to Wave 011 classifications, and label only unchanged debt as pre-existing. |

## Acceptance fit

This proposal follows the no-backcompat priority: placeholder operation families and debug logs are deleted, not wrapped. It consumes Wave 011 architecture/static gates, respects the current remaining-wave order, excludes broad Wave 013 docs/spec reconciliation, and proposes no changes to application source during the proposal stage.
