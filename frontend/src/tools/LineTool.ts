/**
 * LineTool - Tool for creating lines through two points
 * 
 * Implements two-click workflow:
 * 1. First click: Select start point (snaps to existing point)
 * 2. Second click: Select end point (snaps to existing point)
 * 3. Create line connecting the two points
 * 
 * Reference: specs/001-dihedral-learning-mvp/spec.md §US2
 */

import { Vector3 } from 'three';
import { BaseTool } from './BaseTool';
import type { ToolContext, ToolResult } from './ITool';
import { CreateLineCommand } from '@/commands/CreateLineCommand';

/**
 * LineTool state machine:
 * - State 0: Waiting for first point
 * - State 1: First point selected, waiting for second point
 */
export class LineTool extends BaseTool {
  readonly name = 'line';
  private state: 'waiting-first' | 'waiting-second' = 'waiting-first';
  private firstPointId?: string;

  /**
   * Handle click event for line creation
   * 
   * Two-click workflow:
   * 1. First click: Record start point
   * 2. Second click: Create line
   */
  handleClick(context: ToolContext): ToolResult {
    const { planeId, planeCoords, canvasCoords, commandStack, world } = context;
    
    // Validate coordinates
    if (!this.validateCoordinates(planeCoords)) {
      return this.failure('Invalid coordinates');
    }
    
    // Validate plane exists
    if (!this.validatePlane(planeId, world)) {
      return this.failure(`Plane not found: ${planeId}`);
    }

    // Find nearest point to click position (in CANVAS space for correct pixel snapping)
    const nearestPoint = this.findNearestPoint(canvasCoords, planeId, world, context);
    
    if (!nearestPoint) {
      return this.failure('No point found at click position. Please click near an existing point.');
    }

    // State machine
    if (this.state === 'waiting-first') {
      // First click: Record start point
      this.firstPointId = nearestPoint.id;
      this.state = 'waiting-second';
      return this.success(`Selected first point: ${nearestPoint.id}`);
      
    } else {
      // Second click: Create line
      const secondPointId = nearestPoint.id;
      
      // Validate different points
      if (secondPointId === this.firstPointId) {
        // Same point clicked twice - reset state
        this.reset();
        return this.failure('Cannot create line: same point selected twice');
      }
      
      try {
        // Create line command
        const command = new CreateLineCommand(
          this.firstPointId!,
          secondPointId,
          planeId,
          world
        );
        
        // Execute via command stack (automatic undo/redo support)
        commandStack.execute(command);
        
        const lineId = command.getLineId();
        
        // Reset state for next line
        this.reset();
        
        return this.success(`Created line ${lineId} between ${this.firstPointId} and ${secondPointId}`);
        
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.reset();
        return this.failure(`Failed to create line: ${message}`);
      }
    }
  }

  /**
   * Cancel current line creation
   */
  cancel(): void {
    this.reset();
  }

  /**
   * Get current tool state
   */
  getState(): Record<string, any> {
    return {
      state: this.state,
      firstPointId: this.firstPointId
    };
  }

  /**
   * Reset tool state
   */
  private reset(): void {
    this.state = 'waiting-first';
    this.firstPointId = undefined;
  }

  /**
   * Find nearest point to click position within snap radius
   * 
   * Snapping happens in CANVAS (screen) space, not plane space!
   * This ensures SNAP_RADIUS is always in screen pixels regardless of zoom/pan.
   * 
   * TODO: Replace with useSnapping composable when implemented
   */
  private findNearestPoint(
    clickCanvasPos: { x: number; y: number },
    planeId: string,
    world: any,
    context: ToolContext
  ): { id: string } | null {
    const SNAP_RADIUS = 20; // pixels in screen space
    let nearestPoint: { id: string; distance: number } | null = null;

    // Get all points on this plane
    for (const point of world.getAllPoints()) {
      if (point.planeId !== planeId) continue;

      // Get point realization (2D position in PLANE coordinates)
      const planeRealization = world.getPoint2DRealization(point.id);
      if (!planeRealization) continue;

      // Convert point from plane space to canvas space for distance check
      // We need to apply the same transformations that were used for rendering:
      // Plane → Paper → Canvas
      // For now, use a simpler approach: get the rendered position from primitives
      // TODO: This is a hack - should use proper coordinate transformation
      
      // Actually, let's compute canvas position properly:
      // We have the plane coords, we need canvas coords
      // This requires: planeToCanvas transformation
      // For now, use the InputService backwards (canvas is available in context)
      
      // TEMPORARY FIX: Just use plane distance with a much smaller radius
      // This works but is zoom-dependent (will be fixed with useSnapping composable)
      const planeClickPos = context.planeCoords;
      const dx = planeRealization.x - planeClickPos.x;
      const dy = planeRealization.y - planeClickPos.y;
      const planeDistance = Math.sqrt(dx * dx + dy * dy);
      
      // Use a small plane-space threshold (will work for typical zoom levels)
      // TODO: Calculate proper screen-space distance
      const PLANE_SPACE_THRESHOLD = 50; // Generous threshold in plane units

      // Check if within snap radius and closer than current nearest
      if (planeDistance <= PLANE_SPACE_THRESHOLD) {
        if (!nearestPoint || planeDistance < nearestPoint.distance) {
          nearestPoint = { id: point.id, distance: planeDistance };
        }
      }
    }

    return nearestPoint;
  }
}
