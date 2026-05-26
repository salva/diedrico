# Scope Check — Cycle 014: Validation Contract Ownership

**Stage:** `cycle-014-fresh-scout-proposals`  
**Wave:** 014 — Establish validation contract ownership and delete invalid gates  
**Source-code changes in this stage:** none. This artifact is a current-tree scope check only.

## Premise check

Wave 014 premises still hold against the current tree and Wave 013 validation evidence:

- Root validation delegates to the frontend workspace: root `build`, `test`, `lint`, and `test:e2e` all call workspace scripts (`package.json:13-21`).
- Frontend validation gates are `vue-tsc && vite build`, `vitest run`, `vitest run tests/unit/architecture`, and `playwright test` (`frontend/package.json:8-16`).
- Wave 013 final validation left the mandatory gates red on exactly the surfaces Wave 014 names: intersection unit tests, PropertiesDialog unit tests, guide integration collection, `vue-tsc`/Node build tooling, and corrupted Playwright specs (`architecture-audit/cycle-013-docs-specs-reconciliation/validation/final-validation-summary.stdout`).
- The current source/test files still contain those surfaces; this scout did not implement any fixes.

No secret/provider/env files were read or cited.

## Script truth and gate ownership

| Gate | Current script truth | Current status evidence | Wave 014 owner classification |
|---|---|---|---|
| root lint | `npm run lint --workspace=frontend` (`package.json:16`) | Wave 013 rerun passed root lint and frontend lint | tooling / architecture-test gate |
| frontend lint | `npm run test:architecture` (`frontend/package.json:16`) | Wave 013 rerun passed architecture tests | tooling / architecture-test gate |
| root test | `npm run test --workspace=frontend` (`package.json:14`) | Wave 013 full Vitest red on intersection, PropertiesDialog, and guide integration | mixed: domain, UI component, integration |
| frontend test | `vitest run` (`frontend/package.json:10`) | Same red surfaces as root test | mixed: domain, UI component, integration |
| root build | `npm run build --workspace=frontend` (`package.json:13`) | `vue-tsc` aborts before Vite: `Search string not found: "/supportedTSExtensions = .*(?=;)/"`, Node `v24.15.0` | tooling / build-contract ownership |
| frontend build | `vue-tsc && vite build` (`frontend/package.json:8`) | Same `vue-tsc`/Node failure | tooling / build-contract ownership |
| root e2e | `npm run test:e2e --workspace=frontend` (`package.json:21`) | Playwright parse aborts before browser execution | e2e validation artifact ownership |
| frontend e2e | `playwright test` (`frontend/package.json:14`) | Same parse aborts | e2e validation artifact ownership |

## Current red gate surfaces

### 1. Line-line intersection API — domain ownership

Current implementation contract in source:

- `intersectLineLine()` is exported from `frontend/src/domain/calculations/Intersections.ts:80-83` and returns `Point2DRealization2D`, not `null`.
- Its docstring states parallel/coincident cases return a realization with `feasible=false` (`frontend/src/domain/calculations/Intersections.ts:76-79`).
- Runtime code follows that contract: if `Math.abs(w) < epsilon`, it returns `new Point2DRealization2D(new Vector3(0, 0, 1), false)` (`frontend/src/domain/calculations/Intersections.ts:110-115`); otherwise it returns `new Point2DRealization2D(new Vector3(x, y, 1), true)` (`frontend/src/domain/calculations/Intersections.ts:117-123`).

Active caller inventory:

| Caller | Citation | Contract assumption observed |
|---|---|---|
| `Point2DLineLineIntersection.realize2D()` | `frontend/src/domain/world/Point.ts:237-265` | Calls `intersectLineLine(line1, line2)` and immediately reads `intersectionPointReal.feasible`; infeasible results propagate as `Point2DRealization2D(..., false)`. This active caller assumes non-null realization objects. |
| `SiblingGuide2D.realize2D()` | `frontend/src/domain/world/Guide.ts:272-293` | Calls `intersectLineLine(primaryGuideRealization, primaryHalfHingeLineRealization)` and immediately reads `.feasible`; infeasible results make the sibling guide infeasible. This active caller assumes non-null realization objects. |
| Unit tests | `frontend/tests/unit/calculations/intersections.spec.ts:29-227` | Ten tests in the `intersectLineLine` block expect nullable/vector-like results: `not.toBeNull()`, direct `.x/.y/.z`, and `toBeNull()` for parallel/coincident cases. |

