# Baseline Architectural Risk Register — Current Develop Tree

Scope: current `develop` source tree only. Risks are ranked by impact on long-term maintainability under the project priorities: clean architecture first, code quality second, correctness third, and no backward-compatibility preference.

## Risk ranking summary

| Rank | Risk | Impact | Likelihood | Primary evidence |
|---:|---|---|---|---|
| 1 | Domain/application dependency inversion around `World` | Critical | High | `World` imports services and commands (`frontend/src/domain/world/World.ts:94`, `frontend/src/domain/world/World.ts:105`) |
| 2 | God-modules block safe architectural change | Critical | High | `SvgCanvas.vue`, `ProjectionPlane.ts`, `World.ts`, `ThreeView.vue`, `App.vue` hotspots (`frontend/src/components/workspace/SvgCanvas.vue:181`, `frontend/src/domain/world/ProjectionPlane.ts:176`, `frontend/src/domain/world/World.ts:113`) |
| 3 | Parallel state models create inconsistent truth sources | High | High | `worldStore` duplicates `World`/`ProjectionPlane` ownership (`frontend/src/stores/worldStore.ts:7`, `frontend/src/domain/world/World.ts:14`) |
| 4 | Persistence is tightly coupled to concrete operations and private internals | High | High | `ProjectService` imports operation classes and casts private fields (`frontend/src/services/ProjectService.ts:24`, `frontend/src/services/ProjectService.ts:370`) |
| 5 | UI components bypass use-case/application layer | High | High | Components import operation classes (`frontend/src/components/workspace/SvgCanvas.vue:190`, `frontend/src/components/panels/ActionsPanel.vue:56`) |
| 6 | Type contracts are too weak at key boundaries | High | Medium | `Record<string, any>` operation/DTO shapes (`frontend/src/commands/operations/IOperation.ts:136`, `backend/src/models/Project.ts:13`) |
| 7 | Legacy/deprecated surfaces remain in active tree | Medium-High | High | Deprecated process-tree methods and legacy command-subclass-style imports (`frontend/src/domain/processTree/ProcessTree.ts:143`, `frontend/src/components/workspace/Workspace2D.vue:71`) |
| 8 | Rendering architecture mixes domain, projection, and view concerns | Medium-High | High | `ThreeView.vue`/`PaperService` concentration (`frontend/src/components/panels/ThreeView.vue:239`, `frontend/src/services/PaperService.ts:108`) |
| 9 | Backend is disconnected from standard root validation and frontend contract | Medium | Medium | root scripts skip backend (`package.json:11`, `backend/package.json:8`) |
| 10 | Tests do not enforce the observed high-level architecture boundaries | Medium | High | narrow architecture tests plus current violations (`frontend/tests/unit/architecture/noCommandSubclasses.spec.ts`, `frontend/src/domain/world/World.ts:105`) |

## R1. Domain/application dependency inversion around `World`

**Impact:** Critical. The domain root cannot become a stable pure model while it imports application services and commands.

**Likelihood:** High. The inversion is explicit in current imports and initialization flow.

**Evidence:** `World.ts` imports `DependencyService` from `services`, `Command`, initialization factory, process-tree operation classes, and `CommandStack` type (`frontend/src/domain/world/World.ts:94`, `frontend/src/domain/world/World.ts:105`, `frontend/src/domain/world/World.ts:106`, `frontend/src/domain/world/World.ts:108`, `frontend/src/domain/world/World.ts:109`, `frontend/src/domain/world/World.ts:110`). It initializes itself through a command-stack workflow (`frontend/src/domain/world/World.ts:193`, `frontend/src/domain/world/World.ts:214`). The command side imports `World` (`frontend/src/commands/Command.ts:73`, `frontend/src/commands/operations/IOperation.ts:111`).

**Consequence:** Refactors of commands, initialization, dependency graph, or persistence can ripple into the domain root; pure domain tests require application infrastructure; future clean-architecture layering will be blocked until this inversion is removed.

**Mitigation direction:** First central wave should move initialization/use-case orchestration outside `World`, define a domain-owned dependency abstraction or colocate dependency graph in domain, and make commands depend on a stable world mutation port rather than making `World` import command classes.

