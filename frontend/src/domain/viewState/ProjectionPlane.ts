/**
 * Projection plane - 2D surface where 2D elements exist
 */

export interface ProjectionPlane {
  id: string;                       // PlaneId (e.g., "P_H", "P_V")
  name: string;                     // Display name
  isActive: boolean;                // Exactly one plane is active at a time
  isVisible: boolean;               // Toggle visibility in UI
  color: string;                    // Base color for plane representation
  plane_3d_id: string;              // Reference to Plane3D element
  
  // 3D coordinate system: how 2D plane coordinates map to 3D space
  coordinate_system: {
    origin: { x: number; y: number; z: number };
    u_axis: { x: number; y: number; z: number };
    v_axis: { x: number; y: number; z: number };
  };
  
  // 2D canvas layout: how this plane appears on the 2D drawing canvas
  canvas_layout: {
    offset_x: number;               // X translation on canvas
    offset_y: number;               // Y translation on canvas
    rotation: number;               // Rotation in radians (future: for auxiliary planes)
    scale_x: number;                // X scale factor (1.0 = no scale, -1.0 = flip)
    scale_y: number;                // Y scale factor (1.0 = no scale, -1.0 = flip)
  };
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
export const PLANE_H: ProjectionPlane = {
  id: 'P_H',
  name: 'P_H',
  isActive: true,
  isVisible: true,
  color: '#e0f0ff',
  plane_3d_id: 'P_H',
  coordinate_system: {
    origin: { x: 0, y: 0, z: 0 },
    u_axis: { x: 1, y: 0, z: 0 },
    v_axis: { x: 0, y: 1, z: 0 }
  },
  canvas_layout: {
    offset_x: 0,
    offset_y: 0,
    rotation: 0,
    scale_x: 1,
    scale_y: 1
  }
};

export const PLANE_V: ProjectionPlane = {
  id: 'P_V',
  name: 'P_V',
  isActive: false,
  isVisible: true,
  color: '#ffe0f0',
  plane_3d_id: 'P_V',
  coordinate_system: {
    origin: { x: 0, y: 0, z: 0 },
    u_axis: { x: 1, y: 0, z: 0 },
    v_axis: { x: 0, y: 0, z: 1 }
  },
  canvas_layout: {
    offset_x: 0,
    offset_y: -400,
    rotation: 0,
    scale_x: 1,
    scale_y: 1
  }
};
