# Cycle 027 Implementation Log — Runtime read-model extractors

## Scope and source-control hygiene

- Implemented the decision-selected `proposal-direct.md` path only.
- Did not modify backend, persistence schema/replay, command history/producer internals, Drive/auth, package/tooling, docs/specs, or broad domain realization ownership.
- Pre-edit broad `git_status` overflowed due to known dirty worktree; path-scoped diff showed unrelated pre-existing deletions in `frontend/tests/e2e/active-plane-shortcuts.spec.ts` and `frontend/tests/e2e/selection-mask.spec.ts`. Those deletions were not reverted, staged, or incorporated.
- Secret/config files were not read.

## Files changed

Source:

- `frontend/src/application/appShell/RuntimeSession.ts`
- `frontend/src/application/appShell/readModels/PropertiesDialogReadModel.ts`
- `frontend/src/application/appShell/readModels/ProcessTreeReadModel.ts`
- `frontend/src/application/appShell/readModels/ElementsPanelReadModel.ts`
- `frontend/src/application/appShell/readModels/ElementVisibilityIntent.ts`
- `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts`
- `frontend/src/application/canvasPresentation/CanvasVisibilityPolicy.ts`

Tests:

- `frontend/tests/unit/application/appShell/RuntimeReadModels.test.ts`
- `frontend/tests/unit/application/appShell/Cycle027Architecture.test.ts`
- `frontend/tests/unit/application/canvasPresentation/projected3DCanvasSelector.spec.ts`

## Deleted/replaced legacy surfaces

- Deleted `RuntimeSession` inline properties read-model helpers from the class body: `describeElementType`, `describeCoordinates`, `describeDependencies`, and `styleView`.
- Deleted `RuntimeSession` inline process DTO helpers from the class body: `createProcessNodeViewModel`, `isActionInfeasible`, and `countProcessNodeViewModels`.
- Deleted `RuntimeSession` inline elements panel formatting/grouping helpers from the class body: `formatElementForPanel` and `getElementProperties`.
- Deleted `RuntimeSession` inline elements visibility mutation body; visibility is now delegated to `ElementVisibilityIntent.toggleElementVisibility(...)`.
- Deleted the canvas process-tree read seam: `CanvasWorldReadPort.getProcessTree()` is absent, and `CanvasVisibilityPolicy` no longer accepts `Pick<World, 'getProcessTree'>` or casts it back to `World`.
- No stale tests asserting old `RuntimeSession` ownership were found; focused tests now assert extracted ownership.

## DTO/read-model ownership evidence

- `PropertiesDialogReadModel.ts` owns properties dialog DTO creation, type labels, coordinate formatting, dependency extraction, created-by placeholder, and style DTO mapping.
- `ProcessTreeReadModel.ts` owns recursive `ProcessNodeViewModel` creation, description mapping, related action lookup, infeasibility calculation, and recursive node counting.
- `ElementsPanelReadModel.ts` owns elements panel display DTOs only: projection-plane ordering/grouping, 2D/3D element formatting, visible display state, and property text.
- `ElementVisibilityIntent.ts` owns the adjacent visibility intent. It preserves current direct `visualStyle` mutation plus `markDirty()` semantics and is not exported from the elements read-model DTO.
- `RuntimeSession` now composes these focused builders/intents while retaining private ownership of `World` and `CommandStack`.

## CanvasWorldReadPort caller-map/residual evidence

- `getProcessTree()` treatment: deleted in this wave. Canvas visibility now depends on behavior-sized `CanvasElementVisibilityPort.isElementVisible(element)`, implemented by `CanvasWorldReadPort` via `resolveVisibility(element, world)`. Canvas selectors do not consume `ProcessTree`.
- `getAllProjectionPlanes()` residual: retained. Named callers remain `CanvasPresentationSelector` for plane-owned 2D traversal/transform collection and `Projected3DCanvasSelector` for per-plane projected-3D iteration. Replacing both would require a broader concrete canvas DTO selector/domain realization redesign outside Cycle 027.
- `getAll3DPoints()`, `getAll3DLines()`, `getAll3DSegments()` residual: retained together. Named caller remains `Projected3DCanvasSelector`, which still owns projected-3D canvas projection loops. No partial deletion was performed.
- 2D/3D realization methods residual: retained because corresponding raw entity collection seams remain. No fake realization narrowing was claimed.
- `ThreeWorldReadPort` was not changed; the decision allowed it to remain as a bounded residual adapter when deeper scene/domain realization cleanup would broaden scope.

