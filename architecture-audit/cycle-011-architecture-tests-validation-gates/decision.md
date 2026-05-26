# Wave 011 Decision — Architecture tests and root validation gates

**Cycle:** `cycle-011-architecture-tests-validation-gates`  
**Decision stage:** `cycle-011-decision`  
**Source-code changes in this stage:** none.  
**Review convergence:** complete after round 02.  
**Review outcome:** **NO BLOCKING ISSUES**.  
**Selected implementation proposal:** `proposals/proposal-restructure.md`.  
**Rejected/deferred alternative:** `proposals/proposal-direct.md`.

## Artifacts considered

This decision is based on the complete Wave 011 convergence set:

- `architecture-audit/wave-plan.md` — Wave 011 targets architecture tests and root validation gates after Waves 001–010, with success criteria requiring tests for domain-to-command/service imports, UI-to-operation imports, duplicate geometry ownership, forbidden frontend→backend implementation imports, and truthful root validation for active workspaces.
- `scope-check.md` — confirms Wave 011 remains the next central wave after Wave 010, but the backend is no longer active; root validation must therefore reflect the single active `frontend` workspace instead of reintroducing backend coverage.
- `proposals/proposal-direct.md` — proposes centralizing architecture tests and validation scripts while retaining `ExamplesMenu.vue` as an explicitly temporary, single-file Wave 012 UI-to-command exception.
- `proposals/proposal-restructure.md` — proposes making validation a first-class contract and removing or moving the residual `ExamplesMenu.vue` UI command leak before enforcing strict architecture gates.
- `corrections-round-01-note.md` — records in-place corrections after review round 01: executable lint/static gates, explicit root/frontend command contracts after backend deletion, tightened Direct `ExamplesMenu.vue` exception language, stale Playwright backend comment deletion, and validation-debt classification scope.
- `reviews/round-01-review.md` — scored both proposals, preferred Proposal Restructure, and raised three blockers around lint truthfulness, root validation contract clarity, and Direct's exception language.
- `reviews/round-02-review.md` — verifies all round-01 blockers were resolved, scores Proposal Restructure highest, recommends Proposal Restructure, and declares **NO BLOCKING ISSUES**.

## Review convergence result

Review convergence is complete for Wave 011 after round 02.

`reviews/round-02-review.md` explicitly declares **NO BLOCKING ISSUES**. It confirms that both corrected proposals now define executable lint/static gates, exact root/frontend validation surfaces after backend deletion, stale backend config cleanup, focused architecture-test expectations, and truthful classification of known validation debt. No further review round is required before implementation.

## Selected proposal

Wave 011 will implement **Proposal Restructure: Make validation a first-class contract and delete residual debug/UI command leaks first**.

Reasons:

1. It best advances the Wave 011 target outcome: architecture tests should encode the intended cleaned architecture, not preserve known boundary violations behind allowlists.
2. It aligns most strongly with the project priorities: clean architecture and aggressive deletion outrank compatibility and preservation of debug convenience.
3. It directly addresses the known UI-to-command leak in `frontend/src/components/menus/ExamplesMenu.vue`, which imports `Command`, `AddExampleSetupOp`, and `CommandStack` and constructs/pushes commands from the component.
4. It creates a strict architecture gate for UI components with no `ExamplesMenu.vue` allowlist. If the examples path is debug-only it must be deleted; if it is retained as real behavior, command construction must move behind an application use case.
5. It makes the root validation contract more explicit than Direct by adding root `test:e2e` as transparent delegation to the active frontend workspace.
6. It preserves scope discipline: only the examples/debug surface directly blocking a truthful UI gate may be touched; broad Wave 012 debug/placeholder cleanup and Wave 013 docs/spec reconciliation remain excluded.

## Rejected/deferred alternative

`proposals/proposal-direct.md` is rejected as the Wave 011 implementation baseline.

Direct is now decision-ready and its single-file `ExamplesMenu.vue` exception is narrow enough to be non-blocking, but it is architecturally weaker than Restructure. Keeping any UI-to-command allowlist in the first architecture-gate hardening wave risks normalizing the exact erosion the wave is meant to prevent. Direct's useful pieces are retained as implementation constraints only where they overlap Restructure: shared deterministic scanners, centralized architecture tests, executable lint/static gates, stale Playwright backend comment cleanup, and exact validation-debt classification.

The rejected Direct approach must not be implemented by leaving a temporary `ExamplesMenu.vue` architecture-test allowlist. The next implementation stage must either delete the debug/example path or move command construction out of the component.

## Exact implementation scope

The implementation stage must follow `proposals/proposal-restructure.md` and stay within Wave 011's validation-gate objective.

### Architecture test consolidation

Implement deterministic, Vitest-native architecture tests under `frontend/tests/unit/architecture/**`:

