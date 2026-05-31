# Cycle 020 Review Round 02 — App-shell project session and browser integration boundary

Status: **NO BLOCKING ISSUES**
Preferred direction: **proposal-direct.md**
Recommended next stage: **cycle-020-decision**

## Scope and source-control verification

- Reviewed `proposal-direct.md`, `proposal-restructure.md`, `round-01-review.md`, `corrections-round-01.md`, and `scope-check.md`.
- Verified the direct proposal was corrected in place and the restructure proposal remains unchanged.
- Checked scoped status for `architecture-audit/cycle-020-app-shell-project-session-browser-boundary`, `frontend/src`, `frontend/tests`, and `.saivage/stages/cycle-020-review-round-02`.
- Observed unrelated/pre-existing dirty frontend source and e2e files outside the reviewed proposal artifacts. No evidence in this review round shows Cycle 020 source implementation was performed as part of this stage.
- `corrections-round-01-synthesized-review.md` referenced in stage context is not present; review proceeded on the actual correction artifact set present on disk, including `corrections-round-01-manager-review.md` in the reviews directory.

## Round-01 blocker resolution check

### 1. SelectionUseCases explicit handling
**Resolved.**

`proposal-direct.md` now contains a dedicated **SelectionUseCases decision** section that explicitly retains direct delete-command construction as intentional application-use-case behavior and residual Wave 020 debt. It also forbids introducing a delete-selection port, command-controller abstraction, undo/redo redesign, or command descriptor redesign in this cycle.

This resolves the round-01 ambiguity. The wave now has one explicit bounded plan instead of an open choice.

### 2. Production browser/service composition ownership split
**Resolved.**

`proposal-direct.md` now contains a dedicated **Production composition ownership decision** section and expanded `App.vue` bullets. The ownership split is explicit:

- the new production composition module is the sole owner of concrete service/browser adapter construction (`GoogleDriveService`, `ProjectService` adapter binding, browser storage/last-project repository, browser scheduler, keyboard target, and browser alert/error callbacks where concrete browser behavior is involved);
- `App.vue` remains a passive shell that may pass env-derived plain data plus UI refs/callbacks;
- `AppShellRuntime.ts` must receive explicit dependencies and must not recreate hidden defaults.

This closes the main implementation-drift risk identified in round 01.

### 3. Focused validation requirements for the new boundary
**Resolved.**

`proposal-direct.md` now names the required focused coverage directly:

- runtime core must be proven not to own hidden production browser/service defaults;
- the last-project repository/adapter must be proven to be the single owner of `diedrico_last_file_id` / `diedrico_last_file_name` persistence;
- `ProjectSessionUseCases` and `AutoSaveUseCases` must interact through repository methods rather than duplicated key literals;
- the retained `SelectionUseCases` decision is explicitly bounded so no new command-port test work is smuggled into the cycle.

This is sufficiently explicit for Wave 020 review closure.

## Proposal scoring against the six criteria

### 1. Does it advance the wave target outcome?
- **Direct:** Pass. It squarely targets the reviewed seam: explicit production composition ownership plus narrower session/browser boundaries without expanding into unrelated layers.
- **Restructure:** Mixed. It could advance the target, but only by widening the wave into a larger façade redesign.

### 2. Does it improve architecture and code quality?
- **Direct:** Pass. It removes hidden defaults from runtime core, centralizes browser/service composition, narrows app-shell-facing ports, and centralizes last-project key ownership.
- **Restructure:** Partial. It may improve cohesion, but it still carries a real risk of replacing current split responsibilities with a broader `AppSession` god object.

### 3. Does it respect no-backcompat / aggressive deletion priorities?
- **Direct:** Pass. It explicitly deletes hidden default construction, duplicated storage-key literals, broad persistence surface, `error: any` in touched paths, and compatibility helpers that preserve dual composition paths.
- **Restructure:** Pass in intent, but with more execution risk because the broader shape increases the chance of partial deletion or wrappers surviving.

### 4. Does it avoid overfeaturism?
- **Direct:** Pass. It is bounded to the concrete Wave 020 architectural seam and now explicitly forbids command/undo redesign creep.
- **Restructure:** Fail relative to the preferred path. It remains broader than necessary for the currently evidenced problem.

### 5. Does it avoid new risks or hidden regressions?
- **Direct:** Pass with manageable residual risk. Remaining risks are candidly disclosed: startup without credentials, autosave timing, keyboard target installation, and retained `SelectionUseCases` debt.
- **Restructure:** Weaker. Broader import churn and public-surface consolidation still make accidental regressions more likely.

### 6. Is the proposed validation sufficient?
- **Direct:** Pass. The validation plan includes static scans, focused app-shell boundary/unit coverage, root/frontend lint, full Vitest, build, e2e, preview refresh, and live smoke, with the new boundary assertions named explicitly.
- **Restructure:** Partial pass. The validation cadence is present, but the additional façade transition risk would still need more detailed focused coverage than currently described.

## Preferred proposal and decision guidance

**Preferred proposal: `proposal-direct.md`.**

It now resolves all round-01 blockers while staying faithful to Wave 020’s intended scope. It improves the app-shell production/browser integration boundary without reopening broader command, persistence-schema, Drive-internal, or UI-architecture redesign.

`proposal-restructure.md` remains a useful fallback if implementation later uncovers evidence that the existing `ProjectSessionUseCases` / `AutoSaveUseCases` split cannot be kept coherent after explicit production composition extraction. That evidence has not been shown at proposal-review time, so it should remain the rejected alternative for this cycle.

## Non-blocking observations

- The stage context references `reviews/corrections-round-01-synthesized-review.md`, but the file present on disk is `reviews/corrections-round-01-manager-review.md`. This does not block proposal closure because the actual correction note and corrected proposal are present and reviewable.
- Scoped status shows unrelated dirty frontend files adjacent to the app-shell area. The implementation stage should continue to reconcile touched-file attribution carefully before coding.

## Recommendation

Proceed to **`cycle-020-decision`** with **`proposal-direct.md`** as the winning proposal.
