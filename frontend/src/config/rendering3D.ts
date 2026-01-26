/**
 * 3D Rendering Configuration Constants
 * 
 * Central configuration for 3D visualization of geometric elements.
 * These values control the visual extent of infinite geometric objects
 * (planes, lines, grids) when rendered in the finite 3D view.
 * 
 * @remarks These are RENDERING parameters, not geometric properties.
 * Planes are mathematically infinite but must be clipped for visualization.
 */

/**
 * Plane rendering boundaries (world coordinate units)
 * 
 * Used to create finite mesh representations of infinite planes.
 * Determines the visual extent of:
 * - Projection plane surfaces (semi-transparent rectangles)
 * - Grid lines on planes
 * - Clipping boundaries for 2D→3D element rendering
 */
export const PLANE_RENDERING_CONFIG = {
  /**
   * Minimum U coordinate for plane mesh/grid
   * U-axis typically corresponds to horizontal direction
   */
  MIN_U: -500,
  
  /**
   * Maximum U coordinate for plane mesh/grid
   */
  MAX_U: 500,
  
  /**
   * Minimum V coordinate for plane mesh/grid
   * V-axis typically corresponds to vertical direction
   */
  MIN_V: -500,
  
  /**
   * Maximum V coordinate for plane mesh/grid
   */
  MAX_V: 500,
  
  /**
   * Size of square plane mesh (edge length in world units)
   * Used for creating PlaneGeometry in Three.js
   */
  MESH_SIZE: 1000,  // Matches 2 × max boundary extent
  
  /**
   * Fallback grid parameters (when clipped grid computation fails)
   */
  FALLBACK_GRID: {
    /**
     * Half-size of grid extent (±halfSize in both U and V)
     */
    HALF_SIZE: 500,
    
    /**
     * Number of grid divisions (creates this many + 1 lines in each direction)
     */
    DIVISIONS: 20,
  },
} as const;

/**
 * Get plane rendering boundaries for a specific plane
 * 
 * Currently returns same boundaries for all planes.
 * Can be extended in the future to support per-plane customization.
 * 
 * @param _planeId - ID of the plane (reserved for future per-plane config)
 * @returns Boundary configuration object
 */
export function getPlaneBoundaries(_planeId?: string) {
  return {
    minU: PLANE_RENDERING_CONFIG.MIN_U,
    maxU: PLANE_RENDERING_CONFIG.MAX_U,
    minV: PLANE_RENDERING_CONFIG.MIN_V,
    maxV: PLANE_RENDERING_CONFIG.MAX_V,
  };
}

/**
 * Get plane mesh size for Three.js PlaneGeometry
 * 
 * @param _planeId - ID of the plane (reserved for future per-plane config)
 * @returns Edge length of square plane mesh
 */
export function getPlaneMeshSize(_planeId?: string): number {
  return PLANE_RENDERING_CONFIG.MESH_SIZE;
}
