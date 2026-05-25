/**
 * UpdateElementStyleOp - Operation to update visual style properties of an element
 * 
 * Updates style properties (color, lineWidth, lineStyle, visibility) of a geometric element.
 * Style changes are undoable by storing previous values.
 * 
 * Phase 83: Now actually updates element.visualStyle property
 * 
 * Reference: specs/001-dihedral-learning-mvp/ui-spec.md §Element Properties Dialog
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §Command Pattern
 */

import type { IOperation, OperationResult } from '../IOperation';
import type { World } from '@/domain/world/World';
import type { VisualStyle } from '@/domain/world/VisualStyle';
import { createVisualStyle } from '@/domain/world/VisualStyle';

/**
 * Style properties that can be updated
 */
interface StyleProperties {
  color?: string;
  lineWidth?: number;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  opacity?: number;
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
  
  private previousStyle: VisualStyle | undefined = undefined;

  constructor(
    private elementId: string,
    private planeId: string,
    private newStyle: StyleProperties
  ) {
    this.parameters = { elementId, planeId, newStyle };
  }

  apply(world: World): OperationResult {
    try {
      // Get the plane containing the element
      const plane = world.getProjectionPlaneById(this.planeId);
      if (!plane) {
        throw new Error(`Plane not found: ${this.planeId}`);
      }

      // Try to find element (could be point, line, circle, etc.)
      let element = plane.getPoint(this.elementId);
      if (!element) {
        element = plane.getLine(this.elementId);
      }
      if (!element) {
        element = plane.getCircle(this.elementId);
      }
      
      if (!element) {
        throw new Error(`Element not found: ${this.elementId}`);
      }

      // Store previous style for undo (clone it)
      this.previousStyle = element.visualStyle ? { ...element.visualStyle } : undefined;
      
      // Create or update visualStyle
      if (!element.visualStyle) {
        // Element has no style yet, create one with defaults
        element.visualStyle = createVisualStyle();
      }
      
      // Apply new style properties (only update provided properties)
      if (this.newStyle.color !== undefined) {
        element.visualStyle.color = this.newStyle.color;
      }
      if (this.newStyle.lineWidth !== undefined) {
        element.visualStyle.lineWidth = this.newStyle.lineWidth;
      }
      if (this.newStyle.lineStyle !== undefined) {
        element.visualStyle.lineStyle = this.newStyle.lineStyle;
      }
      if (this.newStyle.opacity !== undefined) {
        element.visualStyle.opacity = this.newStyle.opacity;
      }
      if (this.newStyle.visible !== undefined) {
        element.visualStyle.visible = this.newStyle.visible;
      }
      
      console.log('[UpdateElementStyleOp] Applied style to:', this.elementId, element.visualStyle);
      
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

  undo(world: World): void {
    try {
      // Get the plane and element
      const plane = world.getProjectionPlaneById(this.planeId);
      if (!plane) {
        console.error('[UpdateElementStyleOp] Cannot undo: Plane not found:', this.planeId);
        return;
      }

      let element = plane.getPoint(this.elementId);
      if (!element) {
        element = plane.getLine(this.elementId);
      }
      if (!element) {
        element = plane.getCircle(this.elementId);
      }
      
      if (!element) {
        console.error('[UpdateElementStyleOp] Cannot undo: Element not found:', this.elementId);
        return;
      }

      // Restore previous style
      element.visualStyle = this.previousStyle ? { ...this.previousStyle } : undefined;
      
      console.log('[UpdateElementStyleOp] Restored style for:', this.elementId, element.visualStyle);
    } catch (error) {
      console.error('[UpdateElementStyleOp] Undo failed:', error);
    }
  }

  serialize() {
    return {
      opType: this.type,
      elementId: this.elementId,
      planeId: this.planeId,
      newStyle: this.newStyle,
      outputs: this.outputs
    };
  }
}
