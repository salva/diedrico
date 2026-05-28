# Cycle 030 Wave-Plan Extension Rationale

## Status

Design draft for Critic/Reviewer convergence. No production or test source implementation was performed in this stage.

## Evidence inspected

- Current scoped/bounded git status: `evidence/git-status-short.log`.
- Current wave-plan tail and absence of a Wave 030 entry: `evidence/wave-plan-tail.log`.
- Cycle 029 decision and closure residual excerpts: `evidence/cycle-029-closure-excerpts.log`.
- Current source excerpts for 3D presentation, app-shell persistence, `ProjectService`, command descriptor residuals, architecture tests, and current UI contract: `evidence/current-source-excerpts.log`, `evidence/focused-citations.log`, `evidence/compact-citations.log`.
- Targeted residual scans: `evidence/residual-static-scans.log`.

Secret/config surfaces were not read. The broad status output contains protected `.saivage/*` config/auth files as untracked, but this task did not inspect their contents and did not use them as premises.

## Current-source residual ranking after Wave 029

### 1. Selected: app-shell persistence DTO port contract cleanup

This is the next highest-centrality bounded seam because it sits at the runtime-session ↔ persistence boundary: saved project data is validated as the concrete `ProjectService.ProjectData`, then cast through the app-shell `PersistedProjectSession` alias and cast back before restore (`frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts:10-20`). The downstream `ProjectService` already owns a current schema and validates command descriptors before replay (`frontend/src/services/ProjectService.ts:11-24`, `frontend/src/services/ProjectService.ts:27-78`, `frontend/src/services/ProjectService.ts:80-129`), so the remaining architectural smell is not a broad persistence rewrite; it is the app-shell port typing that forces `object`/double-cast shapes at the boundary.

This seam outranks adapter-private style cleanup because it affects project save/open/restore contracts and runtime-session validation. It is also safer and more bounded than reopening all command descriptors in the presence of unrelated dirty command files.

### 2. Command/persistence descriptor residuals — central but too broad for Wave 030 without a separate scout

Targeted scans still show command/persistence residuals: many operation classes retain `Record<string, any>` parameters/outputs, process-tree descriptor restoration casts `obj(d, 'action') as unknown as Action`, and some factory logic still uses `(line as any).hingeLineId` (`frontend/src/commands/operations/processTree/registerProcessTreeOperationDescriptors.ts:17-20`; `frontend/src/commands/factories/ProjectionSetupFactory.ts:60-61`, `frontend/src/commands/factories/ProjectionSetupFactory.ts:105-106`; see `evidence/residual-static-scans.log`). These are central, but they span operation families, process-tree action serialization, initialization/setup, and potentially domain accessors. The current git status also shows multiple modified command/process files. A future wave should scout this as its own contract-normalization cycle after Wave 030 removes the app-shell port cast seam.

### 3. Adapter-private `ThreeStylePolicy` / `VisualStyle` mapping cleanup — real but lower centrality

Cycle 029 intentionally accepted adapter-private domain style conversion as residual (`architecture-audit/cycle-029-3d-presentation-dto-read-ports-and-realization-context-ownership/implementation-log.md`, “Residual risks” and “Next-wave candidates”). Current source confirms `ThreeStylePolicy.ts` still imports `VisualStyle` and exposes `planarStyleFromDomain`, `reconstructedStyleFromDomain`, and `visibleFromDomain` helpers (`frontend/src/application/threePresentation/ThreeStylePolicy.ts:1-31`). The read ports use those helpers while selectors consume DTO visibility/style (`frontend/src/application/threePresentation/ThreePlanarElementReadPort.ts:6-31`; `frontend/src/application/threePresentation/ThreeReconstructedElementReadPort.ts:6-46`; `frontend/src/application/threePresentation/ThreeGuideReadPort.ts:7-66`). Architecture tests currently permit this only as adapter-private conversion (`frontend/tests/unit/application/threePresentation/threePresentationArchitectureBoundary.spec.ts:47-59`).

This is cleanup at a rendering-adapter-private seam after the public 3D DTO boundary is already guarded, so it ranks below persistence contract cleanup.

### 4. Remaining thin 3D selector orchestration — lower centrality than persistence contract cleanup

Current selectors are intentionally thin DTO assemblers: they filter display options and convert DTO read-port models into final renderer DTOs (`frontend/src/application/threePresentation/PlanarElement3DSelector.ts:5-13`; `frontend/src/application/threePresentation/ReconstructedElement3DSelector.ts:5-24`; `frontend/src/application/threePresentation/ProjectionPlane3DSelector.ts:7-39`; `frontend/src/application/threePresentation/Guide3DSelector.ts:7-41`). This may be further collapsed into read ports or renderer DTO adapters later, but it is not a cross-layer leak comparable to a persistence boundary cast.

### 5. Lower-priority cleanup/integration candidates

Backend/docs/spec alignment, Drive/auth, package/tooling, preview ergonomics, and UI styling remain lower priority under centrality guidance. No evidence from this stage shows they should outrank the persistence DTO port seam.

## Selected Wave 030 summary

Append Wave 030 to `architecture-audit/wave-plan.md` as: **App-shell persistence DTO port contract cleanup**.

The wave should remove `object`/`PersistedProjectSession` cast shims from app-shell persistence ports by making the current `ProjectData`/validated project session contract explicit at the application boundary, while preserving `ProjectService` as the current-schema command-stream serializer/deserializer. It must not broaden into command descriptor redesign, project schema migration/backcompat, Drive/auth internals, or source changes before the required fresh-scout/proposals/review stages.

## Next-stage recommendation

If Critic and Reviewer accept this plan extension, proceed to:

`cycle-030-fresh-scout-proposals-app-shell-persistence-dto-port-contract-cleanup`

That stage should write `architecture-audit/cycle-030-app-shell-persistence-dto-port-contract-cleanup/scope-check.md` plus direct/restructure proposals before any implementation.
