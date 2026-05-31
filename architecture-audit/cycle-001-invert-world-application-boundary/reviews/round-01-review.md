# Round 01 Review — Wave 001: Invert the World/application boundary

**Reviewer:** primary reviewer (opencode-go/glm-5.1)
**Stage:** cycle-001-review-round-01
**Date:** 2026-05-25
**Proposals reviewed:**
- `architecture-audit/cycle-001-invert-world-application-boundary/proposals/proposal-direct.md`
- `architecture-audit/cycle-001-invert-world-application-boundary/proposals/proposal-restructure.md`

**Scope check reviewed:** `architecture-audit/cycle-001-invert-world-application-boundary/scope-check.md`

---

## Verification of proposal premises against current source

I inspected the actual source code to verify each proposal's evidence claims before scoring.

### Confirmed premises

1. **`World.ts` command/service imports.** Verified: `World.ts` imports `DependencyService` from `@/services/DependencyService`, `Command` from `@/commands/Command`, `buildWorldInitialization` from `@/commands/factories/InitializationSequenceFactory`, `createActionGroup` from `@/domain/processTree/ActionGroup`, `AddProcessTreeActionGroupOp` from `@/commands/operations/processTree/AddProcessTreeActionGroupOp`, `PushSubprocessOp`/`PopSubprocessOp` from `@/commands/operations/processTree`, and `CommandStack` as a type import from `@/commands/CommandStack`. Both proposals describe these accurately.

2. **`world.initialize(commandStack)` call sites.** Verified: three active call sites in `App.vue` at lines 323, 384, and 439, plus one commented-out line at line 157. Both proposals correctly identify three active call sites.

3. **`App.vue` sign-out stale-reprovide.** Verified: `handleToolbarSignOut` at lines 778-780 does `world = new World(); provide('world', world); commandStack.clear();`. Both proposals correctly identify this as adjacent scope risk.

4. **`DependencyService` is only directly imported by `World.ts`.** Verified via grep: only `World.ts` has `import { DependencyService } from '@/services/DependencyService'`. All other consumers access it through `world.getDependencyService()`. This makes the move significantly simpler than both proposals suggest — it is a single-import relocation, not a broad import-update cascade.

5. **`Element2D.realize2D(world: World)` has 167 call sites.** Verified. Both proposals correctly treat this as a secondary concern. The direct proposal's deferral strategy is appropriate.

6. **Test files depend on `world.initialize(commandStack)`.** Verified: `worldInitialization.spec.ts` (~15 calls), `initializeWorldCommand.spec.ts` (2+ calls), `worldHelpers.ts` test helper (1 call in `createTestWorld()`), plus other tests. Both proposals mention updating tests, but neither provides a complete inventory.

### Discrepancies with proposal claims

1. **`DependencyService` move scope.** Both proposals describe the move as potentially broad ("may touch many command/tool files"). In reality, only `World.ts` imports `DependencyService` directly; all other access is through `world.getDependencyService()`. The risk is overestimated. This is a factual correction, not a blocking issue — the proposals are appropriately cautious.

---

## Criterion-by-criterion scoring

### Criterion 1: Does it advance the wave's target outcome?

**Wave 001 target outcome (from wave-plan.md):** "`World` becomes a domain-owned model root with no imports from commands, command stacks, application services, Vue, or persistence. Initialization orchestration lives outside the domain root in an application/use-case layer. Domain realization, descriptor registration, and visibility dependencies are expressed through narrow domain ports/contexts rather than the whole `World` object where practical within this wave."

**Proposal Direct — Score: STRONG PASS**

- Fully deletes `World.initialize(commandStack)` and removes all command/stack imports from `World.ts`.
- Creates an application initializer function at the correct dependency level.
- Moves `DependencyService` into the domain, removing the `@/services/` import.
- Makes `new World()` a pure domain construction with no command/application dependencies.
- Narrowly addresses `Element2D`/`styleService` context with appropriate deferral language.
- Meets all mandatory success criteria.

**Proposal Restructure — Score: PASS**

