# Reviewer-A Round 01 — Baseline Artifact Review

**Reviewer:** reviewer-A  
**Stage:** baseline-reviewer-a-round-01  
**Date:** 2025-05-24  
**Artifacts reviewed:** inventory.md, domain-model.md, architecture-map.md, quality-report.md, risk-register.md

---

## 1. Accuracy — Path:line Evidence Verification

All five artifacts rely heavily on `path:line` citations to ground claims in current source. I verified a representative sample of ~80 citations across all files. Findings:

### 1.1 Verified accurate
- **Module sizes**: SvgCanvas.vue (1,867 lines), ProjectionPlane.ts (1,797 lines), World.ts (1,339 lines), ThreeView.vue (1,201 lines), App.vue (1,172 lines), PaperService.ts (993 lines), ProjectService.ts (801 lines) — all confirmed.
- **World.ts imports**: Line 94 `(DependencyService)`, line 105 `(Command)`, line 106 `(buildWorldInitialization)`, lines 108-110 `(process-tree ops, CommandStack type)` — all confirmed.
- **World ownership comments**: Lines 14-16 stating hierarchical ownership — confirmed.
- **Command sealed pattern**: Lines 10, 49, 50, 69 — confirmed.
- **IOperation broad types**: Lines 118, 128, 134, 136, 160 with `Record<string, any>` — confirmed.
- **ProjectService private-field casts**: Lines 271, 313, 357, 370 `(as any)` — confirmed.
- **ProcessTree deprecated methods**: Lines 143, 150, 401, 404, 407, 411 — confirmed.
- **worldStore duplication**: Lines 7-10 (elements2D, elements3D, guides, DependencyGraph) — confirmed.
- **SvgCanvas.vue import sprawl**: Lines 181-192 — confirmed.
- **Root package.json workspace/scripts**: Lines 7-8, 11-16 — confirmed. No backend test/build at root level — confirmed.

### 1.2 Minor citation drift (warning)
- **risk-register.md** and **quality-report.md** sometimes cite the same evidence at slightly different line numbers (e.g., World imports cited at line 105 in some places, line 94 in others). This is because World.ts has multiple imports across lines 83-110, and different citations reference different import lines. This is not an error, just something that could confuse readers.

### 1.3 One significant accuracy issue (error)
- **quality-report.md Q12 / risk-register.md R7** state that `Workspace2D.vue` imports "legacy command-subclass-style modules" (`CreateFreePointCommand`, `CreatePointOnElementCommand`, etc.) at lines 71-76. This claim is **accurate in substance** — those imports do exist at those lines. However, the baseline does not state that **these imported files do not exist in the current source tree**. The six files (`CreateFreePointCommand`, `CreatePointOnElementCommand`, `CreateIntersectionPointCommand`, `CreateSegmentCommand`, `CreateLineCommand`, `CreateCircleCommand`) are referenced by import paths but are absent from `frontend/src/commands/`. Furthermore, **`Workspace2D.vue` is not imported by any other component** — it is completely dead code that would not compile. This makes Q12/R7 stronger than documented: it's not just a legacy path conflict with the sealed-command model; it's dead/uncompilable code whose import resolution would fail. This should be called out explicitly in the inventory and quality report.

---

## 2. Completeness

### 2.1 Inventory gaps (warning)
The inventory provides good top-level module descriptions but omits or superficially covers several source-tree modules:

1. **`frontend/src/domain/world/descriptors/`** — Contains `DescriptorRegistry`, `ElementDescriptor`, type-specific descriptors, and `registerDescriptors`. This subsystem implements a **descriptor pattern** for dynamic action/element description generation. It is not mentioned in inventory.md. It is a non-trivial subsystem (7 files) that couples domain to presentation description logic.

2. **`frontend/src/domain/world/elements/BrokenHalfHingeLine2D.ts`** — Isolated subdirectory for broken hinge-line element. Not mentioned in inventory despite being a distinct domain concept.

3. **`frontend/src/domain/world/Element2D.ts`, `Element.ts`, `ElementId.ts`, `LabelGenerator.ts`, `styleService.ts`, `VisualStyle.ts`** — These supporting domain files are not individually described. `styleService.ts` and `VisualStyle.ts` are particularly important because `styleService.ts` imports from both `Element.ts`, `World.ts`, and `ProcessTree.ts`, creating domain-internal coupling to process tree for visibility resolution — this is a meaningful architectural cross-reference.

4. **`frontend/src/domain/world/Realization.ts`** — Abstract base for all realizations, introduces a unified feasibility hierarchy. Not described in inventory despite being referenced in domain-model.md.

5. **`frontend/src/domain/calculations/distances.ts` and `perpendiculars.ts`** — Inventory mentions only `Intersections.ts` and `CoordinateTransform.ts` under domain calculations, but `distances.ts` (134 lines) and `perpendiculars.ts` (89 lines) are also present and used by `GeometryService` and `ValidationService`.

