/**
 * Action - Base interface for construction actions in the process tree
 * 
 * Phase 93: Minimal Action interface - only 3 fields
 * - elementId: The created element (type derivable from element itself)
 * - description: Human-readable narrative (static for now, dynamic later)
 * - isOutput: Black box visibility flag (defaults to true)
 * 
 * Phase 98: Dynamic Action Descriptions
 * - Added getDescriptionParts() helper function (not a method on interface)
 * - Descriptions computed dynamically from current world state
 * - Uses Descriptor pattern for separation of concerns
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
 */

import type { World } from '@/domain/world/World';
import type { DescriptionPart } from '@/domain/world/descriptors/DescriptionPart';
import { DescriptorRegistry } from '@/domain/world/descriptors/DescriptorRegistry';

export interface Action {
  elementId: string;             // Element created by this action
  description: string;           // Human-readable action narrative
  isOutput: boolean;             // Phase 87: Output flag (Show in black box stack)
}

/**
 * Generate dynamic description parts for an action
 * 
 * Format: "{ElementType} {CurrentLabel}: {ConstructionMethod}"
 * Example: "Point A_5: Intersection of line L_2 and line L_3"
 * 
 * Returns array of text and label parts for selective KaTeX rendering.
 * 
 * @param action The action to describe
 * @param world Current world instance for element/label lookup
 * @returns Array of text and label parts
 */
export function getActionDescriptionParts(action: Action, world: World): DescriptionPart[] {
  // Try projection plane first (simple ID format without '/')
  if (!action.elementId.includes('/')) {
    const plane = world.getProjectionPlaneById(action.elementId);
    if (plane) {
      const descriptor = DescriptorRegistry.get(plane);
      const typeName = descriptor.getTypeName(plane).toLowerCase();
      const label = plane.label || plane.name;
      const constructionParts = descriptor.getConstructionDescription(plane, world);
      
      return [
        { type: 'label', content: label, elementId: action.elementId },
        { type: 'text', content: `: ${typeName} ` },
        ...constructionParts
      ];
    }
  }
  
  // Try 2D element
  try {
    const element = world.getElement2D(action.elementId);
    if (element) {
      const descriptor = DescriptorRegistry.get(element);
      const typeName = descriptor.getTypeName(element).toLowerCase();
      const label = element.label || action.elementId;
      const constructionParts = descriptor.getConstructionDescription(element, world);
      
      return [
        { type: 'label', content: label, elementId: action.elementId },
        { type: 'text', content: `: ${typeName} ` },
        ...constructionParts
      ];
    }
  } catch (e) {
    // Not a 2D element, continue to 3D
  }
  
  // Try 3D element
  const element3d = world.getElement3DById(action.elementId);
  if (element3d) {
    const descriptor = DescriptorRegistry.get(element3d);
    const typeName = descriptor.getTypeName(element3d).toLowerCase();
    const label = element3d.label || action.elementId;
    const constructionParts = descriptor.getConstructionDescription(element3d, world);
    
    return [
      { type: 'label', content: label, elementId: action.elementId },
      { type: 'text', content: `: ${typeName} ` },
      ...constructionParts
    ];
  }
  
  // Element deleted - return empty to hide from UI
  return [];
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
