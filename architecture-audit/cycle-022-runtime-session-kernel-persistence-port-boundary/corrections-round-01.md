# Cycle 022 Corrections Round 01

## Inputs inspected

- Current scoped git status/diff for `architecture-audit/cycle-022-runtime-session-kernel-persistence-port-boundary/` and the Cycle 022 report path was captured in `corrections-scoped-status.stdout` / `corrections-scoped-status.stderr`. The full MCP `git_status` response exceeded its output buffer, so no broad workspace changes were inferred from it.
- `reviews/round-01-review.md` was read and treated as the source of blockers for this correction pass.
- `proposals/proposal-direct.md`, `proposals/proposal-restructure.md`, and `scope-check.md` were read before edits.

## Blocker mapping

### Blocker 1 — Open/restore failure semantics underspecified

Addressed in `proposals/proposal-direct.md` by adding **Open/restore failure semantics**. The preferred direct proposal now explicitly chooses validation-before-destructive-reset / atomic restore semantics: invalid payloads, validation failures, deserialization failures, and incomplete restores must leave the previous active `World`, `CommandStack`, project metadata, dirty/version state, and autosave eligibility intact. The rationale states that the change is limited to session-boundary failure atomicity and is not permission to redesign `ProjectService` schema/replay or Drive/auth behavior.

### Blocker 2 — Restructure proposal too broad

Addressed in `proposals/proposal-restructure.md` by marking the restructure proposal **non-preferred fallback only**. Optional keyboard/history, active-plane, and selection migration language was removed or converted to explicit out-of-scope constraints. A new stop-condition section prevents implementation discretion from broadening into keyboard routing, active-plane/session read-port migration, selection APIs, generic command execution, rendering, persistence schema/replay, Drive/auth, or broad application-platform work without a reviewed delta.

### Blocker 3 — Validation plans missing failure-path coverage

Addressed in both proposal files. `proposal-direct.md` now requires focused tests for invalid/corrupt payloads, restore/deserialization failure, command-stack/world state after failed open, and autosave/session exception behavior. `proposal-restructure.md` now requires equivalent failure-path validation if the fallback is ever selected.

## Protected scope retained

The corrections did not implement source changes and did not modify production source, production tests, package/tooling, backend, docs/spec source, debug files, Drive/auth internals, rendering/domain code, protected config, env files, provider files, or secrets. Edits were limited to Cycle 022 planning artifacts and this corrections note.

## Recommendation

Run `cycle-022-review-round-02` against the corrected proposal artifacts. Do not proceed directly to decision or implementation from this correction task alone.
