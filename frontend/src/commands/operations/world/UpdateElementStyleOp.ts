/**
 * UpdateElementStyleOp - Operation to update visual style properties of an element
 * 
 * Updates style properties (color, lineWidth, lineStyle, visibility) of a geometric element.
 * Style changes are undoable by storing previous values.
 * 
 * Note: This is a placeholder implementation. Full style inheritance system (T194-T197)
 * will be implemented later with subprocess defaults and override flags.
 * 
 * Reference: specs/001-dihedral-learning-mvp/ui-spec.md §Element Properties Dialog
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §Command Pattern
 */

import type { IOperation, OperationResult } from './IOperation';
import type { World } from '@/domain/world/World';

/**
 * Style properties that can be updated
 */
interface StyleProperties {
  color?: string;
  lineWidth?: number;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  visible?: boolean;
}

/**
 * UpdateElementStyleOp - Updates element visual style
 * 
 * Per data-model.md Command Pattern: All logic belongs in Operations, not Command subclasses.
 * This operation implements the apply/undo pattern for style updates.
 */
export class UpdateElementStyleOp implements IOperation {
  readonly type = 'UpdateElementStyle';
  readonly parameters: Record<string, any>;
  outputs: Record<string, any> = {};
  
  private previousStyle: StyleProperties = {};

  constructor(
    private elementId: string,
    private planeId: string,
    private newStyle: StyleProperties
  ) {
    this.parameters = { elementId, planeId, newStyle };
  }

  apply(world: World): OperationResult {
    try {
      // TODO: Implement style storage in World/elements
      // For now, just log the change and store for undo
      
      // Get element to store previous style
      const plane = world.getProjectionPlaneById(this.planeId);
      if (!plane) {
        throw new Error(`Plane not found: ${this.planeId}`);
      }

      // Try to find element (could be point, line, segment, circle, guide, etc.)
      // TODO: Implement actual style storage on elements
      // For now, just store the change for undo
      this.previousStyle = {}; // Would copy current style here
      
      console.log('[UpdateElementStyleOp] Applying style to:', this.elementId, this.newStyle);
      
      // Apply new style (placeholder - actual implementation pending style system)
      // element.color = this.newStyle.color ?? element.color;
      // element.lineWidth = this.newStyle.lineWidth ?? element.lineWidth;
      // element.lineStyle = this.newStyle.lineStyle ?? element.lineStyle;
      // element.visible = this.newStyle.visible ?? element.visible;
      
      return {
        success: true,
        outputs: { elementId: this.elementId }
      };
    } catch (error) {
      return {
        success: false,
        outputs: {},
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  undo(_world: World): void {
    // Restore previous style
    console.log('[UpdateElementStyleOp] Undoing style for:', this.elementId, this.previousStyle);
    
    // TODO: Restore previous style on element
    // const plane = world.getProjectionPlaneById(this.planeId);
    // if (plane) {
    //   const element = plane.getElement(this.elementId);
    //   if (element) {
    //     element.color = this.previousStyle.color;
    //     element.lineWidth = this.previousStyle.lineWidth;
    //     element.lineStyle = this.previousStyle.lineStyle;
    //     element.visible = this.previousStyle.visible;
    //   }
    // }
  }
}
