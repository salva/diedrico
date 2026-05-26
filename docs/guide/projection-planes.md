# Projection planes

Diedrico works with projection planes such as horizontal `P_H`, vertical `P_V`, and auxiliary planes. Each plane owns its 2D element store and has realizations that map plane coordinates to paper/canvas coordinates and, where applicable, to 3D context.

The active plane receives new 2D constructions. Other planes remain visible and can participate in guides, hinges, projections, and dependencies.
