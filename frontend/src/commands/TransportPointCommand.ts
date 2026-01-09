/**
 * TransportPointCommand - Command for transporting a point between planes via a guide
 * 
 * Implements point transport operation per dihedral projection principles:
 * 1. Source point on plane1
 * 2. Guide perpendicular to hinge line (exists on both planes)
 * 3. Calculate transported position on plane2
 * 4. Create new point at transported location
 * 
 * The transported point is created as a FreePoint2D at the calculated position.
 * Future enhancement: create TransportedPoint2D type that maintains dependency
 * on source point and guide for parametric updates.
 * 
 * Reference: specs/001-dihedral-learning-mvp/spec.md §Transport Point via Guide
 * Reference: specs/001-dihedral-learning-mvp/tasks.md Phase 15
 */

import { Command } from './Command';
import type { World } from '@/domain/world/World';
import { AddFreePoint2DOp } from './operations/AddFreePointOp';
import { transportPointViaGuide, validateTransportCompatibility } from '@/domain/calculations/Transport';
import { createPointAction } from '@/domain/processTree/actions/CreatePointAction';

export class TransportPointCommand extends Command {
  private sourcePointId: string;
  private guideId: string;
  private targetPlaneId: string;
  private transportedPointId?: string;  // Set after execution

  /**
   * @param sourcePointId ID of point to transport
   * @param guideId ID of guide to use for transport
   * @param targetPlaneId ID of target plane
   * @param world World instance
   */
  constructor(
    sourcePointId: string,
    guideId: string,
    targetPlaneId: string,
    world: World
  ) {
    super(`Transport point ${sourcePointId} via guide ${guideId} to ${targetPlaneId}`, world);
    this.sourcePointId = sourcePointId;
    this.guideId = guideId;
    this.targetPlaneId = targetPlaneId;
  }

  /**
   * Execute the transport operation
   */
  execute(): void {
    // Get source point
    const sourcePoint = this.world.getPoint2DById(this.sourcePointId);
    if (!sourcePoint) {
      throw new Error(`Source point ${this.sourcePointId} not found`);
    }

    // Get source point realization (position)
    const sourceRealization = this.world.getPoint2DRealization(this.sourcePointId);
    if (!sourceRealization) {
      throw new Error(`Cannot get realization for source point ${this.sourcePointId}`);
    }

    // Get guide
    const guide = this.world.getGuide2DById(this.guideId);
    if (!guide) {
      throw new Error(`Guide ${this.guideId} not found`);
    }

    // Get guide realization (guides are Line2D)
    const guideRealization = this.world.getLine2DRealization(this.guideId);
    if (!guideRealization) {
      throw new Error(`Cannot get realization for guide ${this.guideId}`);
    }

    // Get hinge line - guides must be associated with a reference line
    // For now, we assume guides store their reference line ID
    // TODO: Get the actual hinge line from the guide's definition
    const referenceLineId = (guide as any).referenceLineId;
    if (!referenceLineId) {
      throw new Error(`Guide ${this.guideId} has no reference line`);
    }

    const hingeLine = this.world.getLine2DById(referenceLineId);
    if (!hingeLine) {
      throw new Error(`Hinge line ${referenceLineId} not found`);
    }

    const hingeLineRealization = this.world.getLine2DRealization(referenceLineId);
    if (!hingeLineRealization) {
      throw new Error(`Cannot get realization for hinge line ${referenceLineId}`);
    }

    // Validate compatibility
    // TODO: Get guide's plane IDs - guides should belong to 2 planes
    const sourcePlaneId = sourcePoint.planeId;
    const guidePlaneIds = [sourcePlaneId, this.targetPlaneId];  // Simplified for now
    
    const compatibility = validateTransportCompatibility(
      sourcePlaneId,
      this.targetPlaneId,
      guidePlaneIds
    );

    if (!compatibility.valid) {
      throw new Error(`Transport validation failed: ${compatibility.error}`);
    }

    // Perform transport calculation
    const transportResult = transportPointViaGuide(
      sourceRealization.position,
      guideRealization,
      hingeLineRealization,
      this.targetPlaneId
    );

    if (!transportResult.success || !transportResult.transportedPosition) {
      throw new Error(`Transport calculation failed: ${transportResult.error}`);
    }

    // Create transported point as FreePoint2D
    const op = new AddFreePoint2DOp(this.targetPlaneId, transportResult.transportedPosition);
    this.addAndExecute(op);
    
    // Get the generated ID
    this.transportedPointId = op.outputs.pointId;

    // Create action for process tree
    // TODO: Create TransportPointAction that records dependency on source + guide
    const action = createPointAction(
      this.transportedPointId!,
      this.targetPlaneId,
      transportResult.transportedPosition
    );
    
    // Add metadata about transport
    (action as any).transportMetadata = {
      sourcePointId: this.sourcePointId,
      guideId: this.guideId,
      operationType: 'transport'
    };

    // Record action in process tree
    this.world.getProcessTree().addAction(action);
  }

  /**
   * Get the ID of the transported point (available after execute())
   */
  getTransportedPointId(): string | undefined {
    return this.transportedPointId;
  }
}
