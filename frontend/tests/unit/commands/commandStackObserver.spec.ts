/**
 * Unit Tests: CommandStack Observer Pattern (Phase 91)
 * 
 * Tests the observer pattern implementation in CommandStack:
 * - subscribe() registers callback
 * - notify() calls callback on push, undo, redo actions
 * - Unsubscribe function works correctly
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommandStack } from '@/commands/CommandStack';
import { Command } from '@/commands/Command';
import type { World } from '@/domain/world/World';
import type { IOperation } from '@/commands/operations/IOperation';
import { createTestWorld } from '../../helpers/worldHelpers';

// Mock operation helper
const createMockOperation = (name: string = 'mock'): IOperation => ({
  type: `Mock_${name}`,
  parameters: {},
  outputs: { mockData: name },
  apply: () => ({ success: true, outputs: { mockData: name } }),
  undo: () => {}
});

describe('CommandStack Observer Pattern', () => {
  let commandStack: CommandStack;
  let world: World;
  let visibilityModel;
  let operationContext;

  beforeEach(() => {
    const { world: w, visibilityModel: vm, commandStack: cs, operationContext: oc } = createTestWorld();
    commandStack = cs;
    world = w;

    visibilityModel = vm;    operationContext = oc;  });

  it('should notify subscribers when command is pushed', () => {
    const callback = vi.fn();
    commandStack.subscribe(callback);

    const command = new Command('Test Command', operationContext);
    command.addAndExecute(createMockOperation());
    command.commit();

    commandStack.push(command);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should notify subscribers when undo is performed', () => {
    const command = new Command('Test Command', operationContext);
    command.addAndExecute(createMockOperation());
    command.commit();
    commandStack.push(command);

    const callback = vi.fn();
    commandStack.subscribe(callback);

    commandStack.undo();

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should notify subscribers when redo is performed', () => {
    const command = new Command('Test Command', operationContext);
    command.addAndExecute(createMockOperation());
    command.commit();
    commandStack.push(command);
    commandStack.undo();

    const callback = vi.fn();
    commandStack.subscribe(callback);

    commandStack.redo();

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should not notify subscribers after unsubscribing', () => {
    const callback = vi.fn();
    const unsubscribe = commandStack.subscribe(callback);

    const command1 = new Command('Command 1', operationContext);
    command1.addAndExecute(createMockOperation());
    command1.commit();
    commandStack.push(command1);
    
    expect(callback).toHaveBeenCalledTimes(1);

    unsubscribe();

    const command2 = new Command('Command 2', operationContext);
    command2.addAndExecute(createMockOperation());
    command2.commit();
    commandStack.push(command2);

    expect(callback).toHaveBeenCalledTimes(1); // Call count should not increase
  });

  it('should handle multiple subscribers', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    
    commandStack.subscribe(callback1);
    commandStack.subscribe(callback2);

    const command = new Command('Test Command', operationContext);
    command.addAndExecute(createMockOperation());
    command.commit();
    commandStack.push(command);

    expect(callback1).toHaveBeenCalledTimes(1);
    expect(callback2).toHaveBeenCalledTimes(1);
  });
});