- Achieves the same core outcome as the direct proposal.
- Additionally moves world/stack construction out of `App.vue` into a `ProjectRuntime`, which is architecturally cleaner long-term.
- However, the runtime introduces an abstraction whose full lifecycle (reset, sign-out, load) cannot be completed in Wave 001 without entering Wave 009 scope. The proposal acknowledges this with a hard scope guard.
- The additional value is real but marginal for Wave 001's success criteria, while the additional risk is tangible.

### Criterion 2: Does it improve architecture and code quality?

**Proposal Direct — Score: GOOD**

- Clearly inverts the primary dependency inversion (domain→commands becomes commands→domain for initialization).
- Introduces a small, focused module at the application layer.
- Does not leave behind shims or compatibility wrappers (explicitly calls this out).
- Does not attempt to redesign adjacent concerns.

**Proposal Restructure — Score: GOOD (with caveats)**

- Same core inversion as direct, plus a cleaner ownership model for the world/stack pair.
- The `ProjectRuntime` interface is well-defined for Wave 001 scope (`world`, `commandStack`, `initializeWorld()`).
- However, the runtime is an incomplete abstraction: `App.vue` will still need to handle sign-out (world reassignment + reprovide), project load (clear + deserialize), and autosave, all of which operate on `world`/`commandStack` directly. The runtime doesn't simplify `App.vue` in any meaningful way for Wave 001 — it just wraps construction and initialization. The real architectural improvement for `App.vue` is deferred to Wave 009.
- The risk is that a half-used runtime becomes dead abstraction that gets in the way of the real Wave 009 shell extraction.

### Criterion 3: Does it respect the no-backcompat / aggressive-deletion priorities?

**Proposal Direct — Score: STRONG PASS**

- Explicitly lists all required DELETEs with specific file paths.
- Explicitly calls out no compatibility wrappers (`World.initialize = initializeWorld`).
- Proposes deleting stale commented-out initialization path.
- Proposes deleting tests that assert the old `World.initialize(...)` API.

**Proposal Restructure — Score: PASS**

- Same DELETE list for `World.initialize` and imports.
- Additionally deletes direct `new World()`/`new CommandStack()` from `App.vue`, replacing with runtime.
- Calls out deleting compatibility bridges.
- The additional deletion (removing direct construction from `App.vue`) is clean but adds implementation surface.

### Criterion 4: Does it avoid overfeaturism?

**Proposal Direct — Score: STRONG PASS**

- Minimal scope: one new file, modifications to `World.ts` and `App.vue`, move of `DependencyService`.
- Explicitly defers `Element2D`/`styleService` context cleanup when it risks broad churn.
- Does not introduce any new abstraction that isn't directly required by the wave.

**Proposal Restructure — Score: WARNING — TENDS TOWARD OVERFEATURISM**

- The `ProjectRuntime` abstraction is forward-looking and well-designed, but for Wave 001 it only replaces three lines of `App.vue` construction (`let world = new World(); provide('world', world); const commandStack = new CommandStack(); provide('commandStack', commandStack);`) with `const runtime = createProjectRuntime(); provide('world', runtime.world); provide('commandStack', runtime.commandStack);`. The net reduction in `App.vue` complexity is negligible.
- The proposal acknowledges the scope-creep risk and guards against it, but the guard relies on implementation discipline. The runtime is an architectural investment whose payoff comes in Wave 009 — it doesn't materially improve the current wave's outcome.
- The proposal's own comparison table shows the restructure has "Medium/high" risk of broadening into app shell versus "Low" for direct.

### Criterion 5: Does it introduce new risks or hidden regressions?

**Proposal Direct — Score: LOW RISK**

- Risks are well-identified and bounded: `DependencyService` move is actually simpler than stated (single importer); idempotency is unit-testable; `App.vue` sign-out is explicitly out of scope.
- The test update surface is larger than either proposal accounts for (see blocking issue B1 below).

**Proposal Restructure — Score: MEDIUM RISK**

