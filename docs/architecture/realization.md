# Realization pattern

A domain element definition describes what an object is; a realization is the computed geometry used for display and selection.

Examples:

- A 2D point definition realizes to a plane coordinate.
- A line realizes to a point and direction.
- A segment realizes to two endpoints.
- A 3D element realizes in world coordinates and can be projected to 2D planes.

Application presentation selectors call realization methods while building canvas and three-view models. Rendering adapters consume those DTOs; they do not recalculate domain relationships themselves.

Failed or infeasible realizations are handled as derived state. They should not be persisted as authoritative geometry.
