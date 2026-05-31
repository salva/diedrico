# Cycle 020 Review Round 01 post-019 — App-shell project session / browser integration proposals

## Scope and evidence checked

Reviewed against the Wave 020 entry (`architecture-audit/wave-plan.md:1118`), current scope-check, both proposals, synthesized critique, synthesized fresh-scout stage-quality review, current app-shell source, Wave 019 closure log, and Cycle 026 3D overlay hotfix log.

Path-scoped diff hygiene was checked before review. Current scoped dirty files are limited to unrelated `frontend/src/domain/calculations/Intersections.ts`, `frontend/src/domain/processTree/ActionGroup.ts`, and `frontend/src/stores/viewStore.ts`; no Wave 020 production/app-shell source is currently dirty (`.saivage/stages/cycle-020-review-round-01-post-019/reviews/path-scoped-diff-names.stdout`).

Critic protocol evidence exists and is acceptable under failure tolerance: `critique/round-01-critique.md` is explicitly marked `synthesized_by: manager` with `reason: critic_dispatch_unavailable` after two failed critic attempts.

## Proposal scoring

### Proposal A — `proposals/proposal-direct.md`

1. **Advances Wave 020 target outcome:** **Pass.** It matches the current-source update that the main seams already exist: `App.vue` already delegates to `createProductionAppShellRuntime`, browser-only composition is already concentrated in `AppShellProductionRuntime.ts`, `BrowserLastProjectRepository` already owns last-project storage keys, `ProjectSessionPersistenceAdapter` already contains app-shell `ProjectService` calls, and `createAppShellRuntime` remains environment-free (`frontend/src/App.vue`, `frontend/src/application/appShell/AppShellProductionRuntime.ts`, `frontend/src/application/appShell/BrowserLastProjectRepository.ts`, `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts`, `frontend/src/application/appShell/AppShellRuntime.ts`). The proposed direct path correctly frames Wave 020 as hardening/deletion rather than recreation.
2. **Improves architecture and code quality:** **Pass.** The strongest near-term gains are realistic and bounded: tighten over-broad dependency bags, remove dead exports or compatibility expectations, and replace touched `as any` app-shell fixtures with typed builders. This directly targets the remaining quality smells visible in `ProjectSessionUseCases` (full `AppShellRuntimePorts` bag) and `createAppShellRuntime` (`internals` leakage).
3. **Respects no-backcompat / aggressive deletion priorities:** **Pass.** It explicitly prefers deleting obsolete hidden-construction assertions, dead exports, duplicate key usage, and dual factory paths rather than preserving them.
4. **Avoids overfeaturism:** **Pass.** The proposal explicitly keeps Drive/auth internals, persistence schema/replay, rendering/Three boundaries, backend/docs/specs/tooling, broad store redesign, and UI features out of scope.
5. **Risks / hidden regressions:** **Pass with standard implementation vigilance.** The proposal explicitly protects the Wave 019 Three runtime/platform boundary and the Cycle 026 3D overlay pointer-boundary fix. Current source still has the protected overlay CSS and e2e assertion (`frontend/src/App.vue:277-278`, `frontend/tests/e2e/current-ui-contract.spec.ts:89-106`).
6. **Validation sufficiency:** **Pass.** The plan includes the required static scans, focused app-shell tests, root/frontend lint, full Vitest, root/frontend build, root/frontend e2e, and live preview/browser smoke. That is sufficient for this wave if executed and logged under the cycle validation directory.

### Proposal B — `proposals/proposal-restructure.md`

1. **Advances Wave 020 target outcome:** **Conditional pass.** It could improve architectural clarity if the direct path proves unable to explain `RuntimeSession` ownership, persistence handles, or `internals` removal. But current evidence does not yet show that extra split is necessary.
2. **Improves architecture and code quality:** **Mixed.** It may improve naming/dependency clarity, but it also risks introducing a new composition layer with limited payoff because the current production/runtime split already exists.
3. **Respects no-backcompat / aggressive deletion priorities:** **Pass.** It also prefers deletion over shims if selected.
4. **Avoids overfeaturism:** **Borderline but acceptable as fallback.** The proposal is disciplined about stop conditions, yet it inherently carries more churn and more naming/module movement than the direct path.
5. **Risks / hidden regressions:** **Higher risk than direct.** The main danger is creating a new app-shell/session facade that just renames existing concentration without deleting meaningful complexity, or turning production composition into another broad helper layer.
6. **Validation sufficiency:** **Pass.** The validation plan is adequate if this route were selected.

## Boundary and scope verification

- **App.vue shell boundary:** acceptable as-is. It remains a passive shell that reads env-backed Google config, passes callbacks/stores, provides runtime ports, and starts/disposes runtime. Review agrees it must not regain autosave/project/keyboard/storage logic.
- **Production browser composition:** already centralized in `AppShellProductionRuntime.ts`; review agrees this should remain the single production composition module unless a reviewed delta explicitly replaces it.
- **Environment-free runtime assembly:** current `AppShellRuntime.ts`, `ProjectSessionUseCases.ts`, and `AutoSaveUseCases.ts` contain no direct `window`, `localStorage`, `sessionStorage`, `GoogleDriveService`, or `ProjectService` imports (`boundary-scan.stdout` returned no matches).
- **Storage-key ownership:** current source already centralizes `diedrico_last_file_*` in `BrowserLastProjectRepository.ts`; remaining references are boundary tests and runtime tests, not production duplication (`last-project-key-scan.stdout`).
- **ProjectService isolation:** current app-shell `ProjectService` usage is isolated to `ProjectSessionPersistenceAdapter.ts`; matching architecture tests already assert this (`projectservice-scan.stdout`).
- **Keyboard target installation:** current design remains explicit and testable (`KeyboardShortcutRouter.install/dispose`, `createAppShellRuntime.start`, `AppShellProductionRuntime` injecting `window`).
- **RuntimeSession ownership:** current source still makes `RuntimeSession` the single app-shell owner of `new World()` and `new CommandStack()`. That is acceptable residual ownership for this wave and does not by itself force the restructure path.
- **Protected surfaces:** both proposals correctly keep Wave 019 Three/runtime/platform work, rendering/presentation/canvas, command descriptors/serialization, persistence schema/replay, backend/docs/specs/tooling, Drive/auth internals, broad store redesign, and UI feature work out of scope.
- **3D pointer-boundary protection:** preserved. Review explicitly requires implementation to keep `.three-view-overlay { pointer-events: auto; }` and the current UI contract e2e coverage intact.

## Decision

**No blocking issues found. Recommend proceeding to `cycle-020-decision-post-019` and selecting `proposal-direct.md` as the preferred implementation path.**

The direct proposal best fits current source reality: most target seams already exist, so the correct move is a bounded hardening/deletion wave. The restructure proposal should remain a fallback only if implementation discovers a real blocker that cannot be resolved without a reviewed delta or plan edit.

## Decision considerations for the next stage

- Prefer source/test changes only where they delete a real leak, dead export, hidden-construction expectation, or over-broad typed dependency.
- Treat `createAppShellRuntime().internals` and `ProjectSessionUseCases`' full `ports` bag as the two most likely cleanup targets, but only if the implementation can narrow them without inventing a new god-facade.
- Keep `viewStore.ts` untouched unless an explicitly reviewed compatibility edit becomes unavoidable; it is already dirty and out of scope.
- Preserve Wave 019 and Cycle 026 protections exactly, especially overlay pointer ownership and no click-through behavior.
