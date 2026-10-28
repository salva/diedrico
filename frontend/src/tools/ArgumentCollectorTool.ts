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
import type { ToolInteractionReadPort } from './ToolInteractionReadPort';
import { BaseTool } from './BaseTool';
import type { ToolArgumentInputCapableTool, ToolContext, ToolResult, ITool, PlanePositionInputCapableTool } from './ITool';
import type { ParsedToolArgumentInput, ToolArgumentInputRequest } from '@/types/ToolArgumentInput';
import type { ToolConstructionIntent } from './ToolCommandIntents';
import { SelectionMask, NoneMask } from '@/types/SelectionMask';
import type { 
  ToolArgumentSpec, 
  ToolArgumentSet, 
  CollectionContext,
  ArgumentValue,
  ScalarArgumentSpec
} from '@/tools/ToolArgumentCollector';
import { MIN_PARAMETER_RADIUS, signedAngleCCW } from '@/domain/world/GeometricParameters';
export type { ArgumentValue } from '@/tools/ToolArgumentCollector';

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
export abstract class ArgumentCollectorTool extends BaseTool implements ITool, PlanePositionInputCapableTool, ToolArgumentInputCapableTool {
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
  protected abstract buildConstructionIntent(
    _args: Map<string, ArgumentValue>,
    _context: ToolContext
  ): ToolConstructionIntent;

  protected requireElementId(args: Map<string, ArgumentValue>, name: string): string {
    const element = args.get(name)?.element;
    if (!element) throw new Error(`Missing selected ${name}`);
    return element.id;
  }

  protected requirePlanePosition(args: Map<string, ArgumentValue>, name: string): Vector3 {
    const position = args.get(name)?.planeCoords;
    if (!position) throw new Error(`Missing ${name} position`);
    return position;
  }

  protected requireScalarDistance(args: Map<string, ArgumentValue>, name: string): { value: number; direction?: Vector3 } {
    const scalar = args.get(name)?.scalar;
    if (!scalar || scalar.valueKind !== 'distance' || scalar.value === undefined) {
      throw new Error(`Missing ${name} distance`);
    }
    return { value: scalar.value, direction: scalar.direction };
  }

  protected requireScalarAngle(args: Map<string, ArgumentValue>, name: string): number {
    const scalar = args.get(name)?.scalar;
    if (!scalar || scalar.valueKind !== 'angle' || scalar.radians === undefined) {
      throw new Error(`Missing ${name} angle`);
    }
    return scalar.radians;
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
  isElementEligible(id: string, planeId: string, readPort: ToolInteractionReadPort): boolean {
    if (this.viableSets.length === 0) this.viableSets = this.getArgumentSets().map((_, index) => index);
    const plane = readPort.getProjectionPlaneById(planeId);
    const element = readPort.getElement2D(id);
    return !!plane && !!element && this.getViableNextArgumentSpecs().some(spec => isElementSpec(spec)
      && spec.mask.matches(element) && (!spec.validator || spec.validator(element, { readPort, plane, collected: this.collected }).valid));
  }

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
    const hit = interactionQuery.hitTest(canvasPos, 50, { viewport, activePlaneId: planeId, paperToPlaneTransform }, selectionMask, id => this.isElementEligible(id, planeId, readPort));
    
    // Extract position from context
    const { planeCoords } = context;
    const collectionContext: CollectionContext = {
      readPort,
      plane,
      collected: this.collected
    };
    
    // Create ArgumentValue - either with selected element or null (for SelectionMask.none())
    let argumentValue: ArgumentValue;
    
    if (!hit) {
      const viableSpecs = this.getViableNextArgumentSpecs();
      const freeSpec = viableSpecs.find(spec => acceptsFreeClick(spec, this.collected));

      if (!freeSpec) {
        return { success: false, message: 'No selectable element found at click position.' };
      }

      if (isScalarSpec(freeSpec)) {
        const scalarValue = this.scalarValueFromMouse(freeSpec, planeCoords, collectionContext);
        if (!scalarValue.success) {
          return { success: false, message: scalarValue.error };
        }
        argumentValue = scalarValue.value;
      } else {
        argumentValue = {
          kind: 'plane-position',
          element: null,
          planeCoords
        };
      }
    } else {
      // Element hit - get element and create ArgumentValue
      const element = readPort.getElement2D(hit.elementId);
      if (!element) {
        return { success: false, message: `Element not found: ${hit.elementId}` };
      }
      
      argumentValue = {
        kind: 'element',
        element,
        planeCoords
      };
    }
    
    return this.collectArgumentValue(argumentValue, context, collectionContext);
  }

