# Not yet planned

This file contains diverse ideas which need to be included in the project.

In general, any idea needs to...

1. Be described in specs.md (unless it is a purely technical issue).
2. Be described in ui-specs.md if it has a UI component.
3. Have its implementation detailed in data-model.md.
4. Be broken down into smaller implementable tasks in tasks.md.
5. Include corresponding testing tasks.
6. Be marked here as done.

Note that completing these tasks may require asking the user for additional information and clarification. When in doubt, just ask!!!


## TODO

* [ ] Display Google Drive login status in the UI, including user profile information if Google provides it.
* [ ] Show contextual tool feedback: display what the user has already done and what is expected next. For instance, "Creating line: pick two points", or "Creating line: point A selected, pick second point".
* [ ] Implement proper toolbar behaviour as described in ui-specs.md (similar to Geogebra classic).
* [ ] Add support for moving free points and distances along guide lines.
* [ ] Verify if 3D visualization support is already planned. If not, plan and implement it.
* [ ] Fix display of subscripts in UI elements (currently they appear as corrupted characters, e.g., "5�subscriptH�").
* [ ] Improve element naming: currently points are assigned generic numeric names; implement meaningful default names.
* [ ] Improve how elements are shown in the left world listing widget.
* [ ] Even if we have already noted it in many cases, and it should be stated that way in the data-model.md file, we still have Command subclasses. Those must be removed, all commands must be implemented using the Command class which should be not derivable. Enforce that in the code if that is possible, and also add a comment explaining it in the class definition!!! Can a test be added for ensuring this condition holds? In that case add the test and document also there that the condition must be enforced.
* [ ] Add a test ensuring that circle intersection are ordered relative to the angle formed between the **vector** radius and the intersection point. When intersecting two circunferences, the intersection points are numbered acording to the first circunference.
* [ ] Ensure we have different object for different intersection objects: Point2DLineLineIntersection, Point2DCircleLineIntersection, Point2DCircleCircleIntersection (though note that there is no difference between lines and segments other than when calculating intersections with segments, it should be checked that the point is inside the segment).
* [ ] generate*Id methods for 2D elements must be moved inside projection plane class.
* [ ] remove the restore functionality. Element restoration should be performed through recreation.
* [ ] check tests marked as SKIP and check whether they make sense (they are testing some useful functionality or mimicing some common user behaviour) in that case enable and fix them. In many cases you would need to recreate them fully as they may had become architecturally obsolete. Check model-plan in order to decide the best way to implement the functionality. Ask for clarification when needed.
* [ ] 2d objects with siblings must store the id of the sibling projection plane in order to find it.
* [ ] Sibling objects must be deleted in pairs, so deletion must always be redirected to the primary object. (the second is going to be then deleted automatically because it is a dependency)
* [ ] It seems SiblingGuide2D type is missing. It must be used to represent the Sibling of a guide on the complementary projection plane.
* [ ] There are many realizations 2d classes for elements deriving from line2d when all of then must be using just Line2DRealization2D