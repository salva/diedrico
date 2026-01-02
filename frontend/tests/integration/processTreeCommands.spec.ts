/**
 * Integration test: ProcessTree with Commands
 * 
 * Verifies that commands properly record actions in the process tree
 * using World factory methods.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '@/domain/world/World';
import { CreateFreePointCommand } from '@/commands/CreateFreePointCommand';
import { CreateLineCommand } from '@/commands/CreateLineCommand';
import { CommandStack } from '@/commands/CommandStack';
import { Vector3 } from 'three';

describe('ProcessTree Integration', () => {
  let world: World;
  let commandStack: CommandStack;

  beforeEach(() => {
    world = new World();
    commandStack = new CommandStack();
  });

  it('should record point creation in process tree', () => {
    const command = new CreateFreePointCommand(new Vector3(10, 20, 1), 'proj_plane_H', world);
    commandStack.execute(command);

    const actions = world.getProcessTree().getAllActions();
    expect(actions).toHaveLength(1);
    expect(actions[0].actionType).toBe('CreateFreePoint');
    expect(actions[0].parameters.planeId).toBe('proj_plane_H');
  });

  it('should record line creation with dependencies in process tree', () => {
    // Create two points
    const cmd1 = new CreateFreePointCommand(new Vector3(10, 20, 1), 'proj_plane_H', world);
    const cmd2 = new CreateFreePointCommand(new Vector3(30, 40, 1), 'proj_plane_H', world);
    commandStack.execute(cmd1);
    commandStack.execute(cmd2);

    const point1Id = cmd1.getPointId()!;
    const point2Id = cmd2.getPointId()!;

    // Create line
    const lineCmd = new CreateLineCommand(point1Id, point2Id, 'proj_plane_H', world);
    commandStack.execute(lineCmd);

    const actions = world.getProcessTree().getAllActions();
    expect(actions).toHaveLength(3);

    // Check line action dependencies
    const lineAction = actions[2];
    expect(lineAction.actionType).toBe('CreateLine');
    expect(lineAction.inputs).toEqual([point1Id, point2Id]);
    expect(lineAction.outputs).toHaveLength(1);
  });

  it('should track construction history across multiple operations', () => {
    // Create a simple construction
    const cmd1 = new CreateFreePointCommand(new Vector3(0, 0, 1), 'proj_plane_H', world);
    const cmd2 = new CreateFreePointCommand(new Vector3(100, 0, 1), 'proj_plane_H', world);
    const cmd3 = new CreateFreePointCommand(new Vector3(0, 100, 1), 'proj_plane_V', world);
    
    commandStack.execute(cmd1);
    commandStack.execute(cmd2);
    commandStack.execute(cmd3);

    const lineCmd = new CreateLineCommand(
      cmd1.getPointId()!,
      cmd2.getPointId()!,
      'proj_plane_H',
      world
    );
    commandStack.execute(lineCmd);

    const actions = world.getProcessTree().getAllActions();
    expect(actions).toHaveLength(4);

    // Verify execution order
    expect(actions[0].actionType).toBe('CreateFreePoint');
    expect(actions[1].actionType).toBe('CreateFreePoint');
    expect(actions[2].actionType).toBe('CreateFreePoint');
    expect(actions[3].actionType).toBe('CreateLine');
  });

  it('should query actions by element dependencies', () => {
    const cmd1 = new CreateFreePointCommand(new Vector3(10, 20, 1), 'proj_plane_H', world);
    const cmd2 = new CreateFreePointCommand(new Vector3(30, 40, 1), 'proj_plane_H', world);
    commandStack.execute(cmd1);
    commandStack.execute(cmd2);

    const point1Id = cmd1.getPointId()!;
    const point2Id = cmd2.getPointId()!;

    const lineCmd = new CreateLineCommand(point1Id, point2Id, 'proj_plane_H', world);
    commandStack.execute(lineCmd);

    const tree = world.getProcessTree();

    // Find actions producing point1
    const producers = tree.getActionsProducingElement(point1Id);
    expect(producers).toHaveLength(1);
    expect(producers[0].actionType).toBe('CreateFreePoint');

    // Find actions depending on point1
    const dependents = tree.getActionsDependingOnElement(point1Id);
    expect(dependents).toHaveLength(1);
    expect(dependents[0].actionType).toBe('CreateLine');
  });
});