- All the same risks as direct, plus:
  - The `ProjectRuntime`'s stability guarantees (no replacement of `world`/`commandStack` after provide) must be enforced, but `App.vue` currently replaces `world` on sign-out. The proposal correctly defers this, but the runtime API will be awkwardly incomplete — consumers can access `runtime.world` but that reference becomes stale on sign-out.
  - More files touched means more validation surface in a single cycle.
  - The runtime is a new architectural commitment that Wave 009 must either adopt or discard; if Wave 009 chooses a different composition model, the runtime becomes dead code.

### Criterion 6: Is the proposed validation sufficient?

**Proposal Direct — Score: ADEQUATE (with gaps)**

- Lists focused unit tests for the initializer, architecture boundary tests, and the full mandatory validation cadence.
- Missing: explicit plan for updating the 15+ test call sites in `worldInitialization.spec.ts`, `initializeWorldCommand.spec.ts`, and `worldHelpers.ts`. These tests currently call `world.initialize(commandStack)` directly and must be updated to use the new initializer. (See blocking issue B1.)
- Missing: explicit test for the `DependencyService` import path change (verifying no remaining `@/services/DependencyService` imports in domain).

**Proposal Restructure — Score: ADEQUATE (with same gaps)**

- Same validation plan structure, plus runtime-specific tests.
- Same missing inventory of test updates.
- Additional risk: runtime reference-stability tests are listed but the contract is incomplete for Wave 001.

---

## Blocking issues

### B1. Both proposals undercount the test update surface

**Severity:** BLOCKING (error)

**Description:** Neither proposal provides a complete inventory of test files that call `world.initialize(commandStack)`. Source inspection reveals:

- `frontend/tests/integration/worldInitialization.spec.ts` — ~15 calls across multiple test cases
- `frontend/tests/unit/commands/initializeWorldCommand.spec.ts` — 2+ calls
- `frontend/tests/helpers/worldHelpers.ts` — `createTestWorld()` helper used by many other tests
- `frontend/tests/e2e/active-plane-shortcuts.spec.ts` — references initialization
- `frontend/tests/unit/services/paperService.spec.ts` — references initialization

The `worldHelpers.ts` helper is especially important: `createTestWorld()` calls `world.initialize(commandStack)` and is used as a building block across the test suite. If the helper is not updated in the same implementation wave, many downstream tests will break. If it IS updated, its signature must change (it currently returns `{ world, commandStack }` and internally calls `world.initialize(commandStack)`; after the wave, it should call the new application initializer instead).

**Root cause:** Proposals focused on production code paths but did not audit the test code base thoroughly.

**Suggestion:** Both proposals must be corrected to include:
1. A complete inventory of test files calling `world.initialize(commandStack)`.
2. An explicit plan for updating `createTestWorld()` in `worldHelpers.ts`.
3. A commitment that all test updates happen in the same implementation wave (no broken test suite at any intermediate commit).

### B2. Proposal Restructure's `ProjectRuntime` has an incomplete lifecycle contract for Wave 001

**Severity:** BLOCKING for restructure proposal only (error)

**Description:** The restructure proposal introduces `ProjectRuntime` with `initializeWorld()` but explicitly excludes `resetForNewProject()`, `clearForLoad()`, and sign-out handling from Wave 001. This means `App.vue` will need to reach through the runtime to access `runtime.world` and `runtime.commandStack` directly for clear/reassign operations at lines 382-383, 428, 701-702, and 778-780. The runtime becomes a partial wrapper that doesn't actually simplify the most complex parts of `App.vue`'s world/stack interaction.

More critically, `App.vue` line 778 reassigns `world = new World()` and calls `provide('world', world)` again. Under the restructure proposal, this should instead use the runtime, but the runtime has no reset/recreate API. The implementation would either need to: (a) bypass the runtime for sign-out (defeating its purpose), or (b) add a minimal `recreate()` method to the runtime (expanding the API beyond what the proposal scoped).

**Root cause:** The runtime abstraction is designed for the Wave 009 target state but used in a Wave 001 context where most lifecycle operations are excluded from scope.

