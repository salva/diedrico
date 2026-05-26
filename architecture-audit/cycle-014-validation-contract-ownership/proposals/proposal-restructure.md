# Proposal Restructure — Wave 014: Validation Ownership Boundaries Before Repair

## Framing question

Should Wave 014 be implemented one conceptual layer higher than direct red-test repair: as an ownership boundary pass that decides which layer owns each gate, then deletes invalid gates that lack a current owner?

The scope check says yes. The red surfaces are heterogeneous: a domain result-contract mismatch, UI component event expectations, an integration placeholder/collection anomaly, structurally corrupted e2e files, and an unsupported build-tool/runtime combination. A local patch risks making the suite green while preserving unclear validation authority. This proposal therefore keeps the Wave 014 implementation bounded but treats every change as a contract-ownership decision first.

## Scope

- Write `implementation-log.md` first with a validation-ownership map and the audited intersection caller/test-assumption inventory from `scope-check.md`.
- For each red surface, decide whether the current artifact is:
  1. a valid current contract to repair,
  2. a stale contract to rewrite under its current owner,
  3. a corrupted/placeholder artifact to delete, or
  4. evidence that the wave premise is false and a reviewed plan-edit mini-cycle is required.
- Implement only the chosen bounded decisions for:
  - line-line intersection source/tests,
  - PropertiesDialog component tests/source if necessary,
  - guide integration file,
  - keyboard shortcut and selection-mask Playwright specs,
  - build/tooling metadata.

## Higher/lower layer evaluation

### Intersection contract

Current evidence places ownership in the domain realization contract, not in Vitest mechanics:

- `intersectLineLine()` currently returns `Point2DRealization2D` (`frontend/src/domain/calculations/Intersections.ts:80-83`).
- Active domain callers in `Point2DLineLineIntersection` and `SiblingGuide2D` both read `.feasible` (`frontend/src/domain/world/Point.ts:258-263`, `frontend/src/domain/world/Guide.ts:287-292`).
- Unit tests assert an older nullable/vector contract (`frontend/tests/unit/calculations/intersections.spec.ts:45-50`, `frontend/tests/unit/calculations/intersections.spec.ts:91-147`).

Layer decision for Wave 014: choose and document a result contract. The likely current-owner contract is **infeasible realization**. If reviewers choose nullable or discriminated result instead, the implementation must update both active callers consistently and remain limited to this API. If caller review reveals a deeper geometry/domain modeling problem, stop and run a reviewed plan-edit mini-cycle.

### PropertiesDialog contract

Ownership is at the UI component test boundary, not the broader dialog architecture. `PropertiesDialog.vue` emits `close` and `save` (`frontend/src/components/dialogs/PropertiesDialog.vue:414-430` and following handler body), while tests assert event behavior (`frontend/tests/unit/components/propertiesDialog.spec.ts:59-96`, `frontend/tests/unit/components/propertiesDialog.spec.ts:268-332`). The component also contains `any` casts and placeholder process-tree text, but those are not the current validation gate ownership problem.

Layer decision for Wave 014: repair/delete stale event tests or a focused event bug only. Defer dialog model redesign to a future wave if still architecturally important.

### Guide integration contract

Ownership is integration behavior, but the current file mixes executable guide behavior with a placeholder BHHL case (`frontend/tests/integration/guide-creation.test.ts:127-141`) and Wave 013 reported `(0 test)`. This is not evidence for a guide-domain redesign by itself.

Layer decision for Wave 014: make the file an executable current-owner integration test or delete placeholder cases. Diagnose collection truth narrowly; do not redesign guides.

### E2E keyboard/selection contracts

Ownership is e2e behavioral validation. Both files contain corrupted artifacts that fail before browser execution (`keyboard-shortcuts.spec.ts:267-282`, `selection-mask.spec.ts:158-188`). Corrupted parse failures are not useful product contracts.

Layer decision for Wave 014: delete corruption aggressively, then keep/replace only current user-facing flows. Require Playwright MCP/live browser checks after automated e2e repair.

### Build tooling contract

Ownership is the active frontend build gate. The root package delegates build to frontend (`package.json:13`), frontend runs `vue-tsc && vite build` (`frontend/package.json:8`), and Wave 013 shows `vue-tsc` fails under Node `v24.15.0` before Vite starts.

Layer decision for Wave 014: pick one supported build-tool/runtime contract and encode it truthfully. Do not create an alternate toolchain or suppress `vue-tsc`.

## Anti-overreach constraints

This proposal explicitly forbids:

- broad validation-framework redesign;
- generalized allowlists;
- custom runners;
- parallel build/test/type-check toolchains;
- sweeping unrelated test cleanup;
- dialog redesign;
- guide-domain redesign;
- selector/rendering cleanup;
- hidden geometry redesign;
- retaining skip/todo/allowlist entries as a substitute for valid contracts.

