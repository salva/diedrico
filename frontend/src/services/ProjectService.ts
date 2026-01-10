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
 * Serialized operation structure
 */
interface SerializedOperation {
  type: string;
  parameters: Record<string, any>;
}

export class ProjectService {
  private static readonly SCHEMA_VERSION = '3.0.0';  // Bumped to 3.0.0 for specialized intersection types

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
      operations: (cmd as any).operations.map((op: IOperation) => ({
        type: op.type,
        parameters: op.parameters
      }))
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
    const { type, parameters } = serializedOp;
    
    // Import and instantiate the correct operation class based on type
    switch (type) {
      case 'AddFreePoint2D': {
        const { AddFreePoint2DOp } = require('@/commands/operations/AddFreePointOp');
        return new AddFreePoint2DOp(parameters.planeId, parameters.position);
      }
      
      case 'AddLine2D': {
        const { AddLine2DOp } = require('@/commands/operations/AddLineOp');
        return new AddLine2DOp(parameters.planeId, parameters.point1Id, parameters.point2Id);
      }
      
      case 'AddSegment2D': {
        const { AddSegment2DOp } = require('@/commands/operations/AddSegmentOp');
        return new AddSegment2DOp(parameters.planeId, parameters.point1Id, parameters.point2Id);
      }
      
      case 'AddCircle2D': {
        const { AddCircle2DOp } = require('@/commands/operations/AddCircleOp');
        return new AddCircle2DOp(parameters.planeId, parameters.centerPointId, parameters.radiusPointId);
      }
      
      case 'AddLineLineIntersectionPoint2D': {
        const { AddLineLineIntersectionPoint2DOp } = require('@/commands/operations/AddLineLineIntersectionPoint2DOp');
        return new AddLineLineIntersectionPoint2DOp(parameters.planeId, parameters.line1Id, parameters.line2Id);
      }
      
      case 'AddLineCircleIntersectionPoint2D': {
        const { AddLineCircleIntersectionPoint2DOp } = require('@/commands/operations/AddLineCircleIntersectionPoint2DOp');
        return new AddLineCircleIntersectionPoint2DOp(parameters.planeId, parameters.lineId, parameters.circleId, parameters.index);
      }
      
      case 'AddCircleCircleIntersectionPoint2D': {
        const { AddCircleCircleIntersectionPoint2DOp } = require('@/commands/operations/AddCircleCircleIntersectionPoint2DOp');
        return new AddCircleCircleIntersectionPoint2DOp(parameters.planeId, parameters.circle1Id, parameters.circle2Id, parameters.index);
      }
      
      case 'AddGuide2D': {
        const { AddGuide2DOp } = require('@/commands/operations/AddGuideOp');
        return new AddGuide2DOp(parameters.planeId, parameters.lineId, parameters.pointId);
      }
      
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
