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
import { AddLine2DByTwoPointsOp } from '@/commands/operations/world/AddLineOp';
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

/**
 * Project data structure based on command stream
 */
export interface ProjectData {
  id: string;
  name: string;
  schemaVersion: string;
  created: string;
  modified: string;
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
  private static readonly SCHEMA_VERSION = '4.0.0';  // Flattened journal format

  /**
   * Serialize CommandStack to JSON
   * Captures the command history that can be replayed to reconstruct the World
   */
  static serializeCommands(commandStack: CommandStack, projectName: string): ProjectData {
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
        // Fallback for operations without custom serialize method (should be rare)
        return {
          opType: op.type,
          ...op.parameters
        };
      })
    }));
    
    return {
      id: this.generateProjectId(),
      name: projectName,
      schemaVersion: this.SCHEMA_VERSION,
      created: now,
      modified: now,
      commands: serializedCommands
    };
  }

  /**
   * Deserialize and replay commands to reconstruct World
   * Replays all commands from the saved project to rebuild the current state
   * Note: Assumes world is a fresh instance - caller should create new World before calling this
   */
  static deserializeCommands(data: ProjectData, world: World, commandStack: CommandStack): void {
    // Validate project data
    this.validateProjectData(data);
    
    // Clear command stack only (world should be fresh)
    commandStack.clear();
    
    // Replay each command
    for (const serializedCmd of data.commands) {
      // Reconstruct operations from serialized data
      const operations: IOperation[] = serializedCmd.operations.map(serializedOp => 
        this.reconstructOperation(serializedOp)
      );
      
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
        const result = op.apply(world);
        if (!result.success) {
          throw new Error(`Failed to replay operation ${op.type}: ${result.error}`);
        }
      }
      
      // Add to command stack
      (commandStack as any).undoStack.push(command);  // Access private undoStack
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
        
        return new AddFreePoint2DOp(
          parameters.planeId, 
          pos
        );
      
      case 'AddLine2DByTwoPoints':
        return new AddLine2DByTwoPointsOp(parameters.planeId, parameters.point1Id, parameters.point2Id);
      
      case 'AddSegment2DByPoints':
        return new AddSegment2DByPointsOp(parameters.planeId, parameters.point1Id, parameters.point2Id);
      
      case 'AddCircle2DByCenterAndPoint':
        return new AddCircle2DByCenterAndPointOp(parameters.planeId, parameters.centerPointId, parameters.circumferencePointId);
      
      case 'AddLineLineIntersectionPoint2D':
        return new AddLineLineIntersectionPoint2DOp(parameters.planeId, parameters.line1Id, parameters.line2Id);
      
      case 'AddLineCircleIntersectionPoint2D':
        return new AddLineCircleIntersectionPoint2DOp(parameters.planeId, parameters.lineId, parameters.circleId, parameters.index);
      
      case 'AddCircleCircleIntersectionPoint2D':
        return new AddCircleCircleIntersectionPoint2DOp(parameters.planeId, parameters.circle1Id, parameters.circle2Id, parameters.index);
      
      case 'AddGuide2DPerpendicularToLine':
        return new AddGuide2DPerpendicularToLineOp(parameters.planeId, parameters.referenceLineId, parameters.throughPointId);
      
      case 'AddSiblingGuide2D':
        return new AddSiblingGuide2DOp(parameters.planeId, parameters.primaryGuideId, parameters.referenceLineId);
      
      case 'AddSiblingIntersectionPoint2D':
        return new AddSiblingIntersectionPoint2DOp(parameters.planeId, parameters.primaryIntersectionId);
      
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
        const planeToPaper2D = new Matrix3().fromArray(parameters.planeToPaper2D);
        const planeTo3D = new Matrix4x3().fromArray(parameters.planeTo3D);
        const threeDToPlane = new Matrix3x4().fromArray(parameters.threeDToPlane);
        return new AddProjectionPlaneFixedOp(
          parameters.plane3DId,
          planeToPaper2D,
          planeTo3D,
          threeDToPlane,
          parameters.projPlaneId,
          parameters.name,
          parameters.orientation
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
        return new AddHalfHingeLine2DOp(
          parameters.projPlaneId, 
          parameters.hingeLineId,
          parameters.lineId
        );
      
      case 'AddProcessTreeActionOp':
        return new AddProcessTreeActionOp(parameters.action, parameters.groupId);

      case 'AddProcessTreeActionGroup':
        // Reconstruct ActionGroup from ID (other properties like description are optional/default)
        // Note: Ideally all group properties should be serialized, but for now we just need the ID container
        const group = createActionGroup(parameters.groupId);
        return new AddProcessTreeActionGroupOp(group);

      case 'PushSubprocess':
        return new PushSubprocessOp(parameters.subprocessName);
        
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
