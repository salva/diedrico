# Baseline Quality Report — Current Develop Tree

Scope: current `develop` source tree only. This report lists concrete maintainability, type-safety, duplication, dead-code, and test-weakness findings with current-code citations.

## Executive summary

The most urgent code-quality problems are architectural rather than formatting-related: several files are too large and too multi-purpose; `World` and `ProjectionPlane` blend pure domain state with command/service side effects; legacy state paths (`worldStore`, `Workspace2D.vue`, deprecated process-tree methods) remain in the tree; serialization relies on `any`, private-field access, and a monolithic operation switch; and tests cover some architecture rules but do not enforce the larger dependency boundaries currently being violated.

## Code quality and module-size issues

### Q1. `SvgCanvas.vue` is a god component

`SvgCanvas.vue` is 1,867 lines and imports domain model, presentation model, rendering services, input service, command stack, command operations, every concrete tool, stores, coordinate utilities, and dialogs (`frontend/src/components/workspace/SvgCanvas.vue:181`, `frontend/src/components/workspace/SvgCanvas.vue:183`, `frontend/src/components/workspace/SvgCanvas.vue:184`, `frontend/src/components/workspace/SvgCanvas.vue:185`, `frontend/src/components/workspace/SvgCanvas.vue:186`, `frontend/src/components/workspace/SvgCanvas.vue:187`, `frontend/src/components/workspace/SvgCanvas.vue:188`, `frontend/src/components/workspace/SvgCanvas.vue:190`, `frontend/src/components/workspace/SvgCanvas.vue:192`, `frontend/src/components/workspace/SvgCanvas.vue:210`, `frontend/src/components/workspace/SvgCanvas.vue:212`, `frontend/src/components/workspace/SvgCanvas.vue:218`). It directly handles tool execution, command-stack injection, drag commits, clicks, wheel navigation, mouse handling, properties editing, and fit-to-view (`frontend/src/components/workspace/SvgCanvas.vue:314`, `frontend/src/components/workspace/SvgCanvas.vue:430`, `frontend/src/components/workspace/SvgCanvas.vue:1174`, `frontend/src/components/workspace/SvgCanvas.vue:1298`, `frontend/src/components/workspace/SvgCanvas.vue:1342`, `frontend/src/components/workspace/SvgCanvas.vue:1440`, `frontend/src/components/workspace/SvgCanvas.vue:1480`, `frontend/src/components/workspace/SvgCanvas.vue:1688`). This makes the primary canvas difficult to test or refactor in isolation.

### Q2. `ProjectionPlane.ts` is a domain god-module

`ProjectionPlane.ts` is 1,797 lines and contains realization classes, the abstract plane base, element maps/caches, dependency registration, point/line/circle creation/removal, guide/intersection helpers, fixed planes, and auxiliary projection planes (`frontend/src/domain/world/ProjectionPlane.ts:80`, `frontend/src/domain/world/ProjectionPlane.ts:126`, `frontend/src/domain/world/ProjectionPlane.ts:176`, `frontend/src/domain/world/ProjectionPlane.ts:190`, `frontend/src/domain/world/ProjectionPlane.ts:248`, `frontend/src/domain/world/ProjectionPlane.ts:333`, `frontend/src/domain/world/ProjectionPlane.ts:399`, `frontend/src/domain/world/ProjectionPlane.ts:858`, `frontend/src/domain/world/ProjectionPlane.ts:993`, `frontend/src/domain/world/ProjectionPlane.ts:1175`, `frontend/src/domain/world/ProjectionPlane.ts:1533`, `frontend/src/domain/world/ProjectionPlane.ts:1635`). It also exposes `realize2D(world: any)` / `realize3D(world: any)` contracts instead of a precise realization context (`frontend/src/domain/world/ProjectionPlane.ts:1428`, `frontend/src/domain/world/ProjectionPlane.ts:1436`, `frontend/src/domain/world/ProjectionPlane.ts:1578`, `frontend/src/domain/world/ProjectionPlane.ts:1600`, `frontend/src/domain/world/ProjectionPlane.ts:1689`, `frontend/src/domain/world/ProjectionPlane.ts:1747`).

### Q3. `World.ts` is both domain root and application initializer

