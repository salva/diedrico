import { Command } from '@/commands/Command';
import type { CommandStack } from '@/commands/CommandStack';
import { buildWorldInitialization } from '@/commands/factories/InitializationSequenceFactory';
import { AddProcessTreeActionGroupOp } from '@/commands/operations/processTree/AddProcessTreeActionGroupOp';
import { PopSubprocessOp, PushSubprocessOp } from '@/commands/operations/processTree';
import { createActionGroup } from '@/domain/processTree/ActionGroup';
import type { World } from '@/domain/world/World';

function createInitializationGroupId(): string {
  return `group_init_${Date.now()}`;
}

/**
 * Application use case for initializing the default Diedrico world.
 *
 * The domain World owns geometric state only; command construction and history
 * recording belong at the application/command boundary.
 */
export function initializeWorld(world: World, commandStack: CommandStack): void {
  if (world.getAllProjectionPlanes().length > 0) return;

  const initCmd = new Command('Initialize World', world);

  initCmd.addAndExecute(new PushSubprocessOp('World Initialization'));

  const groupId = createInitializationGroupId();
  const group = createActionGroup(groupId);
  initCmd.addAndExecute(new AddProcessTreeActionGroupOp(group));

  buildWorldInitialization(world, initCmd, groupId);

  initCmd.addAndExecute(new PopSubprocessOp());
  initCmd.commit();
  commandStack.push(initCmd);
  world.markDirty();
}