6. **`frontend/src/services/GeometryService.ts`, `InputService.ts`, `ValidationService.ts`** — The inventory mentions `DependencyService`, `RenderService`, `SVGRenderer`, `PaperService`, `Element2DRenderer3D`, and `ProjectService` but omits three services: `GeometryService` (163 lines, wraps domain calculations for tool use), `InputService` (76 lines, coordinate conversion for user input), and `ValidationService` (148 lines, geometric validation and coincidence checks). These are non-trivial service modules.

7. **`frontend/src/types/` completeness** — Inventory mentions only `ElementTypes.ts` and `SelectionMask.ts` but omits: `CommandTypes.ts`, `ResultTypes.ts`, `ThreeViewDisplayOptions.ts`, `ToolArgumentCollector.ts`, `ToolConfig.ts`, `arcGeometry.ts`. Some of these (especially `ResultTypes.ts` with the `Result<T,E>` pattern and `ToolArgumentCollector.ts` with the multi-argument collection framework) are architecturally important.

8. **`frontend/src/utils/` completeness** — Inventory mentions `threeUtils.ts`, `projectionPlaneUtils.ts`, and `coordinateTransform.ts` but omits: `arcGeometry.ts`, `assert.ts`, `formatUtils.ts`, `rectangleGrid.ts`. (`arcGeometry.ts` in types/ is separate from the one in utils/ — both exist.)

9. **Components not mentioned**: `frontend/src/components/header/ProjectNameDisplay.vue`, `frontend/src/components/menus/ExamplesMenu.vue`, `frontend/src/components/icons/toolbar/` (28 icon components + `index.ts`), `frontend/src/components/LoginStatusWidget.vue`. While individually small, the icon system and `ExamplesMenu` have service/tool integration implications.

10. **Test coverage incompleteness**: Inventory mentions 4 e2e specs by name but there are 30 e2e spec files. Integration tests list 3 items but there are at least 9 integration test files. The listing is explicitly presented as "examples" so this is not an error, but the inventory gives no sense of the full breadth of test coverage.

11. **`frontend/src/domain/viewState/`**: The inventory describes these as "projection/hinge view-state objects" without noting that they are lightweight interface/type definitions (38 and 41 lines respectively), separate from the domain classes. There is a potential confusion with `ProjectionPlane.ts` the domain class. The domain-model.md accurately describes the domain class, but the inventory should note the naming collision.

12. **`frontend/src/commands/operations/` subdirectories**: The inventory summarizes `IOperation` and mentions `AddFreePoint2DOp` and `InitializationOps`, but does not enumerate the operation subdirectories (`world/`, `processTree/`, `paper/`, `toolbar/`, `viewState/`, `debug/`) or their contents. Only `world/` and `processTree/` are detailed. The `paper/` and `debug/` subdirectories (containing `AddExampleSetupOp.ts`) are unmentioned.

### 2.2 Domain-model gaps (warning)
The domain-model.md is strong on geometric entities (points, lines, circles, segments, guides, hinge lines, 3D elements, intersections, dependency graph, process tree, command model, persistence) but has notable omissions:

1. **`Element.ts` base class**: The domain model describes element types and subtypes but does not mention the `Element` abstraction hierarchy root (introduced in Phase 52) that `Element2D` and `Element3D` extend, nor the `visualStyle` property (Phase 83) it carries.

2. **`LabelGenerator`**: Sequential naming for geometric elements — affects element creation and process-tree description, but not described in the domain model.

3. **`styleService.ts`**: Couples domain elements and process tree to visibility/style resolution — should be noted as a domain-internal dependency.

4. **`DescriptorRegistry` / descriptor pattern**: Phase 98 introduced a descriptor pattern for dynamic element descriptions. This is a domain-level abstraction that deserves mention because it couples domain classes to description/presentation logic via `DescriptorRegistry.register`.

5. **`Result<T,E>` type pattern**: Used by `GeometryService`, `ValidationService`, and domain calculations for geometric computations that can fail (infeasibility). Not described in domain model despite being architecturally important for the feasibility/infeasibility handling the model mentions.

6. **`BrokenHalfHingeLine2D`** in `elements/` subdirectory: The domain model describes `HalfHingeLine2D` within `HingeLine.ts` and mentions broken hinge behavior in `Guide.ts`, but the separate `BrokenHalfHingeLine2D.ts` file in `domain/world/elements/` is not individually described.

### 2.3 Architecture-map gaps (warning)
The architecture-map.md provides excellent coverage of cross-layer leaks, god-modules, and coupling patterns. A few additions:

