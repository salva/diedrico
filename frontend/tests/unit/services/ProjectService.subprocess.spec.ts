/**
 * Subprocess Operations Serialization Tests
 * 
 * Purpose: Verify PushSubprocessOp and PopSubprocessOp survive serialization
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '@/domain/world/World';
import { CommandStack } from '@/commands/CommandStack';
import { ProjectService } from '@/services/ProjectService';
import { Command } from '@/commands/Command';

import { PushSubprocessOp } from '@/commands/operations/processTree/PushSubprocessOp';
import { PopSubprocessOp } from '@/commands/operations/processTree/PopSubprocessOp';
import { RenameSubprocessOp } from '@/commands/operations/processTree/RenameSubprocessOp';
import { ToggleEncapsulationOp } from '@/commands/operations/processTree/ToggleEncapsulationOp';
import { ToggleOutputOp } from '@/commands/operations/processTree/ToggleOutputOp';

describe('ProjectService Subprocess Operations Serialization', () => {
  let world: World;
  let commandStack: CommandStack;

  beforeEach(() => {
    world = new World();
    commandStack = new CommandStack();
  });

  it('PushSubprocessOp survives round-trip', () => {
    const op = new PushSubprocessOp('New Subprocess');
    
    const result = roundTripOperation(op, world, commandStack);
    
    expect(result).toBeInstanceOf(PushSubprocessOp);
    expect(result.type).toBe('PushSubprocess');
    expect(result.parameters.subprocessName).toBe('New Subprocess');
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
    expect(result.parameters.subprocessId).toBe('sub-123');
    expect(result.parameters.newName).toBe('My New Name');
  });

  it('ToggleEncapsulationOp survives round-trip', () => {
    const op = new ToggleEncapsulationOp('sub-123');
    
    const result = roundTripOperation(op, world, commandStack);
    
    expect(result).toBeInstanceOf(ToggleEncapsulationOp);
    expect(result.type).toBe('ToggleEncapsulation');
    expect(result.parameters.subprocessId).toBe('sub-123');
  });

  it('ToggleOutputOp survives round-trip', () => {
    const op = new ToggleOutputOp('node-123');
    
    const result = roundTripOperation(op, world, commandStack);
    
    expect(result).toBeInstanceOf(ToggleOutputOp);
    expect(result.type).toBe('ToggleOutput');
    expect(result.parameters.nodeId).toBe('node-123');
  });
});

/**
 * Helper: Round-trip an operation through serialization
 */
function roundTripOperation(op: any, world: World, commandStack: CommandStack): any {
  // 1. Create command with operation
  const cmd = new Command('Test command');
  (cmd as any).operations = [op];
  (commandStack as any).undoStack.push(cmd);
  
  // 2. Serialize
  const projectData = ProjectService.serializeCommands(commandStack, 'test-project');
  
  // 3. Deserialize using private method via type assertion
  const serializedOp = projectData.commands[0].operations[0];
  const reconstructed = (ProjectService as any).reconstructOperation(serializedOp);
  
  return reconstructed;
}
