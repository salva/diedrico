# Wave 012 Scope Check — Placeholder/debug cleanup

**Stage:** `cycle-012-fresh-scout-proposals`  
**Wave:** 012 — Remove vacant placeholders, noisy debug surfaces, and obsolete operation docs  
**Date:** 2026-05-26  
**Source-code changes in this stage:** none intended; this artifact is scout/proposal input only.

## Scope decision

Wave 012 can proceed without editing `architecture-audit/wave-plan.md`.

The core premise still holds after Wave 011: two operation-family directories are still README-only placeholders, Wave 011 deleted the previous `operations/debug/` example operation surface, and active source still contains routine debug logging in normal Drive, geometry/rendering-adjacent, domain realization, and command-operation paths. The only premise adjustment is that `frontend/src/services/PaperService.ts` no longer exists in the current tree; rendering/paper cleanup evidence now lives in `frontend/src/domain/presentation/Paper.ts`, `frontend/src/services/SVGRenderer.ts`, `frontend/src/rendering/`, and utility modules such as `frontend/src/utils/rectangleGrid.ts` / `frontend/src/utils/projectionPlaneUtils.ts` rather than that old service path.

## Wave 011 outcomes consumed

Wave 011 created executable architecture/static gates and removed the old debug examples surface:

- Root `package.json` now delegates lint/test/build/e2e only to the active `frontend` workspace (`package.json:7-21`).
- Frontend `lint` is an executable architecture gate (`frontend/package.json:13-16`), not ESLint/type-check.
- Architecture import-boundary tests now include a guard that active source/tests must not reference `ExamplesMenu`, `AddExampleSetupOp`, `projection-plane-setup`, or `basic-3d-point-setup` (`frontend/tests/unit/architecture/importBoundaries.spec.ts:61-67`).
- Wave 011 implementation log records deletion of `frontend/src/components/menus/ExamplesMenu.vue`, `frontend/src/commands/operations/debug/AddExampleSetupOp.ts`, and the empty `frontend/src/commands/operations/debug/` directory (`architecture-audit/cycle-011-architecture-tests-validation-gates/implementation-log.md`, “Deleted legacy/debug surfaces”).
- The same log classifies known residual validation debt: full Vitest failures unrelated to Wave 011, Node 24 / `vue-tsc` build crash, and corrupted broad e2e specs (`architecture-audit/cycle-011-architecture-tests-validation-gates/implementation-log.md`, “Mandatory cadence failures classified as pre-existing/unrelated to Wave 011”).

## Source-control and safety notes

- I did not read secret/config paths such as `.saivage/saivage.json`, `.saivage/auth-profiles.json`, provider configs, or `frontend/.env*`.
- The worktree already contains many unrelated tracked/untracked Saivage/audit changes. This scope check must not revert them; implementation should inspect its own diff and stage only Wave 012 files.
- Application source (`frontend/`, `backend/`, `specs/`, `docs/`) was inspected only; no application source was modified by this scout.

## Placeholder operation directories

### `paper/` is still README-only

`frontend/src/commands/operations/paper/README.md` contains only aspirational prose for future operations:

- Title/purpose: “Paper Operations” and “Operations modifying the rendering layer state” (`frontend/src/commands/operations/paper/README.md:1-5`).
- Explicit “Future Operations” list for `InvalidateCacheOp`, `SetVisibilityOp`, and `UpdateHighlightOp` (`frontend/src/commands/operations/paper/README.md:7-10`).
- No implementation file exists in the directory; the scan found only this README.

This satisfies the Wave 012 delete premise for `frontend/src/commands/operations/paper/`.

### `toolbar/` is still README-only

`frontend/src/commands/operations/toolbar/README.md` likewise contains only aspirational prose:

- Title/purpose: “Toolbar Operations” and “Operations modifying UI control state” (`frontend/src/commands/operations/toolbar/README.md:1-5`).
- Explicit “Future Operations” list for `SetActiveToolOp`, `SetToolFeedbackOp`, and `SetToolOptionsOp` (`frontend/src/commands/operations/toolbar/README.md:7-10`).
- No implementation file exists in the directory; the scan found only this README.