`World.ts` is 1,339 lines and imports command/application dependencies (`frontend/src/domain/world/World.ts:94`, `frontend/src/domain/world/World.ts:105`, `frontend/src/domain/world/World.ts:106`, `frontend/src/domain/world/World.ts:108`, `frontend/src/domain/world/World.ts:109`, `frontend/src/domain/world/World.ts:110`). Its `initialize(commandStack)` path builds/pushes initialization commands (`frontend/src/domain/world/World.ts:193`, `frontend/src/domain/world/World.ts:214`), while the same class owns process tree and dependency service instances (`frontend/src/domain/world/World.ts:125`, `frontend/src/domain/world/World.ts:128`, `frontend/src/domain/world/World.ts:181`, `frontend/src/domain/world/World.ts:182`). This prevents a clean domain-only root and creates a high-impact dependency inversion.

### Q4. App shell mixes lifecycle, persistence, Drive auth, autosave, keyboard, and selection logic

`App.vue` creates the world, command stack, and optional Drive service (`frontend/src/App.vue:147`, `frontend/src/App.vue:151`, `frontend/src/App.vue:160`), initializes Google/local project state (`frontend/src/App.vue:273`, `frontend/src/App.vue:300`, `frontend/src/App.vue:323`), creates/opens projects through `ProjectService` and Drive (`frontend/src/App.vue:375`, `frontend/src/App.vue:416`, `frontend/src/App.vue:431`), owns autosave interval state (`frontend/src/App.vue:472`, `frontend/src/App.vue:491`, `frontend/src/App.vue:515`), and implements delete/select-all/active-plane/keyboard behavior (`frontend/src/App.vue:801`, `frontend/src/App.vue:838`, `frontend/src/App.vue:881`, `frontend/src/App.vue:905`, `frontend/src/App.vue:1014`, `frontend/src/App.vue:1024`). This violates separation between UI composition and application use-cases.

### Q5. 3D rendering is concentrated in a large component

`ThreeView.vue` is 1,201 lines and combines Three.js setup, CSS2D labels, domain realization access, store access, projection-plane rendering, 2D-on-3D rendering, 3D-element rendering, guide perpendicular planes, guide intersections, hinge lines, reference axes, animation, resize, and cleanup (`frontend/src/components/panels/ThreeView.vue:64`, `frontend/src/components/panels/ThreeView.vue:65`, `frontend/src/components/panels/ThreeView.vue:66`, `frontend/src/components/panels/ThreeView.vue:67`, `frontend/src/components/panels/ThreeView.vue:138`, `frontend/src/components/panels/ThreeView.vue:239`, `frontend/src/components/panels/ThreeView.vue:379`, `frontend/src/components/panels/ThreeView.vue:394`, `frontend/src/components/panels/ThreeView.vue:611`, `frontend/src/components/panels/ThreeView.vue:716`, `frontend/src/components/panels/ThreeView.vue:775`, `frontend/src/components/panels/ThreeView.vue:857`, `frontend/src/components/panels/ThreeView.vue:1040`, `frontend/src/components/panels/ThreeView.vue:1067`). A render adapter/service boundary is only partial (`frontend/src/components/panels/ThreeView.vue:71`).

## Type-safety weaknesses

### Q6. Serialization contracts use broad `any`

`IOperation` and serialization types require `Record<string, any>`, free-form serialized operation fields, and free-form outputs (`frontend/src/commands/operations/IOperation.ts:56`, `frontend/src/commands/operations/IOperation.ts:75`, `frontend/src/commands/operations/IOperation.ts:76`, `frontend/src/commands/operations/IOperation.ts:118`, `frontend/src/commands/operations/IOperation.ts:128`, `frontend/src/commands/operations/IOperation.ts:134`, `frontend/src/commands/operations/IOperation.ts:136`, `frontend/src/commands/operations/IOperation.ts:160`). `ProjectService.ProjectData.metadata` also accepts arbitrary keys (`frontend/src/services/ProjectService.ts:70`, `frontend/src/services/ProjectService.ts:95`). These shapes make operation compatibility and project-data validation mostly runtime concerns.

### Q7. `ProjectService` bypasses private state and uses `any` during deserialization

`ProjectService` reaches into private command/world internals with casts: it reads command operations via `(cmd as any).operations`, writes `world.nextId` via `(world as any).nextId`, inspects operation parameters via `(op as any).parameters`, and pushes onto `(commandStack as any).undoStack` (`frontend/src/services/ProjectService.ts:271`, `frontend/src/services/ProjectService.ts:313`, `frontend/src/services/ProjectService.ts:357`, `frontend/src/services/ProjectService.ts:370`). This is a strong signal that the command stack and serialization APIs are missing proper read/restore boundaries.