## Validation log index

All logs are under `architecture-audit/cycle-027-runtime-read-model-extractors/validation/`.

- `focused-vitest-runtime-read-models.stdout.log` / `.stderr.log`: PASS, 2 files / 6 tests.
- `focused-vitest-canvas-seam.stdout.log` / `.stderr.log`: PASS, projected 3D selector mock aligned with new canvas visibility seam.
- `static-scan-runtime-canvas-seams.stdout.log` / `.stderr.log`: initial broad scan; found stale test mock and acceptable broader domain process-tree uses.
- `static-scan-cycle027-targets.stdout.log` / `.stderr.log`: intermediate target scan; exposed casts in new builders that were subsequently removed.
- `static-scan-cycle027-targets-final.stdout.log` / `.stderr.log`: PASS/no output for deleted canvas getProcessTree seam, RuntimeSession inline helper names, generic facade names, and forbidden tool-world regressions in Cycle 027 targets/components.
- `root-lint.stdout.log` / `.stderr.log`: PASS.
- `frontend-lint.stdout.log` / `.stderr.log`: PASS.
- `root-vitest-full.stdout.log` / `.stderr.log`: PASS, exit code 0.
- `frontend-vitest-full.stdout.log` / `.stderr.log`: PASS, exit code 0.
- `frontend-build.stdout.log` / `.stderr.log`: PASS after initial implementation; only Vite chunk-size warning.
- `root-build.stdout.log` / `.stderr.log`: PASS after final cleanup; only Vite chunk-size warning.
- `root-e2e.stdout.log` / `.stderr.log`: PASS, 10/10 Playwright tests including `3D overlay owns pointer interaction and does not pass drag gestures through to the 2D canvas`.
- `live-preview.stdout.log` / `.stderr.log`, `live-preview.pid`: preview restarted with `npm run dev -- --host 0.0.0.0` from `frontend/`.
- `live-preview-reachability.stdout.log` / `.stderr.log`: PASS, `HTTP/1.1 200 OK` from `http://127.0.0.1:5173/`.

Root and frontend test/build scripts are equivalent workspace invocations in this repo; both root and frontend forms were run for lint/test/build where defined. Credential-free browser e2e was run through Playwright CLI. The separate Playwright MCP live smoke requested by the stage was not available in this Coder toolset; the coverage is represented by passing Playwright e2e plus the HTTP preview probe.

## Protected-surface checks

- No production Vue component receives concrete `World` in Cycle 027 changes.
- No `WorldInjectionKey`, `worldForView`, generic `RuntimeWorld`, or generic `WorldReadModel` facade was introduced.
- No `ToolContext.world`, `CollectionContext.world`, `context.world`, or `realize2D(context.world)` raw tool-world seam was introduced in Cycle 027 targets.
- No command-backed visibility, visibility undo/redo/persistence/history redesign, or command history/producer redesign was introduced.
- No package/tooling churn or backend/docs/debug changes were made.

## Live preview and 3D interaction evidence

- Preview is running via `frontend` Vite dev server bound to `0.0.0.0:5173`.
- Reachability probe returned `HTTP/1.1 200 OK`.
- Playwright e2e `current-ui-contract.spec.ts` passed, including overlay pointer-boundary regression coverage for `.three-view-overlay` ownership and non-click-through drag behavior.

## Residual risks and next-wave candidates

- Raw canvas projection-plane and projected-3D collection seams remain explicit residuals, as allowed by decision.md. A future wave should introduce concrete behavior-sized canvas DTO selectors if it wants to delete these raw traversal seams without a generic facade.
- Properties/process builders still receive concrete `World` because domain descriptor and realization APIs currently require full realization context. This is improved ownership relative to inline `RuntimeSession`, but a future central domain-realization wave could narrow these contexts further.
- `ThreeWorldReadPort` remains a larger adapter; deeper 3D scene/domain realization extraction remains a candidate future wave.
- Worktree remains broadly dirty outside this implementation, including unrelated e2e test deletions observed before edits.

## Wave 027 closure verification — validation-and-preview stage

**Status: WAVE 027 COMPLETE.** The validation-and-preview closure stage independently rechecked the implementation evidence and found no source-attributable blocker. No production source, package/tooling, backend/docs/specs, persistence, command history/producer, broad domain-realization, Drive/auth, or secret/config files were touched during closure.

### Closure evidence added

Additional closure logs are under `architecture-audit/cycle-027-runtime-read-model-extractors/validation/`:

