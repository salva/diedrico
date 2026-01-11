# Not yet planned

This file contains diverse ideas which need to be included in the project.

In general, any idea needs to...

1. Be described in specs.md (unless it is a purely technical issue).
2. Be described in ui-specs.md if it has a UI component.
3. Have its implementation detailed in data-model.md.
4. Be broken down into smaller implementable tasks in tasks.md.
5. Include corresponding testing tasks.
6. Be marked here as done and move it to the already planned section.

Note that completing these tasks may require asking the user for additional information and clarification. When in doubt, just ask!!!


## FOR PLANING

* [ ] There are still many facade methods in the World class which must be removed (for instance, getAllPoints2D or similar). There are also special case methods as get_HV() which unless they are justified should be removed. In general, performa a cleanup of this clase.
* [ ] Add infrastructure for handling tool argument types and automate the argument entry. For instance, IntersectionTool requires two objects with may be lines (any variation) and/or circles. Circle requires two points. We need to envision a system where the type of the (unordered) arguments could be passed and it would handle the data entry (with the mouse).
* [ ] Show contextual tool feedback: display what the user has already done and what is expected next. For instance, "Creating line: pick two points", or "Creating line: point A selected, pick second point".
* [ ] Implement proper toolbar behaviour as described in ui-specs.md (similar to Geogebra classic).
* [ ] Add support for moving semi-free points and distances along guide lines.
* [ ] Verify if 3D visualization support is already planned. If not, plan and implement it.
* [ ] Fix display of subscripts in UI elements (currently they appear as corrupted characters, e.g., "5�subscriptH�").
* [ ] Improve element naming: currently points are assigned generic numeric names; implement meaningful default names.
* [ ] Improve how elements are shown in the left world listing widget.
* [ ] check tests marked as SKIP and check whether they make sense (they are testing some useful functionality or mimicing some common user behaviour) in that case enable and fix them. In many cases you would need to recreate them fully as they may had become architecturally obsolete. Check model-plan in order to decide the best way to implement the functionality. Ask for clarification when needed. Also, if functionality has been removed and is required, tell me about it!!!
* [ ] When initializing a new project, instead of doing it using ad-hoc actions, use a initialization command with a set of predefined ops. Also, create a subprocess called Worl initialization and place all the init objects there.
* [ ] When we load a project, instead of cleaning the old World, just create a new one and forget everything about the old. Maybe already done?
* [ ] Do not use type aliases in the code.
* [ ] Ensure all tools perform argument validation checks (for instance, when creating a line, that two different points are used, etc.). Add comprehensive tests for this feature.
* [ ] Add support for creating new Point2D elements by clickin on random paper places while building other elements instead of forcing the user to use a preexistent point.
* [ ] Add support for converting intersections into points automatically while building other elements.
* [ ] Add tests for intersections with segments (two segments, segment and line, segment and circle). If the intersection points fall outside the segment, they must be marked as infeasible.
* [ ] When an intersection point has a index of one, but it is infeasible, the index 0 must be considered instead. Check explicitly that segment/circle intersections are handled correctly in that regard.
* [ ] When calculating realizations, check that when two parent points degenerate into the same position they are handled correctly, maybe marking the realization as infeasible.
* [ ] Remove any methods and classes tagged as deprecated. Modify client code and tests to use the right interfaces (or remove it when it doesn't make sense any more).
* [ ] Add tool for creating line parallel to another one passing by given point.
* [ ] Add tool for creating line perpendicular to another one passing by given point.
* [ ] Add tool for creating line tangent to circle passing by given point (needs an index to indicate which side to use, similar to intersection points with circles).
* [ ] Add tool for creating line tangent to circle and parallel to line (needs index also)
* [ ] Add validations checking that the just created objects are feasible, or otherwise the creation is aborted. All the 2D elements must implement a method for checking whether they are feasible or not.
* [ ] Refactor the selection mask to use classes instead of strings. Strings can not handle hierarchy constructions which we are using pervasively.
* [ ] Add all the missing Ops for inserting and removing specific actions from the process tree. Then, ensure that the operations are inserted in the commands so that the Process tree is keep syncroniced with the world!
* [ ] Activate or fix undo & redo buttoms.
* [ ] Ensure that intersections with segments are handled correctly. Add exhaustive tests for all the possible object combinations and geometric dispositions.
* [ ] It seems we still have methods in world for retrieving realizations (for instance, world.getLine2DRealization()). Remove all of them and change the client code to go directly to the projection plane.


## ALREADY PLANNED

* [X] Introduce a set of factory methods with the logic for creating common sequences of Ops (for instance, creating a new intersection point and its sibling and including them in the process tree, on cascade delete, etc.). Those sequences could be easily tested. The sequences to implement should not be decided in a creative way, but extracted from current tool implementations. Those sequence builders should get as input an open Command object.
  - **STATUS**: ✅ PLANNED - Phase 43 created
  - **Problem**: Tools contain complex logic for building multi-operation commands, duplicating patterns across codebase
  - **Current Examples of Repeated Patterns**:
    - Guide creation with sibling (GuideTool.ts lines 125-179): Primary guide + conditional sibling + bidirectional links
    - Cascade deletion (App.vue lines 660-760): Topological sort + type-specific RemoveOps + process tree cleanup
    - Auxiliary element creation (CircleTool, SegmentTool): Create aux points + group in ProcessTree
    - Intersection point creation (IntersectionTool.ts): Primary intersection + conditional sibling for HHL
  - **Solution**: Extract patterns to factory methods in `frontend/src/commands/factories/`
  - **Pattern**: Factories receive open Command object, add operations directly, handle conditionals
  - **Architecture**: Operations atomic → factories compose → tools call factories
  - **Design Principle**: Factories are domain-specific (GuideSequenceFactory, IntersectionSequenceFactory), not abstract (❌ AuxiliaryElementFactory)
    - Each factory encapsulates specific domain logic
    - Factory knows what operations to create
    - Caller doesn't need to know operation details
  - **Implementation**: Phase 43 with 12 tasks (T477-T488)
  - **Task Categories**:
    - Directory setup (T477): Create factories/, README.md documenting pattern and design principles
    - GuideSequenceFactory (T478-T480): Extract guide+sibling creation from GuideTool
    - DeletionSequenceFactory (T481-T483): Extract cascade deletion from App.vue
    - Testing (T479, T482, T484): Unit tests for factories, integration tests for commands
    - Documentation (T485): Already complete in data-model.md
    - IntersectionSequenceFactory (T486-T488): Extract type detection and sibling logic from IntersectionTool
  - **Benefits**:
    - Testability: Pure functions, easy to unit test sequences
    - Reusability: Same logic used by multiple tools
    - Maintainability: Pattern centralized, not duplicated
    - Clarity: Tools focus on interaction, factories handle sequencing
    - Extracted from real code: Patterns from actual tool implementations
  - **Success Criteria**: GuideSequenceFactory, DeletionSequenceFactory, and IntersectionSequenceFactory tested and used, tools simplified, all tests passing
  - **Broader Pattern**: Most construction tools follow similar pattern (create world elements → process tree actions → conditionals). After Phase 43, evaluate creating factories for other tools (CircleSequenceFactory, SegmentSequenceFactory, etc.) if complexity warrants it. Decision criteria: create factory if multiple operations/conditionals, skip if trivial.
  - **Future**: When new patterns emerge (appears in 2+ places), extract to factory
  - **Open Command Pattern**: Factories accept `cmd: Command` parameter, add operations via `cmd.addAndExecute()`, return void
  - **Example Usage**:
    ```typescript
    // Tool creates command and calls factory
    const cmd = new Command('Create guide', world);
    GuideSequenceFactory.createGuideWithSibling(cmd, planeId, referenceLineId, throughPointId, world);
    // Tool handles: process tree actions, commit, push to stack, feedback
    cmd.commit();
    commandStack.push(cmd);
    ```
  - **Data Model**: Updated [data-model.md §Operation Sequence Factory Methods](./data-model.md#operation-sequence-factory-methods) with complete specification
  - **Timing**: After Phase 42 (sibling intersections) but before new tool development

* [X] Ensure that Ops are simple objects which only do basic tasks. For instance, on cascade deletion must not be handled in the op, but on the command construction (the method building the command is the responsible for following dependency relations, retrieving all the objects, sorting them and implementing the cascade deletion by introducing a specific op in the command for every object). Another example, we must have an intersection op for every two types of intersecting objects, and is the tool the one which must pick the right op.
  - **STATUS**: ✅ ALREADY CORRECT - Architecture verified
  - **Cascade Deletion**: Command construction in App.vue already follows correct pattern:
    1. `dependencyService.getElementsInDeletionOrder()` computes cascade and sorts by dependency depth
    2. Returns elements in reverse topological order (dependents first, roots last)
    3. Command construction adds one RemoveOp per element (RemovePoint2DOp, RemoveLine2DOp, etc.)
    4. Each operation is simple: stores element state, calls plane.removePoint(), no cascade logic
  - **Separation Verified**: `handleDeleteSelected()` in App.vue lines 660-760
  - **Operation Simplicity**: RemoveElementOps.ts operations only handle single element removal
  - **Specialized Intersections**: Already implemented in Phase 32:
    - AddLineLineIntersectionPoint2DOp (line-line)
    - AddLineCircleIntersectionPoint2DOp (line-circle)  
    - AddCircleCircleIntersectionPoint2DOp (circle-circle)
  - **Tool Responsibility**: IntersectionTool.ts detects types and picks correct operation
  - **Constitution Compliance**: Operations are atomic, command handles composition
  - **No Action Needed**: Architecture already matches specification perfectly

* [X] Reorganize operation files into component-based folders (world/, processTree/, paper/, toolbar/, viewState/) for better cohesion and maintainability.
  - **STATUS**: ✅ PLANNED - Phase 41 created
  - **Problem**: All 19 operation classes scattered in flat directory structure (`frontend/src/commands/operations/`), mixing concerns
  - **Current State**: AddFreePointOp, AddLineOp, RemoveElementOps, ProcessTreeOperations all in same folder
  - **Proposed Structure**: 5 component folders organizing operations by which component they modify
  - **Components**: World (geometry), ProcessTree (history), Paper (rendering), Toolbar (UI controls), ViewState (presentation)
  - **Benefits**: 
    - **Cohesion**: All World operations co-located and easy to find
    - **Clear ownership**: Obvious which component each operation affects
    - **Separation of concerns**: Domain (world/) vs rendering (paper/) vs UI (toolbar/)
    - **Cross-component composition**: Commands can still compose ops from multiple folders
    - **Scalability**: New component → new folder, pattern established
  - **Architecture**: Updated data-model.md with §Component-Based Operation Organization
  - **Implementation**: Phase 41 with 16 core tasks (T446-T461) + 2 optional (T462-T463)
  - **Task categories**:
    - Create folder structure (T446): 5 component folders + READMEs
    - Migrate operations (T447-T449): Move 19 operations to correct folders (world/, processTree/, viewState/)
    - Barrel exports (T450): index.ts for cleaner imports
    - Update imports (T451-T454): ProjectService, tools, commands, all consumers
    - Architectural tests (T455-T456): Enforce organization, prevent future violations
    - Integration testing (T457-T458): Cross-component commands, full E2E workflow
    - Code cleanup (T459-T460): Remove deprecated files (WorldOperations.ts, DependencyOperations.ts)
    - Documentation (T461): Update operation development guide
  - **Optional**: Create Paper/Toolbar operations (T462-T463) - can be added incrementally after core migration
  - **Success Criteria**: All operations organized, no imports broken, old projects still load, architectural tests enforce structure
  - **Risk Mitigation**: Systematic import updates, test after each batch, verify serialization still works
  - **Schema Impact**: None - purely organizational refactoring, no serialization format change
  - **Timing**: After Phase 40 completion (command sourcing fully functional), before new operation types added

* [X] Ensure ALL operation types can be serialized to prevent data loss on project save/load. Currently only 8 of 19 operation types are serializable, meaning deletions and style changes are lost!
  - **STATUS**: ✅ PLANNED - Phase 40 created
  - **Problem**: ProjectService.reconstructOperation() only handles 8 operation types (creation), but 19 operation classes exist
  - **Critical Data Loss**: Operations NOT saved: RemovePoint2D, RemoveLine2D, RemoveSegment2D, RemoveCircle2D, RemoveGuide2D (deletions), AddSiblingGuide2D, UpdateElementStyle, RemoveActionFromProcessTree/Group/Subprocess
  - **Impact**: Users delete elements or change styles → save project → reload → changes are LOST (only creates persisted)
  - **Architecture**: Command sourcing pattern (projects saved as command history, not final state)
  - **Benefits**: Audit trail, reproducibility, smaller files, parametric updates
  - **Requirements**: Operations must be deterministic, serializable (no closures), self-contained
  - **Implementation**: Phase 40 with 15 tasks (T431-T445)
  - **Task categories**: 
    - Add missing serialization cases (T431-T436): 11 operation types to ProjectService switch
    - Architectural test for coverage (T437): Prevent future gaps
    - Round-trip serialization tests (T438): Verify no data loss
    - Determinism tests (T439): Same commands → same result
    - Self-containment tests (T440): No external dependencies
    - Documentation (T441): Requirements for future operations
    - Schema migration framework (T442): Future enhancement
    - Integration tests (T443-T444): Cascade deletion, E2E workflow
    - Schema version bump (T445): 3.0.0 → 3.1.0
  - **Data Model**: Updated §Persistence Entity: Project to reflect command sourcing (only commands array persisted)
  - **Data Model**: Added §Command Sourcing Architecture explaining pattern, benefits, requirements
  - **Success Criteria**: All 19 operations serializable, architectural test enforces coverage, no data loss
  - **Current Coverage**: 8/19 operations (42% complete) - AddFreePoint2D, AddLine2D, AddSegment2D, AddCircle2D, intersection types, AddGuide2D
  - **Schema Version**: Bump to 3.1.0 after completion (currently 3.0.0)
  - **Timing**: URGENT - users currently experiencing data loss on any project with deletions or style changes

* [X] Consider introducing a `Project` class to encapsulate world, commandStack, visualization configuration and metadata for cleaner lifecycle management. Best done when domain model stabilizes.
  - **STATUS**: ❌ CANCELLED - Not needed (misunderstanding about existing architecture)
  - **Original Misunderstanding**: Thought Project entity was only a spec, wanted runtime class
  - **Reality**: Project entity is PERSISTENCE FORMAT (command sourcing), not runtime object
  - **Current Architecture**: App.vue manages World/CommandStack/metadata as separate reactive refs - this is correct
  - **What Exists**: ProjectService for serialization/deserialization via command replay
  - **What Changed**: User clarified "serialization must only contain command stack" - already implemented!
  - **Lesson**: Always verify existing implementation before planning major refactoring
  - **Actual Issue**: Command sourcing incomplete (only 8/19 ops serializable) → Phase 40 addresses this
  - **Note**: If runtime Project class needed in future, revisit after Phase 40 complete

* [X] Display Google Drive login status in the UI, including user profile information if Google provides it.
  - **STATUS**: ✅ PLANNED - Phase 38 created
  - UI Specification: Added §Google Drive Login Status Widget to ui-spec.md
  - Position: Far right of toolbar (after all tool groups)
  - States: "Sign in" button (unauthenticated) → Avatar + name + dropdown (authenticated)
  - Profile data: name, email, picture from Google Identity Services userinfo endpoint
  - Dropdown menu: Shows email, "Sign Out" button, future account settings
  - Responsive: Full name on wide screens, first name on medium, avatar only on narrow
  - Data Model: Added §Authentication State to data-model.md
  - State storage: AuthState interface in authStore (Pinia) or viewStore
  - Profile fields: GoogleUserProfile { name, email, picture, sub }
  - Lifecycle: Session-only token in session storage, not persisted in projects
  - Scopes: Add `profile email` to existing `drive.file` scope
  - Implementation: Phase 38 with 11 tasks (T400-T410)
  - Tasks cover: Scope addition, profile fetching, state management, component creation, toolbar integration, sign-out, session persistence, testing
  - Benefits: Users know active account, quick sign-out access, multi-account awareness
  - Security: Session-only tokens, no long-term credentials in browser storage

* [X] Sibling object creation must be explicitly done at the command level using specific ops. That logic should not be embedded in the world layer.
  - **STATUS**: ✅ PLANNED - Phase 42 created
  - **Problem**: Sibling intersection points NOT being created (domain method removed, tests skipped)
  - **Current State**:
    - ✅ Guide siblings: Already correct pattern (`AddGuide2DPerpendicularToLineOp` + `AddSiblingGuide2DOp`)
    - ❌ Intersection siblings: Not implemented
  - **Architectural Requirement**: Operations simple (one task), composition at command level, NO domain auto-creation
  - **Solution**: Create `AddSiblingIntersectionPoint2DOp` operation following guide sibling pattern
  - **Operation Pattern**:
    - Primary: `AddLineLineIntersectionPoint2DOp` creates ONLY primary intersection
    - Sibling: `AddSiblingIntersectionPoint2DOp` creates ONLY sibling intersection
    - Tool: `IntersectionTool` composes both operations when HHL detected
  - **Implementation**: Phase 42 with 13 tasks (T464-T476)
  - **Task Categories**:
    - Create operation (T464): AddSiblingIntersectionPoint2DOp with apply/undo/serialize
    - Domain method (T465): ProjectionPlane.addSiblingIntersectionPoint()
    - Tool integration (T466-T467): IntersectionTool detects HHL, creates both ops
    - Serialization (T468): ProjectService reconstructOperation case
    - Deletion (T469): Verify cascade deletion via dependency system
    - Unit tests (T470-T471): Operation and domain method
    - Integration tests (T472): Full sibling creation workflow
    - Re-enable tests (T473): Fix skipped world.spec.ts tests
    - E2E tests (T474): User-visible behavior validation
    - Documentation (T475-T476): Update comments and data-model.md
  - **Benefits**: Consistency with guide pattern, serializable, testable, explicit, simple ops
  - **Success Criteria**: Both points created for HHL intersections, cascade deletion works, all tests pass
  - **Schema Version**: Bump to 3.2.0 (sibling intersection ops added)
  - **Architecture References**: spec.md §Intersection Point, data-model.md §HalfHingeLine2D Intersection Sibling Behavior

* [X] Sibling objects must be deleted in pairs, so deletion must always be redirected to the primary object.
  - **STATUS**: ✅ ARCHITECTURE CORRECT - Handled by dependency system
  - **Current Implementation**: Sibling points depend on primary, cascade deletion automatic
  - **Mechanism**:
    - Sibling points reference primary via `primaryIntersectionId` field
    - Dependency system tracks: sibling depends on primary
    - Delete primary → dependency cascade removes sibling automatically
    - Attempting to delete sibling → dependency system prevents (sibling depends on primary, can't delete dependency)
  - **Guide Sibling Pattern**: `RemoveGuide2DOp` handles paired deletion - redirects sibling deletion to primary
  - **Intersection Sibling Pattern**: Once Phase 42 complete, verify `RemovePoint2DOp` handles similar redirection
  - **Command Construction**: Deletion command only needs to target primary, cascade handles sibling
  - **Verification**: Phase 42 Task T469 confirms cascade deletion works for intersection siblings
  - **No Action Needed**: Architecture already correct, just needs implementation (Phase 42)

* [X] Ensure that SiblingIntersectionPoint2D works for any HL, not only for HL_HV. See how sibling line realization is calculated (it should be almost identical).
  - **STATUS**: ✅ COMPLETE - Phase 37 implemented
  - Verification phase completed: parametric consistency enforced and validated
  - Added `HingeLine.validateParametricConsistency()` method (validates Q=Q', D=D')
  - Added runtime assertion in `SiblingIntersectionPoint2D.realize2D()`
  - Unit tests verify consistency with HL_HV and custom arbitrary HingeLines
  - Documentation updated with generic examples (not HL_HV-specific)
  - Mathematical basis: coordinate cloning ≡ parametric scalar transfer when Q=Q', D=D'
  - All 32/32 point tests passing
  - Prevents future bugs when adding auxiliary planes with custom HingeLines

* [X] SiblingGuide2D must have its own class, which may derive from some kind of line-perpendicular-to-line, but that is not required. The interesting thing here, is that in the realization, the position of the intersection with the Half HL is the twin of the original Guide2D object (similar to how intersection points are handled). So, they don't probably need to derive from perpendicular line, as the parent objects used to define the line are different (there is no line and point but parent guide and half HL)!
  - **STATUS**: ✅ COMPLETE - Phase 36 Refactored (commit b5e0c6c)
  - Implemented using coordinate correspondence pattern (NOT throughPointId)
  - Parent objects: "primary guide + half HL" (follows SiblingIntersectionPoint2D pattern)
  - Position derivation: primary guide intersection with HalfHL → same coordinates on sibling HalfHL
  - Fields: Only referenceLineId, primaryGuideId, planeId (NO throughPointId!)
  - Realization: Intersect primary guide with its HalfHL, transfer coordinates to sibling HalfHL, compute perpendicular
  - All 17/17 guide tests passing with correct architecture

* [X] It seems SiblingGuide2D type is missing. It must be used to represent the Sibling of a guide on the complementary projection plane.
  - **STATUS**: ✅ PLANNED - Phase 36 
  - Specification exists in data-model.md with full interface definition
  - Plan: Follow SiblingIntersectionPoint2D pattern (Phase 32)
  - Implementation: 13 tasks (T342-T354) covering domain, ops, commands, tool, rendering, tests
  - Architecture: Command-level sibling creation using AddSiblingGuide2DOp
  - Sibling plane derivation: Use Phase 35 helpers (HalfHingeLine2D → HingeLine → getOtherPlane())
  - Deletion: Cascade via dependency system (primary deletion removes sibling)
  - Construction: Automatic sibling creation when Guide2D created
  - Tasks documented in tasks.md Phase 36

* [X] 2d objects with siblings must store the id of the sibling projection plane in order to find it.
  - **STATUS**: ✅ COMPLETE - Phase 35 implemented
  - User insight: siblingPlaneId doesn't need to be stored - it's derivable!
  - Solution: Added helper methods to derive sibling plane from HingeLine path
  - Completed 6 tasks (T336-T341):
    - T336: ✅ Added World.getSiblingPlaneForIntersection() helper method
    - T337: ✅ Added World.getHingeLineFromHalfHingeLine() helper method
    - T338: ✅ Documented sibling plane derivation in data-model.md
    - T339: ✅ No hardcoded patterns found (minimal use in UI only)
    - T340: ✅ Added 10 comprehensive tests - all passing
    - T341: ✅ Documented SiblingGuide2D future pattern
  - Algorithm: HalfHingeLine2D → hingeLineId → HingeLine → getOtherPlane(currentPlaneId)
  - Benefits: No data redundancy, cleaner architecture, scales naturally
  - All intersection classes verified to have siblingPointId field
  - Pattern ready for future SiblingGuide2D implementation

* [X] There are many realizations 2d classes for elements deriving from line2d when all of then must be using just Line2DRealization2D. No need to derive from that class.
  - **STATUS**: ✅ COMPLETE - Phase 34 implemented
  - Issue: Guide2DRealization2D extends Line2DRealization2D unnecessarily
  - Architecture specifies: "Unified realization type: all lines use Line2DRealization2D"
  - Completed 6 tasks (T330-T335):
    - T330: ✅ Removed Guide2DRealization2D class, updated Guide.ts to use Line2DRealization2D
    - T331: ✅ Updated PaperService.guideToPrimitive() parameter type
    - T332: ✅ Searched and verified no remaining Guide2DRealization2D references
    - T333: ✅ Ran tests - all guide tests pass (12/12), line hierarchy tests pass (26/26)
    - T334: ✅ Documented architectural principle in data-model.md
    - T335: ✅ Marked Line2DRealization2D, Point2DRealization2D, Circle2DRealization2D as @sealed
  - Rationale: Realization classes contain only geometric data; behavior belongs in domain classes
  - Guide special rendering (dashed) determined by Guide2D domain type, not realization type
  - All tests passing, no regressions introduced

* [X] generate*Id methods for 2D elements must be moved inside projection plane class.
  - **STATUS**: ✅ ALREADY COMPLETE
  - All ID generation methods (`generatePoint2DId`, `generateLine2DId`, `generateSegment2DId`, `generateCircle2DId`, `generateGuide2DId`) are inside ProjectionPlane class (lines 439-467 of ProjectionPlane.ts)
  - Methods use World's counter via `world.getNextId()` for unique ID generation
  - All factory methods in ProjectionPlane use these internal generate methods
  - Legacy `IdGenerator.ts` file exists but is not imported anywhere (unused)
  - Implementation verified complete in Phase 22.5 (World Factory Methods Refactoring)

* [X] Add a test ensuring that circle intersection are ordered relative to the angle formed between the **vector** radius and the intersection point. When intersecting two circunferences, the intersection points are numbered acording to the first circunference.
  - **STATUS**: ✅ COMPLETE - Phase 33 implemented
  - Background: Implementation in `Intersections.ts` already correct (`sortPointsByAngleFromRadiusVector()`)
  - Specification added to data-model.md §Intersection Point Indexing on Circles
  - Created and completed 5 test tasks (T325-T329):
    - T325: 9 circle-circle intersection ordering tests with various radius vector angles (0°, 45°, 90°, 135°, 180°, 270°)
    - T326: 5 line-circle intersection ordering tests
    - T327: 5 edge case tests (tangent, perpendicular, aligned centers)
    - T328: 1 real-world regression test with documented geometry
    - T329: Enhanced documentation in Intersections.ts with ASCII art diagram
  - Algorithm: Sort by relative angle Δθ = atan2(P-C) - atan2(R), normalized to [0,2π)
  - Index 0 = smallest Δθ (closest to radius vector direction)
  - All 51 intersection tests passing (20 new angle ordering tests)

* [X] Ensure we have different classes for different intersection types: Point2DLineLineIntersection, Point2DCircleLineIntersection, Point2DCircleCircleIntersection (though note that there is no difference between lines and segments other than when calculating intersections with segments, it should be checked that the point is inside the segment).
  - **STATUS**: ✅ COMPLETE - Phase 32 implemented
  - Created Point2DLineLineIntersection, Point2DLineCircleIntersection, Point2DCircleCircleIntersection classes
  - Abstract IntersectionPoint2D base class with siblingPointId support
  - Specialized operations: AddLineLineIntersectionPoint2DOp, AddLineCircleIntersectionPoint2DOp, AddCircleCircleIntersectionPoint2DOp
  - Factory methods in ProjectionPlane: addLineLineIntersection(), addLineCircleIntersection(), addCircleCircleIntersection()
  - IntersectionTool refactored with type detection
  - Specialized ProcessTree actions created
  - Legacy IntersectionPoint2DLegacy removed
  - Serialization support with schema version 3.0.0
  - All 15 tasks complete (T310-T324)

* [X] Even if we have already noted it in many cases, and it should be stated that way in the data-model.md file, we still have Command subclasses. Those must be removed, all commands must be implemented using the Command class which should be not derivable. Enforce that in the code if that is possible, and also add a comment explaining it in the class definition!!! Can a test be added for ensuring this condition holds? In that case add the test and document also there that the condition must be enforced.
  - **STATUS**: ✅ COMPLETE - Phase 31 implemented
  - Transport functionality (TransportPointCommand, TransportDistanceCommand) REMOVED
  - UpdateElementStyleCommand refactored to use UpdateElementStyleOp operation
  - Command class documented as @sealed with comprehensive architectural explanation
  - Architectural test created (tests/unit/architecture/noCommandSubclasses.spec.ts)
  - All 12 tasks complete (T298-T309)