  handlePlanePositionInput(context: ToolContext, position: Vector3): ToolResult {
    const { planeId, readPort } = context;
    const plane = readPort.getProjectionPlaneById(planeId);
    if (!plane) {
      return { success: false, message: `Plane not found: ${planeId}` };
    }

    if (this.viableSets.length === 0) {
      const argumentSets = this.getArgumentSets();
      this.viableSets = argumentSets.map((_, index) => index);
    }

    if (!this.acceptsPlanePositionInput()) {
      return { success: false, message: 'Current tool is not waiting for a free position.' };
    }

    return this.collectArgumentValue(
      { kind: 'plane-position', element: null, planeCoords: position },
      { ...context, planeCoords: position },
      { readPort, plane, collected: this.collected },
    );
  }

  acceptsPlanePositionInput(): boolean {
    if (this.viableSets.length === 0) {
      const argumentSets = this.getArgumentSets();
      this.viableSets = argumentSets.map((_, index) => index);
    }
    return this.getViableNextArgumentSpecs().some(isPlanePositionSpec);
  }

  getPlanePositionInputLabel(): string {
    if (this.viableSets.length === 0) {
      const argumentSets = this.getArgumentSets();
      this.viableSets = argumentSets.map((_, index) => index);
    }
    return this.getViableNextArgumentSpecs().find(isPlanePositionSpec)?.name ?? 'position';
  }

  getToolArgumentInputRequest(): ToolArgumentInputRequest | null {
    if (this.viableSets.length === 0) {
      const argumentSets = this.getArgumentSets();
      this.viableSets = argumentSets.map((_, index) => index);
    }

    const next = this.getViableNextArgumentSpecs().find(spec => isPlanePositionSpec(spec) || (isScalarSpec(spec) && spec.numericInput));
    if (!next) return null;
    if (isScalarSpec(next)) {
      return {
        kind: 'scalar',
        valueKind: next.valueKind,
        label: next.name,
        placeholder: next.valueKind === 'angle' ? 'deg' : 'value',
      };
    }
    return {
      kind: 'plane-position',
      label: next.name,
      placeholder: 'u,v',
    };
  }

  handleToolArgumentInput(context: ToolContext, input: ParsedToolArgumentInput): ToolResult {
    if (input.kind === 'plane-position') {
      return this.handlePlanePositionInput(context, input.position);
    }

    const { planeId, readPort } = context;
    const plane = readPort.getProjectionPlaneById(planeId);
    if (!plane) {
      return { success: false, message: `Plane not found: ${planeId}` };
    }

    if (this.viableSets.length === 0) {
      const argumentSets = this.getArgumentSets();
      this.viableSets = argumentSets.map((_, index) => index);
    }

    const spec = this.getViableNextArgumentSpecs().find(candidate => (
      isScalarSpec(candidate) && candidate.numericInput && candidate.valueKind === input.valueKind
    )) as ScalarArgumentSpec | undefined;

    if (!spec) {
      return { success: false, message: 'Current tool is not waiting for this numeric input.' };
    }

    const argumentValue = this.scalarValueFromInput(spec, input, { readPort, plane, collected: this.collected });
    if (!argumentValue.success) {
      return { success: false, message: argumentValue.error };
    }

    return this.collectArgumentValue(
      argumentValue.value,
      context,
      { readPort, plane, collected: this.collected },
    );
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
    const masks = viableSpecs.filter(isElementSpec).map(spec => spec.mask);

    if (masks.length === 0) {
      return SelectionMask.none();
    }
    
    // Compute union of selection masks
    const mask = SelectionMask.union(...masks);
    return mask;
  }