This satisfies the Wave 012 delete premise for `frontend/src/commands/operations/toolbar/`.

### `debug/` operation directory is already gone

The `frontend/src/commands/operations/` directory now contains `IOperation.ts`, `OperationRegistry.ts`, `paper/`, `processTree/`, `toolbar/`, `viewState/`, and `world/`; no `debug/` directory remains. Wave 011’s implementation log records the `debug/` directory deletion, and the current architecture gate prevents active references to the deleted example/debug setup names (`frontend/tests/unit/architecture/importBoundaries.spec.ts:61-67`).

## Operation registry impact

The current operation registry registers only world and process-tree descriptors:

- `registerAllOperations()` calls `registerWorldOperationDescriptors(registry)` and `registerProcessTreeOperationDescriptors(registry)` (`frontend/src/commands/operations/OperationRegistry.ts:54-63`).
- The only imports at the bottom are world and process-tree descriptor registration modules (`frontend/src/commands/operations/OperationRegistry.ts:78-79`).

Deleting README-only `paper/` and `toolbar/` should not affect command persistence/deserialization unless tests or docs reference the directories textually.

## Debug/routine logging evidence

Wave 012 should distinguish normal debug noise from justified error reporting. `console.error` / `console.warn` in catch/error paths may be retained or reviewed case-by-case, but routine `console.log` in normal app/persistence/rendering/domain flows should be deleted rather than wrapped.

### Drive/persistence path

`frontend/src/services/GoogleDriveService.ts` still emits routine Drive/auth metadata and successful operation logs:

- Initialization logs a partially redacted client ID, API-key presence, and OAuth scopes (`frontend/src/services/GoogleDriveService.ts:82-86`), followed by success (`frontend/src/services/GoogleDriveService.ts:108`). Even redacted config metadata is unnecessary routine console output in normal auth flow.
- Session restore and restore failure are logged to `console.log` (`frontend/src/services/GoogleDriveService.ts:131-133`).
- Sign-in success logs (`frontend/src/services/GoogleDriveService.ts:204`).
- Update flow logs file status checks, file metadata response, and successful update (`frontend/src/services/GoogleDriveService.ts:475-483`, `frontend/src/services/GoogleDriveService.ts:527`).
- Default project-name generation logs file counts, extracted numbers, gap detection, and selected name (`frontend/src/services/GoogleDriveService.ts:556-592`).
- Rename success logs the final file name (`frontend/src/services/GoogleDriveService.ts:631`).

The same file also contains old task/spec comments (`frontend/src/services/GoogleDriveService.ts:12-13`, `frontend/src/services/GoogleDriveService.ts:46`, `frontend/src/services/GoogleDriveService.ts:238`, `frontend/src/services/GoogleDriveService.ts:432`). Broad docs/spec reconciliation belongs to Wave 013, but comments directly touched while deleting logs should be pruned if they are stale operation/debug/task breadcrumbs.

### Rendering/geometry-adjacent paths

`frontend/src/services/PaperService.ts` is absent, so the current Wave 012 rendering-noise target should be the remaining rendering/geometry helpers:

- `frontend/src/utils/rectangleGrid.ts` has a module-level `clipDebugDone` flag and first-segment debug branch (`frontend/src/utils/rectangleGrid.ts:94`, `frontend/src/utils/rectangleGrid.ts:113-119`), then many conditional `console.log` statements for clipping internals (`frontend/src/utils/rectangleGrid.ts:142-186`). It also logs grid generation bounds, corners, divisions, clipped counts, and totals on every call (`frontend/src/utils/rectangleGrid.ts:211-223`, `frontend/src/utils/rectangleGrid.ts:269`, `frontend/src/utils/rectangleGrid.ts:306-307`).
- `frontend/src/utils/projectionPlaneUtils.ts` logs projection-matrix diagnostics and a hard-coded expected normal during computation (`frontend/src/utils/projectionPlaneUtils.ts:282-284`, `frontend/src/utils/projectionPlaneUtils.ts:293`, `frontend/src/utils/projectionPlaneUtils.ts:300-302`, `frontend/src/utils/projectionPlaneUtils.ts:341-351`).
- `frontend/src/services/SVGRenderer.ts` has no console-debug target in the focused scan; it only contains spec/phase comments (`frontend/src/services/SVGRenderer.ts:18`, `frontend/src/services/SVGRenderer.ts:130`). Those are better deferred to Wave 013 unless touched by runtime cleanup.

