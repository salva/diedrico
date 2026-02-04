/**
 * ProjectService - Handles project serialization/deserialization based on command history
 * 
 * Provides methods to:
 * - Serialize command stream to JSON format (for saving)
 * - Deserialize and replay commands to reconstruct World (for loading)
 * 
 * Architecture:
 * - Projects are saved as a sequence of commands, not final state
 * - On load, commands are replayed to reconstruct the World
 * - This preserves construction history and enables parametric updates
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §Command Pattern
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §Operation
 */

import { World } from '@/domain/world/World';
import type { CommandStack } from '@/commands/CommandStack';
import type { IOperation } from '@/commands/operations/IOperation';
import { Vector4, Matrix3, Vector3 } from 'three';
import { Matrix4x3, Matrix3x4 } from '@/utils/threeUtils';

// Import all operation classes for deserialization
import { AddFreePoint2DOp } from '@/commands/operations/world/AddFreePointOp';
import { 
  AddLine2DByTwoPointsOp, 
  AddLine2DPerpendicularToLineOp,
  AddLine2DParallelToLineOp,
  AddLine2DTangentToCircleThroughPointOp,
  AddLine2DTangentToCircleParallelToLineOp
} from '@/commands/operations/world/AddLineOp';
import { AddSegment2DByPointsOp } from '@/commands/operations/world/AddSegmentOp';
import { AddCircle2DByCenterAndPointOp } from '@/commands/operations/world/AddCircleOp';
import { AddGuide2DPerpendicularToLineOp, AddSiblingGuide2DOp } from '@/commands/operations/world/AddGuideOp';
import { AddLineLineIntersectionPoint2DOp } from '@/commands/operations/world/AddLineLineIntersectionPoint2DOp';
import { AddLineCircleIntersectionPoint2DOp } from '@/commands/operations/world/AddLineCircleIntersectionPoint2DOp';
import { AddCircleCircleIntersectionPoint2DOp } from '@/commands/operations/world/AddCircleCircleIntersectionPoint2DOp';
import { AddSiblingIntersectionPoint2DOp } from '@/commands/operations/world/AddSiblingIntersectionPoint2DOp';
import { RemovePoint2DOp, RemoveLine2DOp, RemoveSegment2DOp, RemoveCircle2DOp, RemoveGuide2DOp } from '@/commands/operations/world/RemoveElementOps';
import { UpdateElementStyleOp } from '@/commands/operations/world/UpdateElementStyleOp';
import { UpdateFreePoint2DPositionOp } from '@/commands/operations/world/UpdateFreePoint2DPositionOp';
import { RemoveActionFromProcessTreeOp, RemoveActionGroupFromProcessTreeOp, RemoveSubprocessFromProcessTreeOp } from '@/commands/operations/processTree/ProcessTreeOperations';
import { AddProcessTreeActionOp } from '@/commands/operations/processTree/AddProcessTreeActionOp';
import { AddProcessTreeActionGroupOp } from '@/commands/operations/processTree/AddProcessTreeActionGroupOp';
import { PushSubprocessOp } from '@/commands/operations/processTree/PushSubprocessOp';
import { PopSubprocessOp } from '@/commands/operations/processTree/PopSubprocessOp';
import { RenameSubprocessOp } from '@/commands/operations/processTree/RenameSubprocessOp';
import { ToggleEncapsulationOp } from '@/commands/operations/processTree/ToggleEncapsulationOp';
import { ToggleOutputOp } from '@/commands/operations/processTree/ToggleOutputOp';
import { createActionGroup } from '@/domain/processTree/ActionGroup';
import { AddIntersectionPoint2DOp } from '@/commands/operations/world/AddIntersectionPointOp';
import {
  CreateInitializationSubprocessOp,
  AddPlane3DFixedOp,
  AddProjectionPlaneFixedOp,
  AddOriginPoint2DOp,
  AddHingeLineOp,
  AddHalfHingeLine2DOp
} from '@/commands/operations/world/InitializationOps';
import { Add3DPlaneOp } from '@/commands/operations/world/Add3DPlaneOp';
import { Add3DPointOp } from '@/commands/operations/world/Add3DPointOp';
import { Add3DLineOp } from '@/commands/operations/world/Add3DLineOp';
import { Add3DSegmentOp } from '@/commands/operations/world/Add3DSegmentOp';
import { AddAuxiliaryProjectionPlaneOp } from '@/commands/operations/world/AddAuxiliaryProjectionPlaneOp';