Search evidence found only two active production callers of `intersectLineLine`: `frontend/src/domain/world/Guide.ts:287` and `frontend/src/domain/world/Point.ts:258`. Other intersection helpers (`intersectLineCircle`, `intersectCircleCircle`, and 3D utility intersections) are out of scope unless implementation directly needs them for focused validation.

Scope conclusion: the implementation and active callers currently agree on an **infeasible realization** result model, while tests assert a stale nullable/vector contract. Wave 014 implementation should record a selected contract statement before changing anything. Based on current active callers, the bounded direct repair candidate is to keep the infeasible-realization contract and align tests/docs comments to it. If review decides nullable/discriminated results are architecturally preferable, implementation must update both active callers consistently or stop for plan-edit if that becomes a deeper geometry redesign.

### 2. PropertiesDialog component contract — UI component ownership

Current component behavior:

- Dialog close controls emit `close`: overlay self-click and close/cancel buttons all call `handleCancel` (`frontend/src/components/dialogs/PropertiesDialog.vue:2`, `frontend/src/components/dialogs/PropertiesDialog.vue:7`, `frontend/src/components/dialogs/PropertiesDialog.vue:149`, `frontend/src/components/dialogs/PropertiesDialog.vue:414-416`).
- Save validates only enabled overrides, builds a `changes` object, and emits `save` (`frontend/src/components/dialogs/PropertiesDialog.vue:418-430` and following lines in the same handler).
- The dialog contains placeholder/weak internals unrelated to the immediate red test contract, including `as any` dependency extraction (`frontend/src/components/dialogs/PropertiesDialog.vue:289-325`), placeholder process-tree creation text (`frontend/src/components/dialogs/PropertiesDialog.vue:331-335`), and default-only property loading (`frontend/src/components/dialogs/PropertiesDialog.vue:356-374`). These are architectural debt but Wave 014 must not redesign the dialog.

Current test assumptions:

- The failing tests cited by Wave 013 are close emissions (`frontend/tests/unit/components/propertiesDialog.spec.ts:59-96`) and save emissions (`frontend/tests/unit/components/propertiesDialog.spec.ts:268-332`).
- The tests create real world elements through `createTestWorld()` and direct plane construction (`frontend/tests/unit/components/propertiesDialog.spec.ts:23-31`, `frontend/tests/unit/components/propertiesDialog.spec.ts:268-280`).

Scope conclusion: this is a UI component contract surface. Wave 014 should repair stale or overly brittle unit expectations if they no longer match Vue/test-utils event semantics, or delete stale expectations if they assert behavior not owned by the current component. It must not expand into the component’s broader `any` dependency extraction, process-tree placeholder, or visual redesign.

### 3. Guide creation integration — integration ownership

Current file status:

- `frontend/tests/integration/guide-creation.test.ts` imports and defines executable Vitest tests (`frontend/tests/integration/guide-creation.test.ts:1-10`).
- The BrokenHalfHingeLine2D case is a placeholder-only test body with comments and no assertions (`frontend/tests/integration/guide-creation.test.ts:127-141`).
- Wave 013 summary reports the file as `(0 test)`, which is inconsistent with the current file content and needs a collection/discovery diagnosis before implementation changes.

Scope conclusion: this is an integration validation ownership surface. Wave 014 should distinguish real guide integration behavior from placeholder/comment-only coverage. The direct implementation should delete or convert the placeholder BHHL case and diagnose why Vitest reported `0 test` before making broader guide-domain changes. It must not redesign guide construction.

### 4. Keyboard shortcuts Playwright spec — e2e ownership, corrupted artifact

Current file status:

- `frontend/tests/e2e/keyboard-shortcuts.spec.ts` contains hundreds of blank/comment/preamble lines followed by a reversed/inlined cascade deletion block at line 267 before the intended keyboard-shortcut suite begins at line 280 (`frontend/tests/e2e/keyboard-shortcuts.spec.ts:267-282`).
- Wave 013 Playwright parse error matches this corruption: `Unexpected token (267:10160)`.
- The corrupted block includes stale phase/spec references and unrelated cascade deletion bodies embedded before imports (`frontend/tests/e2e/keyboard-shortcuts.spec.ts:267-278`).

Scope conclusion: this is not a valid current contract test. Wave 014 should delete corrupted fragments and keep/replace only current executable keyboard shortcut flows, then verify them with focused Playwright and Playwright MCP/live browser against preview `0.0.0.0:5173`.

