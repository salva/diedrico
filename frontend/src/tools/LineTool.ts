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
  handleClick(coords: Vector3, context: ToolContext): ToolResult {
    const { planeId, commandStack, world } = context;
    
    // Validate coordinates
    if (!this.validateCoordinates(coords)) {
      return this.failure('Invalid coordinates');
    }
    
    // Validate plane exists
    if (!this.validatePlane(planeId, world)) {
      return this.failure(`Plane not found: ${planeId}`);
    }

    // Find nearest point to click position
    // TODO: Use useSnapping composable for snap detection with configurable radius
    const nearestPoint = this.findNearestPoint(coords, planeId, world);
    
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
   * TODO: Replace with useSnapping composable when implemented
   * For now, use simple distance check with 20px snap radius
   */
  private findNearestPoint(
    clickPos: Vector3,
    planeId: string,
    world: any
  ): { id: string } | null {
    const SNAP_RADIUS = 20; // pixels
    let nearestPoint: { id: string; distance: number } | null = null;

    // Get all points on this plane
    for (const point of world.getAllPoints()) {
      if (point.planeId !== planeId) continue;

      // Get point realization (2D position)
      const realization = world.getPoint2DRealization(point.id);
      if (!realization) continue;

      // Calculate distance from click to point
      const dx = realization.x - clickPos.x;
      const dy = realization.y - clickPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Check if within snap radius and closer than current nearest
      if (distance <= SNAP_RADIUS) {
        if (!nearestPoint || distance < nearestPoint.distance) {
          nearestPoint = { id: point.id, distance };
        }
      }
    }

    return nearestPoint;
  }
}
