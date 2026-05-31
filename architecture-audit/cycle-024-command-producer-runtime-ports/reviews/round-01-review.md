# Cycle 024 Review Round 01 — Command-producer runtime ports

Status: **NO BLOCKING ISSUES**

## Initial review summary

The initial round-01 review found three blocking issues in `proposals/proposal-direct.md`:

1. the runtime-port ownership / injection contract was too ambiguous;
2. controller deletion/merging and deferred tool/world/read seams needed stricter stop conditions;
3. validation needed explicit guards for `commandHistoryPort`-based undo/redo routing plus autosave dirty signaling and persistence round-trip behavior when `runtime.commandStack` is removed.

Those issues were recorded in the earlier version of this artifact and in the stage TaskReport.

---

## Follow-up review after corrections-round-01

### Scope and source-control recheck

- Re-read the corrected `proposal-direct.md`, `proposal-restructure.md`, `scope-check.md`, and this prior review artifact.
- Follow-up scoped git status evidence was captured in `.saivage/stages/cycle-024-review-round-01/reviews/followup-scoped-git-status.stdout.log`.
- No production implementation was reviewed or required here; this is a proposal-only re-review.
- The manager-supplied `manager-post-correction-diff.stdout.log` is empty, so the review relies on the corrected proposal text itself.
- Scope remains properly bounded to the Wave 024 seam identified in `scope-check.md`: removing `RuntimeSession.commandStackForDeferredCommandProducers()` and raw command-stack producer wiring for canvas/construction/process-history, while leaving backend, package-tooling, persistence schema/replay, rendering/read-port redesign, and command-kernel internals out of scope.

### Recheck of prior blocker 1 — runtime-port ownership and injection contract

**Previous blocker:** `proposal-direct.md` did not tightly define the replacement port ownership/interface contract.

**Follow-up finding:** **RESOLVED**

Evidence now present in `proposal-direct.md`:

- `RuntimeSession.ts` is explicitly required to own concrete construction of the replacement ports from its private `World` and `CommandStack`, and no other runtime/app-shell object may unwrap or cache a raw stack for producers.
- `AppShellRuntime.ts` is constrained to explicit returned fields such as `canvasCommandProducerPort` and `processHistoryCommandPort`, and explicitly forbids a generic `commands`, `services`, `runtimeContext`, or mutable dependency bag.
- `App.vue` now requires typed Vue `InjectionKey` exports or direct prop/factory wiring with named TypeScript interfaces, and explicitly forbids string-keyed catch-all replacement providers.
- The new **Required runtime-port ownership contract** section further forbids exposing the stack, a stack-like wrapper, or a generic `execute(commandBuilder)` service to Vue components, and requires behavior-sized interfaces instead.

This addresses the previous ambiguity and materially lowers the risk of recreating the same seam under a new broad name.

### Recheck of prior blocker 2 — controller/tool seam stop conditions

**Previous blocker:** `proposal-direct.md` did not clearly constrain controller deletion/merging or protect deferred tool/world/read seams from scope creep.

**Follow-up finding:** **RESOLVED**

Evidence now present in `proposal-direct.md`:

- Risks now state that `CanvasToolController` and `ProcessHistoryController` may be simplified, but deletion or merging is allowed only if the replacement remains equally narrow and does not absorb unrelated read/render/persistence/tool-state responsibilities.
- Risks now explicitly preserve the `ToolCommandSink` boundary and forbid absorbing tool hit-testing, argument collection, active-plane reads, `world` interaction reads, or the tool state machine into command-producer ports.
- Stop conditions now explicitly block moving `world` reads in `SvgCanvas.vue`, tool hit-testing, active-plane/argument collection reads, or process-tree rendering into command-producer ports.
- Stop conditions also block broadening controller changes beyond the current command-producer seam.

These additions now match the narrow-wave intent from `scope-check.md` and make the stop conditions specific enough for implementation review.

### Recheck of prior blocker 3 — validation for history routing and persistence/dirty behavior

**Previous blocker:** validation did not explicitly prove that removing `runtime.commandStack` would not disturb `commandHistoryPort`-based undo/redo routing or adjacent autosave/persistence behavior.

**Follow-up finding:** **RESOLVED**

Evidence now present in `proposal-direct.md`:

- Focused tests now explicitly include keyboard and toolbar undo/redo tests proving history behavior still flows through existing `commandHistoryPort`, not through any new command-producer port.
- Post-edit static scans now explicitly require proof that keyboard/toolbar undo-redo call sites still use `commandHistoryPort`.
- Validation now adds focused persistence/autosave guard evidence requiring existing tests or smoke flows that verify projects are still marked dirty, autosave/save flows stay on the same paths, and project round-trip behavior remains intact without editing schema/replay code.
- Expected behavior already states that undo/redo, save/autosave dirty signaling, and project round-trip behavior should remain equivalent.

This resolves the prior gap in adjacent-runtime validation coverage.

## Proposal scoring after corrections

### Proposal Direct — `proposals/proposal-direct.md`

1. **Advances target outcome?** **Yes**
   - It directly removes the named Wave 024 seam and now defines the replacement ownership contract concretely.

2. **Improves architecture and code quality?** **Yes**
   - It keeps `RuntimeSession` as the sole concrete stack owner, removes raw Vue producer injection, preserves the existing `ToolCommandSink` behavioral seam, and avoids introducing a new god-service.

3. **Respects no-backcompat / aggressive deletion?** **Yes**
   - It still explicitly deletes the raw accessor, raw provide/inject, unknown casts, and dual-path compatibility.

4. **Avoids overfeaturism?** **Yes**
   - The new stop conditions make the direct path appropriately narrow and explicitly defer rendering/read-port, persistence, and command-kernel redesign.

5. **Risks / hidden regressions?** **Acceptable**
   - Remaining implementation risks are honestly named and bounded: movement preview lifecycle, construction breadth, process-history state reads, adjacent dirty command files, and controller simplification limits.

6. **Validation sufficient?** **Yes**
   - The corrected validation plan now covers the targeted seam plus the previously missing adjacent-runtime history/autosave/persistence guards.

### Proposal Restructure — `proposals/proposal-restructure.md`

1. **Advances target outcome?** **Yes**
2. **Improves architecture and code quality?** **Potentially, but at higher risk**
3. **Respects no-backcompat / aggressive deletion?** **Yes**
4. **Avoids overfeaturism?** **Less well than direct**
5. **Risks / hidden regressions?** **Higher than direct**
6. **Validation sufficient?** **Generally yes, but the proposal remains broader than this wave needs**

This still makes `proposal-direct.md` the preferred decision path.

## Final review decision

**NO BLOCKING ISSUES**

All three prior blocker categories are now resolved in the corrected `proposal-direct.md`. The proposal is sufficiently specific about runtime-port ownership, sufficiently narrow about controller/tool/read seams, and sufficiently guarded in validation for adjacent undo/redo and persistence behavior.

## Recommendation to Manager

Proceed to **`cycle-024-decision`**.

Preferred decision considerations:

- Choose `proposal-direct.md` as the converged proposal for Wave 024.
- Keep the implementation strictly bounded to command-producer runtime-port ownership for canvas/construction/process-history.
- Treat `worldForView()` / rendering-read seams, persistence schema/replay work, and command-kernel redesign as future waves unless implementation uncovers a reviewed stop condition.
- During implementation review, scrutinize any attempt to replace the deleted raw seam with a broad runtime service, generic provider, or widened controller responsibilities.
