/**
 * Action - metadata for a construction step in the process tree.
 *
 * Actions identify the element produced by a construction step, carry a
 * human-readable fallback description, and store the process-tree output flag.
 * Dependency relations are not stored on actions; callers query them through
 * the dependency boundary owned by the world/domain layer.
 */

export interface Action {
  elementId: string;             // Element created by this action
  description: string;           // Human-readable action narrative
  isOutput: boolean;             // Output flag (show in black box stack)
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
    isOutput: true
  };
}
