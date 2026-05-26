/**
 * AddBrokenHingeLineOp - Create broken hinge line for auxiliary projection plane
 * 
 * Phase 101: Broken Hinge Lines (BHL) for Auxiliary Planes
 * 
 * Creates a BrokenHingeLine with its two sibling traces:
 * 1. BrokenHingeLine (3D entity)
 * 2. BrokenHalfHingeLine2D on plane1 (T2 or T2')
 * 3. BrokenHalfHingeLine2D on plane2 (T2 or T2')
 * 
 * CRITICAL: Siblings reference each other via siblingBHHLId to enable:
 * - Auto-creating sibling guides when guide is placed on BHHL
 * - Arc rendering between corresponding guide pairs
 * 
 * The operation is atomic and reversible (undo removes all three entities).
 * 
 * @see BrokenHingeLine in BrokenHingeLine.ts
 * @see BrokenHalfHingeLine2D in BrokenHalfHingeLine2D.ts
 */

import type { IOperation, OperationResult } from '../IOperation';
import type { World } from '@/domain/world/World';
import { BrokenHingeLine } from '@/domain/world/BrokenHingeLine';
import { BrokenHalfHingeLine2D } from '@/domain/world/elements/BrokenHalfHingeLine2D';

export class AddBrokenHingeLineOp implements IOperation {
  readonly type = 'AddBrokenHingeLine';
  readonly parameters: Record<string, any>;
  outputs: Record<string, any> = {};

  constructor(
    private mainHingeId: string,           // ID of main hinge line (T1)
    private auxiliaryPlaneId: string,      // ID of auxiliary projection plane (Q)
    private plane1Id: string,              // ID of first plane (has one BHHL trace)
    private plane2Id: string,              // ID of second plane (has other BHHL trace)
    private brokenHingeLineId?: string,    // Optional BHL ID (for redo)
    private bhhl1Id?: string,              // Optional BHHL ID on plane1 (for redo)
    private bhhl2Id?: string               // Optional BHHL ID on plane2 (for redo)
  ) {
    this.parameters = {
      mainHingeId,
      auxiliaryPlaneId,
      plane1Id,
      plane2Id,
      brokenHingeLineId,
      bhhl1Id,
      bhhl2Id
    };
  }