## R2. God-modules block safe architectural change

**Impact:** Critical. Large multi-responsibility modules make changes risky, obscure ownership, and hide dead code.

**Likelihood:** High. The largest files align with central runtime paths.

**Evidence:** `SvgCanvas.vue` imports and coordinates model, rendering, tools, commands, stores, input, dialogs, and geometry (`frontend/src/components/workspace/SvgCanvas.vue:181`, `frontend/src/components/workspace/SvgCanvas.vue:183`, `frontend/src/components/workspace/SvgCanvas.vue:185`, `frontend/src/components/workspace/SvgCanvas.vue:188`, `frontend/src/components/workspace/SvgCanvas.vue:190`, `frontend/src/components/workspace/SvgCanvas.vue:192`, `frontend/src/components/workspace/SvgCanvas.vue:210`, `frontend/src/components/workspace/SvgCanvas.vue:212`). `ProjectionPlane.ts` combines plane abstractions, element ownership, dependency side effects, construction helpers, and fixed/auxiliary implementations (`frontend/src/domain/world/ProjectionPlane.ts:176`, `frontend/src/domain/world/ProjectionPlane.ts:248`, `frontend/src/domain/world/ProjectionPlane.ts:333`, `frontend/src/domain/world/ProjectionPlane.ts:399`, `frontend/src/domain/world/ProjectionPlane.ts:1533`, `frontend/src/domain/world/ProjectionPlane.ts:1635`). `World.ts`, `ThreeView.vue`, `App.vue`, `PaperService.ts`, and `ProjectService.ts` show similar concentration (`frontend/src/domain/world/World.ts:113`, `frontend/src/components/panels/ThreeView.vue:138`, `frontend/src/App.vue:273`, `frontend/src/services/PaperService.ts:108`, `frontend/src/services/ProjectService.ts:98`).

**Consequence:** A small domain or UI change may require understanding thousands of lines and multiple responsibilities, increasing regression risk and discouraging deletion of obsolete paths.

**Mitigation direction:** Split only after central ownership boundaries are decided. Avoid cosmetic splitting that preserves the same dependencies; extract around stable responsibilities such as domain collections, realization contexts, application use-cases, render adapters, and tool registry.

## R3. Parallel state models create inconsistent truth sources

**Impact:** High. Parallel `World`/store state paths can diverge, causing bugs that are hard to reproduce.

**Likelihood:** High. Both paths remain referenced.

**Evidence:** Current domain comments state `World → ProjectionPlane → Element2D` ownership and `World` stores projection planes/3D elements (`frontend/src/domain/world/World.ts:14`, `frontend/src/domain/world/World.ts:15`, `frontend/src/domain/world/World.ts:115`, `frontend/src/domain/world/World.ts:117`, `frontend/src/domain/world/World.ts:119`; `frontend/src/domain/world/ProjectionPlane.ts:190`, `frontend/src/domain/world/ProjectionPlane.ts:191`, `frontend/src/domain/world/ProjectionPlane.ts:192`). `worldStore` separately stores `elements2D`, `elements3D`, `guides`, and `DependencyGraph` (`frontend/src/stores/worldStore.ts:7`, `frontend/src/stores/worldStore.ts:8`, `frontend/src/stores/worldStore.ts:9`, `frontend/src/stores/worldStore.ts:10`). `useSnapping`, `useElementGeometry`, `ElementRenderer`, and `Workspace2D` import that store path (`frontend/src/composables/useSnapping.ts:2`, `frontend/src/composables/useElementGeometry.ts:11`, `frontend/src/components/workspace/ElementRenderer.vue:81`, `frontend/src/components/workspace/Workspace2D.vue:66`).

**Consequence:** Tooling or rendering code may read stale store state while commands mutate `World`, making correctness dependent on implicit synchronization that is not visible in the central domain model.

**Mitigation direction:** Choose one authoritative state source. Given current priorities and domain inventory, delete or replace legacy store-backed geometry paths rather than wrapping them.

## R4. Persistence is tightly coupled to concrete operations and private internals

**Impact:** High. Persistence becomes a change amplifier for every operation refactor.