**Suggestion:** If the restructure proposal is chosen, it must explicitly address how sign-out and project-load-clear interact with the runtime in Wave 001. The cleanest resolution is to not introduce `ProjectRuntime` until Wave 009 when the full lifecycle can be designed together, which effectively means choosing the direct proposal for Wave 001.

---

## Non-blocking issues (warnings)

### W1. Both proposals should specify the `DependencyService` target location

**Severity:** WARNING

**Description:** Both proposals mention moving `DependencyService` to a domain path (e.g., `frontend/src/domain/dependencies/DependencyGraph.ts` or `frontend/src/domain/world/DependencyService.ts`) but leave the exact location to implementation. Since only `World.ts` imports `DependencyService` directly (verified), the move is straightforward. However, the proposals should specify whether: (a) the file is simply moved and renamed in-place, or (b) the class is also refactored to a domain concept (e.g., `DependencyGraph`). Option (a) is safe and bounded; option (b) risks expanding the wave scope.

**Suggestion:** Proposals should commit to option (a) — mechanical move and rename only — for Wave 001.

### W2. Neither proposal accounts for `CommandStack` constructor taking `World`

**Severity:** WARNING

**Description:** Looking at `worldHelpers.ts`, line 42: `const commandStack = new CommandStack(world)`. This suggests `CommandStack`'s constructor may take a `World` argument. The proposals don't mention this coupling. If `CommandStack` depends on `World`, the dependency direction from commands→domain is already established, and the initializer change preserves this direction. But it should be documented.

**Suggestion:** Implementation should verify the `CommandStack` constructor signature and ensure the new initializer does not inadvertently introduce a circular dependency.

### W3. The `styleService`/`Element2D` context change is correctly deferred but should be explicitly tracked

**Severity:** INFO

**Description:** Both proposals correctly defer broad `realize2D`/`resolveVisibility` signature changes given 167 call sites. The direct proposal's language "at least document the residual in implementation-log.md" is appropriate. The restructure proposal similarly defers. This is not an issue but a confirmation that the scoping is correct.

### W4. The `InitializationOps.ts` private casts are correctly deferred

**Severity:** INFO

**Description:** The scope check identifies `(world as any)` casts in `InitializationOps.ts` but correctly defers them to Wave 004. Neither proposal attempts to fix these, which is correct.

---

## Comparative assessment

| Criterion | Proposal Direct | Proposal Restructure |
|---|---|---|
| Target outcome advancement | STRONG PASS | PASS |
| Architecture/code quality | GOOD | GOOD (caveats) |
| No-backcompat/deletion | STRONG PASS | PASS |
| Avoids overfeaturism | STRONG PASS | WARNING |
| New risks/regressions | LOW | MEDIUM |
| Validation sufficiency | ADEQUATE (gaps) | ADEQUATE (gaps) |

**Preferred proposal:** Proposal Direct, provided blocking issue B1 is resolved.

**Rationale:** The direct proposal achieves the wave's target outcome with minimal risk and no overfeaturism. The restructure proposal's `ProjectRuntime` is a good idea whose time has not yet come — it belongs in Wave 009 when the full app-shell lifecycle can be designed. Introducing it in Wave 001 creates an awkward partial abstraction that doesn't handle sign-out, project load, or autosave, and whose real payoff is deferred to a later wave anyway.

---

## Verdict: BLOCKING ISSUES

Two blocking issues must be resolved before implementation:

1. **B1** — Both proposals must provide a complete test-file inventory and explicit update plan for `world.initialize(commandStack)` test call sites, including the central `worldHelpers.ts` helper.
2. **B2** — The restructure proposal must resolve the `ProjectRuntime` lifecycle incompleteness, or the proposal should be rejected in favor of the direct proposal for Wave 001.

**Recommended path to resolution:**
- Edit the direct proposal in-place to add the test inventory and update plan (B1).
- For B2: either (a) the restructure proposal adds explicit Wave 001 handling for sign-out/load via the runtime, or (b) the restructure proposal is declined for Wave 001 with the `ProjectRuntime` concept recorded as a Wave 009 input.

After B1 is addressed for the direct proposal (or both), the review can advance with no further blockers.
