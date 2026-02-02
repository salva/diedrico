/**
 * Action - Base interface for construction actions in the process tree
 * 
 * Phase 93: Minimal Action interface - only 3 fields
 * - elementId: The created element (type derivable from element itself)
 * - description: Human-readable narrative (static for now, dynamic later)
 * - isOutput: Black box visibility flag (defaults to true)
 * 
 * Removed fields (all redundant):
 * - id: Actions tied to elements, use elementId
 * - type: Always 'action', unnecessary discriminator
 * - actionType: Derivable from element.type
 * - timestamp: Can be derived from element.created if needed
 * 
 * Dependencies: Query world.dependencyService.getDependencies(elementId)
 * Element properties: Direct access (element.planeId, line.point1Id, etc.)
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §Phase 93
 */

export interface Action {
  elementId: string;             // Element created by this action
  description: string;           // Human-readable action narrative
  isOutput: boolean;             // Phase 87: Output flag (Show in black box stack)
}

/**
 * Generic action factory - replaces 30+ specialized functions
 * 
 * @param elementId - The created element ID
 * @param description - Optional description (defaults to "Created {elementId}")
 * @returns Action with isOutput=true by default
 */
export function createAction(
  elementId: string,
  description?: string
): Action {
  return {
    elementId,
    description: description ?? `Created ${elementId}`,
    isOutput: true  // Default to true (user correction from Phase 93 planning)
  };
}