### Domain realization and command-operation paths

Additional routine logs remain outside the exact four files named in the Wave entry but are in active source paths that Wave 012 explicitly covers as “routine debug logging” and “debug-only operation paths”:

- `frontend/src/domain/world/HingeLine.ts` logs half-hinge sibling lookup internals (`frontend/src/domain/world/HingeLine.ts:111`, `frontend/src/domain/world/HingeLine.ts:120`, `frontend/src/domain/world/HingeLine.ts:131`, `frontend/src/domain/world/HingeLine.ts:140`).
- `frontend/src/domain/world/Guide.ts` logs sibling-guide realization and broken-half-hinge-line round-trip data (`frontend/src/domain/world/Guide.ts:276`, `frontend/src/domain/world/Guide.ts:282`, `frontend/src/domain/world/Guide.ts:335`).
- `frontend/src/commands/operations/world/UpdateElementStyleOp.ts` logs applied/restored style internals (`frontend/src/commands/operations/world/UpdateElementStyleOp.ts:97`, `frontend/src/commands/operations/world/UpdateElementStyleOp.ts:137`).
- `frontend/src/commands/operations/world/RemoveElementOps.ts` logs sibling-guide removal (`frontend/src/commands/operations/world/RemoveElementOps.ts:440`).
- `frontend/src/commands/operations/processTree/ToggleOutputOp.ts` logs apply/redo node IDs (`frontend/src/commands/operations/processTree/ToggleOutputOp.ts:20`, `frontend/src/commands/operations/processTree/ToggleOutputOp.ts:35`).
- `frontend/src/commands/operations/processTree/ToggleEncapsulationOp.ts` logs apply/redo subprocess IDs (`frontend/src/commands/operations/processTree/ToggleEncapsulationOp.ts:20`, `frontend/src/commands/operations/processTree/ToggleEncapsulationOp.ts:35`).

These should be candidates for deletion if tests confirm they are not asserted. They are not architecture boundaries worth preserving with a logging abstraction unless the restructure proposal decides to introduce a narrow diagnostics port for genuinely optional developer diagnostics.

### App shell and project service paths

- `frontend/src/App.vue` currently has no `console.log`/debug logging in the inspected file. It has placeholder event handlers that discard highlight arguments (`frontend/src/App.vue:160-165`); these look like inert UI stubs, but deleting them may require component contract changes and should be proposed carefully, not done as an incidental log cleanup.
- `frontend/src/services/ProjectService.ts` currently has no routine debug logging in the inspected file. It is current-schema persistence orchestration and validates/deserializes commands (`frontend/src/services/ProjectService.ts:24-78`, `frontend/src/services/ProjectService.ts:80-129`).

## TODO / obsolete-comment evidence

Focused TODOs directly relevant to Wave 012 cleanup:

- `frontend/src/config/toolFamilies.ts:28` imports `FreePointIcon` as `ExampleIcon` with `// TODO: Create dedicated icon for examples`. If the example/debug family is not user-facing after Wave 011’s deletion of `ExamplesMenu` / `AddExampleSetupOp`, proposals should decide whether this is stale example-tool residue or still active toolbar UI state.
- `frontend/src/config/toolFamilies.ts:213` has `// TODO: Create dedicated icon for auxiliary projection planes`; this is a minor UI TODO and may be outside the placeholder/debug cleanup unless the icon path is touched.