  private collectArgumentValue(
    argumentValue: ArgumentValue,
    context: ToolContext,
    collectionContext: CollectionContext,
  ): ToolResult {
    const result = this.tryAddArgument(argumentValue, collectionContext);

    if (!result.success) {
      return { success: false, message: result.error || 'Cannot add element as argument' };
    }

    this.updateViableSets(collectionContext);

    const completedSetIndex = this.findCompletedSet();

    if (completedSetIndex !== null) {
      const argumentSets = this.getArgumentSets();
      const completedSet = argumentSets[completedSetIndex];

      try {
        if (completedSet.execute) {
          const executeResult = completedSet.execute(this.collected, context);
          this.reset();
          return executeResult;
        } else {
          this.execute(completedSetIndex, this.collected, context);
          this.reset();
          return { success: true, message: `${this.getCommandDescription()} completed successfully` };
        }
      } catch (error) {
        this.reset();
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, message: `Failed to ${this.getCommandDescription().toLowerCase()}: ${message}` };
      }
    }

    return { success: true, message: this.getStatusMessage() };
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
        return `Creating ${this.name}: ${collectedNames} selected, pick ${nextArgs} (${methods})`;
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
        elementId: argValue.element?.id || null,
        scalar: argValue.scalar ? { ...argValue.scalar } : undefined,
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
        
        if (isScalarValue(argumentValue)) {
          matches = isScalarSpec(spec) && spec.valueKind === argumentValue.scalar.valueKind;
        } else if (element && isElementSpec(spec)) {
          // Element provided - check if it matches SelectionMask using instanceof
          matches = spec.mask.matches(element);
        } else if (!element && isPlanePositionSpec(spec)) {
          // No element (null) - check if spec accepts SelectionMask.none()
          matches = true;
        }
        
