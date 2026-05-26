# Construction tools

Tools collect user arguments from the canvas and emit application intents. Application controllers turn those intents into commands.

Common tool families include points, lines, segments, circles, guides, intersections, parallel/perpendicular/tangent constructions, 3D elements, and projection-plane creation.

A tool may show step feedback while it waits for required picks. Completing a construction records an undoable command when the operation is valid. Quick setup tools are current UI conveniences only when present in the toolbar configuration; deleted placeholder operation families are not part of the current tool model.
