# Wave 011 Review Round 01 — Architecture tests and root validation gates

## Artifacts reviewed

- `architecture-audit/cycle-011-architecture-tests-validation-gates/scope-check.md`
- `architecture-audit/cycle-011-architecture-tests-validation-gates/proposals/proposal-direct.md`
- `architecture-audit/cycle-011-architecture-tests-validation-gates/proposals/proposal-restructure.md`
- `architecture-audit/wave-plan.md`
- `frontend/src/components/menus/ExamplesMenu.vue`
- `frontend/package.json`
- `frontend/playwright.config.ts`
- existing architecture/app-shell tests under `frontend/tests/unit/architecture/` and `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts`

## Source immutability check

Reviewed `git status` and only saw pre-existing audit/saivage changes plus existing untracked `.saivage/*` files. No new `frontend/`, `backend/`, `specs/`, or `docs/` application-source modifications were introduced by this review stage.

## Proposal scoring

Scale: 1 (poor) to 5 (strong)

### Proposal Direct — `proposals/proposal-direct.md`

1. **Advances target outcome:** 4/5  
   Strong on centralizing architecture tests, promoting the Wave 010 backend guard into architecture coverage, and cleaning stale Playwright backend comments.
2. **Improves architecture/code quality:** 4/5  
   Replacing `execSync`/`grep` architecture tests with deterministic Vitest-native scans is a real quality improvement. Shared scanner helpers also reduce duplicated ad hoc scans.
3. **Respects no-backcompat/aggressive deletion:** 3/5  
   Good on deleting stale test/config fragments, but weaker on preserving `ExamplesMenu.vue` via allowlist rather than deleting/moving the leak.
4. **Avoids overfeaturism:** 4/5  
   Generally scoped well and avoids folding Wave 012/013 cleanup into this wave.
5. **Introduced risks / hidden regressions:** 3/5  
   Main risk is that the `ExamplesMenu.vue` allowlist can become a durable exception instead of a short-lived residual. A second risk is ambiguous lint/build remediation language that could expand scope or leave a non-truthful gate.
6. **Validation sufficiency:** 2/5  
   Good coverage breadth, but it does not yet clearly define what makes root/frontend lint truthful when `frontend/package.json` currently invokes missing `eslint`, and it leaves root e2e alias handling underspecified.

**Assessment of ExamplesMenu.vue leakage:**  
`frontend/src/components/menus/ExamplesMenu.vue:50-55` and `:70-75` are a real UI-to-command leak. A temporary single-file allowlist is acceptable for Wave 011 **only if** the proposal explicitly treats it as a time-boxed residual tied to Wave 012 and requires a failing message that names the exception. As written, the direct proposal is close, but it should tighten the sunset/visibility language so the exception cannot silently normalize.

**Assessment of truthful validation gates:**  
The proposal correctly recognizes that root scripts now target only the active frontend workspace and that stale backend Playwright comments should be deleted. However, it is too ambiguous on lint/build gates: `frontend/package.json` still declares `lint` with `eslint ... --fix` while `eslint` is absent from `devDependencies`, so Wave 011 must specify whether it will (a) install/configure the real lint toolchain now, or (b) replace the declared lint gate with another real executable static check and update scripts truthfully. “Classify if still red” is not enough for a command that currently cannot execute.

### Proposal Restructure — `proposals/proposal-restructure.md`

1. **Advances target outcome:** 5/5  
   Best match to the wave’s architecture-gate intent because it removes or relocates the known UI leak before freezing the rule.
2. **Improves architecture/code quality:** 5/5  
   Strong on expressing architecture tests as the intended target architecture rather than codified exceptions.
3. **Respects no-backcompat/aggressive deletion:** 5/5  
   Best alignment with project priorities: delete debug/example surfaces if they are non-essential, otherwise move them behind an application use case.
4. **Avoids overfeaturism:** 4/5  
   Still acceptably scoped because it touches `ExamplesMenu.vue` only as a direct prerequisite to a truthful UI boundary gate.
5. **Introduced risks / hidden regressions:** 4/5  
   Main risk is user-visible behavior removal if the examples menu is actually relied upon; the proposal already mitigates this with delete-preferred Option A and narrow Option B.
6. **Validation sufficiency:** 3/5  
   Better than Direct on the UI-boundary truthfulness question, but still needs sharper wording on how lint/root gate truthfulness will be achieved and what root e2e entrypoint is expected after backend deletion.

**Assessment of ExamplesMenu.vue leakage:**  
This proposal handles the leak more honestly. Given the wave goal, a strict no-UI-command-import gate is preferable to an allowlist if the menu is debug-only or can be moved behind an application use case with narrow impact.

**Assessment of truthful validation gates:**  
This proposal is directionally correct on single-workspace validation and stale backend Playwright cleanup. But, like the direct proposal, it must state a concrete executable lint/static plan rather than leaving “make lint executable” open-ended.

## Cross-proposal findings

- The scope check is correct not to broaden this wave into general Wave 012/013 cleanup.
- Deleting the stale backend `webServer` comment block from `frontend/playwright.config.ts:46-53` is in scope and should be required in either proposal.
- Moving the generic frontend→backend guard out of `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts:43-50` into `frontend/tests/unit/architecture/` is appropriate; app-shell-specific assertions at `:25-40` should remain focused.
- Replacing `frontend/tests/unit/architecture/noCommandSubclasses.spec.ts` shelling/warn-pass behavior is necessary; the current test explicitly swallows tooling failures and can pass without performing the architectural check.
- The review should not demand fixes for known full-suite geometry failures or unrelated corrupted broad e2e files beyond truthful classification and gate design. Those remain outside Wave 011 unless a proposal chooses a very narrow validation-enabling repair.

## Blocking issues

1. **Both proposals must sharpen the root/frontend lint gate plan.**  
   Current wording leaves open a non-truthful outcome where `lint` remains declared but non-executable because `eslint` is missing from `frontend/package.json`. Each proposal must say exactly which real executable gate Wave 011 will leave in place at root/frontend and whether that means installing/configuring ESLint now or replacing the script with another actual supported static command. “Classify if still red” is insufficient for a missing executable.

2. **Both proposals must state the root validation contract after Wave 010 backend deletion more explicitly.**  
   They should say whether root `package.json` will or will not gain a root `test:e2e` alias, and if not, how the mandatory cadence is satisfied truthfully from the root versus workspace level. This matters because the project objective still names root/workspace validation cadence.

3. **Proposal Direct must tighten the `ExamplesMenu.vue` exception language.**  
   If it keeps the allowlist approach, it must explicitly restrict the exception to that one file, require the test failure output to name the residual as temporary, and point to Wave 012 removal/move as the planned delete target. Without that, the proposal weakens the architecture gate it claims to harden.

## Recommendation

**Preferred after correction: Proposal Restructure.** It better matches the wave’s purpose by making the UI-command boundary truthful instead of enshrining an exception.

**Proposal Direct can still be acceptable** if corrected to make the lint/root gate plan concrete and to make the `ExamplesMenu.vue` allowlist an explicit, temporary, single-file residual rather than a vague carve-out.

## Round outcome

**BLOCKING ISSUES** — in-place proposal corrections required before decision/implementation.