        if (matches) {
          // Apply argument-level validator if specified (only for non-null elements)
          if (isElementSpec(spec) && spec.validator && element) {
            const validationResult = spec.validator(element, context);
            if (!validationResult.valid) {
              continue; // Another viable spec may accept the same element.
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
        if (isScalarValue(argValue)) {
          matches = isScalarSpec(spec) && spec.valueKind === argValue.scalar.valueKind;
        } else if (element && isElementSpec(spec)) {
          // Element provided - check if it matches SelectionMask using instanceof
          matches = spec.mask.matches(element);
        } else if (!element && isPlanePositionSpec(spec)) {
          // No element (null) - check if spec accepts SelectionMask.none()
          matches = true;
        }
        
        if (!matches || (element && isElementSpec(spec) && spec.validator && !spec.validator(element, context).valid)) {
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
    
    for (const setIndex of this.viableSets) {
      const set = argumentSets[setIndex];
      
      for (const spec of set.arguments) {
        // Only include specs for arguments not yet collected
        if (!this.collected.has(spec.name) && isSpecCollectable(spec, this.collected)) {
          specs.push(spec);
        }
      }
    }
    
    return specs;
  }

  private scalarValueFromMouse(
    spec: ScalarArgumentSpec,
    planeCoords: Vector3,
    context: CollectionContext,
  ): { success: true; value: ArgumentValue } | { success: false; error: string } {
    if (!spec.mouseInput) {
      return { success: false, error: `${spec.name} does not accept mouse input.` };
    }

    if (spec.mouseResolver.kind === 'distance-from-point') {
      const from = this.collected.get(spec.mouseResolver.fromArgument);
      const point = from?.element ? context.readPort.getPoint2D(from.element.id) : undefined;
      if (!point) return { success: false, error: `Select ${spec.mouseResolver.fromArgument} first.` };
      const pointRealization = context.readPort.realizePoint2D(point);
      if (!pointRealization.feasible) return { success: false, error: 'Reference point is not feasible.' };
      const direction = planeCoords.clone().sub(pointRealization.position);
      direction.z = 0;
      const value = direction.length();
      if (!this.scalarInRange(spec, value)) {
        return { success: false, error: `${spec.name} is too small.` };
      }
      direction.normalize();
      return {
        success: true,
        value: { kind: 'scalar', element: null, planeCoords, scalar: { valueKind: 'distance', value, direction } }
      };
    }

    const reference = this.collected.get(spec.mouseResolver.referenceLineArgument);
    const vertex = this.collected.get(spec.mouseResolver.vertexArgument);
    const line = reference?.element ? context.readPort.getLine2D(reference.element.id) : undefined;
    const point = vertex?.element ? context.readPort.getPoint2D(vertex.element.id) : undefined;
    if (!line || !point) return { success: false, error: 'Select reference line and through point first.' };
    const lineRealization = context.readPort.realizeLine2D(line);
    const pointRealization = context.readPort.realizePoint2D(point);
    if (!lineRealization.feasible || !pointRealization.feasible) {
      return { success: false, error: 'Reference geometry is not feasible.' };
    }
    const targetDirection = planeCoords.clone().sub(pointRealization.position);
    targetDirection.z = 0;
    if (targetDirection.lengthSq() < MIN_PARAMETER_RADIUS * MIN_PARAMETER_RADIUS) {
      return { success: false, error: 'Angle target is too close to the through point.' };
    }
    const radians = signedAngleCCW(lineRealization.getDirection(), targetDirection);
    return {
      success: true,
      value: { kind: 'scalar', element: null, planeCoords, scalar: { valueKind: 'angle', radians } }
    };
  }

  private scalarValueFromInput(
    spec: ScalarArgumentSpec,
    input: ParsedToolArgumentInput,
    context: CollectionContext,
  ): { success: true; value: ArgumentValue } | { success: false; error: string } {
    if (input.kind !== 'scalar' || input.valueKind !== spec.valueKind) {
      return { success: false, error: `Expected ${spec.valueKind} input.` };
    }
    if (input.valueKind === 'distance') {
      if (!this.scalarInRange(spec, input.value)) {
        return { success: false, error: `${spec.name} is too small.` };
      }
      const direction = this.defaultDirectionForDistance(spec, context);
      return {
        success: true,
        value: {
          kind: 'scalar',
          element: null,
          planeCoords: new Vector3(0, 0, 1),
          scalar: { valueKind: 'distance', value: input.value, direction },
        }
      };
    }
    return {
      success: true,
      value: {
        kind: 'scalar',
        element: null,
        planeCoords: new Vector3(0, 0, 1),
        scalar: { valueKind: 'angle', radians: input.radians },
      }
    };
  }

  private defaultDirectionForDistance(spec: ScalarArgumentSpec, _context: CollectionContext): Vector3 {
    const lastDirection = Array.from(this.collected.values()).reverse().find(value => value.scalar?.direction)?.scalar?.direction;
    if (lastDirection) return lastDirection.clone();
    if (spec.mouseResolver.kind === 'distance-from-point' && spec.mouseResolver.defaultDirection === 'positive-u') {
      return new Vector3(1, 0, 0);
    }
    return new Vector3(1, 0, 0);
  }

  private scalarInRange(spec: ScalarArgumentSpec, value: number): boolean {
    if (!Number.isFinite(value)) return false;
    if (spec.min !== undefined && value < spec.min) return false;
    if (spec.max !== undefined && value > spec.max) return false;
    return true;
  }
  
}

function isScalarSpec(spec: ToolArgumentSpec): spec is ScalarArgumentSpec {
  return spec.kind === 'scalar';
}

function isElementSpec(spec: ToolArgumentSpec): spec is Extract<ToolArgumentSpec, { mask: SelectionMask }> {
  return spec.kind === undefined || spec.kind === 'element';
}

function isPlanePositionSpec(spec: ToolArgumentSpec): boolean {
  return isElementSpec(spec) && spec.mask instanceof NoneMask;
}

function acceptsFreeClick(spec: ToolArgumentSpec, collected: Map<string, ArgumentValue>): boolean {
  if (isPlanePositionSpec(spec)) return true;
  if (!isScalarSpec(spec) || !spec.mouseInput) return false;
  return scalarPrerequisitesCollected(spec, collected);
}

function isSpecCollectable(spec: ToolArgumentSpec, collected: Map<string, ArgumentValue>): boolean {
  if (!isScalarSpec(spec)) return true;
  return scalarPrerequisitesCollected(spec, collected);
}

function scalarPrerequisitesCollected(spec: ScalarArgumentSpec, collected: Map<string, ArgumentValue>): boolean {
  if (spec.mouseResolver.kind === 'distance-from-point') {
    return collected.has(spec.mouseResolver.fromArgument);
  }
  return collected.has(spec.mouseResolver.referenceLineArgument) && collected.has(spec.mouseResolver.vertexArgument);
}

function isScalarValue(value: ArgumentValue): value is ArgumentValue & { scalar: NonNullable<ArgumentValue['scalar']> } {
  return value.kind === 'scalar' && !!value.scalar;
}
