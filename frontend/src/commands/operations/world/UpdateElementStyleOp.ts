/**
 * UpdateElementStyleOp - Operation to update visual style properties of an element
 * 
 * Updates style properties (color, lineWidth, lineStyle, visibility) of a geometric element.
 * Style changes are undoable by storing previous values.
 * 
 * Phase 83: Now actually updates element.visualStyle property
 * 
 */

import type { IOperation, JsonObject, OperationDescriptor, OperationOutputBag, OperationResult } from '../IOperation';
import type { OperationContext } from '../OperationContext';
import type { World } from '@/domain/world/World';
import type { VisualStyle } from '@/domain/world/VisualStyle';
import type { Element } from '@/domain/world/Element';
import { createVisualStyle } from '@/domain/world/VisualStyle';

/**
 * Style properties that can be updated
 */
export interface StyleProperties extends JsonObject {
  color?: string;
  lineWidth?: number;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  opacity?: number;
  visible?: boolean;
}


interface UpdateElementStylePayload extends JsonObject {
  elementId: string;
  planeId: string;
  newStyle: StyleProperties;
}

function findStyleableElement(world: World, planeId: string, elementId: string): Element | undefined {
  const plane = world.getProjectionPlaneById(planeId);
  if (!plane) {
    throw new Error(`Plane not found: ${planeId}`);
  }

  return plane.getPoint(elementId) ?? plane.getLine(elementId) ?? plane.getCircle(elementId);
}

function serializeStyleProperties(style: StyleProperties): StyleProperties {
  const payload: StyleProperties = {};
  if (style.color !== undefined) payload.color = style.color;
  if (style.lineWidth !== undefined) payload.lineWidth = style.lineWidth;
  if (style.lineStyle !== undefined) payload.lineStyle = style.lineStyle;
  if (style.opacity !== undefined) payload.opacity = style.opacity;
  if (style.visible !== undefined) payload.visible = style.visible;
  return payload;
}

export function parseStyleProperties(payload: JsonObject): StyleProperties {
  const style: StyleProperties = {};
  if (payload.color !== undefined) {
    if (typeof payload.color !== 'string') throw new Error('Invalid UpdateElementStyle descriptor: newStyle.color must be string');
    style.color = payload.color;
  }
  if (payload.lineWidth !== undefined) {
    if (typeof payload.lineWidth !== 'number') throw new Error('Invalid UpdateElementStyle descriptor: newStyle.lineWidth must be number');
    style.lineWidth = payload.lineWidth;
  }
  if (payload.lineStyle !== undefined) {
    if (payload.lineStyle !== 'solid' && payload.lineStyle !== 'dashed' && payload.lineStyle !== 'dotted') {
      throw new Error('Invalid UpdateElementStyle descriptor: newStyle.lineStyle must be solid, dashed, or dotted');
    }
    style.lineStyle = payload.lineStyle;
  }
  if (payload.opacity !== undefined) {
    if (typeof payload.opacity !== 'number') throw new Error('Invalid UpdateElementStyle descriptor: newStyle.opacity must be number');
    style.opacity = payload.opacity;
  }
  if (payload.visible !== undefined) {
    if (typeof payload.visible !== 'boolean') throw new Error('Invalid UpdateElementStyle descriptor: newStyle.visible must be boolean');
    style.visible = payload.visible;
  }
  return style;
}

/**
 * UpdateElementStyleOp - Updates element visual style
 * 
 * Per data-model.md Command Pattern: All logic belongs in Operations, not Command subclasses.
 * This operation implements the apply/undo pattern for style updates.
 */
export class UpdateElementStyleOp implements IOperation<OperationDescriptor<'UpdateElementStyle', UpdateElementStylePayload>> {
  readonly type = 'UpdateElementStyle';
  outputs: OperationOutputBag = {};
  
  private previousStyle: VisualStyle | undefined = undefined;

  constructor(
    private elementId: string,
    private planeId: string,
    private newStyle: StyleProperties
  ) {
  }

  apply(context: OperationContext): OperationResult {
    try {
      const element = findStyleableElement(context.world, this.planeId, this.elementId);
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

  undo(context: OperationContext): void {
    const element = findStyleableElement(context.world, this.planeId, this.elementId);
    if (!element) {
      throw new Error(`Cannot undo style update: element not found: ${this.elementId}`);
    }

    // Restore previous style
    element.visualStyle = this.previousStyle ? { ...this.previousStyle } : undefined;
  }

  serialize(): OperationDescriptor<'UpdateElementStyle', UpdateElementStylePayload> {
    return {
      opType: this.type,
      payload: {
        elementId: this.elementId,
        planeId: this.planeId,
        newStyle: serializeStyleProperties(this.newStyle)
      }
    };
  }
}
