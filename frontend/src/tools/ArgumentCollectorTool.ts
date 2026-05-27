/**
 * ArgumentCollectorTool.ts - Base class for multi-argument tool construction (Phase 64)
 * 
 * Provides automated argument collection workflow for tools that need multiple geometric elements.
 * Subclasses declare argument specifications; base class handles collection, validation, and UI feedback.
 * 
 * Key Features:
 * - Any-order collection: Users can select arguments in any sequence
 * - Automatic viable set tracking: Framework prunes incompatible argument sets as arguments are collected
 * - Dynamic selection masks: Computed as union of all viable next arguments
 * - Automatic UI feedback: Status messages show progress and next expected arguments
 * - Three-layer validation: Type (SelectionMask), argument-level (validator), set-level (setValidator)
 * - Automatic execution: Emits construction intent when exactly one complete set is found
 * 
 * Usage Pattern:
 * ```typescript
 * class CircleTool extends ArgumentCollectorTool {
 *   readonly name = 'circle';
 *   
 *   getArgumentSets(): ToolArgumentSet[] {
 *     return [{
 *       arguments: [
 *         { name: 'center', mask: SelectionMask.point() },
 *         { name: 'circumferencePoint', mask: SelectionMask.point() }
 *       ]
 *     }];
 *   }
 *   
 *   execute(setIndex: number, args: Map<string, Element2D>): ToolResult {
 *     const center = args.get('center') as Point2D;
 *     const circum = args.get('circumferencePoint') as Point2D;
 *     // Create circle...
 *   }
 * }
 * ```
 * 
 */

import { Vector3 } from 'three';
import { BaseTool } from './BaseTool';
import type { ToolContext, ToolResult, ITool } from './ITool';
import type { ToolConstructionIntent } from '@/application/tools/ToolCommandIntents';
import { SelectionMask, NoneMask } from '@/types/SelectionMask';
import type { 
  ToolArgumentSpec, 
  ToolArgumentSet, 
  CollectionContext,
  ArgumentValue
} from '@/types/ToolArgumentCollector';
export type { ArgumentValue } from '@/types/ToolArgumentCollector';

/**
 * Abstract base class for tools that collect multiple geometric arguments
 * 
 * Subclasses must implement:
 * - getArgumentSets(): Define all possible argument combinations (mutually exclusive)
 * - execute(): Create geometric object when arguments are complete
 * 
 * Base class provides:
 * - handleClick(): Automated argument collection with validation
 * - getSelectionMask(): Dynamic mask based on viable next arguments
 * - getStatusMessage(): Automatic UI feedback
 * - reset(): Clear collected arguments
 * - cancel(): Abort collection and reset
 */
export abstract class ArgumentCollectorTool extends BaseTool implements ITool {
  /** Map of collected arguments (argument name → {element, position}) */
  private collected: Map<string, ArgumentValue> = new Map();
  
  /** Argument sets that are still viable given collected arguments */
  private viableSets: number[] = []; // Indices into getArgumentSets()
  
  // === Abstract Methods (Subclass Interface) ===
  
  /**
   * Define all possible argument sets (mutually exclusive construction methods)
   * 
   * Single-method tools return array with one set.
   * Multi-method tools return array with multiple sets (e.g., tangent via point OR line).
   * 
   * Framework ensures argument sets are mutually exclusive:
   * - Different argument counts are automatically exclusive
   * - Different argument types (via SelectionMask) are automatically exclusive
   * - Same-type arguments require separate tools (framework doesn't support "2 points" vs "3 points")
   * 
   * @returns Array of argument set specifications
   */
  protected abstract getArgumentSets(): ToolArgumentSet[];
  
  /**
   * Build a typed construction intent from collected arguments.
   * Subclasses keep interaction-specific validation, while application
   * controllers own command construction/execution.
   */
  protected buildConstructionIntent(
    args: Map<string, ArgumentValue>,
    context: ToolContext
  ): ToolConstructionIntent {
    return {
      type: this.name as Exclude<import('@/application/tools/ToolCommandIntents').ConstructionIntentType, 'intersection' | 'tangent-line-to-circle-through-point' | 'tangent-line-to-circle-parallel'>,
      description: this.getCommandDescription(),
      planeId: context.planeId,
      args
    };
  }


