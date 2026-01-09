/**
 * Projection plane - 2D surface where 2D elements exist
 */

export interface ProjectionPlane {
  id: string;                       // PlaneId (e.g., "P_H", "P_V")
  name: string;                     // Display name
  isActive: boolean;                // Exactly one plane is active at a time
  isVisible: boolean;               // Toggle visibility in UI
  color: string;                    // Base color for plane representation
}

/**
 * Factory function to create a projection plane
 */
export function createProjectionPlane(
  id: string,
  name: string,
  options?: Partial<ProjectionPlane>
): ProjectionPlane {
  return {
    id,
    name,
    isActive: false,
    isVisible: true,
    color: '#cccccc',
    ...options
  };
}

/**
 * Default planes for dihedral system
 */
export const PLANE_H = createProjectionPlane('P_H', 'Horizontal (P_H)', {
  isActive: true,
  color: '#e0f0ff'
});

export const PLANE_V = createProjectionPlane('P_V', 'Vertical (P_V)', {
  color: '#ffe0f0'
});
