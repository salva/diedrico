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

* [ ] Show contextual tool feedback: display what the user has already done and what is expected next. For instance, "Creating line: pick two points", or "Creating line: point A selected, pick second point".
* [ ] Implement proper toolbar behaviour as described in ui-specs.md (similar to Geogebra classic).
* [ ] Add support for moving semi-free points and distances along guide lines.
* [ ] Verify if 3D visualization support is already planned. If not, plan and implement it.
* [ ] Fix display of subscripts in UI elements (currently they appear as corrupted characters, e.g., "5�subscriptH�").
* [ ] Improve element naming: currently points are assigned generic numeric names; implement meaningful default names.
* [ ] Improve how elements are shown in the left world listing widget.
* [ ] remove the restore functionality. Element restoration should be performed through recreation.
* [ ] check tests marked as SKIP and check whether they make sense (they are testing some useful functionality or mimicing some common user behaviour) in that case enable and fix them. In many cases you would need to recreate them fully as they may had become architecturally obsolete. Check model-plan in order to decide the best way to implement the functionality. Ask for clarification when needed. Also, if functionality has been removed and is required, tell me about it!!!
* [ ] Sibling object creation must be explicitly done at the command level using specific ops. That logic should not be embedded in the world layer.
* [ ] Sibling objects must be deleted in pairs, so deletion must always be redirected to the primary object. (the second is going to be then deleted automatically because it is a dependency). This should also be managed at the command construction level!
* [ ] When we load a project, instead of cleaning the old World, just create a new one and forget everything about the old. Maybe already done?
* [ ] Consider introducing a `Project` class to encapsulate world, commandStack, visaulization configuration and metadata for cleaner lifecycle management. Best done when domain model stabilizes.
* [ ] Do not use type aliases in the code.
* [ ] Ensure all tools perform argument validation checks (for instance, when creating a line, that two different points are used, etc.). Add comprehensive tests for this feature.
* [ ] Introduce a set of factory methods with the logic for creating the Command + Ops for supporting the tools.
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
* [ ] Ensure that Ops are simple objects which only do basic tasks. For instance, on cascade deletion must not be handled in the op, but on the command construction (the method building the command is the responsible for following dependency relations, retrieving all the objects, sorting them and implementing the cascade deletion by introducing a specific op in the command for every object).
* [ ] Refactor the selection mask to use classes instead of strings. Strings can not handle hierarchy constructions which we are using pervasively.


## ALREADY PLANNED

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