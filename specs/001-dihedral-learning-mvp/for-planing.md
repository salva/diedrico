# Not yet planned

This file contains diverse ideas which need to be included in the project.

In general, any idea needs to...

1. Be described in specs.md (unless it is a purely technical issue).
2. Be described in ui-specs.md if it has a UI component.
3. Have its implementation detailed in data-model.md.
4. Be broken down into smaller implementable tasks in tasks.md.
5. Include corresponding testing tasks.
6. Be implemented and tested.
7. Be marked here as done.

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