### Q8. Domain realization contexts are typed as `any`

Projection-plane realization methods accept `world: any` across the abstract and concrete classes (`frontend/src/domain/world/ProjectionPlane.ts:1428`, `frontend/src/domain/world/ProjectionPlane.ts:1436`, `frontend/src/domain/world/ProjectionPlane.ts:1578`, `frontend/src/domain/world/ProjectionPlane.ts:1600`, `frontend/src/domain/world/ProjectionPlane.ts:1689`, `frontend/src/domain/world/ProjectionPlane.ts:1747`). `World.addAction(action: any, groupName?: string): any` remains as a loose proxy to process tree (`frontend/src/domain/world/World.ts:930`, `frontend/src/domain/world/World.ts:931`). These weaken the most central domain boundary.

### Q9. Backend project DTO is not a contract-level model

The backend `ProjectDTO` uses `Array<any>` for 2D and 3D elements, `root: any` for process-tree state, and `Array<any>` for command operations (`backend/src/models/Project.ts:13`, `backend/src/models/Project.ts:14`, `backend/src/models/Project.ts:42`, `backend/src/models/Project.ts:50`). It therefore cannot independently validate the frontend command-sourced format described by `ProjectService` (`frontend/src/services/ProjectService.ts:261`, `frontend/src/services/ProjectService.ts:301`).

### Q10. Browser/global APIs are accessed through `any`

Autosave and 3D view handlers are stored on `window as any` (`frontend/src/App.vue:474`, `frontend/src/App.vue:491`, `frontend/src/App.vue:572`, `frontend/src/App.vue:1058`, `frontend/src/components/panels/ThreeView.vue:1143`, `frontend/src/components/panels/ThreeView.vue:1148`, `frontend/src/components/panels/ThreeView.vue:1151`). `GoogleDriveService` stores a token client as `any` and initializes Google Identity Services through `(window as any).google` (`frontend/src/services/GoogleDriveService.ts:56`, `frontend/src/services/GoogleDriveService.ts:89`, `frontend/src/services/GoogleDriveService.ts:100`, `frontend/src/services/GoogleDriveService.ts:159`, `frontend/src/services/GoogleDriveService.ts:189`, `frontend/src/services/GoogleDriveService.ts:226`). This makes external integration behavior hard to type-check and mock.

## Duplication and parallel paths

### Q11. Canonical world state is duplicated by legacy/store paths

The domain comments say `World → ProjectionPlane → Element2D` is the ownership hierarchy and `World` stores projection planes and 3D elements (`frontend/src/domain/world/World.ts:14`, `frontend/src/domain/world/World.ts:15`, `frontend/src/domain/world/World.ts:115`, `frontend/src/domain/world/World.ts:117`, `frontend/src/domain/world/World.ts:119`). `worldStore` nevertheless maintains its own `elements2D`, `elements3D`, `guides`, and dependency graph (`frontend/src/stores/worldStore.ts:7`, `frontend/src/stores/worldStore.ts:8`, `frontend/src/stores/worldStore.ts:9`, `frontend/src/stores/worldStore.ts:10`). `useSnapping`, `useElementGeometry`, and `Workspace2D.vue` still import/use that store pathway (`frontend/src/composables/useSnapping.ts:2`, `frontend/src/composables/useElementGeometry.ts:11`, `frontend/src/components/workspace/Workspace2D.vue:66`).

### Q12. Legacy command subclass imports remain in `Workspace2D.vue`

The current architecture explicitly rejects command subclasses (`frontend/src/commands/Command.ts:49`, `frontend/src/commands/Command.ts:50`, `frontend/src/commands/Command.ts:69`), and an architecture test exists to enforce this convention (`frontend/tests/unit/architecture/noCommandSubclasses.spec.ts`). Yet `Workspace2D.vue` imports legacy command-subclass-style modules for free points, point-on-element, intersections, segments, lines, and circles (`frontend/src/components/workspace/Workspace2D.vue:71`, `frontend/src/components/workspace/Workspace2D.vue:72`, `frontend/src/components/workspace/Workspace2D.vue:73`, `frontend/src/components/workspace/Workspace2D.vue:74`, `frontend/src/components/workspace/Workspace2D.vue:75`, `frontend/src/components/workspace/Workspace2D.vue:76`). This conflicts with the sealed-command direction and marks `Workspace2D.vue` as a likely obsolete or unreconciled UI path.

