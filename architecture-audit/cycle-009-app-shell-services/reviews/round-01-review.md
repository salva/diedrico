# Wave 009 Review Round 01 — App shell services

## Reviewed artifacts

- `architecture-audit/cycle-009-app-shell-services/scope-check.md`
- `architecture-audit/cycle-009-app-shell-services/proposals/proposal-direct.md`
- `architecture-audit/cycle-009-app-shell-services/proposals/proposal-restructure.md`
- `architecture-audit/wave-plan.md`
- `frontend/src/App.vue`
- `frontend/src/components/toolbars/Toolbar.vue`

## Scope-check confirmation

The scope check is evidence-based and correctly identifies the remaining `App.vue` shell problems: mixed layout + lifecycle orchestration, duplicated global keyboard ownership, untyped `window` bridges, stale-provide risk on sign-out, and the `StartupDialog` custom-event bridge. It also correctly treats `Toolbar.vue` keyboard ownership as part of Wave 009 only insofar as Wave 009 needs a **single** app-level keyboard owner, not a broader toolbar architecture rewrite.

## Proposal scoring against the six criteria

### Proposal Direct — `proposals/proposal-direct.md`

1. **Advances target outcome:** **Pass**
   - It would materially reduce `App.vue` by extracting project session, autosave, selection, active-plane, and keyboard concerns while preserving the intended shell role.
2. **Improves architecture/code quality:** **Pass with caution**
   - The extracted controllers improve separation, but the proposal still leaves some ambiguity about who owns the long-lived runtime objects and subscription cleanup.
3. **Respects no-backcompat/aggressive deletion:** **Pass**
   - Good delete list: duplicate keyboard listener, `window as any.__autoSaveInterval`, custom-event bridge, debug logging, inline shell orchestration.
4. **Avoids overfeaturism:** **Pass**
   - It is relatively bounded and does not reopen Drive internals or persistence-contract decisions.
5. **New risks/hidden regressions:** **Concern**
   - The plan is directionally correct but under-specifies how the single keyboard owner will prevent collisions with toolbar-local click behavior and how global listeners/subscriptions are disposed without leaving shell/controller duplication.
6. **Validation sufficiency:** **Pass with blocker noted below**
   - The focused test list is strong, but it needs an explicit static/boundary check that exactly one global keyboard listener owner remains and that no parallel shortcut registry survives in `Toolbar.vue`.

### Proposal Restructure — `proposals/proposal-restructure.md`

1. **Advances target outcome:** **Strong pass**
   - It best matches the deeper issue documented in `App.vue`: the component is both DI root and application coordinator.
2. **Improves architecture/code quality:** **Strong pass**
   - Stable runtime ownership directly addresses the stale-provide/sign-out hazard in `frontend/src/App.vue:428-430` and `frontend/src/App.vue:779-782`.
3. **Respects no-backcompat/aggressive deletion:** **Pass**
   - It explicitly deletes the world-replacement path, duplicate keyboard/listener paths, custom-event bridge, debug logging, and inline shell methods.
4. **Avoids overfeaturism:** **Pass with caution**
   - It is larger than Direct, but still justified because the runtime-boundary problem is already present in the current code and is central to this wave.
5. **New risks/hidden regressions:** **Concern**
   - The proposal still needs tighter wording on keyboard/tool ownership boundaries so Wave 009 does not accidentally absorb unrelated toolbar/controller redesign work.
6. **Validation sufficiency:** **Pass with blocker noted below**
   - Better than Direct on stable-instance testing and shell-boundary scans, but still needs explicit proof that the single keyboard owner covers current Toolbar shortcuts without leaving local fallback logic behind.

## Keyboard ownership and Toolbar scope assessment

The corrected Wave 009 premise is valid: keyboard ownership is currently ambiguous because `App.vue` registers a global `keydown` listener (`frontend/src/App.vue`) while `Toolbar.vue` also registers its own global `keydown` listener for Escape, `D`, and tool shortcuts (`frontend/src/components/toolbars/Toolbar.vue`). Wave 009 **must** resolve this to one owner.

Including `Toolbar.vue` in Wave 009 is justified **only** to the narrow extent required to:

- delete its competing global keyboard listener,
- move Escape / projection-toggle / tool-family shortcuts into the single app keyboard router/runtime, and
- keep toolbar rendering/click behavior intact.

That is not Wave 006b or Wave 010 scope creep. It is a direct consequence of extracting shell keyboard routing from `App.vue`. However, Wave 009 should not use this as a pretext to redesign broader toolbar command/controller concerns unrelated to global shortcut ownership.

## Recommendation

**Recommended direction:** `proposal-restructure.md`

Reason: it fixes the deeper lifecycle/DI issue, not just file size. The stable-runtime approach is the cleanest way to prevent re-provide/stale-reference bugs while also extracting autosave, project session, selection, and keyboard routing.

## BLOCKING ISSUES

1. **Single-owner keyboard routing is not specified tightly enough to prevent residual duplicate ownership.**
   - Both proposals say the app-shell router/runtime becomes the single owner, but neither proposal explicitly requires deletion of any remaining toolbar-local shortcut registry/handler logic beyond the current `window.addEventListener` calls. Because `Toolbar.vue` currently owns Escape, `D`, and tool-family shortcuts, the corrected proposal must state that keyboard interpretation lives in exactly one app-shell module and that `Toolbar.vue` keeps only click/render metadata, not active shortcut decision logic.
   - Required correction: edit the recommended proposal in place to state that Wave 009 leaves **one** authoritative shortcut interpreter/registry, deletes all component-local global shortcut handlers, and adds a validation check proving no parallel keydown handler/shortcut switch remains in `Toolbar.vue`.

2. **Listener/subscription lifecycle and stable-instance ownership are under-specified for the extracted shell boundary.**
   - The current code has multiple global/browser hooks and world subscriptions (`App.vue` world subscription, global keydown listener, custom `load-files` listener, autosave polling interval/timeouts). The proposals mention cleanup generally, but they should explicitly require a disposal contract for runtime/controllers so the wave cannot land with moved-but-still-leaky listeners/timers/subscriptions.
   - Required correction: edit the recommended proposal in place to define explicit install/start and dispose/stop responsibilities for keyboard routing, autosave polling/debounce, world subscriptions, and startup-dialog file-list request handling.

## Non-blocking observations

- Both proposals correctly reject reopening Drive internals and persistence-contract backcompat work.
- Both proposals correctly call for deleting environment dump logging from `App.vue`, which is especially important given the current `import.meta.env` logging.
- Proposal Direct is viable if resized after the blocking clarifications, but Restructure remains the stronger architectural fit.

## Decision for round 01

**BLOCKING ISSUES**

Proceed with in-place correction of the recommended `proposal-restructure.md` (or an equivalently corrected direct proposal) before implementation/decision. No implementation should start from the current proposal wording.

## Review integrity notes

- This stage reviewed proposal and source artifacts only.
- No application source files were modified during review.