1. **Frontend-backend cross-boundary import**: `OpenProjectDialog.vue` imports `ProjectMetadata` type directly from `backend/src/models/Project` (`OpenProjectDialog.vue:57`). This is a direct monorepo-path import from frontend Vue into backend models, which bypasses any API contract layer. This is not mentioned.

2. **Backend-frontend contract gap**: The architecture map notes that backend DTOs are `any`-typed and not a shared contract, but doesn't note the critical implication that **the frontend does not use the backend API at all in normal operation** — persistence is done via Google Drive/local file download, and the backend API appears to be a parallel path without frontend HTTP-client usage (only `OpenProjectDialog` imports the type, not the API calls). This means the backend's value to the project is questionable, which has implications for wave planning.

3. **Descriptor pattern coupling**: `DescriptorRegistry` and `registerDescriptors` create a registration-based coupling between domain element classes and description logic. This is a different coupling pattern from the direct-import patterns described, and deserves mention.

4. **`GeometryService` and `ValidationService`**: These services wrap domain calculations and are consumed by tools. They sit in the services layer but serve as mediators between tools/domain, not rendering/persistence services. Their absence from the architecture map creates a gap in understanding the tool→service→domain dependency path.

---

## 3. Stale-History Avoidance

The baseline correctly states it does not reference prior audit artifacts. I found **no evidence** of stale-history contamination. All citations reference current-tree files at current line numbers, and no claim appears derived from the discarded cycle-013..029 artifacts.

---

## 4. Risk-Register Quality

The risk register is well-structured with clear impact/likelihood/evidence/mitigation, and is correctly ordered by architectural centrality. A few observations:

1. **Risk 7 (Legacy/deprecated surfaces)** underestimates the `Workspace2D.vue` problem by characterizing it only as "legacy command-subclass-style imports" without noting that the file is dead/uncompilable code that has no callers. This makes R7 even more actionable than described — this is a pure deletion candidate with zero runtime risk.

2. **Missing risk candidate: Frontend-backend monorepo path import**. `OpenProjectDialog.vue` imports from `backend/src/models/Project` via relative path. This creates a build-time dependency across workspace boundaries that can break independently. Under the zero-backcompat priority, this should either be elevated to a contract or the backend path should be deleted. This is a low-impact but real risk not captured.

3. **Missing risk candidate: `DescriptorRegistry` domain-presentation coupling**. Domain elements register with `DescriptorRegistry` at app startup to provide dynamic descriptions. This pattern pushes presentation-concern code into the domain layer. The risk is low compared to the World/command inversion but deserves monitoring if the domain model is refactored.

4. **Risk ordering is appropriate**: Starting with domain/application boundary (R1), then god-modules (R2), then parallel state (R3), persistence (R4), and UI coupling (R5) is architecturally sound. The suggested wave ordering in the quality report and risk register are consistent.

---

## 5. Quality-Report Assessment

The quality report is comprehensive and well-organized. Findings Q1-Q20 are accurate and well-evidenced. Observations:

1. **Q7 (ProjectService private-field casts)** should note that these casts are necessary because the Command and CommandStack APIs expose no read/restore endpoints. This is not just a type-safety concern; it's an API design gap where persistence needs internal access the design doesn't formally provide.

