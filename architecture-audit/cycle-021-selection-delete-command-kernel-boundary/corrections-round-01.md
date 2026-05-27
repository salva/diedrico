# Cycle 021 Corrections Round 01 — Proposal blocker response

## Source reviewed

- `reviews/round-01-review.md` reported one blocking issue: both proposals needed explicit semantic-preservation validation for the command lifecycle boundary being extracted.
- `proposals/proposal-direct.md` and `proposals/proposal-restructure.md` were edited in place.
- This correction remains planning-only: no production source, tests, packages, backend, specs, debug files, config, secrets, or stale audit-history artifacts were changed.

## Blocker-to-edit map

### Blocker: selection clears only after successful command lifecycle

- `proposal-direct.md`: the selection-deletion service test requirements now state that command creation, cascade factory invocation, `commit()`, and `CommandStack.push()` must complete before the caller may clear selection; the validation plan repeats this as a required semantic-preservation assertion.
- `proposal-restructure.md`: executor and validation requirements now state that selection clears only after successful command creation, operation build, commit, and stack push through the service/executor.

### Blocker: failures during build/commit/push must not clear selection

- `proposal-direct.md`: focused service tests now require failure coverage for command creation, cascade operation building, commit, and stack push, with selection unchanged on every failure path.
- `proposal-restructure.md`: executor tests and validation now require failure propagation/return without accepting partial deletes or allowing selection deletion to clear selection.

### Blocker: undo/redo counts and redo invalidation must preserve `CommandStack.push()` behavior

- `proposal-direct.md`: focused tests now require stack-count assertions before push, after push, after undo, after redo, and after a new command clears redo history. The validation plan requires undo/redo counts, redo invalidation, and stack notification behavior to match the current contract.
- `proposal-restructure.md`: executor tests now require undo/redo count and element-state checks across push/undo/redo/new-command-after-undo sequences, including redo invalidation.

### Blocker: committed-only and non-undoable push behavior must remain explicit

- `proposal-direct.md`: service tests and validation now call out `CommandStack.push()` invariants, including committed-only push behavior and preservation of non-undoable command handling where applicable.
- `proposal-restructure.md`: executor tests and validation now require committed-only push behavior and non-undoable command treatment to remain consistent with the current stack contract.

### Blocker: empty/no-op path must not create or push a command

- `proposal-direct.md`: empty input coverage now explicitly requires returning without constructing, committing, or pushing a command and without perturbing undo/redo counts.
- `proposal-restructure.md`: executor and validation requirements now state empty/no-op selection deletion must not create, commit, or push any command and must not change undo/redo counts.

### Blocker: executor abstraction must not broaden the wave

- `proposal-direct.md`: validation now defines the selection/delete service as the executor boundary for this slice only and excludes persistence/autosave/UI callbacks, serialization/replay, schema migration, backend/docs/debug/package-tooling, and non-selection command producers.
- `proposal-restructure.md`: validation and stop-condition sections now clarify that the executor is only command lifecycle choreography and is not a new application kernel, persistence coordinator, replay system, UI/event bus, autosave owner, or migration vehicle for all direct command producers.

## Recommendation

Proceed to `cycle-021-review-round-02` so the reviewer can verify these material proposal edits against the round-01 blockers before any decision or implementation stage.
