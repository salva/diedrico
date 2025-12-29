# Tasks: Diedrico Dihedral Learning MVP

**Input**: Design documents from `/specs/001-dihedral-learning-mvp/`  
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/, research.md, quickstart.md

**Tests**: Per Diedrico Constitution (Principle V: Test-Driven Development), tests are MANDATORY and must be written BEFORE implementation.

**Organization**: Tasks follow the 27 incremental phases from plan.md, organized to enable layer-by-layer development.

**Constitution Compliance**: All tasks respect:
- Layered Architecture (Principle I) - Domain → Application → Presentation → Data
- Command Pattern (Principle II) - All user actions as commands
- Frontend-First (Principle III) - Backend only for persistence
- Technology Discipline (Principle IV) - Vue.js 3, TypeScript, Node.js, Vite, Vitest, Playwright

## Format: `- [ ] [ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

---

## Phase 1: Basic World Data Structures

**Purpose**: Minimal data model foundation  
**Reference**: [spec.md](./spec.md#conceptual-model-user-pov) - Conceptual Model, [data-model.md](./data-model.md) - World structure

- [ ] T001 [P] Create World class in frontend/src/domain/world/World.ts with array storage for elements
- [ ] T002 [P] Create Point class in frontend/src/domain/world/Point.ts with x, y coordinates and unique ID
- [ ] T003 [P] Add point storage methods to World (add, remove, getById)
- [ ] T004 [P] Unit test for World class in frontend/tests/unit/domain/world.spec.ts
- [ ] T005 [P] Unit test for Point class in frontend/tests/unit/domain/point.spec.ts

**Checkpoint**: Basic data structures ready for rendering

---

## Phase 2: Minimal UI Skeleton

**Purpose**: Basic Vue.js application structure  
**Reference**: [ui-spec.md](./ui-spec.md#application-layout) - UI Layout and Components

- [ ] T006 Setup Vue.js 3 + TypeScript + Vite configuration in frontend/
- [ ] T007 Create App.vue with basic layout structure (header, main workspace, footer)
- [ ] T008 [P] Create SvgCanvas.vue component in frontend/src/components/canvas/ (empty SVG for now)
- [ ] T009 [P] Add basic CSS styling in frontend/src/assets/styles/
- [ ] T010 Mount SvgCanvas in App.vue main workspace area

**Checkpoint**: Application loads and displays empty canvas

---

## Phase 3: Render Fixed Elements

**Purpose**: Display projection planes and coordinate system  
**Reference**: [spec.md](./spec.md#projection-planes) - Projection Planes P_V and P_H, [spec.md](./spec.md#hinge-lines-hl-and-broken-hinge-lines-bhl) - Hinge Lines

- [ ] T011 [P] Create Plane class in frontend/src/domain/world/Plane.ts with boundaries and normal vector
- [ ] T012 Add P_V and P_H fixed planes to World initialization
- [ ] T013 Add origin point (O) and hinge line (HL_HV) to World
- [ ] T014 [P] Create coordinate transformation utilities in frontend/src/domain/calculations/CoordinateTransform.ts (world → SVG)
- [ ] T015 Render P_V and P_H as SVG rectangles in SvgCanvas.vue
- [ ] T016 Render origin point (O) as SVG circle
- [ ] T017 Render hinge line (HL_HV) as SVG line
- [ ] T018 [P] Apply distinct visual styles to fixed elements (colors, stroke widths)
- [ ] T019 [P] Unit test for Plane class in frontend/tests/unit/domain/plane.spec.ts
- [ ] T020 [P] Unit test for CoordinateTransform in frontend/tests/unit/calculations/transform.spec.ts

**Checkpoint**: Fixed elements visible on canvas (US1 partial - workspace initialized)

---

## Phase 4: Render Points

**Purpose**: Display user-created points  
**Reference**: [spec.md](./spec.md#2d-elements-explicit-entities) - 2D Elements (Points)

- [ ] T021 Add point rendering to SvgCanvas.vue (loop through World.points, create SVG circles)
- [ ] T022 [P] Apply point styling (color, radius) from Point properties
- [ ] T023 [P] Create visual style types in frontend/src/types/StyleTypes.ts

**Checkpoint**: Points from World data structure render on canvas

---

## Phase 5: Create Free Points (US1 - Partial)

**Purpose**: First user interaction - placing points  
**Reference**: [spec.md](./spec.md#us1-place-point-on-active-plane) - US1 Place Point on Active Plane

- [ ] T024 [P] Create Toolbar.vue component in frontend/src/components/toolbars/
- [ ] T025 Add "Point" tool button to Toolbar
- [ ] T026 Create tool store in frontend/src/stores/toolStore.ts for active tool tracking
- [ ] T027 Add click handler to SvgCanvas for point creation
- [ ] T028 Transform SVG click coordinates to world coordinates
- [ ] T029 Create Point instance and add to World on canvas click
- [ ] T030 Trigger canvas re-render when point added
- [ ] T031 [P] E2E test for point creation in frontend/tests/e2e/create-point.spec.ts

**Checkpoint**: User can click Point tool and place points on canvas (US1 partial)

---

## Phase 6: Basic Viewport Pan/Zoom (US6 - Partial)

**Purpose**: Canvas navigation  
**Reference**: [spec.md](./spec.md#workspace-and-views) - Workspace Navigation (Pan: Shift+drag, Zoom: mouse wheel)

- [ ] T032 Create useViewport composable in frontend/src/composables/useViewport.ts
- [ ] T033 Create viewStore in frontend/src/stores/viewStore.ts for pan/zoom state
- [ ] T034 Add mouse drag handler for panning (Shift + drag or Space + drag)
- [ ] T035 Add mouse wheel handler for zooming
- [ ] T036 Update CoordinateTransform to apply view transformation
- [ ] T037 Apply transform to SVG rendering in SvgCanvas
- [ ] T038 [P] Unit test for viewStore in frontend/tests/unit/stores/viewStore.spec.ts
- [ ] T039 [P] E2E test for pan/zoom in frontend/tests/e2e/viewport.spec.ts

**Checkpoint**: User can navigate canvas (US6 partial - viewport manipulation)

---

## Phase 7: Add 2D Lines

**Purpose**: Support line geometry  
**Reference**: [spec.md](./spec.md#2d-elements-explicit-entities) - 2D Elements (Lines)

- [ ] T040 [P] Create Line class in frontend/src/domain/world/Line.ts with two Point endpoints
- [ ] T041 Add line storage to World class
- [ ] T042 Render lines as SVG line elements in SvgCanvas.vue
- [ ] T043 [P] Apply line styling (color, stroke width)
- [ ] T044 [P] Unit test for Line class in frontend/tests/unit/domain/line.spec.ts

**Checkpoint**: Lines can be stored and rendered

---

## Phase 8: Line Creation Tool (US2 - Partial)

**Purpose**: Create lines between points  
**Reference**: [spec.md](./spec.md#us2-create-points-lines-circles) - US2 Create Points, Lines, Circles

- [ ] T045 Add "Line" tool button to Toolbar
- [ ] T046 Create useSnapping composable in frontend/src/composables/useSnapping.ts
- [ ] T047 Implement point snapping logic (detect nearby points within radius)
- [ ] T048 Add visual feedback for snapped point (highlight)
- [ ] T049 Implement two-point selection for line tool
- [ ] T050 Create Line instance from two selected points
- [ ] T051 Add line to World and re-render
- [ ] T052 [P] E2E test for line creation in frontend/tests/e2e/create-line.spec.ts

**Checkpoint**: User can create lines between points with snapping (US2 partial)

---

## Phase 9: Add Process Tree

**Purpose**: Track construction history  
**Reference**: [spec.md](./spec.md#process-tree) - Process Tree structure, [data-model.md](./data-model.md#process-tree) - ProcessTree data model

- [ ] T053 [P] Create ProcessTree class in frontend/src/domain/processTree/ProcessTree.ts
- [ ] T054 [P] Create Action interface in frontend/src/domain/processTree/Action.ts
- [ ] T055 [P] Create CreatePointAction class in frontend/src/domain/processTree/actions/CreatePointAction.ts
- [ ] T056 [P] Create CreateLineAction class in frontend/src/domain/processTree/actions/CreateLineAction.ts
- [ ] T057 Add ProcessTree instance to World
- [ ] T058 Record CreatePointAction when point created
- [ ] T059 Record CreateLineAction when line created
- [ ] T060 [P] Unit test for ProcessTree in frontend/tests/unit/processTree/processTree.spec.ts
- [ ] T061 [P] Unit test for Action classes in frontend/tests/unit/processTree/actions.spec.ts

**Checkpoint**: Construction actions tracked in process tree (US6 partial - history tracking)

---

## Phase 10: Command Pattern

**Purpose**: Undoable operations  
**Reference**: [constitution.md](../../.specify/memory/constitution.md#principle-ii-command-pattern-for-all-user-actions) - Command Pattern Principle

- [ ] T062 [P] Create Command interface in frontend/src/commands/Command.ts with execute/undo/validate
- [ ] T063 [P] Create CommandStack class in frontend/src/commands/CommandStack.ts
- [ ] T064 [P] Create CreateFreePointCommand in frontend/src/commands/CreateFreePointCommand.ts
- [ ] T065 [P] Create CreateLineCommand in frontend/src/commands/CreateLineCommand.ts
- [ ] T066 Refactor point creation to use CreateFreePointCommand
- [ ] T067 Refactor line creation to use CreateLineCommand
- [ ] T068 Add Undo button to toolbar
- [ ] T069 Add Redo button to toolbar
- [ ] T070 Implement Ctrl+Z keyboard shortcut for undo
- [ ] T071 Implement Ctrl+Y keyboard shortcut for redo
- [ ] T072 [P] Unit test for CommandStack in frontend/tests/unit/commands/commandStack.spec.ts
- [ ] T073 [P] Unit test for CreateFreePointCommand in frontend/tests/unit/commands/createFreePoint.spec.ts
- [ ] T074 [P] E2E test for undo/redo in frontend/tests/e2e/undo-redo.spec.ts

**Checkpoint**: All operations undoable/redoable (Constitution Principle II satisfied)

---

## Phase 11: Add Segments (US2 - Partial)

**Purpose**: Finite line segments  
**Reference**: [spec.md](./spec.md#2d-elements-explicit-entities) - 2D Elements (Segments)

- [ ] T075 [P] Create Segment class in frontend/src/domain/world/Segment.ts with start/end points
- [ ] T076 Add segment storage to World
- [ ] T077 Render segments as SVG path elements in SvgCanvas.vue
- [ ] T078 Add "Segment" tool button to Toolbar
- [ ] T079 [P] Create CreateSegmentCommand in frontend/src/commands/CreateSegmentCommand.ts
- [ ] T080 Implement segment creation tool (two-point selection)
- [ ] T081 [P] Unit test for Segment class in frontend/tests/unit/domain/segment.spec.ts
- [ ] T082 [P] E2E test for segment creation in frontend/tests/e2e/create-segment.spec.ts

**Checkpoint**: User can create segments (US2 partial - more geometry types)

---

## Phase 12: Add Circles (US2 - Complete)

**Purpose**: Circle geometry  
**Reference**: [spec.md](./spec.md#2d-elements-explicit-entities) - 2D Elements (Circles), [spec.md](./spec.md#us2-create-points-lines-circles) - US2

- [ ] T083 [P] Create Circle class in frontend/src/domain/world/Circle.ts with center point and radius
- [ ] T084 Add circle storage to World
- [ ] T085 Render circles as SVG circle elements in SvgCanvas.vue
- [ ] T086 Add "Circle" tool button to Toolbar
- [ ] T087 [P] Create CreateCircleCommand in frontend/src/commands/CreateCircleCommand.ts
- [ ] T088 Implement circle center selection
- [ ] T089 Implement radius specification (drag or click second point)
- [ ] T090 [P] Unit test for Circle class in frontend/tests/unit/domain/circle.spec.ts
- [ ] T091 [P] E2E test for circle creation in frontend/tests/e2e/create-circle.spec.ts

**Checkpoint**: User can create circles (US2 complete for basic geometry)

---

## Phase 13: Add Guides (US3 - Complete)

**Purpose**: Guide lines perpendicular to hinge lines  
**Reference**: [spec.md](./spec.md#guides) - Guides definition, [spec.md](./spec.md#us3-create-guide-perpendicular-to-hinge-line) - US3 Create Guide

- [ ] T092 [P] Create Guide class in frontend/src/domain/world/Guide.ts (line perpendicular to HL through point)
- [ ] T093 Add guide storage to World
- [ ] T094 [P] Implement guide calculation using homogeneous coordinates - perpendicular to HL
- [ ] T095 Render guides as dashed SVG lines in SvgCanvas.vue (extend to viewport edges)
- [ ] T096 Add "Guide" tool button to Toolbar
- [ ] T097 [P] Create CreateGuideCommand in frontend/src/commands/CreateGuideCommand.ts
- [ ] T098 Implement guide creation: select HL, then select point
- [ ] T099 Apply guide on both planes sharing the HL (guide appears in both)
- [ ] T100 [P] Unit test for guide calculations in frontend/tests/unit/calculations/guides.spec.ts
- [ ] T101 [P] E2E test for guide creation in frontend/tests/e2e/guide-creation.spec.ts

**Checkpoint**: User can create guides (US3 complete)

**Constitution Note**: Guide calculations MUST use general geometric algorithms, not hardcoded for specific planes (Principle IV)

---

## Phase 14: Line-Line Intersections (US2 - Partial)

**Purpose**: Create intersection points  
**Reference**: [spec.md](./spec.md#us2-create-points-lines-circles) - US2 includes intersection points

- [ ] T102 [P] Implement line-line intersection calculation in frontend/src/domain/calculations/Intersections.ts using homogeneous coordinates
- [ ] T103 Handle parallel lines (no intersection, return null)
- [ ] T104 Handle coincident lines (infinite intersections, return null or special case)
- [ ] T105 Add "Intersection" tool button to Toolbar
- [ ] T106 [P] Create CreateIntersectionPointCommand in frontend/src/commands/CreateIntersectionPointCommand.ts
- [ ] T107 Implement intersection tool: select first line
- [ ] T108 Implement intersection tool: select second line
- [ ] T109 Calculate and create point at intersection
- [ ] T110 Show error message if lines are parallel (infeasibility preview)
- [ ] T111 [P] Unit test for line-line intersection in frontend/tests/unit/calculations/intersections.spec.ts
- [ ] T112 [P] E2E test for line-line intersection in frontend/tests/e2e/intersections.spec.ts

**Checkpoint**: User can create intersection points (US2 partial)

**Constitution Note**: Intersection calculations MUST use homogeneous coordinates (Principle V) and work for any lines, not hardcoded cases (Principle IV)

---

## Phase 15: Point Transport via Guides (US4 - Complete)

**Purpose**: Transport points between planes using guides  
**Reference**: [spec.md](./spec.md#us4-transport-point-via-guide-between-planes) - US4 Point Transport via Guides

- [ ] T113 [P] Implement point transport calculation in frontend/src/domain/calculations/Transport.ts using geometric principles
- [ ] T114 [P] Transport MUST use homogeneous coordinates and matrix transformations (Principle V)
- [ ] T115 Validate that guide is perpendicular to hinge line
- [ ] T116 Validate that source point and target plane are compatible
- [ ] T117 Add "Transport Point" tool button to Toolbar
- [ ] T118 [P] Create TransportPointCommand in frontend/src/commands/TransportPointCommand.ts
- [ ] T119 Implement transport tool: select source point
- [ ] T120 Implement transport tool: select guide
- [ ] T121 Calculate transported point on opposite plane
- [ ] T122 Create new point at transported location
- [ ] T123 Record dependency: transported point depends on source + guide (ProcessTree)
- [ ] T124 [P] Unit test for point transport calculations in frontend/tests/unit/calculations/transport.spec.ts
- [ ] T125 [P] E2E test for point transport in frontend/tests/e2e/point-transport.spec.ts

**Checkpoint**: User can transport points between planes (US4 complete)

**Constitution Note**: Transport calculations MUST be principle-based, working for any guide/plane combination (Principle IV), using homogeneous coordinates (Principle V)

---

## Phase 16: Distance Transport (US5 - Complete)

**Purpose**: Transport distances along guides  
**Reference**: [spec.md](./spec.md#us5-transport-distance-via-guide) - US5 Distance Transport via Guides

- [ ] T126 [P] Implement distance transport calculation in frontend/src/domain/calculations/Transport.ts
- [ ] T127 [P] Use homogeneous coordinates for distance vector representation (Principle V)
- [ ] T128 Validate that segment and target point are on different planes
- [ ] T129 Validate that guide passes through target point
- [ ] T130 Add "Transport Distance" tool button to Toolbar
- [ ] T131 [P] Create TransportDistanceCommand in frontend/src/commands/TransportDistanceCommand.ts
- [ ] T132 Implement distance transport tool: select source segment (defines distance)
- [ ] T133 Implement distance transport tool: select guide
- [ ] T134 Implement distance transport tool: select target point
- [ ] T135 Calculate new point at transported distance from target along guide
- [ ] T136 Handle bidirectional distance (both directions from target)
- [ ] T137 Record dependency: new point depends on segment + guide + target (ProcessTree)
- [ ] T138 [P] Unit test for distance transport in frontend/tests/unit/calculations/transport.spec.ts
- [ ] T139 [P] E2E test for distance transport in frontend/tests/e2e/distance-transport.spec.ts

**Checkpoint**: User can transport distances (US5 complete)

**Constitution Note**: Distance transport MUST be derived from geometric principles, not hardcoded (Principle IV)

---

## Phase 17: More Intersection Types (US2 - Complete)

**Purpose**: Expand intersection capabilities  
**Reference**: [spec.md](./spec.md#us2-create-points-lines-circles) - US2 all intersection types

- [ ] T140 [P] Implement line-circle intersection in frontend/src/domain/calculations/Intersections.ts using homogeneous coordinates
- [ ] T141 Handle 0, 1, or 2 intersection points for line-circle
- [ ] T142 [P] Implement circle-circle intersection using homogeneous coordinates
- [ ] T143 Handle 0, 1, or 2 intersection points for circle-circle
- [ ] T144 Extend "Intersection" tool to support line-circle selection
- [ ] T145 Extend "Intersection" tool to support circle-circle selection
- [ ] T146 When multiple intersection points exist, allow user to choose which to create
- [ ] T147 [P] Unit tests for line-circle and circle-circle intersections in frontend/tests/unit/calculations/intersections.spec.ts
- [ ] T148 [P] E2E tests for all intersection types in frontend/tests/e2e/intersections.spec.ts

**Checkpoint**: All intersection types supported (US2 complete for intersections)

**Constitution Note**: All intersection algorithms MUST use homogeneous coordinates (Principle V) and general geometric algorithms (Principle IV)

---

## Phase 18: Actions Panel

**Purpose**: Display construction history in UI  
**Reference**: [ui-spec.md](./ui-spec.md#actions-panel-left-sidebar) - Actions Panel specification

- [ ] T149 [P] Create ActionsPanel.vue component in frontend/src/components/panels/
- [ ] T150 Retrieve actions from ProcessTree and display as list
- [ ] T151 Show action type, parameters, and dependencies for each action
- [ ] T152 Add filter dropdown to filter by action type
- [ ] T153 Add search input to search actions by name/parameters
- [ ] T154 Implement click handler to highlight related objects on canvas when action selected
- [ ] T155 Add icon/indicator for action status (complete, infeasible, pending)
- [ ] T156 Mount ActionsPanel in App.vue left sidebar
- [ ] T157 [P] Unit test for ActionsPanel in frontend/tests/unit/components/actionsPanel.spec.ts

**Checkpoint**: Construction history visible and interactive

---

## Phase 19: Elements Panel

**Purpose**: Display all geometric objects  
**Reference**: [ui-spec.md](./ui-spec.md#elements-panel-right-sidebar) - Elements Panel specification

- [ ] T158 [P] Create ElementsPanel.vue component in frontend/src/components/panels/
- [ ] T159 Retrieve all elements from World and display as list
- [ ] T160 Organize elements by type (Points, Lines, Segments, Circles, Guides)
- [ ] T161 Show element labels, IDs, and key properties (coordinates, etc.)
- [ ] T162 Add filter to show/hide element types
- [ ] T163 Add search to find elements by label or ID
- [ ] T164 Implement click handler to highlight element on canvas when selected
- [ ] T165 Add visibility toggle for each element (show/hide)
- [ ] T166 Mount ElementsPanel in App.vue right sidebar
- [ ] T167 [P] Unit test for ElementsPanel in frontend/tests/unit/components/elementsPanel.spec.ts

**Checkpoint**: All geometric objects visible in panel

---

## Phase 20: Object Selection

**Purpose**: Select objects on canvas  
**Reference**: [ui-spec.md](./ui-spec.md#interactions) - Selection behavior

- [ ] T168 [P] Create selectionStore in frontend/src/stores/selectionStore.ts
- [ ] T169 Implement click detection for objects on SVG canvas
- [ ] T170 Add selected object ID to selectionStore on click
- [ ] T171 Apply selection highlight style to selected objects (different stroke/fill)
- [ ] T172 Implement Ctrl+click for multi-select (add to selection)
- [ ] T173 Implement click on empty area to clear selection
- [ ] T174 Sync selection between canvas and ElementsPanel (bidirectional)
- [ ] T175 Sync selection between canvas and ActionsPanel (show related actions)
- [ ] T176 [P] Unit test for selectionStore in frontend/tests/unit/stores/selectionStore.spec.ts
- [ ] T177 [P] E2E test for object selection in frontend/tests/e2e/selection.spec.ts

**Checkpoint**: Objects can be selected on canvas and panels

---

## Phase 21: Hover Highlighting (US6 - Partial)

**Purpose**: Visual feedback on hover  
**Reference**: [spec.md](./spec.md#us6-hover-highlighting-visual-style-editing-3d-view) - US6 Hover Highlighting

- [ ] T178 [P] Create useHoverHighlight composable in frontend/src/composables/useHoverHighlight.ts
- [ ] T179 Implement mouseover detection for objects on canvas
- [ ] T180 Apply hover highlight style (different from selection, e.g., lighter stroke)
- [ ] T181 Show object label/tooltip on hover
- [ ] T182 Clear hover highlight on mouseout
- [ ] T183 Ensure hover highlight doesn't interfere with selection highlight
- [ ] T184 Show snap preview when hovering near points (for snapping feedback)
- [ ] T185 [P] Unit test for useHoverHighlight in frontend/tests/unit/composables/hoverHighlight.spec.ts
- [ ] T186 [P] E2E test for hover highlighting in frontend/tests/e2e/hover.spec.ts

**Checkpoint**: User can see visual feedback on hover (US6 partial)

---

## Phase 22: Element Properties (US6 - Complete)

**Purpose**: View and edit object properties  
**Reference**: [spec.md](./spec.md#us6-hover-highlighting-visual-style-editing-3d-view) - US6 Visual Style Editing, [ui-spec.md](./ui-spec.md#visual-style-inheritance) - Style Inheritance

- [ ] T187 [P] Create PropertiesDialog.vue component in frontend/src/components/dialogs/
- [ ] T188 Show dialog when user double-clicks object or clicks "Properties" button
- [ ] T189 Display all editable properties based on element type:
  - Point: x, y, label, visibility
  - Line/Segment: color, stroke width, line style (solid/dashed)
  - Circle: color, stroke width, fill color, fill opacity
  - Guide: color, dash pattern
- [ ] T190 [P] Create color picker component for color selection
- [ ] T191 Create stroke width slider input
- [ ] T192 Create line style selector (solid, dashed, dotted)
- [ ] T193 Apply property changes to selected object(s) immediately (or on "Apply" button)
- [ ] T194 Implement style inheritance system (objects inherit from tool defaults)
- [ ] T195 Add "Override inherited style" checkbox for each property
- [ ] T196 Add "Reset to inherited" button to restore default styles
- [ ] T197 Show indicator for which styles are overridden
- [ ] T198 Validate property changes (e.g., coordinates must keep point on same plane)
- [ ] T199 [P] Unit test for PropertiesDialog in frontend/tests/unit/components/propertiesDialog.spec.ts
- [ ] T200 [P] E2E test for property editing in frontend/tests/e2e/properties.spec.ts

**Checkpoint**: User can edit element properties and visual styles (US6 complete for styling)

---

## Phase 23: Dependency Tracking

**Purpose**: Track which objects depend on others  
**Reference**: [spec.md](./spec.md#process-tree) - Process Tree tracks dependencies

- [ ] T201 [P] Create DependencyService in frontend/src/services/DependencyService.ts
- [ ] T202 [P] Store dependencies in ProcessTree when actions are executed
- [ ] T203 Implement dependency recording: when creating derived object, record its dependencies
- [ ] T204 [P] Implement getDependents(elementId) to find all objects that depend on given element
- [ ] T205 [P] Implement getDependencies(elementId) to find all elements that given object depends on
- [ ] T206 When element changes (e.g., point moved), update all dependent objects
- [ ] T207 Add visual indicators in ActionsPanel showing dependencies (arrows/tree links)
- [ ] T208 Add visual indicators in ElementsPanel showing which elements have dependencies
- [ ] T209 Prevent circular dependencies during validation
- [ ] T210 [P] Unit test for DependencyService in frontend/tests/unit/services/dependencyService.spec.ts
- [ ] T211 [P] E2E test for dependency tracking in frontend/tests/e2e/dependencies.spec.ts

**Checkpoint**: Dependencies tracked and objects update when sources change

---

## Phase 24: Infeasibility Detection

**Purpose**: Detect and handle geometrically impossible operations  
**Reference**: [spec.md](./spec.md#infeasibility) - Infeasibility concept and handling, [spec.md](./spec.md#us2-create-points-lines-circles) - US2 intersection infeasibility

- [ ] T212 [P] Create ValidationService in frontend/src/services/ValidationService.ts
- [ ] T213 Implement validation for line-line intersection: detect parallel lines (return infeasible)
- [ ] T214 Implement validation for point transport: verify guide is perpendicular to hinge
- [ ] T215 Implement validation for distance transport: verify all geometric constraints
- [ ] T216 [P] Add infeasibility status to Action nodes in ProcessTree (feasible/infeasible)
- [ ] T217 Mark action as infeasible in ProcessTree when validation fails
- [ ] T218 Cascade infeasibility to dependent objects (if parent infeasible, children infeasible)
- [ ] T219 Display infeasible actions in ActionsPanel with red indicator
- [ ] T220 Display infeasible elements in ElementsPanel with red color/warning icon
- [ ] T221 Show error message/tooltip explaining why operation is infeasible
- [ ] T222 Prevent execution of operations that depend on infeasible objects
- [ ] T223 Dynamically revalidate when dependencies change (infeasibility may resolve)
- [ ] T224 [P] Unit test for ValidationService in frontend/tests/unit/services/validationService.spec.ts
- [ ] T225 [P] E2E test for infeasibility detection in frontend/tests/e2e/infeasibility.spec.ts

**Checkpoint**: Infeasible operations detected and marked (US2, US4, US5 complete for error handling)

**Constitution Note**: Validation MUST be based on geometric principles, not hardcoded cases (Principle IV)

---

## Phase 25: 3D View Panel (US6 - Complete)

**Purpose**: Display 3D reconstruction of dihedral geometry  
**Reference**: [spec.md](./spec.md#workspace-and-views) - 3D View (Auxiliary, Read-Only), [spec.md](./spec.md#3d-elements-derived-not-edited) - 3D element derivation

- [ ] T226 [P] Create ThreeDView.vue component in frontend/src/components/panels/
- [ ] T227 Choose 3D rendering approach: CSS 3D transforms (simple) or Three.js (full-featured)
- [ ] T228 Set up 3D scene with projection planes (P_V and P_H) in 3D space
- [ ] T229 Render hinge line (HL_HV) in 3D
- [ ] T230 [P] Implement 3D point derivation: calculate 3D coordinates from 2D projections using homogeneous coordinates (Principle V)
- [ ] T231 [P] Implement 3D line derivation: construct 3D lines from 2D projections
- [ ] T232 Render 3D objects derived from 2D projections in 3D view
- [ ] T233 [P] 3D derivation MUST use geometric principles, not hardcoded for specific planes (Principle IV)
- [ ] T234 Implement 3D rotation with mouse drag
- [ ] T235 Implement 3D pan and zoom
- [ ] T236 Color-code planes and objects (match 2D colors)
- [ ] T237 Add toggle controls for plane visibility (show/hide P_V, P_H)
- [ ] T238 Highlight 3D objects when corresponding 2D objects selected
- [ ] T239 Mount ThreeDView panel in App.vue (floating overlay or docked panel)
- [ ] T240 [P] Unit test for 3D derivation calculations in frontend/tests/unit/calculations/derivation3D.spec.ts
- [ ] T241 [P] E2E test for 3D view in frontend/tests/e2e/3d-view.spec.ts

**Checkpoint**: 3D reconstruction visible (US6 complete)

**Constitution Note**: 3D derivation MUST use homogeneous coordinates (Principle V) and work for any plane configuration (Principle IV)

---

## Phase 26: File Save/Load (US1 - Complete)

**Purpose**: Persist projects to files  
**Reference**: [spec.md](./spec.md#us1-place-point-on-active-plane) - US1 includes persistence requirement, [contracts/api.yaml](./contracts/api.yaml) - API contracts

- [ ] T242 [P] Create ProjectService in frontend/src/services/ProjectService.ts
- [ ] T243 Implement World serialization to JSON (serialize all elements, ProcessTree, view state)
- [ ] T244 Implement World deserialization from JSON (reconstruct all objects)
- [ ] T245 Add version number to JSON format for future compatibility
- [ ] T246 Validate loaded JSON data (check structure, types, required fields)
- [ ] T247 Create backend API endpoint: POST /api/projects (create new project file)
- [ ] T248 Create backend API endpoint: GET /api/projects (list all project files)
- [ ] T249 Create backend API endpoint: GET /api/projects/:id (load project by ID)
- [ ] T250 Create backend API endpoint: PUT /api/projects/:id (update existing project)
- [ ] T251 Create backend API endpoint: DELETE /api/projects/:id (delete project)
- [ ] T252 Implement file storage in backend/src/storage/FileStorage.ts (write/read JSON files)
- [ ] T253 Add "Save" button to toolbar/menu
- [ ] T254 Add "Load" button to toolbar/menu
- [ ] T255 Add "New" button to clear workspace and start fresh
- [ ] T256 Implement auto-save every N seconds (configurable, default 60s)
- [ ] T257 Store unsaved changes indicator in UI (show "modified" status)
- [ ] T258 Prompt user to save before closing/navigating away (if unsaved changes)
- [ ] T259 [P] Unit test for serialization/deserialization in frontend/tests/unit/services/projectService.spec.ts
- [ ] T260 [P] Integration test for backend API in backend/tests/integration/projects.spec.ts
- [ ] T261 [P] E2E test for save/load in frontend/tests/e2e/persistence.spec.ts

**Checkpoint**: Projects can be saved and loaded (US1 complete)

---

## Phase 27: Additional UI Polish

**Purpose**: Improve overall user experience  
**Reference**: [ui-spec.md](./ui-spec.md#settings) - Settings and preferences, [spec.md](./spec.md#workspace-and-views) - Navigation shortcuts

- [ ] T262 [P] Create SettingsDialog.vue component in frontend/src/components/dialogs/
- [ ] T263 Add settings for snap radius (configurable distance for point snapping)
- [ ] T264 Add settings for grid (enabled, spacing, color, snap-to-grid option)
- [ ] T265 Add settings for default object styles (default colors, stroke widths)
- [ ] T266 Add settings for auto-save interval
- [ ] T267 Add keyboard shortcuts customization panel
- [ ] T268 Implement Ctrl+S keyboard shortcut for Save
- [ ] T269 Implement Ctrl+O keyboard shortcut for Open
- [ ] T270 Implement Ctrl+N keyboard shortcut for New project
- [ ] T271 Implement Ctrl+A keyboard shortcut for Select All
- [ ] T272 Implement Delete/Backspace key for deleting selected objects
- [ ] T273 Implement Esc key to cancel current operation/deselect
- [ ] T274 Implement tool keyboard shortcuts (P for Point, L for Line, S for Segment, C for Circle, G for Guide)
- [ ] T275 Add "Fit to View" button and Ctrl+0 shortcut (zoom to show all objects)
- [ ] T276 Implement grid display with zoom-adaptive spacing
- [ ] T277 Add grid toggle button (show/hide grid)
- [ ] T278 Create StatusBar.vue component showing current mouse coordinates in world space
- [ ] T279 Show active plane indicator in status bar
- [ ] T280 Show active tool name in status bar
- [ ] T281 Persist user preferences to localStorage
- [ ] T282 Load preferences on application startup
- [ ] T283 [P] Unit test for settings persistence in frontend/tests/unit/stores/settingsStore.spec.ts
- [ ] T284 [P] E2E test for keyboard shortcuts in frontend/tests/e2e/keyboard-shortcuts.spec.ts

**Checkpoint**: Polished user experience with keyboard shortcuts, settings, and grid (All user stories refined)

---

## Testing & Documentation (Phase 28)

**Purpose**: Ensure quality and document the system

- [ ] T285 Review all unit tests ([P] priority tasks) - ensure coverage >80%
- [ ] T286 Review all E2E tests - ensure all user workflows covered
- [ ] T287 Create user documentation in docs/user-guide.md
- [ ] T288 Document all tools and operations
- [ ] T289 Create example constructions for documentation
- [ ] T290 Create developer documentation in docs/developer-guide.md
- [ ] T291 Document architecture and layers
- [ ] T292 Document data model and ProcessTree
- [ ] T293 Document coordinate systems and transformations
- [ ] T294 Document homogeneous coordinate usage (Constitution Principle V)
- [ ] T295 Add JSDoc comments to all classes and public methods
- [ ] T296 Create architecture diagrams (layers, data flow)
- [ ] T297 Update README.md with project overview and setup instructions
- [ ] T298 [P] Run full test suite and verify 100% passing
- [ ] T299 [P] Performance test: verify smooth rendering with 200+ elements
- [ ] T300 [P] Performance test: verify hover response <100ms

**Checkpoint**: All testing complete, documentation ready

---

## Summary

**Total Tasks**: 300  
**Priority Tasks ([P])**: ~120 (40%)  
**Constitution-Critical Tasks**: ~40 tasks explicitly reference constitution principles

### Task Distribution by Phase

- Phases 1-6 (Foundation): T001-T039 (39 tasks)
- Phases 7-13 (Basic Geometry): T040-T101 (62 tasks)
- Phases 14-17 (Advanced Geometry): T102-T148 (47 tasks)
- Phases 18-22 (UI Features): T149-T200 (52 tasks)
- Phases 23-25 (Advanced Features): T201-T241 (41 tasks)
- Phase 26 (Persistence): T242-T261 (20 tasks)
- Phase 27 (Polish): T262-T284 (23 tasks)
- Phase 28 (Testing/Docs): T285-T300 (16 tasks)

### Constitution Compliance Notes

Throughout all tasks, the following constitutional principles are enforced:

- **Principle I (Layered Architecture)**: Domain, Application, Presentation, and Data layers maintained
- **Principle II (Command Pattern)**: All user actions as undoable commands (Phase 10+)
- **Principle III (Frontend-First)**: All geometry calculations in frontend, backend only for persistence
- **Principle IV (Principle-Based Rendering)**: NO hardcoded special cases, all calculations from geometric principles
- **Principle V (Homogeneous Coordinates)**: Mandatory for all geometric calculations, explicitly noted in T094, T102, T114, T127, T140, T142, T230, T233

### Testing Strategy

- **Unit Tests**: All [P] priority tasks include unit tests (~120 tests)
- **E2E Tests**: Key user workflows covered (construction, transport, infeasibility, persistence)
- **Constitution Tests**: Verify no hardcoded cases, homogeneous coordinates used, layers maintained

### Ready for Implementation

All 300 tasks are defined with clear deliverables and dependencies. Implementation can proceed incrementally, phase by phase, with each phase building on the previous one.