### Q13. Rendering has parallel service paths

`RenderService.ts` describes low-level rendering functions used by `PaperService`, but comments say line/plane rendering functions are only used in tests and production rendering uses `SVGRenderer` (`frontend/src/services/RenderService.ts:7`, `frontend/src/services/RenderService.ts:111`, `frontend/src/services/RenderService.ts:163`). Production canvas rendering flows through `SvgCanvas` → `PaperService` → `SVGRenderer` (`frontend/src/components/workspace/SvgCanvas.vue:167`, `frontend/src/components/workspace/SvgCanvas.vue:185`, `frontend/src/components/workspace/SvgCanvas.vue:186`, `frontend/src/components/workspace/SvgCanvas.vue:578`, `frontend/src/services/PaperService.ts:108`, `frontend/src/services/SVGRenderer.ts:54`). This leaves test-only rendering code in the source service layer.

### Q14. Process/dependency responsibilities overlap

`ProcessTree` still has deprecated action insertion and dependency-query methods (`frontend/src/domain/processTree/ProcessTree.ts:143`, `frontend/src/domain/processTree/ProcessTree.ts:150`, `frontend/src/domain/processTree/ProcessTree.ts:401`, `frontend/src/domain/processTree/ProcessTree.ts:404`, `frontend/src/domain/processTree/ProcessTree.ts:407`, `frontend/src/domain/processTree/ProcessTree.ts:411`), while `World` exposes `getDependencyService()` and `DependencyService` as the active dependency boundary (`frontend/src/domain/world/World.ts:921`, `frontend/src/services/DependencyService.ts:25`, `frontend/src/services/DependencyService.ts:34`, `frontend/src/services/DependencyService.ts:42`). This indicates incomplete deletion of the prior process-tree-as-dependency source.

## Dead code, TODOs, and obsolete surfaces

### Q15. TODOs document incomplete behavior in user-facing paths

`App.vue` has unimplemented highlight/clear-highlight handlers and a TODO for error feedback (`frontend/src/App.vue:641`, `frontend/src/App.vue:650`, `frontend/src/App.vue:680`). `PaperService` has TODOs for visibility/infeasibility and missing element types (`frontend/src/services/PaperService.ts:202`, `frontend/src/services/PaperService.ts:238`, `frontend/src/services/PaperService.ts:343`, `frontend/src/services/PaperService.ts:437`, `frontend/src/services/PaperService.ts:610`, `frontend/src/services/PaperService.ts:888`). `SVGRenderer` has a TODO around actual canvas dimensions (`frontend/src/services/SVGRenderer.ts:220`). These TODOs sit on rendering/feedback paths and should either become explicit wave scope or be deleted if obsolete.

### Q16. Migration and compatibility code remains despite current refactor priorities

`ProjectService` includes schema migration helpers, migration logging, and corrupted-operation compatibility handling (`frontend/src/services/ProjectService.ts:188`, `frontend/src/services/ProjectService.ts:235`, `frontend/src/services/ProjectService.ts:236`, `frontend/src/services/ProjectService.ts:248`, `frontend/src/services/ProjectService.ts:427`, `frontend/src/services/ProjectService.ts:428`). Because current objectives assign zero weight to backward compatibility and migration smoothness, this is a likely deletion candidate once persistence contracts are refactored.

### Q17. Debug logging is embedded throughout application and service code

`App.vue` logs credential state and autosave behavior (`frontend/src/App.vue:144`, `frontend/src/App.vue:522`), `ProjectService` logs migration/deserialization internals (`frontend/src/services/ProjectService.ts:235`, `frontend/src/services/ProjectService.ts:317`, `frontend/src/services/ProjectService.ts:321`, `frontend/src/services/ProjectService.ts:326`, `frontend/src/services/ProjectService.ts:353`, `frontend/src/services/ProjectService.ts:366`), `PaperService` logs rendering internals (`frontend/src/services/PaperService.ts:146`, `frontend/src/services/PaperService.ts:156`, `frontend/src/services/PaperService.ts:158`), and `GoogleDriveService` logs API/auth details and Drive file operations (`frontend/src/services/GoogleDriveService.ts:82`, `frontend/src/services/GoogleDriveService.ts:108`, `frontend/src/services/GoogleDriveService.ts:475`, `frontend/src/services/GoogleDriveService.ts:527`, `frontend/src/services/GoogleDriveService.ts:556`, `frontend/src/services/GoogleDriveService.ts:631`). This adds noise and risks exposing integration metadata in normal browser consoles.

