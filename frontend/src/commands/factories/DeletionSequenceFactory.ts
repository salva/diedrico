/**
 * DeletionSequenceFactory - Factory for cascade deletion sequences
 * 
 * Encapsulates the complex cascade deletion logic:
 * 1. Compute dependency cascade (dependents before dependencies)
 * 2. Sort elements in proper deletion order (reverse topological)
 * 3. Add type-specific RemoveElementOp for each element
 * 4. Remove corresponding ProcessTree actions
 * 
 * Design: This factory follows the Open Command pattern:
 * - Receives open Command object
 * - Adds operations via cmd.addAndExecute()
 * - Returns void (caller handles commit/push/feedback)
 * - Encapsulates complex cascade logic
 * 
 * CRITICAL: Elements must be deleted in reverse topological order to maintain
 * referential integrity (dependents first, roots last).
 * 
 */

import type { Command } from '@/commands/Command';
import type { World } from '@/domain/world/World';
import type { ProcessTree } from '@/domain/processTree/ProcessTree';
import type { DependencyQueryPort } from '@/domain/world/DependencyPorts';
import { 
  RemovePoint2DOp, 
  RemoveLine2DOp, 
  RemoveSegment2DOp, 
  RemoveCircle2DOp, 
  RemoveGuide2DOp 
} from '@/commands/operations/world/RemoveElementOps';
import { RemoveActionFromProcessTreeOp } from '@/commands/operations/processTree/ProcessTreeOperations';
import { Segment2D } from '@/domain/world/Segment';
import { Guide2D, SiblingGuide2D } from '@/domain/world/Guide';

export interface DeletionSequenceContext {
  readonly world: World;
  readonly dependencyQuery: DependencyQueryPort;
  readonly processTree: ProcessTree;
}

/**
 * DeletionSequenceFactory - Factory for cascade deletion sequences
 * 
 * Encapsulates multi-element deletion logic extracted from App.vue lines 660-760.
 * Handles cascade computation, topological sorting, and operation sequencing.
 */
export class DeletionSequenceFactory {
  /**
   * Create cascade deletion sequence for selected elements
   * 
   * Algorithm:
   * 1. Compute cascade using dependency service (get all dependent elements)
   * 2. Sort elements in deletion order (dependents first, roots last)
   * 3. Add type-specific RemoveElementOp for each element
   * 4. Add RemoveActionFromProcessTreeOp for each producing action
   * 
   * @param cmd - Open command to add operations to
   * @param selectedIds - IDs of elements user wants to delete
   * @param context - Explicit deletion dependencies for element lookup, dependency analysis, and process history
   */
  static createCascadeDeletion(
    cmd: Command,
    selectedIds: string[],
    context: DeletionSequenceContext
  ): void {
    const { world, dependencyQuery, processTree } = context;
    // Step 1: Compute cascade and get elements in proper deletion order
    const allElementsToDelete = dependencyQuery.getElementsInDeletionOrder(selectedIds);
    
    // Step 2: Find all actions that produce these elements
    const actionsToDelete = new Map<string, string[]>();
    
    for (const elementId of allElementsToDelete) {
      const actions = processTree.getActionsProducingElement(elementId);
      if (actions.length === 0) {
        throw new Error(`Cannot delete ${elementId}: no producing action found in process tree`);
      }
      
      for (const action of actions) {
        if (!actionsToDelete.has(action.id)) {
          actionsToDelete.set(action.id, []);
        }
        actionsToDelete.get(action.id)!.push(elementId);
      }
    }
    
    // Step 3: Add operations to command in proper order
    // Search through projection planes to find each element and determine its type
    for (const elementId of allElementsToDelete) {
      let found = false;
      
      // Search in all projection planes
      for (const plane of world.getAllProjectionPlanes()) {
        const planeId = plane.id;
        // Check if it's a point
        const point = plane.getPoint(elementId);
        if (point) {
          cmd.addAndExecute(new RemovePoint2DOp(planeId, elementId));
          found = true;
          break;
        }
        
        // Check if it's a line (includes segments and guides)
        const line = plane.getLine(elementId);
        if (line) {
          // Determine specific line subtype using instanceof for type-safe dispatch
          if (line instanceof Segment2D) {
            cmd.addAndExecute(new RemoveSegment2DOp(planeId, elementId));
          } else if (line instanceof Guide2D || line instanceof SiblingGuide2D) {
            cmd.addAndExecute(new RemoveGuide2DOp(planeId, elementId));
          } else {
            cmd.addAndExecute(new RemoveLine2DOp(planeId, elementId));
          }
          found = true;
          break;
        }
        
        // Check if it's a circle
        const circle = plane.getCircle(elementId);
        if (circle) {
          cmd.addAndExecute(new RemoveCircle2DOp(planeId, elementId));
          found = true;
          break;
        }
      }
      
      if (!found) {
        throw new Error(`Cannot delete ${elementId}: element not found in any projection plane`);
      }
    }
    
    // Step 4: Remove actions from ProcessTree (creates tombstones for undo)
    for (const [actionId] of actionsToDelete) {
      cmd.addAndExecute(new RemoveActionFromProcessTreeOp(actionId));
    }
  }
}
