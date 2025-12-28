/**
 * BrokenHingeLine (BHL) - metadata linking BHL projection lines
 * 
 * When two arbitrary 3D planes intersect, their intersection is a broken hinge line.
 * Unlike HingeLines (which are structural folds between projection planes),
 * BHLs are geometric constructs that appear as Element2D line projections on each plane.
 * 
 * This entity stores the relationship between the 3D plane and its BHL projections.
 */

export interface BrokenHingeLine {
  id: string;                       // BHL ID (UUID)
  name: string;                     // "BHL_BC", "BHL_12", etc.
  sourcePlane3DId: string;          // Parent 3D plane that creates this BHL
  projectionOnPlane1Id: string;     // BHLProjection2D element on plane 1
  projectionOnPlane2Id: string;     // BHLProjection2D element on plane 2
  plane1Id: string;                 // First projection plane (e.g., P_H)
  plane2Id: string;                 // Second projection plane (e.g., P_V)
}

/**
 * Factory function to create a BrokenHingeLine
 */
export function createBrokenHingeLine(
  id: string,
  name: string,
  sourcePlane3DId: string,
  projectionOnPlane1Id: string,
  projectionOnPlane2Id: string,
  plane1Id: string,
  plane2Id: string
): BrokenHingeLine {
  return {
    id,
    name,
    sourcePlane3DId,
    projectionOnPlane1Id,
    projectionOnPlane2Id,
    plane1Id,
    plane2Id
  };
}