## Test and validation weaknesses

### Q18. Root scripts do not validate backend

The root workspace declares both `frontend` and `backend` (`package.json:7`, `package.json:8`), but root `build`, `test`, and `lint` only delegate to frontend scripts (`package.json:11`, `package.json:12`, `package.json:14`). The backend has its own build/test scripts (`backend/package.json:7`, `backend/package.json:8`, `backend/package.json:10`), but they are not part of the root validation path. This makes backend regressions easy to miss during standard root-level checks.

### Q19. Architecture tests cover narrow rules but not the observed layer violations

There is an architecture test for no command subclasses (`frontend/tests/unit/architecture/noCommandSubclasses.spec.ts`) and serialization coverage (`frontend/tests/unit/architecture/serializationCoverage.spec.ts`), but current source still allows the domain root to import commands/services (`frontend/src/domain/world/World.ts:94`, `frontend/src/domain/world/World.ts:105`, `frontend/src/domain/world/World.ts:106`, `frontend/src/domain/world/World.ts:108`, `frontend/src/domain/world/World.ts:109`), UI components to import operations directly (`frontend/src/components/workspace/SvgCanvas.vue:190`, `frontend/src/components/panels/ActionsPanel.vue:56`, `frontend/src/components/toolbars/Toolbar.vue:125`), and legacy store paths to persist (`frontend/src/stores/worldStore.ts:7`, `frontend/src/components/workspace/Workspace2D.vue:66`). No baseline evidence shows tests enforcing these broader architectural boundaries.

### Q20. Backend tests are minimal relative to DTO looseness

Backend integration tests exist for project API behavior (`backend/tests/integration/projects.spec.ts:7`, `backend/tests/integration/projects.spec.ts:9`), but the DTO accepts broad `any` fields for elements, process tree, and operations (`backend/src/models/Project.ts:13`, `backend/src/models/Project.ts:14`, `backend/src/models/Project.ts:42`, `backend/src/models/Project.ts:50`). This limits the ability of backend tests to catch contract drift between frontend persistence and backend storage.

## Prioritized cleanup candidates for future waves

1. Establish a domain/application boundary by removing command/service imports from `World.ts` and moving initialization orchestration out of the domain root (`frontend/src/domain/world/World.ts:94`, `frontend/src/domain/world/World.ts:105`, `frontend/src/domain/world/World.ts:193`).
2. Split `ProjectionPlane.ts` by responsibilities: realization types, base plane abstraction, element collection, fixed plane, auxiliary plane, and construction helpers (`frontend/src/domain/world/ProjectionPlane.ts:80`, `frontend/src/domain/world/ProjectionPlane.ts:176`, `frontend/src/domain/world/ProjectionPlane.ts:1533`, `frontend/src/domain/world/ProjectionPlane.ts:1635`).
3. Delete or replace legacy `worldStore`/`Workspace2D.vue`/old command subclass paths if they are not part of the current app shell (`frontend/src/stores/worldStore.ts:7`, `frontend/src/components/workspace/Workspace2D.vue:71`).
4. Replace `ProjectService`'s monolithic switch and private-field casts with typed operation descriptors/registries or a clean snapshot/command contract (`frontend/src/services/ProjectService.ts:271`, `frontend/src/services/ProjectService.ts:313`, `frontend/src/services/ProjectService.ts:370`, `frontend/src/services/ProjectService.ts:393`).
5. Extract application use-cases from `App.vue`, `SvgCanvas.vue`, `ActionsPanel.vue`, and `Toolbar.vue` so UI components stop constructing operations directly (`frontend/src/App.vue:375`, `frontend/src/components/workspace/SvgCanvas.vue:190`, `frontend/src/components/panels/ActionsPanel.vue:56`, `frontend/src/components/toolbars/Toolbar.vue:125`).

## Corrections round 01 quality addendum

### Correction mapping

