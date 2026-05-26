# Wave 009 Corrections Round 01 Note

## Source review

Corrections were made in response to `architecture-audit/cycle-009-app-shell-services/reviews/round-01-review.md`. No application source files were modified.

## Blocker 1 — Single-owner keyboard routing

**Review finding:** Both proposals needed tighter wording to prevent residual duplicate keyboard ownership, especially in `Toolbar.vue`, which currently owns Escape, D projection toggle, and tool-family shortcuts.

**Edits made:**

- `proposals/proposal-direct.md`
  - Added `Required ownership constraints from round-01 review`, requiring exactly one authoritative `AppKeyboardRouter` and forbidding `Toolbar.vue` from retaining a parallel keydown handler, switch statement, shortcut registry, watcher, or fallback shortcut interpretation.
  - Expanded `Files to change` / `AppKeyboardRouter` to require an install/disposer contract and singleton/idempotent listener behavior.
  - Expanded `Validation plan` to require Toolbar component tests and static scans proving no `keydown` listener, local global shortcut handler, shortcut switch, or shortcut registry remains in `Toolbar.vue`, and that exactly one app-shell keyboard router module owns global shortcut interpretation.
- `proposals/proposal-restructure.md`
  - Added `Required ownership constraints from round-01 review`, requiring exactly one authoritative `KeyboardShortcutRouter` and limiting `Toolbar.vue` to render/click behavior plus passive metadata only.
  - Expanded `Files to change` / `KeyboardShortcutRouter` and implementation step 6 to require install/dispose semantics and to delete Toolbar keydown listener/switch/registry behavior.
  - Expanded `Validation plan` with focused Toolbar tests and static scans proving no duplicate shortcut handling remains outside the app-shell runtime router.

**Scope justification added:** Both proposals now state that removing `Toolbar.vue` keyboard ownership is Wave 009 work because app-shell keyboard extraction requires one global keyboard owner, while broader toolbar/controller redesign remains out of scope and is not Wave 006b or Wave 010 work.

## Blocker 2 — Listener/subscription lifecycle and stable-instance ownership

**Review finding:** The proposals mentioned cleanup generally but did not explicitly require install/start and dispose/stop responsibilities for keyboard routing, autosave timers, world subscriptions, startup-dialog file-list handling, and other shell listeners/subscriptions/timers.

**Edits made:**

- `proposals/proposal-direct.md`
  - Added `Install/start and dispose/stop contract`, specifying lifecycle ownership for `AppKeyboardRouter`, `AutoSaveController`, `ActivePlaneController`, `ProjectSessionController`, StartupDialog file-list handling, and selection cascade watchers.
  - Expanded validation to require disposal tests for keyboard listener removal, autosave polling/debounce/status timer cleanup, active-plane world unsubscribe, selection watcher cleanup, and StartupDialog file-list cleanup on unmount or shell replacement.
- `proposals/proposal-restructure.md`
  - Added `Runtime install/start and dispose/stop contract`, specifying `AppShellRuntime.start()`/`dispose()` ownership and child lifecycle responsibilities for keyboard routing, autosave, active-plane/world subscription, project/session storage/auth handling, StartupDialog file-list state, and selection/cascade watchers.
  - Expanded validation to require lifecycle/disposal tests proving runtime disposal removes listeners, clears timers, unsubscribes world listeners, stops selection watchers, and disposes/resets startup-dialog file-list request state.

## Ready for review round 02

The corrected proposals now contain concrete implementation constraints for single-owner keyboard routing and explicit lifecycle/disposal ownership. They also include focused tests and static scans for duplicate shortcut handling, Toolbar shortcut deletion, autosave timer cleanup, world subscription cleanup, selection watcher cleanup, and startup-dialog file-list lifecycle cleanup.
