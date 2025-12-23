/**
 * Guide - line perpendicular to HL/BHL used for transporting points/distances between planes
 * A guide belongs to both planes associated with the reference line
 */

export interface Guide {
  id: string;                       // GuideId (UUID)
  name: string;                     // Auto-generated "g1", "g2", etc.
  referenceLineId: string;          // Reference to HL or BHL projection (line element)
  sourcePointId: string;            // Point on one plane that defines guide
  guide2DInPlane1Id: string;        // Guide2D element on plane1
  guide2DInPlane2Id: string;        // Guide2D element on plane2
  plane1Id: string;                 // First plane (from reference line)
  plane2Id: string;                 // Second plane (from reference line)
}

/**
 * Factory function to create a guide
 */
export function createGuide(
  id: string,
  name: string,
  referenceLineId: string,
  sourcePointId: string,
  guide2DInPlane1Id: string,
  guide2DInPlane2Id: string,
  plane1Id: string,
  plane2Id: string
): Guide {
  return {
    id,
    name,
    referenceLineId,
    sourcePointId,
    guide2DInPlane1Id,
    guide2DInPlane2Id,
    plane1Id,
    plane2Id
  };
}
