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

* [ ] Display Google Drive login status in the UI, including user profile information if Google provides it.
* [ ] Show contextual tool feedback: display what the user has already done and what is expected next. For instance, "Creating line: pick two points", or "Creating line: point A selected, pick second point".
* [ ] Implement proper toolbar behaviour as described in ui-specs.md (similar to Geogebra classic).
* [ ] Add support for moving semi-free points and distances along guide lines.
* [ ] Verify if 3D visualization support is already planned. If not, plan and implement it.
* [ ] Fix display of subscripts in UI elements (currently they appear as corrupted characters, e.g., "5�subscriptH�").
* [ ] Improve element naming: currently points are assigned generic numeric names; implement meaningful default names.
* [ ] Improve how elements are shown in the left world listing widget.
* [ ] generate*Id methods for 2D elements must be moved inside projection plane class.
* [ ] remove the restore functionality. Element restoration should be performed through recreation.
* [ ] check tests marked as SKIP and check whether they make sense (they are testing some useful functionality or mimicing some common user behaviour) in that case enable and fix them. In many cases you would need to recreate them fully as they may had become architecturally obsolete. Check model-plan in order to decide the best way to implement the functionality. Ask for clarification when needed. Also, if functionality has been removed and is required, tell me about it!!!
* [ ] 2d objects with siblings must store the id of the sibling projection plane in order to find it.
* [ ] Sibling objects must be deleted in pairs, so deletion must always be redirected to the primary object. (the second is going to be then deleted automatically because it is a dependency)
* [ ] It seems SiblingGuide2D type is missing. It must be used to represent the Sibling of a guide on the complementary projection plane.
* [ ] There are many realizations 2d classes for elements deriving from line2d when all of then must be using just Line2DRealization2D. No need to derive from that class.
* [ ] When we load a project, instead of cleaning the old World, just create a new one and forget everything about the old. Maybe already done?
* [ ] Consider introducing a `Project` class to encapsulate world, commandStack, and metadata for cleaner lifecycle management. Best done when domain model stabilizes.
* [ ] Do not use type aliases in the code.
* [ ] Ensure all tools perform argument validation checks (for instance, when creating a line, that two different points are used, etc.). Add comprehensive tests for this feature.
* [ ] Introduce a set of factory methods with the logic for creating the Command + Ops for supporting the tools.
* [ ] Add support for creating new Point2D elements by clickin on random paper places while building other elements instead of forcing the user to use a preexistent point.
* [ ] Add support for converting intersections into points automatically while building other elements.

## ALREADY PLANNED

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