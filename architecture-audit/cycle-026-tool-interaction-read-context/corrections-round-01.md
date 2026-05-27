# Corrections Round 01 — Cycle 026 proposal-direct.md

## Scope and hygiene

This correction stage is planning-only. It inspected the round-01 review and corrected `proposals/proposal-direct.md` in place. It did not implement production source, tests, package/tooling, backend, docs/specs, config, or secret changes.

Scoped status evidence was captured in:

- `corrections-round-01-status.stdout.log`
- `corrections-round-01-status.stderr.log`

The initial scoped status showed the round-01 review directory as untracked. No unrelated dirty work was reverted or incorporated.

## Blocker-to-edit mapping

### Blocker 1 — Overreaching CanvasWorldReadPort delete claims

Reviewer finding: the direct proposal's delete list claimed this wave would delete `CanvasWorldReadPort` raw domain collection returns and `getProcessTree()` exposure where selector/read-model methods replace them, but the current evidence does not show those surfaces are required to delete `ToolContext.world`.

Edits made in `proposals/proposal-direct.md`:

- Narrowed the summary and target outcome to state that presentation read models remain unchanged unless a directly adjacent type/extraction is required for the tool raw-world deletion.
- Updated current evidence to say canvas/three adapter duplication is adjacent, but raw collection returns and `getProcessTree()` are not prerequisites for this wave.
- Rewrote the `CanvasWorldReadPort` and `ThreeWorldReadPort` files-to-change bullets as optional and bounded helper extraction only.
- Replaced the delete-list claim with an explicit non-delete rule: do not delete `CanvasWorldReadPort` raw collection returns or `getProcessTree()` as a Wave 026 success condition unless a specific current tool-port method requires it and the implementation remains directly tied to deleting `ToolContext.world`.
- Added stop conditions requiring a reviewed plan edit before deleting/reshaping `CanvasWorldReadPort.getProcessTree()`, canvas raw collection returns, canvas selector DTOs, or three presentation read models for reasons not directly required by the tool context split.

Why this resolves the blocker: the corrected proposal no longer treats canvas/process-tree narrowing as an independent success criterion. It preserves aggressive deletion for the scoped tool raw-world seam while bounding adjacent adapter work to what is necessary for that deletion.

### Blocker 2 — Anti-facade guard was not concrete enough

Reviewer finding: the direct proposal needed an explicit rule that every new tool read/realization port method maps to current callers enumerated in the scout inventory, and that canvas/three-only methods stay out of the tool port.

Edits made in `proposals/proposal-direct.md`:

- Added `Anti-facade guard and required caller map` under Proposed design.
- Mapped each suggested tool-port method to current tool callers/usages:
  - `getProjectionPlaneById` for `ArgumentCollectorTool`, 3D construction tools, and `CreateProjectionPlaneTool`.
  - `getElement2D` for `ArgumentCollectorTool` hit-result id resolution.
  - element-specific lookup methods for point/line/circle tool flows.
  - point/line/circle realization methods for circle, projection-plane, parallel/perpendicular, and tangent flows.
  - projection-plane transform/3D realization methods only where final scan proves a current tool caller needs them.
  - `areProjectionPlanesDistinct` for 3D construction plane-difference checks.
- Added forbidden shapes: generic `WorldView`, `ToolWorld`, `WorldQuery`, `RuntimeWorld`, `query(...)`, `traverse(...)`, `getAll...`, collection dumps, canvas/three-only pass-through methods, catch-all realization contexts, and compatibility overloads retaining `ToolContext.world`.
- Updated risks, validation plan, and stop conditions to require caller-map evidence and reject broad facades.

Why this resolves the blocker: the corrected proposal now gives the implementation stage a concrete, reviewable anti-facade test rather than a general admonition.

### Blocker 3 — Residual out-of-scope seams needed explicit acceptance

Reviewer finding: the direct proposal needed to state that `RuntimeSession` properties/process reads, `CanvasToolController` world ownership, and presentation-local realization helpers may survive if they are not required for raw tool-world deletion.

Edits made in `proposals/proposal-direct.md`:

- Added `Accepted residual out-of-scope seams` listing:
  - `RuntimeSession` properties-dialog coordinate reads and process-tree infeasibility realization reads.
  - `CanvasToolController` ownership of `World` and `CommandStack` for mutation/use-case orchestration.
  - Presentation-local realization helpers in `CanvasWorldReadPort` and `ThreeWorldReadPort` when not required for the tool port.
  - Elements visibility command ownership.
  - Persistence schema/replay, ProjectService, Drive/local serialization, and project restoration contracts.
  - Command-history/descriptors/producers/undo-redo redesign.
  - Canvas selector raw domain collection returns and `getProcessTree()` exposure as later-wave candidates.
- Updated expected architectural behavior and risks to acknowledge these residuals as intentional future-wave debt rather than contradictions.

Why this resolves the blocker: the corrected proposal now distinguishes the mandatory Wave 026 target (`ToolContext.world` deletion) from adjacent architecture debt that may remain without undermining the target outcome.

## Consistency updates

The following sections were updated consistently with the corrections:

- Summary
- Current evidence
- Target outcome
- Proposed design
- Files to change
- Files/tests/docs/fixtures to DELETE
- Expected behavior change
- Risks
- Validation plan
- No-backcompat rationale
- Stop conditions

`proposal-restructure.md` was not edited because its comparison remains accurate: it is intentionally broader and already frames canvas/three presentation adapter work as the reason to choose the restructure alternative rather than the corrected direct proposal.

## Recommendation

Proceed to `cycle-026-review-round-02` for review of the corrected direct proposal. The corrected direct proposal remains the recommended preferred path if the second review finds no new blocking scope expansion.
