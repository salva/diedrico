# Cycle 023 Review Round 01 Follow-up — Corrected proposals

**Result: NO BLOCKING ISSUES**

## Focus of this follow-up

This re-review checked only the two prior blockers plus any new blocker introduced by the edits:

1. whether toolbar undo/redo is now explicitly resolved as part of the narrowed command-history boundary;
2. whether persistence-handle cleanup is now tightly bounded to adapter-local/internal typed handles with explicit stop conditions against persistence-contract redesign.

## Recheck of prior blocking issues

### 1. Toolbar-history command-history scope — RESOLVED

Both corrected proposals now explicitly include toolbar history as an in-scope bounded consumer of the same command-history port used by keyboard shortcuts.

Evidence in `proposal-direct.md`:
- target outcome now names a shared command-history port for keyboard shortcuts and toolbar undo/redo;
- `RuntimeSession.commandHistoryPort()` is defined for every app-shell command-history consumer in this wave;
- explicit file list includes `frontend/src/application/toolbar/ToolbarHistoryUseCases.ts`, `frontend/src/application/toolbar/ToolbarHistoryController.ts`, and `frontend/src/components/toolbars/Toolbar.vue` only for command-history dependency replacement;
- DELETE list removes direct `CommandStack` imports/constructor expectations from toolbar history;
- validation explicitly covers toolbar undo/redo and absence of raw `CommandStack` paths.

Evidence in `proposal-restructure.md`:
- summary/target outcome now state toolbar history is included rather than deferred;
- `RuntimeCapabilities.ts` defines a shared `CommandHistoryPort` for keyboard shortcuts and toolbar history;
- file list and DELETE list explicitly migrate toolbar history onto that port;
- stop conditions forbid broader toolbar/UI composition changes.

This resolves the earlier ambiguity. The proposals now make a reviewed decision instead of leaving toolbar history as optional implementation-time discovery.

### 2. Persistence-handle boundedness — RESOLVED

Both corrected proposals now constrain persistence-handle cleanup to adapter-local/internal typed handles and explicitly forbid broadening into persistence-contract redesign.

Evidence in `proposal-direct.md`:
- target outcome and `RuntimeSession` / `AppShellPorts` sections state typed persistence runtime handles are adapter-local and not general consumer-facing `World` / `CommandStack` exposure;
- `ProjectSessionPersistenceAdapter.ts` section permits typed handles only as persistence-adapter handles and explicitly says to defer the slice if clean removal would require changing `ProjectService`, serialization, replay, schema, descriptors, registry, or migrations;
- stop conditions repeat those boundaries.

Evidence in `proposal-restructure.md`:
- target outcome states persistence handles are adapter-local/schema-neutral, not general capabilities;
- `RuntimeCapabilities.ts` and `ProjectSessionPersistenceAdapter.ts` sections forbid exporting adapter-private handles as a convenient runtime facade;
- stop conditions explicitly reject `ProjectService`, schema/replay, descriptor/registry, or migration changes.

This resolves the earlier risk that typed handles might become a back door for concrete runtime exposure or a disguised persistence redesign.

## Check for new blockers introduced by the edits

No new blocking scope broadening was introduced.

- Toolbar inclusion is bounded to command-history dependency replacement only; both proposals explicitly forbid broader toolbar composition redesign.
- The direct proposal remains the lower-risk choice for this cycle because it removes the known seams with less new architectural surface.
- The restructure proposal is still viable, but its added abstraction remains a trade-off rather than a blocker.

## Source-control / scope hygiene recheck

- Scoped status still shows unrelated dirty files under `frontend/src/commands/**` and `frontend/src/components/toolbars/MainToolbar.vue`, plus the review directory. These remain adjacent noise and should not be absorbed by Cycle 023 implementation unless a separately reviewed scope change justifies it.
- No production implementation occurred as part of this follow-up review.
- Backend, docs/spec, package/tooling, broad canvas/tool/rendering, persistence schema/replay, and command-kernel redesign remain explicitly out of scope.

## Recommendation

Proceed to **`cycle-023-decision`**.

Preferred option: **Proposal Direct**.

Reason: after correction it fully addresses the reviewed blockers while staying closer to the bounded wave goal and avoiding the restructure proposal's extra risk of creating an unnecessary aggregate capability layer.
