import { describe, it, expect, beforeEach } from 'vitest';
import type { World } from '../../src/domain/world/World';
import { createTestWorld } from '../helpers/worldHelpers';
import { CommandStack } from '../../src/commands/CommandStack';
import { Command } from '../../src/commands/Command';
import { PushSubprocessOp } from '../../src/commands/operations/processTree/PushSubprocessOp';
import { PopSubprocessOp } from '../../src/commands/operations/processTree/PopSubprocessOp';
import type { ProcessTree } from '../../src/domain/processTree/ProcessTree';

describe('ProcessTree Stack Management', () => {
  let world: World;
  let processTree: ProcessTree;
  let commandStack: CommandStack;

  beforeEach(() => {
    const testWorld = createTestWorld();
    world = testWorld.world;
    commandStack = testWorld.commandStack;
    processTree = world.getProcessTree();
  });
  
  function executePush(name: string) {
    const cmd = new Command('Push subprocess', { world });
    cmd.addAndExecute(new PushSubprocessOp(name));
    cmd.commit();
    commandStack.push(cmd);
  }
  
  function executePop() {
    const cmd = new Command('Pop subprocess', { world });
    cmd.addAndExecute(new PopSubprocessOp());
    cmd.commit();
    commandStack.push(cmd);
  }

  describe('Push Subprocess Operation', () => {
    it('should increase stack depth when pushing subprocess', () => {
      const initialDepth = processTree.getStackDepth();
      
      executePush('Test Subprocess');
      
      expect(processTree.getStackDepth()).toBe(initialDepth + 1);
    });

    it('should update stack path when pushing subprocess', () => {
      const initialPath = processTree.getStackPath();
      
      executePush('Test Subprocess');
      
      const newPath = processTree.getStackPath();
      expect(newPath.length).toBe(initialPath.length + 1);
      expect(newPath[newPath.length - 1]).toBe('Test Subprocess');
    });

    it('should make new subprocess the active one', () => {
      executePush('Test Subprocess');
      
      const currentSubprocess = processTree.getCurrentSubprocess();
      expect(currentSubprocess.name).toBe('Test Subprocess');
    });

    it('should be undoable', () => {
      const initialDepth = processTree.getStackDepth();
      
      executePush('Test Subprocess');
      
      expect(processTree.getStackDepth()).toBe(initialDepth + 1);
      
      commandStack.undo();
      
      expect(processTree.getStackDepth()).toBe(initialDepth);
    });

    it('should be redoable', () => {
      const initialDepth = processTree.getStackDepth();
      
      executePush('Test Subprocess');
      
      commandStack.undo();
      commandStack.redo();
      
      expect(processTree.getStackDepth()).toBe(initialDepth + 1);
      expect(processTree.getCurrentSubprocess().name).toBe('Test Subprocess');
    });
  });

  describe('Pop Subprocess Operation', () => {
    beforeEach(() => {
      // Setup: push a subprocess first
      executePush('Test Subprocess');
    });

    it('should decrease stack depth when popping subprocess', () => {
      const initialDepth = processTree.getStackDepth();
      
      executePop();
      
      expect(processTree.getStackDepth()).toBe(initialDepth - 1);
    });

    it('should update stack path when popping subprocess', () => {
      const initialPath = processTree.getStackPath();
      
      executePop();
      
      const newPath = processTree.getStackPath();
      expect(newPath.length).toBe(initialPath.length - 1);
    });

    it('should restore parent subprocess as active', () => {
      const parentSubprocess = processTree.getCurrentSubprocess();
      
      executePush('Child Subprocess');
      
      expect(processTree.getCurrentSubprocess().name).toBe('Child Subprocess');
      
      executePop();
      
      expect(processTree.getCurrentSubprocess().id).toBe(parentSubprocess.id);
    });

    it('should be undoable', () => {
      const beforePopDepth = processTree.getStackDepth();
      const beforePopSubprocess = processTree.getCurrentSubprocess();
      
      executePop();
      
      commandStack.undo();
      
      expect(processTree.getStackDepth()).toBe(beforePopDepth);
      expect(processTree.getCurrentSubprocess().id).toBe(beforePopSubprocess.id);
    });

    it('should be redoable', () => {
      const afterPopDepth = processTree.getStackDepth() - 1;
      
      executePop();
      
      commandStack.undo();
      commandStack.redo();
      
      expect(processTree.getStackDepth()).toBe(afterPopDepth);
    });

    it('should throw error when trying to pop root subprocess', () => {
      // Pop back to root
      executePop();
      
      // Try to pop root - should fail
      expect(() => {
        processTree.popSubprocess();
      }).toThrow();
    });
  });

  describe('Stack Query Methods', () => {
    it('should return correct stack depth', () => {
      expect(processTree.getStackDepth()).toBe(1); // Root only
      
      executePush('Subprocess 1');
      
      expect(processTree.getStackDepth()).toBe(2);
      
      executePush('Subprocess 2');
      
      expect(processTree.getStackDepth()).toBe(3);
    });

    it('should return correct stack path', () => {
      executePush('Subprocess 1');
      
      executePush('Subprocess 2');
      
      const path = processTree.getStackPath();
      expect(path).toHaveLength(3);
      expect(path[0]).toBe('Root Process');
      expect(path[1]).toBe('Subprocess 1');
      expect(path[2]).toBe('Subprocess 2');
    });

    it('should correctly identify active subprocess', () => {
      executePush('Subprocess 1');
      
      const currentSubprocess = processTree.getCurrentSubprocess();
      expect(processTree.isSubprocessActive(currentSubprocess.id)).toBe(true);
      
      const rootSubprocess = processTree.root;
      expect(processTree.isSubprocessActive(rootSubprocess.id)).toBe(false);
    });
  });

  describe('Multiple Push/Pop Operations', () => {
    it('should maintain stack integrity through multiple operations', () => {
      // Push 3 subprocesses
      executePush('Subprocess 1');
      executePush('Subprocess 2');
      executePush('Subprocess 3');
      
      expect(processTree.getStackDepth()).toBe(4);
      expect(processTree.getCurrentSubprocess().name).toBe('Subprocess 3');
      
      // Pop 2
      executePop();
      executePop();
      
      expect(processTree.getStackDepth()).toBe(2);
      expect(processTree.getCurrentSubprocess().name).toBe('Subprocess 1');
      
      // Push 1 more
      executePush('Subprocess 4');
      
      expect(processTree.getStackDepth()).toBe(3);
      expect(processTree.getCurrentSubprocess().name).toBe('Subprocess 4');
    });

    it('should handle undo/redo of multiple operations correctly', () => {
      // Execute multiple operations
      executePush('Subprocess 1');
      executePush('Subprocess 2');
      executePop();
      
      expect(processTree.getStackDepth()).toBe(2);
      expect(processTree.getCurrentSubprocess().name).toBe('Subprocess 1');
      
      // Undo all
      commandStack.undo(); // Undo pop
      expect(processTree.getStackDepth()).toBe(3);
      
      commandStack.undo(); // Undo second push
      expect(processTree.getStackDepth()).toBe(2);
      
      commandStack.undo(); // Undo first push
      expect(processTree.getStackDepth()).toBe(1);
      
      // Redo all
      commandStack.redo();
      expect(processTree.getStackDepth()).toBe(2);
      
      commandStack.redo();
      expect(processTree.getStackDepth()).toBe(3);
      
      commandStack.redo();
      expect(processTree.getStackDepth()).toBe(2);
    });
  });
});