**Likelihood:** High. Current code uses a central reconstruct switch and private casts.

**Evidence:** `ProjectService` imports many concrete operation classes (`frontend/src/services/ProjectService.ts:24`, `frontend/src/services/ProjectService.ts:32`, `frontend/src/services/ProjectService.ts:42`, `frontend/src/services/ProjectService.ts:60`, `frontend/src/services/ProjectService.ts:65`), serializes `(cmd as any).operations`, restores `(world as any).nextId`, reads `(op as any).parameters`, pushes into `(commandStack as any).undoStack`, and reconstructs by operation type (`frontend/src/services/ProjectService.ts:271`, `frontend/src/services/ProjectService.ts:313`, `frontend/src/services/ProjectService.ts:357`, `frontend/src/services/ProjectService.ts:370`, `frontend/src/services/ProjectService.ts:393`, `frontend/src/services/ProjectService.ts:398`).

**Consequence:** Operation renames or parameter changes require edits in multiple places, old migrations remain tempting to preserve, and private stack/world internals become de facto API.

**Mitigation direction:** Define a typed persistence contract and operation descriptor registry or intentionally switch to a domain snapshot model. Under no-backcompat priorities, remove migration branches and corrupted-operation fallbacks once the target contract is chosen.

## R5. UI components bypass use-case/application layer

**Impact:** High. Presentation code directly creates mutation operations, making UI changes and domain changes tightly coupled.

**Likelihood:** High. Multiple components do this today.

**Evidence:** `SvgCanvas.vue` imports `Command`, `UpdateElementStyleOp`, and `UpdateFreePoint2DPositionOp` (`frontend/src/components/workspace/SvgCanvas.vue:188`, `frontend/src/components/workspace/SvgCanvas.vue:189`, `frontend/src/components/workspace/SvgCanvas.vue:190`, `frontend/src/components/workspace/SvgCanvas.vue:191`). `ActionsPanel.vue` imports and uses process-tree operations (`frontend/src/components/panels/ActionsPanel.vue:55`, `frontend/src/components/panels/ActionsPanel.vue:56`, `frontend/src/components/panels/ActionsPanel.vue:57`, `frontend/src/components/panels/ActionsPanel.vue:58`, `frontend/src/components/panels/ActionsPanel.vue:59`, `frontend/src/components/panels/ActionsPanel.vue:60`). `Toolbar.vue` imports command and concrete add operations (`frontend/src/components/toolbars/Toolbar.vue:121`, `frontend/src/components/toolbars/Toolbar.vue:122`, `frontend/src/components/toolbars/Toolbar.vue:125`, `frontend/src/components/toolbars/Toolbar.vue:126`).

**Consequence:** Components become difficult to unit test without command/world internals, and validation/business rules may be duplicated across components and tools.

**Mitigation direction:** Introduce application use-cases/tool controllers that own command creation; keep Vue components as event/render surfaces.

## R6. Type contracts are too weak at key boundaries

**Impact:** High. Weak types hide schema drift and invalid operation data until runtime.

**Likelihood:** Medium. Tests catch some cases, but central interfaces remain broad.

**Evidence:** Operation parameters, outputs, and serialized-operation data are `Record<string, any>` / free-form fields (`frontend/src/commands/operations/IOperation.ts:118`, `frontend/src/commands/operations/IOperation.ts:128`, `frontend/src/commands/operations/IOperation.ts:134`, `frontend/src/commands/operations/IOperation.ts:136`, `frontend/src/commands/operations/IOperation.ts:160`). Projection-plane realizations use `world: any` (`frontend/src/domain/world/ProjectionPlane.ts:1428`, `frontend/src/domain/world/ProjectionPlane.ts:1436`, `frontend/src/domain/world/ProjectionPlane.ts:1689`, `frontend/src/domain/world/ProjectionPlane.ts:1747`). Backend `ProjectDTO` uses `Array<any>` and `root: any` (`backend/src/models/Project.ts:13`, `backend/src/models/Project.ts:14`, `backend/src/models/Project.ts:42`, `backend/src/models/Project.ts:50`).