  /**
   * Get command description for application command stack entries.
   */
  protected getCommandDescription(): string {
    return `Create ${this.name}`;
  }

  /**
   * Execute geometric construction when arguments are complete
   * 
   * Called automatically when exactly one viable set has all arguments collected,
   * BUT ONLY if the completed set does not have its own execute callback.
   * 
   * Framework handles:
   * - Typed intent emission through the application command sink
   * - Tool completion
   * 
   * @param setIndex - Index of the completed argument set in getArgumentSets()
   * @param args - Map of collected arguments (name → {element, planeCoords})
   * @param context - Tool execution context (bounded read port, command sink, etc.)
   * @throws Error if operation fails (will be caught by handleClick)
   */
  protected execute(
    _setIndex: number,
    args: Map<string, ArgumentValue>,
    context: ToolContext
  ): void {
    const result = context.commandSink.executeConstructionIntent(
      this.buildConstructionIntent(args, context)
    );

    if (!result.success) {
      throw new Error(result.message || `Failed to ${this.getCommandDescription().toLowerCase()}`);
    }

    this.handleCompletion(context.toolStore);
  }

  
  // === Automated Methods (Framework Implementation) ===
  
  /**
   * Handle click event - automated argument collection workflow
   * 
   * Process:
   * 1. Hit-test to find element at click position
   * 2. Try to add element as argument to viable sets
   * 3. Update viable sets (prune incompatible sets)
   * 4. Check if exactly one set is complete → execute
   * 5. Return status message showing progress
   * 
   * @param context - Tool execution context
   * @returns Tool result with status message
   */
  handleClick(context: ToolContext): ToolResult {
    const { planeId, canvasCoords, readPort, interactionQuery, paperToPlaneTransform, viewport } = context;
    
    const plane = readPort.getProjectionPlaneById(planeId)!;
    
    // Initialize viable sets on first click
    if (this.viableSets.length === 0) {
      const argumentSets = this.getArgumentSets();
      this.viableSets = argumentSets.map((_, index) => index);
    }
    
    // Hit-test with current selection mask
    const canvasPos = new Vector3(canvasCoords.x, canvasCoords.y, 1);
    const selectionMask = this.getSelectionMask();
    const hit = interactionQuery.hitTest(canvasPos, 50, { viewport, activePlaneId: planeId, paperToPlaneTransform }, selectionMask);
    
    // Extract position from context
    const { planeCoords } = context;
    
    // Create ArgumentValue - either with selected element or null (for SelectionMask.none())
    let argumentValue: ArgumentValue;
    
    if (!hit) {
      // No element hit - check if any viable next argument accepts SelectionMask.none()
      const viableSpecs = this.getViableNextArgumentSpecs();
      const hasNoneMask = viableSpecs.some(spec => spec.mask instanceof NoneMask);
      
      if (!hasNoneMask) {
        return { success: false, message: 'No selectable element found at click position.' };
      }
      
      // SelectionMask.none() - use null element with mouse position
      argumentValue = {
        element: null,
        planeCoords
      };
    } else {
      // Element hit - get element and create ArgumentValue
      const element = readPort.getElement2D(hit.elementId);
      if (!element) {
        return { success: false, message: `Element not found: ${hit.elementId}` };
      }
      
      argumentValue = {
        element,
        planeCoords
      };
    }
    
    // Try to add argument
    const collectionContext: CollectionContext = {
      readPort,
      plane,
      collected: this.collected
    };
    
    const result = this.tryAddArgument(argumentValue, collectionContext);
    
    if (!result.success) {
      return { success: false, message: result.error || 'Cannot add element as argument' };
    }
    
    // Update viable sets
    this.updateViableSets(collectionContext);
    
    // Check for completed set
    const completedSetIndex = this.findCompletedSet();
    
    if (completedSetIndex !== null) {
      const argumentSets = this.getArgumentSets();
      const completedSet = argumentSets[completedSetIndex];
      
      try {
        // Execute construction using set's callback or tool's execute method
        if (completedSet.execute) {
          const executeResult = completedSet.execute(this.collected, context);
          // Reset after execution
          this.reset();
          return executeResult;
        } else {
          this.execute(completedSetIndex, this.collected, context);
          // Reset after execution
          this.reset();
          return { success: true, message: `${this.getCommandDescription()} completed successfully` };
        }
      } catch (error) {
        // Reset on error
        this.reset();
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, message: `Failed to ${this.getCommandDescription().toLowerCase()}: ${message}` };
      }
    }
    