Recurrence checks are allowed only if narrow and tied to exact invalid artifact classes evidenced now: corrupted Playwright parse artifacts, zero-test/placeholder integration files, and unsupported build-tool/runtime combinations.

## Target outcome

After implementation, future waves can trust mandatory validation because each gate has an owner:

- **Domain:** line-line intersection tests assert the selected result contract used by active callers.
- **UI component:** PropertiesDialog tests assert current emitted props/events or stale expectations are deleted.
- **Integration:** guide creation tests contain executable behavior; placeholder-only tests are gone.
- **E2E:** keyboard and selection-mask specs parse and exercise current flows.
- **Tooling:** build uses a single supported runtime/tool contract.

## Files to change

Expected implementation files:

- `architecture-audit/cycle-014-validation-contract-ownership/implementation-log.md`
- `frontend/tests/unit/calculations/intersections.spec.ts`
- `frontend/tests/unit/components/propertiesDialog.spec.ts`
- `frontend/tests/integration/guide-creation.test.ts`
- `frontend/tests/e2e/keyboard-shortcuts.spec.ts`
- `frontend/tests/e2e/selection-mask.spec.ts`
- `frontend/package.json` plus lockfile/package metadata if required for a single supported build contract

Conditional source files only if current-owner validation proves a source bug:

- `frontend/src/domain/calculations/Intersections.ts`
- `frontend/src/domain/world/Point.ts`
- `frontend/src/domain/world/Guide.ts`
- `frontend/src/components/dialogs/PropertiesDialog.vue`

Any conditional source change beyond those files requires a reviewed delta proposal.

## Explicit DELETE list

- Delete stale nullable/vector assumptions from line-line intersection tests if infeasible-realization remains the selected contract.
- Delete stale PropertiesDialog unit expectations that do not represent current props/events.
- Delete the comment-only BrokenHalfHingeLine2D guide test or replace it with executable current behavior.
- Delete corrupted Playwright preambles, reversed blocks, orphaned test bodies, and stale MVP/phase reference comments in keyboard and selection-mask specs.
- Delete helper/fixture code used only by corrupted/deleted specs if static search proves it has no current owner.
- Delete unsupported/unused build-tool alternatives and do not add compatibility shims.
- Delete any new skip/todo/allowlist introduced merely to pass gates.

## Stop/review behavior

Implementation must stop and request a reviewed plan-edit mini-cycle if any of these occur:

- active `intersectLineLine` caller inventory expands into a broad geometry/model redesign;
- the selected result contract requires changing unrelated construction, rendering, persistence, or tool-controller layers;
- build repair requires maintaining two build/type-check paths;
- e2e repair implies a broad selection/tool UI redesign rather than spec corruption cleanup;
- guide validation requires changing guide-domain semantics beyond placeholder/current-contract repair.

## Success criteria and validation plan

Implementation succeeds only if:

- `implementation-log.md` contains the validation-ownership map, intersection caller inventory, and selected line-line result-contract statement before source/test change summaries;
- no Vitest file is collected as `0 test` unless intentionally moved outside test discovery as a helper;
- Playwright no longer fails during parsing;
- root/frontend `test`, `build`, and `test:e2e` pass;
- live preview is refreshed on `0.0.0.0:5173`, returns HTTP 200, and Playwright MCP/live browser checks exercise repaired/replaced keyboard shortcut and selection-mask flows;
- any static recurrence check is narrow and tied to the exact invalid artifact classes evidenced in this wave.

Validation commands and logs:

1. Static zero-test and Playwright parse discovery check.
2. Focused Vitest for intersection, PropertiesDialog, and guide integration.
3. Focused Playwright for keyboard shortcuts and selection masks.
4. Root/frontend lint.
5. Full root/frontend Vitest.
6. Root/frontend build.
7. Root/frontend e2e.
8. Preview refresh/probe and Playwright MCP/live browser verification.

Full stdout/stderr must be captured under `architecture-audit/cycle-014-validation-contract-ownership/validation/`.

## Expected behavior change

Product behavior should remain current unless a focused validation reveals a real source bug on these contracts. Validation behavior changes substantially: invalid artifacts are deleted or replaced, and future waves can no longer treat corrupted/placeholder tests or unsupported build combinations as acceptable background noise.

## Risks

- The current infeasible-realization intersection contract may be expedient but not the ideal long-term domain model. The stop/review rule prevents hidden redesign.
- Deleting corrupted e2e fragments may reduce historical test count; this is acceptable because parse-failing specs currently provide no coverage.
- Build tooling repair may require dependency updates that affect lockfiles; keep the result as one supported path.
- Narrow recurrence checks can still drift into framework work; reviewers should reject anything broader than exact corruption/placeholder/tool-runtime classes.

## Dependencies

Depends on Waves 001–013, the post-phase-3 Wave 014 decision, and this cycle’s `scope-check.md`. This proposal should be selected if reviewers want the implementation to optimize for validation architecture ownership rather than just red/green repair.