**Consequence:** Clean refactors cannot rely on compiler feedback across serialization, realization, backend DTO, or operation boundaries.

**Mitigation direction:** Replace broad records with discriminated unions or typed descriptor contracts after the domain boundary is clarified.

## R7. Legacy/deprecated surfaces remain in active tree

**Impact:** Medium-High. Obsolete paths confuse contributors and can accidentally re-enter runtime.

**Likelihood:** High. Deprecated and missing-import paths are present.

**Evidence:** `ProcessTree.addAction()` is deprecated and remains callable (`frontend/src/domain/processTree/ProcessTree.ts:143`, `frontend/src/domain/processTree/ProcessTree.ts:150`). `ProcessTree.getActionsDependingOnElement()` is deprecated in favor of `DependencyService.getDependents()` (`frontend/src/domain/processTree/ProcessTree.ts:401`, `frontend/src/domain/processTree/ProcessTree.ts:404`, `frontend/src/domain/processTree/ProcessTree.ts:407`, `frontend/src/domain/processTree/ProcessTree.ts:411`). `Workspace2D.vue` imports legacy command subclass files (`frontend/src/components/workspace/Workspace2D.vue:71`, `frontend/src/components/workspace/Workspace2D.vue:72`, `frontend/src/components/workspace/Workspace2D.vue:73`, `frontend/src/components/workspace/Workspace2D.vue:74`, `frontend/src/components/workspace/Workspace2D.vue:75`, `frontend/src/components/workspace/Workspace2D.vue:76`) even though the architecture documents a sealed single-command model (`frontend/src/commands/Command.ts:49`, `frontend/src/commands/Command.ts:50`, `frontend/src/commands/Command.ts:69`).

**Consequence:** Future waves may waste effort preserving old APIs or preserving code that should be deleted under current priorities.

**Mitigation direction:** Aggressively delete obsolete components, deprecated methods, migration shims, and stale tests once their runtime reachability is confirmed.

## R8. Rendering architecture mixes domain, projection, and view concerns

**Impact:** Medium-High. Rendering changes can affect domain realization assumptions and vice versa.

**Likelihood:** High. Current render paths are intertwined.

**Evidence:** `PaperService` imports domain objects, world type, presentation primitives, style resolver, and low-level geometry helpers (`frontend/src/services/PaperService.ts:33`, `frontend/src/services/PaperService.ts:34`, `frontend/src/services/PaperService.ts:35`, `frontend/src/services/PaperService.ts:36`, `frontend/src/services/PaperService.ts:43`, `frontend/src/services/PaperService.ts:54`, `frontend/src/services/PaperService.ts:71`, `frontend/src/services/PaperService.ts:72`). `ThreeView.vue` performs scene setup, projection-plane rendering, 2D element rendering, 3D element rendering, guide geometry rendering, and hinge-line rendering in one component (`frontend/src/components/panels/ThreeView.vue:138`, `frontend/src/components/panels/ThreeView.vue:239`, `frontend/src/components/panels/ThreeView.vue:379`, `frontend/src/components/panels/ThreeView.vue:394`, `frontend/src/components/panels/ThreeView.vue:611`, `frontend/src/components/panels/ThreeView.vue:775`). `RenderService` contains test-only rendering paths while production uses `SVGRenderer` (`frontend/src/services/RenderService.ts:111`, `frontend/src/services/RenderService.ts:163`).

**Consequence:** 2D and 3D rendering rules may drift, and render-specific special cases may leak back into domain classes.

**Mitigation direction:** After domain/persistence boundaries, extract render DTO selectors and renderer adapters so components consume prepared view models rather than raw domain objects.

## R9. Backend is disconnected from standard root validation and frontend contract

**Impact:** Medium. Backend code can regress without root scripts catching it, and backend DTOs may drift from frontend persistence.

**Likelihood:** Medium. Backend is smaller and possibly optional, but it exists as a workspace.

