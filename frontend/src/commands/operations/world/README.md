# World Operations

Operations modifying the geometric domain model.

**Scope**: Points, lines, segments, circles, guides, intersections, dependencies, element properties.

**Examples**:
- `AddFreePoint2DOp` - Create free point
- `AddLine2DOp` - Create line
- `RemovePoint2DOp` - Delete point
- `UpdateElementStyleOp` - Change element styling

All World operations modify the domain model (World and ProjectionPlane classes) and maintain geometric relationships through the dependency system.
