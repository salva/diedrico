# Corrections Round 01 Note

**Stage:** `cycle-014-build-contract-plan-edit-corrections-round-01`  
**Basis:** `reviews/round-01-review.md`  
**Files edited:** `proposals/proposal-direct.md`, `proposals/proposal-restructure.md`  
**Source/test/package/tooling/wave-plan edits:** none.

## Blocker-to-edit mapping

### 1. Tighten Wave 015 scope bound

Reviewer blocker: both proposals were too permissive around broad phrases such as service/domain strictness, UI/store/rendering contracts, and direct dependencies.

Edits made:

- `proposal-direct.md` now states that Wave 015 is limited to fixing or deleting exact current `frontend-build.after5.stdout` / `vue-tsc` errors and only direct type/contract-owner dependencies needed to eliminate those exact errors. It also excludes nearby files, adjacent TODOs, stylistic cleanup, and unrelated architecture normalization.
- `proposal-restructure.md` now uses the same exact-build-log/direct-contract-owner bound in the scope introduction, target outcome, DELETE list, anti-overreach constraints, and success criteria.

### 2. Add mandatory expansion stop rule

Reviewer blocker: the proposals needed an explicit stop when a category requires broader redesign beyond current build-error ownership.

Edits made:

- `proposal-direct.md` now requires a reviewed delta/mini-cycle if any category needs conceptual redesign beyond honest closure of the current build errors, and repeats that Wave 015 must not broaden in place.
- `proposal-restructure.md` now requires a reviewed delta/mini-cycle rather than silently continuing when rendering, command/undo, process-tree, projection-plane, or other categories need redesign beyond current compilation closure.

### 3. Protect Wave 014 repaired surfaces explicitly

Reviewer blocker: Wave 014 repaired files and the build-gate upgrade needed to be named as preserved scope.

Edits made:

- Both proposals now name the protected Wave 014 surfaces: `frontend/tests/unit/calculations/intersections.spec.ts`, `frontend/src/components/dialogs/PropertiesDialog.vue`, `frontend/tests/unit/components/propertiesDialog.spec.ts`, `frontend/tests/integration/guide-creation.test.ts`, `frontend/tests/e2e/keyboard-shortcuts.spec.ts`, `frontend/tests/e2e/selection-mask.spec.ts`, and the `frontend/package.json` build-gate upgrade.
- Both proposals now require any reopening or revert of those surfaces to cite a specific current build error and document the causal link.

### 4. Clarify residual handling for non-build issues

Reviewer blocker: non-build architectural discoveries during Wave 015 must be logged for future waves rather than folded into the wave.

Edits made:

- `proposal-direct.md` now states that unreachable/non-build discoveries are future-wave candidates and that non-build architectural issues in implementation logs do not expand Wave 015.
- `proposal-restructure.md` now states that residual architectural questions are deferred, boundary notes do not authorize unrelated API normalization, and implementation-log findings remain future-wave candidates.

## Correction boundary

These corrections intentionally do not edit `architecture-audit/wave-plan.md`, source code, tests, package files, validation tooling, or prior Wave 014 artifacts. The proposals remain planning artifacts for review round 02 and do not implement Wave 015.
