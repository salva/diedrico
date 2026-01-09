/**
 * Hinge line - intersection line between two projection planes
 * Used for guide creation and plane folding
 */

export interface HingeLine {
  id: string;                       // HingeLineId (e.g., "HL_HV")
  name: string;                     // Display name
  plane1Id: string;                 // First plane
  plane2Id: string;                 // Second plane
}

/**
 * Factory function to create a hinge line
 */
export function createHingeLine(
  id: string,
  name: string,
  plane1Id: string,
  plane2Id: string
): HingeLine {
  return {
    id,
    name,
    plane1Id,
    plane2Id
  };
}

/**
 * Default hinge line between horizontal and vertical planes
 */
export const HL_HV = createHingeLine(
  'HL_HV',
  'Hinge Line H-V',
  'P_H',
  'P_V'
);
