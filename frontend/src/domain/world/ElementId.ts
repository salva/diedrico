/**
 * Hierarchical Element ID Utilities
 * 
 * Phase 45: Element IDs now use hierarchical format: {containerId}/{localId}
 * 
 * Examples:
 *   - "proj_plane_H/point2d_1" - Point on horizontal plane
 *   - "proj_plane_V/line2d_5" - Line on vertical plane
 *   - "proj_plane_H/segment2d_12" - Segment on horizontal plane
 * 
 * Benefits:
 *   - Self-documenting: ID reveals container (projection plane)
 *   - Simplified lookups: Parse container from ID directly
 *   - Consistency: Matches ProcessTree path pattern
 *   - Validation: Verify element belongs to claimed container
 * 
 * Schema Version: 4.0.0 (BREAKING CHANGE from 3.1.0)
 */

/**
 * Parse a hierarchical element ID into its components.
 * 
 * @param id - Hierarchical ID in format "{containerId}/{localId}"
 * @returns Tuple [containerId, localId]
 * @throws Error if ID format is invalid
 * 
 * @example
 * parseElementId("proj_plane_H/point2d_1") // ["proj_plane_H", "point2d_1"]
 */
export function parseElementId(id: string): [string, string] {
  const parts = id.split('/');
  
  if (parts.length !== 2) {
    throw new Error(
      `Invalid element ID format: "${id}". Expected format: "{containerId}/{localId}"`
    );
  }
  
  const [containerId, localId] = parts;
  
  if (!containerId || !localId) {
    throw new Error(
      `Invalid element ID format: "${id}". Both containerId and localId must be non-empty`
    );
  }
  
  return [containerId, localId];
}

/**
 * Extract the container ID from a hierarchical element ID.
 * 
 * @param id - Hierarchical ID in format "{containerId}/{localId}"
 * @returns Container ID (projection plane ID)
 * @throws Error if ID format is invalid
 * 
 * @example
 * getContainerIdFromElementId("proj_plane_H/point2d_1") // "proj_plane_H"
 */
export function getContainerIdFromElementId(id: string): string {
  const [containerId] = parseElementId(id);
  return containerId;
}

/**
 * Extract the local ID from a hierarchical element ID.
 * 
 * @param id - Hierarchical ID in format "{containerId}/{localId}"
 * @returns Local ID (element-specific ID)
 * @throws Error if ID format is invalid
 * 
 * @example
 * getLocalIdFromElementId("proj_plane_H/point2d_1") // "point2d_1"
 */
export function getLocalIdFromElementId(id: string): string {
  const [, localId] = parseElementId(id);
  return localId;
}

/**
 * Build a hierarchical element ID from container and local IDs.
 * 
 * @param containerId - Container ID (projection plane ID)
 * @param localId - Local ID (element-specific ID)
 * @returns Hierarchical ID in format "{containerId}/{localId}"
 * @throws Error if either ID is empty
 * 
 * @example
 * buildElementId("proj_plane_H", "point2d_1") // "proj_plane_H/point2d_1"
 */
export function buildElementId(containerId: string, localId: string): string {
  if (!containerId || !localId) {
    throw new Error(
      `Cannot build element ID: containerId="${containerId}", localId="${localId}". Both must be non-empty.`
    );
  }
  
  return `${containerId}/${localId}`;
}

/**
 * Validate that a hierarchical element ID starts with the expected plane ID.
 * This ensures the element belongs to its claimed container.
 * 
 * @param id - Hierarchical ID to validate
 * @param expectedPlaneId - Expected container (projection plane) ID
 * @throws Error if ID format is invalid or doesn't match expected plane
 * 
 * @example
 * validateElementId("proj_plane_H/point2d_1", "proj_plane_H") // OK
 * validateElementId("proj_plane_V/point2d_1", "proj_plane_H") // Throws error
 */
export function validateElementId(id: string, expectedPlaneId: string): void {
  const containerId = getContainerIdFromElementId(id);
  
  if (containerId !== expectedPlaneId) {
    throw new Error(
      `Element ID validation failed: element "${id}" claims to belong to plane "${containerId}", ` +
      `but is being added to plane "${expectedPlaneId}"`
    );
  }
}
