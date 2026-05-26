# Delta Artifact — Broken Hinge-Line Command Storage Hook

**Stage:** `cycle-015-projection-world-split-implementation`  
**Task:** `t3-correct-review-blockers`  
**Status:** minimal delta for follow-up review; no additional source edits in this artifact.

## Why this delta exists

Reviewer `t2-review-stage` correctly identified that the retained `t1b` correction touched `frontend/src/commands/operations/world/AddBrokenHingeLineOp.ts`, which was not listed in the original projection/world split implementation file set. The change was introduced while removing forbidden broad casts in the broken hinge-line lane.

This artifact makes that scope expansion explicit for follow-up review instead of silently keeping it as an undocumented exception.

## Source delta to authorize or reject

Retain the already-applied narrow command/storage change:

- `frontend/src/commands/operations/world/AddBrokenHingeLineOp.ts`
  - constructs `BrokenHalfHingeLine2D` with the authoritative `BrokenHingeLine.id` string instead of relying on object-shaped parent references;
  - stores/removes the constructed `BrokenHingeLine` through named `World` storage hooks;
  - no longer writes or deletes `World.hingeLines` via `(world as any)`.
- `frontend/src/domain/world/World.ts`
  - exposes `addHingeLineEntity(hingeLine: HingeLine): void` and `removeHingeLine(id: string): void` as narrow storage hooks for command operations that already own specialized hinge-line entity construction.

Related in-scope projection/world changes that made the command delta necessary:

- `frontend/src/domain/world/HingeLine.ts`
  - `HalfHingeLine2D` stores the parent hinge-line id directly; `clone()` no longer fabricates a partial `HingeLine` object.
- `frontend/src/domain/world/elements/BrokenHalfHingeLine2D.ts`
  - `BrokenHalfHingeLine2D` stores the parent broken hinge-line id directly; `clone()` no longer fabricates a partial `BrokenHingeLine` object.

## Architectural rationale

Reverting only the command/storage portion would restore the exact forbidden pattern the correction removed: command-layer private storage mutation through broad casts such as `(world as any).hingeLines`. Keeping the fix inside only the originally listed projection/world element files is not honest because the command operation is the owner of broken-hinge-line creation and undo storage.

The retained delta is narrow:

- it does not introduce a pseudo-`World` context or structural compatibility shim;
- it does not expose the `hingeLines` map;
- it does not add tooling suppressions, `as any`, `as unknown as`, context-to-`World` casts, compatibility overloads, or alternate build paths;
- it keeps construction ownership in `AddBrokenHingeLineOp` and storage ownership in `World` behind explicit methods.

## Reviewer decision requested

The follow-up reviewer should choose one of these outcomes:

1. **Accept this delta:** treat `AddBrokenHingeLineOp.ts` plus the two narrow `World` hinge-line storage hooks as an authorized minimal extension of the projection/world split implementation, because it is required to remove forbidden broad casts without exposing private aggregate storage.
2. **Reject this delta:** require a new reviewed mini-cycle for broken hinge-line creation ownership, with an alternative that removes the command-layer casts without adding these two `World` storage hooks.

## Validation evidence already captured

All logs are under `architecture-audit/cycle-015-typescript-build-contracts/validation/`:

- `projection-world-forbidden-cast-after-command-api.stdout` / `.stderr` — scoped scan after the command/storage correction found no `as any`, `as unknown as`, TypeScript suppressions, context-to-World casts, or fabricated hinge-line parent casts in the corrected lane.
- `projection-world-cast-fix-combined-focused.stdout` / `.stderr` — combined focused projection/guide/hinge/auxiliary/process-tree tests passed: 119 passed, 3 skipped, 11 todo.
- `t3-forbidden-scope-scan.stdout` / `.stderr` — t3 scoped scan found no forbidden casts/suppressions/compatibility overloads; the only notable matches were the named `World.addHingeLineEntity` / `World.removeHingeLine` hooks documented here.
- `t3-combined-focused.stdout` / `.stderr` — combined t3 focused projection/point/guide/auxiliary/process-tree rerun passed: 148 passed, 3 skipped, 11 todo.
- `frontend-build.t3-review-blockers.stdout` / `.stderr` — frontend build remains red only on residual non-projection Wave 015 categories; no projection/world scoped file errors are present.

## Residual risk

This is still a command-layer scope expansion relative to the original decision file list. The risk is procedural, not a known functional regression. It should be accepted or rejected explicitly by the follow-up review stage before the implementation stage is considered closed.