- `closure-scoped-status.stdout.log` / `.stderr.log`: path-scoped source-control check for Cycle 027 artifacts and protected touched source paths. It shows only audit/report directories as untracked in the checked scope; no production source diff was present.
- `closure-scoped-diff-stat.stdout.log` / `.stderr.log`: empty scoped diff stat for Cycle 027 source paths.
- `closure-validation-log-review.stdout.log` / `.stderr.log`: independent tail review of required validation logs confirming focused Vitest, root/frontend lint, root/frontend full Vitest, root/frontend build, root Playwright e2e, and preview reachability are green.
- `closure-forbidden-canvas-component-scan.stdout.log` / `.stderr.log`: PASS for no forbidden canvas/component `World`/process-tree/generic-facade seams; it also records retained raw canvas residual getters and their named callers.
- `closure-live-preview-reachability.stdout.log` / `.stderr.log`: confirms a listener on `0.0.0.0:5173` and `HTTP/1.1 200 OK` from `http://127.0.0.1:5173/`.
- `closure-3d-hotfix-evidence.stdout.log` / `.stderr.log`: confirms the e2e regression test `3D overlay owns pointer interaction and does not pass drag gestures through to the 2D canvas` exists and passed in Wave 027 e2e logs.
- `closure-read-model-ownership-evidence.stdout.log` / `.stderr.log`: confirms `RuntimeSession` composes focused read-model/intent modules, `ElementsPanelReadModel` and `ElementVisibilityIntent` remain separate, and `ProcessTreeNode.vue` consumes `ProcessNodeViewModel` DTOs.
- `closure-wave-plan-headings.stdout.log` and `closure-wave027-entry-tail.stdout.log`: record the current wave-plan ordering and Wave 027 entry used for next-wave recommendation.

### Closure assessment

- Static/source ownership checks confirm the Wave 027 extraction remains intact: `RuntimeSession` wires `buildProcessTreeReadModel`, `buildElementsPanelReadModel`, `toggleElementVisibility`, and properties/process/elements helpers live in focused modules under `frontend/src/application/appShell/readModels/`.
- `ElementsPanelReadModel` remains display DTO-only; visibility mutation is isolated in adjacent `ElementVisibilityIntent` and not exposed as read-model state.
- The deleted canvas process-tree seam remains deleted from canvas/component presentation surfaces. `CanvasWorldReadPort.getAllProjectionPlanes()` and raw projected-3D getters remain documented residuals with named callers in `CanvasPresentationSelector` and `Projected3DCanvasSelector`, matching the accepted decision.
- No generic `RuntimeWorld` / `WorldReadModel` facade, Vue concrete `World` injection, raw tool-world seam, command-backed visibility redesign, persistence/undo/history redesign, package/tooling churn, backend/docs/spec edits, or broad domain-realization rewrite was introduced by closure.
- Mandatory validation evidence remains green: focused runtime read-model Vitest, focused canvas seam Vitest, root/frontend lint, root/frontend full Vitest, root/frontend build, root Playwright e2e, Vite preview restart, and HTTP reachability all passed in stable logs.
- The Cycle 026 3D hotfix contract remains protected by passing e2e evidence for the overlay pointer-boundary regression. The closure toolset did not provide a separate Playwright MCP browser surface; this is accepted as a non-source residual because CLI Playwright e2e exercised the browser interaction and live preview answered HTTP 200 on `0.0.0.0:5173`.

### Source-control reconciliation

The repository remains broadly dirty outside Cycle 027. Closure used path-scoped status/diff checks to avoid incorporating unrelated work. The only intentional closure changes are this implementation-log update, added closure validation logs, and the validation-stage task report.

### Next-wave recommendation / re-rank

Wave 027 was the last current wave-plan entry, and its implementation leaves central residuals around concrete canvas DTO selectors, raw projection-plane/projected-3D traversal, properties/process realization contexts that still receive concrete `World`, and the larger `ThreeWorldReadPort` adapter. The recommended next canonical stage is a **wave-plan-extension / fresh scout** that re-ranks and adds the next wave before any implementation. Based on Wave 027 learnings, the highest-centrality candidate is to continue with behavior-sized presentation/domain realization seams: delete or replace the remaining raw canvas projection-plane/projected-3D collection seams with concrete selector DTOs, then evaluate `ThreeWorldReadPort` and domain realization-context ownership. This should be planned as a new reviewed wave-plan extension rather than implemented in the validation closure stage.