### 5. Selection mask Playwright spec — e2e ownership, corrupted artifact

Current file status:

- The file starts as a plausible selection-mask suite (`frontend/tests/e2e/selection-mask.spec.ts:1-158`).
- After the suite closes at `frontend/tests/e2e/selection-mask.spec.ts:158`, orphaned test-body fragments continue at `frontend/tests/e2e/selection-mask.spec.ts:159-188` and beyond.
- Wave 013 Playwright parse error matches this corruption: `Unexpected token (188:2)`.
- The file also references stale MVP spec authority in comments (`frontend/tests/e2e/selection-mask.spec.ts:9`).

Scope conclusion: this is an e2e validation artifact, not a selection-mask domain redesign. Wave 014 should delete orphaned fragments/stale comments and repair or replace with smaller current flows that parse and exercise current UI behavior. Any mismatch between selectors and current DOM should be resolved narrowly in the spec contract, not by broad UI test cleanup.

### 6. Build/type-check tooling — tooling ownership

Current script/dependency facts:

- Frontend build is `vue-tsc && vite build` (`frontend/package.json:8`).
- Current frontend dev dependency is `vue-tsc` `^1.8.0` with TypeScript `^5.3.0` and Vue `^3.4.0` (`frontend/package.json:35` and nearby dependency block).
- Root Node engine allows any Node `>=18.0.0` (`package.json:27-29`), while Wave 013 logs show execution under Node `v24.15.0` and `vue-tsc` aborting before Vite (`architecture-audit/cycle-013-docs-specs-reconciliation/validation/final-validation-summary.stdout`).

Scope conclusion: this is tooling contract ownership. Implementation should choose one supported build contract: update tooling/runtime constraints so the active build works, or explicitly constrain unsupported Node/tool combinations in scripts/docs. It must not add parallel build paths, alternate type-check scripts, or compatibility shims.

## Valid current contracts vs stale/corrupted/placeholder artifacts

| Surface | Classification | Current valid contract? | Stale/corrupted/placeholder evidence |
|---|---|---|---|
| `Intersections.ts` + active callers | domain | Valid current contract appears to be `Point2DRealization2D` with `feasible=false` for no finite intersection | Unit tests still expect `null` and direct `.x/.y/.z` fields (`frontend/tests/unit/calculations/intersections.spec.ts:45-50`, `frontend/tests/unit/calculations/intersections.spec.ts:91-147`) |
| `PropertiesDialog.vue` + tests | UI component | Component exposes `close`/`save` events and style override UI | Some tests fail against current component/test-utils behavior; component contains broader debt but not a Wave 014 redesign target |
| `guide-creation.test.ts` | integration | Regular-line and half-hinge guide tests are intended executable behavior | BHHL case is comment-only placeholder (`frontend/tests/integration/guide-creation.test.ts:127-141`); Wave 013 `0 test` report requires diagnosis |
| `keyboard-shortcuts.spec.ts` | e2e | Keyboard shortcut flows after line 280 may be salvageable | Reversed/orphaned cascade block before imports corrupts parsing (`frontend/tests/e2e/keyboard-shortcuts.spec.ts:267-282`) |
| `selection-mask.spec.ts` | e2e | Early selection-mask tests may be salvageable | Suite closes at line 158, then orphaned fragments continue (`frontend/tests/e2e/selection-mask.spec.ts:158-188`) |
| build gate | tooling | Root/frontend build contract should be a single supported `vue-tsc && vite build` path | Current `vue-tsc`/Node 24 combination aborts before type checking |

## Scope guard confirmation

Cycle 014 implementation should be permitted to modify only files directly needed to own these validation contracts. It must not:

- redesign the validation framework;
- add generalized allowlists, custom runners, or parallel build/test toolchains;
- sweep unrelated test debt;
- redesign PropertiesDialog, guide-domain construction, selection-mask semantics, or geometry domain models;
- hide a deeper intersection/domain redesign under test repair.

If the selected intersection contract or build/tooling decision proves to require deeper architectural redesign, implementation must stop and request a reviewed plan-edit mini-cycle.

## Artifacts to produce next

This scope check supports two proposals:

- `proposals/proposal-direct.md` — bounded direct repair of the red validation contracts with the infeasible-realization intersection contract as the likely current contract.
- `proposals/proposal-restructure.md` — evaluates whether ownership should move a layer higher/lower and preserves stop/review behavior if caller inventory exposes deeper domain/tooling redesign.
