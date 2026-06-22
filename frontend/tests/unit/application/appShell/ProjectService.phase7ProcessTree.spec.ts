import { describe, expect, it } from 'vitest';
import { Command } from '@/commands/Command';
import { ProjectService, type ProjectData } from '@/application/appShell/ProjectService';
import { AddProcessTreeActionGroupOp } from '@/commands/operations/processTree/AddProcessTreeActionGroupOp';
import { AddProcessTreeActionOp } from '@/commands/operations/processTree/AddProcessTreeActionOp';
import { PushSubprocessOp } from '@/commands/operations/processTree/PushSubprocessOp';
import { createTestWorld } from '../../../helpers/worldHelpers';
import type { ActionGroup } from '@/domain/processTree/ProcessTree';

function createGroup(id: string): ActionGroup {
  return { id, type: 'actionGroup', created: new Date('2026-06-05T00:00:00.000Z'), children: [] };
}

function createProcessTreeProject() {
  const { commandStack, operationContext } = createTestWorld();
  const command = new Command('Create process tree nodes', operationContext);
  command.addAndExecute(new PushSubprocessOp('Imported subprocess'));
  command.addAndExecute(new AddProcessTreeActionGroupOp(createGroup('node99')));
  command.addAndExecute(new AddProcessTreeActionOp({ elementId: 'element-1', description: 'Create element 1' }, 'node99'));
  command.commit();
  commandStack.push(command);
  return ProjectService.serializeCommands(commandStack, operationContext.idAllocator.peek(), 'Phase 7 project');
}

describe('ProjectService Phase 7 process-tree persistence', () => {
  it('serializes V8 process-tree descriptors with ISO dates and full node identity', () => {
    const project = createProcessTreeProject();
    const descriptors = project.commands.at(-1)?.operations ?? [];

    expect(project.schemaVersion).toBe('8.0.0');
    expect(descriptors[0]).toMatchObject({
      opType: 'PushSubprocess',
      schemaVersion: '8.0.0',
      subprocess: { id: 'node11', type: 'subprocess', name: 'Imported subprocess' },
    });
    expect(descriptors[1]).toEqual({
      opType: 'AddProcessTreeActionGroup',
      schemaVersion: '8.0.0',
      group: { id: 'node99', type: 'actionGroup', created: '2026-06-05T00:00:00.000Z' },
    });
    expect(descriptors[2]).toMatchObject({
      opType: 'AddProcessTreeActionOp',
      schemaVersion: '8.0.0',
      groupId: 'node99',
      actionNode: { id: 'node100', type: 'action', elementId: 'element-1', description: 'Create element 1' },
    });
    expect(typeof descriptors[2].actionNode?.created).toBe('string');
  });

  it('rejects old project schema files', () => {
    const project = createProcessTreeProject();

    expect(() => ProjectService.validateProjectData({ ...project, schemaVersion: '7.0.0' })).toThrow(/Unsupported project schema version: 7\.0\.0/);
  });

  it('rejects legacy process-tree descriptor shapes in forged V8 projects', () => {
    const project = createProcessTreeProject();
    const forged: ProjectData = {
      ...project,
      schemaVersion: '8.0.0',
      commands: [{
        ...project.commands[0],
        operations: [{ opType: 'AddProcessTreeActionOp', action: { elementId: 'old', description: 'old' }, groupId: 'group', outputs: {} }],
      }],
    };

    expect(() => ProjectService.validateProjectData(forged)).toThrow(/schemaVersion must be 8\.0\.0|unexpected field action/);
  });

  it('preserves imported process node IDs and reserves them after replay', () => {
    const project = createProcessTreeProject();
    const { commandStack, operationContext, visibilityModel } = createTestWorld();

    ProjectService.deserializeCommands(project, visibilityModel, commandStack, operationContext);
    const restoredGroup = operationContext.processTree.findGroup('node99');
    const restoredAction = operationContext.processTree.findAction('node100');
    const liveSubprocess = operationContext.processTree.pushSubprocess('Live subprocess after replay');

    expect(restoredGroup?.created.toISOString()).toBe('2026-06-05T00:00:00.000Z');
    expect(restoredAction?.id).toBe('node100');
    expect(liveSubprocess.id).toBe('node101');
  });
});