- Add `frontend/tests/unit/architecture/helpers/sourceScanner.ts` or an equivalent helper module that enumerates source/test text files, normalizes project-relative paths, extracts imports/raw text, and supports explicit failure messages.
- Replace the narrow `worldBoundary.spec.ts` implementation with full-domain import-boundary coverage: `frontend/src/domain/**` must not import commands, application, services, components, stores, or persistence modules. Keep a named `World.ts` assertion because that was the original boundary.
- Replace/refactor `deletedLegacyWorldStatePaths.spec.ts` to use the shared scanner while preserving checks for deleted duplicate geometry/state surfaces such as `worldStore`, `useWorldStore`, `Workspace2D`, `ElementRenderer`, `ElementTypes`, `useSnapping`, `useElementGeometry`, and `getWorld`.
- Replace `noCommandSubclasses.spec.ts` with deterministic scanner logic. Delete the shell/`grep`/`execSync` implementation and warning-pass behavior; architecture tests must fail when the scan cannot prove the rule.
- Add/import-boundary coverage proving:
  - `frontend/src/components/**` does not import `@/commands/**`, concrete operations, command factories, or `CommandStack`;
  - application/use-case modules may import commands/operations as the intended command-construction layer;
  - frontend source/tests do not import deleted backend implementation files such as `backend/src/**`;
  - stale backend project API/DTO/dialog terms are forbidden except for explicitly named negative-test strings in `frontend/tests/e2e/wave010-app-shell-project-flow.spec.ts`.
- Move generic Wave 010 frontend/backend assertions out of `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts` into architecture tests. Leave app-shell-specific runtime/UI assertions in the app-shell test.

### Source cleanup required for strict UI boundary

Before enforcing the strict UI architecture gate, remove the `ExamplesMenu.vue` UI-to-command leak using one of these paths:

1. **Preferred: delete debug/example path.** If static usage evidence shows the examples menu/setup operation is debug-only or non-essential, delete `frontend/src/components/menus/ExamplesMenu.vue`, delete `frontend/src/commands/operations/debug/AddExampleSetupOp.ts`, delete the debug operation directory if it becomes empty, and remove parent imports/registrations/tests/e2e references.
2. **Allowed: move behind application use case.** If the examples menu is retained as a real user-facing feature, add a narrow application use-case boundary for example setup. `ExamplesMenu.vue` may call an application-facing API, but it must not import `Command`, `CommandStack`, concrete operations, or command factories, and it must not push commands directly.

No UI command/operation allowlist may remain for `ExamplesMenu.vue` or any other component.

### Package/script/config contract

After Wave 011 implementation, the validation command surface must be truthful for the single active frontend workspace:

- Root `package.json`:
  - keep only the active `frontend` workspace;
  - keep root `lint`, `test`, and `build` delegation to frontend;
  - add `test:architecture` delegating to `npm run test:architecture --workspace=frontend`;
  - add `test:e2e` delegating to `npm run test:e2e --workspace=frontend`;
  - do not reintroduce backend validation scripts or backend workspace references.
- `frontend/package.json`:
  - add `test:architecture` as `vitest run tests/unit/architecture` or equivalent focused architecture-test command;
  - make `lint` a real executable gate. Prefer minimal ESLint dependency/config restoration if it remains small and does not create broad unrelated style churn; otherwise use the installed TypeScript static gate such as `vue-tsc --noEmit`. No no-op script, missing executable, `|| true`, or residual `eslint: not found` classification is allowed.
- `frontend/playwright.config.ts`:
  - delete the stale commented backend `webServer` block because the backend workspace was deleted in Wave 010.

### Files likely to change/delete

Likely changed files:

- `package.json`
- `frontend/package.json`
- `frontend/playwright.config.ts`
- `frontend/tests/unit/architecture/helpers/sourceScanner.ts` or equivalent new helper
- `frontend/tests/unit/architecture/worldBoundary.spec.ts`
- `frontend/tests/unit/architecture/deletedLegacyWorldStatePaths.spec.ts`
- `frontend/tests/unit/architecture/noCommandSubclasses.spec.ts`
- `frontend/tests/unit/architecture/importBoundaries.spec.ts` or equivalent split architecture test files
- `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts`
- parent component(s), tests, or application-use-case files only as needed to delete or move the examples setup path

Exact DELETE list:

- Delete the shell/`grep` warning-pass implementation in `frontend/tests/unit/architecture/noCommandSubclasses.spec.ts`.
- Delete duplicated generic backend-boundary assertions from `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts` after moving them to architecture tests.
- Delete stale backend `webServer` comments from `frontend/playwright.config.ts`.
- Delete `frontend/src/components/menus/ExamplesMenu.vue` if classified debug-only.
- Delete `frontend/src/commands/operations/debug/AddExampleSetupOp.ts` and any empty debug operation directory if the examples path is deleted.
- Delete tests/e2e/docs/fixtures that exist only to preserve the deleted examples/debug setup surface.
- Delete obsolete architecture-test helpers/fixtures tied only to removed legacy paths if discovered.

