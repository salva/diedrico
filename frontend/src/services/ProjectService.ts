/**
 * ProjectService - current-schema command-stream persistence orchestration.
 */

import { World } from '@/domain/world/World';
import type { CommandStack } from '@/commands/CommandStack';
import { Command, type CommandSnapshot } from '@/commands/Command';
import type { OperationDescriptor } from '@/commands/operations/IOperation';
import { deserializeOperation } from '@/commands/operations/OperationRegistry';

export interface ProjectData {
  id: string;
  name: string;
  schemaVersion: string;
  created: string;
  modified: string;
  nextElementId: number;
  commands: SerializedCommand[];
}

type SerializedCommand = CommandSnapshot;
type SerializedOperation = OperationDescriptor;

export class ProjectService {
  private static readonly SCHEMA_VERSION = '6.0.0';

  static serializeCommands(commandStack: CommandStack, nextElementId: number, projectName: string): ProjectData {
    if (!Number.isInteger(nextElementId) || nextElementId < 1) {
      throw new Error(`Invalid next element ID: ${nextElementId}`);
    }
    const now = new Date().toISOString();
    const commands = commandStack.getCommittedCommands().map(command => command.toSnapshot());

    return {
      id: this.generateProjectId(),
      name: projectName,
      schemaVersion: this.SCHEMA_VERSION,
      created: now,
      modified: now,
      nextElementId,
      commands
    };
  }

  static deserializeCommands(data: ProjectData, world: World, commandStack: CommandStack): void {
    this.validateProjectData(data);
    commandStack.clear();
    world.restoreNextId(data.nextElementId);

    const restoredCommands: Command[] = [];
    for (const serializedCommand of data.commands) {
      const operations = serializedCommand.operations.map((descriptor: SerializedOperation) => deserializeOperation(descriptor));
      for (const operation of operations) {
        const result = operation.apply(world);
        if (!result.success) {
          throw new Error(`Failed to replay operation ${operation.type}: ${result.error}`);
        }
      }
      restoredCommands.push(Command.restore({
        id: serializedCommand.id,
        timestamp: serializedCommand.timestamp,
        description: serializedCommand.description,
        operations
      }, world));
    }

    commandStack.restoreCommittedCommands(restoredCommands);

    if (!world.getActivePlaneId()) {
      const planes = world.getAllProjectionPlanes();
      const ph = planes.find(p => p.id === 'projPlaneH' || p.name === 'P_H');
      if (ph) {
        world.setActivePlaneId(ph.id);
      } else if (planes.length > 0) {
        world.setActivePlaneId(planes[0].id);
      }
    }
  }

  static validateProjectData(data: unknown): asserts data is ProjectData {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('Invalid project file - not a valid JSON object');
    }
    const record = data as Partial<ProjectData>;
    if (record.schemaVersion !== this.SCHEMA_VERSION) {
      throw new Error(`Unsupported project schema version: ${String(record.schemaVersion)}`);
    }
    for (const field of ['id', 'name', 'created', 'modified'] as const) {
      if (typeof record[field] !== 'string' || record[field]!.length === 0) {
        throw new Error(`Invalid project file - missing required field: ${field}`);
      }
    }
    if (!Number.isInteger(record.nextElementId) || record.nextElementId < 1) {
      throw new Error('Invalid project file - nextElementId must be a positive integer');
    }
    if (!Array.isArray(record.commands)) {
      throw new Error('Invalid project file - commands must be an array');
    }
    for (const command of record.commands) {
      this.validateSerializedCommand(command);
    }
  }

  private static validateSerializedCommand(command: unknown): asserts command is SerializedCommand {
    if (!command || typeof command !== 'object' || Array.isArray(command)) {
      throw new Error('Invalid project file - command must be an object');
    }
    const record = command as Partial<SerializedCommand>;
    if (typeof record.id !== 'string' || record.id.length === 0) {
      throw new Error('Invalid project file - command missing id');
    }
    if (typeof record.timestamp !== 'string' || Number.isNaN(Date.parse(record.timestamp))) {
      throw new Error(`Invalid project file - command ${record.id} has invalid timestamp`);
    }
    if (typeof record.description !== 'string' || record.description.length === 0) {
      throw new Error(`Invalid project file - command ${record.id} missing description`);
    }
    if (record.status !== 'committed') {
      throw new Error(`Invalid project file - command ${record.id} must be committed`);
    }
    if (!Array.isArray(record.operations) || record.operations.length === 0) {
      throw new Error(`Invalid project file - command ${record.id} must contain operations`);
    }
    for (const operation of record.operations) {
      if (!operation || typeof operation !== 'object' || Array.isArray(operation) || typeof (operation as { opType?: unknown }).opType !== 'string') {
        throw new Error(`Invalid project file - command ${record.id} has invalid operation descriptor`);
      }
    }
  }

  private static generateProjectId(): string {
    return `proj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
