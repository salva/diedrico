/**
 * Subprocess Operations Serialization Tests
 * 
 * Purpose: Verify PushSubprocessOp and PopSubprocessOp survive serialization
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { World } from '@/domain/world/World';
import type { CommandStack } from '@/commands/CommandStack';
import { ProjectService } from '@/services/ProjectService';
import { deserializeOperation } from '@/commands/operations/OperationRegistry';
import { Command } from '@/commands/Command';
import { createTestWorld } from '../../helpers/worldHelpers';

import { PushSubprocessOp } from '@/commands/operations/processTree/PushSubprocessOp';
import { PopSubprocessOp } from '@/commands/operations/processTree/PopSubprocessOp';
import { RenameSubprocessOp } from '@/commands/operations/processTree/RenameSubprocessOp';
import { ToggleEncapsulationOp } from '@/commands/operations/processTree/ToggleEncapsulationOp';
import { ToggleOutputOp } from '@/commands/operations/processTree/ToggleOutputOp';

describe('ProjectService Subprocess Operations Serialization', () => {
  let world: World;
  let commandStack: CommandStack;

  beforeEach(() => {
    const { world: w, commandStack: cs } = createTestWorld();
    world = w;
    commandStack = cs;
  });

  it('PushSubprocessOp survives round-trip', () => {
    const op = new PushSubprocessOp('New Subprocess');
    
    const result = roundTripOperation(op, world, commandStack);
    
    expect(result).toBeInstanceOf(PushSubprocessOp);
    expect(result.type).toBe('PushSubprocess');
    expect(result.serialize()).toMatchObject({ opType: 'PushSubprocess', subprocessName: 'New Subprocess' });
  });

  it('PopSubprocessOp survives round-trip', () => {
    const op = new PopSubprocessOp();
    
    const result = roundTripOperation(op, world, commandStack);
    
    expect(result).toBeInstanceOf(PopSubprocessOp);
    expect(result.type).toBe('PopSubprocess');
  });

  it('RenameSubprocessOp survives round-trip', () => {
    const op = new RenameSubprocessOp('sub-123', 'My New Name');
    
    const result = roundTripOperation(op, world, commandStack);
    
    expect(result).toBeInstanceOf(RenameSubprocessOp);
    expect(result.type).toBe('RenameSubprocess');
    expect(result.serialize()).toEqual({ opType: 'RenameSubprocess', subprocessId: 'sub-123', newName: 'My New Name' });
  });

  it('ToggleEncapsulationOp survives round-trip', () => {
    const op = new ToggleEncapsulationOp('sub-123');
    
    const result = roundTripOperation(op, world, commandStack);
    
    expect(result).toBeInstanceOf(ToggleEncapsulationOp);
    expect(result.type).toBe('ToggleEncapsulation');
    expect(result.serialize()).toEqual({ opType: 'ToggleEncapsulation', subprocessId: 'sub-123' });
  });

  it('ToggleOutputOp survives round-trip', () => {
    const op = new ToggleOutputOp('node-123');
    
    const result = roundTripOperation(op, world, commandStack);
    
    expect(result).toBeInstanceOf(ToggleOutputOp);
    expect(result.type).toBe('ToggleOutput');
    expect(result.serialize()).toEqual({ opType: 'ToggleOutput', nodeId: 'node-123' });
  });
});

/**
 * Helper: Round-trip an operation through serialization
 */
function roundTripOperation(op: any, world: World, commandStack: CommandStack): any {
  const expectedDescriptor = op.serialize();
  // 1. Create command with operation
  const cmd = Command.restore({
    id: 'cmd-test',
    timestamp: '2024-01-01T00:00:00.000Z',
    description: 'Test command',
    operations: [op]
  }, world);
  commandStack.restoreCommittedCommands([cmd]);
  
  // 2. Serialize
  const projectData = ProjectService.serializeCommands(commandStack, world.peekNextId(), 'test-project');
  
  // 3. Deserialize using private method via type assertion
  // Note: World initialization pushes commands to stack, so get the last command (our test command)
  const lastCommandIdx = projectData.commands.length - 1;
  const serializedOp = projectData.commands[lastCommandIdx].operations[0];
  const reconstructed = deserializeOperation(serializedOp);
  expect(serializedOp).toEqual(expectedDescriptor);
  expect(reconstructed.serialize()).toEqual(expectedDescriptor);
  
  return reconstructed;
}