No compatibility shims, broad allowlists, or parallel old/new validation paths may remain.

## Binding implementation constraints

- Do not modify broad Wave 012 debug/placeholder cleanup except the `ExamplesMenu.vue` / `AddExampleSetupOp` path directly required for the strict UI boundary.
- Do not perform Wave 013 docs/spec reconciliation except for directly required truthful validation-gate references, such as deleting stale backend validation comments in Playwright config.
- Do not reintroduce backend workspace scripts, backend package validation, backend API DTOs, or backend imports; Wave 010 deleted the backend workspace from the active architecture.
- Do not leave root or frontend validation scripts that call missing tools or no-op placeholders.
- Do not add opaque architecture-test allowlists. The only accepted test exception is the existing focused negative e2e guard strings in `frontend/tests/e2e/wave010-app-shell-project-flow.spec.ts`, and that exception must be named and narrow.
- Do not change geometry/intersection behavior as part of this wave unless a Wave 011 test change directly causes a failure. Existing intersections failures are validation debt to classify, not fix opportunistically.
- Do not repair unrelated broad e2e corruption unless the selected examples cleanup directly touches the affected file or a narrow parse repair is necessary to make Wave 011 validation runnable and is recorded as validation-gate debt remediation.

## Mandatory validation requirements

Capture full stdout/stderr for every command under `architecture-audit/cycle-011-architecture-tests-validation-gates/validation/`.

Required static/focused checks:

1. Static scan proving no forbidden domain imports from `frontend/src/domain/**` into commands/application/services/components/stores/persistence.
2. Static scan proving no `frontend/src/components/**` imports command/operation/factory/`CommandStack` surfaces, with no `ExamplesMenu.vue` allowlist.
3. Static scan proving no frontend imports from `backend/src/**` and no stale backend project terms outside the focused Wave 010 negative e2e guard.
4. If deleting examples: static scan proving no active source/tests reference `ExamplesMenu.vue`, `AddExampleSetupOp`, or the debug example setup path.
5. If moving examples: focused test/static proof that `ExamplesMenu.vue` imports only application-facing surfaces and no command internals.

Required command cadence:

- Root focused architecture gate: `npm run test:architecture`
- Frontend focused architecture gate: `npm run test:architecture --workspace=frontend`
- Focused app-shell tests after moving generic rules, e.g. `npx vitest run tests/unit/application/appShell/AppShellBoundary.test.ts tests/unit/application/appShell/KeyboardShortcutRouter.test.ts` from `frontend/` or equivalent workspace invocation.
- Root mandatory commands: `npm run lint`, `npm run test`, `npm run build`, `npm run test:e2e`.
- Frontend workspace mandatory commands: `npm run lint --workspace=frontend`, `npm run test --workspace=frontend`, `npm run build --workspace=frontend`, `npm run test:e2e --workspace=frontend`.
- Focused Playwright backend-deletion guard: `npx playwright test tests/e2e/wave010-app-shell-project-flow.spec.ts` from `frontend/` or equivalent workspace invocation.
- Live preview refresh bound to `0.0.0.0`, plus reachability probe such as `curl -I http://127.0.0.1:5173/` or the actual configured port.

Validation expectations:

- Focused architecture tests must pass.
- Lint/static gates must execute real tooling and must not fail because `eslint` is missing.
- Full Vitest/build/e2e failures may be classified only when they are pre-existing and not caused by Wave 011; classification must cite exact command, file, and error output.
- Preview refresh and probe must be recorded in `implementation-log.md`.

## Accepted residual risks

These risks are accepted for implementation but must be tracked in `implementation-log.md`:

- The examples menu may be user-visible. Implementation must verify usage quickly before deletion; if it is real behavior, move it behind an application use case rather than deleting it or allowlisting it.
- A real lint/static gate may expose unrelated type/style debt. The implementation must remediate missing-tool failures and classify unrelated failures with exact logs if they are not attributable to Wave 011.
- Existing Node 24 / `vue-tsc` build issues may remain. Remediate only if the fix is small and tooling-scoped; otherwise classify with exact output.
- Existing full Vitest intersection failures may remain. Do not change geometry behavior in this wave unless Wave 011 causes the failure.
- Existing broad e2e syntax corruption may remain. Repair only directly affected or narrowly validation-gate-blocking corruption; otherwise classify with exact output.

## Next implementation scope

Proceed to `cycle-011-implement-architecture-tests-validation-gates` with Proposal Restructure only. The implementation must centralize deterministic architecture tests, enforce strict domain/UI/frontend-backend import boundaries, make root/frontend validation scripts executable and truthful for the single active frontend workspace, delete stale backend Playwright config comments, remove or application-route the `ExamplesMenu.vue` debug/example command leak with no architecture-test allowlist, run the mandatory validation cadence, refresh the live preview, and record all results in `architecture-audit/cycle-011-architecture-tests-validation-gates/implementation-log.md`.