/**
 * Project data structure based on command stream
 */
export interface ProjectData {
  id: string;
  name: string;
  schemaVersion: string;
  created: string;
  modified: string;
  nextElementId: number;  // World.nextId counter for element ID generation
  commands: SerializedCommand[];
}

/**
 * Serialized command structure
 */
interface SerializedCommand {
  id: string;
  timestamp: string;
  description: string;
  operations: SerializedOperation[];
}

/**
 * Serialized operation structure - Flattened (v4.0.0)
 */
interface SerializedOperation {
  opType: string;
  [key: string]: any;
}

export class ProjectService {
  private static readonly SCHEMA_VERSION = '6.0.0';  // Phase 95: camelCase IDs (Breaking change from 4.0.0)

  /**
   * Phase 95: Migrate element IDs from snake_case to camelCase format
   * 
   * Converts old format IDs to new format:
   * - point2d_5 → point2d5
   * - proj_plane_H → projPlaneH  
   * - hinge_line_1 → hingeLine1
   * - plane_PH → planePH
   * - node_123_abc → node123abc
   * 
   * This migration is applied automatically when loading projects with schema version < 6.0.0
   * 
   * @param oldId - Old format ID with underscores
   * @returns New format ID in camelCase
   */
  private static migrateIdToCamelCase(oldId: string): string {
    // Phase 95 migration patterns
    const migrations: Array<[RegExp, (match: RegExpMatchArray) => string]> = [
      // Projection planes: proj_plane_H → projPlaneH, proj_plane_V → projPlaneV
      [/^proj_plane_([A-Z])$/, (m) => `projPlane${m[1]}`],
      
      // 3D planes: plane_PH → planePH, plane_PV → planePV, plane3d_N → plane3dN
      [/^plane_P([HV])$/, (m) => `planeP${m[1]}`],
      [/^plane3d_(\d+)$/, (m) => `plane3d${m[1]}`],
      [/^plane_(\d+)$/, (m) => `plane${m[1]}`],
      
      // Hinge lines: hinge_line_N → hingeLineN, HL_N → hingeLineN
      [/^hinge_line_(\d+)$/, (m) => `hingeLine${m[1]}`],
      [/^HL_(\d+)$/, (m) => `hingeLine${m[1]}`],
      
      // 2D elements: point2d_N → point2dN, line2d_N → line2dN, etc.
      [/^point2d_(\d+)$/, (m) => `point2d${m[1]}`],
      [/^line2d_(\d+)$/, (m) => `line2d${m[1]}`],
      [/^segment2d_(\d+)$/, (m) => `segment2d${m[1]}`],
      [/^circle2d_(\d+)$/, (m) => `circle2d${m[1]}`],
      [/^guide2d_(\d+)$/, (m) => `guide2d${m[1]}`],
      
      // 3D elements: point3d_N → point3dN, line3d_N → line3dN, etc.
      [/^point3d_(\d+)$/, (m) => `point3d${m[1]}`],
      [/^line3d_(\d+)$/, (m) => `line3d${m[1]}`],
      [/^segment3d_(\d+)$/, (m) => `segment3d${m[1]}`],
      
      // ProcessTree nodes: node_timestamp_random → nodetimestamprandom
      [/^node_(\d+)_([a-z0-9]+)$/, (m) => `node${m[1]}${m[2]}`],
      
      // Generic fallback: remove all underscores if no specific pattern matched
      // This handles edge cases like group_init_1234 → groupinit1234
      [/.*/, (m) => m[0].replace(/_/g, '')]
    ];
    
    // Apply first matching migration pattern
    for (const [pattern, transform] of migrations) {
      const match = oldId.match(pattern);
      if (match) {
        return transform(match);
      }
    }
    
    // Should never reach here due to fallback pattern
    return oldId;
  }