| Reviewer issue | Resolution |
|---|---|
| Reviewer-A C3 / Reviewer-B C3 | Strengthened Q12: `Workspace2D.vue` and `ElementRenderer.vue` are dead/uncompilable deletion candidates. |
| Reviewer-B C4 | Added README-only `paper/` and `toolbar/` operation directories as deletion candidates. |
| Reviewer-A Q7 note / Reviewer-B Q7 note | Clarified private casts as an API/contract gap. |
| Reviewer-A C4 / Reviewer-B C5 | Added frontend-backend direct import as a quality finding. |

### Q12 correction. `Workspace2D.vue` and `ElementRenderer.vue` are dead/uncompilable deletion candidates

The earlier Q12 understated the issue. `Workspace2D.vue` does not merely conflict with the sealed-command direction; it imports six command-class modules that are absent from the current `frontend/src/commands/` directory (`frontend/src/components/workspace/Workspace2D.vue:71`, `frontend/src/components/workspace/Workspace2D.vue:72`, `frontend/src/components/workspace/Workspace2D.vue:73`, `frontend/src/components/workspace/Workspace2D.vue:74`, `frontend/src/components/workspace/Workspace2D.vue:75`, `frontend/src/components/workspace/Workspace2D.vue:76`). The current command directory contains only `Command.ts`, `CommandStack.ts`, `factories/`, and `operations/`, while the architecture explicitly says command subclasses are not allowed (`frontend/src/commands/Command.ts:49`, `frontend/src/commands/Command.ts:50`, `frontend/src/commands/Command.ts:69`). A source-tree grep found no active import of `Workspace2D.vue`.

`ElementRenderer.vue` is also part of that dead path: it imports legacy structural `ElementTypes` and `worldStore` (`frontend/src/components/workspace/ElementRenderer.vue:80`, `frontend/src/components/workspace/ElementRenderer.vue:81`, `frontend/src/components/workspace/ElementRenderer.vue:88`, `frontend/src/components/workspace/ElementRenderer.vue:95`), and its sole active source import is `Workspace2D.vue` (`frontend/src/components/workspace/Workspace2D.vue:37`, `frontend/src/components/workspace/Workspace2D.vue:69`). Both files should be treated as immediate deletion candidates rather than compatibility surfaces.

### Q21. Vacant operation directories are README-only placeholders

`frontend/src/commands/operations/paper/` and `frontend/src/commands/operations/toolbar/` contain only `README.md` files and no operation implementations. The paper README's concrete content is a "Future Operations" list (`frontend/src/commands/operations/paper/README.md:7`, `frontend/src/commands/operations/paper/README.md:8`, `frontend/src/commands/operations/paper/README.md:9`, `frontend/src/commands/operations/paper/README.md:10`), and the toolbar README has the same future-only shape (`frontend/src/commands/operations/toolbar/README.md:7`, `frontend/src/commands/operations/toolbar/README.md:8`, `frontend/src/commands/operations/toolbar/README.md:9`, `frontend/src/commands/operations/toolbar/README.md:10`). Under the current no-backcompat/aggressive-deletion priorities, these are dead specification placeholders unless a wave immediately implements them. They should be deleted rather than preserved as aspirational architecture.

### Q22. Frontend imports backend implementation type directly

`OpenProjectDialog.vue` imports `ProjectMetadata` from `../../../../backend/src/models/Project` (`frontend/src/components/dialogs/OpenProjectDialog.vue:55`, `frontend/src/components/dialogs/OpenProjectDialog.vue:56`, `frontend/src/components/dialogs/OpenProjectDialog.vue:57`). This creates cross-workspace build coupling without establishing a shared contract package. The same dialog then uses the frontend `projectService` rather than backend HTTP routes (`frontend/src/components/dialogs/OpenProjectDialog.vue:56`, `frontend/src/components/dialogs/OpenProjectDialog.vue:68`), reinforcing that the import is a type leak rather than a clean API boundary.

### Q7 correction. Private casts indicate a missing persistence/command contract

The `ProjectService` private-field casts are not only type-safety weaknesses; they show that command serialization/restore needs capabilities the `Command`/`CommandStack` APIs do not expose. Evidence remains `(cmd as any).operations`, `(world as any).nextId`, `(op as any).parameters`, and `(commandStack as any).undoStack` (`frontend/src/services/ProjectService.ts:271`, `frontend/src/services/ProjectService.ts:313`, `frontend/src/services/ProjectService.ts:357`, `frontend/src/services/ProjectService.ts:370`). A future wave should define an explicit persistence contract or delete command-sourced restore if a snapshot contract replaces it.
