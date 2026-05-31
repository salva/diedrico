# Round 01 Review — Wave 006b Panel/toolbar command-intent cleanup

**Stage:** `cycle-006b-review-round-01`  
**Reviewer task:** `t1-review-wave-006b-proposals`  
**Scope reviewed:** `architecture-audit/cycle-006b-panel-toolbar-command-intents/scope-check.md`, `proposal-direct.md`, `proposal-restructure.md`, and the Wave 006b entry in `architecture-audit/wave-plan.md`.

## Scope and evidence check

- The Wave 006b wave-plan entry still matches the current tree: `ActionsPanel.vue` and `Toolbar.vue` remain the residual UI command-construction leaks after Wave 006a, and the canvas/tool controller path must stay out of scope except for interface reuse or compile fallout.
- `ActionsPanel.vue` still directly imports `Command` plus concrete process-tree operations and assembles commands in component handlers.
- `Toolbar.vue` still directly imports `CommandStack`, `Command`, `Vector3`, and concrete world operations for undo/redo handling and the Alt+E example setup.
- The review explicitly checked the requested hotspots: toolbar undo/redo typed-intent handling, Alt+E deletion/retention rationale, ActionsPanel direct process operation imports, and noisy panel logging.

## Proposal scoring

### Proposal Direct

1. **Advances target outcome:** **Pass**  
   It cleanly moves process-history mutations and toolbar history/example behavior behind application-owned use-cases/controllers while keeping the completed 006a canvas/tool boundary out of scope.

2. **Improves architecture and code quality:** **Pass**  
   It removes direct `Command`/operation imports from both UI components, explicitly moves `CommandStack` undo/redo execution out of `Toolbar.vue`, and calls for deletion of routine `ActionsPanel.vue` logging.

3. **Respects no-backcompat / aggressive deletion priorities:** **Pass**  
   It correctly prefers deleting Alt+E if it is only a testing/debug shortcut and calls for deleting component command-assembly methods, obsolete command-internals tests, compatibility shims, and direct operation imports.

4. **Avoids overfeaturism:** **Pass**  
   The proposal stays focused on the two residual UI-chrome leaks rather than expanding into full App-shell extraction.

5. **Introduced risks / hidden regressions:** **Manageable**  
   The identified refresh/subscription risks are real, especially `ActionsPanel.vue` reactivity around `stackVersion` and toolbar `canUndo/canRedo` updates. The proposal acknowledges them and keeps mitigation local.

6. **Validation sufficiency:** **Pass**  
   The validation plan is appropriately specific: static architecture checks, focused use-case/controller/component coverage, full mandatory cadence, e2e/Playwright, and preview refresh.

### Proposal Restructure

1. **Advances target outcome:** **Pass**  
   It would solve the same leaks and further thin the UI components.

2. **Improves architecture and code quality:** **Conditional pass**  
   The controller boundary is attractive, but the broader `UiChromeController` risks becoming a new aggregation point instead of a cleanly factored set of small use-cases.

3. **Respects no-backcompat / aggressive deletion priorities:** **Pass**  
   It also deletes direct component command internals and supports deleting Alt+E.

4. **Avoids overfeaturism:** **Mixed**  
   This is the main weakness. The proposal itself admits overlap risk with Wave 009. Without strict caps, it can drift from command-intent cleanup into partial App-shell extraction.

5. **Introduced risks / hidden regressions:** **Higher than direct**  
   The risk of an oversized `UiChromeController`, extra composition churn, and reactivity drift is materially higher than Proposal Direct.

6. **Validation sufficiency:** **Pass**  
   The coverage plan is sufficient if this broader scope is selected.

## Required checks against acceptance criteria

- **Wave-plan citation:** satisfied; both proposals align with the current Wave 006b entry in `architecture-audit/wave-plan.md`.
- **006a scope guard:** satisfied; both proposals say the `SvgCanvas.vue` / `frontend/src/tools/**` controller path stays out of 006b scope except for reuse/fallout.
- **Toolbar undo/redo handling:** Proposal Direct now correctly treats typed intent/application-controller ownership for undo/redo as mandatory 006b scope rather than deferring it.
- **Toolbar Alt+E rationale:** Proposal Direct applies the project priority correctly by preferring deletion because the shortcut is labeled “for testing”; retention is allowed only if explicitly justified as user-facing behavior and moved into an application use-case.
- **ActionsPanel direct process operation imports:** both proposals remove them; Proposal Direct does so with less architectural spillover.
- **Noisy panel logging:** Proposal Direct explicitly removes routine logs in mount/subscription/update paths.
- **Aggressive deletion:** Proposal Direct is explicit about deleting direct operation imports, component assembly methods, obsolete command-internals tests, debug/example surfaces, and compatibility shims.

## Recommendation

**NO BLOCKING ISSUES.**

**Preferred implementation path: Proposal Direct.** It best matches Wave 006b’s target outcome with the smallest clean architectural move:

- move `ActionsPanel.vue` process-history mutations behind focused process-history application use-cases/controllers;
- move `Toolbar.vue` undo/redo read/actions behind typed toolbar-history application use-cases/controllers;
- delete Alt+E unless implementation produces a concrete user-facing reason to retain it;
- remove routine `ActionsPanel.vue` logging;
- do not reopen the 006a canvas/tool path.

**Proposal Restructure** is acceptable only if the decision artifact explicitly caps it to process-history intents, toolbar undo/redo intents, and the Alt+E decision. Otherwise it risks bleeding into Wave 009.
