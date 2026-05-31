# Cycle 023 Review Round 01 — Runtime-session consumer ports and command-history boundary

**Result: BLOCKING ISSUES**

## Scope and source-control verification

- Reviewed `scope-check.md`, both proposals, the synthesized scout-stage review, `wave-plan.md`, and current source for `RuntimeSession`, `AppShellRuntime`, `ActivePlaneUseCases`, `KeyboardShortcutRouter`, `SelectionUseCases`, `SelectionDeletionCommandService`, `ProjectSessionPersistenceAdapter`, `ToolbarHistoryUseCases`, `ToolbarHistoryController`, and `Toolbar.vue`.
- Scoped git status confirms adjacent dirty state in `frontend/src/commands/**` and the new Cycle 023 review directory. No implementation for this wave has occurred yet.
- Source-control boundary is acceptable for review, but implementation must stay path-scoped and must not absorb unrelated `frontend/src/commands/**` changes.
- Protected out-of-scope surfaces remain unreviewed by content: no backend, docs/spec source, package/tooling, auth/config secrets, broad canvas/tool/rendering, persistence schema/replay, or command-kernel redesign was required for this review.

## Proposal scoring

### Proposal Direct — `proposals/proposal-direct.md`

1. **Advances wave target outcome** — **Pass**
   - Matches the scoped wave goal closely: remove raw app-shell `World`/`CommandStack` consumer seams in `RuntimeSession`, `AppShellRuntime`, `ActivePlaneUseCases`, `SelectionUseCases`, and `KeyboardShortcutRouter`.
   - Evidence: current raw accessors and consumer wiring exist in `frontend/src/application/appShell/RuntimeSession.ts:20-34` and `frontend/src/application/appShell/AppShellRuntime.ts:17-18,39-41,68-69`.

2. **Improves architecture and code quality** — **Pass with caveat**
   - Narrow consumer ports are the right architectural direction for `ActivePlaneUseCases`, `SelectionUseCases`, and `KeyboardShortcutRouter`, which each use only a small subset of `World`/`CommandStack` behavior.
   - Evidence: `ActivePlaneUseCases.ts:12-54`, `SelectionUseCases.ts:10-59`, `KeyboardShortcutRouter.ts:17-18,97-100`.
   - Caveat: the proposal currently underspecifies how app-shell command-history cleanup relates to the already-existing toolbar history consumer.

3. **Respects no-backcompat / aggressive deletion priorities** — **Pass**
   - Explicitly deletes raw accessors and direct concrete imports rather than preserving both paths.

4. **Avoids overfeaturism** — **Pass**
   - Stays bounded to current seams and keeps `worldForView()` deferred as an explicit rendering seam.

5. **Risks / hidden regressions** — **Warning**
   - Main risk is incomplete boundary cleanup if command-history is narrowed only for keyboard shortcuts while toolbar history keeps a parallel raw `CommandStack` path.

6. **Validation sufficiency** — **Partial / blocker pending correction**
   - Good overall cadence, but it does not explicitly require coverage for toolbar undo/redo if the command-history seam is touched, and it does not require a decision on whether toolbar history is in or out for this wave.

### Proposal Restructure — `proposals/proposal-restructure.md`

1. **Advances wave target outcome** — **Pass**
   - Also addresses the wave goal and creates a more durable future seam.

2. **Improves architecture and code quality** — **Mixed**
   - Potentially cleaner long-term than adding several methods directly to `RuntimeSession`.
   - But the new aggregate capability layer risks becoming a new central god-boundary if it merely re-groups unrelated interfaces without reducing coupling.

3. **Respects no-backcompat / aggressive deletion priorities** — **Pass**
   - Deletes raw paths rather than preserving compatibility shims.

4. **Avoids overfeaturism** — **Borderline**
   - More abstraction than the direct proposal for the same immediate outcome. That may be justified later, but current evidence does not yet prove this wave needs a new aggregate module.

5. **Risks / hidden regressions** — **Warning**
   - Higher abstraction churn, plus the same unresolved toolbar-history scope issue.

6. **Validation sufficiency** — **Partial / blocker pending correction**
   - Same validation gap as the direct proposal regarding toolbar history and explicit boundary assertions.

## Preferred direction

**Preferred after correction: Proposal Direct.**

Reason: current source evidence supports a narrow in-place cleanup first. The restructure path is plausible, but on present evidence it adds architectural surface before proving that a grouped capability aggregate is necessary for this cycle.

## Blocking issues

### 1. Command-history boundary scope is incomplete unless the proposals explicitly resolve toolbar history.

Wave 023 is named partly around the command-history boundary, but the current proposals center keyboard history while only mentioning toolbar history as an optional or implementation-time discovery. Current source shows toolbar undo/redo is already a direct `CommandStack` consumer outside the app-shell session boundary:

- `frontend/src/application/toolbar/ToolbarHistoryUseCases.ts:1-48`
- `frontend/src/application/toolbar/ToolbarHistoryController.ts:1-20,26-37`
- `frontend/src/components/toolbars/Toolbar.vue:129,164`

If implementation narrows `RuntimeSession.commandStackForShortcuts()` only for `KeyboardShortcutRouter`, the app still retains a parallel raw command-history path in toolbar wiring. That leaves the wave's stated command-history boundary partially unresolved and weakens the DELETE list.

**Required correction:** edit both proposals in place to make an explicit reviewed decision:
- either include toolbar history in the same command-history port migration, with bounded file list and validation;
- or explicitly defer it with a concrete rationale tied to wave stop conditions and revise wording so this wave is clearly limited to app-shell command-history consumers only.

The stronger option, based on current evidence, is to include toolbar history if it can consume the same narrow `CommandHistoryPort` without broader UI composition changes.

### 2. Persistence-handle cast removal is presented too optimistically and needs a firmer bounded decision.

Both proposals include typed persistence-handle cleanup, but current source shows `ProjectSessionPersistenceAdapter` still needs concrete runtime objects for `ProjectService.serializeCommands` and `deserializeCommands`:

- `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts:1-23`
- `frontend/src/application/appShell/RuntimeSession.ts:5-12,67-78`

A typed handle can remove unsafe casts, but only if it does not simply move the same concrete knowledge into a wider consumer-facing boundary module. The proposals currently leave that choice too open.

**Required correction:** update proposals to state one of these explicitly:
- include cast removal only as an adapter-local/internal typed-handle cleanup that does **not** expose `World`/`CommandStack` through general consumer-facing interfaces; or
- defer persistence-handle cleanup from Cycle 023 entirely if clean removal would broaden app-shell contracts or blur the persistence boundary.

## Non-blocking observations

- `worldForView()` remains a legitimate deferred rendering seam for this wave. Current `SvgCanvas`/provide-inject `World` usage is broad enough that it should remain out of scope unless a separate reviewed plan edit broadens the wave.
- `ActivePlaneUseCases`, `SelectionUseCases`, and `KeyboardShortcutRouter` are well-justified targets for narrow ports.
- Existing tests already cover much of the current behavior, but implementation should update boundary assertions to reflect the final scoped decision on toolbar history.

## Recommendation

Do **not** advance to `cycle-023-decision` yet.
Proceed to **corrections-round-01**, editing the proposals in place to resolve the two blocking issues above. After correction, rerun review with the direct proposal as the likely preferred path unless the revised restructure proposal demonstrates clear additional value without broadening scope.
