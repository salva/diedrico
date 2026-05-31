# Wave 009 Review Round 02 — App shell services

## Reviewed artifacts

- `architecture-audit/cycle-009-app-shell-services/reviews/round-01-review.md`
- `architecture-audit/cycle-009-app-shell-services/corrections-round-01-note.md`
- `architecture-audit/cycle-009-app-shell-services/proposals/proposal-direct.md`
- `architecture-audit/cycle-009-app-shell-services/proposals/proposal-restructure.md`
- Workspace status check (`git status`) to confirm no application source changes were made during this review stage

## Round-01 blocker disposition

### Blocker 1 — Single-owner keyboard routing
**Status:** Resolved

**Evidence:**
- `proposal-direct.md` now adds `Required ownership constraints from round-01 review` requiring exactly one authoritative `AppKeyboardRouter`, explicitly deleting any `Toolbar.vue` parallel keydown handler, switch, shortcut registry, watcher, or fallback shortcut interpretation.
- `proposal-restructure.md` now adds the equivalent `KeyboardShortcutRouter` single-owner requirement and explicitly limits `Toolbar.vue` to render/click behavior plus passive metadata.
- Both proposals now expand validation to include focused `Toolbar.vue` tests plus static scans proving no `keydown` listener, shortcut switch, or shortcut registry remains in `Toolbar.vue`, and that exactly one app-shell keyboard router module owns global shortcut interpretation.
- `corrections-round-01-note.md` accurately records these edits and the scope justification for including the narrow `Toolbar.vue` deletion in Wave 009.

**Assessment:**
The proposals are now concrete enough to prevent residual duplicate keyboard ownership. The single-owner constraint is explicit, testable, and appropriately scoped.

### Blocker 2 — Listener/subscription lifecycle and stable-instance ownership
**Status:** Resolved

**Evidence:**
- `proposal-direct.md` now adds `Install/start and dispose/stop contract` with named ownership for keyboard listener lifecycle, autosave polling/debounce/status timers, active-plane world subscription, project-session lifecycle/reset behavior, StartupDialog file-list handling, and selection watcher cleanup.
- `proposal-restructure.md` now adds `Runtime install/start and dispose/stop contract` making `AppShellRuntime.start()` / `dispose()` the shell lifecycle owner and spelling out cleanup expectations for keyboard routing, autosave, world subscriptions, project/session/auth/storage flows, StartupDialog request state, and selection watchers.
- Both proposals now add disposal-focused validation proving listener removal, timer cleanup, world unsubscribe, watcher cleanup, and startup-dialog request cleanup.
- `proposal-restructure.md` still directly addresses the stable-instance hazard called out in round 01 by explicitly deleting the `world = new World(); provide('world', world)` replacement path.

**Assessment:**
Lifecycle/disposal ownership is now explicit enough for implementation. The runtime/shell boundary is concrete about who starts, stops, and disposes long-lived browser and domain hooks.

## Updated scoring against the six required criteria

The round-01 comparative scoring still broadly holds; the changes in this round mainly remove the prior blockers.

### Proposal Direct — updated disposition
1. **Advances target outcome:** Pass
2. **Improves architecture/code quality:** Pass
3. **Respects no-backcompat/aggressive deletion:** Pass
4. **Avoids overfeaturism:** Pass
5. **Introduces new risks/hidden regressions:** Acceptable residual risk only
6. **Validation sufficiency:** Pass

### Proposal Restructure — updated disposition
1. **Advances target outcome:** Strong pass
2. **Improves architecture/code quality:** Strong pass
3. **Respects no-backcompat/aggressive deletion:** Pass
4. **Avoids overfeaturism:** Pass
5. **Introduces new risks/hidden regressions:** Acceptable residual risk only
6. **Validation sufficiency:** Pass

## Keyboard-router and lifecycle sufficiency check

The review objective for round 02 specifically required verifying that keyboard-router ownership and lifecycle/disposal ownership are concrete enough for implementation.

**Result:** Yes.

- The corrected proposals now specify exactly one authoritative app-shell keyboard interpreter/registry.
- They explicitly delete `Toolbar.vue`'s competing global keyboard ownership rather than merely removing one listener call while preserving shadow shortcut logic.
- They define start/install and stop/dispose responsibilities for the browser listeners, autosave timers, active-plane world subscription, startup-dialog request flow, and selection/watcher cleanup.
- The validation plans now contain targeted tests and static scans that can falsify violations of those constraints.

## Recommended proposal for decision

**Recommended:** `architecture-audit/cycle-009-app-shell-services/proposals/proposal-restructure.md`

**Reason:**
It remains the stronger architectural fit because it fixes both the `App.vue` file-size/orchestration problem and the deeper runtime lifetime/DI problem. The round-02 corrections remove the prior ambiguity about keyboard ownership and cleanup semantics without pushing the proposal into unrelated toolbar or backend scope.

## Accepted residual risks

- The restructure path is broader than the direct extraction path and will require disciplined implementation to avoid accidental spread into unrelated toolbar/controller redesign.
- Existing known validation instability in the repository may still complicate attribution of failures; the implementation stage must rely on the focused app-shell tests and static boundary scans promised here, in addition to the mandatory full validation cadence.
- `StartupDialog` and component-ref adaptation remain a change-sensitive area; implementation must keep the runtime free of direct component-instance coupling.

## Decision for round 02

**NO BLOCKING ISSUES**

The round-01 blockers were substantively resolved in both corrected proposals, and the proposal set can proceed to decision. Prefer the restructure proposal for convergence and implementation.

## Review integrity notes

- This review checked only proposal/review artifacts and workspace status.
- No frontend/backend/specs application source files were modified during this review.