  /**
   * Phase 95: Migrate a full hierarchical ID (containerId/localId)
   * 
   * @param oldId - Old format hierarchical ID
   * @returns New format hierarchical ID with both parts migrated
   */
  private static migrateHierarchicalId(oldId: string): string {
    const parts = oldId.split('/');
    if (parts.length === 2) {
      // Hierarchical ID format: containerId/localId
      return `${this.migrateIdToCamelCase(parts[0])}/${this.migrateIdToCamelCase(parts[1])}`;
    }
    // Simple ID format (e.g., plane IDs, projection plane IDs)
    return this.migrateIdToCamelCase(oldId);
  }

  /**
   * Phase 95: Migrate all IDs in operation parameters
   * 
   * Recursively traverses operation parameters and migrates all string values
   * that look like IDs (contain underscores in recognized patterns)
   * 
   * @param params - Operation parameters object
   * @returns New parameters object with migrated IDs
   */
  private static migrateOperationParams(params: Record<string, any>): Record<string, any> {
    const migrated: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') {
        // Migrate string values that look like IDs
        // Check if string contains underscore and matches ID patterns
        if (value.includes('_') && (
          value.match(/^(proj_plane_|plane_|plane3d_|hinge_line_|HL_|point2d_|line2d_|segment2d_|circle2d_|guide2d_|point3d_|line3d_|segment3d_|node_|group_)/) ||
          value.match(/\/(point2d_|line2d_|segment2d_|circle2d_|guide2d_)/) // Hierarchical IDs
        )) {
          migrated[key] = this.migrateHierarchicalId(value);
        } else {
          migrated[key] = value;
        }
      } else if (Array.isArray(value)) {
        // Recursively migrate arrays
        migrated[key] = value.map(item => 
          typeof item === 'object' && item !== null 
            ? this.migrateOperationParams(item)
            : item
        );
      } else if (typeof value === 'object' && value !== null) {
        // Recursively migrate nested objects
        migrated[key] = this.migrateOperationParams(value);
      } else {
        // Copy other values as-is
        migrated[key] = value;
      }
    }
    
    return migrated;
  }

  /**
   * Phase 95: Migrate project data from old schema to current schema
   * 
   * Applies necessary migrations based on source schema version.
   * Currently supports migrating from 4.0.0 to 6.0.0.
   * 
   * @param data - Project data to migrate
   */
  private static migrateProjectData(data: ProjectData): void {
    const sourceVersion = data.schemaVersion;
    
    // Migration from 4.0.0 or 5.0.0 to 6.0.0: Convert IDs to camelCase
    if (sourceVersion === '4.0.0' || sourceVersion === '5.0.0') {
      console.log(`[ProjectService] Migrating project from schema ${sourceVersion} to ${this.SCHEMA_VERSION}`);
      console.log('[ProjectService] Converting element IDs from snake_case to camelCase');
      
      // Migrate all command operations
      for (const command of data.commands) {
        for (const operation of command.operations) {
          // Migrate all operation parameters
          Object.assign(operation, this.migrateOperationParams(operation));
        }
      }
      
      // Update schema version
      data.schemaVersion = this.SCHEMA_VERSION;
      console.log('[ProjectService] Migration complete');
    } else if (sourceVersion !== this.SCHEMA_VERSION) {
      throw new Error(
        `Cannot migrate project from schema version ${sourceVersion} to ${this.SCHEMA_VERSION}. ` +
        `This version is too old or too new. Please use an appropriate version of the application.`
      );
    }
  }

  /**
   * Serialize CommandStack to JSON
   * Captures the command history that can be replayed to reconstruct the World
   */
  static serializeCommands(commandStack: CommandStack, nextElementId: number, projectName: string): ProjectData {
    const now = new Date().toISOString();
    
    // Get commands from undo stack (committed commands that build the current state)
    const commands = commandStack.getCommands();
    
    const serializedCommands: SerializedCommand[] = commands.map(cmd => ({
      id: cmd.id,
      timestamp: cmd.timestamp.toISOString(),
      description: cmd.description,
      operations: (cmd as any).operations.map((op: IOperation) => {
        if (op.serialize) {
          return op.serialize();
        }
        // Fallback for operations without custom serialize method
        // Phase 95: Include outputs for ProcessTree node ID preservation
        return {
          opType: op.type,
          ...op.parameters,
          outputs: op.outputs
        };
      })
    }));
    
    return {
      id: this.generateProjectId(),
      name: projectName,
      schemaVersion: this.SCHEMA_VERSION,
      created: now,
      modified: now,
      nextElementId: nextElementId,  // Save ID counter
      commands: serializedCommands
    };
  }

  /**
   * Deserialize and replay commands to reconstruct World
   * Replays all commands from the saved project to rebuild the current state
   * Note: Assumes world is a fresh instance - caller should create new World before calling this
   */
  static deserializeCommands(data: ProjectData, world: World, commandStack: CommandStack): void {
    // Phase 95: Apply migrations before validation
    this.migrateProjectData(data);
    
    // Validate project data
    this.validateProjectData(data);
    
    // Clear command stack only (world should be fresh)
    commandStack.clear();
    
    // Restore World.nextId counter from saved value
    if (data.nextElementId !== undefined) {
      (world as any).nextId = data.nextElementId;
      console.log(`[ProjectService] Restored World.nextId to ${data.nextElementId}`);
    }
    
    console.log(`[ProjectService] Deserializing ${data.commands.length} commands`);
    
    // Replay each command
    for (const serializedCmd of data.commands) {
      console.log(`[ProjectService] Command: ${serializedCmd.description}`, serializedCmd.operations.map(op => op.opType));
      
      // Reconstruct operations from serialized data
      const operations: IOperation[] = serializedCmd.operations.map(serializedOp => {
        const op = this.reconstructOperation(serializedOp);
        console.log(`[ProjectService]   - Reconstructed ${serializedOp.opType}:`, serializedOp);
        return op;
      });
      
      // Create a command-like object that can be replayed
      const command = {
        id: serializedCmd.id,
        timestamp: new Date(serializedCmd.timestamp),
        description: serializedCmd.description,
        operations: operations,
        status: 'committed' as const,
        
        // Minimal undo/redo implementation for loaded commands
        undo() {
          for (let i = this.operations.length - 1; i >= 0; i--) {
            this.operations[i].undo(world);
          }
        },
        redo() {
          for (const op of this.operations) {
            op.apply(world);
          }
        }
      };
      
      // Replay operations to rebuild world state
      for (const op of operations) {
        console.log(`[ProjectService]   - Applying operation ${op.type}`);
        
        // Extra logging for toggle operations to track state
        if (op.type === 'ToggleOutput' || op.type === 'ToggleEncapsulation') {
          const params = (op as any).parameters;
          console.log(`[ProjectService]     Operation params:`, params);
        }
        
        const result = op.apply(world);
        if (!result.success) {
          console.error(`[ProjectService]   - Operation ${op.type} failed:`, result.error);
          throw new Error(`Failed to replay operation ${op.type}: ${result.error}`);
        }
        console.log(`[ProjectService]   - Operation ${op.type} succeeded, outputs:`, result.outputs);
      }
      
      // Add to command stack
      (commandStack as any).undoStack.push(command);  // Access private undoStack
    }

    // Phase 95: Ensure active plane is set after loading
    // Because operations don't typically store UI state like 'active plane', and initialization is skipped
    if (!world.getActivePlaneId()) {
      const planes = world.getAllProjectionPlanes();
      // Prefer P_H (Horizontal) if available
      const ph = planes.find(p => p.id === 'proj_plane_PH');
      if (ph) {
        world.setActivePlaneId(ph.id);
        console.log('[ProjectService] Restored active plane to P_H');
      } else if (planes.length > 0) {
        world.setActivePlaneId(planes[0].id);
        console.log(`[ProjectService] Restored active plane to first available: ${planes[0].id}`);
      } else {
        console.warn('[ProjectService] No projection planes found after loading project!');
      }
    }
  }
  
  /**
   * Reconstruct an operation from serialized data
   * Maps operation type to concrete operation class and instantiates with parameters
   */
  private static reconstructOperation(serializedOp: SerializedOperation): IOperation {
    const { opType: type, ...parameters } = serializedOp;
    
    // Instantiate the correct operation class based on type
    switch (type) {
      case 'AddFreePoint2D':
        const posInput = parameters.position;
        const pos = Array.isArray(posInput) 
          ? new Vector3(posInput[0], posInput[1], posInput[2])
          : new Vector3(posInput.x, posInput.y, posInput.z);
        
        const freePointOp = new AddFreePoint2DOp(
          parameters.planeId, 
          pos
        );
        // Restore the original point ID from serialization
        if (parameters.pointId) {
          freePointOp.outputs = { pointId: parameters.pointId };
        }
        return freePointOp;
      
      case 'AddLine2DByTwoPoints':
        const line2PointsOp = new AddLine2DByTwoPointsOp(parameters.planeId, parameters.point1Id, parameters.point2Id);
        if (parameters.lineId) {
          line2PointsOp.outputs = { lineId: parameters.lineId };
        }
        return line2PointsOp;

      case 'AddLine2DPerpendicularToLine':
        // Migration: old serialization had wrong parameters (circleId, tangentIndex instead of throughPointId)
        // If throughPointId is missing, skip this operation (corrupted data from bug before fix)
        if (!parameters.throughPointId) {
          console.warn('[ProjectService] Skipping corrupted AddLine2DPerpendicularToLine operation (missing throughPointId). This was caused by a serialization bug that has been fixed.');
          return null as any; // Will be filtered out by deserializeCommands
        }
        const perpLineOp = new AddLine2DPerpendicularToLineOp(parameters.planeId, parameters.referenceLineId, parameters.throughPointId);
        if (parameters.lineId) {
          perpLineOp.outputs = { lineId: parameters.lineId };
        }
        return perpLineOp;
      
      case 'AddLine2DParallelToLine':
        const parallelLineOp = new AddLine2DParallelToLineOp(parameters.planeId, parameters.referenceLineId, parameters.throughPointId);
        if (parameters.lineId) {
          parallelLineOp.outputs = { lineId: parameters.lineId };
        }
        return parallelLineOp;
      
      case 'AddLine2DTangentToCircleThroughPoint':
        const tangentThroughPointOp = new AddLine2DTangentToCircleThroughPointOp(
          parameters.planeId, 
          parameters.circleId, 
          parameters.throughPointId, 
          parameters.index
        );
        if (parameters.lineId) {
          tangentThroughPointOp.outputs = { lineId: parameters.lineId };
        }
        return tangentThroughPointOp;
      
      case 'AddLine2DTangentToCircleParallelToLine':
        const tangentParallelOp = new AddLine2DTangentToCircleParallelToLineOp(
          parameters.planeId, 
          parameters.circleId, 
          parameters.referenceLineId, 
          parameters.index
        );
        if (parameters.lineId) {
          tangentParallelOp.outputs = { lineId: parameters.lineId };
        }
        return tangentParallelOp;
      
      case 'AddSegment2DByPoints':
        const segmentOp = new AddSegment2DByPointsOp(parameters.planeId, parameters.point1Id, parameters.point2Id);
        if (parameters.segmentId) {
          segmentOp.outputs = { segmentId: parameters.segmentId };
        }
        return segmentOp;
      
      case 'AddCircle2DByCenterAndPoint':
        const circleOp = new AddCircle2DByCenterAndPointOp(parameters.planeId, parameters.centerPointId, parameters.circumferencePointId);
        if (parameters.circleId) {
          circleOp.outputs = { circleId: parameters.circleId };
        }
        return circleOp;
      
      case 'AddLineLineIntersectionPoint2D':
        const lineLineIntOp = new AddLineLineIntersectionPoint2DOp(parameters.planeId, parameters.line1Id, parameters.line2Id);
        if (parameters.pointId) {
          lineLineIntOp.outputs = { pointId: parameters.pointId };
        }
        return lineLineIntOp;
      
      case 'AddLineCircleIntersectionPoint2D':
        const lineCircleIntOp = new AddLineCircleIntersectionPoint2DOp(parameters.planeId, parameters.lineId, parameters.circleId, parameters.index);
        if (parameters.pointId) {
          lineCircleIntOp.outputs = { pointId: parameters.pointId };
        }
        return lineCircleIntOp;
      
      case 'AddCircleCircleIntersectionPoint2D':
        const circleCircleIntOp = new AddCircleCircleIntersectionPoint2DOp(parameters.planeId, parameters.circle1Id, parameters.circle2Id, parameters.index);
        if (parameters.pointId) {
          circleCircleIntOp.outputs = { pointId: parameters.pointId };
        }
        return circleCircleIntOp;
      
      case 'AddGuide2DPerpendicularToLine':
        const guideOp = new AddGuide2DPerpendicularToLineOp(parameters.planeId, parameters.referenceLineId, parameters.throughPointId);
        if (parameters.guideId) {
          guideOp.outputs = { guideId: parameters.guideId };
        }
        return guideOp;
      
      case 'AddSiblingGuide2D':
        const siblingGuideOp = new AddSiblingGuide2DOp(parameters.planeId, parameters.primaryGuideId, parameters.referenceLineId);
        if (parameters.guideId) {
          siblingGuideOp.outputs = { guideId: parameters.guideId };
        }
        return siblingGuideOp;
      
      case 'AddSiblingIntersectionPoint2D':
        const siblingIntOp = new AddSiblingIntersectionPoint2DOp(parameters.planeId, parameters.primaryIntersectionId);
        if (parameters.pointId) {
          siblingIntOp.outputs = { pointId: parameters.pointId };
        }
        return siblingIntOp;
      
      case 'RemovePoint2D':
        return new RemovePoint2DOp(parameters.planeId, parameters.pointId);
      
      case 'RemoveLine2D':
        return new RemoveLine2DOp(parameters.planeId, parameters.lineId);
      
      case 'RemoveSegment2D':
        return new RemoveSegment2DOp(parameters.planeId, parameters.segmentId);
      
      case 'RemoveCircle2D':
        return new RemoveCircle2DOp(parameters.planeId, parameters.circleId);
      
      case 'RemoveGuide2D':
        return new RemoveGuide2DOp(parameters.planeId, parameters.guideId);
      
      case 'UpdateElementStyle':
        return new UpdateElementStyleOp(parameters.elementId, parameters.planeId, parameters.newStyle);

      case 'UpdateFreePoint2DPosition':
        const newPosInput = parameters.newPosition;
        const newPos = Array.isArray(newPosInput)
          ? new Vector3(newPosInput[0], newPosInput[1], newPosInput[2])
          : new Vector3(newPosInput.x, newPosInput.y, newPosInput.z);
          
        return new UpdateFreePoint2DPositionOp(
          parameters.planeId, 
          parameters.pointId, 
          newPos
        );
      
      case 'RemoveActionFromProcessTree':
        return new RemoveActionFromProcessTreeOp(parameters.actionId);
      
      case 'RemoveActionGroupFromProcessTree':
        return new RemoveActionGroupFromProcessTreeOp(parameters.groupId);
      
      case 'RemoveSubprocessFromProcessTree':
        return new RemoveSubprocessFromProcessTreeOp(parameters.subprocessId);
      
      case 'AddIntersectionPoint2D':
        // Legacy operation - check if still used
        return new AddIntersectionPoint2DOp(parameters.planeId, parameters.element1Id, parameters.element2Id, parameters.index);
      
      // Initialization operations (Phase 47)
      case 'CreateInitializationSubprocess':
        return new CreateInitializationSubprocessOp(parameters.subprocessName || parameters.name);
      
      case 'AddPlane3D': // Legacy - for backward compatibility with old orientation-based format
        // Old format: { orientation: 'horizontal' | 'vertical' }
        // Convert to point + normal (homogeneous coordinates)
        const isHorizontal = parameters.orientation === 'horizontal';
        const legacyPoint = new Vector4(0, 0, 0, 1);  // Point at origin
        const legacyNormal = isHorizontal 
          ? new Vector4(0, 0, 1, 0)  // +Z for horizontal
          : new Vector4(0, 1, 0, 0); // +Y for vertical
        const legacyLabel = isHorizontal ? 'P_H' : 'P_V';
        return new AddPlane3DFixedOp(legacyPoint, legacyNormal, parameters.planeId, legacyLabel);
      
      case 'AddPlane3DFixed':
        // New format: { point: [x,y,z,w], normal: [x,y,z,w], planeId, label }
        // Supports both array (new) and object (legacy) formats
        const pIn = parameters.point;
        const nIn = parameters.normal;
        
        const point = Array.isArray(pIn) 
          ? new Vector4(pIn[0], pIn[1], pIn[2], pIn[3])
          : new Vector4(pIn.x, pIn.y, pIn.z, pIn.w);
          
        const normal = Array.isArray(nIn)
          ? new Vector4(nIn[0], nIn[1], nIn[2], nIn[3])
          : new Vector4(nIn.x, nIn.y, nIn.z, nIn.w);
          
        return new AddPlane3DFixedOp(point, normal, parameters.planeId, parameters.label);
      
      case 'AddProjectionPlaneFixed':
        // Deserialize transformation matrices
        // Phase 94: Only forward matrices needed, derived matrices computed in realization
        const planeToPaper2D = new Matrix3().fromArray(parameters.planeToPaper2D);
        const planeTo3D = new Matrix4x3().fromArray(parameters.planeTo3D);
        // Ignore threeDToPlane from old files (computed from planeTo3D now)
        return new AddProjectionPlaneFixedOp(
          parameters.plane3DId,
          planeToPaper2D,
          planeTo3D,
          parameters.projPlaneId,
          parameters.name
        );
      
      case 'AddOriginPoint2D':
        const originPosRaw = parameters.position || parameters.localPosition;
        const originPos = Array.isArray(originPosRaw)
          ? new Vector3(originPosRaw[0], originPosRaw[1], originPosRaw[2])
          : new Vector3(originPosRaw.x, originPosRaw.y, originPosRaw.z);
          
        return new AddOriginPoint2DOp(
          parameters.projPlaneId, 
          originPos,
          parameters.label,
          parameters.pointId
        );
      
      case 'AddHingeLine':
        // Fix: Use correct parameter names from AddHingeLineOp
        const hPlaneId = parameters.horizontalPlaneId || parameters.projPlaneAId; // Fallback for safety
        const vPlaneId = parameters.verticalPlaneId || parameters.projPlaneBId;
        return new AddHingeLineOp(hPlaneId, vPlaneId, parameters.hingeLineId);
      
      case 'AddHalfHingeLine2D':
        const halfHingeLineOp = new AddHalfHingeLine2DOp(
          parameters.projPlaneId, 
          parameters.hingeLineId
        );
        // Restore the original line ID from serialization
        if (parameters.lineId) {
          halfHingeLineOp.outputs = { lineId: parameters.lineId, projPlaneId: parameters.projPlaneId };
        }
        return halfHingeLineOp;
      
      case 'Add3DPlane':
        const plane3DOp = new Add3DPlaneOp(
          parameters.trace1Id,
          parameters.trace2Id,
          parameters.plane1Id,
          parameters.plane2Id,
          parameters.label
        );
        if (parameters.planeId) {
          plane3DOp.outputs = { planeId: parameters.planeId };
        }
        return plane3DOp;
      
      case 'Add3DPoint':
        const point3DOp = new Add3DPointOp(
          parameters.projection1Id,
          parameters.projection2Id,
          parameters.plane1Id,
          parameters.plane2Id,
          parameters.label
        );
        if (parameters.pointId) {
          point3DOp.outputs = { pointId: parameters.pointId };
        }
        return point3DOp;
      
      case 'Add3DLine':
        const line3DOp = new Add3DLineOp(
          parameters.projection1Id,
          parameters.projection2Id,
          parameters.plane1Id,
          parameters.plane2Id,
          parameters.label
        );
        if (parameters.lineId) {
          line3DOp.outputs = { lineId: parameters.lineId };
        }
        return line3DOp;
      
      case 'Add3DSegment':
        const segment3DOp = new Add3DSegmentOp(
          parameters.projection1Id,
          parameters.projection2Id,
          parameters.plane1Id,
          parameters.plane2Id,
          parameters.label
        );
        if (parameters.segmentId) {
          segment3DOp.outputs = { segmentId: parameters.segmentId };
        }
        return segment3DOp;
      
      case 'AddAuxiliaryProjectionPlane':
        const auxPlaneOp = new AddAuxiliaryProjectionPlaneOp(
          parameters.plane3DId,
          parameters.t1HingeTraceId,
          parameters.t2OtherTraceId,
          parameters.t2PrimeLineId,
          parameters.name
        );
        if (parameters.projPlaneId) {
          auxPlaneOp.outputs = { projPlaneId: parameters.projPlaneId };
        }
        return auxPlaneOp;
      
      case 'AddProcessTreeActionOp':
        return new AddProcessTreeActionOp(parameters.action, parameters.groupId);

      case 'AddProcessTreeActionGroup':
        // Reconstruct ActionGroup from ID (other properties like description are optional/default)
        // Note: Ideally all group properties should be serialized, but for now we just need the ID container
        const group = createActionGroup(parameters.groupId);
        return new AddProcessTreeActionGroupOp(group);

      case 'PushSubprocess':
        // Phase 95: Preserve subprocess ID during deserialization
        return new PushSubprocessOp(parameters.subprocessName, serializedOp.outputs?.subprocessId);
        
      case 'PopSubprocess':
        return new PopSubprocessOp();

      case 'RenameSubprocess':
        return new RenameSubprocessOp(parameters.subprocessId, parameters.newName);

      case 'ToggleEncapsulation':
        return new ToggleEncapsulationOp(parameters.subprocessId);

      case 'ToggleOutput':
        return new ToggleOutputOp(parameters.nodeId);

      default:
        throw new Error(`Unknown operation type: ${type}`);
    }
  }

  /**
   * Validate loaded JSON data structure
   */
  static validateProjectData(data: any): void {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid project file - not a valid JSON object');
    }
    
    // Check schema version first
    if (!data.schemaVersion) {
      throw new Error('Invalid project file - missing schema version');
    }
    
    if (data.schemaVersion !== this.SCHEMA_VERSION) {
      throw new Error(`This project was created with an older version (${data.schemaVersion}) and cannot be opened. Please create a new project instead.`);
    }
    
    // Check required fields
    const required = ['id', 'name', 'schemaVersion', 'created', 'modified', 'commands'];
    for (const field of required) {
      if (!(field in data)) {
        throw new Error(`Invalid project file - missing required field: ${field}`);
      }
    }
    
    // Check commands is an array
    if (!Array.isArray(data.commands)) {
      throw new Error('Invalid project file - commands must be an array');
    }
  }

  /**
   * Generate unique project ID
   */
  private static generateProjectId(): string {
    return `proj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
