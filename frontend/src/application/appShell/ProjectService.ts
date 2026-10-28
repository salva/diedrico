/**
 * ProjectService - current-schema command-stream persistence orchestration.
 */

import type { CommandStack } from '@/commands/CommandStack';
import { Command, type CommandSnapshot } from '@/commands/Command';
import type { OperationDescriptor } from '@/commands/operations/IOperation';
import type { OperationContext } from '@/commands/operations/OperationContext';
import { assertOperationDescriptor, assertRestorableOperationDescriptor, deserializeOperation } from '@/commands/operations/OperationRegistry';
import type { ChangeNotifier } from '@/application/appShell/RuntimeChangePublisher';
import type { VisibilityModel } from '@/application/processTree/VisibilityModel';

export interface ProjectData {
  id: string;
  name: string;
  schemaVersion: string;
  created: string;
  modified: string;
  nextElementId: number;
  commands: SerializedCommand[];
  labelCounts?: Record<string, number>;
}

type SerializedCommand = CommandSnapshot;
type SerializedOperation = OperationDescriptor;

export class ProjectService {
  private static readonly SCHEMA_VERSION = '8.0.0';

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

  static deserializeCommands(
    data: ProjectData,
    visibilityModel: VisibilityModel,
    commandStack: CommandStack,
    operationContext: OperationContext,
    notifier: ChangeNotifier = { notifyChange: () => {} },
  ): void {
    this.validateProjectData(data);
    commandStack.clear();
    visibilityModel.clear();
    operationContext.processTree.clear();
    operationContext.realizations.clear();
    operationContext.idAllocator.restore(data.nextElementId);

    const restoredCommands: Command[] = [];
    for (const serializedCommand of data.commands) {
      const operations = serializedCommand.operations.map((descriptor: SerializedOperation) => deserializeOperation(descriptor));
      for (const operation of operations) {
        const result = operation.apply(operationContext);
        if (!result.success) {
          throw new Error(`Failed to replay operation ${operation.type}: ${result.error}`);
        }
      }
      restoredCommands.push(Command.restore({
        id: serializedCommand.id,
        timestamp: serializedCommand.timestamp,
        description: serializedCommand.description,
        operations
      }, operationContext, notifier));
    }

    if (data.labelCounts) {
      for (const [type, count] of Object.entries(data.labelCounts)) operationContext.labelGenerator.setCount(type, count);
    }
    commandStack.restoreCommittedCommands(restoredCommands);

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
    if (typeof record.nextElementId !== 'number' || !Number.isInteger(record.nextElementId) || record.nextElementId < 1) {
      throw new Error('Invalid project file - nextElementId must be a positive integer');
    }
    if (record.labelCounts !== undefined) {
      const counts = record.labelCounts;
      const types = ['Point2D', 'Line2D', 'Circle2D', 'Guide2D', 'ProjectionPlane', 'HingeLine'];
      if (!counts || typeof counts !== 'object' || Array.isArray(counts)
        || Object.entries(counts).some(([type, value]) => !types.includes(type) || !Number.isSafeInteger(value) || value < 0)) {
        throw new Error('Invalid project file - labelCounts must contain known categories and nonnegative safe integers');
      }
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
      try {
        assertOperationDescriptor(operation);
        assertRestorableOperationDescriptor(operation);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`Invalid project file - command ${record.id} has invalid operation descriptor: ${detail}`);
      }
    }
  }

  private static generateProjectId(): string {
    return `proj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