Many old “Phase N” and `@see specs/001-dihedral-learning-mvp/...` comments remain across domain/rendering/operation code. Broad reconciliation of those comments with cleaned architecture is Wave 013 scope. Wave 012 should delete only stale comments adjacent to removed placeholder/debug/log code or comments that directly preserve obsolete operation/debug mental models.

## Validation implications for deletion safety

The implementation proposal should plan the mandatory cadence and classify known pre-existing failures explicitly:

1. **Static/focused deletion scans**
   - Scan that no README-only operation directories remain: `test ! -d frontend/src/commands/operations/paper && test ! -d frontend/src/commands/operations/toolbar`.
   - Scan that no active source/tests reference `operations/paper`, `operations/toolbar`, `operations/debug`, `ExamplesMenu`, `AddExampleSetupOp`, `projection-plane-setup`, or `basic-3d-point-setup`, excluding architecture artifact prose.
   - Scan active `frontend/src` for routine `console.log` / `console.debug` / `console.info` after agreed deletions. If any remain, proposals should require a justification per line.
2. **Architecture/static gates**
   - `npm run lint` at root and `npm run lint --workspace=frontend`; per Wave 011 these are architecture/static gates (`package.json:16`, `frontend/package.json:16`).
   - `npm run test:architecture` at root and `npm run test:architecture --workspace=frontend`; architecture tests should continue to pass and may be extended to cover placeholder directories/logging if the selected proposal includes static enforcement.
3. **Focused tests**
   - If only README directories and logs are deleted, focused tests can target operation registry/persistence smoke and rendering geometry utility behavior where logs were removed.
   - Candidate focused Vitest paths should include operation registry/serialization tests if present, process-tree toggle tests if command logs are removed, and geometry/rendering utility tests if `rectangleGrid` / `projectionPlaneUtils` logs are touched.
4. **Mandatory full cadence**
   - Root and frontend full Vitest are expected to keep failing for the pre-existing unrelated failures recorded by Wave 011 unless those files are touched.
   - Root and frontend builds are expected to keep failing due to Node 24 / `vue-tsc` incompatibility unless tooling changes are made, which is outside Wave 012.
   - Root and frontend broad e2e are expected to keep failing before execution due to corrupted broad e2e specs unless validation-health work is pulled into a separate reviewed plan edit; do not solve that in Wave 012.
5. **Runtime/e2e/live smoke**
   - Because deleting logs and placeholder docs should not change user behavior, a focused Playwright smoke such as the existing Wave 010 app-shell/project-flow guard can verify startup/open-project surfaces still load.
   - Live preview must be refreshed and probed (`curl -I http://127.0.0.1:5173/`) at implementation/validation completion.

## Remaining-wave re-rank after Wave 011

The authoritative remaining plan order should stay:

1. **Wave 012 — Remove vacant placeholders, noisy debug surfaces, and obsolete operation docs.** This is now the right next wave because Wave 011 already installed architecture/static gates and deleted the known debug example operation surface, so remaining placeholder/log cleanup is low-risk and source-tree-local.
2. **Wave 013 — Reconcile docs/specs with the cleaned architecture.** Keep broad docs/spec/comment reconciliation after Wave 012. Do not expand Wave 012 into a general cleanup of all `specs/001-dihedral-learning-mvp` references or all “Phase N” comments.

Candidate future issues from Wave 011 validation debt (Node 24 / `vue-tsc`, full Vitest failures, corrupted broad e2e specs) remain important but are not currently plan entries and should not displace Wave 012 without an explicit reviewed wave-plan edit.

## Conclusion

Proceed to proposals. The direct proposal can safely center on deleting `frontend/src/commands/operations/paper/` and `frontend/src/commands/operations/toolbar/`, removing routine debug logs from Drive/geometry/domain/operation paths, and adding/using static scans to prevent recurrence. The restructure proposal should evaluate whether a tiny diagnostics boundary or architecture gate is warranted, but should avoid overbuilding logging infrastructure for debug noise that can simply be deleted.