**Evidence:** Root package declares `backend` as a workspace (`package.json:7`, `package.json:8`) but root `build`, `test`, and `lint` delegate only to frontend (`package.json:11`, `package.json:12`, `package.json:14`). Backend has separate build/test scripts (`backend/package.json:7`, `backend/package.json:8`, `backend/package.json:10`). Backend project routes and DTOs are independent of frontend `ProjectService` (`backend/src/api/projects.ts:4`, `backend/src/api/projects.ts:5`, `backend/src/models/Project.ts:13`, `backend/src/models/Project.ts:50`; `frontend/src/services/ProjectService.ts:70`, `frontend/src/services/ProjectService.ts:261`).

**Consequence:** Backend API/storage can remain structurally inconsistent with frontend project data until late validation.

**Mitigation direction:** Either delete/decouple unused backend surfaces if out of scope, or add an explicit shared contract and root validation when backend becomes central.

## R10. Tests do not enforce high-level architecture boundaries

**Impact:** Medium. Existing tests can pass while architectural erosion continues.

**Likelihood:** High. Current violations coexist with tests.

**Evidence:** Architecture tests exist for no command subclasses and serialization coverage (`frontend/tests/unit/architecture/noCommandSubclasses.spec.ts`, `frontend/tests/unit/architecture/serializationCoverage.spec.ts`), yet current source permits domain-to-command imports (`frontend/src/domain/world/World.ts:105`, `frontend/src/domain/world/World.ts:106`, `frontend/src/domain/world/World.ts:108`), domain-to-service imports (`frontend/src/domain/world/World.ts:94`), UI-to-operation imports (`frontend/src/components/workspace/SvgCanvas.vue:190`, `frontend/src/components/panels/ActionsPanel.vue:56`, `frontend/src/components/toolbars/Toolbar.vue:125`), and duplicate store/domain ownership (`frontend/src/stores/worldStore.ts:7`, `frontend/src/domain/world/World.ts:14`).

**Consequence:** Future refactors may improve behavior while preserving or worsening dependency direction and source-of-truth duplication.

**Mitigation direction:** Add architecture tests only after target boundaries are decided by the wave plan; otherwise tests may freeze the wrong structure.

## Candidate wave ordering implications

1. Start with the domain/application boundary (`World`, dependency graph ownership, initialization orchestration) because many other risks depend on it (`frontend/src/domain/world/World.ts:94`, `frontend/src/domain/world/World.ts:193`).
2. Then address authoritative state and persistence contracts so `worldStore`, `Workspace2D`, and `ProjectService` do not preserve parallel/legacy models (`frontend/src/stores/worldStore.ts:7`, `frontend/src/components/workspace/Workspace2D.vue:71`, `frontend/src/services/ProjectService.ts:393`).
3. Only after central data boundaries are stable, split rendering/UI god-modules and introduce component-facing DTO/selectors (`frontend/src/components/workspace/SvgCanvas.vue:181`, `frontend/src/components/panels/ThreeView.vue:138`, `frontend/src/services/PaperService.ts:108`).

## Corrections round 01 risk addendum

### Correction mapping

| Reviewer issue | Resolution |
|---|---|
| Reviewer-A C3 / Reviewer-B C3 | Reclassified `Workspace2D.vue` and `ElementRenderer.vue` as dead/uncompilable in R7. |
| Reviewer-B C2/C3 | Added `styleService.ts` and `Element2D.ts` domain-internal coupling risk. |
| Reviewer-A C4 / Reviewer-B C5 | Added frontend-backend monorepo import / disconnected backend clarification. |
| Reviewer-B C4 | Added README-only operation directories as deletion risk. |

### R7 correction. Legacy/deprecated surfaces include dead/uncompilable workspace files

`Workspace2D.vue` should be treated as dead/uncompilable code, not just a stale legacy path. It imports missing command-class modules (`frontend/src/components/workspace/Workspace2D.vue:71`, `frontend/src/components/workspace/Workspace2D.vue:72`, `frontend/src/components/workspace/Workspace2D.vue:73`, `frontend/src/components/workspace/Workspace2D.vue:74`, `frontend/src/components/workspace/Workspace2D.vue:75`, `frontend/src/components/workspace/Workspace2D.vue:76`) while the current command architecture is a sealed single `Command` plus operations (`frontend/src/commands/Command.ts:49`, `frontend/src/commands/Command.ts:50`, `frontend/src/commands/Command.ts:69`). A source-tree grep found no active source import of `Workspace2D.vue`. `ElementRenderer.vue` is reachable only from `Workspace2D.vue` and relies on `worldStore` (`frontend/src/components/workspace/ElementRenderer.vue:80`, `frontend/src/components/workspace/ElementRenderer.vue:81`, `frontend/src/components/workspace/Workspace2D.vue:37`, `frontend/src/components/workspace/Workspace2D.vue:69`). These files are low-risk deletion candidates and should not be wrapped or migrated.