2. **Q12 (Legacy command-subclass imports in Workspace2D.vue)**: Same as noted in accuracy section — this should clearly state that `Workspace2D.vue` is dead code (not imported anywhere, references non-existent files, wouldn't compile). The finding is correct but understated.

3. **Q13 (RenderService test-only paths)** is correct. `RenderService.ts` contains functions documented as test-only while production uses `SVGRenderer`. This is dead code in effect and should be flagged more explicitly.

4. **Q17 (Debug logging)**: While valid, some logging entries (e.g., `console.log('[ActionsPanel] World changed, re-fetching ProcessTree')`) are debug statements that should be removed but represent a trivial cleanup, not an architectural concern. The quality report treats them at the same level as type-safety and domain coupling issues, which overweights their significance.

5. **Missing quality finding: OpenProjectDialog cross-boundary import**. This is a direct filesystem-path import from frontend into backend source (`import type { ProjectMetadata } from '../../../../backend/src/models/Project'`), which is a type-safety and build-coupling concern.

---

## 6. No-Code-Change Compliance

I verified via `git status` that no application source code, tests, configs, specs, or docs have been modified. The only changes are:
- New baseline artifact files under `architecture-audit/baseline/`
- Saivage stage management files under `.saivage/`

**No-code-change compliance is CONFIRMED.**

---

## 7. Specific Corrections Required

### C1 [warning] — Inventory missing modules and incomplete descriptions
The inventory omits several non-trivial modules and provides incomplete coverage of the types, utils, domain-world, and services directories. Specifically missing:
- `domain/world/descriptors/` (7 files, descriptor pattern)
- `domain/world/elements/BrokenHalfHingeLine2D.ts`
- `domain/world/Element.ts`, `Element2D.ts`, `ElementId.ts`, `LabelGenerator.ts`, `styleService.ts`, `VisualStyle.ts`, `Realization.ts`
- `domain/calculations/distances.ts` and `perpendiculars.ts`
- `services/GeometryService.ts`, `InputService.ts`, `ValidationService.ts`
- `types/CommandTypes.ts`, `ResultTypes.ts`, `ToolArgumentCollector.ts`, `ToolConfig.ts`, `arcGeometry.ts`, `ThreeViewDisplayOptions.ts`
- `utils/arcGeometry.ts`, `assert.ts`, `formatUtils.ts`, `rectangleGrid.ts`
- `components/header/ProjectNameDisplay.vue`, `components/menus/ExamplesMenu.vue`, `components/icons/toolbar/` (28 files), `components/LoginStatusWidget.vue`
- `commands/operations/world/` subdirectory contents (beyond two named examples)
- `commands/operations/paper/`, `commands/operations/debug/`, `commands/operations/toolbar/`, `commands/operations/viewState/`

**Suggestion**: Amend `inventory.md` to add one-paragraph descriptions for each missing module group above. The most important omissions are `GeometryService`, `ValidationService`, `InputService`, `DescriptorRegistry`, `ResultTypes`, and `ToolArgumentCollector` because they represent meaningful architectural paths.

### C2 [warning] — Domain model missing Element hierarchy base, LabelGenerator, DescriptorRegistry, Result type
The domain-model.md describes element subtypes but not the `Element` base class hierarchy or `visualStyle`/`LabelGenerator`/`DescriptorRegistry`. The `Result<T,E>` pattern used for infeasibility handling is also unmentioned. These are architecturally relevant abstractions that affect how domain-Ppresentation coupling occurs.

**Suggestion**: Add brief paragraphs covering: (1) Element base class and visualStyle property, (2) LabelGenerator namespaced counter pattern, (3) DescriptorRegistry and registration pattern for domain-to-description coupling, (4) Result type for geometric infeasibility.

### C3 [warning] — Workspace2D.vue characterization is understated (Q12/R7)
The quality-report and risk-register correctly identify that `Workspace2D.vue` imports legacy command-subclass files, but they do not state that **(a) those six imported files do not exist in the tree**, and **(b) `Workspace2D.vue` itself is imported nowhere** (not by App.vue, not by any component, not by any test except e2e `basic-construction.spec.ts` and `distance-transport.spec.ts` which contain TODOs about integrating it). The file is dead, uncompilable code.

**Suggestion**: Amend Q12 and R7 to state explicitly that `Workspace2D.vue` is dead code that references non-existent imports and is not reachable from any active component. Re-classify from "legacy command-subclass-style imports conflict" to "dead/uncompilable code that should be deleted immediately".

### C4 [info] — Architecture map should note frontend-backend monorepo path import and backend unused status
`OpenProjectDialog.vue:57` imports `ProjectMetadata` via relative path from `backend/src/models/Project`. The frontend does not make runtime HTTP calls to the backend API; persistence is Google Drive/local. The backend exists but is not connected to the frontend in production usage.

**Suggestion**: Add a cross-boundary leak entry for the monorepo path import, and note in the backend section that the backend API is currently disconnected from the frontend's runtime persistence path (Google Drive and `ProjectService`-local).

### C5 [info] — Test coverage listing is misleading
The inventory lists only 4 of 30 e2e test files and 3 of ~9 integration test files, using "examples:" language that understates actual coverage. The domain model, architecture map, and quality report then reference specific e2e specs without noting the full breadth.

**Suggestion**: Add a sentence or footnote to the `frontend/tests/` inventory entry giving the total counts (30 e2e, ≥9 integration, architecture tests in unit/) and noting a few additional important categories not listed (distance-transport, infeasibility, dependencies, selection, hover, command-chaining).

---

## 8. Overall Verdict

The baseline artifacts are **thorough, accurate in their cited evidence, and well-organized**. The core architectural observations — domain/application inversion around World, god-modules, parallel state paths, persistence coupling, and UI bypassing use-cases — are all correct, well-evidenced, and properly prioritized. The risk ranking is sound and consistent with project priorities.

The corrections required (C1-C5) are all at **warning and info** level. No errors block acceptance. The most substantive correction is C3 (Workspace2D.vue dead code characterization), which strengthens rather than changes the existing findings. C1 and C2 are completeness improvements that would make the baseline more authoritative but do not affect the architectural conclusions.

**Reviewer-A verdict: CONDITIONAL SIGN-OFF** — the baseline is accurate and complete enough for architectural planning, but corrections C1-C3 should be addressed before formal sign-off. C4 and C5 are recommended but non-blocking.