    // Return status showing progress
    return { success: true, message: this.getStatusMessage() };
  }
  
  /**
   * Get dynamic selection mask based on viable next arguments
   * 
   * Computes union of SelectionMasks from all viable next argument specs.
   * This ensures only elements that can advance at least one viable set are selectable.
   * 
   * @returns Selection mask for next argument
   */
  getSelectionMask(): SelectionMask {
    // Initialize viable sets on first call if empty (lazy initialization)
    if (this.viableSets.length === 0) {
      const argumentSets = this.getArgumentSets();
      this.viableSets = argumentSets.map((_, index) => index);
    }
    
    const viableSpecs = this.getViableNextArgumentSpecs();
    
    if (viableSpecs.length === 0) {
      // No viable next arguments - tool is in invalid state, reset it
      console.warn('ArgumentCollectorTool: No viable next arguments, resetting tool state');
      this.reset();
      // Return a permissive mask to avoid blocking interaction
      return SelectionMask.none();
    }
    
    // Union of all viable next argument masks
    const masks = viableSpecs.map(spec => spec.mask);
    
    // Compute union of selection masks
    const mask = SelectionMask.union(...masks);
    return mask;
  }
  
  /**
   * Get status message showing collection progress
   * 
   * Format depends on viable sets:
   * - Single viable set: "Creating [object]: [collected args], pick [next args]"
   * - Multiple viable sets: "Pick [next args] ([method 1] or [method 2])"
   * 
   * @returns Human-readable status message
   */
  getStatusMessage(): string {
    const argumentSets = this.getArgumentSets();
    const viableSpecs = this.getViableNextArgumentSpecs();
    
    if (this.collected.size === 0) {
      // Initial state - show all possible starting arguments
      if (this.viableSets.length === 1) {
        const set = argumentSets[this.viableSets[0]];
        const argNames = set.arguments.map(arg => arg.name).join(', ');
        return `Creating ${this.name}: pick ${argNames}`;
      } else {
        // Multiple methods available
        const nextArgs = Array.from(new Set(viableSpecs.map(spec => spec.name))).join(' or ');
        return `Pick ${nextArgs}`;
      }
    } else {
      // Arguments collected - show progress
      const collectedNames = Array.from(this.collected.keys()).join(', ');
      const nextArgs = Array.from(new Set(viableSpecs.map(spec => spec.name))).join(' or ');
      
      if (this.viableSets.length === 1) {
        const set = argumentSets[this.viableSets[0]];
        const label = set.label || this.name;
        return `Creating ${label}: ${collectedNames} selected, pick ${nextArgs}`;
      } else {
        // Multiple methods still viable
        const methods = this.viableSets
          .map(index => argumentSets[index].label || `method ${index + 1}`)
          .join(' or ');
        return `${collectedNames} selected, pick ${nextArgs} (${methods})`;
      }
    }
  }
  
  /**
   * Reset tool state - clear collected arguments and viable sets
   */
  reset(): void {
    this.collected.clear();
    this.viableSets = [];
  }
  
  /**
   * Cancel current collection and reset
   */
  cancel(): void {
    this.reset();
  }
  
  /**
   * Get current tool state (for debugging/testing)
   */
  getState(): Record<string, any> {
    return {
      collected: Array.from(this.collected.entries()).map(([name, argValue]) => ({
        name,
        elementId: argValue.element?.id || null
      })),
      viableSets: this.viableSets
    };
  }
  
  // === Private Helper Methods ===
  
  /**
   * Try to add argument to one of the viable sets
   * 
   * Checks each viable set to see if element matches an unfilled argument.
   * Applies argument-level validator if specified.
   * 
   * @param argumentValue - Argument value (element + position) to add
   * @param context - Collection context for validation
   * @returns Success/failure result with error message if failed
   */
  private tryAddArgument(
    argumentValue: ArgumentValue,
    context: CollectionContext
  ): { success: boolean; error?: string } {
    const argumentSets = this.getArgumentSets();
    const { element } = argumentValue;
    
    for (const setIndex of this.viableSets) {
      const argSet = argumentSets[setIndex];
      
      for (const spec of argSet.arguments) {
        // Skip already collected arguments
        if (this.collected.has(spec.name)) {
          continue;
        }
        
        // Check if argument matches this spec
        let matches = false;
        
        if (element) {
          // Element provided - check if it matches SelectionMask using instanceof
          matches = spec.mask.matches(element);
        } else {
          // No element (null) - check if spec accepts SelectionMask.none()
          matches = spec.mask instanceof NoneMask;
        }
        
        if (matches) {
          // Apply argument-level validator if specified (only for non-null elements)
          if (spec.validator && element) {
            const validationResult = spec.validator(element, context);
            if (!validationResult.valid) {
              return { 
                success: false, 
                error: validationResult.error || 'Argument validation failed' 
              };
            }
          }
          
          // Add to collected (store full ArgumentValue with element + position)
          this.collected.set(spec.name, argumentValue);
          return { success: true };
        }
      }
    }
    
    return { 
      success: false, 
      error: 'Element does not match any required argument in viable sets' 
    };
  }
  
  /**
   * Update viable sets based on collected arguments
   * 
   * Prunes sets that:
   * - Have arguments already collected that don't match set specs
   * - Fail set-level validation (if all arguments collected)
   * 
   * @param context - Collection context
   */
  private updateViableSets(context: CollectionContext): void {
    const argumentSets = this.getArgumentSets();
    
    this.viableSets = this.viableSets.filter(setIndex => {
      const set = argumentSets[setIndex];
      
      // Check if collected arguments match this set's specs
      for (const [argName, argValue] of this.collected.entries()) {
        const spec = set.arguments.find(s => s.name === argName);
        
        if (!spec) {
          // Collected argument not in this set - set is incompatible
          return false;
        }
        
        // Check if argument matches spec (extract element from ArgumentValue)
        const element = argValue.element;
        
        let matches = false;
        if (element) {
          // Element provided - check if it matches SelectionMask using instanceof
          matches = spec.mask.matches(element);
        } else {
          // No element (null) - check if spec accepts SelectionMask.none()
          matches = spec.mask instanceof NoneMask;
        }
        
        if (!matches) {
          return false;
        }
      }
      
      // If all arguments collected, run set-level validator
      if (this.collected.size === set.arguments.length && set.setValidator) {
        const validationResult = set.setValidator(this.collected, context);
        if (!validationResult.valid) {
          return false;
        }
      }
      
      return true;
    });
  }
  
  /**
   * Find first completed argument set (all arguments collected and validated)
   * 
   * @returns Index of completed set, or null if no set is complete
   */
  private findCompletedSet(): number | null {
    const argumentSets = this.getArgumentSets();
    
    for (const setIndex of this.viableSets) {
      const set = argumentSets[setIndex];
      
      // Check if all arguments collected
      if (this.collected.size === set.arguments.length) {
        // All specs have matching collected arguments
        const allCollected = set.arguments.every(spec => this.collected.has(spec.name));
        
        if (allCollected) {
          return setIndex;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Get all viable next argument specs (not yet collected)
   * 
   * @returns Array of argument specs that can be collected next
   */
  private getViableNextArgumentSpecs(): ToolArgumentSpec[] {
    const argumentSets = this.getArgumentSets();
    const specs: ToolArgumentSpec[] = [];
    const seenNames = new Set<string>();
    
    for (const setIndex of this.viableSets) {
      const set = argumentSets[setIndex];
      
      for (const spec of set.arguments) {
        // Only include specs for arguments not yet collected
        if (!this.collected.has(spec.name) && !seenNames.has(spec.name)) {
          specs.push(spec);
          seenNames.add(spec.name);
        }
      }
    }
    
    return specs;
  }
  
}