### R11. Domain-internal style/realization coupling may block clean domain extraction

**Impact:** Medium. Even after removing obvious `World`→command imports, `Element2D.ts` and `styleService.ts` keep central domain types coupled to the whole `World` and process tree.

**Likelihood:** High. The imports are current and central.

**Evidence:** `Element2D.ts` imports `World` and requires `realize2D(world: World)` (`frontend/src/domain/world/Element2D.ts:1`, `frontend/src/domain/world/Element2D.ts:108`). `styleService.ts` imports `Element`, `World`, and `ProcessTree`, then resolves visibility by calling `world.getProcessTree()` and walking process nodes (`frontend/src/domain/world/styleService.ts:12`, `frontend/src/domain/world/styleService.ts:13`, `frontend/src/domain/world/styleService.ts:14`, `frontend/src/domain/world/styleService.ts:58`, `frontend/src/domain/world/styleService.ts:65`, `frontend/src/domain/world/styleService.ts:84`).

**Mitigation direction:** When the domain boundary wave extracts initialization and command dependencies, also define a narrow realization/visibility context or move style/description concerns out of core geometric entities.

### R12. Frontend-backend contract is a type leak plus disconnected runtime path

**Impact:** Medium. The backend can neither validate frontend persistence nor act as the authoritative project API while the frontend directly imports backend types but does not use backend routes.

**Likelihood:** Medium. Backend remains in the workspace and root validation skips it.

**Evidence:** `OpenProjectDialog.vue` imports `ProjectMetadata` from backend source (`frontend/src/components/dialogs/OpenProjectDialog.vue:57`). Frontend persistence uses `ProjectService` command serialization and Drive/local flows (`frontend/src/services/ProjectService.ts:261`, `frontend/src/services/ProjectService.ts:301`, `frontend/src/services/GoogleDriveService.ts:247`, `frontend/src/services/GoogleDriveService.ts:405`), while backend routes/DTOs are separate (`backend/src/api/projects.ts:4`, `backend/src/api/projects.ts:11`, `backend/src/models/Project.ts:6`, `backend/src/models/Project.ts:13`, `backend/src/models/Project.ts:50`).

**Mitigation direction:** Either delete the unused backend path from the architecture or introduce an explicit shared contract and frontend API client; do not preserve both as parallel project models.

### R13. Vacant operation directories encourage preserving non-existent architecture

**Impact:** Low-Medium. Placeholder operation directories can mislead future wave scoping and suggest operation families that do not exist.

**Likelihood:** High. `paper/` and `toolbar/` are README-only today.

**Evidence:** `frontend/src/commands/operations/` contains `paper/` and `toolbar/`, but each contains only `README.md` and no operation implementations. The paper placeholder lists `InvalidateCacheOp`, `SetVisibilityOp`, and `UpdateHighlightOp` only under "Future Operations" (`frontend/src/commands/operations/paper/README.md:7`, `frontend/src/commands/operations/paper/README.md:8`, `frontend/src/commands/operations/paper/README.md:9`, `frontend/src/commands/operations/paper/README.md:10`); the toolbar placeholder similarly lists `SetActiveToolOp`, `SetToolFeedbackOp`, and `SetToolOptionsOp` only under "Future Operations" (`frontend/src/commands/operations/toolbar/README.md:7`, `frontend/src/commands/operations/toolbar/README.md:8`, `frontend/src/commands/operations/toolbar/README.md:9`, `frontend/src/commands/operations/toolbar/README.md:10`).

**Mitigation direction:** Delete placeholder directories unless an implementation wave immediately replaces them with real operations.