  apply(world: World): OperationResult {
    try {
      // Validate inputs
      const mainHinge = world.getHingeLineById(this.mainHingeId);
      if (!mainHinge) {
        throw new Error(`Main hinge line not found: ${this.mainHingeId}`);
      }

      const auxPlane = world.getProjectionPlaneById(this.auxiliaryPlaneId);
      if (!auxPlane) {
        throw new Error(`Auxiliary projection plane not found: ${this.auxiliaryPlaneId}`);
      }

      const plane1 = world.getProjectionPlaneById(this.plane1Id);
      const plane2 = world.getProjectionPlaneById(this.plane2Id);
      if (!plane1 || !plane2) {
        throw new Error(`One or both planes not found: ${this.plane1Id}, ${this.plane2Id}`);
      }

      // Generate IDs (use existing for redo, or generate new)
      const bhlId = this.brokenHingeLineId || this.outputs.brokenHingeLineId || world.generateHingeLineId();
      const bhhl1Id = this.bhhl1Id || this.outputs.bhhl1Id || plane1!.generateLine2DId(world);
      const bhhl2Id = this.bhhl2Id || this.outputs.bhhl2Id || plane2!.generateLine2DId(world);

      // Validation: Ensure IDs match their intended planes
      if (bhhl1Id && !bhhl1Id.startsWith(this.plane1Id + '/')) {
        throw new Error(
          `AddBrokenHingeLineOp: bhhl1Id "${bhhl1Id}" does not start with plane1Id "${this.plane1Id}/". ` +
          `This indicates a parameter mismatch during deserialization.`
        );
      }
      if (bhhl2Id && !bhhl2Id.startsWith(this.plane2Id + '/')) {
        throw new Error(
          `AddBrokenHingeLineOp: bhhl2Id "${bhhl2Id}" does not start with plane2Id "${this.plane2Id}/". ` +
          `This indicates a parameter mismatch during deserialization.`
        );
      }

      // Generate label for BrokenHingeLine only (BHHLs generate their own labels)
      const bhlLabel = world.generateDefaultLabel(bhlId, 'BrokenHingeLine');

      // Create BrokenHingeLine (3D entity)
      const brokenHingeLine = new BrokenHingeLine(
        bhlId,
        bhlLabel,
        this.plane1Id,
        this.plane2Id,
        this.mainHingeId,
        this.auxiliaryPlaneId
      );

      // Create BrokenHalfHingeLine2D traces using the authoritative BrokenHingeLine id.
      // Create BrokenHalfHingeLine2D on plane1 (no label - will generate BHHL_{n})
      const bhhl1 = new BrokenHalfHingeLine2D(
        bhhl1Id,
        this.plane1Id,    // planeId
        brokenHingeLine.id,  // broken hinge line id
        this.mainHingeId, // mainHingeId
        bhhl2Id           // siblingBHHLId (Reference to sibling on plane2)
        // No label parameter - constructor will generate BHHL_{n}
      );

      // Create BrokenHalfHingeLine2D on plane2 (no label - will generate BHHL_{n})
      const bhhl2 = new BrokenHalfHingeLine2D(
        bhhl2Id,
        this.plane2Id,    // planeId
        brokenHingeLine.id,  // broken hinge line id
        this.mainHingeId, // mainHingeId
        bhhl1Id           // siblingBHHLId (Reference to sibling on plane1)
        // No label parameter - constructor will generate BHHL_{n}
      );

      // Add to World storage through the narrow hinge-line entity API.
      world.addHingeLineEntity(brokenHingeLine);
      plane1.addLine(bhhl1);
      plane2.addLine(bhhl2);

      // Register dependencies
      world.getDependencyService().registerNode(bhlId, brokenHingeLine.getDependencies());
      world.getDependencyService().registerNode(bhhl1Id, bhhl1.getDependencies());
      world.getDependencyService().registerNode(bhhl2Id, bhhl2.getDependencies());

      // Mark World as dirty (triggers reactivity)
      world.markDirty();

      // Store outputs for undo
      this.outputs = {
        brokenHingeLineId: bhlId,
        bhhl1Id,
        bhhl2Id,
        plane1Id: this.plane1Id,
        plane2Id: this.plane2Id
      };

      // Back-fill generated IDs into parameters for persistence
      this.parameters.brokenHingeLineId = bhlId;
      this.parameters.bhhl1Id = bhhl1Id;
      this.parameters.bhhl2Id = bhhl2Id;

      return {
        success: true,
        outputs: this.outputs
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
    if (this.outputs.brokenHingeLineId && this.outputs.bhhl1Id && this.outputs.bhhl2Id) {
      // Unregister from dependency service
      world.getDependencyService().unregisterNode(this.outputs.brokenHingeLineId);
      world.getDependencyService().unregisterNode(this.outputs.bhhl1Id);
      world.getDependencyService().unregisterNode(this.outputs.bhhl2Id);

      // Remove from World storage
      world.removeHingeLine(this.outputs.brokenHingeLineId);

      // Remove from projection planes
      const plane1 = world.getProjectionPlaneById(this.outputs.plane1Id);
      const plane2 = world.getProjectionPlaneById(this.outputs.plane2Id);
      if (plane1) plane1.removeLine(this.outputs.bhhl1Id);
      if (plane2) plane2.removeLine(this.outputs.bhhl2Id);

      world.markDirty();
    }
  }

  serialize() {
    return {
      opType: this.type,
      mainHingeId: this.mainHingeId,
      auxiliaryPlaneId: this.auxiliaryPlaneId,
      plane1Id: this.plane1Id,
      plane2Id: this.plane2Id,
      brokenHingeLineId: this.outputs.brokenHingeLineId || this.parameters.brokenHingeLineId,
      bhhl1Id: this.outputs.bhhl1Id || this.parameters.bhhl1Id,
      bhhl2Id: this.outputs.bhhl2Id || this.parameters.bhhl2Id
    };
  }
}
