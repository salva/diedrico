# Workspace overview

The workspace contains the main 2D canvas, toolbar, panels, header controls, and a floating 3D view.

- The 2D canvas shows projection planes, hinge lines, guide lines, constructed elements, selection, hover, snap targets, and cascade highlighting.
- The toolbar selects construction tools and remembers the last-used tool inside families.
- Panels expose process-tree and property interactions.
- Header controls expose project naming, save/load, authentication, and undo/redo affordances.

Panning, zooming, and selection affect view/UI state. Geometric changes go through application use cases and committed commands.
