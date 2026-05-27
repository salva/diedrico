# Cycle 021 Corrections Round 01

## Inputs inspected

- `reviews/round-01-review.md`
- `proposals/proposal-direct.md`
- `proposals/proposal-restructure.md`
- Scoped pre-correction status/diff logs: `corrections-round-01-pre-status.stdout`, `corrections-round-01-pre-diff.stdout`

## Blocker-to-edit map

### Blocker: semantic-preservation checks were too implicit

Round 01 required both proposals to explicitly prove command lifecycle preservation at the extracted selection/delete boundary. Edits made:

- `proposals/proposal-direct.md` now contains a dedicated **Semantic-preservation validation requirements** section requiring tests for:
  - selection clearing only after successful command creation, cascade operation construction, `commit()`, and `CommandStack.push()`;
  - build/factory/commit/push failures not clearing selection;
  - undo stack counts, redo stack counts, redo invalidation, and stack notification timing matching the current `CommandStack.push()` contract;
  - empty/no-op behavior not creating, committing, or pushing commands;
  - non-undoable command behavior remaining governed by `CommandStack`;
  - the service boundary not absorbing persistence, autosave, UI, replay/serialization, backend/API, package/tooling, docs/specs, or unrelated command producers.
- `proposals/proposal-direct.md` validation plan now requires focused service and use-case tests to assert those semantics directly rather than relying on generic integration coverage.

- `proposals/proposal-restructure.md` now contains an equivalent **Semantic-preservation validation requirements** section requiring tests for:
  - selection clearing only after successful selected-id command creation, cascade operation construction, executor commit, and `CommandStack.push()`;
  - selection deletion service, builder, factory, executor commit, and stack push failures not clearing selection;
  - undo/redo counts, redo invalidation, and notification timing matching current stack behavior;
  - empty/no-op paths not allocating, committing, pushing, or changing stack counts;
  - non-undoable command behavior staying at the stack contract boundary;
  - executor scope limited to selection/delete command lifecycle choreography.
- `proposals/proposal-restructure.md` validation plan now calls out these semantic assertions directly in the focused executor/selection/app-shell tests.

### Blocker: executor scope limits needed to be explicit

Round 01 warned that the restructure option could expand into a general application kernel. Edits made:

- `proposals/proposal-restructure.md` semantic-preservation requirements now state that the executor must not absorb persistence/autosave, UI concerns, replay/serialization, operation registry redesign, backend/API behavior, package/tooling, docs/specs, or migration of canvas/tool/process-history/toolbar/world-initialization command producers.
- `proposals/proposal-restructure.md` risk text now expands the god-service warning to include replay/serialization, backend/API behavior, package/tooling, docs/specs, and non-selection command producers.
- Existing stop conditions remain in place and continue to require a reviewed plan edit or future wave if non-selection command migration, persistence/replay, `CommandStack` public behavior changes, or `AppShellRuntime` ownership changes become necessary.

## Scope boundary confirmation

This corrections round edited only Cycle 021 audit artifacts and the task report. It did not implement production source/test/package/backend/docs/spec/config changes, did not read protected secret/config files, and did not start implementation. The corrected artifacts preserve the Cycle 021 stop condition: remove direct `Command`/`DeletionSequenceFactory` construction from `SelectionUseCases` for selection/delete without broad persistence schema/replay work, non-selection command migration, backend/docs/debug/package-tooling cleanup, or application-kernel redesign.

## Recommended next stage

Proceed to `cycle-021-review-round-02` so the reviewer can confirm the blockers were materially addressed before decision or implementation.
